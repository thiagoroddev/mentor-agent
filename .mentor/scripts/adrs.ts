import { mkdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { existe, lerTexto, listar, relativo } from './arquivos.ts'
import type { Caminhos } from './arquivos.ts'
import type {
  DiretrizAdr,
  EstadoDiretriz,
  ResultadoVigenciaDiretrizes,
  SubstituicaoDiretriz,
} from './tipos.ts'
import { ESTADOS_DIRETRIZ } from './tipos.ts'

export const MARCADOR_BLOCO_DIRETRIZES = /```json\s+mentor:diretrizes\s*([\s\S]*?)```/i
export const PADRAO_ID_DIRETRIZ = /^DIR-[A-Z0-9_-]+$/

export interface ExtracaoDiretrizes {
  diretrizes: DiretrizAdr[]
  legado: boolean
  erro?: string
}

/**
 * Extrai o bloco estruturado de diretrizes operacionais de um conteúdo Markdown de ADR.
 * Se a ADR não tiver a seção ou o bloco, classifica explicitamente como legado.
 */
export function extrairDiretrizesDeTexto(conteudo: string, nomeOuCaminho: string): ExtracaoDiretrizes {
  const adrPadrao = basename(nomeOuCaminho, '.md')
  const match = MARCADOR_BLOCO_DIRETRIZES.exec(conteudo)

  if (!match) {
    return {
      diretrizes: [],
      legado: true,
    }
  }

  const jsonBruto = match[1]?.trim() ?? ''
  if (!jsonBruto) {
    return {
      diretrizes: [],
      legado: false,
      erro: `Bloco mentor:diretrizes vazio em ${nomeOuCaminho}.`,
    }
  }

  let dados: unknown
  try {
    dados = JSON.parse(jsonBruto)
  } catch (e: any) {
    return {
      diretrizes: [],
      legado: false,
      erro: `JSON inválido no bloco mentor:diretrizes de ${nomeOuCaminho}: ${e.message}`,
    }
  }

  if (!Array.isArray(dados)) {
    return {
      diretrizes: [],
      legado: false,
      erro: `O bloco mentor:diretrizes de ${nomeOuCaminho} deve ser um array JSON de diretrizes.`,
    }
  }

  const diretrizes: DiretrizAdr[] = []
  for (let i = 0; i < dados.length; i++) {
    const item = dados[i]
    if (!item || typeof item !== 'object') {
      return {
        diretrizes: [],
        legado: false,
        erro: `Item [${i}] do bloco mentor:diretrizes em ${nomeOuCaminho} não é um objeto válido.`,
      }
    }

    const { id, estado, regra, alcance, excecoes, substitui, adr, titulo } = item as Record<string, unknown>

    if (typeof id !== 'string' || !PADRAO_ID_DIRETRIZ.test(id)) {
      return {
        diretrizes: [],
        legado: false,
        erro: `Item [${i}] em ${nomeOuCaminho} possui id inválido ("${id ?? ''}"). Deve casar com ^DIR-[A-Z0-9_-]+$.`,
      }
    }

    if (typeof estado !== 'string' || !ESTADOS_DIRETRIZ.includes(estado as EstadoDiretriz)) {
      return {
        diretrizes: [],
        legado: false,
        erro: `Diretriz "${id}" em ${nomeOuCaminho} possui estado inválido ("${estado ?? ''}"). Valores permitidos: ${ESTADOS_DIRETRIZ.join(', ')}.`,
      }
    }

    if (typeof regra !== 'string' || !regra.trim()) {
      return {
        diretrizes: [],
        legado: false,
        erro: `Diretriz "${id}" em ${nomeOuCaminho} deve possuir regra textual não vazia.`,
      }
    }

    if (typeof alcance !== 'string' || !alcance.trim()) {
      return {
        diretrizes: [],
        legado: false,
        erro: `Diretriz "${id}" em ${nomeOuCaminho} deve declarar o alcance (ex: ui/componentes, persistencia, arquitetura).`,
      }
    }

    if (excecoes !== undefined && !Array.isArray(excecoes)) {
      return {
        diretrizes: [],
        legado: false,
        erro: `Diretriz "${id}" em ${nomeOuCaminho} possui exceções em formato inválido; deve ser array de strings.`,
      }
    }

    if (substitui !== undefined && !Array.isArray(substitui)) {
      return {
        diretrizes: [],
        legado: false,
        erro: `Diretriz "${id}" em ${nomeOuCaminho} possui substitui em formato inválido; deve ser array de strings.`,
      }
    }

    diretrizes.push({
      id,
      adr: typeof adr === 'string' && adr.trim() ? adr.trim() : adrPadrao,
      titulo: typeof titulo === 'string' ? titulo.trim() : undefined,
      estado: estado as EstadoDiretriz,
      regra: regra.trim(),
      alcance: alcance.trim(),
      excecoes: Array.isArray(excecoes) ? excecoes.map(String) : [],
      substitui: Array.isArray(substitui) ? substitui.map(String) : [],
    })
  }

  return {
    diretrizes,
    legado: false,
  }
}

/**
 * Varre todos os arquivos Markdown na pasta de ADRs configurada do projeto.
 */
export function carregarDiretrizesDoProjeto(c: Caminhos): {
  diretrizes: DiretrizAdr[]
  legados: string[]
  erros: string[]
} {
  const diretrizes: DiretrizAdr[] = []
  const legados: string[] = []
  const erros: string[] = []

  if (!existe(c.adr)) {
    return { diretrizes, legados, erros }
  }

  const arquivos = listar(c.adr, '.md')
  for (const arq of arquivos) {
    try {
      const conteudo = lerTexto(arq)
      const res = extrairDiretrizesDeTexto(conteudo, arq)
      if (res.erro) {
        erros.push(res.erro)
      } else if (res.legado) {
        legados.push(relativo(arq, c.raiz))
      } else {
        diretrizes.push(...res.diretrizes)
      }
    } catch (e: any) {
      erros.push(`Falha ao ler ADR "${relativo(arq, c.raiz)}": ${e.message}`)
    }
  }

  return { diretrizes, legados, erros }
}

/**
 * Calcula determinística e formalmente o conjunto de diretrizes vigentes, revogadas
 * e substituídas, identificando ciclos e inconsistências no grafo de substituição.
 */
export function calcularVigenciaDiretrizes(
  diretrizes: DiretrizAdr[],
  legados: string[] = [],
): ResultadoVigenciaDiretrizes {
  const problemas: string[] = []
  const porId = new Map<string, DiretrizAdr>()

  // 1. Verificação de unicidade de IDs
  for (const d of diretrizes) {
    if (porId.has(d.id)) {
      const anterior = porId.get(d.id)!
      problemas.push(
        `ID de diretriz duplicado: "${d.id}" declarado tanto em "${anterior.adr}" quanto em "${d.adr}".`,
      )
    } else {
      porId.set(d.id, d)
    }
  }

  // 2. Validação de referências em 'substitui'
  for (const d of diretrizes) {
    for (const subId of d.substitui) {
      if (subId === d.id) {
        problemas.push(`Diretriz "${d.id}" declara substituir a si mesma.`)
      } else if (!porId.has(subId)) {
        problemas.push(
          `Diretriz "${d.id}" em "${d.adr}" referencia diretriz inexistente em substitui: "${subId}".`,
        )
      }
    }
  }

  // 3. Detecção de ciclos de substituição (DFS com pilha de recursão)
  const grafoSubstituicao = new Map<string, string[]>()
  for (const d of diretrizes) {
    grafoSubstituicao.set(d.id, d.substitui)
  }

  const visitados = new Set<string>()
  const naPilha = new Set<string>()
  const caminhoPilha: string[] = []

  function detectarCiclo(id: string): boolean {
    visitados.add(id)
    naPilha.add(id)
    caminhoPilha.push(id)

    const vizinhos = grafoSubstituicao.get(id) ?? []
    for (const viz of vizinhos) {
      if (!porId.has(viz)) continue
      if (!visitados.has(viz)) {
        if (detectarCiclo(viz)) return true
      } else if (naPilha.has(viz)) {
        const idxCiclo = caminhoPilha.indexOf(viz)
        const cicloFormatado = [...caminhoPilha.slice(idxCiclo), viz].join(' -> ')
        problemas.push(`Ciclo de substituição detectado entre diretrizes: ${cicloFormatado}.`)
        return true
      }
    }

    caminhoPilha.pop()
    naPilha.delete(id)
    return false
  }

  for (const id of porId.keys()) {
    if (!visitados.has(id)) {
      detectarCiclo(id)
    }
  }

  // 4. Mapeamento de substituições ativas
  // Uma diretriz aceita que substitui outra torna a anterior substituída
  const substituidaPorMap = new Map<string, string>()
  for (const d of diretrizes) {
    if (d.estado !== 'aceita') continue
    for (const subId of d.substitui) {
      if (porId.has(subId)) {
        substituidaPorMap.set(subId, d.id)
      }
    }
  }

  // 5. Categorização de vigência
  const vigentes: DiretrizAdr[] = []
  const revogadas: DiretrizAdr[] = []
  const substituidas: SubstituicaoDiretriz[] = []

  for (const d of diretrizes) {
    if (d.estado === 'revogada') {
      revogadas.push(d)
    } else if (substituidaPorMap.has(d.id)) {
      substituidas.push({
        diretriz: d,
        substituida_por: substituidaPorMap.get(d.id)!,
      })
    } else if (d.estado === 'aceita') {
      vigentes.push(d)
    }
  }

  return {
    todas: diretrizes,
    vigentes,
    revogadas,
    substituidas,
    legado_sem_diretrizes: [...legados].sort(),
    problemas,
  }
}

export interface AchadoVerificacaoAdrs {
  familia: string
  onde: string
  problema: string
}

/**
 * Produz o Markdown da habilidade `consistencia-do-projeto` com frontmatter padronizado
 * e listagem determinística estrita das diretrizes vigentes e diagnósticos de legado.
 */
export function gerarConteudoHabilidadeConsistencia(vigencia: ResultadoVigenciaDiretrizes): string {
  const linhas: string[] = [
    '---',
    'name: consistencia-do-projeto',
    'description: Diretrizes operacionais e restrições arquiteturais vigentes do projeto derivadas das ADRs.',
    '---',
    '',
    '# Consistência do Projeto: Diretrizes Arquiteturais Vigentes',
    '',
    '<!-- Gerado por `node mentor.mjs gerar`. Não edite manualmente: edite a ADR de origem e rode gerar. -->',
    '',
    'Este documento consolida as diretrizes operacionais extraídas das Architecture Decision Records (ADRs) do projeto.',
    'Toda tarefa de planejamento, implementação e revisão técnica deve consultar e respeitar as diretrizes vigentes listadas abaixo.',
    'Em caso de dúvida ou necessidade de aprofundamento de contexto e alternativas consideradas, consulte o documento integral da respectiva ADR.',
    '',
  ]

  if (vigencia.vigentes.length === 0 && vigencia.todas.length === 0 && vigencia.legado_sem_diretrizes.length === 0) {
    linhas.push(
      '## Status',
      '',
      'Nenhuma ADR registrada no projeto. Quando decisões arquiteturais caras de reverter forem tomadas, registre uma ADR com bloco estruturado `mentor:diretrizes`.',
      '',
    )
    return linhas.join('\n')
  }

  linhas.push('## Diretrizes Vigentes', '')
  if (vigencia.vigentes.length === 0) {
    linhas.push('Nenhuma diretriz com estado "aceita" vigente no momento.', '')
  } else {
    const ordenadas = [...vigencia.vigentes].sort((a, b) => a.id.localeCompare(b.id))
    for (const d of ordenadas) {
      const titulo = d.titulo ? ` · ${d.titulo}` : ''
      linhas.push(`### ${d.id}${titulo}`)
      linhas.push(`- **ADR de origem**: \`${d.adr}\``)
      linhas.push(`- **Alcance**: \`${d.alcance}\``)
      linhas.push(`- **Regra**: ${d.regra}`)
      if (d.excecoes.length > 0) {
        linhas.push(`- **Exceções**: ${d.excecoes.join(', ')}`)
      }
      if (d.substitui.length > 0) {
        linhas.push(`- **Substitui**: ${d.substitui.map((s) => `\`${s}\``).join(', ')}`)
      }
      linhas.push('')
    }
  }

  if (vigencia.legado_sem_diretrizes.length > 0) {
    linhas.push(
      '## Decisões Legadas em Linguagem Natural',
      '',
      '⚠️ Os seguintes arquivos de ADR não possuem bloco estruturado `mentor:diretrizes` (extração pendente) e dependem de consulta direta ao texto original:',
      '',
    )
    for (const leg of [...vigencia.legado_sem_diretrizes].sort()) {
      linhas.push(`- \`${leg}\``)
    }
    linhas.push('')
  }

  return linhas.join('\n')
}

