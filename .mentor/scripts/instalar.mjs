// JavaScript puro, e nao TypeScript, por um motivo mecanico: instalado como dependencia, este
// arquivo roda de dentro de `node_modules`, e o Node **se recusa** a remover tipos ali
// (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING). Um `.ts` aqui quebraria a instalacao inteira.
// Fonte unica da copia: `mentor.mjs` chama daqui quando esta em node_modules, e `cmd-pacote.ts`
// chama daqui quando roda do repositorio. Duas copias da mesma logica divergiriam.
import { cpSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Copia `.mentor/` e `mentor.mjs` da origem para o destino.
 * Devolve `{ ok, erro }` em vez de lancar: quem chama decide como reportar.
 */
export function copiarPacote(origem, destino, forcar) {
  const pastaDestino = join(destino, '.mentor')
  if (existsSync(pastaDestino) && !forcar) {
    return { ok: false, erro: `Ja existe .mentor/ em ${destino}.`, pastaDestino }
  }
  cpSync(join(origem, '.mentor'), pastaDestino, { recursive: true })
  cpSync(join(origem, 'mentor.mjs'), join(destino, 'mentor.mjs'))
  return { ok: true, erro: null, pastaDestino }
}
