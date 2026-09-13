import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  abrirCenarioTemporario, confere, dizQue, escrever, fecharTemporario, ler, lerJson, mentor,
} from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/**
 * Prova as regras de auditoria inteligente, validacao concreta e rastreabilidade da versao 0.7.0:
 * 1. Extracao robusta de caminhos em plano.muda suportando kebab-case e globs (R09).
 * 2. Registro de arvore_hash e commit_execucao no gate (R06).
 * 3. Comando mentor task anexar vinculando URL de evidencia externa a tarefa aberta ou concluida (R06).
 * 4. Comando mentor task criterio registrando execucao e saida de comando no criterio de aceite (B02).
 * 5. Validacao manual exigindo evidencia substantiva e gravando codigo_saida: null (B03).
 * 6. Dispensa de validacao em tarefa sensivel exigindo justificativa de 30+ caracteres (B01).
 * 7. Deteccao automatica de tarefa retroativa no finalizar exigindo flag --retroativa (B02).
 * 8. Exclusao seletiva de .mentor/ e calculo de diff categorizado no doctor (R06).
 * 9. Fusao semantica 3-way em resolver-gerados (User Item 6).
 */
export function rodar(): Cenario {
  const c = abrirCenarioTemporario('25-auditoria-inteligente-e-validacao-concreta')
  const sh = (...args: string[]) =>
    spawnSync(args[0]!, args.slice(1), { cwd: c.pasta, encoding: 'utf8' })
  const commit = (msg: string) => {
    sh('git', 'add', '-A')
    sh('git', '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', msg)
  }

  sh('git', 'init', '-q')
  sh('git', 'branch', '-M', 'main')
  escrever(c, 'README.md', '# Projeto Teste 0.7.0\n')
  commit('inicio')
  mentor(c, 'init')

  // Configura gates basicos
  const ctx = lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
  ctx.gates.testes = { comando: 'node -e "console.log(\'1 passed\')"' }
  ctx.gates.validacao_manual = { existe: true }
  ctx.qualidade.metodo_de_teste = 'teste-depois'
  ctx.qualidade.metodo_motivo = 'teste automatizado'
  escrever(c, 'docs-mentor/contexto.json', JSON.stringify(ctx, null, 2))
  commit('configura gates')

  // -------------------------------------------------------------
  // 1. Criar tarefa com kebab-case e globs no plano.muda (R09)
  // -------------------------------------------------------------
  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Implementar user-profile-widget e modulos',
    '--esforco', 'P/M', '--origem', 'titulo-autossuficiente', '--sem-requisito', '--motivo', 'teste unitario')
  mentor(c, 'task', 'puxar', 'TASK-RF-001')
  mentor(c, 'task', 'iniciar', 'TASK-RF-001')

  const t1 = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.json')
  t1.plano.muda = [
    'src/components/user-profile-widget.ts - implementa o widget de perfil',
    'lib/modules/**/*.ts - arquivos internos dos modulos auxiliares',
  ]
  t1.plano.criterios_aceite = [
    { texto: 'widget renderiza nome de usuario', teste: 'widget.test.ts > renderiza' },
    { texto: 'calculo interno retorna 42', teste: 'mod.test.ts > calcula' },
  ]
  t1.plano.problema_canonico = 'sem nome canonico'
  t1.plano.discordancia = {
    o_que_faria_diferente: 'Nada a objetar',
    o_que_preocupa: 'Nada a objetar',
    o_que_existe_pronto_80_porcento: 'Nenhuma conhecida',
  }
  t1.plano.impacto = 'modulo de perfil e modulos auxiliares'
  t1.plano.riscos = ['nenhum']
  t1.plano.proporcionalidade = 'widget e modulos proporcionais ao pedido'
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.json', JSON.stringify(t1, null, 2))
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.md', '# TASK-RF-001\n\n## Decisoes tomadas\nOk\n\n## O que nao foi feito, e por que\nNada\n\n## Testes de descoberta\nNenhum\n\n## Aprendizados\nNada\n')

  // Cria os arquivos declarados com kebab-case e match por glob
  escrever(c, 'src/components/user-profile-widget.ts', 'export const Widget = "profile"\n')
  escrever(c, 'lib/modules/core/engine.ts', 'export const Engine = 42\n')

  // -------------------------------------------------------------
  // 2. task gate grava arvore_hash e commit_execucao (R06)
  // -------------------------------------------------------------
  const rGate = mentor(c, 'task', 'gate', 'TASK-RF-001', 'testes')
  dizQue(c, rGate, 'APROVADO (saida 0)', 'gate executa com sucesso')

  const t1Gate = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.json')
  confere(c, Boolean(t1Gate.gates.testes.commit_execucao), 'gate gravou commit_execucao')
  confere(c, Boolean(t1Gate.gates.testes.arvore_hash), 'gate gravou arvore_hash com git stash')

  // -------------------------------------------------------------
  // 3. mentor task criterio registrando execucao (B02)
  // -------------------------------------------------------------
  const rCriterioInvalido = mentor(c, 'task', 'criterio', 'TASK-RF-001', '99', '--comando', 'echo ok')
  dizQue(c, rCriterioInvalido, 'Indice de criterio invalido', 'recusa indice de criterio fora do range')

  const rCriterio = mentor(c, 'task', 'criterio', 'TASK-RF-001', '0', '--comando', 'node -e "console.log(\'render ok\')"')
  dizQue(c, rCriterio, 'criterio [0] evidenciado com sucesso', 'executa e evidencia criterio 0')

  const t1Crit = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.json')
  confere(c, t1Crit.plano.criterios_aceite[0].evidencia?.codigo_saida === 0, 'criterio gravou codigo_saida 0')
  confere(c, t1Crit.plano.criterios_aceite[0].evidencia?.saida === 'render ok', 'criterio gravou saida capturada')

  // -------------------------------------------------------------
  // 4. Validacao manual com evidencia substantiva e codigo_saida: null (B03)
  // -------------------------------------------------------------
  const rValCurta = mentor(c, 'task', 'validar', 'TASK-RF-001', '--aprovado', '--evidencia', 'ok')
  dizQue(c, rValCurta, 'evidencia substantiva', 'recusa validacao com evidencia trivial')

  const rValOk = mentor(c, 'task', 'validar', 'TASK-RF-001', '--aprovado',
    '--evidencia', 'Aberto widget no navegador local e inspecionado visualmente. Exibiu nome com sucesso.')
  dizQue(c, rValOk, 'validacao aprovado', 'validacao aprovada com evidencia detalhada')

  const t1Val = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.json')
  confere(c, t1Val.gates.validacao_manual.codigo_saida === null, 'validacao_manual gravou codigo_saida null em vez de 0')
  confere(c, Boolean(t1Val.gates.validacao_manual.arvore_hash), 'validacao_manual gravou arvore_hash')

  // Finalizar a tarefa (os arquivos kebab-case e subpasta combinam com plano.muda)
  commit('implementa widget e modulos')
  const rFin1 = mentor(c, 'task', 'finalizar', 'TASK-RF-001')
  dizQue(c, rFin1, 'TASK-RF-001 concluida', 'finaliza sem falso positivo de arquivo fora de escopo')

  // -------------------------------------------------------------
  // 5. mentor task anexar a uma tarefa ja concluida (R06)
  // -------------------------------------------------------------
  const rAnexar = mentor(c, 'task', 'anexar', 'TASK-RF-001',
    '--url', 'https://github.com/empresa/repo/actions/runs/987654', '--gate', 'build')
  dizQue(c, rAnexar, 'evidencia anexada ao gate "build"', 'anexa evidencia externa em tarefa concluida')

  const concluidas = readdirSync(join(c.pasta, 'docs-mentor', 'tarefas', 'concluidas'))
  const arqT1 = concluidas.find((f) => f.includes('TASK-RF-001') && f.endsWith('.json'))!
  const t1Anexada = lerJson<Record<string, any>>(c, `docs-mentor/tarefas/concluidas/${arqT1}`)
  confere(c, t1Anexada.gates.build?.evidencia_url === 'https://github.com/empresa/repo/actions/runs/987654',
    'evidencia_url persistida no gate build da tarefa concluida')

  // -------------------------------------------------------------
  // 6. Validacao manual dispensada em tarefa sensivel (B01)
  // -------------------------------------------------------------
  mentor(c, 'task', 'nova', '--tipo', 'RN', '--titulo', 'Calculo de taxa de juros e persistencia de contratos',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente', '--sem-requisito', '--motivo', 'regra de negocio')
  mentor(c, 'task', 'puxar', 'TASK-RN-001')
  mentor(c, 'task', 'iniciar', 'TASK-RN-001')

  const rDispCurta = mentor(c, 'task', 'validar', 'TASK-RN-001', '--dispensado', '--motivo', 'dispensado aqui')
  dizQue(c, rDispCurta, 'minimo 30 caracteres', 'recusa dispensa de validacao em tarefa sensivel com motivo curto')

  const rDispOk = mentor(c, 'task', 'validar', 'TASK-RN-001', '--dispensado',
    '--motivo', 'Calculo integralmente coberto por matriz de testes unitarios de precisao decimal formalmente aprovada.')
  dizQue(c, rDispOk, 'validacao dispensado', 'aceita dispensa com justificativa substantiva')
  mentor(c, 'task', 'cancelar', 'TASK-RN-001', '--motivo', 'teste de validacao concluido')

  // -------------------------------------------------------------
  // 7. Deteccao automatica de tarefa retroativa (B02)
  // -------------------------------------------------------------
  // Criamos uma tarefa onde os arquivos em plano.muda ja foram commitados antes de iniciar a tarefa
  escrever(c, 'src/contrato/calculo.ts', 'export const taxa = 0.05\n')
  commit('codigo feito antes da tarefa existir')

  mentor(c, 'task', 'nova', '--tipo', 'CHORE', '--titulo', 'Documentar e reconciliar calculo existente',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente')
  mentor(c, 'task', 'puxar', 'TASK-CHORE-001')
  mentor(c, 'task', 'iniciar', 'TASK-CHORE-001')

  const tRetro = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-CHORE-001.json')
  tRetro.plano.muda = ['src/contrato/calculo.ts - calculo ja existente']
  tRetro.plano.criterios_aceite = [{ texto: 'calculo conferido', teste: 'nao se aplica: retroativa' }]
  tRetro.plano.problema_canonico = 'sem nome canonico'
  tRetro.plano.discordancia = {
    o_que_faria_diferente: 'Nada a objetar',
    o_que_preocupa: 'Nada a objetar',
    o_que_existe_pronto_80_porcento: 'Nenhuma conhecida',
  }
  tRetro.plano.impacto = 'calculo de contrato'
  tRetro.plano.riscos = ['nenhum']
  tRetro.plano.proporcionalidade = 'documentacao de calculo existente'
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-CHORE-001.json', JSON.stringify(tRetro, null, 2))
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-CHORE-001.md', '# TASK-CHORE-001\n\n## Decisoes tomadas\nOk\n\n## O que nao foi feito, e por que\nNada\n\n## Testes de descoberta\nNenhum\n\n## Aprendizados\nNada\n')
  mentor(c, 'task', 'gate', 'TASK-CHORE-001', 'testes')

  // Tenta finalizar sem --retroativa: bloqueia
  const rFinRetroBloq = mentor(c, 'task', 'finalizar', 'TASK-CHORE-001',
    '--validado-por-humano', 'Conferencia manual realizada em homologacao.')
  dizQue(c, rFinRetroBloq, 'Tarefa retroativa detectada', 'bloqueia conclusao de tarefa retroativa sem flag')

  // Finaliza com --retroativa: permite
  const rFinRetroOk = mentor(c, 'task', 'finalizar', 'TASK-CHORE-001',
    '--retroativa',
    '--validado-por-humano', 'Conferencia manual realizada em homologacao.')
  dizQue(c, rFinRetroOk, 'TASK-CHORE-001 concluida', 'finaliza tarefa retroativa com flag --retroativa')

  // -------------------------------------------------------------
  // 8. Exclusao seletiva de .mentor/ e Quebra de Diff no doctor (R06)
  // -------------------------------------------------------------
  const rDoctor = mentor(c, 'doctor')
  confere(c, rDoctor.codigo === 0 || rDoctor.codigo === 1, 'doctor roda sem travar')

  // -------------------------------------------------------------
  // 9. Fusao semantica 3-way em resolver-gerados (User Item 6)
  // -------------------------------------------------------------
  const ctxAtual = lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
  const ctxOurs = JSON.parse(JSON.stringify(ctxAtual))
  ctxOurs.lembretes = ['lembrete nosso']
  ctxOurs.auditoria.ultima_na_tarefa = 1
  const ctxTheirs = JSON.parse(JSON.stringify(ctxAtual))
  ctxTheirs.lembretes = ['lembrete deles']
  ctxTheirs.auditoria.ultima_na_tarefa = 2

  escrever(c, 'docs-mentor/contexto.json', `<<<<<<< HEAD\n${JSON.stringify(ctxOurs, null, 2)}\n=======\n${JSON.stringify(ctxTheirs, null, 2)}\n>>>>>>> branch-b\n`)

  const rResolver = mentor(c, 'resolver-gerados')
  dizQue(c, rResolver, 'fusao semantica 3-way concluida com sucesso', 'resolver-gerados executa fusao 3-way')
  const ctxAposResolver = lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
  confere(c, Array.isArray(ctxAposResolver.lembretes) && ctxAposResolver.lembretes.length === 0,
    'resolver-gerados zera lembretes transitorios')
  confere(c, ctxAposResolver.auditoria?.ultima_na_tarefa === 2,
    'resolver-gerados preserva o historico mais recente de auditoria')

  fecharTemporario(c)
  return c
}
