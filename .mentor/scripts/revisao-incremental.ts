import { createHash } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, readdirSync, rmSync, readlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { spawnSync } from 'node:child_process'
import { agora, escreverJson, escreverTexto, lerJson } from './arquivos.ts'
import { resolverPlano } from './cmd-plano.ts'
import type { ArquivoDoRetrato, ParteDeRevisao, RevisaoIncremental, Tarefa } from './tipos.ts'

export const LIMITE_PACOTE_REVISAO = 30_000
const LIMITE_CONTEXTO = 30_000
const ID_TAREFA = /\bTASK-[A-Z]+-\d{3}\b/g

interface ResultadoGit { ok: boolean; texto: string; bytes: Buffer }
interface Commit { sha: string; pai: string | null; titulo: string; arquivos: string[] }
interface ArquivoPatch { caminho: string; texto: string }

function git(raiz: string, args: string[], envAdicional: Record<string, string> = {}): ResultadoGit {
  const r = spawnSync('git', ['-c', 'core.quotepath=false', ...args], {
    cwd: raiz,
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...envAdicional },
  })
  const bytes = Buffer.from(r.stdout ?? [])
  return { ok: r.status === 0, texto: bytes.toString('utf8'), bytes }
}

export function hashSha256(conteudo: Buffer | string): string {
  return createHash('sha256').update(conteudo).digest('hex')
}

/** A ordem de chaves de JSON nao muda a politica, mas a ordem dos arrays continua significativa. */
function jsonCanonico(valor: unknown): string {
  const ordenar = (atual: unknown): unknown => {
    if (Array.isArray(atual)) return atual.map(ordenar)
    if (atual !== null && typeof atual === 'object') {
      const objeto = atual as Record<string, unknown>
      return Object.fromEntries(Object.keys(objeto).sort().map((chave) => [chave, ordenar(objeto[chave])]))
    }
    return atual
  }
  return JSON.stringify(ordenar(valor))
}

/** Campos gerados na conclusão não mudam a política efetivamente revisada. */
export function conteudoAuditavel(caminho: string, conteudo: Buffer): Buffer {
  if (caminho.replace(/\\/g, '/') !== 'docs-mentor/contexto.json') return conteudo
  const ctx = JSON.parse(conteudo.toString('utf8')) as Record<string, unknown>
  const auditoria = { ...((ctx.auditoria ?? {}) as Record<string, unknown>) }
  for (const campo of ['ultima_em', 'ultima_na_tarefa', 'ultimo_commit', 'proxima_em_tarefa', 'pendencias_reportadas']) delete auditoria[campo]
  const meta = { ...((ctx._meta ?? {}) as Record<string, unknown>) }
  delete meta.atualizado_em
  const projetado: Record<string, unknown> = { ...ctx, _meta: meta, auditoria }
  delete projetado.contagens
  delete projetado.lembretes
  return Buffer.from(jsonCanonico(projetado))
}

export function hashAuditavel(caminho: string, conteudo: Buffer): string {
  return hashSha256(conteudoAuditavel(caminho, conteudo))
}

/** Lê a saída -z sem perder nomes com espaços, tabs ou acentos. */
export function interpretarNameStatus(bytes: Buffer): Array<{ status: string; caminho: string; anterior?: string }> {
  const tokens = bytes.toString('utf8').split('\0').filter(Boolean)
  const arquivos: Array<{ status: string; caminho: string; anterior?: string }> = []
  for (let i = 0; i < tokens.length;) {
    const status = tokens[i++]!
    if (status.startsWith('R') || status.startsWith('C')) {
      const anterior = tokens[i++]
      const caminho = tokens[i++]
      if (anterior && caminho) arquivos.push({ status, caminho, anterior })
    } else {
      const caminho = tokens[i++]
      if (caminho) arquivos.push({ status, caminho })
    }
  }
  return arquivos
}

/**
 * As areas de revisao, num lugar so'. Delas saem as perguntas do dossie da REV, os guias que entram
 * nos contratos da revisao e a tabela de `processos/revisao.md` (gerada pelo `manifesto`), que e' o
 * que a revisao pedida em conversa segue. Ate' a 0.13.0 as perguntas e o mapa de guias moravam em
 * dois lugares, e a revisao em conversa nao via nenhum dos dois.
 */
export interface AreaDeRevisao {
  area: string
  /** Para quem le a tabela: quando a area se aplica. */
  sinais: string
  pergunta: string
  guias: string[]
  /** Casa com o caminho de algum arquivo da mudanca. */
  caminho: (arquivo: string) => boolean
  /** Casa com o diff, os riscos ou o tipo da tarefa. */
  conteudo: RegExp
}

