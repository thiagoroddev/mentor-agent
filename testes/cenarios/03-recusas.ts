import { abrirCenario, confere, dizQue, escrever, lerJson, mentor } from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/**
 * O que o pacote **recusa**. E' o cenario que mais importa: cada recusa aqui e' uma classe de erro
 * que a IA nao consegue mais cometer.
 */
export function rodar(): Cenario {
  const c = abrirCenario('03-recusas')
  mentor(c, 'init')
  const ctx = lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
  ctx['gates']['testes'].comando = 'echo "falhou de proposito" && exit 1'
  escrever(c, 'docs-mentor/contexto.json', JSON.stringify(ctx, null, 2))

  mentor(c, 'task', 'nova', '--tipo', 'CHORE', '--titulo', 'Primeira',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente')
  mentor(c, 'task', 'nova', '--tipo', 'CHORE', '--titulo', 'Segunda',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente')
  mentor(c, 'task', 'nova', '--tipo', 'BG', '--titulo', 'Origem que nao resolve',
    '--esforco', 'P/P', '--origem', 'RF-99, ADR-77')

  dizQue(c, mentor(c, 'task', 'puxar', 'TASK-BG-001'),
    'RF-99, ADR-77, que nao existe', 'origem que nao resolve nao entra no ciclo')

  dizQue(c, mentor(c, 'task', 'iniciar', 'TASK-CHORE-001'),
    'esta na reserva', 'nao se inicia tarefa que ainda esta na reserva')

  mentor(c, 'task', 'puxar', 'TASK-CHORE-001')
  mentor(c, 'task', 'puxar', 'TASK-CHORE-002')
  mentor(c, 'task', 'iniciar', 'TASK-CHORE-001')
  dizQue(c, mentor(c, 'task', 'iniciar', 'TASK-CHORE-002'),
    'limite 1', 'nao se abre a segunda tarefa com uma em execucao')

  dizQue(c, mentor(c, 'task', 'finalizar', 'TASK-CHORE-001'),
    'PREENCHER: nao preenchido', 'nao fecha com marcador do esqueleto por preencher')

  dizQue(c, mentor(c, 'task', 'gate', 'TASK-CHORE-001', 'testes', '--rotulo', 'APROVADO'),
    'so nasce de comando executado', 'APROVADO escrito a mao e recusado')

  dizQue(c, mentor(c, 'task', 'gate', 'TASK-CHORE-001', 'testes'), 'FALHOU', 'gate vermelho e' + ' registrado como FALHOU')

  const t = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-CHORE-001.json')
  t['plano'] = {
    muda: ['a.ts'], criterios_aceite: [{ texto: 'x', teste: '' }],
    impacto: 'y', riscos: [], dependencias_novas: [], proporcionalidade: 'z',
  }
  t['achados'] = [{ classe: 1, descricao: 'token no log', destino: 'divida_tecnica', ref: '' }]
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-CHORE-001.json', JSON.stringify(t, null, 2))
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-CHORE-001.md',
    '# t\n\n## Decisoes tomadas\na\n\n## O que nao foi feito, e por que\nb\n\n## Aprendizados\nNada.\n')

  const recusa = mentor(c, 'task', 'finalizar', 'TASK-CHORE-001')
  dizQue(c, recusa, 'achado[0] sem "ref"', 'nao fecha com achado sem destino resolvido')
  dizQue(c, recusa, 'esta FALHOU e nao sustenta conclusao', 'nao fecha com gate vermelho')
  dizQue(c, recusa, 'criterio[0] sem teste nomeado', 'nao fecha com criterio de aceite sem teste')

  dizQue(c, mentor(c, 'task', 'cancelar', 'TASK-CHORE-002'),
    'Falta --motivo', 'nao cancela sem motivo escrito')

  confere(c, mentor(c, 'verificar').codigo === 0, 'o projeto passa no verificar mesmo com tarefa aberta')
  return c
}
