import { spawnSync } from 'node:child_process'
import {
  abrirCenarioTemporario, confere, dizQue, escrever, fecharTemporario, ler, lerJson, mentor,
} from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/**
 * Prova o mecanismo de pausa e retomada de tarefas:
 * 1. Pausar exige --motivo e recusa arvore suja sem --commit.
 * 2. Pausar com --commit realiza commit de WIP, registra commit_pausa e libera slot de execucao.
 * 3. Backlog.md exibe indicador [PAUSADA] e bloqueadores.
 * 4. Permite iniciar e concluir tarefas intermediarias bloqueadoras enquanto a original esta pausada.
 * 5. Retomar recusa se outra tarefa ja estiver em execucao (respeita limite de WIP).
 * 6. Doctor avisa quando as tarefas bloqueadoras forem concluidas e orienta retomar.
 * 7. Ao retomar e finalizar, o calculo de diff isola os periodos ativos e nao acusa arquivos das tarefas intermediarias fora de escopo.
 */
export function rodar(): Cenario {
  const c = abrirCenarioTemporario('24-pausa-e-retomada-de-tarefas')
  const sh = (...args: string[]) =>
    spawnSync(args[0]!, args.slice(1), { cwd: c.pasta, encoding: 'utf8' })
  const commit = (msg: string) => {
    sh('git', 'add', '-A')
    sh('git', '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', msg)
  }

  sh('git', 'init', '-q')
  sh('git', 'branch', '-M', 'main')
  escrever(c, 'README.md', '# Projeto Teste Pausa e Retomada\n')
  commit('inicio')
  mentor(c, 'init')

  // Configura gates basicos
  const ctx = lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
  ctx.gates.testes = { comando: 'node -e "console.log(\'1 passed\')"' }
  ctx.qualidade.metodo_de_teste = 'teste-depois'
  ctx.qualidade.metodo_motivo = 'teste automatizado'
  escrever(c, 'docs-mentor/contexto.json', JSON.stringify(ctx, null, 2))
  commit('configura gates')

  // --- 1. Iniciar Spike Principal
  mentor(c, 'task', 'nova', '--tipo', 'SPIKE', '--titulo', 'Spike exploratorio de visualizacao grafica',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente')
  mentor(c, 'task', 'puxar', 'TASK-SPIKE-001')
  mentor(c, 'task', 'iniciar', 'TASK-SPIKE-001')

  // Modifica arquivo de spike na arvore de trabalho
  escrever(c, 'spike.ts', 'export const spike = () => "dados"\n')

  // Tenta pausar sem motivo: recusa
  const rSemMotivo = mentor(c, 'task', 'pausar', 'TASK-SPIKE-001')
  dizQue(c, rSemMotivo, 'Falta --motivo', 'pausar exige --motivo')

  // Tenta pausar com arvore suja sem flag --commit: recusa
  const rSuja = mentor(c, 'task', 'pausar', 'TASK-SPIKE-001', '--motivo', 'aguarda suporte de UI e correcao de bug')
  dizQue(c, rSuja, 'Existem alteracoes nao commitadas no Git', 'pausar recusa arvore suja sem --commit')

  // Pausar com --commit e informando bloqueadores
  const rPausaOk = mentor(c, 'task', 'pausar', 'TASK-SPIKE-001',
    '--motivo', 'aguarda suporte de UI e correcao de bug',
    '--bloqueada-por', 'TASK-RF-001,TASK-BG-001',
    '--commit')
  dizQue(c, rPausaOk, 'pausada com sucesso', 'pausar com --commit sucede e libera slot')

  const tPausada = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-SPIKE-001.json')
  confere(c, tPausada.estado === 'pausada', 'estado da tarefa mudou para pausada')
  confere(c, tPausada.pausa_motivo === 'aguarda suporte de UI e correcao de bug', 'motivo de pausa registrado')
  confere(c, Array.isArray(tPausada.bloqueada_por) && tPausada.bloqueada_por.length === 2, 'bloqueada_por registrado')
  confere(c, Array.isArray(tPausada.pausas) && tPausada.pausas.length === 1, 'historico de pausas registrado')
  confere(c, Boolean(tPausada.pausas[0].commit_pausa), 'commit_pausa gravado na pausa')

  // Backlog exibe indicador [PAUSADA]
  const backlog = ler(c, 'docs-mentor/tarefas/backlog.md')
  confere(c, backlog.includes('[PAUSADA]'), 'backlog.md exibe indicador [PAUSADA]')
  confere(c, backlog.includes('TASK-RF-001, TASK-BG-001'), 'backlog.md exibe as tarefas bloqueadoras')

  // --- 2. Iniciar e Concluir Tarefas Bloqueadoras Intermediárias
  // Criar e iniciar TASK-RF-001 (deve permitir porque TASK-SPIKE-001 esta pausada!)
  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Componente de painel para UI',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente', '--sem-requisito', '--motivo', 'suporte ao spike')
  mentor(c, 'task', 'puxar', 'TASK-RF-001')
  const rIniciarRF = mentor(c, 'task', 'iniciar', 'TASK-RF-001')
  dizQue(c, rIniciarRF, 'em execucao', 'inicia tarefa bloqueadora pois o slot foi liberado pela pausa')

  // Tentar retomar TASK-SPIKE-001 enquanto TASK-RF-001 esta em execucao: recusa por limite de WIP
  const rRetomarBloqueadoWip = mentor(c, 'task', 'retomar', 'TASK-SPIKE-001')
  dizQue(c, rRetomarBloqueadoWip, 'Ja ha 1 tarefa(s) em execucao', 'retomar respeita limite de WIP de 1 em execucao')

  // Concluir TASK-RF-001 (altera ui.ts)
  const tRF = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.json')
  tRF.plano.muda = ['ui.ts - componente de painel']
  tRF.plano.criterios_aceite = [{ texto: 'renderiza painel', teste: 'nao se aplica: visual' }]
  tRF.plano.impacto = 'ui'
  tRF.plano.riscos = ['nenhum']
  tRF.plano.proporcionalidade = 'direto'
  tRF.plano.problema_canonico = 'sem nome canonico'
  tRF.plano.discordancia = { o_que_faria_diferente: 'Nada a objetar', o_que_preocupa: 'Nada a objetar', o_que_existe_pronto_80_porcento: 'Nenhuma conhecida' }
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.json', JSON.stringify(tRF, null, 2))
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.md', '# TASK-RF-001\n\n## Decisoes tomadas\nOk.\n\n## O que nao foi feito, e por que\nNada.\n\n## Aprendizados\nNada.\n')
  escrever(c, 'ui.ts', 'export const ui = () => true\n')
  mentor(c, 'task', 'gate', 'TASK-RF-001', 'testes')
  const rFinRF = mentor(c, 'task', 'finalizar', 'TASK-RF-001')
  dizQue(c, rFinRF, 'concluida', 'conclui TASK-RF-001')
  commit('fecha TASK-RF-001')

  // Criar e concluir TASK-BG-001 (altera bugfix.ts)
  mentor(c, 'task', 'nova', '--tipo', 'BG', '--titulo', 'Corrige mock de ambiente de teste',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente')
  mentor(c, 'task', 'puxar', 'TASK-BG-001')
  mentor(c, 'task', 'iniciar', 'TASK-BG-001')

  const tBG = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-BG-001.json')
  tBG.plano.muda = ['bugfix.ts - correcao de mock']
  tBG.plano.criterios_aceite = [{ texto: 'corrige mock', teste: 'nao se aplica: mock' }]
  tBG.plano.impacto = 'teste'
  tBG.plano.riscos = ['nenhum']
  tBG.plano.proporcionalidade = 'direto'
  tBG.plano.problema_canonico = 'sem nome canonico'
  tBG.plano.discordancia = { o_que_faria_diferente: 'Nada a objetar', o_que_preocupa: 'Nada a objetar', o_que_existe_pronto_80_porcento: 'Nenhuma conhecida' }
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-BG-001.json', JSON.stringify(tBG, null, 2))
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-BG-001.md', '# TASK-BG-001\n\n## Decisoes tomadas\nOk.\n\n## O que nao foi feito, e por que\nNada.\n\n## Aprendizados\nNada.\n')
  escrever(c, 'bugfix.ts', 'export const mock = true\n')
  mentor(c, 'task', 'gate', 'TASK-BG-001', 'testes')
  const rFinBG = mentor(c, 'task', 'finalizar', 'TASK-BG-001')
  dizQue(c, rFinBG, 'concluida', 'conclui TASK-BG-001')
  commit('fecha TASK-BG-001')

  // --- 3. Doctor Identifica que Bloqueadores Foram Concluídos
  const doc = mentor(c, 'doctor')
  dizQue(c, doc, 'TASK-SPIKE-001 esta pausada, mas seus bloqueadores (TASK-RF-001, TASK-BG-001) ja foram concluidos',
    'doctor alerta que bloqueadores estao concluidos e sugere retomar')

  // --- 4. Retomada da Tarefa Pausada
  const rRetomarOk = mentor(c, 'task', 'retomar', 'TASK-SPIKE-001')
  dizQue(c, rRetomarOk, 'retomada em execucao', 'retoma TASK-SPIKE-001 com sucesso')

  const tRetomada = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-SPIKE-001.json')
  confere(c, tRetomada.estado === 'em-execucao', 'estado voltou para em-execucao')
  confere(c, Boolean(tRetomada.pausas[0].retomada_em), 'retomada_em foi gravado no historico de pausa')
  confere(c, Boolean(tRetomada.pausas[0].commit_retomada), 'commit_retomada foi gravado no historico de pausa')

  // --- 5. Finalizar Tarefa Retomada (Isolamento de Escopo de Diff)
  // O plano do spike declara APENAS spike.ts (ui.ts e bugfix.ts foram alterados nas tarefas intermediarias)
  tRetomada.plano.muda = ['spike.ts - exploracao grafica']
  tRetomada.plano.criterios_aceite = [{ texto: 'valida visualizacao grafica com painel e mock corrigido', teste: 'nao se aplica: spike' }]
  tRetomada.plano.impacto = 'visualizacao'
  tRetomada.plano.riscos = ['nenhum']
  tRetomada.plano.proporcionalidade = 'spike'
  tRetomada.plano.problema_canonico = 'sem nome canonico'
  tRetomada.plano.discordancia = { o_que_faria_diferente: 'Nada a objetar', o_que_preocupa: 'Nada a objetar', o_que_existe_pronto_80_porcento: 'Nenhuma conhecida' }
  tRetomada.achados = [{ classe: 3, descricao: 'visualizacao validada apos desbloqueio por UI e bugfix', destino: 'descartado', ref: 'concluido' }]

  escrever(c, 'docs-mentor/tarefas/abertas/TASK-SPIKE-001.json', JSON.stringify(tRetomada, null, 2))
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-SPIKE-001.md', '# TASK-SPIKE-001\n\n## A resposta\nGrafico funcional.\n\n## O que foi descartado\nNada.\n\n## A tarefa que isto destrava\nnenhuma\n')
  // Modifica spike.ts na etapa pós-retomada
  escrever(c, 'spike.ts', 'export const spike = () => "dados refinados com ui e mock"\n')

  mentor(c, 'task', 'gate', 'TASK-SPIKE-001', 'testes')
  const rFinSpike = mentor(c, 'task', 'finalizar', 'TASK-SPIKE-001')
  dizQue(c, rFinSpike, 'concluida', 'finaliza spike retomado sem falsos positivos de arquivos modificados nas tarefas intermediarias')

  commit('fecha TASK-SPIKE-001')
  confere(c, mentor(c, 'verificar').codigo === 0, 'projeto passa no verificar apos conclusao de tarefas pausadas e retomadas')

  fecharTemporario(c)
  return c
}
