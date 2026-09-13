import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import {
  agora, caminhos, caminhoCorrespondeDeclaracao, escreverJson, escreverTexto,
  extrairCaminhosDeclarados, lerJson, lerTexto, listar, relativo,
} from './arquivos.ts'
import { arquivoIntactoDoPacote } from './cmd-pacote.ts'
import { categoriasSensiveis, tocaRegra4 } from './sensivel.ts'
import { carregarContexto, carregarRequisitos, regenerarTudo, registrarRecusa } from './vistas.ts'
import {
  DESTINOS_DE_ACHADO, ID_DE_TAREFA_NO_TITULO, MARCA_LIGHT_NO_TITULO, MARCADOR, NIVEIS_DE_AUDITORIA, VEREDITOS_DE_REVISAO,
} from './tipos.ts'
import type {
  Auditoria, Contexto, DestinoDeAchado, NivelDeAuditoria, Requisito, Tarefa,
} from './tipos.ts'

/**
 * O auditor: **quem escreve nao aprova.**
 *
 * Contexto compartilhado propaga vies. Quem decidiu usar um `useEffect` para derivar estado tem
 * exatamente o mesmo modelo mental na hora de revisar aquele `useEffect`. Por isso a auditoria roda
 * numa sessao **nova**, e por isso este arquivo nao julga nada: ele **monta o dossie** e **valida o
 * veredito**. O julgamento e' de uma IA que so' tem o que o dossie deu.
 *
 * Dois limites duros, e sao eles que impedem o ciclo infinito que matou o antecessor:
 *   1. o auditor **nao ve' o repositorio** — so' o diff das tarefas do lote, os registros e os requisitos citados;
 *   2. o auditor **nao abre tarefa** — escreve o achado, e quem decide o destino e' o humano.
 *
 * **A unidade e' a tarefa (0.8.0).** Ate' a 0.7.0 o lote era "o diff desde a ultima auditoria", e a
 * cadencia contava os caracteres dele. Medido em campo: 115.781 caracteres com 3 tarefas, dos quais
 * 43% eram uma fixture gerada e 44% os registros do proprio mentor; codigo, 13%. E o diff levava junto
 * o trabalho nao commitado de outra tarefa. Agora cada tarefa tem o proprio diff, a cadencia conta
 * tarefas, e o tamanho so' decide como o dossie se divide.
 */

type Flags = Record<string, string | undefined>

/** O teto do dossie. E' a janela de contexto do auditor, nao a medida de risco. */
const LIMITE_DIFF = 120_000
const LIMITE_ARQUIVO_NOVO = 20_000

function git(args: string[], entrada?: string): { ok: boolean; saida: string } {
  const r = spawnSync('git', ['-c', 'core.quotepath=false', ...args], {
    cwd: caminhos().raiz, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, input: entrada,
  })
  return { ok: r.status === 0, saida: `${r.stdout ?? ''}`.trim() }
}

export function carregarAuditorias(): Auditoria[] {
  return listar(caminhos().auditorias, '.json').map((a) => lerJson<Auditoria>(a))
}

/** Ordem de conclusao: o nome do arquivo de concluida comeca pelo carimbo, entao a lista ja' vem em ordem. */
export function concluidasEmOrdem(): Tarefa[] {
  return listar(caminhos().concluidas, '.json').map((a) => lerJson<Tarefa>(a)).filter((t) => t.estado === 'concluida')
}

export function loteNaoAuditado(): Tarefa[] {
  const jaAuditadas = new Set(carregarAuditorias().flatMap((a) => a.lote))
  return concluidasEmOrdem().filter((t) => !jaAuditadas.has(t.id))
}

// ---------------------------------------------------------------- o que fica fora do diff

export type MotivoDeExclusao = 'registro' | 'vista gerada' | 'nota' | 'pacote' | 'gerado' | 'ignorar_diff'

/**
 * As vistas geradas ficam fora. Nao e' esconder: **o script as escreveu**, e o que elas dizem ja'
 * esta' no dossie em forma estruturada. Requisitos, ADRs, invariantes, dividas e riscos ficam no
 * diff de proposito: aquilo e' decisao, nao contabilidade.
 */
const VISTAS_GERADAS = [
  'contexto.json', 'contexto.md', 'referencias.md', 'requisitos/implementados.md', 'requisitos/pendentes.md',
]

function casaPadrao(arquivo: string, padroes: string[]): boolean {
  if (caminhoCorrespondeDeclaracao(arquivo, padroes)) return true
  return padroes.some((p) => !p.includes('*') && arquivo.startsWith(`${p.replace(/\/+$/, '')}/`))
}

/** `linguist-generated` e' o atributo que o proprio GitHub usa para recolher arquivo gerado no diff. */
function marcadosComoGerados(arquivos: string[]): Set<string> {
  const gerados = new Set<string>()
  if (!arquivos.length) return gerados
  const r = git(['check-attr', '--stdin', 'linguist-generated'], `${arquivos.join('\n')}\n`)
  if (!r.ok) return gerados
  for (const linha of r.saida.split('\n')) {
    const casou = /^(.*): linguist-generated: (\S+)$/.exec(linha.trim())
    if (casou && (casou[2] === 'set' || casou[2] === 'true')) gerados.add(casou[1]!)
  }
  return gerados
}

/**
 * **Uma regra so', para arquivo rastreado e nao rastreado.** Ate' a 0.7.0 eram duas: pathspec do git
 * para o rastreado e prefixo de texto para o novo, e um padrao `**` valia num e nao no outro.
 */
