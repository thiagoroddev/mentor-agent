#!/usr/bin/env node
import { rodar as ciclo } from './cenarios/01-ciclo-basico.ts'
import { rodar as epico } from './cenarios/02-epico-fatiado.ts'
import { rodar as recusas } from './cenarios/03-recusas.ts'
import { rodar as tdd } from './cenarios/04-tdd.ts'
import { rodar as verificacao } from './cenarios/05-verificacao.ts'
import { rodar as saude } from './cenarios/06-doctor.ts'
import { rodar as entrega } from './cenarios/07-entrega.ts'
import type { Cenario } from './apoio.ts'

const CENARIOS: Array<() => Cenario> = [ciclo, epico, recusas, tdd, verificacao, saude, entrega]

let falharam = 0
for (const rodar of CENARIOS) {
  const c = rodar()
  if (c.falhas.length === 0) {
    console.log(`  ok   ${c.nome}`)
  } else {
    falharam++
    console.log(`  FALHOU ${c.nome}`)
    for (const f of c.falhas) console.log(`    - ${f}`)
  }
}

console.log(
  falharam === 0
    ? `\n${CENARIOS.length} cenarios, todos verdes. Os projetos gerados ficam em testes/exemplos/.`
    : `\n${falharam} de ${CENARIOS.length} cenarios falharam.`,
)
process.exitCode = falharam === 0 ? 0 : 1