/**
 * Gera ou atualiza deterministicamente o arquivo da habilidade `consistencia-do-projeto/SKILL.md`
 * na fonte de documentos do projeto (`docs-mentor/skills/` ou `docs/skills/`).
 */
export function gerarHabilidadeConsistencia(
  c: Caminhos,
  opcoes?: { forcar?: boolean },
): { ok: boolean; erro?: string; modificada: boolean; caminho?: string } {
  const pastaSkill = join(c.docs, 'skills', 'consistencia-do-projeto')
  const caminhoSkill = join(pastaSkill, 'SKILL.md')

  const { diretrizes, legados, erros } = carregarDiretrizesDoProjeto(c)
  if (erros.length > 0) {
    return {
      ok: false,
      erro: `Erros ao ler ADRs:\n  ${erros.join('\n  ')}`,
      modificada: false,
    }
  }

  const vigencia = calcularVigenciaDiretrizes(diretrizes, legados)
  if (vigencia.problemas.length > 0) {
    return {
      ok: false,
      erro: `Inconsistências impeditivas nas ADRs:\n  ${vigencia.problemas.join('\n  ')}`,
      modificada: false,
    }
  }

  const temAdrs = diretrizes.length > 0 || legados.length > 0
  if (!temAdrs && !existe(caminhoSkill) && !opcoes?.forcar) {
    return { ok: true, modificada: false }
  }

  if (!existe(c.docs)) {
    return { ok: true, modificada: false }
  }

  const novoConteudo = gerarConteudoHabilidadeConsistencia(vigencia)

  if (existe(caminhoSkill)) {
    const conteudoAtual = lerTexto(caminhoSkill)
    if (conteudoAtual === novoConteudo) {
      return { ok: true, modificada: false, caminho: caminhoSkill }
    }
  }

  mkdirSync(pastaSkill, { recursive: true })
  writeFileSync(caminhoSkill, novoConteudo, 'utf8')
  return { ok: true, modificada: true, caminho: caminhoSkill }
}