export function motivosDeExclusao(arquivos: string[], ctx: Contexto = carregarContexto()): Map<string, MotivoDeExclusao | null> {
  const docs = relativo(caminhos().docs)
  const extras = (Array.isArray(ctx.auditoria?.ignorar_diff) ? ctx.auditoria.ignorar_diff : [])
    .filter((p): p is string => typeof p === 'string' && Boolean(p.trim()))
    .map((p) => p.trim().replace(/\\/g, '/'))
  const unicos = [...new Set(arquivos)]
  const gerados = marcadosComoGerados(unicos)
  const motivos = new Map<string, MotivoDeExclusao | null>()
  for (const bruto of unicos) {
    const a = bruto.replace(/\\/g, '/').replace(/^\.\//, '')
    let motivo: MotivoDeExclusao | null = null
    if (a.startsWith(`${docs}/tarefas/`)) motivo = 'registro'
    else if (a.startsWith(`${docs}/auditorias/`) || VISTAS_GERADAS.some((v) => a === `${docs}/${v}`)) motivo = 'vista gerada'
    else if (a.startsWith(`${docs}/rascunhos/`) || a === 'melhorias-do-pacote.md' || a.endsWith('/melhorias-do-pacote.md')) motivo = 'nota'
    else if (a.startsWith('.mentor/') && arquivoIntactoDoPacote(a)) motivo = 'pacote'
    else if (gerados.has(bruto)) motivo = 'gerado'
    else if (extras.length && casaPadrao(a, extras)) motivo = 'ignorar_diff'
    motivos.set(bruto, motivo)
  }
  return motivos
}

// ---------------------------------------------------------------- o diff de cada tarefa

export interface CommitDaTarefa {
  hash: string
  titulo: string
  arquivos: Array<{ caminho: string; linhas: number }>
}

export type ClasseDoDiff = 'codigo' | 'sem-diff' | 'atualizacao-do-pacote'

export interface ArquivoDoDiff {
  caminho: string
  linhas: number
  motivo: MotivoDeExclusao | null
  nao_commitado: boolean
}

export interface DiffDaTarefa {
  tarefa: Tarefa
  /**
   * `commits`: os commits com o ID no titulo. `aproximacao`: nenhum commit ainda, entao os arquivos do
   * `plano.muda` que mudaram desde o `commit_base`. `sem-historico`: sem git, ou base inacessivel.
   */
  origem: 'commits' | 'aproximacao' | 'sem-historico'
  commits: CommitDaTarefa[]
  arquivos: ArquivoDoDiff[]
  classe: ClasseDoDiff
  linhas_auditaveis: number
}

/** Fora das exclusoes, e' isto o que uma atualizacao do pacote toca. Qualquer outra coisa e' codigo. */
const SO_PACOTE_OU_DEPENDENCIA = /^(package\.json|package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|mentor\.mjs|AGENTS\.md|CLAUDE\.md|GEMINI\.md|\.gitattributes|\.gitignore)$/

function linhasDoNumstat(adicionadas: string, removidas: string): number {
  return (adicionadas === '-' ? 0 : Number(adicionadas)) + (removidas === '-' ? 0 : Number(removidas))
}

function lerLog(args: string[]): { ok: boolean; commits: CommitDaTarefa[] } {
  const r = git(['log', '--no-merges', '--no-renames', '--relative', '--format=%x1e%H%x1f%s', '--numstat', ...args])
  if (!r.ok) return { ok: false, commits: [] }
  const commits: CommitDaTarefa[] = []
  for (const bloco of r.saida.split('\x1e')) {
    const linhas = bloco.split('\n').filter((l) => l.trim())
    const cabeca = linhas.shift()
    if (!cabeca) continue
    const [hash, ...titulo] = cabeca.split('\x1f')
    if (!hash?.trim()) continue
    const arquivos: CommitDaTarefa['arquivos'] = []
    for (const l of linhas) {
      const casou = /^(\d+|-)\t(\d+|-)\t(.+)$/.exec(l)
      if (casou) arquivos.push({ caminho: casou[3]!, linhas: linhasDoNumstat(casou[1]!, casou[2]!) })
    }
    commits.push({ hash: hash.trim(), titulo: titulo.join('\x1f').trim(), arquivos })
  }
  return { ok: true, commits }
}

/**
 * Os commits que carregam o ID **no titulo**, do mais antigo ao mais novo. Pega o squash
 * `fix(TASK-BG-018): ... (#32)` e o `wip(<ID>)` da pausa. O corpo nao conta: o squash lista nele o
 * titulo de cada commit do ramo, e ali pode aparecer ID de outra tarefa.
 */
export function commitsDaTarefa(t: Tarefa): CommitDaTarefa[] {
  const noTitulo = new RegExp(`(?<![A-Za-z0-9])${t.id}(?![0-9])`)
  const buscar = (faixa: string) => lerLog(['--fixed-strings', `--grep=${t.id}`, faixa])
  // Base inacessivel (clone novo, ramo apagado) nao pode esconder o commit: cai no historico inteiro.
  let r = t.commit_base ? buscar(`${t.commit_base}..HEAD`) : { ok: false, commits: [] }
  if (!r.ok) r = buscar('HEAD')
  return r.commits.filter((c) => noTitulo.test(c.titulo)).reverse()
}

function naoRastreados(): string[] {
  return git(['ls-files', '--others', '--exclude-standard']).saida.split('\n').map((f) => f.trim()).filter(Boolean)
}

function contarLinhas(arquivo: string): number {
  try {
    const texto = lerTexto(join(caminhos().raiz, arquivo))
    return texto.includes('\u0000') ? 0 : texto.split('\n').length
  } catch {
    return 0
  }
}

export function diffDaTarefa(t: Tarefa, ctx: Contexto = carregarContexto()): DiffDaTarefa {
  const brutos = new Map<string, { linhas: number; nao_commitado: boolean }>()
  const somar = (caminho: string, linhas: number, naoCommitado: boolean) => {
    const atual = brutos.get(caminho)
    brutos.set(caminho, { linhas: (atual?.linhas ?? 0) + linhas, nao_commitado: naoCommitado })
  }

  const commits = commitsDaTarefa(t)
  let origem: DiffDaTarefa['origem'] = 'sem-historico'
  if (commits.length) {
    origem = 'commits'
    for (const c of commits) for (const a of c.arquivos) somar(a.caminho, a.linhas, false)
  } else if (t.commit_base) {
    const r = git(['diff', '--numstat', '--no-renames', '--relative', t.commit_base])
    if (r.ok) {
      origem = 'aproximacao'
      const declarados = extrairCaminhosDeclarados(t.plano.muda)
      // Pacote intacto entra mesmo sem declaracao: o `finalizar` nao exige declara-lo, e sem ele a
      // atualizacao do pacote ainda nao commitada seria confundida com tarefa de codigo.
      const daTarefa = (f: string) => caminhoCorrespondeDeclaracao(f, declarados) || arquivoIntactoDoPacote(f)
      for (const linha of r.saida.split('\n')) {
        const casou = /^(\d+|-)\t(\d+|-)\t(.+)$/.exec(linha.trim())
        if (casou && daTarefa(casou[3]!)) somar(casou[3]!, linhasDoNumstat(casou[1]!, casou[2]!), false)
      }
      for (const f of naoRastreados()) {
        if (daTarefa(f)) somar(f, contarLinhas(f), true)
      }
    }
  }

  const motivos = motivosDeExclusao([...brutos.keys()], ctx)
  const arquivos: ArquivoDoDiff[] = [...brutos.entries()]
    .map(([caminho, v]) => ({ caminho, linhas: v.linhas, motivo: motivos.get(caminho) ?? null, nao_commitado: v.nao_commitado }))
    .sort((a, b) => a.caminho.localeCompare(b.caminho))
  const auditaveis = arquivos.filter((a) => !a.motivo)
  const tocouManifesto = arquivos.some((a) => a.caminho === '.mentor/manifesto.json')
  const classe: ClasseDoDiff = tocouManifesto && auditaveis.every((a) => SO_PACOTE_OU_DEPENDENCIA.test(a.caminho))
    ? 'atualizacao-do-pacote'
    : auditaveis.length ? 'codigo' : 'sem-diff'
  return {
    tarefa: t, origem, commits, arquivos, classe,
    linhas_auditaveis: auditaveis.reduce((soma, a) => soma + a.linhas, 0),
  }
}

// ---------------------------------------------------------------- o patch

interface Patch {
  texto: string
  /** Caracteres do patch inteiro, antes de qualquer corte. */
  total: number
  omitidos: Array<{ arquivo: string; tamanho: number }>
}

const PATCH_VAZIO: Patch = { texto: '', total: 0, omitidos: [] }

/** Codigo e teste primeiro, configuracao depois, o resto por ultimo: se cortar, corta o que importa menos. */
function prioridade(arquivo: string): number {
  const a = arquivo.toLowerCase()
  if (/^(src|lib|app|test|tests)\//.test(a) || a.includes('.test.') || a.includes('.spec.')) return 1
  if (/package\.json|tsconfig|\.config\.|schema/i.test(a)) return 2
  return 3
}

function patchDaTarefa(d: DiffDaTarefa, limite: number = LIMITE_DIFF): Patch {
  if (d.classe !== 'codigo') return PATCH_VAZIO
  const incluidos = new Set(d.arquivos.filter((a) => !a.motivo).map((a) => a.caminho))
  const pedacos: Array<{ arquivo: string; peso: number; ordem: number; texto: string }> = []

  if (d.origem === 'commits') {
    d.commits.forEach((c, ordem) => {
      for (const a of c.arquivos) {
        if (!incluidos.has(a.caminho)) continue
        const texto = git(['show', '--format=', '--no-renames', '--relative', c.hash, '--', a.caminho]).saida
        pedacos.push({ arquivo: a.caminho, peso: prioridade(a.caminho), ordem, texto: `# ${c.hash.slice(0, 7)} · ${c.titulo}\n${texto}` })
      }
    })
  } else if (d.origem === 'aproximacao' && d.tarefa.commit_base) {
    for (const a of d.arquivos) {
      if (a.motivo) continue
      const texto = a.nao_commitado
        ? (git(['diff', '--no-index', '--', '/dev/null', a.caminho]).saida || `+++ ${a.caminho} (nao consegui ler)`).slice(0, LIMITE_ARQUIVO_NOVO)
        : git(['diff', d.tarefa.commit_base, '--relative', '--', a.caminho]).saida
      pedacos.push({ arquivo: a.caminho, peso: prioridade(a.caminho), ordem: 0, texto })
    }
  }

  pedacos.sort((a, b) => a.peso - b.peso || a.ordem - b.ordem || a.arquivo.localeCompare(b.arquivo))
  const patch: Patch = { texto: '', total: 0, omitidos: [] }
  for (const p of pedacos) {
    patch.total += p.texto.length
    if (patch.texto.length + p.texto.length > limite) patch.omitidos.push({ arquivo: p.arquivo, tamanho: p.texto.length })
    else patch.texto += (patch.texto ? '\n' : '') + p.texto
  }
  return patch
}

// ---------------------------------------------------------------- cadencia

export interface EstadoDaCadencia {
  cadencia: number
  /** Concluidas que ainda nao estao em lote nenhum, com o diff de cada uma. */
  pendentes: DiffDaTarefa[]
  /** As que contam: tem diff auditavel. Registro, nota e atualizacao do pacote nao contam. */
  contam: DiffDaTarefa[]
  estado: 'em-dia' | 'vencida' | 'atrasada'
  /** O projeto ainda declara `cadencia_em_caracteres`, que desde a 0.8.0 nao dispara nada. */
  campo_obsoleto: boolean
}

/** Fonte unica da cadencia. Ate' a 0.7.0 o `doctor`, o `finalizar` e as vistas faziam cada um a sua conta. */
export function estadoDaCadencia(ctx: Contexto = carregarContexto()): EstadoDaCadencia {
  const cadencia = Math.max(1, Number(ctx.auditoria.cadencia_em_tarefas) || 10)
  const pendentes = loteNaoAuditado().map((t) => diffDaTarefa(t, ctx))
  const contam = pendentes.filter((d) => d.classe === 'codigo')
  return {
    cadencia,
    pendentes,
    contam,
    estado: contam.length >= cadencia * 2 ? 'atrasada' : contam.length >= cadencia ? 'vencida' : 'em-dia',
    campo_obsoleto: ctx.auditoria.cadencia_em_caracteres !== undefined,
  }
}

/** Os maiores arquivos auditaveis das tarefas, para o `doctor` mostrar de onde vem o tamanho. */
export function maioresArquivos(diffs: DiffDaTarefa[], quantos = 3): Array<{ caminho: string; linhas: number }> {
  const porCaminho = new Map<string, number>()
  for (const d of diffs) {
    for (const a of d.arquivos) if (!a.motivo) porCaminho.set(a.caminho, (porCaminho.get(a.caminho) ?? 0) + a.linhas)
  }
  return [...porCaminho.entries()]
    .map(([caminho, linhas]) => ({ caminho, linhas }))
    .sort((a, b) => b.linhas - a.linhas)
    .slice(0, quantos)
}

// ---------------------------------------------------------------- preparar

export function preparar(): number {
  const c = caminhos()
  const ctx = carregarContexto()
  const auditorias = carregarAuditorias()
  const lote = loteNaoAuditado()

  const pendente = auditorias.find((a) => !a.registrada_em)
  if (pendente) {
    console.error(`${pendente.id} foi preparada e nunca registrada. Termine ela antes de abrir outra:`)
    console.error(`  ${relativo(`${c.auditorias}/${pendente.id}.json`)}`)
    return 1
  }
  if (lote.length === 0) {
    console.log('Nenhuma tarefa concluida desde a ultima auditoria. Nada a auditar.')
    return 0
  }

  // Empacota em ordem de conclusao enquanto cabe no teto. A primeira entra sempre, mesmo sozinha
  // acima do teto: esperar nunca a faria caber, e cortar na fronteira de arquivo e' melhor que nao auditar.
  const pacote: Array<{ d: DiffDaTarefa; patch: Patch }> = []
  let ocupado = 0
  for (const t of lote) {
    const d = diffDaTarefa(t, ctx)
    const patch = patchDaTarefa(d)
    if (pacote.length && ocupado + patch.total > LIMITE_DIFF) break
    pacote.push({ d, patch })
    ocupado += patch.texto.length
  }
  const resto = lote.slice(pacote.length)

  const id = `AUD-${String(auditorias.length + 1).padStart(3, '0')}`
  const base = ctx.auditoria.ultimo_commit ?? pacote[0]?.d.tarefa.commit_base ?? null
  const cabeca = git(['rev-parse', 'HEAD'])
  const final = cabeca.ok ? cabeca.saida : null

  const auditoria: Auditoria = {
    id,
    lote: pacote.map((p) => p.d.tarefa.id),
    commit_base: base,
    commit_final: final,
    preparada_em: agora().log,
    registrada_em: null,
    veredito: null,
    nao_verificado: [`${MARCADOR} o que voce NAO conseguiu verificar, e por que. Esta lista sustenta o veredito`],
    pendencias: [],
    sem_diff_auditavel: pacote.filter((p) => p.d.classe !== 'codigo').map((p) => p.d.tarefa.id),
    ficaram_para_depois: resto.map((t) => t.id),
  }
  escreverJson(`${c.auditorias}/${id}.json`, auditoria)
  escreverTexto(`${c.auditorias}/${id}-dossie.md`, dossie(id, pacote, resto, base, final, ctx))

  console.log(`${id} preparada: ${pacote.length} tarefa(s) no lote.`)
  if (resto.length) {
    console.log(`Ficaram ${resto.length} tarefa(s) para a proxima: o dossie chegou ao teto de ${LIMITE_DIFF} caracteres.`)
    console.log(`Registre ${id} e rode "auditar preparar" de novo.`)
  }
  console.log(`\nAbra uma sessao NOVA de IA — outra janela, contexto zerado — e diga a ela:`)
  console.log(`  "Leia ${relativo(`${c.auditorias}/${id}-dossie.md`)} e siga o que esta escrito la."`)
  console.log(`\nO dossie e' tudo o que o auditor pode ver. Nao de o repositorio a ela.`)
  return 0
}

/** Fatos, nunca julgamento: o script mede, o auditor decide o nivel. */
function fatosMecanicos(pacote: Array<{ d: DiffDaTarefa; patch: Patch }>): string[] {
  const fatos: string[] = []
  for (const { d, patch } of pacote) {
    const t = d.tarefa
    if (d.classe === 'atualizacao-do-pacote') {
      fatos.push(`${t.id}: atualizacao do pacote, fora da revisao de codigo. O pacote se audita no repositorio dele`)
      continue
    }
    if (d.classe === 'sem-diff') {
      // Nao pula o resto: tarefa que declara codigo e nao entrega diff e' exatamente o que a regra 1 pede para conferir.
      const declarados = extrairCaminhosDeclarados(t.plano.muda)
      const motivos = motivosDeExclusao(declarados)
      const deCodigo = declarados.filter((a) => !motivos.get(a))
      fatos.push(deCodigo.length
        ? `⚠️ ${t.id}: declarou mudar ${deCodigo.slice(0, 5).join(', ')}, e nenhum arquivo auditavel aparece no diff da tarefa`
        : `${t.id}: sem diff auditavel (so' registros, vistas geradas ou notas)`)
    }
    if (patch.omitidos.length) {
      fatos.push(`⚠️ DIFF TRUNCADO: ${t.id} sozinha passa do teto de ${LIMITE_DIFF} caracteres (${patch.total}). ${patch.omitidos.length} arquivo(s) de menor prioridade ficaram fora. Auditor: liste-os em "nao_verificado".`)
    }
    if (d.origem === 'aproximacao') {
      fatos.push(`${t.id}: nenhum commit com o ID no titulo. O diff e' aproximacao: arquivos do plano.muda que mudaram desde o commit_base`)
    } else if (d.origem === 'sem-historico') {
      fatos.push(`${t.id}: sem historico para recortar o diff (sem git, ou commit_base inacessivel). Nao ha auditoria de codigo desta tarefa`)
    } else if (d.classe === 'codigo') {
      // A pasta de documentos fica de fora como na trava de escopo do `finalizar`: divida e risco
      // nascem de comando durante a tarefa, e nao se declaram no plano.
      const docs = `${relativo(caminhos().docs)}/`
      const declarados = extrairCaminhosDeclarados(t.plano.muda)
      const naoDeclarados = d.arquivos
        .filter((a) => !a.motivo && !a.caminho.startsWith(docs) && !caminhoCorrespondeDeclaracao(a.caminho, declarados))
        .map((a) => a.caminho)
      if (naoDeclarados.length) {
        fatos.push(`${t.id}: ${naoDeclarados.length} arquivo(s) nos commits da tarefa sem constar no plano.muda: ${naoDeclarados.slice(0, 20).join(', ')}`)
      }
    }
    const semTeste = t.plano.criterios_aceite.filter((cr) => cr.teste.startsWith('nao se aplica'))
    if (semTeste.length) {
      fatos.push(`${t.id}: ${semTeste.length} criterio(s) de aceite sem teste nomeado ("nao se aplica"). Criterio sem verificacao reproduzivel e' criterio NAO VERIFICADO`)
    }
    for (const [nome, g] of Object.entries(t.gates)) {
      if (!g) continue
      if (g.rotulo === 'NÃO EXECUTADO' || g.rotulo === 'INVÁLIDO como gate') {
        fatos.push(`${t.id}: gate "${nome}" fechou como ${g.rotulo} — motivo declarado: ${g.motivo ?? '(nenhum)'}`)
      }
      if (nome === 'testes') {
        const disp = g.vermelho_dispensado ?? (g.vermelho_dispensado_em ? {
          dispensado_em: g.vermelho_dispensado_em,
          motivo: g.vermelho_motivo ?? g.motivo ?? 'dispensado sem motivo registrado',
        } : null)
        if (disp) {
          fatos.push(`${t.id}: o gate "testes" teve o vermelho dispensado: "${disp.motivo}". Auditor: verificar se ha prova por mutacao`)
        } else if (!g.vermelho_em) {
          fatos.push(`${t.id}: o gate "testes" nunca foi visto vermelho. Teste que nunca falhou pode estar passando sem exercitar o codigo`)
        }
      }
    }
    const categorias = categoriasSensiveis(t)
    if (categorias.length) {
      const quais = categorias.join(', ')
      const regra4 = tocaRegra4(categorias)
      if (t.validacao === 'aprovado') {
        const ev = t.gates['validacao_manual']?.saida ?? t.validacao_motivo ?? 'aprovado pelo humano'
        fatos.push(`${t.id}: tarefa sensivel (${quais}) com revisao humana declarada: "${ev}" (${regra4 ? 'Regra 4 atendida' : 'validacao manual atendida'})`)
      } else if (t.validacao === 'dispensado') {
        const mot = t.validacao_motivo ?? t.gates['validacao_manual']?.motivo ?? 'sem motivo registrado'
        fatos.push(`⚠️ ${t.id}: tarefa sensivel (${quais}) teve a validacao manual DISPENSADA: "${mot}". Auditor: verificar se ha teste de combinacoes ou fixture`)
      } else {
        fatos.push(`${t.id}: tarefa sensivel (${quais}) sem registro de revisao humana aprovada${regra4 ? ' (atencao a Regra 4)' : ''}`)
      }
    }
    if (t.achados.length) fatos.push(`${t.id}: fechou com ${t.achados.length} achado(s) proprio(s) ja com destino`)
  }
  return fatos.length ? fatos : ['nada a assinalar mecanicamente. Isso nao e um veredito: e a ausencia de sinal barato']
}

/**
 * O que mudou no repositorio e nao pertence a nenhuma tarefa do lote. So' fatos, sem conteudo: e'
 * trabalho de outra tarefa, ou codigo que entrou sem tarefa, e o auditor nao audita o que nao e' dele.
 */
function foraDasTarefas(pacote: Array<{ d: DiffDaTarefa }>, base: string | null, ctx: Contexto): string[] {
  const l: string[] = []
  const doLote = new Set(pacote.flatMap((p) => p.d.arquivos.map((a) => a.caminho)))

  if (base) {
    const r = lerLog([`${base}..HEAD`])
    if (!r.ok) {
      l.push(`- Nao consegui ler o historico desde \`${base.slice(0, 7)}\`: commits sem tarefa nao foram conferidos.`)
    } else {
      const semTarefa = r.commits.filter((c) => !ID_DE_TAREFA_NO_TITULO.test(c.titulo))
      const motivos = motivosDeExclusao(semTarefa.flatMap((c) => c.arquivos.map((a) => a.caminho)), ctx)
      const comCodigo = semTarefa.filter((c) => c.arquivos.some((a) => !motivos.get(a.caminho)))
      const descrever = (c: CommitDaTarefa) => {
        const arquivos = c.arquivos.filter((a) => !motivos.get(a.caminho))
        const linhas = arquivos.reduce((soma, a) => soma + a.linhas, 0)
        return `- \`${c.hash.slice(0, 7)}\` ${c.titulo} — ${linhas} linha(s) em ${arquivos.slice(0, 5).map((a) => a.caminho).join(', ')}${arquivos.length > 5 ? '...' : ''}`
      }
      const light = comCodigo.filter((c) => MARCA_LIGHT_NO_TITULO.test(c.titulo))
      const semMarca = comCodigo.filter((c) => !MARCA_LIGHT_NO_TITULO.test(c.titulo))
      if (light.length) {
        l.push(`**Commits marcados Light desde a ultima auditoria (${light.length}).** Light e\' lista fechada (nucleo §5: typo, formatacao, renomear arquivo, dependencia de desenvolvimento). O que nao cabe nela e\' codigo sem tarefa, e isso e\' achado:`)
        l.push('')
        for (const c of light.slice(0, 15)) l.push(descrever(c))
        l.push('')
      }
      if (semMarca.length) {
        l.push(`**Commits sem ID de tarefa e sem marca Light desde a ultima auditoria (${semMarca.length}):**`)
        l.push('')
        for (const c of semMarca.slice(0, 15)) l.push(descrever(c))
        l.push('')
      }
    }
  }

  const naoCommitados = new Map<string, number>()
  const rastreados = git(['diff', '--numstat', '--no-renames', '--relative', 'HEAD'])
  if (rastreados.ok) {
    for (const linha of rastreados.saida.split('\n')) {
      const casou = /^(\d+|-)\t(\d+|-)\t(.+)$/.exec(linha.trim())
      if (casou) naoCommitados.set(casou[3]!, linhasDoNumstat(casou[1]!, casou[2]!))
    }
  }
  for (const f of naoRastreados()) naoCommitados.set(f, contarLinhas(f))
  const motivos = motivosDeExclusao([...naoCommitados.keys()], ctx)
  const soltos = [...naoCommitados.entries()].filter(([f]) => !motivos.get(f) && !doLote.has(f))
  if (soltos.length) {
    l.push(`**Trabalho nao commitado que nenhuma tarefa do lote declarou (${soltos.length}):**`)
    l.push('')
    for (const [f, linhas] of soltos.slice(0, 20)) l.push(`- \`${f}\` (${linhas} linha(s))`)
    l.push('')
  }
  return l.length ? l : ['Nada.']
}

const ROTULO_DO_MOTIVO: Record<MotivoDeExclusao, string> = {
  registro: 'registro do mentor', 'vista gerada': 'vista gerada', nota: 'nota',
  pacote: 'pacote intacto', gerado: 'gerado (.gitattributes)', ignorar_diff: 'ignorar_diff',
}

function dossie(
  id: string, pacote: Array<{ d: DiffDaTarefa; patch: Patch }>, resto: Tarefa[],
  base: string | null, final: string | null, ctx: Contexto,
): string {
  const reqs = carregarRequisitos()
  const citados = new Set(pacote.flatMap((p) => p.d.tarefa.requisitos))

  const l: string[] = []
  l.push(`# ${id} · dossie de auditoria`)
  l.push('')
  l.push('Voce e o **auditor**. Voce nao escreveu este codigo e nao vai corrigi-lo.')
  l.push('Seu unico poder e **reprovar**. Voce **nao abre tarefa**: quem decide o que vira trabalho e o humano.')
  l.push('')
  l.push('## O escopo, e por que ele e fechado')
  l.push('')
  l.push('Voce ve o que esta neste arquivo: o registro de cada tarefa, o diff de cada uma e os requisitos citados.')
  l.push('**Nao leia o resto do repositorio.** A regra 5 abaixo empurra voce a achar alguma coisa; solta no')
  l.push('repositorio inteiro, ela vira maquina de gerar trabalho, que foi o que matou o pacote anterior.')
  l.push('')
  l.push('## Cinco regras')
  l.push('')
  l.push('1. **Nao confie no que a tarefa afirma ter feito. Verifique no diff.**')
  l.push('2. Gate sem evidencia e `NÃO EXECUTADO`, nunca `APROVADO`.')
  l.push('3. Criterio de aceite sem teste ou verificacao reproduzivel e criterio **nao verificado**. "Validado visualmente" sem passos nao conta.')
  l.push('4. Mudanca em calculo, persistencia ou migracao de esquema **exige revisao humana**: assinale, nao aprove sozinho.')
  l.push('5. **Calibracao:** uma auditoria que aprova tudo esta quebrada. Se nao achou nada, declare **o que verificou e o que nao conseguiu verificar** — a lista de nao-verificado e a parte mais util do relatorio.')
  l.push('')
  l.push('## Tres niveis. O criterio e classe de falsidade, nao tema')
  l.push('')
  l.push('Erro de estilo em codigo de seguranca nao bloqueia; criterio de aceite contradito num botao bloqueia.')
  l.push('')
  l.push('| Nivel | O que e |')
  l.push('| :-- | :-- |')
  l.push('| `bloqueia` | o diff contradiz um criterio declarado · gate sem evidencia · seguranca · dado pessoal exposto · performance com impacto de usuario · requisito ausente ou contradito · gate que existe e nao checa nada · toca calculo, persistencia ou migracao sem revisao humana |')
  l.push('| `recomendacao` | funciona, da para ficar melhor |')
  l.push('| `observacao` | fica anotado, nao pede acao |')
  l.push('')
  l.push('## O lote')
  l.push('')
  l.push('Cada tarefa traz o proprio diff: os commits com o ID dela no titulo. Trabalho de outra tarefa nao entra.')
  l.push(`Ate: \`${final ?? 'trabalho nao commitado'}\``)
  if (resto.length) {
    l.push('')
    l.push(`Ficaram para a proxima auditoria, porque o dossie chegou ao teto: ${resto.map((t) => t.id).join(', ')}.`)
  }
  l.push('')
  for (const { d, patch } of pacote) {
    const t = d.tarefa
    l.push(`### ${t.id} · ${t.titulo}`)
    l.push('')
    l.push(`\`${t.tipo}\` · cerimonia ${t.cerimonia} · esforco ${t.esforco.humano}/${t.esforco.ia} · origem: ${t.origem}`)
    l.push('')
    l.push('**Criterios de aceite, e o teste que cada um nomeia:**')
    l.push('')
    for (const cr of t.plano.criterios_aceite) l.push(`- ${cr.texto}\n  → teste: \`${cr.teste}\``)
    l.push('')
    l.push('**Declarou mudar:**')
    l.push('')
    for (const m of t.plano.muda) l.push(`- ${m}`)
    l.push('')
    l.push('**Gates:**')
    l.push('')
    l.push('| gate | rotulo | vermelho antes | saida | motivo/ressalva |')
    l.push('| :-- | :-- | :-- | --: | :-- |')
    for (const [nome, g] of Object.entries(t.gates)) {
      if (!g) continue
      const disp = g.vermelho_dispensado ?? (g.vermelho_dispensado_em ? {
        dispensado_em: g.vermelho_dispensado_em,
        motivo: g.vermelho_motivo ?? g.motivo ?? '—',
      } : null)
      const vermelhoTexto = g.vermelho_em ?? (disp ? `dispensado (${disp.dispensado_em})` : '—')
      const motivoTexto = g.motivo ?? g.ressalva ?? disp?.motivo ?? (nome === 'validacao_manual' && g.saida ? g.saida : '—')
      l.push(`| ${nome} | ${g.rotulo} | ${vermelhoTexto} | ${g.codigo_saida ?? '—'} | ${motivoTexto} |`)
    }
    l.push('')
    if (t.plano.riscos.length) { l.push(`**Riscos declarados:** ${t.plano.riscos.join(' · ')}`); l.push('') }
    if (t.achados.length) {
      l.push('**Achados que a propria tarefa registrou:**')
      l.push('')
      for (const a of t.achados) l.push(`- (classe ${a.classe}) ${a.descricao} → ${a.destino}: ${a.ref}`)
      l.push('')
    }

    l.push('**O diff da tarefa:**')
    l.push('')
    if (d.classe === 'atualizacao-do-pacote') {
      l.push('Atualizacao do pacote: fora dos arquivos intactos de `.mentor/`, so\' dependencias e pontos de entrada. Fora da revisao de codigo.')
      l.push('')
      continue
    }
    if (d.origem === 'commits') {
      l.push(`${d.commits.length} commit(s): ${d.commits.map((c) => `\`${c.hash.slice(0, 7)}\` ${c.titulo}`).join(' · ')}`)
    } else if (d.origem === 'aproximacao') {
      l.push('Aproximacao: nenhum commit com o ID no titulo. Sao os arquivos do `plano.muda` que mudaram desde o `commit_base`, inclusive os nunca commitados.')
    } else {
      l.push('Sem historico: projeto sem git, ou `commit_base` inacessivel. Sem diff nao ha auditoria de codigo: registre em "nao_verificado".')
    }
    l.push('')
    if (d.arquivos.length) {
      l.push('| arquivo | linhas | fora da revisao |')
      l.push('| :-- | --: | :-- |')
      for (const a of d.arquivos) {
        l.push(`| \`${a.caminho}\`${a.nao_commitado ? ' (nunca commitado)' : ''} | ${a.linhas} | ${a.motivo ? ROTULO_DO_MOTIVO[a.motivo] : '—'} |`)
      }
      l.push('')
    }
    if (d.classe === 'sem-diff') {
      l.push('Nenhum arquivo auditavel: so\' registros, vistas geradas ou notas.')
      l.push('')
      continue
    }
    if (patch.omitidos.length) {
      l.push(`⚠️ **O diff desta tarefa passou do teto de ${LIMITE_DIFF} caracteres (${patch.total}).** Ficaram fora, por prioridade menor:`)
      for (const o of patch.omitidos) l.push(`- \`${o.arquivo}\` (${o.tamanho} caracteres) — auditor: verificar separadamente`)
      l.push('Isso entra em "nao_verificado" do relatorio.')
      l.push('')
    }
    l.push('```diff')
    l.push(patch.texto || '(vazio)')
    l.push('```')
    l.push('')
  }
  if (citados.size) {
    l.push('## Requisitos citados pelo lote')
    l.push('')
    for (const r of reqs as Requisito[]) {
      if (!citados.has(r.id)) continue
      l.push(`### ${r.id} (${r.tipo}) · ${r.status}`)
      l.push('')
      l.push(r.enunciado)
      l.push('')
      for (const cr of r.criterios_aceite) l.push(`- ${cr}`)
      l.push('')
    }
  }
  l.push('## O que o script ja mediu')
  l.push('')
  l.push('Fatos, nao vereditos. Quem da o nivel e voce.')
  l.push('')
  for (const f of fatosMecanicos(pacote)) l.push(`- ${f}`)
  l.push('')
  l.push('## Fora das tarefas do lote')
  l.push('')
  l.push('So\' fatos, sem conteudo: nao e\' material desta auditoria. Um commit que toca codigo sem tarefa e\' achado; o resto e\' contexto.')
  l.push('')
  l.push(...foraDasTarefas(pacote, base, ctx))
  l.push('')
  l.push('## Como entregar o veredito')
  l.push('')
  l.push(`Edite \`${relativo(`${caminhos().auditorias}/${id}.json`)}\`:`)
  l.push('')
  l.push(`- \`veredito\`: \`${VEREDITOS_DE_REVISAO.join('\` | \`')}\``)
  l.push('- `nao_verificado`: lista. **Nunca pode ficar vazia** — nenhuma auditoria verifica tudo, e dizer o contrario e o sinal mais claro de auditoria quebrada.')
  l.push(`- \`pendencias\`: cada achado com \`nivel\` (\`${NIVEIS_DE_AUDITORIA.join('\` | \`')}\`), \`descricao\` e \`tarefas\` (os IDs a que se refere).`)
  l.push('  Deixe `destino`, `ref` e `resolvida_em` em `null`: **quem decide o destino e o humano, nao voce.**')
  l.push('')
  l.push('Depois rode:')
  l.push('')
  l.push('```')
  l.push(`node mentor.mjs auditar registrar ${id}`)
  l.push('```')
  l.push('')
  l.push('O comando recusa: marcador nao preenchido · `nao_verificado` vazio · achado `bloqueia` com veredito `APROVADO` · destino preenchido por voce.')
  return l.join('\n')
}

