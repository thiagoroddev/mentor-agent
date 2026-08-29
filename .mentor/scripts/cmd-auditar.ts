import { spawnSync } from 'node:child_process'
import { agora, caminhos, escreverJson, escreverTexto, lerJson, listar, relativo } from './arquivos.ts'
import { carregarContexto, carregarRequisitos, regenerarTudo, registrarRecusa } from './vistas.ts'
import { DESTINOS_DE_ACHADO, MARCADOR, NIVEIS_DE_AUDITORIA, VEREDITOS_DE_REVISAO } from './tipos.ts'
import type {
  Auditoria, DestinoDeAchado, NivelDeAuditoria, Requisito, Tarefa,
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
 *   1. o auditor **nao ve' o repositorio** — so' o diff do lote, os registros e os requisitos citados;
 *   2. o auditor **nao abre tarefa** — escreve o achado, e quem decide o destino e' o humano.
 */

type Flags = Record<string, string | undefined>

const LIMITE_DIFF = 120_000
const LIMITE_ARQUIVO_NOVO = 20_000

/**
 * As vistas geradas, fora do diff. Nao e' esconder: e' que **o script as escreveu**, elas ja' estao
 * no dossie em forma estruturada, e o ruido delas afogaria o codigo — que e' o que se audita.
 * Requisitos, ADRs e rascunhos ficam no diff de proposito: aquilo e' conteudo, nao contabilidade.
 */
const VISTAS_GERADAS = [
  'docs/contexto.json', 'docs/contexto.md', 'docs/tarefas/backlog.md', 'docs/tarefas/reserva.md',
  'docs/tarefas/recusas.json', 'docs/tarefas/concluidas/0-indice.md',
  'docs/requisitos/implementados.md', 'docs/requisitos/pendentes.md', 'docs/auditorias',
].map((v) => `:(exclude)${v}`)

export function carregarAuditorias(): Auditoria[] {
  return listar(caminhos().auditorias, '.json').map((a) => lerJson<Auditoria>(a))
}

function git(args: string[]): { ok: boolean; saida: string } {
  const r = spawnSync('git', args, { cwd: caminhos().raiz, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  return { ok: r.status === 0, saida: `${r.stdout ?? ''}`.trim() }
}

/** Ordem de conclusao: o nome do arquivo de concluida comeca pelo carimbo, entao a lista ja' vem em ordem. */
function concluidasEmOrdem(): Tarefa[] {
  return listar(caminhos().concluidas, '.json').map((a) => lerJson<Tarefa>(a)).filter((t) => t.estado === 'concluida')
}

// ---------------------------------------------------------------- preparar

export function preparar(): number {
  const c = caminhos()
  const ctx = carregarContexto()
  const auditorias = carregarAuditorias()
  const jaAuditadas = new Set(auditorias.flatMap((a) => a.lote))
  const lote = concluidasEmOrdem().filter((t) => !jaAuditadas.has(t.id))

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

  const id = `AUD-${String(auditorias.length + 1).padStart(3, '0')}`
  const base = ctx.auditoria.ultimo_commit ?? lote[0]?.commit_base ?? null
  const final = git(['rev-parse', 'HEAD']).ok ? git(['rev-parse', 'HEAD']).saida : null

  const auditoria: Auditoria = {
    id,
    lote: lote.map((t) => t.id),
    commit_base: base,
    commit_final: final,
    preparada_em: agora().log,
    registrada_em: null,
    veredito: null,
    nao_verificado: [`${MARCADOR} o que voce NAO conseguiu verificar, e por que. Esta lista sustenta o veredito`],
    pendencias: [],
  }
  escreverJson(`${c.auditorias}/${id}.json`, auditoria)
  escreverTexto(`${c.auditorias}/${id}-dossie.md`, dossie(id, lote, base, final))

  console.log(`${id} preparada: ${lote.length} tarefa(s) no lote.`)
  console.log(`\nAbra uma sessao NOVA de IA — outra janela, contexto zerado — e diga a ela:`)
  console.log(`  "Leia ${relativo(`${c.auditorias}/${id}-dossie.md`)} e siga o que esta escrito la."`)
  console.log(`\nO dossie e' tudo o que o auditor pode ver. Nao de o repositorio a ela.`)
  return 0
}

/** Fatos, nunca julgamento: o script mede, o auditor decide o nivel. */
function fatosMecanicos(lote: Tarefa[], arquivosDoDiff: string[]): string[] {
  const fatos: string[] = []
  const declarados = new Set<string>()
  for (const t of lote) {
    for (const linha of t.plano.muda) {
      const arquivo = linha.split(/[\s:—-]/)[0]?.trim()
      if (arquivo) declarados.add(arquivo)
    }
  }
  const naoDeclarados = arquivosDoDiff.filter((a) => ![...declarados].some((d) => a === d || a.endsWith(d) || d.endsWith(a)))
  if (naoDeclarados.length) {
    fatos.push(`${naoDeclarados.length} arquivo(s) mudaram sem constar em nenhum \`plano.muda\` do lote: ${naoDeclarados.slice(0, 20).join(', ')}`)
  }
  for (const t of lote) {
    const semTeste = t.plano.criterios_aceite.filter((cr) => cr.teste.startsWith('nao se aplica'))
    if (semTeste.length) {
      fatos.push(`${t.id}: ${semTeste.length} criterio(s) de aceite sem teste nomeado ("nao se aplica"). Criterio sem verificacao reproduzivel e' criterio NAO VERIFICADO`)
    }
    for (const [nome, g] of Object.entries(t.gates)) {
      if (!g) continue
      if (g.rotulo === 'NÃO EXECUTADO' || g.rotulo === 'INVÁLIDO como gate') {
        fatos.push(`${t.id}: gate "${nome}" fechou como ${g.rotulo} — motivo declarado: ${g.motivo ?? '(nenhum)'}`)
      }
      if (nome === 'testes' && !g.vermelho_em) {
        fatos.push(`${t.id}: o gate "testes" nunca foi visto vermelho. Teste que nunca falhou pode estar passando sem exercitar o codigo`)
      }
    }
    if (t.achados.length) fatos.push(`${t.id}: fechou com ${t.achados.length} achado(s) proprio(s) ja com destino`)
  }
  return fatos.length ? fatos : ['nada a assinalar mecanicamente. Isso nao e um veredito: e a ausencia de sinal barato']
}

function dossie(id: string, lote: Tarefa[], base: string | null, final: string | null): string {
  const reqs = carregarRequisitos()
  const citados = new Set(lote.flatMap((t) => t.requisitos))
  let diff = ''
  let stat = ''
  let arquivos: string[] = []
  let recorte = ''
  // Pathspec `.` com o git rodando na raiz do projeto, e `--relative` para os caminhos saírem
  // relativos a ela. Assim um projeto dentro de um repositorio maior audita **so' a si mesmo**, e
  // o dossie nao muda de forma entre Windows e Linux por causa de caminho absoluto.
  const recorteDoProjeto = ['--relative', '--', '.', ...VISTAS_GERADAS]
  if (base) {
    stat = git(['diff', '--stat', base, ...recorteDoProjeto]).saida
    arquivos = git(['diff', '--name-only', base, ...recorteDoProjeto]).saida.split('\n').map((x) => x.trim()).filter(Boolean)
    diff = git(['diff', base, ...recorteDoProjeto]).saida
    if (diff.length > LIMITE_DIFF) {
      recorte = `\n\n⚠️ **O diff foi recortado em ${LIMITE_DIFF} de ${diff.length} caracteres.** O que nao coube nao foi auditado, e isso entra em "nao verificado" do relatorio.`
      diff = diff.slice(0, LIMITE_DIFF) + '\n[...recortado...]'
    }
  }
  // Arquivo criado e nunca commitado nao aparece em `git diff` — e e' justamente onde o erro novo
  // mora. Entra aqui inteiro, por `--no-index`, que le' sem tocar no indice de ninguem.
  const novos = git(['ls-files', '--others', '--exclude-standard']).saida.split('\n')
    .filter(Boolean).filter((f) => !f.startsWith('docs/'))
  let inteiros = ''
  for (const f of novos) {
    const conteudo = git(['diff', '--no-index', '--', '/dev/null', f]).saida
    inteiros += (conteudo || `+++ ${f} (nao consegui ler)`).slice(0, LIMITE_ARQUIVO_NOVO) + '\n'
  }
  arquivos = [...arquivos, ...novos]

  const l: string[] = []
  l.push(`# ${id} · dossie de auditoria`)
  l.push('')
  l.push('Voce e o **auditor**. Voce nao escreveu este codigo e nao vai corrigi-lo.')
  l.push('Seu unico poder e **reprovar**. Voce **nao abre tarefa**: quem decide o que vira trabalho e o humano.')
  l.push('')
  l.push('## O escopo, e por que ele e fechado')
  l.push('')
  l.push('Voce ve o que esta neste arquivo: o diff do lote, o registro de cada tarefa e os requisitos citados.')
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
  l.push(`Base do diff: \`${base ?? 'sem git — nao ha diff, e isso e um achado por si so'}\``)
  l.push(`Ate: \`${final ?? 'trabalho nao commitado'}\``)
  l.push('')
  for (const t of lote) {
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
      l.push(`| ${nome} | ${g.rotulo} | ${g.vermelho_em ?? '—'} | ${g.codigo_saida ?? '—'} | ${g.motivo ?? g.ressalva ?? '—'} |`)
    }
    l.push('')
    if (t.plano.riscos.length) { l.push(`**Riscos declarados:** ${t.plano.riscos.join(' · ')}`); l.push('') }
    if (t.achados.length) {
      l.push('**Achados que a propria tarefa registrou:**')
      l.push('')
      for (const a of t.achados) l.push(`- (classe ${a.classe}) ${a.descricao} → ${a.destino}: ${a.ref}`)
      l.push('')
    }
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
  for (const f of fatosMecanicos(lote, arquivos)) l.push(`- ${f}`)
  l.push('')
  l.push('## O diff')
  l.push('')
  if (!base) {
    l.push('Nao ha diff: o projeto nao tem git, ou a tarefa mais antiga do lote comecou antes do primeiro commit.')
    l.push('Sem historico nao ha auditoria de codigo. Registre isso em "nao verificado".')
  } else {
    l.push('```')
    l.push(stat || '(nenhuma mudanca no escopo do projeto)')
    l.push('```')
    l.push(recorte)
    l.push('')
    l.push('```diff')
    l.push(diff || '(vazio)')
    l.push('```')
  }
  l.push('')
  l.push('### Arquivos criados e nunca commitados')
  l.push('')
  if (!novos.length) l.push('Nenhum.')
  else {
    l.push(`${novos.length}: ${novos.join(', ')}. Nao aparecem no diff acima porque o git ainda nao os conhece — e e por isso que vao inteiros aqui.`)
    l.push('')
    l.push('```diff')
    l.push(inteiros.trim())
    l.push('```')
  }
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
  ctx.auditoria.ultima_na_tarefa = concluidasEmOrdem().length
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
    console.log(`Nenhuma auditoria ainda. Cadencia: a cada ${ctx.auditoria.cadencia_em_tarefas} tarefas concluidas (${feitas} ate agora).`)
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