export const AREAS_DE_REVISAO: AreaDeRevisao[] = [
  {
    area: 'persistência e migração',
    sinais: 'IndexedDB, storage, banco, schema, migração, versão do banco',
    pergunta: 'O que acontece com dados já persistidos, upgrade parcial e concorrência entre abas?',
    guias: ['.mentor/guia/06-persistencia.md'],
    caminho: (p) => /indexeddb|storage|database|migration|schema|db_version/.test(p),
    conteudo: /indexeddb|persist[êe]n|migra[çc]|schema|db_version/,
  },
  {
    area: 'corretude e cálculos',
    sinais: 'código-fonte, algoritmo, cálculo, fórmula, heurística, roteamento',
    pergunta: 'Há um caso de borda, contrato ou requisito cujo resultado o diff contradiz?',
    guias: ['.mentor/guia/07-codigo.md'],
    caminho: (p) => /routing|route|algorithm|calcul|formula|heuristic|\.(ts|tsx|js)$/.test(p),
    conteudo: /algorit|c[aá]lcul|f[oó]rmula|heur[ií]stic|roteamento/,
  },
  {
    area: 'interface e uso',
    sinais: 'componente, tela, página, estilo, interação, acessibilidade',
    pergunta: 'O fluxo, estado de erro e interação do usuário continuam compreensíveis e cobertos?',
    guias: ['.mentor/guia/08-interacao.md'],
    caminho: (p) => /\.tsx$|\.jsx$|\.css$|\.html$|component|page/.test(p),
    conteudo: /interface|componente|intera[çc][aã]o|acessib/,
  },
  {
    area: 'integridade das salvaguardas',
    sinais: '`.mentor/`, hook, gate, executor, auditoria, revisão',
    pergunta: 'A mudança mantém a regra e a evidência verificável ou abre um caminho de bypass?',
    guias: ['.mentor/guia/04-processo.md', '.mentor/guia/10-qualidade.md'],
    caminho: (p) => p.startsWith('.mentor/') || /hook|gate|executor|auditar|revisao/.test(p),
    conteudo: /hook|gate|auditor|revis[aã]o|salvaguarda/,
  },
  {
    area: 'segurança e privacidade',
    sinais: 'autenticação, token, segredo, permissão, log, dado pessoal',
    pergunta: 'Há segredo ou dado pessoal exposto, ou permissão além do necessário?',
    guias: ['.mentor/guia/09-seguranca.md'],
    caminho: (p) => /auth|token|secret|permission|security|log/.test(p),
    conteudo: /auth|token|seguran[çc]a|privacidade|permiss[aã]o|segredo/,
  },
]

/** Quando nenhuma area casa: a revisao ainda confere o escopo contra os criterios. */
export const AREA_PADRAO_DE_REVISAO = {
  area: 'corretude do escopo',
  sinais: 'nenhuma das áreas acima',
  pergunta: 'O diff atende aos critérios sem introduzir saída observável contraditória?',
  guias: ['.mentor/guia/07-codigo.md'],
}

export function perguntasPorRisco(arquivos: string[], diff = '', riscos: string[] = [], tipo = ''): Array<{ regra: string; pergunta: string }> {
  const paths = arquivos.map((a) => a.toLowerCase())
  const conteudo = `${diff}\n${riscos.join('\n')}\n${tipo}`.toLowerCase()
  const regras = AREAS_DE_REVISAO
    .filter((a) => paths.some((p) => a.caminho(p)) || a.conteudo.test(conteudo))
    .map((a) => ({ regra: a.area, pergunta: a.pergunta }))
  if (regras.length === 0) regras.push({ regra: AREA_PADRAO_DE_REVISAO.area, pergunta: AREA_PADRAO_DE_REVISAO.pergunta })
  return regras
}

export const MARCA_AREAS_INICIO = '<!-- mentor:areas-de-revisao:inicio -->'
export const MARCA_AREAS_FIM = '<!-- mentor:areas-de-revisao:fim -->'

