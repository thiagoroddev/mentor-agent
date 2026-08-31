import { abrirCenario, confere, dizQue, escrever, ler, lerJson, mentor } from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/** Relatorio de campo: a medicao que volta ao pacote sem virar tarefa em lugar nenhum. */
export function rodar(): Cenario {
  const c = abrirCenario('09-campo')
  mentor(c, 'init')
  const ctx = lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
  ctx['projeto'].nome = 'hospedeiro'
  ctx['gates'].testes.comando = 'echo "5 passed"'
  escrever(c, 'docs-mentor/contexto.json', JSON.stringify(ctx, null, 2))

  // Antes de existir qualquer tarefa: amostra vazia nao e estatistica. Dizer "0%, o pacote esta
  // consumindo o projeto" a quem nao fechou a primeira tarefa e afirmar sobre nada.
  mentor(c, 'relatorio-de-campo')
  confere(c, ler(c, 'docs-mentor/relatorio-de-campo.md').includes('Funcionalidade (RF+RN+RNF): sem dados'),
    'sem tarefa concluida a proporcao e "sem dados", nunca 0%')
  confere(c, mentor(c, 'verificar').codigo === 0,
    'o arquivo de atrito nasce valido: seus marcadores orientam o relatorio, nao bloqueiam o projeto')

  // Duas recusas de propósito: e' delas que sai a medicao mais util do relatorio.
  mentor(c, 'task', 'nova', '--tipo', 'BG', '--titulo', 'Origem inventada',
    '--esforco', 'P/P', '--origem', 'RF-99')
  mentor(c, 'task', 'puxar', 'TASK-BG-001')
  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Epico grande',
    '--esforco', 'XG/XG', '--origem', 'titulo-autossuficiente')
  mentor(c, 'task', 'puxar', 'TASK-RF-001')

  const recusas = lerJson<Array<Record<string, any>>>(c, 'docs-mentor/tarefas/recusas.json')
  confere(c, recusas.length === 2, 'toda recusa fica gravada quando acontece')

  // Uma tarefa que fecha, para o relatorio ter o lado bom tambem.
  mentor(c, 'task', 'nova', '--tipo', 'CHORE', '--titulo', 'Trabalho que fecha',
    '--esforco', 'P/P', '--origem', 'titulo-autossuficiente')
  mentor(c, 'task', 'puxar', 'TASK-CHORE-001')
  mentor(c, 'task', 'iniciar', 'TASK-CHORE-001')
  const t = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-CHORE-001.json')
  t['plano'] = {
    muda: ['a.ts'], criterios_aceite: [{ texto: 'faz o pedido', teste: 'nao se aplica: manutencao' }],
    impacto: 'nenhum', riscos: [], dependencias_novas: [], proporcionalidade: 'do tamanho do pedido',
  }
  t['achados'] = [{ classe: 3, descricao: 'consulta sem indice', destino: 'divida_tecnica', ref: 'DT-1' }]
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-CHORE-001.json', JSON.stringify(t, null, 2))
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-CHORE-001.md',
    '# t\n\n## Decisoes tomadas\na\n\n## O que nao foi feito, e por que\nb\n\n## Testes de descoberta\nNenhuma.\n\n## Aprendizados\nNada.\n')
  ctx['qualidade'].metodo_de_teste = 'teste-depois'
  ctx['qualidade'].metodo_motivo = 'projeto de teste'
  escrever(c, 'docs-mentor/contexto.json', JSON.stringify(ctx, null, 2))
  mentor(c, 'task', 'gate', 'TASK-CHORE-001', 'testes')
  mentor(c, 'task', 'finalizar', 'TASK-CHORE-001')

  const saida = mentor(c, 'relatorio-de-campo')
  dizQue(c, saida, 'nao cria tarefa em lugar nenhum', 'o comando declara que nao cria tarefa')

  const r = ler(c, 'docs-mentor/relatorio-de-campo.md')
  confere(c, r.includes('mentor-agent 0.2.2'), 'o relatorio atribui tudo a uma versao do pacote')
  // A versao saia de `join(raizPacote(), 'package.json')`, que instalado num projeto resolve para o
  // package.json DO PROJETO: o relatorio publicava a versao do app. Ancorar achado numa versao e a
  // unica coisa que este relatorio existe para fazer.
  escrever(c, 'package.json', JSON.stringify({ name: 'app-do-usuario', version: '7.7.7' }, null, 2))
  const outro = mentor(c, 'relatorio-de-campo').saida + ler(c, 'docs-mentor/relatorio-de-campo.md')
  confere(c, !outro.includes('7.7.7'),
    'a versao vem do manifesto do pacote, nunca do package.json do projeto')
  confere(c, outro.includes('adocao'),
    'a parte B aceita ancora `adocao`: todo o atrito da adocao acontece antes da primeira tarefa')

  // A parte B e ESCRITA, e escrita nao sobrevive num arquivo que o gerador refaz inteiro. Antes ela
  // morava dentro do relatorio e voltava aos marcadores a cada execucao, que e justamente o que se
  // faz para atualizar A e C antes de levar o relatorio ao pacote.
  const escrito = ler(c, 'docs-mentor/atrito-de-campo.md').replace(
    '- PREENCHER: <regra> · <ancora> · <data> · o que aconteceu · o que teria funcionado',
    '- gate de lint · adocao · 30/08/26 · reprovou por estilo do pacote')
  escrever(c, 'docs-mentor/atrito-de-campo.md', escrito)
  mentor(c, 'relatorio-de-campo')
  mentor(c, 'relatorio-de-campo')
  confere(c, ler(c, 'docs-mentor/atrito-de-campo.md').includes('gate de lint · adocao'),
    'duas regeneracoes depois, o que foi escrito a mao continua la')
  confere(c, ler(c, 'docs-mentor/relatorio-de-campo.md').includes('gate de lint · adocao'),
    'e o relatorio traz o texto escrito, para o arquivo viajar sozinho ate o pacote')

  confere(c, r.includes('origem que nao resolve'), 'as recusas aparecem agrupadas por impedimento')
  confere(c, r.includes('XG sem fatiar'), 'impedimentos parecidos sao agrupados, nao listados como frases')
  confere(c, r.includes('Funcionalidade (RF+RN+RNF)'), 'a proporcao de funcionalidade e medida')
  confere(c, r.includes('| APROVADO | 1 |'), 'os rotulos de gate sao contados')
  confere(c, r.includes('| divida_tecnica | 1 |'), 'os achados sao contados por destino')
  confere(c, r.includes('## C · O que funcionou'), 'a parte C existe: sem ela o relatorio vira lista de defeitos')
  confere(c, r.includes('PREENCHER:'), 'a parte B nasce com marcador, para ser escrita')
  confere(c, !r.includes('Trabalho que fecha'), 'so metadado de processo: nenhum titulo de tarefa vaza para o relatorio')
  return c
}
