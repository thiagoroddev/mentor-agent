import { existe, lerTexto } from './arquivos.ts'

export interface CasoValidacao {
  caso?: string
  id?: string
  esperado?: string
  observado?: string
  resultado?: 'aprovado' | 'reprovado' | 'nao_executado' | string
}

export interface ResultadoCasos {
  total: number
  casos: CasoValidacao[]
  conferem: boolean
  valido: boolean
  divergencias: string[]
  erros: string[]
}

/**
 * Lê e analisa um arquivo de casos de validação manual (JSON, CSV ou Markdown).
 */
export function lerCasosDeValidacao(caminhoAbsoluto: string): ResultadoCasos {
  if (!existe(caminhoAbsoluto)) {
    throw new Error(`Arquivo de casos "${caminhoAbsoluto}" nao foi encontrado.`)
  }

  const conteudo = lerTexto(caminhoAbsoluto).trim()
  if (!conteudo) {
    throw new Error(`Arquivo de casos "${caminhoAbsoluto}" esta vazio.`)
  }

  let lista: CasoValidacao[] = []

  if (caminhoAbsoluto.endsWith('.json') || conteudo.startsWith('[') || conteudo.startsWith('{')) {
    try {
      const parsed = JSON.parse(conteudo)
      lista = Array.isArray(parsed) ? parsed : [parsed]
    } catch (e: any) {
      throw new Error(`Erro ao ler JSON de casos em "${caminhoAbsoluto}": ${e.message}`)
    }
  } else if (conteudo.includes('|')) {
    // Markdown table
    const linhas = conteudo.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('|') && !l.includes('---'))
    if (linhas.length > 1) {
      const cabecalho = linhas[0]!.split('|').map((c) => c.trim().toLowerCase()).filter(Boolean)
      const colCaso = cabecalho.findIndex((c) => c.includes('caso') || c.includes('id'))
      const colEsp = cabecalho.findIndex((c) => c.includes('esperado'))
      const colObs = cabecalho.findIndex((c) => c.includes('observado'))
      const colRes = cabecalho.findIndex((c) => c.includes('resultado') || c.includes('status'))

      for (let i = 1; i < linhas.length; i++) {
        const cols = linhas[i]!.split('|').map((c) => c.trim()).filter(Boolean)
        lista.push({
          caso: colCaso >= 0 ? cols[colCaso] : `caso-${i}`,
          esperado: colEsp >= 0 ? cols[colEsp] : undefined,
          observado: colObs >= 0 ? cols[colObs] : undefined,
          resultado: colRes >= 0 ? cols[colRes] : undefined,
        })
      }
    }
  } else {
    // CSV
    const linhas = conteudo.split('\n').map((l) => l.trim()).filter(Boolean)
    if (linhas.length > 1) {
      const sep = linhas[0]!.includes(';') ? ';' : ','
      const cabecalho = linhas[0]!.split(sep).map((c) => c.trim().toLowerCase())
      const colCaso = cabecalho.findIndex((c) => c.includes('caso') || c.includes('id'))
      const colEsp = cabecalho.findIndex((c) => c.includes('esperado'))
      const colObs = cabecalho.findIndex((c) => c.includes('observado'))
      const colRes = cabecalho.findIndex((c) => c.includes('resultado') || c.includes('status'))

      for (let i = 1; i < linhas.length; i++) {
        const cols = linhas[i]!.split(sep).map((c) => c.trim())
        lista.push({
          caso: colCaso >= 0 ? cols[colCaso] : `caso-${i}`,
          esperado: colEsp >= 0 ? cols[colEsp] : undefined,
          observado: colObs >= 0 ? cols[colObs] : undefined,
          resultado: colRes >= 0 ? cols[colRes] : undefined,
        })
      }
    }
  }

  if (lista.length === 0) {
    throw new Error(`Nenhum caso de teste encontrado no arquivo "${caminhoAbsoluto}".`)
  }

  const divergencias: string[] = []
  for (let i = 0; i < lista.length; i++) {
    const item = lista[i]!
    const ident = item.caso ?? item.id ?? `caso[${i}]`
    if (!item.observado || !item.observado.trim()) {
      divergencias.push(`${ident}: falta valor "observado"`)
      continue
    }

    const res = (item.resultado ?? '').toLowerCase().trim()
    if (res === 'reprovado' || res === 'falhou' || res === 'falha') {
      divergencias.push(`${ident}: resultado reprovado (observado: "${item.observado}")`)
    } else if (res === 'nao_executado' || res === 'pendente') {
      divergencias.push(`${ident}: caso nao executado`)
    }
  }

  return {
    total: lista.length,
    casos: lista,
    conferem: divergencias.length === 0,
    valido: divergencias.length === 0,
    divergencias,
    erros: divergencias,
  }
}
