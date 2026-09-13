import { spawnSync } from 'node:child_process'
import {
  abrirCenarioTemporario, confere, dizQue, escrever, fecharTemporario, ler, lerJson, mentor,
} from '../apoio.ts'
import type { Cenario } from '../apoio.ts'
import { listar } from '../../.mentor/scripts/arquivos.ts'
import type { Tarefa } from '../../.mentor/scripts/tipos.ts'

/**
 * Prova as regras da v0.5.0:
 * 1. Trava mecânica de validação manual: tarefa pendente recusa finalizar sem aprovação humana.
 * 2. Registro do gate validacao_manual como APROVADO com evidência humana.
 * 3. Atalho direto --validado-por-humano na finalização.
 * 4. Disciplina de escopo Git: recusa se arquivos de código modificados não constam em plano.muda (AUD-001-B05).
 * 5. Cadência de auditoria: desde a 0.8.0 conta tarefas com diff auditável; `cadencia_em_caracteres`
 *    continua no contexto deste cenário para provar que não dispara mais nada.
 * 6. Doctor medindo a cadência por tarefas e avisando do campo obsoleto.
 * 7. Dossiê de auditoria atestando conformidade com a Regra 4 quando há validação humana aprovada.
 * 8. (0.8.0) Arquivo criado depois do gate recusa o fechamento até o gate rodar de novo.
 */
