import { caminhos, escreverJson, existe, lerJson, lerTexto, listar } from './arquivos.ts'
import { dirname, join, relative } from 'node:path'

/**
 * Inventario das regras do proprio pacote, com uma coluna so': **virou comando?**
 *
 * Existe por causa de uma medicao. Em 197 tarefas de um projeto real, os gates que viraram comando
 * foram executados 323 vezes; os que ficaram so' em prosa, zero. Sem este arquivo, "regra sem comando
 * nao existe" e' uma frase; com ele, e' uma coluna que da' para contar.
 */
export interface Regra {
  id: string
  onde: string
  severidade: string
  /** `null` = orientacao declarada. Nao e' defeito: e' o principio P1 virando dado. */
  comando: string | null
}

const DEFINICAO = /^\*\*([A-Z]{2,3}-\d{2,3}) · ([A-Z]+(?: \([^)]+\))?) ·/gm

/** Sempre o inventario do pacote **que este projeto usa**, nao o do pacote em execucao. */
export const caminhoDoInventario = () => join(caminhos().pacote, 'regras.json')

/** Le' as definicoes direto do markdown. A fonte e' o guia; este arquivo e' o espelho. */
export function extrairDoGuia(): Regra[] {
  const c = caminhos()
  const achadas: Regra[] = []
  for (const arquivo of listar(join(c.pacote, 'guia'), '.md')) {
    const texto = lerTexto(arquivo)
    for (const casou of texto.matchAll(DEFINICAO)) {
      const id = casou[1]
      const severidade = casou[2]
      if (id && severidade) {
        // Relativo a' raiz do pacote lido, para o caminho nao mudar quando o pacote e' instalado.
        const onde = relative(dirname(c.pacote), arquivo).split('\\').join('/')
        achadas.push({ id, onde, severidade, comando: null })
      }
    }
  }
  return achadas.sort((a, b) => a.id.localeCompare(b.id))
}

export function lerInventario(): Regra[] {
  const caminho = caminhoDoInventario()
  return existe(caminho) ? lerJson<Regra[]>(caminho) : []
}

export interface Divergencia {
  faltando: string[]
  sobrando: string[]
  movidas: string[]
}

export function comparar(): Divergencia {
  const noGuia = new Map(extrairDoGuia().map((r) => [r.id, r]))
  const noInventario = new Map(lerInventario().map((r) => [r.id, r]))
  return {
    faltando: [...noGuia.keys()].filter((id) => !noInventario.has(id)),
    sobrando: [...noInventario.keys()].filter((id) => !noGuia.has(id)),
    movidas: [...noGuia.entries()]
      .filter(([id, r]) => noInventario.get(id) && noInventario.get(id)?.onde !== r.onde)
      .map(([id]) => id),
  }
}

/** Acerta o espelho preservando os `comando` ja' preenchidos a mao. */
export function sincronizar(): void {
  const anterior = new Map(lerInventario().map((r) => [r.id, r]))
  const atual = extrairDoGuia().map((r) => ({ ...r, comando: anterior.get(r.id)?.comando ?? null }))
  const d = comparar()
  escreverJson(caminhoDoInventario(), atual)
  const resumir = (ids: string[]) =>
    ids.length > 8 ? `${ids.slice(0, 8).join(', ')} e mais ${ids.length - 8}` : ids.join(', ')
  console.log(`Inventario sincronizado: ${atual.length} regras.`)
  if (d.faltando.length) console.log(`  acrescentadas ${d.faltando.length}: ${resumir(d.faltando)}`)
  if (d.sobrando.length) console.log(`  removidas ${d.sobrando.length}: ${resumir(d.sobrando)}`)
  if (d.movidas.length) console.log(`  mudaram de arquivo ${d.movidas.length}: ${resumir(d.movidas)}`)
}

export function relatar(): void {
  const regras = lerInventario()
  if (regras.length === 0) {
    console.log('Inventario vazio. Rode: mentor regras --sincronizar')
    return
  }
  const comComando = regras.filter((r) => r.comando)
  const porArea = new Map<string, { total: number; comComando: number }>()
  for (const r of regras) {
    const area = r.id.split('-')[0] ?? '?'
    const atual = porArea.get(area) ?? { total: 0, comComando: 0 }
    atual.total++
    if (r.comando) atual.comComando++
    porArea.set(area, atual)
  }
  console.log(`${regras.length} regras · ${comComando.length} viraram comando · ${regras.length - comComando.length} sao orientacao\n`)
  for (const [area, n] of [...porArea].sort()) {
    console.log(`  ${area.padEnd(4)} ${String(n.comComando).padStart(3)} de ${String(n.total).padStart(3)} com comando`)
  }
  console.log('\nRegra sem comando nao e defeito: e orientacao declarada. O que e defeito e nao saber quais sao.')
}
