import { abrirCenario, confere, dizQue, escrever, ler, lerJson, mentor } from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/** O caminho feliz inteiro, de `init` a tarefa concluida com o requisito vinculado. */
export function rodar(): Cenario {
  const c = abrirCenario('01-ciclo-basico')

  mentor(c, 'init')
  escrever(c, 'docs/requisitos/requisitos.json', JSON.stringify([{
    id: 'RF-1', tipo: 'RF', enunciado: 'Exportar o relatorio em CSV',
    historia: 'Como analista, quero exportar em CSV, para abrir na planilha',
    prioridade: 'essencial', status: 'pendente', criterios_aceite: [], tarefas: [],
    adr: null, criado_em: '29/08/26 14:00', implementado_em: null, pendente_de_validacao: false,
  }], null, 2))
  const ctx = lerJson<Record<string, any>>(c, 'docs/contexto.json')
  ctx['gates']['testes'].comando = 'echo "42 passed, 0 failed"'
  ctx['estado'].fase = 'construcao'
  escrever(c, 'docs/contexto.json', JSON.stringify(ctx, null, 2))

  const criada = mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Exportar relatorio em CSV',
    '--esforco', 'P/M', '--valor', 'importante', '--origem', 'RF-1', '--requisitos', 'RF-1')
  dizQue(c, criada, 'na reserva', 'toda tarefa nasce na reserva')

  dizQue(c, mentor(c, 'task', 'puxar', 'TASK-RF-001'), 'no ciclo (1 de 12)', 'puxar leva ao ciclo')
  mentor(c, 'task', 'iniciar', 'TASK-RF-001')

  const t = lerJson<Record<string, any>>(c, 'docs/tarefas/abertas/TASK-RF-001.json')
  t['plano'] = {
    muda: ['src/relatorio/exportar.ts - serializa as linhas em CSV'],
    criterios_aceite: [{
      texto: 'o arquivo abre no editor de planilha com as colunas separadas',
      teste: 'exportar.test.ts > separa colunas com virgula dentro do campo',
    }],
    impacto: 'modulo de relatorio', riscos: ['virgula dentro do campo de texto'],
    dependencias_novas: [], proporcionalidade: 'pediram exportar, exporta. Nenhum artefato novo.',
  }
  escrever(c, 'docs/tarefas/abertas/TASK-RF-001.json', JSON.stringify(t, null, 2))
  escrever(c, 'docs/tarefas/abertas/TASK-RF-001.md',
    '# TASK-RF-001\n\n## Decisoes tomadas\nAspas duplas em todo campo de texto, sempre.\n\n' +
    '## O que nao foi feito, e por que\nNenhum outro formato: so pediram CSV.\n\n## Aprendizados\nNada.\n')

  // Metodo padrao e' tdd: o vermelho vem antes, e o comando recusa se sair verde.
  const vermelho = mentor(c, 'task', 'gate', 'TASK-RF-001', 'testes', '--esperando-vermelho')
  dizQue(c, vermelho, 'Esperava vermelho e saiu verde', 'teste que passa sem o codigo e recusado')

  ctx['gates']['testes'].comando = 'echo "1 failed" && exit 1'
  escrever(c, 'docs/contexto.json', JSON.stringify(ctx, null, 2))
  dizQue(c, mentor(c, 'task', 'gate', 'TASK-RF-001', 'testes', '--esperando-vermelho'),
    'vermelho registrado', 'o vermelho fica gravado')

  ctx['gates']['testes'].comando = 'echo "42 passed, 0 failed"'
  escrever(c, 'docs/contexto.json', JSON.stringify(ctx, null, 2))
  const gate = mentor(c, 'task', 'gate', 'TASK-RF-001', 'testes')
  dizQue(c, gate, 'APROVADO (saida 0)', 'o rotulo sai do codigo de saida do processo')

  dizQue(c, mentor(c, 'task', 'finalizar', 'TASK-RF-001'), 'concluida', 'fecha com plano e gate verdes')

  const req = lerJson<Array<Record<string, any>>>(c, 'docs/requisitos/requisitos.json')[0]
  confere(c, req?.['status'] === 'implementado', 'o fechamento marca o requisito como implementado')
  confere(c, req?.['tarefas']?.[0] === 'TASK-RF-001', 'o vinculo requisito -> tarefa e gravado pelo script')
  confere(c, ler(c, 'docs/requisitos/implementados.md').includes('RF-1'), 'a vista de implementados e gerada')
  confere(c, mentor(c, 'verificar').codigo === 0, 'o projeto passa no verificar')
  return c
}
