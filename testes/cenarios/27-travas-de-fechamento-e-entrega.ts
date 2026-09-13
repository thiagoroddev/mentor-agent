import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  abrirCenarioTemporario, confere, dizQue, escrever, fecharTemporario, ler, lerJson, mentor, RAIZ_REPO,
} from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/**
 * As travas da 0.8.0, uma por defeito medido em campo:
 * B1. tarefa legitima fechada antes do commit nao cai como retroativa;
 * B2. gate que rodou antes de o codigo mudar nao sustenta o fechamento;
 * B3. tarefa de tela so' dispensa validacao com motivo de 30 caracteres;
 * B4. `verificar` ignora marcador citado, e o pre-push o mostra sem barrar;
 * B5. o hook trata `.mentor/` pelo manifesto: pacote intacto nao e' codigo, patch local e';
 * B6. `instalar --forcar` diz quais leis troca, inclusive pelo caminho de `node_modules`;
 * B7. `task criterio` aceita `--cmd`, o nome que a ajuda anunciava;
 * B8. o pre-push nao roda os gates de novo (o arquivo do hook ja' roda).
 * 0.8.1. commit em codigo precisa de ID de tarefa ou da marca `(light)`; escopo qualquer nao basta.
 */
export function rodar(): Cenario {
  const c = abrirCenarioTemporario('27-travas-de-fechamento-e-entrega')
  const sh = (...args: string[]) => spawnSync(args[0]!, args.slice(1), { cwd: c.pasta, encoding: 'utf8' })
  const commit = (msg: string) => {
    sh('git', 'add', '-A')
    sh('git', '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', msg)
  }

  sh('git', 'init', '-q')
  sh('git', 'branch', '-M', 'main')
  escrever(c, 'README.md', '# Projeto travas\n')
  commit('inicio')
  mentor(c, 'instalar', '--destino', c.pasta)
  mentor(c, 'init')
  const ctx = lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
  ctx.gates.testes = { comando: 'node -e "console.log(\'GATE_RODOU 1 passed\')"' }
  ctx.qualidade.metodo_de_teste = 'teste-depois'
  ctx.qualidade.metodo_motivo = 'cenario do proprio pacote'
  escrever(c, 'docs-mentor/contexto.json', JSON.stringify(ctx, null, 2))
  commit('instala o mentor')

  const abrir = (id: string, titulo: string, muda: string[]) => {
    mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', titulo, '--esforco', 'P/P',
      '--origem', 'titulo-autossuficiente', '--sem-requisito', '--motivo', 'cenario')
    mentor(c, 'task', 'puxar', id)
    mentor(c, 'task', 'iniciar', id)
    const t = lerJson<Record<string, any>>(c, `docs-mentor/tarefas/abertas/${id}.json`)
    t.plano = {
      muda, criterios_aceite: [{ texto: 'faz o pedido', teste: 'a.test.ts > caso feliz' }],
      impacto: 'modulo do cenario', riscos: ['nenhum identificado'], dependencias_novas: [],
      proporcionalidade: 'do tamanho do pedido',
    }
    escrever(c, `docs-mentor/tarefas/abertas/${id}.json`, JSON.stringify(t, null, 2))
    escrever(c, `docs-mentor/tarefas/abertas/${id}.md`,
      '# t\n\n## Decisoes tomadas\na\n\n## O que nao foi feito, e por que\nb\n\n## Testes de descoberta\nNenhuma.\n\n## Aprendizados\nNada.\n')
  }

  // --- B1. o commit da base tocou o arquivo; a tarefa o muda de novo, e fecha antes de commitar
  escrever(c, 'src/nota.ts', 'export const nota = 1\n')
  commit('feat(TASK-RF-000): primeira versao da nota')
  abrir('TASK-RF-001', 'Ajustar a nota', ['src/nota.ts - ajusta a nota'])
  escrever(c, 'src/nota.ts', 'export const nota = 2\n')
  mentor(c, 'task', 'gate', 'TASK-RF-001', 'testes')
  const b1 = mentor(c, 'task', 'finalizar', 'TASK-RF-001')
  confere(c, b1.saida.includes('TASK-RF-001 concluida') && !b1.saida.includes('retroativa'),
    'B1: tarefa com mudanca nao commitada no arquivo declarado nao e retroativa, mesmo que a base o tenha tocado')
  commit('feat(TASK-RF-001): ajustar a nota')

  // --- B2. o codigo muda depois do gate
  abrir('TASK-RF-002', 'Calcular total', ['src/total.ts - soma'])
  escrever(c, 'src/total.ts', 'export const total = 1\n')
  mentor(c, 'task', 'gate', 'TASK-RF-002', 'testes')
  escrever(c, 'src/total.ts', 'export const total = 2\n')
  const b2 = mentor(c, 'task', 'finalizar', 'TASK-RF-002')
  dizQue(c, b2, 'gate "testes" rodou antes de 1 arquivo(s) mudar(em): src/total.ts',
    'B2: arquivo declarado que mudou depois do gate recusa o fechamento')
  dizQue(c, b2, 'mentor task gate TASK-RF-002 testes', 'B2: a recusa diz o comando que resolve')
  mentor(c, 'task', 'gate', 'TASK-RF-002', 'testes')
  escrever(c, 'docs-mentor/rascunhos/anotacao.md', '# Anotacao depois do gate\n')
  dizQue(c, mentor(c, 'task', 'finalizar', 'TASK-RF-002'), 'TASK-RF-002 concluida',
    'B2: com o gate de novo, fecha; mudar a pasta de documentos depois do gate nao conta')
  commit('feat(TASK-RF-002): calcular total')

  // --- B3 e B7. tarefa de tela
  abrir('TASK-RF-003', 'Mostrar o resumo', ['src/Resumo.tsx - componente do resumo'])
  dizQue(c, mentor(c, 'task', 'validar', 'TASK-RF-003', '--dispensado', '--motivo', 'sem necessidade'),
    'tarefa sensivel (ui) exige --motivo detalhado (minimo 30 caracteres)',
    'B3: tarefa com .tsx no plano e tratada como UI e nao dispensa com motivo curto')
  dizQue(c, mentor(c, 'task', 'criterio', 'TASK-RF-003', '0', '--cmd', 'node -e "console.log(\'render ok\')"'),
    'criterio [0] evidenciado', 'B7: --cmd vale como --comando')
  mentor(c, 'task', 'cancelar', 'TASK-RF-003', '--motivo', 'cenario de trava concluido')
  commit('docs: cancela TASK-RF-003')

  // --- B4. verificar: citacao nao e esqueleto
  escrever(c, 'docs-mentor/melhorias-do-pacote.md', '# Melhorias\n\n| recusa | exemplo |\n| --- | --- |\n| marcador | PREENCHER: sobrou |\n')
  escrever(c, 'docs-mentor/rascunhos/citacao.md', '# Citacao\n\nO script escreve `PREENCHER:` e a IA troca.\n')
  escrever(c, 'docs-mentor/rascunhos/esqueleto.md', '# Esqueleto\n\nPREENCHER: o que falta\n')
  const v = mentor(c, 'verificar')
  confere(c, !v.saida.includes('melhorias-do-pacote.md'), 'B4: melhorias-do-pacote.md cita tokens do pacote e nao e acusado')
  confere(c, !v.saida.includes('citacao.md'), 'B4: marcador entre crases e citacao, nao esqueleto')
  dizQue(c, v, 'rascunhos/esqueleto.md', 'B4: marcador solto continua acusado')
  commit('docs: notas do cenario')

  // --- B4 e B8. o pre-push mostra o verificar, nao barra por ele, e nao roda os gates
  sh('git', 'checkout', '-q', '-b', 'trabalho')
  const push = mentor(c, 'hooks', '--pre-push', 'origin')
  confere(c, push.codigo === 0, 'B4: achado do verificar nao barra o envio')
  dizQue(c, push, 'Aviso: o verificar tem', 'B4: o pre-push mostra os achados do verificar')
  confere(c, !push.saida.includes('GATE_RODOU'), 'B8: o pre-push nao roda os gates, que o arquivo do hook ja roda')

  // --- 0.8.1. escopo qualquer nao substitui a tarefa; a marca light, sim
  escrever(c, 'src/Tela.tsx', 'export const Tela = () => null\n')
  commit('feat(ui): tela nova')
  const escopoLivre = mentor(c, 'hooks', '--pre-push', 'origin')
  confere(c, escopoLivre.codigo === 1 && escopoLivre.saida.includes('fix(light): corrigir typo no botao'),
    'Light: escopo qualquer nao passa por ID de tarefa, e a recusa ensina as duas marcas')
  sh('git', 'reset', '-q', '--hard', 'HEAD~1')
  escrever(c, 'src/nota.ts', 'export const nota = 2 // corrigido\n')
  commit('fix(light): corrigir comentario da nota')
  confere(c, mentor(c, 'hooks', '--pre-push', 'origin').codigo === 0, 'Light: commit com a marca light sobe sem tarefa')

  // --- B6. instalar --forcar diz quais leis troca, pelo repositorio e por node_modules
  escrever(c, '.mentor/processos/entrega.md', `${ler(c, '.mentor/processos/entrega.md')}Linha local um.\nLinha local dois.\n`)
  const reinstalar = mentor(c, 'instalar', '--destino', c.pasta, '--forcar')
  dizQue(c, reinstalar, 'ATENCAO: esta atualizacao troca leis do projeto', 'B6: o instalar avisa antes de trocar as leis')
  dizQue(c, reinstalar, '.mentor/processos/entrega.md  +0 -2 linhas', 'B6: e diz o tamanho da troca por arquivo')

  escrever(c, '.mentor/processos/entrega.md', `${ler(c, '.mentor/processos/entrega.md')}Outra linha local.\n`)
  const dependencia = join(c.pasta, 'node_modules', 'mentor-agent')
  mkdirSync(dependencia, { recursive: true })
  cpSync(join(RAIZ_REPO, '.mentor'), join(dependencia, '.mentor'), { recursive: true })
  cpSync(join(RAIZ_REPO, 'mentor.mjs'), join(dependencia, 'mentor.mjs'))
  escrever(c, '.gitignore', `${ler(c, '.gitignore')}node_modules/\n`)
  const npx = spawnSync(process.execPath, [join(dependencia, 'mentor.mjs'), 'instalar', '--destino', c.pasta, '--forcar'], { encoding: 'utf8' })
  confere(c, `${npx.stdout}`.includes('.mentor/processos/entrega.md  +0 -1 linhas'),
    'B6: o caminho de node_modules (o do npx) tambem avisa')

  // --- B5. o hook e o pacote
  commit('chore: reinstala o pacote')
  const nucleo = `${ler(c, '.mentor/processos/teste.md')}\nPatch local sem tarefa.\n`
  escrever(c, '.mentor/processos/teste.md', nucleo)
  commit('ajusta o processo de teste')
  const patch = mentor(c, 'hooks', '--pre-push', 'origin')
  confere(c, patch.codigo === 1 && patch.saida.includes('sem ID de tarefa'),
    'B5: patch local em .mentor/ e codigo do projeto, e sem ID de tarefa nao sobe')

  fecharTemporario(c)
  return c
}