/**
 * Validação semântica e estrutural das ADRs para o `mentor verificar`:
 * - Acusa erros de parsing ou schema.
 * - Acusa ciclos, duplicidades ou referências inexistentes.
 * - Detecta drift se a habilidade `consistencia-do-projeto` estiver ausente ou desatualizada.
 */
export function verificarConsistenciaAdrs(c: Caminhos): AchadoVerificacaoAdrs[] {
  const achados: AchadoVerificacaoAdrs[] = []
  const pastaSkill = join(c.docs, 'skills', 'consistencia-do-projeto')
  const caminhoSkill = join(pastaSkill, 'SKILL.md')

  const { diretrizes, legados, erros } = carregarDiretrizesDoProjeto(c)
  for (const err of erros) {
    achados.push({
      familia: 'adrs',
      onde: relativo(c.adr, c.raiz),
      problema: err,
    })
  }

  const vigencia = calcularVigenciaDiretrizes(diretrizes, legados)
  for (const prob of vigencia.problemas) {
    achados.push({
      familia: 'adrs',
      onde: relativo(c.adr, c.raiz),
      problema: prob,
    })
  }

  const temAdrs = diretrizes.length > 0 || legados.length > 0
  if (temAdrs) {
    if (!existe(caminhoSkill)) {
      achados.push({
        familia: 'adrs',
        onde: relativo(caminhoSkill, c.raiz),
        problema: 'habilidade "consistencia-do-projeto" ausente na fonte do projeto. Rode: node mentor.mjs gerar',
      })
    } else {
      const esperado = gerarConteudoHabilidadeConsistencia(vigencia)
      const atual = lerTexto(caminhoSkill)
      if (atual !== esperado) {
        achados.push({
          familia: 'adrs',
          onde: relativo(caminhoSkill, c.raiz),
          problema: 'habilidade "consistencia-do-projeto" desatualizada em relação às ADRs. Rode: node mentor.mjs gerar',
        })
      }
    }
  } else if (existe(caminhoSkill)) {
    const esperado = gerarConteudoHabilidadeConsistencia(vigencia)
    const atual = lerTexto(caminhoSkill)
    if (atual !== esperado) {
      achados.push({
        familia: 'adrs',
        onde: relativo(caminhoSkill, c.raiz),
        problema: 'habilidade "consistencia-do-projeto" desatualizada em relação às ADRs. Rode: node mentor.mjs gerar',
      })
    }
  }

  return achados
}

