import { abrirCenario, confere, dizQue, escrever, ler, lerJson, mentor } from '../apoio.ts'
import type { Cenario } from '../apoio.ts'
import type { Contexto, Tarefa } from '../../.mentor/scripts/tipos.ts'

/**
 * Prova a robustez de gates, a saida vazia como INVALIDO, o arquivo --ABSORVIDA.json e o .mentor-saidas/ (Passo 3).
 */
export function rodar(): Cenario {
  const c = abrirCenario('18-robustez-gates-e-absorcao')
  mentor(c, 'init')

  // 1. .gitignore contem .mentor-saidas/
  const gitignore = ler(c, '.gitignore')
  confere(c, gitignore.includes('.mentor-saidas/'), 'init adiciona .mentor-saidas/ ao .gitignore')

  // 2. Criar duas tarefas: TASK-RF-001 e TASK-RF-002
  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Tarefa original', '--esforco', 'P/P', '--origem', 'chat')
  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Tarefa abrangente', '--esforco', 'M/M', '--origem', 'chat')

  // 3. Absorver TASK-RF-001 por TASK-RF-002
  const saidaAbsorver = mentor(c, 'task', 'absorver', 'TASK-RF-001', '--por', 'TASK-RF-002')
  dizQue(c, saidaAbsorver, 'absorvida por TASK-RF-002', 'absorver informa destino da absorcao')

  // 4. Conferir que o arquivo em concluidas foi nomeado com --ABSORVIDA.json
  const concluidas = lerJson<Tarefa>(c, 'docs-mentor/tarefas/concluidas/2026-08-29--14h00--TASK-RF-001--ABSORVIDA.json')
  confere(c, concluidas.absorvida_por === 'TASK-RF-002', 'arquivo gerado com sufixo --ABSORVIDA.json')
  confere(c, concluidas.estado === 'cancelada', 'estado interno permanece cancelada')

  // 5. Configurar um gate com comando de saida vazia
  const ctx = lerJson<Contexto>(c, 'docs-mentor/contexto.json')
  // No Windows/Linux, comando que nao imprime nada e sai 0 (ex: node -e "")
  ctx.gates.teste = { comando: 'node -e ""', obrigatorio: true }
  escrever(c, 'docs-mentor/contexto.json', JSON.stringify(ctx, null, 2))

  // 6. Rodar gate na tarefa TASK-RF-002 e validar que saida vazia vira INVALIDO como gate
  mentor(c, 'task', 'puxar', 'TASK-RF-002')
  mentor(c, 'task', 'iniciar', 'TASK-RF-002')
  const saidaGate = mentor(c, 'task', 'gate', 'TASK-RF-002', 'teste')
  dizQue(c, saidaGate, 'INVÁLIDO como gate', 'comando sem saida e classificado como INVALIDO como gate')

  const tarefa2 = lerJson<Tarefa>(c, 'docs-mentor/tarefas/abertas/TASK-RF-002.json')
  confere(c, tarefa2.gates.teste?.rotulo === 'INVÁLIDO como gate', 'rotulo salvo como INVALIDO como gate')
  confere(c, Boolean(tarefa2.gates.teste?.motivo?.includes('Saída vazia')), 'motivo registrado explicando a saida vazia')

  return c
}
