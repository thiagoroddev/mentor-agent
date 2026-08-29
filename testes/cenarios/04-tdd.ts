import { abrirCenario, confere, dizQue, escrever, lerJson, mentor } from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/** O metodo declarado muda o que o fechamento exige. E o spike e' a unica saida declarada. */
export function rodar(): Cenario {
  const c = abrirCenario('04-tdd')
  mentor(c, 'init')
  const ctx = lerJson<Record<string, any>>(c, 'docs/contexto.json')
  confere(c, ctx['qualidade'].metodo_de_teste === 'tdd', 'o metodo padrao e tdd')
  ctx['gates']['testes'].comando = 'echo "3 passed"'
  escrever(c, 'docs/contexto.json', JSON.stringify(ctx, null, 2))

  const preparar = (id: string, teste: string) => {
    const t = lerJson<Record<string, any>>(c, `docs/tarefas/abertas/${id}.json`)
    t['plano'] = {
      muda: ['a.ts'], criterios_aceite: [{ texto: 'faz o que foi pedido', teste }],
      impacto: 'modulo a', riscos: [], dependencias_novas: [], proporcionalidade: 'do tamanho do pedido',
    }
    escrever(c, `docs/tarefas/abertas/${id}.json`, JSON.stringify(t, null, 2))
    escrever(c, `docs/tarefas/abertas/${id}.md`,
      '# t\n\n## Decisoes tomadas\na\n\n## O que nao foi feito, e por que\nb\n\n' +
      '## Testes de descoberta\nNenhuma.\n\n## Aprendizados\nNada.\n')
  }

  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Somar as parcelas',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente')
  mentor(c, 'task', 'puxar', 'TASK-RF-001')
  mentor(c, 'task', 'iniciar', 'TASK-RF-001')
  preparar('TASK-RF-001', 'soma.test.ts > soma duas parcelas')
  mentor(c, 'task', 'gate', 'TASK-RF-001', 'testes')
  dizQue(c, mentor(c, 'task', 'finalizar', 'TASK-RF-001'),
    'visto vermelho antes do verde', 'com tdd, gate sem vermelho registrado nao fecha')

  // Trocar o metodo dispensa o vermelho, mas nao dispensa o criterio nomear um teste.
  ctx['qualidade'].metodo_de_teste = 'teste-depois'
  ctx['qualidade'].metodo_motivo = 'projeto legado sem suite; os testes nascem cobrindo o que ja existe'
  escrever(c, 'docs/contexto.json', JSON.stringify(ctx, null, 2))
  dizQue(c, mentor(c, 'task', 'finalizar', 'TASK-RF-001'), 'concluida', 'com teste-depois, fecha sem vermelho')

  // Spike: exploracao declarada, sem criterio com teste, com narrativa propria.
  mentor(c, 'task', 'nova', '--tipo', 'SPIKE', '--titulo', 'A biblioteca de PDF roda no navegador?',
    '--esforco', 'P/M', '--origem', 'titulo-autossuficiente')
  mentor(c, 'task', 'puxar', 'TASK-SPIKE-001')
  mentor(c, 'task', 'iniciar', 'TASK-SPIKE-001')
  const narrativa = lerJson<Record<string, any>>(c, 'docs/tarefas/abertas/TASK-SPIKE-001.json')
  confere(c, narrativa['plano'].criterios_aceite[0].teste === 'nao se aplica: spike',
    'o spike nasce dispensado do vinculo criterio->teste')
  return c
}
