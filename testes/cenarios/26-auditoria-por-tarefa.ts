import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  abrirCenarioTemporario, apagar, confere, dizQue, escrever, fecharTemporario, ler, lerJson, mentor,
} from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/**
 * A auditoria por tarefa da 0.8.0. Medido em campo: a cadencia por caracteres disparou com 3 tarefas,
 * e 87% dos 115 mil caracteres eram fixture gerada e registro do proprio mentor. Aqui:
 * 1. Fixture `linguist-generated` e registro nao contam nem entram no diff.
 * 2. Tarefa sem codigo e atualizacao do pacote nao contam, e entram no lote so' listadas.
 * 3. N tarefas com codigo disparam a cadencia no `finalizar` e no `doctor`.
 * 4. Cada tarefa leva o proprio diff: commit com o ID entra; commit sem ID e trabalho de outra tarefa
 *    aparecem como fato, sem conteudo; arquivo nunca commitado declarado pela tarefa entra inteiro.
 * 5. Lote acima do teto do dossie divide em dois `preparar`, sem truncar.
 * 6. `ultima_na_tarefa` e `proxima_em_tarefa` contam a partir da ultima auditoria.
 */
export function rodar(): Cenario {
  const c = abrirCenarioTemporario('26-auditoria-por-tarefa')
  const sh = (...args: string[]) => spawnSync(args[0]!, args.slice(1), { cwd: c.pasta, encoding: 'utf8' })
  const commit = (msg: string) => {
    sh('git', 'add', '-A')
    sh('git', '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', msg)
  }

  sh('git', 'init', '-q')
  sh('git', 'branch', '-M', 'main')
  escrever(c, 'README.md', '# Projeto 0.8.0\n')
  escrever(c, 'package.json', '{ "name": "app", "devDependencies": { "mentor-agent": "0.7.0" } }\n')
  commit('inicio')
  // Pacote instalado de verdade: a tarefa de atualizacao so' se reconhece com `.mentor/manifesto.json`.
  mentor(c, 'instalar', '--destino', c.pasta)
  mentor(c, 'init')
  escrever(c, '.gitattributes', `${ler(c, '.gitattributes')}fixtures/*.json linguist-generated=true\n`)

  const ctx = lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
  ctx.gates.testes = { comando: 'node -e "console.log(\'1 passed\')"' }
  ctx.qualidade.metodo_de_teste = 'teste-depois'
  ctx.qualidade.metodo_motivo = 'cenario do proprio pacote'
  ctx.auditoria.cadencia_em_tarefas = 2
  escrever(c, 'docs-mentor/contexto.json', JSON.stringify(ctx, null, 2))
  commit('instala o mentor')

  const fechar = (tipo: string, id: string, titulo: string, arquivos: Record<string, string>, muda: string[]) => {
    mentor(c, 'task', 'nova', '--tipo', tipo, '--titulo', titulo, '--esforco', 'P/P',
      '--origem', 'titulo-autossuficiente', '--sem-requisito', '--motivo', 'cenario')
    mentor(c, 'task', 'puxar', id)
    mentor(c, 'task', 'iniciar', id)
    for (const [caminho, conteudo] of Object.entries(arquivos)) escrever(c, caminho, conteudo)
    const t = lerJson<Record<string, any>>(c, `docs-mentor/tarefas/abertas/${id}.json`)
    t.plano = {
      muda: muda, criterios_aceite: [{ texto: 'faz o pedido', teste: 'a.test.ts > caso feliz' }],
      impacto: 'modulo do cenario', riscos: ['nenhum identificado'], dependencias_novas: [],
      proporcionalidade: 'do tamanho do pedido',
    }
    escrever(c, `docs-mentor/tarefas/abertas/${id}.json`, JSON.stringify(t, null, 2))
    escrever(c, `docs-mentor/tarefas/abertas/${id}.md`,
      '# t\n\n## Decisoes tomadas\na\n\n## O que nao foi feito, e por que\nb\n\n## Testes de descoberta\nNenhuma.\n\n## Aprendizados\nNada.\n')
    mentor(c, 'task', 'gate', id, 'testes')
    return mentor(c, 'task', 'finalizar', id)
  }

  // --- 1. codigo pequeno + fixture gerada grande: conta uma tarefa, e so' uma
  const fixture = JSON.stringify(Array.from({ length: 3000 }, (_, i) => ({ id: `DADO_GERADO_${i}`, valor: i })), null, 2)
  const f1 = fechar('RF', 'TASK-RF-001', 'Somar parcelas', {
    'src/a.ts': 'export const a = (x: number) => x + 1\n',
    'fixtures/dados.json': fixture,
  }, ['src/a.ts - soma', 'fixtures/dados.json - fixture gerada por script'])
  dizQue(c, f1, 'TASK-RF-001 concluida', 'fecha a tarefa com fixture gerada')
  confere(c, fixture.length > 80_000 && !f1.saida.includes('Cadencia de auditoria atingida'),
    'fixture de mais de 80 mil caracteres nao dispara nada: a cadencia conta tarefas')
  commit('feat(TASK-RF-001): somar parcelas')

  // --- 2a. tarefa so' de documentacao do mentor: nao conta
  const f2 = fechar('DOC', 'TASK-DOC-001', 'Anotar ideia', {
    'docs-mentor/rascunhos/ideia.md': '# Ideia\n\nUma ideia.\n',
  }, ['docs-mentor/rascunhos/ideia.md - a ideia'])
  dizQue(c, f2, 'TASK-DOC-001 concluida', 'fecha a tarefa de documentacao')
  confere(c, !f2.saida.includes('Cadencia de auditoria atingida'), 'tarefa sem diff auditavel nao conta para a cadencia')
  commit('docs(TASK-DOC-001): anotar ideia')

  // --- 2b. atualizacao do pacote: `.mentor/` intacto pelo manifesto novo, e so' o package.json fora dele
  const nucleo = `${ler(c, '.mentor/nucleo.md')}\nLINHA_DA_VERSAO_NOVA\n`
  const manifesto = lerJson<Record<string, any>>(c, '.mentor/manifesto.json')
  manifesto.arquivos['nucleo.md'] = createHash('sha256').update(nucleo).digest('hex').slice(0, 16)
  const f3 = fechar('CHORE', 'TASK-CHORE-001', 'Atualizar o mentor-agent', {
    '.mentor/nucleo.md': nucleo,
    '.mentor/manifesto.json': JSON.stringify(manifesto, null, 2) + '\n',
    'package.json': '{ "name": "app", "devDependencies": { "mentor-agent": "0.8.0" } }\n',
  }, ['package.json - sobe a versao do mentor-agent'])
  dizQue(c, f3, 'TASK-CHORE-001 concluida',
    'o finalizar nao exige declarar arquivo do pacote igual ao manifesto (a mesma regra do hook e da auditoria)')
  confere(c, !f3.saida.includes('Cadencia de auditoria atingida'), 'atualizacao do pacote nao conta para a cadencia')
  commit('chore(TASK-CHORE-001): atualizar o mentor-agent')

  // --- 4a. commit sem tarefa tocando codigo, antes da proxima tarefa comecar
  escrever(c, 'src/solto.ts', 'export const solto = true\n')
  commit('ajuste solto')
  escrever(c, 'src/a.ts', 'export const a = (x: number) => x + 1 // soma\n')
  commit('style(light): comentar a soma')

  // --- 3. a segunda tarefa com codigo bate a cadencia de 2. Fica sem commit: o diff vira aproximacao
  const f4 = fechar('RF', 'TASK-RF-002', 'Subtrair parcelas', {
    'src/b.ts': 'export const b = (x: number) => x - 1\n',
  }, ['src/b.ts - subtracao'])
  dizQue(c, f4, 'Cadencia de auditoria atingida: 2 tarefa(s) com codigo', 'o finalizar avisa ao bater a cadencia')
  escrever(c, 'src/outra.ts', 'export const SEGREDO_DE_OUTRA_TAREFA = 1\n')

  const doc = mentor(c, 'doctor')
  dizQue(c, doc, '2 tarefa(s) com codigo sem auditoria (cadencia 2; 2 sem diff auditavel nao conta(m))',
    'o doctor conta as tarefas com codigo e diz quantas nao contam')
  dizQue(c, doc, 'Maiores arquivos:', 'o doctor mostra de onde vem o tamanho')
  confere(c, !doc.saida.includes('fixtures/dados.json'), 'a fixture gerada nao aparece entre os maiores arquivos')

  // --- 4. o dossie
  dizQue(c, mentor(c, 'auditar', 'preparar'), '4 tarefa(s) no lote', 'as quatro concluidas entram no lote')
  const dossie = ler(c, 'docs-mentor/auditorias/AUD-001-dossie.md')
  confere(c, dossie.includes('+export const a') && dossie.includes('feat(TASK-RF-001): somar parcelas'),
    'o commit com o ID no titulo entra no diff da tarefa')
  confere(c, !dossie.includes('DADO_GERADO_0') && dossie.includes('gerado (.gitattributes)'),
    'a fixture linguist-generated aparece na tabela e fica fora do patch')
  confere(c, !dossie.includes('"tarefas_concluidas"') && dossie.includes('registro do mentor'),
    'registros e vistas geradas ficam fora do patch')
  confere(c, dossie.includes('+export const b') && dossie.includes('Aproximacao'),
    'tarefa sem commit leva os arquivos do plano, e o nunca commitado entra inteiro')
  confere(c, dossie.includes('Atualizacao do pacote') && !dossie.includes('LINHA_DA_VERSAO_NOVA'),
    'a atualizacao do pacote fica listada, fora da revisao de codigo')
  confere(c, dossie.includes('TASK-DOC-001: sem diff auditavel'), 'a tarefa so de documentacao aparece como sem diff auditavel')
  confere(c, dossie.includes('Commits sem ID de tarefa') && dossie.includes('ajuste solto') && dossie.includes('src/solto.ts'),
    'commit sem tarefa tocando codigo vira fato')
  const blocoLight = dossie.slice(dossie.indexOf('Commits marcados Light'), dossie.indexOf('Commits sem ID de tarefa'))
  confere(c, blocoLight.includes('style(light): comentar a soma') && blocoLight.includes('linha(s) em src/a.ts') && !blocoLight.includes('ajuste solto'),
    'commit Light fica num grupo proprio, com as linhas que tocou, para o auditor conferir se cabia na lista')
  confere(c, dossie.includes('`src/outra.ts`') && !dossie.includes('SEGREDO_DE_OUTRA_TAREFA'),
    'trabalho nao commitado de outra tarefa aparece pelo nome, sem conteudo')
  confere(c, !dossie.includes('export const solto'), 'o diff do commit sem tarefa nao entra')
  const aud1 = lerJson<Record<string, any>>(c, 'docs-mentor/auditorias/AUD-001.json')
  // Relogio congelado: as concluidas empatam no carimbo e saem em ordem de ID.
  confere(c, [...aud1.sem_diff_auditavel].sort().join(',') === 'TASK-CHORE-001,TASK-DOC-001',
    'a auditoria registra quais tarefas do lote nao tinham codigo para revisar')

  aud1.veredito = 'APROVADO'
  aud1.nao_verificado = ['nao rodei a aplicacao: o dossie nao traz como executa-la']
  escrever(c, 'docs-mentor/auditorias/AUD-001.json', JSON.stringify(aud1, null, 2))
  dizQue(c, mentor(c, 'auditar', 'registrar', 'AUD-001'), 'AUD-001: APROVADO', 'registra a auditoria')
  const depois = lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
  confere(c, depois.auditoria.ultima_na_tarefa === 4, 'ultima_na_tarefa conta as concluidas que estao em lote')
  confere(c, depois.auditoria.proxima_em_tarefa === 6, 'proxima_em_tarefa conta da ultima auditoria, nao do proximo multiplo')

  // --- 5. dois lotes grandes: o dossie divide em vez de truncar
  apagar(c, 'src/outra.ts')
  commit('TASK-RF-002')
  const grande = (nome: string) => Array.from({ length: 4000 }, (_, i) => `export const ${nome}${i} = ${i}`).join('\n') + '\n'
  fechar('RF', 'TASK-RF-003', 'Primeiro modulo grande', { 'src/grande1.ts': grande('um') }, ['src/grande1.ts - modulo grande'])
  commit('feat(TASK-RF-003): primeiro modulo grande')
  fechar('RF', 'TASK-RF-004', 'Segundo modulo grande', { 'src/grande2.ts': grande('dois') }, ['src/grande2.ts - modulo grande'])
  commit('feat(TASK-RF-004): segundo modulo grande')

  const p2 = mentor(c, 'auditar', 'preparar')
  dizQue(c, p2, 'AUD-002 preparada: 1 tarefa(s) no lote', 'o primeiro preparar leva so o que cabe no teto')
  dizQue(c, p2, 'Ficaram 1 tarefa(s) para a proxima', 'e diz o que ficou')
  const aud2 = lerJson<Record<string, any>>(c, 'docs-mentor/auditorias/AUD-002.json')
  confere(c, JSON.stringify(aud2.lote) === JSON.stringify(['TASK-RF-003']) &&
    JSON.stringify(aud2.ficaram_para_depois) === JSON.stringify(['TASK-RF-004']),
    'o lote e a sobra ficam registrados')
  confere(c, !ler(c, 'docs-mentor/auditorias/AUD-002-dossie.md').includes('DIFF TRUNCADO'), 'o lote que cabe nao trunca')
  aud2.veredito = 'APROVADO'
  aud2.nao_verificado = ['nao conferi a performance do modulo grande']
  escrever(c, 'docs-mentor/auditorias/AUD-002.json', JSON.stringify(aud2, null, 2))
  mentor(c, 'auditar', 'registrar', 'AUD-002')
  dizQue(c, mentor(c, 'auditar', 'preparar'), 'AUD-003 preparada: 1 tarefa(s) no lote', 'o segundo preparar leva a sobra')
  confere(c, ler(c, 'docs-mentor/auditorias/AUD-003-dossie.md').includes('+export const dois0 = 0'),
    'a sobra chega inteira no dossie seguinte')

  fecharTemporario(c)
  return c
}
