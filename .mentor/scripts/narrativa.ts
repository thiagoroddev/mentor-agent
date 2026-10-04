import type { MemoriaOperacional, Tarefa } from './tipos.ts'
import type { PlanoResolvido } from './cmd-plano.ts'

export const TAG_PLANO_INICIO_PREFIXO = '<!-- mentor:plano:inicio'
export const TAG_PLANO_FIM = '<!-- mentor:plano:fim -->'
export const TAG_MEMORIA_REGEX = /(?:```json mentor:memoria|```mentor:memoria)\s*\n([\s\S]*?)\n```/i

export interface ResultadoIncorporacaoPlano {
  conteudo: string
  modificado: boolean
}

/**
 * Incorpora o Markdown integral de um plano referenciado na narrativa da tarefa
 * com delimitadores claros e idempotência estrita.
 */
export function incorporarPlanoNaNarrativa(
  conteudoAtual: string | null | undefined,
  tarefa: Tarefa,
  planoRes: PlanoResolvido,
): ResultadoIncorporacaoPlano {
  const corpoPlano = (planoRes.conteudo_md ?? '').trim()
  const sha = planoRes.sha256 ?? ''
  const tagInicio = `<!-- mentor:plano:inicio sha256="${sha}" -->`

  // Cabeçalho canônico da narrativa
  const cabecalho = [
    `# ${tarefa.id} · ${tarefa.titulo}`,
    '',
    `Plano de referencia: ${tarefa.plano_ref?.arquivo}${tarefa.plano_ref?.secao ? ` (§ ${tarefa.plano_ref.secao})` : ''}`,
    '',
  ].join('\n')

  const blocoNovo = `${tagInicio}\n\n${corpoPlano}\n\n${TAG_PLANO_FIM}`

  if (!conteudoAtual || !conteudoAtual.trim()) {
    return {
      conteudo: `${cabecalho}${blocoNovo}\n`,
      modificado: true,
    }
  }

  // Se já contém a tag com o mesmo sha256, é 100% idempotente: nada muda
  if (conteudoAtual.includes(tagInicio)) {
    return {
      conteudo: conteudoAtual,
      modificado: false,
    }
  }

  // Se já possui delimitadores mas com outro hash (revisão de plano):
  const regexBloco = /<!-- mentor:plano:inicio[\s\S]*?<!-- mentor:plano:fim -->/
  if (regexBloco.test(conteudoAtual)) {
    const conteudoComBlocoAtualizado = conteudoAtual.replace(regexBloco, blocoNovo)
    return {
      conteudo: conteudoComBlocoAtualizado,
      modificado: true,
    }
  }

  // Se for mero stub inicial sem delimitadores (ex: apenas `# TASK... \n\nPlano de referencia...`):
  const linhas = conteudoAtual.trim().split('\n').filter((l) => l.trim().length > 0)
  const ehStub = linhas.length <= 3 && linhas.some((l) => l.includes('Plano') && l.includes('referencia'))
  if (ehStub) {
    return {
      conteudo: `${cabecalho}${blocoNovo}\n`,
      modificado: true,
    }
  }

  // Se a narrativa já tiver conteúdo rico existente:
  // Se o corpo do plano já estiver contido, não duplica
  if (corpoPlano && conteudoAtual.includes(corpoPlano)) {
    return {
      conteudo: conteudoAtual,
      modificado: false,
    }
  }

  // Caso contrário, insere o bloco do plano preservando o cabeçalho e o restante (desfecho, etc)
  const regexCabecalho = /^#\s+[^\n]+\n+(?:Plano de refer[êe]ncia:[^\n]+\n+)?/i
  if (regexCabecalho.test(conteudoAtual)) {
    const resto = conteudoAtual.replace(regexCabecalho, '').trim()
    const novoConteudo = `${cabecalho}${blocoNovo}\n\n${resto}\n`
    return {
      conteudo: novoConteudo,
      modificado: true,
    }
  }

  return {
    conteudo: `${cabecalho}${blocoNovo}\n\n${conteudoAtual}\n`,
    modificado: true,
  }
}

export interface ResultadoExtracaoMemoria {
  memoria?: MemoriaOperacional
  erro?: string
}

/**
 * Extrai literalmente o bloco de memória operacional do Markdown do desfecho.
 * Formato esperado:
 * ```json mentor:memoria
 * {
 *   "resultado": "...",
 *   "aprendizados": [ "..." ],
 *   "limites_conhecidos": [ "..." ]
 * }
 * ```
 */
export function extrairMemoriaOperacional(conteudo: string): ResultadoExtracaoMemoria {
  if (!conteudo) return {}
  const match = conteudo.match(TAG_MEMORIA_REGEX)
  if (!match || !match[1]) return {}

  const bruto = match[1].trim()
  let parsed: any
  try {
    parsed = JSON.parse(bruto)
  } catch (e: any) {
    return { erro: `JSON inválido no bloco mentor:memoria: ${e.message}` }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { erro: 'bloco mentor:memoria deve ser um objeto JSON' }
  }

  if (!parsed.resultado || typeof parsed.resultado !== 'string' || !parsed.resultado.trim()) {
    return { erro: 'campo "resultado" é obrigatório e deve ser texto não vazio em mentor:memoria' }
  }

  if (!Array.isArray(parsed.aprendizados)) {
    return { erro: 'campo "aprendizados" é obrigatório e deve ser uma lista de strings em mentor:memoria' }
  }

  if (!Array.isArray(parsed.limites_conhecidos)) {
    return { erro: 'campo "limites_conhecidos" é obrigatório e deve ser uma lista de strings em mentor:memoria' }
  }

  return {
    memoria: {
      resultado: parsed.resultado.trim(),
      aprendizados: parsed.aprendizados.map((a: any) => String(a).trim()).filter(Boolean),
      limites_conhecidos: parsed.limites_conhecidos.map((l: any) => String(l).trim()).filter(Boolean),
    },
  }
}