// ---------------------------------------------------------------- registrar

export function registrar(id: string): number {
  const c = caminhos()
  const caminho = `${c.auditorias}/${id}.json`
  const a = lerJson<Auditoria>(caminho)
  const impedimentos: string[] = []

  if (a.registrada_em) impedimentos.push(`${id} ja foi registrada em ${a.registrada_em}`)
  if (!a.veredito) impedimentos.push('sem veredito')
  else if (!(VEREDITOS_DE_REVISAO as readonly string[]).includes(a.veredito)) {
    impedimentos.push(`veredito fora do vocabulario: "${a.veredito}". Aceitos: ${VEREDITOS_DE_REVISAO.join(' | ')}`)
  }

  const naoVerificado = a.nao_verificado.filter((s) => s.trim() && !s.includes(MARCADOR))
  if (naoVerificado.length === 0) {
    impedimentos.push('"nao_verificado" vazio. Nenhuma auditoria verifica tudo: a lista do que ficou de fora e o que sustenta o veredito')
  }

  a.pendencias.forEach((p, i) => {
    if (!(NIVEIS_DE_AUDITORIA as readonly string[]).includes(p.nivel)) {
      impedimentos.push(`pendencia[${i}] com nivel invalido "${p.nivel}". Aceitos: ${NIVEIS_DE_AUDITORIA.join(' | ')}`)
    }
    if (!p.descricao?.trim() || p.descricao.includes(MARCADOR)) impedimentos.push(`pendencia[${i}] sem descricao`)
    // O auditor reporta; o destino e' decisao do humano, depois, com `auditar resolver`.
    if (p.destino || p.ref) {
      impedimentos.push(`pendencia[${i}] ja vem com destino/ref. A auditoria reporta, nunca decide o que vira trabalho. Use "auditar resolver" depois`)
    }
  })

  const bloqueios = a.pendencias.filter((p) => p.nivel === 'bloqueia')
  if (bloqueios.length && a.veredito === 'APROVADO') {
    impedimentos.push(`${bloqueios.length} achado(s) "bloqueia" com veredito APROVADO. Bloqueio e reprovacao: nao ha aprovacao com bloqueio pendente`)
  }
  if (a.veredito === 'REPROVADO' && bloqueios.length === 0) {
    impedimentos.push('REPROVADO sem nenhum achado "bloqueia". O que reprova precisa estar escrito')
  }

  if (impedimentos.length) {
    registrarRecusa('auditar registrar', id, impedimentos)
    console.error(`Nao da para registrar ${id}:`)
    for (const i of impedimentos) console.error(`  - ${i}`)
    return 1
  }

  a.pendencias.forEach((p, i) => {
    p.id = `${id}-${p.nivel === 'bloqueia' ? 'B' : p.nivel === 'recomendacao' ? 'R' : 'O'}${String(i + 1).padStart(2, '0')}`
    p.destino = null
    p.ref = null
    p.resolvida_em = null
  })
  a.registrada_em = agora().log
  escreverJson(caminho, a)

  const ctx = carregarContexto()
  ctx.auditoria.ultima_em = a.registrada_em
  // Conta as concluidas que ja' estao em algum lote, e nao todas as concluidas: a que fechou entre o
  // `preparar` e o `registrar`, ou ficou para o proximo pacote, ainda precisa ser auditada.
  const auditadas = new Set(carregarAuditorias().flatMap((x) => x.lote))
  ctx.auditoria.ultima_na_tarefa = concluidasEmOrdem().filter((t) => auditadas.has(t.id)).length
  ctx.auditoria.ultimo_commit = a.commit_final
  atualizarPendencias(ctx)
  escreverJson(c.contexto, ctx)
  regenerarTudo()

  console.log(`${id}: ${a.veredito} · ${a.lote.length} tarefa(s) · ${bloqueios.length} bloqueio(s)`)
  for (const p of a.pendencias) console.log(`  ${marca(p.nivel)} ${p.id}  ${p.descricao}`)
  if (a.pendencias.length) {
    console.log(`\nA auditoria nao abre tarefa. Voce decide o destino de cada uma:`)
    console.log(`  node mentor.mjs auditar resolver <ID> --destino ${DESTINOS_DE_ACHADO.join('|')} --ref "..."`)
  }
  if (a.ficaram_para_depois?.length) {
    console.log(`\nFicaram ${a.ficaram_para_depois.length} tarefa(s) fora deste lote. Rode "auditar preparar" de novo.`)
  }
  return 0
}

