import { abrirCenario, confere, dizQue, ler, mentor } from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/** XG nao se executa, se divide. E `fatia N/M` e' calculado, nunca guardado. */
export function rodar(): Cenario {
  const c = abrirCenario('02-epico-fatiado')
  mentor(c, 'init')

  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Modo execucao do roteiro',
    '--esforco', 'XG/XG', '--valor', 'critico', '--urgencia', 'imediata',
    '--cerimonia', 'Strict', '--origem', 'titulo-autossuficiente')

  dizQue(c, mentor(c, 'task', 'puxar', 'TASK-RF-001'),
    'esforco XG para IA', 'XG nao entra no ciclo')

  mentor(c, 'task', 'fatiar', 'TASK-RF-001', '--esforco', 'M/G', '--titulos',
    'Modelo e persistencia, sem UI|Shell ?exec=1 e proximo destino|Marcar entrega e desfazer')

  const reservaComEpico = ler(c, 'docs/tarefas/reserva.md')
  confere(c, reservaComEpico.includes('epico, 3 fatias'),
    'o epico fica visivel na reserva enquanto nenhuma fatia foi puxada')
  confere(c, reservaComEpico.includes('1/3 de TASK-RF-001'), 'a posicao da fatia e calculada na vista')

  mentor(c, 'task', 'puxar', 'TASK-RF-002')
  mentor(c, 'task', 'puxar', 'TASK-RF-003')
  const backlog = ler(c, 'docs/tarefas/backlog.md')
  confere(c, backlog.includes('## Epicos em fatias'), 'o epico vira cabecalho quando uma fatia entra no ciclo')
  confere(c, !/\|\s+\d+\s+\|\s+`TASK-RF-001`/.test(backlog), 'o epico nunca entra na fila')
  confere(c, backlog.includes('TASK-RF-004 (reserva)'), 'o cabecalho distingue fatia no ciclo de fatia na reserva')
  confere(c, !/\|\s+`TASK-RF-001`\s+\|/.test(ler(c, 'docs/tarefas/reserva.md')),
    'o epico sai da reserva quando ja aparece no backlog: nao ha vista dupla')

  // Duas fatias novas: o denominador muda sozinho, e nada e renomeado.
  mentor(c, 'task', 'fatiar', 'TASK-RF-001', '--esforco', 'P/M',
    '--titulos', 'Status visual no mapa|Sumario reflete a execucao')
  const depois = ler(c, 'docs/tarefas/backlog.md')
  confere(c, depois.includes('1/5 de TASK-RF-001'), '1/3 virou 1/5 sozinho ao acrescentar fatias')
  confere(c, mentor(c, 'verificar').codigo === 0, 'o projeto passa no verificar')
  return c
}
