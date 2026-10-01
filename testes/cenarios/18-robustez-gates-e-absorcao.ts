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
  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Tarefa original', '--esforco', 'P/P', '--origem', 'titulo-autossuficiente', '--sem-requisito', '--motivo', 'teste de absorcao')
  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Tarefa abrangente', '--esforco', 'M/M', '--origem', 'titulo-autossuficiente', '--sem-requisito', '--motivo', 'teste de absorcao')

  // 3. Absorver TASK-RF-001 por TASK-RF-002
  const saidaAbsorver = mentor(c, 'task', 'absorver', 'TASK-RF-001', '--por', 'TASK-RF-002')
  dizQue(c, saidaAbsorver, 'absorvida por TASK-RF-002', 'absorver informa destino da absorcao')

  // 4. Conferir que o arquivo em concluidas foi nomeado com --ABSORVIDA.json
  const concluidas = lerJson<Tarefa>(c, 'docs-mentor/tarefas/concluidas/2026-08-29--14h00--TASK-RF-001--ABSORVIDA.json')
  confere(c, concluidas.absorvida_por === 'TASK-RF-002', 'arquivo gerado com sufixo --ABSORVIDA.json')
  confere(c, concluidas.estado === 'cancelada', 'estado interno permanece cancelada')

  // 5. Gates com saida 0. Silencio e' sucesso por convencao (tsc, eslint); o gate de testes que nao
  // coletou nenhum teste, ou que nao diz nada, e' o gate que existe e nao checa nada.
  const ctx = lerJson<Contexto>(c, 'docs-mentor/contexto.json')
  ctx.gates.tipos = { comando: 'node -e ""', obrigatorio: true }
  ctx.gates.testes = { comando: 'node -e "console.log(\'0 tests\')"', obrigatorio: true }
  escrever(c, 'docs-mentor/contexto.json', JSON.stringify(ctx, null, 2))

  // 6. Rodar os gates na tarefa TASK-RF-002
  mentor(c, 'task', 'puxar', 'TASK-RF-002')
  mentor(c, 'task', 'iniciar', 'TASK-RF-002')
  dizQue(c, mentor(c, 'task', 'gate', 'TASK-RF-002', 'tipos'), 'APROVADO: tipos', 'gate silencioso por convencao aprova')
  const saidaGate = mentor(c, 'task', 'gate', 'TASK-RF-002', 'testes')
  dizQue(c, saidaGate, 'INVÁLIDO como gate', 'gate de testes sem teste coletado e classificado como INVALIDO como gate')

  const tarefa2 = lerJson<Tarefa>(c, 'docs-mentor/tarefas/abertas/TASK-RF-002.json')
  confere(c, tarefa2.gates.testes?.rotulo === 'INVÁLIDO como gate', 'rotulo salvo como INVALIDO como gate')
  confere(c, Boolean(tarefa2.gates.testes?.motivo?.includes('Nenhum teste')), 'motivo registrado explicando que nada foi testado')

  // 7. Gate de testes que roda e nao imprime nada. Ate' esta correcao passava como APROVADO.
  ctx.gates.testes = { comando: 'node -e ""', obrigatorio: true }
  escrever(c, 'docs-mentor/contexto.json', JSON.stringify(ctx, null, 2))
  dizQue(c, mentor(c, 'task', 'gate', 'TASK-RF-002', 'testes'), 'INVÁLIDO como gate',
    'gate de testes calado e classificado como INVALIDO como gate')
  const tarefa3 = lerJson<Tarefa>(c, 'docs-mentor/tarefas/abertas/TASK-RF-002.json')
  confere(c, Boolean(tarefa3.gates.testes?.motivo?.includes('Saída vazia')), 'motivo registrado explicando a saida vazia')

  return c
}