const marca = (n: NivelDeAuditoria) => (n === 'bloqueia' ? '🔴' : n === 'recomendacao' ? '🟡' : '🟢')

/** `pendencias_reportadas` e' SAIDA: recalculada de todas as auditorias, nunca digitada. */
function atualizarPendencias(ctx: ReturnType<typeof carregarContexto>): void {
  ctx.auditoria.pendencias_reportadas = carregarAuditorias()
    .flatMap((a) => a.pendencias)
    .filter((p) => p.nivel === 'bloqueia' && !p.resolvida_em)
    .map((p) => p.id)
}

// ---------------------------------------------------------------- resolver

export function resolver(pendenciaId: string, flags: Flags): number {
  const destino = flags.destino as DestinoDeAchado | undefined
  if (!destino || !(DESTINOS_DE_ACHADO as readonly string[]).includes(destino)) {
    throw new Error(`Falta --destino. Aceitos: ${DESTINOS_DE_ACHADO.join(' | ')}`)
  }
  if (!flags.ref?.trim()) {
    throw new Error('Falta --ref: o ID criado, ou o motivo do descarte. Achado sem ref fica em limbo, e limbo apodrece.')
  }
  const c = caminhos()
  for (const arquivo of listar(c.auditorias, '.json')) {
    const a = lerJson<Auditoria>(arquivo)
    const p = a.pendencias.find((x) => x.id === pendenciaId)
    if (!p) continue
    if (p.resolvida_em) throw new Error(`${pendenciaId} ja foi resolvida em ${p.resolvida_em} (${p.destino}: ${p.ref}).`)
    p.destino = destino
    p.ref = flags.ref
    p.resolvida_em = agora().log
    escreverJson(arquivo, a)
    const ctx = carregarContexto()
    atualizarPendencias(ctx)
    escreverJson(c.contexto, ctx)
    console.log(`${pendenciaId} resolvida como "${destino}": ${flags.ref}`)
    return 0
  }
  throw new Error(`Pendencia ${pendenciaId} nao encontrada em nenhuma auditoria.`)
}

