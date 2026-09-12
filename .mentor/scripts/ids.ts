import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { caminhos, existe, lerJson, listar } from './arquivos.ts'
import { carregarContexto, carregarReferencias } from './vistas.ts'
import type { Tarefa } from './tipos.ts'

const PADRAO_ID = /^TASK-([A-Z]+)-(\d{3})$/

function obterRefsGit(raiz: string): string[] {
  if (!existe(join(raiz, '.git'))) return []
  try {
    const r = spawnSync('git', ['for-each-ref', '--format=%(refname)', 'refs/heads', 'refs/remotes'], {
      cwd: raiz,
      encoding: 'utf8',
      timeout: 5_000,
    })
    if (r.status !== 0 || !r.stdout) return []
    return r.stdout.split('\n').map((s) => s.trim()).filter(Boolean)
  } catch {
    return []
  }
}

function maiorIdDeTarefaNoGit(raiz: string, prefixo: string): number {
  if (!existe(join(raiz, '.git'))) return 0
  try {
    const r = spawnSync('git', ['log', '--all', '--name-only', '--format=', '--', 'docs-mentor/tarefas/*', 'docs/tarefas/*'], {
      cwd: raiz,
      encoding: 'utf8',
      timeout: 5_000,
    })
    let maior = 0
    if (r.status === 0 && r.stdout) {
      const re = new RegExp(`TASK-${prefixo}-(\\d{3})\\.json`)
      for (const linha of r.stdout.split('\n')) {
        const casou = re.exec(linha.trim())
        if (casou && casou[1]) {
          maior = Math.max(maior, Number(casou[1]))
        }
      }
    }
    return maior
  } catch {
    return 0
  }
}

function maiorIdDeRequisitoNoGit(raiz: string, tipo: string): number {
  if (!existe(join(raiz, '.git'))) return 0
  try {
    const refs = obterRefsGit(raiz)
    if (refs.length === 0) return 0
    const r = spawnSync('git', ['grep', '-h', '-E', `"id":\\s*"${tipo}-[0-9]+"`, ...refs, '--', 'docs-mentor/requisitos/*', 'docs/requisitos/*'], {
      cwd: raiz,
      encoding: 'utf8',
      timeout: 5_000,
    })
    let maior = 0
    if (r.status === 0 && r.stdout) {
      const re = new RegExp(`"${tipo}-(\\d+)"`)
      for (const linha of r.stdout.split('\n')) {
        const casou = re.exec(linha)
        if (casou && casou[1]) {
          maior = Math.max(maior, Number(casou[1]))
        }
      }
    }
    return maior
  } catch {
    return 0
  }
}

/**
 * Proximo ID de um prefixo: maior ja' usado, mais um, tres digitos.
 * Gaps nunca sao reaproveitados. A IA nunca ve' nem conta IDs.
 *
 * Considera:
 * 1. Offsets declarados em `contexto.json -> offsets_de_id[prefixo]`;
 * 2. Tarefas locais em `abertas/` e `concluidas/`;
 * 3. Referencias externas em `referencias.json`;
 * 4. Historico e branches irmas no Git (todas as refs).
 */
export function proximoIdDeTarefa(prefixo: string): string {
  const c = caminhos()
  let maior = 0

  // 1. Offsets declarados no contexto
  if (existe(c.contexto)) {
    try {
      const ctx = carregarContexto()
      const offset = (ctx.offsets_de_id as Record<string, number> | undefined)?.[prefixo]
      if (typeof offset === 'number' && Number.isInteger(offset) && offset > 0) {
        maior = Math.max(maior, offset)
      }
    } catch {
      // continua com 0
    }
  }

  // 2. Tarefas locais
  const arquivos = [...listar(c.abertas, '.json'), ...listar(c.concluidas, '.json')]
  for (const arquivo of arquivos) {
    const id = lerJson<Partial<Tarefa>>(arquivo).id
    if (typeof id !== 'string') continue
    const casou = PADRAO_ID.exec(id)
    if (casou && casou[1] === prefixo) maior = Math.max(maior, Number(casou[2]))
  }

  // 3. Referencias externas
  if (existe(c.referencias)) {
    try {
      const refs = carregarReferencias()
      for (const ref of refs) {
        if (typeof ref.id !== 'string') continue
        const casou = PADRAO_ID.exec(ref.id)
        if (casou && casou[1] === prefixo) maior = Math.max(maior, Number(casou[2]))
      }
    } catch {
      // continua
    }
  }

  // 4. Git (todas as branches e historico)
  maior = Math.max(maior, maiorIdDeTarefaNoGit(c.raiz, prefixo))

  return `TASK-${prefixo}-${String(maior + 1).padStart(3, '0')}`
}

/** Proximo ID de uma familia simples, como RF-7 ou ADR-12, sobre uma lista ja' carregada. */
export function proximoIdSimples(prefixo: string, existentes: string[]): string {
  const re = new RegExp(`^${prefixo}-(\\d+)$`)
  let maior = 0
  for (const id of existentes) {
    const casou = re.exec(id)
    if (casou?.[1]) maior = Math.max(maior, Number(casou[1]))
  }
  return `${prefixo}-${maior + 1}`
}

/**
 * Proximo ID de requisito (RF, RN, RNF).
 * Considera offsets em contexto.json, requisitos.json e referencias.json.
 */
export function proximoIdDeRequisito(tipo: 'RF' | 'RN' | 'RNF'): string {
  const c = caminhos()
  let maior = 0

  if (existe(c.contexto)) {
    try {
      const ctx = carregarContexto()
      const offset = (ctx.offsets_de_id as Record<string, number> | undefined)?.[tipo]
      if (typeof offset === 'number' && Number.isInteger(offset) && offset > 0) {
        maior = Math.max(maior, offset)
      }
    } catch {
      // continua
    }
  }

  if (existe(c.requisitos)) {
    try {
      const reqs = lerJson<Array<{ id?: string }>>(c.requisitos)
      const re = new RegExp(`^${tipo}-(\\d+)$`)
      for (const r of reqs) {
        if (typeof r.id !== 'string') continue
        const casou = re.exec(r.id)
        if (casou?.[1]) maior = Math.max(maior, Number(casou[1]))
      }
    } catch {
      // continua
    }
  }

  if (existe(c.referencias)) {
    try {
      const refs = carregarReferencias()
      const re = new RegExp(`^${tipo}-(\\d+)$`)
      for (const ref of refs) {
        if (typeof ref.id !== 'string') continue
        const casou = re.exec(ref.id)
        if (casou?.[1]) maior = Math.max(maior, Number(casou[1]))
      }
    } catch {
      // continua
    }
  }

  // 4. Git (todas as branches e historico)
  maior = Math.max(maior, maiorIdDeRequisitoNoGit(c.raiz, tipo))

  return `${tipo}-${maior + 1}`
}
