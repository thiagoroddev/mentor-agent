import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, rmSync, writeFileSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import { tmpdir } from 'node:os'
import { caminhos, existe, lerJson, relativo } from './arquivos.ts'

export interface FingerprintResultado {
  arvore_hash: string
  digest: string
}

/**
 * Projeta o contexto.json para retirar apenas contagens dinâmicas e timestamps,
 * mantendo gates, regras, fases, limites e ferramentas que afetam a execução.
 */
function projetarContextoSemMetadados(caminhoContexto: string): string | null {
  if (!existsSync(caminhoContexto)) return null
  try {
    const ctx = lerJson<Record<string, unknown>>(caminhoContexto)
    const projetado = {
      ...ctx,
      _meta: ctx._meta ? { ...(ctx._meta as Record<string, unknown>), atualizado_em: null } : null,
      contagens: null,
      lembretes: null,
    }
    return JSON.stringify(projetado, null, 2) + '\n'
  } catch {
    return null
  }
}

/**
 * Calcula a árvore de insumos usando um índice Git temporário isolado.
 * O índice real nunca é alterado.
 *
 * Inclusões:
 * - Todo o código, testes, scripts (.mentor/), configs, .github/, lockfiles, fixtures.
 * - Testes e scripts executáveis sob docs-mentor/ (ex: melhorias-do-pacote.test.ts).
 *
 * Exclusões semânticas explícitas:
 * - docs-mentor/.evidencias/ (logs de execução)
 * - docs-mentor/auditorias/ (pareceres gerados após os gates)
 * - docs-mentor/tarefas/abertas/ e concluidas/ (onde os resultados dos gates são gravados)
 * - docs-mentor/tarefas/recusas.jsonl
 * - Vistas derivadas em Markdown (backlog.md, reserva.md, contexto.md, 0-indice.md)
 */
export function calcularFingerprintDosInsumos(): FingerprintResultado | null {
  const c = caminhos()
  const git = (args: string[], env?: NodeJS.ProcessEnv) =>
    spawnSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: c.raiz, encoding: 'utf8', env })

  const onde = git(['rev-parse', '--git-path', 'index'])
  if (onde.status !== 0) return null
  const relativoAoIndice = (onde.stdout ?? '').trim()
  const indiceReal = isAbsolute(relativoAoIndice) ? relativoAoIndice : join(c.raiz, relativoAoIndice)

  const temporario = join(tmpdir(), `mentor-indice-fp-${process.pid}-${Date.now()}`)
  try {
    if (existe(indiceReal)) copyFileSync(indiceReal, temporario)
    const env = { ...process.env, GIT_INDEX_FILE: temporario }

    // Adiciona todas as alterações do working tree e untracked files
    if (git(['add', '-A', '--', '.'], env).status !== 0) return null

    // Remove apenas artefatos não semânticos de docs-mentor do índice temporário
    const docsRel = relativo(c.docs).replace(/\\/g, '/')
    const exclusoes = [
      `${docsRel}/.evidencias`,
      `${docsRel}/auditorias`,
      `${docsRel}/tarefas/abertas`,
      `${docsRel}/tarefas/concluidas`,
      `${docsRel}/tarefas/recusas.jsonl`,
      `${docsRel}/tarefas/recusas.json`,
      `${docsRel}/tarefas/backlog.md`,
      `${docsRel}/tarefas/reserva.md`,
      `${docsRel}/contexto.md`,
      `${docsRel}/tarefas/concluidas/0-indice.md`,
    ]

    for (const exc of exclusoes) {
      git(['rm', '-r', '-q', '--cached', '--ignore-unmatch', '--', exc], env)
    }

    // Projeta contexto.json no índice temporário se existir
    const contextoLimpo = projetarContextoSemMetadados(c.contexto)
    if (contextoLimpo !== null) {
      const tempCtx = join(tmpdir(), `mentor-ctx-limpo-${process.pid}-${Date.now()}.json`)
      try {
        writeFileSync(tempCtx, contextoLimpo, 'utf8')
        // Substitui o contexto.json no índice temporário
        const hashObjeto = git(['hash-object', '-w', tempCtx], env)
        if (hashObjeto.status === 0 && hashObjeto.stdout.trim()) {
          const sha = hashObjeto.stdout.trim()
          // ⚠️ `--cacheinfo` le o caminho a partir da raiz do repositorio, nao da pasta atual. Com o
          // projeto numa subpasta (monorepo), o caminho sem prefixo falhava calado, o contexto entrava
          // com as contagens, e toda contagem nova invalidava a evidencia do gate.
          const prefixo = (git(['rev-parse', '--show-prefix']).stdout ?? '').trim()
          const projecao = git(['update-index', '--cacheinfo', '100644', sha, `${prefixo}${docsRel}/contexto.json`], env)
          if (projecao.status !== 0) return null
        }
      } finally {
        rmSync(tempCtx, { force: true })
      }
    }

    const arvore = git(['write-tree'], env)
    if (arvore.status !== 0) return null
    const arvoreHash = (arvore.stdout ?? '').trim()
    if (!arvoreHash) return null

    return {
      arvore_hash: arvoreHash,
      digest: arvoreHash,
    }
  } catch {
    return null
  } finally {
    rmSync(temporario, { force: true })
  }
}

export function chaveDeCacheDoGate(options: {
  gate: string
  comando: string
  arvoreHash: string
}): string {
  const payload = [
    'v1',
    process.version,
    process.platform,
    options.gate,
    options.comando,
    options.arvoreHash,
  ].join(':')
  return createHash('sha256').update(payload).digest('hex')
}
