import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { abrirCenario, confere, dizQue, mentor, RAIZ_REPO } from '../apoio.ts'
import type { Cenario } from '../apoio.ts'
import { PONTOS_DE_ENTRADA } from '../../.mentor/scripts/instalar.mjs'

/**
 * Prova a Postura Ativa do Mentor nos pontos de entrada e as regras de adocao em legados (Passo 0).
 */
export function rodar(): Cenario {
  const c = abrirCenario('16-postura-ativa-e-legados')

  // 1. Instalar gera pontos de entrada com diretiva de postura ativa
  const agentes = PONTOS_DE_ENTRADA.find((p) => p.arquivo === 'AGENTS.md')
  confere(c, Boolean(agentes), 'AGENTS.md esta nos pontos de entrada')
  const textoAgentes = agentes?.conteudo() ?? ''
  confere(c, textoAgentes.includes('Postura ativa do mentor'), 'AGENTS.md contem diretiva de postura ativa')
  confere(c, textoAgentes.includes('docs-mentor/contexto.json'), 'AGENTS.md instrui inspecionar contexto.json')

  const claude = PONTOS_DE_ENTRADA.find((p) => p.arquivo === 'CLAUDE.md')
  const textoClaude = claude?.conteudo() ?? ''
  confere(c, textoClaude.includes('@AGENTS.md') || textoClaude.includes('Postura ativa'), 'CLAUDE.md carrega instrucoes ativas')

  // 2. nucleo.md declara o princípio da postura ativa e comando correto de gate
  const nucleo = readFileSync(join(RAIZ_REPO, '.mentor', 'nucleo.md'), 'utf8')
  confere(c, nucleo.includes('Postura ativa do mentor') || nucleo.includes('Mentor ativo'), 'nucleo.md inclui principio de postura ativa')
  confere(c, nucleo.includes('task gate') && !nucleo.includes('task registrar-gate'), 'nucleo.md usa task gate em vez de task registrar-gate')

  // 3. inicializacao.md detalha a regra de proibição de entrevista do zero em projetos legados
  const inicializacao = readFileSync(join(RAIZ_REPO, '.mentor', 'processos', 'inicializacao.md'), 'utf8')
  confere(c, inicializacao.includes('proibido entrevistar do zero') || inicializacao.includes('proibido comecar a entrevista do zero'),
    'inicializacao.md proibe entrevista do zero quando ha docs/codigo')
  confere(c, inicializacao.includes('fatia_de'), 'inicializacao.md orienta fatiamento limpo')

  // 4. processos/tarefa.md inclui SPIKE e corrige comando de gate
  const tarefa = readFileSync(join(RAIZ_REPO, '.mentor', 'processos', 'tarefa.md'), 'utf8')
  confere(c, tarefa.includes('SPIKE'), 'processos/tarefa.md inclui SPIKE na lista de tipos')
  confere(c, tarefa.includes('task gate') && !tarefa.includes('task registrar-gate'), 'processos/tarefa.md usa task gate')

  // 5. init do mentor
  const saidaInit = mentor(c, 'init')
  dizQue(c, saidaInit, 'Proximo passo', 'init orienta proximos passos operacionais')

  return c
}