/** A tabela de `processos/revisao.md`, com os marcadores. Gerada; nunca escrita a mao. */
export function tabelaDasAreasDeRevisao(): string {
  const linha = (a: { area: string; sinais: string; pergunta: string; guias: string[] }) =>
    `| ${a.area} | ${a.sinais} | ${a.pergunta} | ${a.guias.map((g) => `\`${g}\``).join(' · ')} |`
  return [
    MARCA_AREAS_INICIO,
    '<!-- Gerado de AREAS_DE_REVISAO (scripts/revisao-incremental.ts) por `node mentor.mjs manifesto`. Nao edite. -->',
    '',
    '| Área | Quando se aplica | Pergunta que a revisão responde | Guia a carregar |',
    '|---|---|---|---|',
    ...AREAS_DE_REVISAO.map(linha),
    linha(AREA_PADRAO_DE_REVISAO),
    '',
    MARCA_AREAS_FIM,
  ].join('\n')
}

/** Somente o contrato que o auditor julgou; datas, gates e vistas geradas não fazem parte dele. */
export function assinaturaSemanticaDaTarefa(tarefa: Tarefa): string {
  return hashSha256(JSON.stringify({
    id: tarefa.id, tipo: tarefa.tipo, cerimonia: tarefa.cerimonia,
    plano_ref: tarefa.plano_ref ?? null,
    muda: tarefa.plano?.muda ?? [], criterios: tarefa.plano?.criterios_aceite ?? [],
    riscos: tarefa.plano?.riscos ?? [], impacto: tarefa.plano?.impacto ?? null,
    decisoes_aplicaveis: tarefa.plano?.decisoes_aplicaveis ?? null,
    reuso: tarefa.plano?.reuso ?? null,
    habilidades: tarefa.plano?.habilidades ?? null,
    avaliacao: tarefa.plano?.avaliacao ?? null,
    documentos_herdados: tarefa.plano?.documentos_herdados ?? null,
  }))
}

const GUIAS_DA_REGRA: Record<string, string[]> = Object.fromEntries(
  [...AREAS_DE_REVISAO, AREA_PADRAO_DE_REVISAO].map((a) => [a.area, a.guias]),
)

export function contratosDaRevisao(raiz: string, tarefas: Tarefa[], regras: Array<{ regra: string }>): Array<{ caminho: string; sha256: string }> {
  const caminhos = new Set<string>(['.mentor/nucleo.md', '.mentor/processos/revisao.md'])
  for (const regra of regras) for (const caminho of GUIAS_DA_REGRA[regra.regra] ?? []) caminhos.add(caminho)
  for (const tarefa of tarefas) {
    const ref = tarefa.plano_ref?.arquivo?.replace(/\\/g, '/')
    if (ref) {
      if (isAbsolute(ref) || ref.split('/').includes('..')) throw new Error(`Plano referenciado fora do projeto: ${ref}`)
      caminhos.add(ref)
      const json = ref.endsWith('.md') ? ref.replace(/\.md$/, '.contrato.json') : `${ref}/contrato.json`
      if (existsSync(join(raiz, json))) caminhos.add(json)
    }
    if (tarefa.plano_ref?.manifesto) {
      for (const mCaminho of Object.keys(tarefa.plano_ref.manifesto)) {
        if (!isAbsolute(mCaminho) && !mCaminho.split('/').includes('..')) {
          caminhos.add(mCaminho)
        }
      }
    }
  }
  return [...caminhos].sort().flatMap((caminho) => {
    const abs = join(raiz, caminho)
    if (!existsSync(abs)) return []
    const real = realpathSync(abs)
    const rel = relative(realpathSync(raiz), real)
    if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`Contrato fora do projeto: ${caminho}`)
    if (!lstatSync(abs).isFile()) return []
    return [{ caminho, sha256: hashSha256(readFileSync(abs)) }]
  })
}

export function validarCaminhoContextual(raiz: string, caminho: string): string {
  if (!caminho.trim() || isAbsolute(caminho) || /^[A-Za-z]:/.test(caminho)) throw new Error('O contexto exige caminho relativo dentro do projeto.')
  const partes = caminho.replace(/\\/g, '/').split('/')
  if (partes.some((p) => p === '..' || p === '')) throw new Error('Caminho contextual com travessia ou segmento vazio foi recusado.')
  const alvo = resolve(raiz, ...partes)
  const rel = relative(resolve(raiz), alvo)
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error('Caminho contextual fora da raiz do projeto.')
  let realRaiz: string
  let realAlvo: string
  try { realRaiz = realpathSync(raiz); realAlvo = realpathSync(alvo) } catch { throw new Error(`Arquivo contextual não existe: ${caminho}`) }
  const relReal = relative(realRaiz, realAlvo)
  if (relReal === '..' || relReal.startsWith(`..${sep}`) || isAbsolute(relReal)) throw new Error('Symlink contextual fora da raiz do projeto foi recusado.')
  if (!lstatSync(alvo).isFile()) throw new Error('O contexto adicional aceita somente arquivos.')
  const conteudo = readFileSync(alvo)
  if (conteudo.includes(0)) throw new Error('Arquivo binário não pode ser enviado como contexto textual.')
  if (conteudo.length > LIMITE_CONTEXTO) throw new Error(`Arquivo excede ${LIMITE_CONTEXTO} bytes; solicite um arquivo ou recorte menor.`)
  return conteudo.toString('utf8')
}

function interpretarCommits(raiz: string, base: string, alvo: string): Commit[] {
  const log = git(raiz, ['log', '--first-parent', '--reverse', '--no-merges', '--format=%H%x1f%P%x1f%s', `${base}..${alvo}`])
  if (!log.ok) throw new Error('Não foi possível ler o histórico entre a base e o alvo.')
  const commits: Commit[] = []
  for (const linha of log.texto.split('\n').filter(Boolean)) {
    const [sha, pais = '', titulo = ''] = linha.split('\x1f')
    if (!sha) continue
    const pai = pais.trim().split(/\s+/)[0] || null
    const diff = git(raiz, ['diff', '--name-status', '-z', '--find-renames', ...(pai ? [pai, sha] : [sha])])
    if (!diff.ok) throw new Error(`Não foi possível identificar arquivos do commit ${sha.slice(0, 7)}.`)
    commits.push({ sha, pai, titulo, arquivos: interpretarNameStatus(diff.bytes).flatMap((a) => a.anterior ? [a.anterior, a.caminho] : [a.caminho]) })
  }
  return commits
}

function declaracoes(plan: string[]): string[] {
  const out: string[] = []
  for (const linha of plan) {
    const m = /(?:^|`)([^`]+\.[A-Za-z0-9]+)(?:`|\s|$)/.exec(linha)
    if (m?.[1]) out.push(m[1].replace(/\\/g, '/').replace(/^\.\//, ''))
  }
  return [...new Set(out)]
}

function corresponde(caminho: string, declarados: string[]): boolean {
  const a = caminho.replace(/\\/g, '/').replace(/^\.\//, '')
  return declarados.some((d) => {
    const pattern = d.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')
    return new RegExp(`^${pattern}(?:$|/)`).test(a)
  })
}

function nomesDoDiff(raiz: string, base: string, alvo: string): string[] {
  const r = git(raiz, ['diff', '--name-status', '-z', '--find-renames', base, alvo])
  if (!r.ok) throw new Error('Não foi possível comparar os arquivos da base e do alvo.')
  return interpretarNameStatus(r.bytes).flatMap((a) => a.anterior ? [a.anterior, a.caminho] : [a.caminho])
}

function nomesDoTrabalho(raiz: string, base: string): string[] {
  const r = git(raiz, ['diff', '--name-status', '-z', '--find-renames', base, '--'])
  if (!r.ok) throw new Error('Não foi possível comparar a base com o trabalho local.')
  return interpretarNameStatus(r.bytes).flatMap((a) => a.anterior ? [a.anterior, a.caminho] : [a.caminho])
}

function nomesNaoRastreados(raiz: string): string[] {
  const r = git(raiz, ['ls-files', '--others', '--exclude-standard', '-z'])
  if (!r.ok) throw new Error('Não foi possível enumerar arquivos novos no working tree.')
  return r.bytes.toString('utf8').split('\0').filter(Boolean)
}

function entradasDaArvore(raiz: string, arvore: string, caminhos: string[]): Map<string, { mode: string; blob: string }> {
  const out = new Map<string, { mode: string; blob: string }>()
  for (const caminho of caminhos) {
    const r = git(raiz, ['ls-tree', '-z', arvore, '--', caminho])
    if (!r.ok || !r.bytes.length) continue
    const cab = r.bytes.toString('utf8').split('\0')[0] ?? ''
    const m = /^(\d+) blob ([a-f0-9]+)\t(.+)$/.exec(cab)
    if (m?.[1] && m[2] && m[3]) out.set(m[3], { mode: m[1], blob: m[2] })
  }
  return out
}

function nomeStatus(status: string): ArquivoDoRetrato['status'] {
  if (status.startsWith('A')) return 'adicionado'
  if (status.startsWith('D')) return 'removido'
  if (status.startsWith('R')) return 'renomeado'
  return 'modificado'
}

function proximoId(pasta: string): string {
  let maior = 0
  for (const nome of readdirSync(pasta, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name)) {
    const n = /^REV-(\d{3,})\.json$/.exec(nome)?.[1]
    if (n) maior = Math.max(maior, Number(n))
  }
  return `REV-${String(maior + 1).padStart(3, '0')}`
}

function blocoDoArquivo(patch: ArquivoPatch): string[] {
  return [`### ${patch.caminho}`, '', '```diff', ...(patch.texto || '(sem diff textual)').split('\n'), '```', '']
}

/** Divide somente em limites de linhas; índice e cada parte recebem o mesmo teto, sem descartar diff. */
export function dividirEmPartes(introducao: string[], patches: ArquivoPatch[], max = LIMITE_PACOTE_REVISAO): Array<{ texto: string; arquivos: string[] }> {
  const head = introducao.join('\n') + '\n\n'
  if (head.length >= max - 100) throw new Error(`Metadados/instruções (${head.length}) deixam menos de 100 caracteres para o diff no teto ${max}.`)
  const partes: Array<{ texto: string; arquivos: string[] }> = []
  let texto = head
  let caminhos = new Set<string>()
  const fechar = () => {
    partes.push({ texto, arquivos: [...caminhos] })
    texto = `${head}Continuação da revisão: esta parte contém somente os arquivos listados abaixo.\n\n`
    caminhos = new Set()
  }
  for (const patch of patches) {
    const bloco = blocoDoArquivo(patch).join('\n')
    if (texto.length + bloco.length + 1 <= max) {
      texto += `${bloco}\n`
      caminhos.add(patch.caminho)
      continue
    }
    if (texto.length > head.length) fechar()
    const linhas = patch.texto.split('\n')
    let indice = 0
    while (indice < linhas.length) {
      const prefixo = `### ${patch.caminho}${indice ? ' (continuação)' : ''}\n\n\`\`\`diff\n`
      const sufixo = '\n\`\`\`\n'
      const capacidade = max - texto.length - prefixo.length - sufixo.length - 1
      if (capacidade < 1) { fechar(); continue }
      let conteudo = ''
      while (indice < linhas.length) {
        const proxima = `${conteudo ? '\n' : ''}${linhas[indice]}`
        if (conteudo.length + proxima.length > capacidade) break
        conteudo += proxima
        indice++
      }
      if (!conteudo && indice < linhas.length) {
        const linha = linhas[indice]!
        conteudo = linha.slice(0, capacidade)
        linhas[indice] = linha.slice(capacidade)
      }
      const fragmento = `${prefixo}${conteudo}${sufixo}\n`
      if (texto.length + fragmento.length > max && texto.length > head.length) { fechar(); continue }
      texto += fragmento
      caminhos.add(patch.caminho)
      if (indice < linhas.length) fechar()
    }
  }
  if (texto.length > head.length || partes.length === 0) fechar()
  if (partes.some((p) => p.texto.length > max)) throw new Error('Particionamento excedeu o teto; preparação recusada sem omitir conteúdo.')
  return partes
}

export interface PrepararRevisaoOptions {
  raiz: string
  pastaAuditorias: string
  tarefa: Tarefa
  tarefasConhecidas: Tarefa[]
  resolverArquivosGerados?: (arquivos: string[]) => Map<string, string | null>
}

export function prepararRevisaoIncremental(options: PrepararRevisaoOptions): RevisaoIncremental {
  const { raiz, pastaAuditorias, tarefa } = options
  mkdirSync(pastaAuditorias, { recursive: true })
  const planoPrincipal = resolverPlano(tarefa, raiz)
  if (!planoPrincipal.revisao_valida || planoPrincipal.falta_contrato) throw new Error(`Plano de ${tarefa.id} não está resolvido: ${planoPrincipal.diagnosticos.join('; ')}`)
  const head = git(raiz, ['rev-parse', 'HEAD'])
  if (!head.ok) throw new Error('A revisão incremental exige um repositório Git com HEAD válido.')
  const headSha = head.texto.trim()
  const declarados = declaracoes(planoPrincipal.muda)
  const historico = tarefa.commit_base ? interpretarCommits(raiz, tarefa.commit_base, headSha) : []
  const padrao = new RegExp(`(?<![A-Za-z0-9])${tarefa.id}(?![0-9])`)
  const commits = historico.filter((c) => padrao.test(c.titulo))
  const base = commits.length ? (commits[0]!.pai ?? tarefa.commit_base!) : tarefa.commit_base
  if (!base) throw new Error('Tarefa sem commit_base. Inicie a tarefa antes de preparar a revisão.')

  const idsRelacionados = new Set<string>([tarefa.id])
  for (const commit of commits) for (const id of commit.titulo.match(ID_TAREFA) ?? []) idsRelacionados.add(id)
  const tarefas = options.tarefasConhecidas.filter((t) => idsRelacionados.has(t.id))
  const planos = new Map(tarefas.map((t) => [t.id, resolverPlano(t, raiz)]))
  for (const [id, plano] of planos) if (!plano.revisao_valida || plano.falta_contrato) throw new Error(`Plano de ${id} não está resolvido: ${plano.diagnosticos.join('; ')}`)
  const declaradosUnidade = [...new Set(tarefas.flatMap((t) => declaracoes(planos.get(t.id)?.muda ?? []))) ]
  const selecionados = new Set(commits.map((c) => c.sha))
  const candidatos = new Set<string>(commits.flatMap((c) => c.arquivos).filter((a) => corresponde(a, declaradosUnidade)))
  const diffAtual = [...nomesDoDiff(raiz, tarefa.commit_base ?? base, headSha), ...nomesDoTrabalho(raiz, tarefa.commit_base ?? base)]
  for (const caminho of [...diffAtual, ...nomesNaoRastreados(raiz)]) {
    if (corresponde(caminho, declarados)) candidatos.add(caminho)
  }
  if (candidatos.size === 0) throw new Error(`Não encontrei arquivos de ${tarefa.id}. Confira plano.muda, commit_base e o estado do Git.`)

  const primeiroIndice = commits.length ? historico.findIndex((c) => c.sha === commits[0]!.sha) : -1
  const externos = primeiroIndice >= 0 ? historico.slice(primeiroIndice + 1) : historico
  const arquivosExternos = new Map<string, string[]>()
  for (const commit of externos) {
    if (selecionados.has(commit.sha)) continue
    for (const caminho of commit.arquivos) {
      if (candidatos.has(caminho)) arquivosExternos.set(caminho, [...(arquivosExternos.get(caminho) ?? []), `${commit.sha.slice(0, 7)} ${commit.titulo}`])
    }
  }

  const pastaIndice = mkdtempSync(join(tmpdir(), 'mentor-revisao-index-'))
  const indice = join(pastaIndice, 'index')
  const env = { GIT_INDEX_FILE: indice }
  let arvore = ''
  const arquivosOrdenados = [...candidatos].sort()
  try {
    const leitura = git(raiz, ['read-tree', base], env)
    if (!leitura.ok) throw new Error(`Não foi possível criar retrato a partir da base ${base.slice(0, 12)}.`)
    const before = new Map<string, string | null>()
    for (const caminho of arquivosOrdenados) {
      const p = join(raiz, caminho)
      try { before.set(caminho, hashSha256(lstatSync(p).isSymbolicLink() ? readlinkSync(p) : readFileSync(p))) } catch { before.set(caminho, null) }
      const add = git(raiz, ['add', '-A', '--', caminho], env)
      if (!add.ok) throw new Error(`Não consegui capturar ${caminho} no retrato temporário.`)
    }
    const writeTree = git(raiz, ['write-tree'], env)
    if (!writeTree.ok) throw new Error('Não foi possível gravar a árvore Git temporária da revisão.')
    arvore = writeTree.texto.trim()
    for (const caminho of arquivosOrdenados) {
      let depois: string | null = null
      try {
        const p = join(raiz, caminho)
        depois = hashSha256(lstatSync(p).isSymbolicLink() ? readlinkSync(p) : readFileSync(p))
      } catch { depois = null }
      if (before.get(caminho) !== depois) throw new Error(`O arquivo ${caminho} mudou durante a captura; execute preparar novamente.`)
    }
  } finally {
    rmSync(pastaIndice, { recursive: true, force: true })
  }

  const delta = git(raiz, ['diff', '--name-status', '-z', '--find-renames', base, arvore, '--', ...arquivosOrdenados])
  if (!delta.ok) throw new Error('Não foi possível comparar a base com o retrato capturado.')
  const mudancas = interpretarNameStatus(delta.bytes)
  const hashesBase = entradasDaArvore(raiz, base, arquivosOrdenados)
  const hashesAlvo = entradasDaArvore(raiz, arvore, arquivosOrdenados)
  const exclusoes = options.resolverArquivosGerados?.(arquivosOrdenados) ?? new Map<string, string | null>()
  const arquivos: ArquivoDoRetrato[] = []
  let patches: ArquivoPatch[] = []
  for (const item of mudancas) {
    const caminho = item.caminho
    const conteudo = hashesAlvo.get(caminho)
    const conteudoBase = hashesBase.get(item.anterior ?? caminho)
    const bin = conteudo ? git(raiz, ['cat-file', 'blob', conteudo.blob]) : null
    const patch = git(raiz, ['diff', '--no-ext-diff', '--no-color', '--find-renames', base, arvore, '--', ...(item.anterior ? [item.anterior] : []), caminho])
    if (!patch.ok) throw new Error(`Não foi possível extrair diff de ${caminho}.`)
    const ambiguidade = arquivosExternos.get(caminho)?.length
      ? `Commits externos também alteraram este arquivo: ${arquivosExternos.get(caminho)!.join('; ')}`
      : null
    arquivos.push({
      caminho,
      status: nomeStatus(item.status),
      modo: conteudo?.mode ?? null,
      caminho_anterior: item.anterior ?? null,
      sha256: bin ? hashAuditavel(caminho, bin.bytes) : null,
      sha256_base: conteudoBase ? hashAuditavel(item.anterior ?? caminho, git(raiz, ['cat-file', 'blob', conteudoBase.blob]).bytes) : null,
      ambiguidade,
      motivo_omissao: exclusoes.get(caminho) ?? null,
      caracteres: patch.texto.length,
    })
    if (!exclusoes.get(caminho)) patches.push({ caminho, texto: patch.texto })
  }

  const pasta = pastaAuditorias
  const id = proximoId(pasta)
  const existentes = readdirSync(pasta).filter((nome) => /^REV-\d+\.json$/.test(nome)).map((nome) => lerJson<RevisaoIncremental>(join(pasta, nome)))
  const anterior = existentes.filter((r) => r.tarefas.includes(tarefa.id)).sort((a, b) => Number(b.id.slice(4)) - Number(a.id.slice(4)))[0]
  const unidadeId = `CHG-${hashSha256([...selecionados].sort().join('\n') || `${tarefa.id}:${arvore}`).slice(0, 12)}`
  if (existentes.some((r) => r.unidade.id === unidadeId && r.arvore_retrato === arvore && r.estado !== 'desatualizada')) {
    const repetida = existentes.find((r) => r.unidade.id === unidadeId && r.arvore_retrato === arvore && r.estado !== 'desatualizada')!
    throw new Error(`Esta unidade e retrato já aparecem em ${repetida.id}; reutilize esse parecer enquanto a cobertura for válida.`)
  }

  const requisitos = tarefas.flatMap((t) => (planos.get(t.id)?.criterios_aceite ?? []).map((c, i) => {
    const e = c.evidencia
    return `${t.id} critério ${i + 1}: ${c.texto}${e ? ` · evidência: ${e.comando ?? 'sem comando'} (código ${e.codigo_saida ?? 'n/d'})${e.saida ? ` — ${e.saida.slice(0, 500)}` : ''}` : ''}`
  }))
  const evidenciasDeGate = tarefas.flatMap((t) => Object.entries(t.gates ?? {}).flatMap(([nome, g]) => g ?
    [`${t.id} gate ${nome}: ${g.rotulo}; comando=${g.comando ?? 'n/d'}; saída=${g.codigo_saida ?? 'n/d'}; log=${g.log_ref ?? g.evidencia_url ?? 'sem referência'}`] : []))
  const diretrizesNormativas = tarefas.flatMap((t) => {
    const pl = planos.get(t.id)
    const itens: string[] = []
    if (pl?.decisoes_aplicaveis && Array.isArray(pl.decisoes_aplicaveis)) {
      itens.push(...pl.decisoes_aplicaveis.map((d) => `${t.id} diretriz ${d.adr}: ${d.aplicacao}`))
    }
    return itens
  })
  const instrucoes = [
    'Revisão incremental do Mentor. Avalie somente o retrato, os critérios e o contexto fornecidos.',
    `Tarefas vinculadas: ${tarefas.map((t) => t.id).join(', ')}`,
    `Base: ${base} · árvore capturada: ${arvore} · unidade: ${unidadeId}`,
    'Não leia o repositório nem abra tarefas. Reporte achados concretos; o destino é decisão humana.',
    ...requisitos.map((r) => `Critério: ${r}`),
    ...evidenciasDeGate.map((g) => `Gate registrado: ${g}`),
    ...diretrizesNormativas.map((d) => `Diretriz normativa: ${d}`),
  ]
  const regras = perguntasPorRisco(arquivosOrdenados, patches.map((p) => p.texto).join('\n'), tarefas.flatMap((t) => planos.get(t.id)?.riscos ?? []), tarefas.map((t) => t.tipo).join(' '))
  const contratos = contratosDaRevisao(raiz, tarefas, regras)
  const assinaturas = Object.fromEntries(tarefas.map((t) => [t.id, assinaturaSemanticaDaTarefa(t)]))
  const herancaPermitida = anterior?.estado === 'aprovada' && anterior.veredito === 'APROVADO' &&
    anterior.partes.every((p) => p.lida) && !anterior.arquivos.some((a) => a.ambiguidade) &&
    JSON.stringify(anterior.assinaturas_tarefas) === JSON.stringify(assinaturas) &&
    JSON.stringify(anterior.contratos) === JSON.stringify(contratos) &&
    JSON.stringify(anterior.regras) === JSON.stringify(regras)
  if (herancaPermitida) {
    const alterados = new Set(nomesDoDiff(raiz, anterior.arvore_retrato, arvore))
    for (const arquivo of arquivos) {
      const previo = anterior.arquivos.find((a) => a.caminho === arquivo.caminho)
      if (!alterados.has(arquivo.caminho) && !arquivo.motivo_omissao && previo && !previo.motivo_omissao &&
          previo.sha256 === arquivo.sha256 && previo.modo === arquivo.modo && previo.status === arquivo.status) {
        arquivo.cobertura_herdada_de = anterior.id
        arquivo.caracteres = 0
      }
    }
    patches = arquivos.filter((a) => !a.motivo_omissao && !a.cobertura_herdada_de).map((a) => {
      const patch = git(raiz, ['diff', '--no-ext-diff', '--no-color', '--find-renames', anterior.arvore_retrato, arvore, '--', ...(a.caminho_anterior ? [a.caminho_anterior] : []), a.caminho])
      if (!patch.ok) throw new Error(`Não foi possível extrair correção de ${a.caminho}.`)
      a.caracteres = patch.texto.length
      return { caminho: a.caminho, texto: patch.texto }
    })
  }
  if (anterior && herancaPermitida) instrucoes.push(`Correção de ${anterior.id}: examine o delta entre retratos; arquivos marcados como herdados conservam cobertura anterior ainda válida.`)
  const introducao = [...instrucoes, ...regras.flatMap((r) => [`Regra: ${r.regra}`, `Pergunta: ${r.pergunta}`])]
  let limiteParte = LIMITE_PACOTE_REVISAO
  let pacotes: ReturnType<typeof dividirEmPartes> = []
  let partes: ParteDeRevisao[] = []
  let indexText = ''
  for (let tentativa = 0; tentativa < 12; tentativa++) {
    pacotes = dividirEmPartes(introducao, patches, limiteParte)
    partes = pacotes.map((p, i) => ({
      id: `${id}-P${String(i + 1).padStart(2, '0')}`,
      arquivo: `${id}-parte-${String(i + 1).padStart(2, '0')}.md`,
      caracteres: p.texto.length,
      arquivos: p.arquivos,
      lida: false,
    }))
    const secaoContratoNormativo = [
      '', '**Contrato e Diretrizes Normativas**', '',
      ...tarefas.flatMap((t) => {
        const pl = planos.get(t.id)
        const linhas: string[] = [`- Tarefa \`${t.id}\`:`]
        if (pl?.arquivo) linhas.push(`  Plano fonte: \`${pl.arquivo}\` (sha256: ${pl.sha256 ? pl.sha256.slice(0, 8) : 'n/d'})`)
        if (t.plano_ref?.manifesto) {
          const chaves = Object.keys(t.plano_ref.manifesto)
          linhas.push(`  Documentos normativos herdados: ${chaves.length ? chaves.map((k) => `\`${k}\``).join(', ') : 'nenhum'}`)
        }
        if (pl?.decisoes_aplicaveis) {
          if (Array.isArray(pl.decisoes_aplicaveis)) {
            linhas.push(`  Decisões aplicáveis: ${pl.decisoes_aplicaveis.map((d) => `${d.adr} (${d.aplicacao})`).join('; ')}`)
          } else if (pl.decisoes_aplicaveis.motivo_ausencia) {
            linhas.push(`  Decisões aplicáveis: ausência justificada (${pl.decisoes_aplicaveis.motivo_ausencia})`)
          }
        }
        if (pl?.reuso) {
          const ex = pl.reuso.existentes?.length ? pl.reuso.existentes.join(', ') : 'nenhum'
          linhas.push(`  Reuso existente: ${ex}`)
        }
        return linhas
      }),
    ]
    indexText = [
      `# ${id} · revisão incremental`, '',
      `Estado: preparada · tarefa: ${tarefa.id} · unidade: ${unidadeId}`,
      `Base: ${base} · árvore imutável: ${arvore} · candidato HEAD: ${headSha}`,
      `Commits únicos: ${commits.length} · arquivos: ${arquivos.length} · partes: ${partes.length}`,
      '', '**Inventário**', '',
      '| Arquivo | Estado | SHA-256 capturado | Situação |', '| --- | --- | --- | --- |',
      ...arquivos.map((a) => `| \`${a.caminho}\` | ${a.status} | ${a.sha256 ?? 'removido'} | ${a.ambiguidade ?? (a.cobertura_herdada_de ? `cobertura herdada de ${a.cobertura_herdada_de}` : 'delta isolado')} |`),
      ...secaoContratoNormativo,
      '', '**Regras selecionadas**', '',
      ...regras.map((r) => `- ${r.regra}: ${r.pergunta}`), '', '**Partes**', '',
      ...partes.map((p) => `- \`${p.arquivo}\` · ${p.caracteres} caracteres · ${p.arquivos.join(', ') || 'sem diff'}`),
      '', 'Leia a primeira parte. Abra as demais conforme necessário e marque cada uma como lida; cobertura parcial não aprova a unidade.',
    ].join('\n')
    const totalInicial = indexText.length + (pacotes[0]?.texto.length ?? 0)
    if (totalInicial <= LIMITE_PACOTE_REVISAO) break
    limiteParte -= totalInicial - LIMITE_PACOTE_REVISAO + 100
    if (limiteParte <= introducao.join('\n').length + 100) throw new Error('Índice e instruções ultrapassam o teto total de 30.000 caracteres.')
  }
  if (indexText.length + (pacotes[0]?.texto.length ?? 0) > LIMITE_PACOTE_REVISAO) throw new Error('Pacote inicial ultrapassou o teto total de 30.000 caracteres.')
  const registro: RevisaoIncremental = {
    schema: 'auditoria-incremental/1', id, estado: 'preparada',
    tarefas: tarefas.map((t) => t.id), tarefa_solicitada: tarefa.id,
    revisao_anterior: anterior?.id ?? null,
    preparada_em: agora().log, registrada_em: null,
    base, alvo: headSha, arvore_retrato: arvore,
    unidade: { id: unidadeId, commits: commits.map((c) => c.sha) },
    assinaturas_tarefas: assinaturas,
    contratos, sessao_revisora: null, pacote_inicial_caracteres: indexText.length + (pacotes[0]?.texto.length ?? 0),
    arquivos, regras, partes, veredito: null, nao_verificado: [], pendencias: [], contextos: [],
  }
  escreverJson(join(pasta, `${id}.json`), registro)
  escreverTexto(join(pasta, `${id}-dossie.md`), indexText)
  pacotes.forEach((p, i) => escreverTexto(join(pasta, partes[i]!.arquivo), p.texto))
  return registro
}

export function obterContextoAdicional(raiz: string, pastaAuditorias: string, id: string, arquivo: string, motivo: string): string {
  if (!/^REV-\d{3,}$/.test(id)) throw new Error('ID de revisão inválido.')
  if (!motivo.trim()) throw new Error('Informe --motivo com a pergunta que este contexto deve responder.')
  const conteudo = validarCaminhoContextual(raiz, arquivo)
  const revisao = lerJson<RevisaoIncremental>(join(pastaAuditorias, `${id}.json`))
  if (revisao.schema !== 'auditoria-incremental/1') throw new Error(`${id} não é uma revisão incremental.`)
  const entrada = [`# Contexto adicional para ${id}`, '', `Arquivo: ${arquivo}`, `Pergunta: ${motivo}`, `SHA-256: ${hashSha256(conteudo)}`, '', '```', conteudo, '```'].join('\n')
  if (entrada.length > LIMITE_CONTEXTO) throw new Error(`Contexto completo excede ${LIMITE_CONTEXTO} caracteres; peça um arquivo menor.`)
  revisao.contextos.push({ arquivo, motivo, sha256: hashSha256(conteudo), caracteres: entrada.length, gerado_em: agora().log })
  escreverJson(join(pastaAuditorias, `${id}.json`), revisao)
  const destino = `${id}-contexto-${String(revisao.contextos.length).padStart(2, '0')}.md`
  escreverTexto(join(pastaAuditorias, destino), entrada)
  return destino
}

export function registrarRevisaoIncremental(raiz: string, pastaAuditorias: string, id: string): number {
  if (!/^REV-\d{3,}$/.test(id)) throw new Error('ID de revisão inválido.')
  const caminho = join(pastaAuditorias, `${id}.json`)
  const r = lerJson<RevisaoIncremental>(caminho)
  const erros: string[] = []
  if (r.schema !== 'auditoria-incremental/1') throw new Error(`${id} não é uma revisão incremental.`)
  if (r.registrada_em) erros.push(`já registrada em ${r.registrada_em}`)
  if (!r.veredito || !(['APROVADO', 'APROVADO COM RESSALVAS', 'REPROVADO'] as string[]).includes(r.veredito)) erros.push('veredito ausente ou inválido')
  if (!r.sessao_revisora?.trim()) erros.push('declare sessao_revisora da sessão independente')
  if (r.partes.some((p) => !p.lida)) erros.push('há partes não marcadas como lidas')
  if (r.arquivos.some((a) => !a.motivo_omissao && !a.cobertura_herdada_de && !r.partes.some((p) => p.arquivos.includes(a.caminho)))) erros.push('há arquivos sem parte de diff, cobertura herdada ou motivo de omissão')
  if (r.pendencias.some((p) => !p.descricao?.trim() || !['bloqueia', 'recomendacao', 'observacao'].includes(p.nivel) || p.destino || p.ref)) erros.push('há pendência incompleta ou com destino preenchido')
  if (r.pendencias.some((p) => p.nivel === 'bloqueia') && r.veredito === 'APROVADO') erros.push('APROVADO é incompatível com achado bloqueante')
  if (r.veredito === 'REPROVADO' && !r.pendencias.some((p) => p.nivel === 'bloqueia')) erros.push('REPROVADO exige ao menos um achado bloqueante')
  if (r.arquivos.some((a) => a.ambiguidade) && (r.veredito !== 'APROVADO COM RESSALVAS' && r.veredito !== 'REPROVADO' || !r.nao_verificado.length)) erros.push('arquivos ambíguos exigem veredito com ressalvas/reprovado e limitação explícita')
  for (const a of r.arquivos.filter((x) => x.cobertura_herdada_de)) {
    let anterior: RevisaoIncremental | null = null
    try { anterior = lerJson<RevisaoIncremental>(join(pastaAuditorias, `${a.cobertura_herdada_de}.json`)) } catch { /* parecer ausente */ }
    const previa = anterior?.arquivos.find((x) => x.caminho === a.caminho)
    if (!anterior || r.revisao_anterior !== anterior.id || anterior.estado !== 'aprovada' || anterior.veredito !== 'APROVADO' ||
        previa?.sha256 !== a.sha256 || previa.modo !== a.modo ||
        JSON.stringify(anterior.assinaturas_tarefas) !== JSON.stringify(r.assinaturas_tarefas) ||
        JSON.stringify(anterior.contratos) !== JSON.stringify(r.contratos) || JSON.stringify(anterior.regras) !== JSON.stringify(r.regras)) {
      erros.push(`cobertura herdada de ${a.caminho} não é válida`)
    }
  }
  if (erros.length) { console.error(`Não foi possível registrar ${id}: ${erros.join('; ')}.`); return 1 }
  for (const a of r.arquivos.filter((x) => !x.motivo_omissao)) {
    let atual: string | null = null
    try { const p = join(raiz, a.caminho); atual = hashAuditavel(a.caminho, lstatSync(p).isSymbolicLink() ? Buffer.from(readlinkSync(p)) : readFileSync(p)) } catch { atual = null }
    if (atual !== a.sha256) {
      r.estado = 'desatualizada'; escreverJson(caminho, r)
      console.error(`${id} está desatualizada: ${a.caminho} mudou desde a captura. Prepare uma nova revisão.`)
      return 1
    }
  }
  for (const contrato of r.contratos ?? []) {
    let atual: string | null = null
    try { atual = hashSha256(readFileSync(join(raiz, contrato.caminho))) } catch { atual = null }
    if (atual !== contrato.sha256) {
      r.estado = 'desatualizada'; escreverJson(caminho, r)
      console.error(`${id} está desatualizada: contrato/regra ${contrato.caminho} mudou desde a captura.`)
      return 1
    }
  }
  for (const contexto of r.contextos) {
    let atual: string | null = null
    try { atual = hashSha256(readFileSync(join(raiz, contexto.arquivo))) } catch { atual = null }
    if (atual !== contexto.sha256) {
      r.estado = 'desatualizada'; escreverJson(caminho, r)
      console.error(`${id} está desatualizada: contexto adicional ${contexto.arquivo} mudou desde a consulta.`)
      return 1
    }
  }
  for (const [tarefaId, assinatura] of Object.entries(r.assinaturas_tarefas ?? {})) {
    const aberta = join(raiz, 'docs-mentor', 'tarefas', 'abertas', `${tarefaId}.json`)
    const concluidas = join(raiz, 'docs-mentor', 'tarefas', 'concluidas')
    const concluida = existsSync(concluidas) ? readdirSync(concluidas).find((nome) => nome.endsWith(`--${tarefaId}.json`)) : null
    const arquivo = existsSync(aberta) ? aberta : concluida ? join(concluidas, concluida) : null
    let atual: string | null = null
    try { if (arquivo) atual = assinaturaSemanticaDaTarefa(lerJson<Tarefa>(arquivo)) } catch { atual = null }
    if (atual !== assinatura) {
      r.estado = 'desatualizada'; escreverJson(caminho, r)
      console.error(`${id} está desatualizada: critérios/plano de ${tarefaId} mudaram desde a captura.`)
      return 1
    }
  }
  r.pendencias.forEach((p, i) => { p.id = `${id}-${p.nivel === 'bloqueia' ? 'B' : p.nivel === 'recomendacao' ? 'R' : 'O'}${String(i + 1).padStart(2, '0')}`; p.destino = null; p.ref = null; p.resolvida_em = null })
  r.registrada_em = agora().log
  r.estado = r.veredito === 'APROVADO COM RESSALVAS' ? 'parcial' : r.veredito === 'APROVADO' ? 'aprovada' : 'reprovada'
  escreverJson(caminho, r)
  console.log(`${id}: ${r.veredito} · ${r.tarefas.join(', ')} · ${r.pendencias.length} achado(s)`)
  return 0
}
