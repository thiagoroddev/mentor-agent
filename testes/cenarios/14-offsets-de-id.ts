import { abrirCenario, confere, escrever, lerJson, mentor } from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/**
 * Prova a geração de IDs de tarefa com offsets declarados e referências históricas (Passo 8).
 * Impede que tarefas novas colidam em nome com tarefas históricas concluídas em agentes anteriores.
 */
export function rodar(): Cenario {
  const c = abrirCenario('14-offsets-de-id')
  mentor(c, 'init')

  // 1. Sem offset: o primeiro ID é 001
  mentor(c, 'task', 'nova', '--tipo', 'BG', '--titulo', 'Bug inicial',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente')
  const bg1 = lerJson<any>(c, 'docs-mentor/tarefas/abertas/TASK-BG-001.json')
  confere(c, bg1.id === 'TASK-BG-001', 'sem offset gera TASK-BG-001')

  // 2. Com offset declarado em contexto.json (ex: BG=10, RF=20)
  const ctx = lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
  ctx['offsets_de_id'] = { BG: 10, RF: 20 }
  escrever(c, 'docs-mentor/contexto.json', JSON.stringify(ctx, null, 2))

  mentor(c, 'task', 'nova', '--tipo', 'BG', '--titulo', 'Bug apos offset historico',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente')
  const bg11 = lerJson<any>(c, 'docs-mentor/tarefas/abertas/TASK-BG-011.json')
  confere(c, bg11.id === 'TASK-BG-011', 'com offset BG=10 gera TASK-BG-011')

  mentor(c, 'task', 'nova', '--tipo', 'BG', '--titulo', 'Bug seguinte',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente')
  const bg12 = lerJson<any>(c, 'docs-mentor/tarefas/abertas/TASK-BG-012.json')
  confere(c, bg12.id === 'TASK-BG-012', 'incrementa a partir do maior para TASK-BG-012')

  // 3. Com referencia historica em referencias.json (ex: TASK-RF-042)
  escrever(c, 'arquivo-historico/tarefas/TASK-RF-042.json', JSON.stringify({ id: 'TASK-RF-042' }, null, 2))
  escrever(c, 'docs-mentor/referencias.json', JSON.stringify([
    {
      id: 'TASK-RF-042',
      onde: 'arquivo-historico/tarefas/TASK-RF-042.json',
      sistema: 'esquadro-agents',
      registrado_em: '30/08/26',
    },
  ], null, 2))

  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Feature apos ref historica',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente')
  const rf43 = lerJson<any>(c, 'docs-mentor/tarefas/abertas/TASK-RF-043.json')
  confere(c, rf43.id === 'TASK-RF-043', 'com TASK-RF-042 em referencias gera TASK-RF-043')

  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Feature seguinte',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente')
  const rf44 = lerJson<any>(c, 'docs-mentor/tarefas/abertas/TASK-RF-044.json')
  confere(c, rf44.id === 'TASK-RF-044', 'incrementa sequencialmente para TASK-RF-044')

  confere(c, mentor(c, 'verificar').codigo === 0, 'projeto com offsets e referencias passa no verificar')

  return c
}