export function rodar(): Cenario {
  const c = abrirCenarioTemporario('22-cadencia-diff-e-validacao-manual')
  const sh = (...args: string[]) =>
    spawnSync(args[0]!, args.slice(1), { cwd: c.pasta, encoding: 'utf8' })
  const commit = (msg: string) => {
    sh('git', 'add', '-A')
    sh('git', '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', msg)
  }

  sh('git', 'init', '-q')
  sh('git', 'branch', '-M', 'main')
  escrever(c, 'README.md', '# Projeto Teste v0.5.0\n')
  commit('inicio')
  mentor(c, 'init')

  // Cadencia curta de tarefas (2), e o campo antigo de caracteres num valor que a 0.7.0 estouraria na primeira
  const ctx = lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
  ctx.gates.testes = { comando: 'node -e "console.log(\'1 passed\')"' }
  ctx.gates.validacao_manual = { existe: true, o_que: 'Validação visual no navegador' }
  ctx.qualidade.metodo_de_teste = 'teste-depois'
  ctx.qualidade.metodo_motivo = 'teste de integracao'
  ctx.auditoria.cadencia_em_tarefas = 2
  ctx.auditoria.cadencia_em_caracteres = 150
  escrever(c, 'docs-mentor/contexto.json', JSON.stringify(ctx, null, 2))
  commit('configura gates e auditoria')

  // --- 1. Validação Manual Obrigatória & Recusa
  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Tela de login responsiva',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente', '--sem-requisito', '--motivo', 'teste')
  mentor(c, 'task', 'puxar', 'TASK-RF-001')
  mentor(c, 'task', 'iniciar', 'TASK-RF-001')

  escrever(c, 'src/login.ts', 'export const login = (u: string, p: string) => u === "admin" && p === "123"\n')

  const t1 = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.json')
  t1.plano = {
    muda: ['src/login.ts - adiciona funcao de login'],
    criterios_aceite: [{ texto: 'login autentica admin', teste: 'src/login.test.ts > autentica' }],
    impacto: 'modulo de autenticacao',
    riscos: ['nenhum identificado'],
    dependencias_novas: [],
    proporcionalidade: 'proporcional ao pedido',
  }
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.json', JSON.stringify(t1, null, 2))
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.md',
    '# TASK-RF-001\n\n## Decisoes tomadas\nLogin simples.\n\n## O que nao foi feito, e por que\nNada.\n\n## Testes de descoberta\nNenhum.\n\n## Aprendizados\nNada.\n')

  mentor(c, 'task', 'gate', 'TASK-RF-001', 'testes')

  // Tentativa de finalizar sem aprovação humana deve ser recusada
  const fimSemValidar = mentor(c, 'task', 'finalizar', 'TASK-RF-001')
  dizQue(c, fimSemValidar, 'validacao manual pendente. A conclusao exige aprovacao humana',
    'finalizar recusa fechar tarefa quando validacao manual esta pendente')

  // --- 2. Disciplina de Escopo Git (AUD-001-B05: arquivos fantasmas)
  // Aprova a validação manual primeiro
  mentor(c, 'task', 'validar', 'TASK-RF-001', '--aprovado', '--evidencia', 'Interface conferida no navegador Chrome 120')

  // Modifica arquivo de código fora do plano.muda
  escrever(c, 'infra/worker.js', 'console.log("worker fantasma")\n')
  const fimComArquivoFantasma = mentor(c, 'task', 'finalizar', 'TASK-RF-001')
  dizQue(c, fimComArquivoFantasma, 'fora do plano.muda',
    'finalizar recusa se arquivos de producao foram modificados fora de plano.muda')

  // Corrige o plano.muda para incluir infra/worker.js
  const t1Atualizada = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.json')
  t1Atualizada.plano.muda.push('infra/worker.js - script auxiliar do worker')
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.json', JSON.stringify(t1Atualizada, null, 2))

  // O worker.js nasceu depois do gate: a evidencia de testes e' de outra arvore (0.8.0)
  const fimGateVelho = mentor(c, 'task', 'finalizar', 'TASK-RF-001')
  dizQue(c, fimGateVelho, 'rodou antes de 1 arquivo(s) mudar(em): infra/worker.js',
    'finalizar recusa quando arquivo declarado mudou depois do gate de testes')

  // Roda o gate de novo e finaliza com sucesso
  mentor(c, 'task', 'gate', 'TASK-RF-001', 'testes')
  const fimOk1 = mentor(c, 'task', 'finalizar', 'TASK-RF-001')
  dizQue(c, fimOk1, 'TASK-RF-001 concluida', 'tarefa finaliza com sucesso apos validacao e plano alinhado')
  confere(c, !fimOk1.saida.includes('Cadencia de auditoria atingida'),
    'uma tarefa nao bate a cadencia de 2, por maior que seja o diff: caracteres nao disparam mais')
  commit('TASK-RF-001')

  // Confere que o registro da tarefa concluída gravou validacao aprovada e o gate validacao_manual
  const arqConcluida = listar(c.pasta + '/docs-mentor/tarefas/concluidas', '.json').find((f) => f.includes('TASK-RF-001'))!
  const t1Concluida = lerJson<Tarefa>(c, 'docs-mentor/tarefas/concluidas/' + arqConcluida.replace(/^.*[\\/]/, ''))
  confere(c, t1Concluida.validacao === 'aprovado', 'validacao gravada como aprovado')
  confere(c, t1Concluida.gates.validacao_manual?.rotulo === 'APROVADO', 'gate validacao_manual aprovado')
  confere(c, t1Concluida.gates.validacao_manual?.saida?.includes('Chrome 120') === true, 'evidencia humana registrada no gate')

  // --- 3. Atalho direto --validado-por-humano em cálculo de rota
  mentor(c, 'task', 'nova', '--tipo', 'RN', '--titulo', 'Algoritmo de calculo de rotas com Haversine',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente', '--sem-requisito', '--motivo', 'teste')
  mentor(c, 'task', 'puxar', 'TASK-RN-001')
  mentor(c, 'task', 'iniciar', 'TASK-RN-001')

  escrever(c, 'src/rota.ts',
    'export function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {\n' +
    '  const R = 6371\n' +
    '  const dLat = (lat2 - lat1) * Math.PI / 180\n' +
    '  const dLon = (lon2 - lon1) * Math.PI / 180\n' +
    '  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2\n' +
    '  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))\n' +
    '}\n',
  )

  const t2 = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-RN-001.json')
  t2.plano = {
    muda: ['src/rota.ts - implementa formula haversine'],
    criterios_aceite: [{ texto: 'calcula distancia correta', teste: 'src/rota.test.ts > haversine' }],
    impacto: 'modulo de rotas',
    riscos: ['nenhum'],
    dependencias_novas: [],
    proporcionalidade: 'proporcional',
  }
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RN-001.json', JSON.stringify(t2, null, 2))
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RN-001.md',
    '# TASK-RN-001\n\n## Decisoes tomadas\nHaversine padrao.\n\n## O que nao foi feito, e por que\nNada.\n\n## Testes de descoberta\nNenhum.\n\n## Aprendizados\nNada.\n')

  mentor(c, 'task', 'gate', 'TASK-RN-001', 'testes')

  // Finaliza com atalho --validado-por-humano: a segunda tarefa com codigo bate a cadencia de 2
  const fimOk2 = mentor(c, 'task', 'finalizar', 'TASK-RN-001', '--validado-por-humano', 'Calculo de Haversine conferido com tabela geodesica')
  dizQue(c, fimOk2, 'TASK-RN-001 concluida', 'finaliza com atalho --validado-por-humano')
  dizQue(c, fimOk2, 'Cadencia de auditoria atingida: 2 tarefa(s) com codigo', 'dispara alerta ao bater a cadencia em tarefas')
  commit('TASK-RN-001')

  // --- 4. Doctor reportando cadência por tarefas e o campo obsoleto
  const doc = mentor(c, 'doctor')
  dizQue(c, doc, '2 tarefa(s) com codigo sem auditoria (cadencia 2)', 'doctor reporta a cadencia por tarefas')
  dizQue(c, doc, 'cadencia_em_caracteres nao e mais usado', 'doctor avisa que o campo de caracteres nao dispara mais nada')

  // --- 5. Dossiê de Auditoria & Satisfação da Regra 4
  mentor(c, 'auditar', 'preparar')
  const dossie = ler(c, 'docs-mentor/auditorias/AUD-001-dossie.md')
  confere(c, dossie.includes('TASK-RF-001') && dossie.includes('TASK-RN-001'), 'dossie inclui as duas tarefas')
  confere(c, dossie.includes('Interface conferida no navegador Chrome 120'), 'tabela de gates mostra a evidencia da validacao humana')
  confere(c, dossie.includes('Regra 4 atendida'), 'fatos mecanicos atestam que a tarefa de calculo possui revisao humana aprovada')

  fecharTemporario(c)
  return c
}
