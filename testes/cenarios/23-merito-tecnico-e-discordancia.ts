import { spawnSync } from 'node:child_process'
import {
  abrirCenarioTemporario, confere, dizQue, escrever, fecharTemporario, ler, lerJson, mentor,
} from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/**
 * Prova as regras da v0.6.0 (Mérito Técnico, Estado da Arte e o Dever de Contrariar):
 * 1. Campo problema_canonico e secao discordancia nascem com marcadores no plano.
 * 2. Finalizar recusa se problema_canonico ou discordancia estiverem incompletos.
 * 3. Finalizar aceita "sem nome canonico" e "Nada a objetar" se explicitamente preenchidos.
 * 4. Spike com criterio de medicao/otimizacao exige as tres reguas (piso, teto, padrao).
 * 5. Tarefa com esforco IA G/XG exige secao estado_da_arte e custo_de_oportunidade.
 * 6. Puxar recusa tarefa dependente de spike/tarefa que refutou premissa, liberando com --premissa-reconfirmada.
 * 7. Doctor e iniciar detectam reincidencia de 2 spikes inconclusivos, exigindo --estrategia-revisada.
 * 8. As recusas de merito tecnico sao devidamente registradas em recusas.jsonl.
 */
export function rodar(): Cenario {
  const c = abrirCenarioTemporario('23-merito-tecnico-e-discordancia')
  const sh = (...args: string[]) =>
    spawnSync(args[0]!, args.slice(1), { cwd: c.pasta, encoding: 'utf8' })
  const commit = (msg: string) => {
    sh('git', 'add', '-A')
    sh('git', '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', msg)
  }

  sh('git', 'init', '-q')
  sh('git', 'branch', '-M', 'main')
  escrever(c, 'README.md', '# Projeto Teste v0.6.0\n')
  commit('inicio')
  mentor(c, 'init')

  // Configura gates basicos
  const ctx = lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
  ctx.gates.testes = { comando: 'node -e "console.log(\'1 passed\')"' }
  ctx.qualidade.metodo_de_teste = 'teste-depois'
  ctx.qualidade.metodo_motivo = 'teste automatizado'
  escrever(c, 'docs-mentor/contexto.json', JSON.stringify(ctx, null, 2))
  commit('configura gates')

  // --- 1. Problema Canônico e Discordância no Plano
  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Calculadora de hash de arquivo',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente', '--sem-requisito', '--motivo', 'teste')
  mentor(c, 'task', 'puxar', 'TASK-RF-001')
  mentor(c, 'task', 'iniciar', 'TASK-RF-001')

  const t1 = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.json')
  confere(c, typeof t1.plano.problema_canonico === 'string' && t1.plano.problema_canonico.includes('PREENCHER:'),
    'iniciar preenche problema_canonico com marcador PREENCHER:')
  confere(c, t1.plano.discordancia?.o_que_faria_diferente?.includes('PREENCHER:'),
    'iniciar preenche discordancia.o_que_faria_diferente com marcador PREENCHER:')
  confere(c, t1.plano.discordancia?.o_que_preocupa?.includes('PREENCHER:'),
    'iniciar preenche discordancia.o_que_preocupa com marcador PREENCHER:')
  confere(c, t1.plano.discordancia?.o_que_existe_pronto_80_porcento?.includes('PREENCHER:'),
    'iniciar preenche discordancia.o_que_existe_pronto_80_porcento com marcador PREENCHER:')

  // Tentar finalizar com marcadores: recusa
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.md', '# TASK-RF-001\n\n## Decisoes tomadas\nOk.\n\n## O que nao foi feito, e por que\nNada.\n\n## Aprendizados\nNada.\n\n## Desfecho\nGates verdes; nada fora do previsto.\n')
  const rMarcador = mentor(c, 'task', 'finalizar', 'TASK-RF-001')
  dizQue(c, rMarcador, 'marcador PREENCHER: nao preenchido', 'recusa finalizar com marcadores de merito nao preenchidos')

  // Tentar finalizar com problema_canonico vazio: recusa
  t1.plano.muda = ['hash.ts - calcula hash']
  t1.plano.criterios_aceite = [{ texto: 'gera sha256', teste: 'hash.test.ts' }]
  t1.plano.impacto = 'modulo hash'
  t1.plano.riscos = ['nenhum identificado']
  t1.plano.proporcionalidade = 'direto'
  t1.plano.problema_canonico = '   '
  t1.plano.pedido_original = 'pedido do cenario'
  t1.plano.solucao_sugerida = null
  t1.plano.alternativas_profissionais = []
  if (t1.plano.saida_do_laboratorio !== undefined) t1.plano.saida_do_laboratorio = { tipo: 'relatorio', artefato: null, teste_de_contrato: null }
  t1.plano.discordancia = {
    o_que_faria_diferente: 'Nada a objetar',
    o_que_preocupa: 'Nada a objetar',
    o_que_existe_pronto_80_porcento: 'crypto nativo do node',
  }
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.json', JSON.stringify(t1, null, 2))
  const rSemCanonico = mentor(c, 'task', 'finalizar', 'TASK-RF-001')
  dizQue(c, rSemCanonico, 'plano sem "problema_canonico"', 'recusa finalizar com problema_canonico vazio')

  // Tentar finalizar com discordancia incompleta: recusa
  t1.plano.problema_canonico = 'Hashing criptografico / digest'
  t1.plano.pedido_original = 'pedido do cenario'
  t1.plano.solucao_sugerida = null
  t1.plano.alternativas_profissionais = []
  if (t1.plano.saida_do_laboratorio !== undefined) t1.plano.saida_do_laboratorio = { tipo: 'relatorio', artefato: null, teste_de_contrato: null }
  t1.plano.discordancia.o_que_preocupa = ''
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.json', JSON.stringify(t1, null, 2))
  const rSemDisc = mentor(c, 'task', 'finalizar', 'TASK-RF-001')
  dizQue(c, rSemDisc, 'plano sem secao "discordancia" completa', 'recusa finalizar com discordancia incompleta')

  // Preencher problema_canonico e discordancia corretamente: finaliza
  t1.plano.discordancia.o_que_preocupa = 'Nada a objetar'
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.json', JSON.stringify(t1, null, 2))
  escrever(c, 'hash.ts', 'export const hash = () => "abc"\n')
  mentor(c, 'task', 'gate', 'TASK-RF-001', 'testes')
  const rOk1 = mentor(c, 'task', 'finalizar', 'TASK-RF-001')
  dizQue(c, rOk1, 'concluida', 'finaliza com merito tecnico preenchido')
  commit('fecha TASK-RF-001')

  // --- 2. Spike de Medição com as Três Réguas & Refutação de Premissa
  mentor(c, 'task', 'nova', '--tipo', 'SPIKE', '--titulo', 'Mede otimizacao de busca binaria contra linear',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente')
  mentor(c, 'task', 'puxar', 'TASK-SPIKE-001')
  mentor(c, 'task', 'iniciar', 'TASK-SPIKE-001')

  const s1 = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-SPIKE-001.json')
  confere(c, Boolean(s1.plano.reguas_de_medicao?.piso?.includes('PREENCHER:')),
    'spike de medicao inicializa reguas_de_medicao com piso')
  confere(c, Boolean(s1.plano.reguas_de_medicao?.teto?.includes('PREENCHER:')),
    'spike de medicao inicializa reguas_de_medicao com teto')
  confere(c, Boolean(s1.plano.reguas_de_medicao?.padrao?.includes('PREENCHER:')),
    'spike de medicao inicializa reguas_de_medicao com padrao')

  s1.plano.muda = ['busca.ts - teste de benchmark']
  s1.plano.criterios_aceite = [{ texto: 'otimiza busca para colecoes grandes', teste: 'nao se aplica: spike' }]
  s1.plano.impacto = 'busca'
  s1.plano.riscos = ['nenhum']
  s1.plano.proporcionalidade = 'spike'
  s1.plano.problema_canonico = 'Busca binaria vs linear'
  s1.plano.pedido_original = 'pedido do cenario'
  s1.plano.solucao_sugerida = null
  s1.plano.alternativas_profissionais = []
  if (s1.plano.saida_do_laboratorio !== undefined) s1.plano.saida_do_laboratorio = { tipo: 'relatorio', artefato: null, teste_de_contrato: null }
  s1.plano.discordancia = {
    o_que_faria_diferente: 'Nada a objetar',
    o_que_preocupa: 'Overhead para colecoes pequenas',
    o_que_existe_pronto_80_porcento: 'Array.prototype.indexOf',
  }
  // Deixar reguas_de_medicao sem preencher: recusa
  s1.plano.reguas_de_medicao = { piso: '', teto: '', padrao: '' }
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-SPIKE-001.json', JSON.stringify(s1, null, 2))
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-SPIKE-001.md', '# TASK-SPIKE-001\n\n## A resposta\nLinear e melhor para N < 50.\n\n## O que foi descartado\nBusca binaria para N pequeno.\n\n## A tarefa que isto destrava\nnenhuma: resposta foi nao\n\n## Desfecho\nGates verdes; nada fora do previsto.\n')
  const rSpikeSemReguas = mentor(c, 'task', 'finalizar', 'TASK-SPIKE-001')
  dizQue(c, rSpikeSemReguas, 'spike de medicao sem as tres reguas obrigatorias',
    'recusa spike de medicao sem as tres reguas')

  // Preencher reguas e registrar achado refutando premissa
  s1.plano.reguas_de_medicao = {
    piso: 'busca linear trivial',
    teto: 'busca binaria teorica O(log n)',
    padrao: 'IndexOf nativo do motor JS',
  }
  s1.achados = [{
    classe: 3,
    descricao: 'resultado inconclusivo: premissa refutada: busca linear foi mais rapida para listas de ate 50 itens',
    destino: 'descartado',
    ref: 'hipotese de ganho refutada',
  }]
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-SPIKE-001.json', JSON.stringify(s1, null, 2))
  escrever(c, 'busca.ts', 'export const busca = () => 0\n')
  mentor(c, 'task', 'gate', 'TASK-SPIKE-001', 'testes')
  const rOkSpike = mentor(c, 'task', 'finalizar', 'TASK-SPIKE-001')
  dizQue(c, rOkSpike, 'concluida', 'finaliza spike com reguas preenchidas')
  commit('fecha TASK-SPIKE-001 com premissa refutada')

  // --- 3. Bloqueio por Premissa Refutada (M5)
  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Implementar busca binaria generalizada',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente', '--depende', 'TASK-SPIKE-001',
    '--sem-requisito', '--motivo', 'teste')
  
  const rPuxarBloqueado = mentor(c, 'task', 'puxar', 'TASK-RF-002')
  dizQue(c, rPuxarBloqueado, 'possui achado refutando a premissa',
    'bloqueia puxar tarefa cuja dependencia refutou premissa')

  // Com premissa reconfirmada pelo mantenedor: libera
  const rPuxarLiberado = mentor(c, 'task', 'puxar', 'TASK-RF-002', '--premissa-reconfirmada', '--motivo', 'requisito contratual externo')
  dizQue(c, rPuxarLiberado, 'no ciclo', 'libera puxar com premissa reconfirmada explicitamente')

  // --- 4. Tarefa G/XG exige Estado da Arte e Custo de Oportunidade (M1, M8)
  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Parser de formato estruturado complexo',
    '--esforco', 'P/G', '--origem', 'titulo-autossuficiente', '--sem-requisito', '--motivo', 'teste')
  mentor(c, 'task', 'puxar', 'TASK-RF-003')
  mentor(c, 'task', 'iniciar', 'TASK-RF-003')

  const tG = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-RF-003.json')
  confere(c, Boolean(tG.plano.estado_da_arte), 'tarefa com esforco IA G inicializa estado_da_arte')
  confere(c, Boolean(tG.plano.custo_de_oportunidade), 'tarefa com esforco IA G inicializa custo_de_oportunidade')

  tG.plano.muda = ['parser.ts - parser']
  tG.plano.criterios_aceite = [{ texto: 'parseia texto', teste: 'parser.test.ts' }]
  tG.plano.impacto = 'parser'
  tG.plano.riscos = ['nenhum']
  tG.plano.proporcionalidade = 'direto'
  tG.plano.problema_canonico = 'Parsing sintatico LR/GLR'
  tG.plano.pedido_original = 'pedido do cenario'
  tG.plano.solucao_sugerida = null
  tG.plano.alternativas_profissionais = []
  if (tG.plano.saida_do_laboratorio !== undefined) tG.plano.saida_do_laboratorio = { tipo: 'relatorio', artefato: null, teste_de_contrato: null }
  tG.plano.discordancia = {
    o_que_faria_diferente: 'Usaria gerador de parser pronto em vez de escrever a mao',
    o_que_preocupa: 'Complexidade de manutencao gramatical',
    o_que_existe_pronto_80_porcento: 'ANTLR, PEG.js, Chevrotain',
  }
  // Esvazia estado_da_arte para testar recusa
  tG.plano.estado_da_arte = { implementacoes_consolidadas: [], motivo_descarte: '', o_que_resta_construir: '' }
  tG.plano.custo_de_oportunidade = { o_que_existe_pronto: 'Chevrotain', custo_estimado: 'gratis', dependencias_ou_infra: 'nenhuma', tempo_substituido: '3 semanas' }
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-003.json', JSON.stringify(tG, null, 2))
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-003.md', '# TASK-RF-003\n\n## Decisoes tomadas\nOk.\n\n## O que nao foi feito, e por que\nNada.\n\n## Aprendizados\nNada.\n\n## Desfecho\nGates verdes; nada fora do previsto.\n')
  
  const rSemEstadoDaArte = mentor(c, 'task', 'finalizar', 'TASK-RF-003')
  dizQue(c, rSemEstadoDaArte, 'exige secao "estado_da_arte" preenchida', 'recusa tarefa G sem estado da arte')

  // Preenche estado_da_arte e esvazia custo_de_oportunidade
  tG.plano.estado_da_arte = {
    implementacoes_consolidadas: ['Chevrotain (MIT, gratis)', 'Nearley (MIT, gratis)'],
    motivo_descarte: 'Chevrotain adiciona 120KB ao bundle do navegador',
    o_que_resta_construir: 'Tokens customizados do protocolo',
  }
  tG.plano.custo_de_oportunidade = { o_que_existe_pronto: '', custo_estimado: '', dependencias_ou_infra: '', tempo_substituido: '' }
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-003.json', JSON.stringify(tG, null, 2))
  const rSemCustoOp = mentor(c, 'task', 'finalizar', 'TASK-RF-003')
  dizQue(c, rSemCustoOp, 'exige secao "custo_de_oportunidade" preenchida', 'recusa tarefa G sem custo de oportunidade')

  // Preenche ambos e finaliza com sucesso
  tG.plano.custo_de_oportunidade = {
    o_que_existe_pronto: 'Chevrotain parser toolkit',
    custo_estimado: 'codigo aberto gratuito',
    dependencias_ou_infra: 'dependencia npm em runtime',
    tempo_substituido: '3 semanas de implementacao de gramatica manual',
  }
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-003.json', JSON.stringify(tG, null, 2))
  escrever(c, 'parser.ts', 'export const parser = () => true\n')
  mentor(c, 'task', 'gate', 'TASK-RF-003', 'testes')
  const rOkG = mentor(c, 'task', 'finalizar', 'TASK-RF-003')
  dizQue(c, rOkG, 'concluida', 'finaliza tarefa G com estado da arte e custo de oportunidade preenchidos')
  commit('fecha TASK-RF-003')

  // --- 5. Reincidência de Spikes Inconclusivos (M6)
  // Cria e fecha um segundo spike como inconclusivo
  mentor(c, 'task', 'nova', '--tipo', 'SPIKE', '--titulo', 'Spike sobre persistencia em memoria',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente')
  mentor(c, 'task', 'puxar', 'TASK-SPIKE-002')
  mentor(c, 'task', 'iniciar', 'TASK-SPIKE-002')

  const s2 = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-SPIKE-002.json')
  s2.plano.muda = ['mem.ts - teste']
  s2.plano.criterios_aceite = [{ texto: 'avalia consumo de memoria', teste: 'nao se aplica: spike' }]
  s2.plano.impacto = 'mem'
  s2.plano.riscos = ['nenhum']
  s2.plano.proporcionalidade = 'spike'
  s2.plano.problema_canonico = 'sem nome canonico'
  s2.plano.pedido_original = 'pedido do cenario'
  s2.plano.solucao_sugerida = null
  s2.plano.alternativas_profissionais = []
  if (s2.plano.saida_do_laboratorio !== undefined) s2.plano.saida_do_laboratorio = { tipo: 'relatorio', artefato: null, teste_de_contrato: null }
  s2.plano.discordancia = { o_que_faria_diferente: 'Nada a objetar', o_que_preocupa: 'Nada a objetar', o_que_existe_pronto_80_porcento: 'Nenhuma conhecida' }
  s2.achados = [{ classe: 3, descricao: 'resultado inconclusivo sobre ganho de performance', destino: 'descartado', ref: 'inconclusivo' }]
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-SPIKE-002.json', JSON.stringify(s2, null, 2))
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-SPIKE-002.md', '# TASK-SPIKE-002\n\n## A resposta\ninconclusivo por variancia do hardware\n\n## O que foi descartado\nNada.\n\n## A tarefa que isto destrava\nnenhuma\n\n## Desfecho\nGates verdes; nada fora do previsto.\n')
  escrever(c, 'mem.ts', 'export const mem = () => 1\n')
  mentor(c, 'task', 'gate', 'TASK-SPIKE-002', 'testes')
  const rFinS2 = mentor(c, 'task', 'finalizar', 'TASK-SPIKE-002')
  dizQue(c, rFinS2, 'concluida', 'finaliza segundo spike inconclusivo')
  commit('fecha segundo spike inconclusivo')

  // Doctor deve alertar sobre a reincidencia
  const doc = mentor(c, 'doctor')
  dizQue(c, doc, 'reincidencia de spikes inconclusivos', 'doctor alerta sobre spikes inconclusivos consecutivos')

  // Tentar iniciar um 3º spike deve bloquear
  mentor(c, 'task', 'nova', '--tipo', 'SPIKE', '--titulo', 'Terceiro spike sobre o mesmo tema',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente')
  mentor(c, 'task', 'puxar', 'TASK-SPIKE-003')
  const rSpike3Bloqueado = mentor(c, 'task', 'iniciar', 'TASK-SPIKE-003')
  dizQue(c, rSpike3Bloqueado, 'Reincidencia de spikes inconclusivos', 'iniciar bloqueia 3º spike consecutivo inconclusivo')

  // Com --estrategia-revisada permite iniciar
  const rSpike3Liberado = mentor(c, 'task', 'iniciar', 'TASK-SPIKE-003', '--estrategia-revisada')
  dizQue(c, rSpike3Liberado, 'em execucao', 'iniciar permite com --estrategia-revisada')

  // --- 6. Conferir que as recusas de mérito foram registradas em recusas.jsonl
  const recusasLinhas = ler(c, 'docs-mentor/tarefas/recusas.jsonl').split('\n').filter(Boolean)
  confere(c, recusasLinhas.length >= 4, 'recusas foram registradas no recusas.jsonl')
  confere(c, recusasLinhas.some((l) => l.includes('problema_canonico')), 'recusas.jsonl registra recusa de problema_canonico')
  confere(c, recusasLinhas.some((l) => l.includes('discordancia')), 'recusas.jsonl registra recusa de discordancia')
  confere(c, recusasLinhas.some((l) => l.includes('reguas obrigatorias')), 'recusas.jsonl registra recusa de reguas')
  confere(c, recusasLinhas.some((l) => l.includes('estado_da_arte')), 'recusas.jsonl registra recusa de estado_da_arte')

  fecharTemporario(c)
  return c
}
