import '../regressoes-de-campo.test.ts'
import '../melhorias-0-13.test.ts'
import '../pre-push-0-14.test.ts'
import '../adrs-configuraveis.test.ts'
import '../adrs-formato-e-vigencia.test.ts'
import '../adrs-gerador-e-verificar.test.ts'
import '../contratos-planos-novos.test.ts'
import { executarSuites } from '../vitest-local.ts'
import type { Cenario } from '../apoio.ts'

/**
 * Os testes em formato describe/it: as regressoes que vieram do piloto e as melhorias que se provam
 * chamando a funcao. Os imports acima registram os testes; aqui eles rodam, e cada teste que falha
 * vira uma falha do cenario, com o nome do grupo na frente.
 */
export function rodar(): Cenario {
  const c: Cenario = { nome: '31-testes-de-unidade', pasta: '', falhas: [] }
  const { total, falhas } = executarSuites()
  if (total === 0) c.falhas.push('nenhum teste registrado: os imports dos arquivos de teste nao rodaram')
  c.falhas.push(...falhas)
  return c
}
