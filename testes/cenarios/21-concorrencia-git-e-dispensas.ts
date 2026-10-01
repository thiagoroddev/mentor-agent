import { spawnSync } from 'node:child_process'
import {
  abrirCenarioTemporario, confere, dizQue, escrever, fecharTemporario, ler, lerJson, mentor,
} from '../apoio.ts'
import type { Cenario } from '../apoio.ts'
import type { Contexto, Tarefa } from '../../.mentor/scripts/tipos.ts'

/**
 * Prova o ecossistema v0.4.0:
 * - Disciplina de escopo em task nova (RF/RN/RNF exigem --requisitos ou --sem-requisito)
 * - Dispensa de vermelho com prova por mutacao e rastreabilidade integra no dossie
 * - Identificacao de maior ID de tarefa atraves de todas as refs do Git
 * - Doctor alertando sobre tarefas concluidas em branches irmas
 * - Resolucao semantica de arquivos gerados (mentor resolver-gerados)
 * - Hooks de pre-push protegendo main contra push direto e exigindo ID de tarefa em codigo
 */
export function rodar(): Cenario {
  const c = abrirCenarioTemporario('21-concorrencia-git-e-dispensas')
  const sh = (...args: string[]) =>
    spawnSync(args[0]!, args.slice(1), { cwd: c.pasta, encoding: 'utf8' })
  const commit = (msg: string) => {
    sh('git', 'add', '-A')
    sh('git', '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', msg)
  }

  sh('git', 'init', '-q')
  sh('git', 'branch', '-M', 'main')
  escrever(c, 'README.md', '# Projeto Teste\n')
  commit('inicio')
  mentor(c, 'init')

  // 1. Disciplina de Escopo
  const semReq = mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Sem req', '--esforco', 'P/P', '--origem', 'chat')
  dizQue(c, semReq, 'exige --requisitos <ID> ou --sem-requisito --motivo', 'task nova recusa RF sem requisito e sem motivo')

  const comDispensa = mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Feature com dispensa',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente', '--sem-requisito', '--motivo', 'dispensa justificada')
  dizQue(c, comDispensa, 'na reserva', 'task nova com --sem-requisito e motivo aceita criacao')

  // 2. Dispensa de Vermelho com Prova por Mutacao
  const ctx = lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
  ctx.gates.testes = { comando: 'node -e "console.log(\'1 passed\')"', obrigatorio: true }
  ctx.qualidade.metodo_de_teste = 'tdd'
  ctx.auditoria.cadencia_em_tarefas = 1
  escrever(c, 'docs-mentor/contexto.json', JSON.stringify(ctx, null, 2))
  commit('configura gates')

  mentor(c, 'task', 'puxar', 'TASK-RF-001')
  mentor(c, 'task', 'iniciar', 'TASK-RF-001')

  const gateLintDisp = mentor(c, 'task', 'gate', 'TASK-RF-001', 'lint', '--vermelho-dispensado')
  dizQue(c, gateLintDisp, 'so e valida para o gate "testes"', 'dispensa recusada em gate que nao e testes')

  const gateSemMotivo = mentor(c, 'task', 'gate', 'TASK-RF-001', 'testes', '--vermelho-dispensado')
  dizQue(c, gateSemMotivo, 'exige --motivo com a evidencia de teste por mutacao', 'dispensa exige motivo com mutacao')

  const gateComDispensa = mentor(c, 'task', 'gate', 'TASK-RF-001', 'testes',
    '--vermelho-dispensado', '--motivo', 'mutacao manual em src/index.ts fez o teste falhar')
  dizQue(c, gateComDispensa, 'APROVADO', 'gate aprovado com dispensa registrada')

  const t1 = lerJson<Tarefa>(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.json')
  t1.plano = {
    muda: ['src/index.ts - funcao principal'],
    criterios_aceite: [{ texto: 'criterio 1', teste: 'index.test.ts > funciona' }],
    impacto: 'baixo', riscos: [], dependencias_novas: [], proporcionalidade: 'adequada',
  }
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.json', JSON.stringify(t1, null, 2))
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.md',
    '# TASK-RF-001\n\n## Decisoes tomadas\nDecisao A.\n\n## O que nao foi feito, e por que\nNada.\n\n## Aprendizados\nNada.\n\n## Desfecho\nGates verdes; nada fora do previsto.\n')

  const fin = mentor(c, 'task', 'finalizar', 'TASK-RF-001')
  dizQue(c, fin, 'concluida', 'tarefa finaliza com vermelho dispensado em TDD')
  commit('TASK-RF-001 concluida')

  mentor(c, 'auditar', 'preparar', '--lote-legado')
  const dossie = ler(c, 'docs-mentor/auditorias/AUD-001-dossie.md')
  confere(c, dossie.includes('mutacao manual em src/index.ts fez o teste falhar'),
    'dossie exibe o motivo da dispensa na tabela de gates')
  confere(c, dossie.includes('dispensado ('),
    'dossie indica data da dispensa na coluna de vermelho')
  confere(c, dossie.includes('o gate "testes" teve o vermelho dispensado: "mutacao manual em src/index.ts fez o teste falhar". Auditor: verificar se ha prova por mutacao'),
    'fatos mecanicos registra alerta para o auditor verificar a prova por mutacao')

  // 4. Git Concorrencia: ID em branch irma e Doctor detectando tarefa esquecida
  sh('git', 'checkout', '-b', 'branch-irma')
  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Feature na branch irma',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente', '--sem-requisito', '--motivo', 'branch irma')
  mentor(c, 'task', 'puxar', 'TASK-RF-002')
  mentor(c, 'task', 'iniciar', 'TASK-RF-002')
  mentor(c, 'task', 'gate', 'TASK-RF-002', 'testes', '--vermelho-dispensado', '--motivo', 'mutacao comprovada')

  const t2 = lerJson<Tarefa>(c, 'docs-mentor/tarefas/abertas/TASK-RF-002.json')
  t2.plano = {
    muda: ['src/irma.ts'], criterios_aceite: [{ texto: 'ok', teste: 'irma.test.ts' }],
    impacto: 'baixo', riscos: [], dependencias_novas: [], proporcionalidade: 'adequada',
  }
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-002.json', JSON.stringify(t2, null, 2))
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-002.md',
    '# TASK-RF-002\n\n## Decisoes tomadas\nOk.\n\n## O que nao foi feito, e por que\nNada.\n\n## Aprendizados\nNada.\n\n## Desfecho\nGates verdes; nada fora do previsto.\n')
  mentor(c, 'task', 'finalizar', 'TASK-RF-002')
  commit('TASK-RF-002 concluida na branch irma')

  sh('git', 'checkout', 'main')
  const saidaDoctor = mentor(c, 'doctor')
  dizQue(c, saidaDoctor, 'TASK-RF-002', 'doctor detecta tarefa concluida em branch irma')

  // Alocacao de ID na main enxerga TASK-RF-002 do Git e aloca TASK-RF-003
  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Feature seguinte na main',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente', '--sem-requisito', '--motivo', 'main')
  confere(c, ler(c, 'docs-mentor/tarefas/reserva.md').includes('TASK-RF-003'),
    'alocacao de ID consulta historico Git de todas as branches e gera TASK-RF-003')

  // 5. Pre-push hook: bloqueio de push direto na main com revisao_antes_do_merge
  const ctxComRevisao = lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
  ctxComRevisao.versionamento.revisao_antes_do_merge = 'Pull Request obrigatorio antes de integrar na main'
  escrever(c, 'docs-mentor/contexto.json', JSON.stringify(ctxComRevisao, null, 2))
  commit('declara PR obrigatorio')

  const rPushMain = mentor(c, 'hooks', '--pre-push')
  confere(c, rPushMain.codigo === 1, 'pre-push bloqueia push direto na main quando PR e obrigatorio')
  dizQue(c, rPushMain, 'push direto no ramo principal', 'mensagem instrui criar branch e PR')

  // Pre-push hook: commit tocando codigo sem ID de tarefa
  sh('git', 'checkout', '-b', 'feature-codigo')
  escrever(c, 'src/recurso.ts', 'export const valor = 100\n')
  commit('adiciona recurso sem tarefa')
  const rPushSemId = mentor(c, 'hooks', '--pre-push')
  confere(c, rPushSemId.codigo === 1, 'pre-push barra commit em codigo sem ID de tarefa')
  dizQue(c, rPushSemId, 'sem ID de tarefa', 'mensagem orienta uso de <tipo>(<ID>): <descricao>')

  // Commit em documentacao/configuracao sem tarefa nao e barrado
  sh('git', 'reset', '--hard', 'HEAD~1')
  escrever(c, 'docs/manual.md', '# Manual\n')
  commit('docs: atualiza manual')
  const rPushDocs = mentor(c, 'hooks', '--pre-push')
  confere(c, rPushDocs.codigo === 0, 'commit apenas em documentacao sem ID de tarefa e aceito')

  // 6. mentor resolver-gerados: fusao semantica de contexto e regeneracao de vistas
  const contextoConflitado = `
{
  "_meta": {
    "versao_do_pacote": "0.4.0",
    "atualizado_em": "2026-08-29T14:00:00"
  },
<<<<<<< HEAD
  "portao_v": { "respondido": true, "resposta": "sim" },
  "portao_c": { "respondido": true, "resposta": "sim" }
=======
  "portao_v": { "respondido": false },
  "portao_0": { "respondido": true, "resposta": "sim" }
>>>>>>> branch-conflito
}
`
  escrever(c, 'docs-mentor/contexto.json', contextoConflitado)
  const rResolver = mentor(c, 'resolver-gerados')
  dizQue(c, rResolver, 'Resolucao de gerados finalizada com sucesso', 'resolver-gerados executa')

  const ctxResolvido = lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
  confere(c, ctxResolvido['portao_v']?.respondido === true, 'fusao semantica prioriza resposta humana em conflito')
  confere(c, ctxResolvido['portao_0']?.respondido === true, 'fusao semantica une chaves presentes em ambas as versoes')

  fecharTemporario(c)
  return c
}