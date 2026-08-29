import { caminhos, listar, lerJson } from './arquivos.ts'
import type { Tarefa } from './tipos.ts'

const PADRAO_ID = /^TASK-([A-Z]+)-(\d{3})$/

/**
 * Proximo ID de um prefixo: maior ja' usado, mais um, tres digitos.
 * Gaps nunca sao reaproveitados. A IA nunca ve' nem conta IDs.
 */
export function proximoIdDeTarefa(prefixo: string): string {
  const c = caminhos()
  const arquivos = [...listar(c.abertas, '.json'), ...listar(c.concluidas, '.json')]
  let maior = 0
  for (const arquivo of arquivos) {
    const id = lerJson<Partial<Tarefa>>(arquivo).id
    if (typeof id !== 'string') continue
    const casou = PADRAO_ID.exec(id)
    if (casou && casou[1] === prefixo) maior = Math.max(maior, Number(casou[2]))
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
