import { join } from 'node:path'
import { agora, caminhos, escreverJson, existe } from './arquivos.ts'
import { carregarReferencias, regenerarTudo } from './vistas.ts'
import type { ReferenciaExterna } from './tipos.ts'

export function relatarReferencias(): void {
  const refs = carregarReferencias()
  if (refs.length === 0) {
    console.log('Nenhuma referencia externa registrada em docs-mentor/referencias.json.')
    return
  }
  console.log(`REFERENCIAS EXTERNAS (${refs.length}):\n`)
  for (const r of refs) {
    const sis = r.sistema ? ` [${r.sistema}]` : ''
    const tit = r.titulo ? ` · ${r.titulo}` : ''
    console.log(`  ${r.id}${sis} -> ${r.onde}${tit}`)
  }
}

export function novaReferencia(flags: Record<string, string | undefined>): void {
  const id = flags.id?.trim()
  const onde = flags.onde?.trim()
  if (!id) throw new Error('Falta --id. Use: mentor ref nova --id <ID> --onde <caminho> [--sistema <nome>] [--titulo <titulo>]')
  if (!onde) throw new Error('Falta --onde. Use: mentor ref nova --id <ID> --onde <caminho> [--sistema <nome>] [--titulo <titulo>]')

  const c = caminhos()
  const alvo = join(c.raiz, onde)
  if (!existe(alvo)) {
    throw new Error(`Arquivo "${onde}" nao existe em ${c.raiz}.`)
  }

  const refs = carregarReferencias()
  if (refs.some((r) => r.id === id)) {
    throw new Error(`Referencia com ID "${id}" ja existe.`)
  }

  const data = agora().log.split(' ')[0] ?? '30/08/26'
  const nova: ReferenciaExterna = {
    id,
    onde,
    sistema: flags.sistema?.trim() || null,
    titulo: flags.titulo?.trim() || null,
    registrado_em: data,
  }

  refs.push(nova)
  escreverJson(c.referencias, refs)
  regenerarTudo()
  console.log(`Referencia ${id} registrada -> ${onde}`)
}