// ---------------------------------------------------------------- relatar

export function relatar(): number {
  const auditorias = carregarAuditorias()
  if (auditorias.length === 0) {
    const ctx = carregarContexto()
    const feitas = concluidasEmOrdem().length
    console.log(`Nenhuma auditoria ainda. Cadencia: a cada ${ctx.auditoria.cadencia_em_tarefas} tarefas concluidas com codigo (${feitas} concluida(s) ate agora).`)
    console.log('Para montar o dossie do lote: node mentor.mjs auditar preparar')
    return 0
  }
  for (const a of auditorias) {
    console.log(`${a.id}  ${a.registrada_em ? a.veredito : 'PREPARADA, sem veredito'}  ·  ${a.lote.length} tarefa(s)  ·  ${a.preparada_em}`)
    for (const p of a.pendencias) {
      const fim = p.resolvida_em ? `${p.destino}: ${p.ref}` : 'em aberto'
      console.log(`   ${marca(p.nivel)} ${p.id}  ${p.descricao}  [${fim}]`)
    }
  }
  const abertas = auditorias.flatMap((a) => a.pendencias).filter((p) => !p.resolvida_em).length
  console.log(`\n${abertas} pendencia(s) sem destino. A auditoria reporta; o destino e decisao sua.`)
  return 0
}
