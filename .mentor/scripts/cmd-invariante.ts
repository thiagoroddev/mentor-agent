import { agora, caminhos, escreverJson } from './arquivos.ts'
import { carregarInvariantes } from './vistas.ts'
import type { Invariante } from './tipos.ts'

export function relatarInvariantes(): void {
  const invs = carregarInvariantes()
  if (invs.length === 0) {
    console.log('Nenhuma invariante registrada em docs-mentor/invariantes.json.')
    return
  }
  console.log(`INVARIANTES (${invs.length}):\n`)
  for (const inv of invs) {
    const mec = inv.mecanismo ? `mecanismo: ${inv.mecanismo}` : 'sem mecanismo'
    console.log(`  ${inv.id} · ${inv.enunciado}`)
    console.log(`     porque: ${inv.porque}`)
    console.log(`     [${mec}] · declarada em ${inv.declarada_em}\n`)
  }
}

export function novaInvariante(flags: Record<string, string | undefined>): void {
  const id = flags.id?.trim()
  const enunciado = flags.enunciado?.trim()
  const porque = flags.porque?.trim()
  const mecanismo = flags.mecanismo?.trim() || null

  if (!id) throw new Error('Falta --id. Use: mentor inv nova --id INV-1 --enunciado "..." --porque "..." [--mecanismo "..."]')
  if (!/^INV-\d+$/.test(id)) throw new Error(`ID invalido: "${id}". Use o padrao INV-1, INV-2, etc.`)
  if (!enunciado) throw new Error('Falta --enunciado. Use: mentor inv nova --id INV-1 --enunciado "..." --porque "..." [--mecanismo "..."]')
  if (!porque) throw new Error('Falta --porque. Use: mentor inv nova --id INV-1 --enunciado "..." --porque "..." [--mecanismo "..."]')

  const c = caminhos()
  const invs = carregarInvariantes()
  if (invs.some((i) => i.id === id)) {
    throw new Error(`Invariante com ID "${id}" ja existe.`)
  }

  const data = agora().log.split(' ')[0] ?? '31/08/26'
  const nova: Invariante = {
    id,
    enunciado,
    porque,
    mecanismo,
    declarada_em: data,
    conferida_em: data,
  }

  invs.push(nova)
  escreverJson(c.invariantes, invs)
  console.log(`Invariante ${id} registrada.`)
}
