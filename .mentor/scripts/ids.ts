import { caminhos, existe, lerJson, listar } from './arquivos.ts'
import { carregarContexto, carregarReferencias } from './vistas.ts'
import type { Tarefa } from './tipos.ts'

const PADRAO_ID = /^TASK-([A-Z]+)-(\d{3})$/

/**
 * Proximo ID de um prefixo: maior ja' usado, mais um, tres digitos.
 * Gaps nunca sao reaproveitados. A IA nunca ve' nem conta IDs.
 *
 * Considera:
 * 1. Offsets declarados em `contexto.json -> offsets_de_id[prefixo]`;
 * 2. Tarefas locais em `abertas/` e `concluidas/`;
 * 3. Referencias externas em `referencias.json`.
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
