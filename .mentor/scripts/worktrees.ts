import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { pastaDeDocumentos, raizProjeto } from './arquivos.ts'

export interface InfoWorktree {
  caminho: string
  branch: string | null
  detached: boolean
  head: string | null
  disponivel: boolean
  projetoRaiz: string
  temMentor: boolean
  docsPasta: string | null
  tarefasEmExecucao: string[]
  limiteEmExecucao: number
  erro?: string | null
}

export interface DiagnosticoWorktrees {
  worktrees: InfoWorktree[]
  totalObservado: number
  totalEmExecucao: number
  duplicidades: Array<{ id: string; caminhos: string[] }>
}

interface EntradaPorcelainGit {
  worktree: string
  head: string | null
  branch: string | null
  detached: boolean
  bare: boolean
  locked: boolean
  prunable: boolean
}

/**
 * Converte a saída de `git worktree list --porcelain` (ou `-z`) em estruturas intermediárias.
 */
export function parsearPorcelainWorktrees(saida: string, separadorNulo: boolean): EntradaPorcelainGit[] {
  const entradas: EntradaPorcelainGit[] = []
  const blocos = separadorNulo
    ? saida.split('\0\0').map((b) => b.trim()).filter(Boolean)
    : saida.trim().split(/\r?\n\r?\n/).map((b) => b.trim()).filter(Boolean)

  for (const bloco of blocos) {
    const linhas = separadorNulo
      ? bloco.split('\0').map((l) => l.trim()).filter(Boolean)
      : bloco.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

    let worktreePath = ''
    let head: string | null = null
    let branch: string | null = null
    let detached = false
    let bare = false
    let locked = false
    let prunable = false

    for (const linha of linhas) {
      if (linha.startsWith('worktree ')) {
        worktreePath = linha.slice('worktree '.length).trim()
      } else if (linha.startsWith('HEAD ')) {
        head = linha.slice('HEAD '.length).trim()
      } else if (linha.startsWith('branch ')) {
        const refBruta = linha.slice('branch '.length).trim()
        branch = refBruta.replace(/^refs\/heads\//, '')
      } else if (linha === 'detached') {
        detached = true
      } else if (linha === 'bare') {
        bare = true
      } else if (linha.startsWith('locked')) {
        locked = true
      } else if (linha.startsWith('prunable')) {
        prunable = true
      }
    }

    if (worktreePath) {
      entradas.push({
        worktree: worktreePath,
        head,
        branch: detached ? null : branch,
        detached: detached || (!branch && !bare),
        bare,
        locked,
        prunable,
      })
    }
  }

  return entradas
}

/**
 * Executa o comando Git para listar worktrees no formato porcelain.
 * Tenta primeiramente `-z` para suporte a caminhos com espaços ou caracteres especiais;
 * se falhar, utiliza o formato porcelain padrão.
 */
function obterEntradasGitWorktree(raizGit: string): EntradaPorcelainGit[] {
  try {
    const rZ = spawnSync('git', ['worktree', 'list', '--porcelain', '-z'], {
      cwd: raizGit,
      encoding: 'utf8',
      timeout: 5_000,
    })
    if (rZ.status === 0 && rZ.stdout) {
      return parsearPorcelainWorktrees(rZ.stdout, true)
    }
  } catch {
    // fallback para formato sem -z
  }

  try {
    const rPadrao = spawnSync('git', ['worktree', 'list', '--porcelain'], {
      cwd: raizGit,
      encoding: 'utf8',
      timeout: 5_000,
    })
    if (rPadrao.status === 0 && rPadrao.stdout) {
      return parsearPorcelainWorktrees(rPadrao.stdout, false)
    }
  } catch {
    // falha no git
  }

  return []
}

/**
 * Inspeciona tarefas em execução dentro da pasta de documentos de uma worktree específica.
 * Lê de forma estritamente somente-leitura sem modificar arquivos nem índices.
 */
function inspecionarTarefasLocais(docsPasta: string): { tarefasEmExecucao: string[]; limiteEmExecucao: number } {
  let limiteEmExecucao = 1
  const tarefasEmExecucao: string[] = []

  const caminhoCtx = join(docsPasta, 'contexto.json')
  if (existsSync(caminhoCtx)) {
    try {
      const conteudo = JSON.parse(readFileSync(caminhoCtx, 'utf8'))
      if (typeof conteudo?.limites?.em_execucao === 'number') {
        limiteEmExecucao = conteudo.limites.em_execucao
      }
    } catch {
      // ignora erro de parse em contexto
    }
  }

  const pastaAbertas = join(docsPasta, 'tarefas', 'abertas')
  if (existsSync(pastaAbertas)) {
    try {
      const arquivos = readdirSync(pastaAbertas)
      for (const arq of arquivos) {
        if (!arq.endsWith('.json')) continue
        try {
          const caminhoJson = join(pastaAbertas, arq)
          const dados = JSON.parse(readFileSync(caminhoJson, 'utf8'))
          if (dados && dados.estado === 'em-execucao' && typeof dados.id === 'string') {
            tarefasEmExecucao.push(dados.id)
          }
        } catch {
          // ignora tarefa individual corrompida
        }
      }
    } catch {
      // ignora falha de leitura do diretorio
    }
  }

  return { tarefasEmExecucao, limiteEmExecucao }
}

/**
 * Resolve a pasta de documentos (docs-mentor ou docs) de forma pura para um dado caminho raiz de projeto,
 * sem depender de estado global ou variáveis de ambiente.
 */
function resolverDocsLocal(projRaiz: string): string | null {
  const atual = join(projRaiz, 'docs-mentor')
  if (existsSync(join(atual, 'contexto.json'))) return atual
  const legado = join(projRaiz, 'docs')
  if (existsSync(join(legado, 'contexto.json'))) return legado
  if (existsSync(atual)) return atual
  if (existsSync(legado)) return legado
  return null
}

/**
 * Descobre todas as worktrees vinculadas ao repositório Git do projeto atual,
 * inspeciona suas tarefas ativas e reporta diagnóstico de concorrência e duplicidade.
 */
export function descobrirWorktrees(raizInformada?: string): DiagnosticoWorktrees {
  const raizBase = raizInformada ? resolve(raizInformada) : raizProjeto()
  let gitTopLevel: string | null = null
  let caminhoRelativoNoRepo = ''

  try {
    const rRev = spawnSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: raizBase,
      encoding: 'utf8',
      timeout: 5_000,
    })
    if (rRev.status === 0 && rRev.stdout) {
      gitTopLevel = resolve(rRev.stdout.trim())
      caminhoRelativoNoRepo = relative(gitTopLevel, raizBase).replace(/\\/g, '/')
    }
  } catch {
    // git não disponível ou pasta não versionada
  }

  let entradasGit: EntradaPorcelainGit[] = []
  if (gitTopLevel) {
    entradasGit = obterEntradasGitWorktree(gitTopLevel)
  }

  // Se não foi possível listar worktrees via Git, faz fallback para a raiz local informada
  if (entradasGit.length === 0) {
    const docs = resolverDocsLocal(raizBase)
    const { tarefasEmExecucao, limiteEmExecucao } = docs
      ? inspecionarTarefasLocais(docs)
      : { tarefasEmExecucao: [], limiteEmExecucao: 1 }

    const infoUnica: InfoWorktree = {
      caminho: raizBase,
      branch: null,
      detached: false,
      head: null,
      disponivel: existsSync(raizBase),
      projetoRaiz: raizBase,
      temMentor: Boolean(docs),
      docsPasta: docs,
      tarefasEmExecucao,
      limiteEmExecucao,
      erro: null,
    }

    return {
      worktrees: [infoUnica],
      totalObservado: infoUnica.disponivel ? 1 : 0,
      totalEmExecucao: tarefasEmExecucao.length,
      duplicidades: [],
    }
  }

  const worktrees: InfoWorktree[] = []
  const tarefasPorWorktree = new Map<string, string[]>()

  for (const entrada of entradasGit) {
    const caminhoWorktree = resolve(entrada.worktree)
    const disponivel = existsSync(caminhoWorktree)

    // Em monorepos, localiza o mesmo subprojeto relativo dentro de cada checkout
    const projetoRaiz = caminhoRelativoNoRepo
      ? join(caminhoWorktree, caminhoRelativoNoRepo)
      : caminhoWorktree

    if (!disponivel) {
      worktrees.push({
        caminho: caminhoWorktree,
        branch: entrada.branch,
        detached: entrada.detached,
        head: entrada.head,
        disponivel: false,
        projetoRaiz,
        temMentor: false,
        docsPasta: null,
        tarefasEmExecucao: [],
        limiteEmExecucao: 1,
        erro: 'árvore indisponível no sistema de arquivos',
      })
      continue
    }

    try {
      const docs = resolverDocsLocal(projetoRaiz)
      const temMentor = Boolean(docs && existsSync(join(docs, 'contexto.json')))
      const { tarefasEmExecucao, limiteEmExecucao } = temMentor && docs
        ? inspecionarTarefasLocais(docs)
        : { tarefasEmExecucao: [], limiteEmExecucao: 1 }

      worktrees.push({
        caminho: caminhoWorktree,
        branch: entrada.branch,
        detached: entrada.detached,
        head: entrada.head,
        disponivel: true,
        projetoRaiz,
        temMentor,
        docsPasta: docs,
        tarefasEmExecucao,
        limiteEmExecucao,
        erro: null,
      })

      for (const id of tarefasEmExecucao) {
        const lista = tarefasPorWorktree.get(id) ?? []
        lista.push(caminhoWorktree)
        tarefasPorWorktree.set(id, lista)
      }
    } catch (e: any) {
      worktrees.push({
        caminho: caminhoWorktree,
        branch: entrada.branch,
        detached: entrada.detached,
        head: entrada.head,
        disponivel: true,
        projetoRaiz,
        temMentor: false,
        docsPasta: null,
        tarefasEmExecucao: [],
        limiteEmExecucao: 1,
        erro: `falha ao ler estado da worktree: ${e?.message ?? String(e)}`,
      })
    }
  }

  const duplicidades: Array<{ id: string; caminhos: string[] }> = []
  for (const [id, caminhos] of tarefasPorWorktree.entries()) {
    if (caminhos.length > 1) {
      duplicidades.push({ id, caminhos })
    }
  }

  const totalObservado = worktrees.filter((w) => w.disponivel).length
  const totalEmExecucao = worktrees.reduce((acc, w) => acc + w.tarefasEmExecucao.length, 0)

  return {
    worktrees,
    totalObservado,
    totalEmExecucao,
    duplicidades,
  }
}
