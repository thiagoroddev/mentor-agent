import { caminhos, existe, lerTexto } from './arquivos.ts'
import { join } from 'node:path'
import { PONTOS_DE_ENTRADA } from './instalar.mjs'

export { PONTOS_DE_ENTRADA, criarPontosDeEntrada } from './instalar.mjs'

/**
 * Mensuravel, sem julgamento: o arquivo existe, e cita o nucleo? E' o que o doctor consegue checar.
 * Nao ha como medir daqui se a ferramenta de fato carregou.
 * A geracao mora em `instalar.mjs`, em JS puro, porque o `instalar` roda de dentro de node_modules.
 */
export function pontosDeEntradaSemNucleo(): { ausentes: string[]; mudos: string[] } {
  const raiz = caminhos().raiz
  const ausentes: string[] = []
  const mudos: string[] = []
  for (const p of PONTOS_DE_ENTRADA) {
    const caminho = join(raiz, p.arquivo)
    if (!existe(caminho)) { ausentes.push(p.arquivo); continue }
    if (!lerTexto(caminho).includes('.mentor/nucleo.md')) mudos.push(p.arquivo)
  }
  return { ausentes, mudos }
}
