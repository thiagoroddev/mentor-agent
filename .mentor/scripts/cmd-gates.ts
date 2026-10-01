import { executarGatesDoProjeto } from './executor-gates.ts'

/**
 * Roda todos os gates declarados pelo projeto usando o executor unificado.
 */
export function gates(flags: Record<string, string | undefined> = {}): number {
  return executarGatesDoProjeto(flags)
}
