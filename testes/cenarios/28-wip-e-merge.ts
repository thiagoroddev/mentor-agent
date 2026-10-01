import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  abrirCenarioTemporario, confere, dizQue, escrever, fecharTemporario, ler, lerJson, mentor,
} from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/**
 * WIP no remoto, merge barrado no principal (0.9.0). Remoto bare de verdade e hook de verdade: o
 * `git push` chama o `.githooks/pre-push`, que passa ao mentor os ramos enviados pela entrada padrao.
 * 1. Envio para `wip/` passa com gate vermelho e commit sem ID.
 * 2. Envio para ramo comum roda os gates uma vez e barra commit sem ID.
 * 3. Envio ao principal e' barrado estando em outro ramo.
 * 4. `pronto-para-merge` falha com a tarefa pausada, passa concluida, passa Light, falha sem ID.
 * 5. `retomar` recusa com o principal a frente; com merge antes, retoma e fecha sem acusar o que veio dele.
 * 6. `pausar --commit` sugere o push; `doctor` lista o ramo WIP; apagar ramo remoto passa direto.
 * 7. `instalar --forcar` regrava o hook antigo do mentor e nao toca hook escrito pelo projeto.
 */
export function rodar(): Cenario {
  const c = abrirCenarioTemporario('28-wip-e-merge')
  const origem = mkdtempSync(join(tmpdir(), 'mentor-28-origem-'))
  const sh = (args: string[], env: Record<string, string> = {}) => {
    const r = spawnSync(args[0]!, args.slice(1), { cwd: c.pasta, encoding: 'utf8', env: { ...process.env, ...env } })
    return { codigo: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}` }
  }
  const commit = (msg: string) => {
    sh(['git', 'add', '-A'])
    sh(['git', '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', msg])
  }

  spawnSync('git', ['init', '-q', '--bare', origem], { encoding: 'utf8' })
  sh(['git', 'init', '-q'])
  sh(['git', 'branch', '-M', 'main'])
  escrever(c, 'README.md', '# Projeto WIP\n')
  commit('inicio')
  mentor(c, 'instalar', '--destino', c.pasta)
  mentor(c, 'init')
  const ctx = lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
  ctx.gates.testes = { comando: 'node -e "console.log(\'GATE_RODOU\');process.exit(process.env.GATE_VERMELHO?1:0)"' }
  ctx.qualidade.metodo_de_teste = 'teste-depois'
  ctx.qualidade.metodo_motivo = 'cenario do proprio pacote'
  ctx.versionamento.ramo_principal = 'main'
  ctx.versionamento.revisao_antes_do_merge = 'PR obrigatorio antes de integrar na main'
  escrever(c, 'docs-mentor/contexto.json', JSON.stringify(ctx, null, 2))
  commit('instala o mentor')
  sh(['git', 'remote', 'add', 'origin', origem])
  sh(['git', 'push', '-q', 'origin', 'main'])
  mentor(c, 'hooks', '--instalar')
  commit('chore: liga o hook de pre-push')

  // --- tarefa num ramo proprio, pausada com commit de WIP
  sh(['git', 'checkout', '-q', '-b', 'rf-001'])
  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Somar parcelas', '--esforco', 'P/P',
    '--origem', 'titulo-autossuficiente', '--sem-requisito', '--motivo', 'cenario')
  mentor(c, 'task', 'puxar', 'TASK-RF-001')
  mentor(c, 'task', 'iniciar', 'TASK-RF-001')
  escrever(c, 'src/a.ts', 'export const a = (x: number) => x + 1\n')
  const t = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.json')
  t.plano = {
    muda: ['src/a.ts - soma'], criterios_aceite: [{ texto: 'soma', teste: 'a.test.ts > soma' }],
    impacto: 'modulo a', riscos: ['nenhum identificado'], dependencias_novas: [], proporcionalidade: 'do tamanho do pedido',
  }
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.json', JSON.stringify(t, null, 2))
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.md',
    '# t\n\n## Decisoes tomadas\na\n\n## O que nao foi feito, e por que\nb\n\n## Testes de descoberta\nNenhuma.\n\n## Aprendizados\nNada.\n\n## Desfecho\nGates verdes; nada fora do previsto.\n')
  mentor(c, 'task', 'gate', 'TASK-RF-001', 'testes')
  const pausa = mentor(c, 'task', 'pausar', 'TASK-RF-001', '--motivo', 'aguarda outra tarefa', '--commit')
  dizQue(c, pausa, 'git push -u origin HEAD:wip/task-rf-001', 'pausar sugere guardar a pausa fora do disco')
  escrever(c, 'src/solto.ts', 'export const solto = true\n')
  commit('ajuste sem tarefa')

  // --- 1. WIP sobe com gate vermelho e commit sem ID
  const wip = sh(['git', 'push', '-u', 'origin', 'HEAD:wip/task-rf-001'], { GATE_VERMELHO: '1' })
  confere(c, wip.codigo === 0 && wip.saida.includes('Envio de WIP') && !wip.saida.includes('GATE_RODOU'),
    `envio para wip/ passa sem gates e sem checagem de ID (saiu: ${wip.saida.split('\n').slice(0, 3).join(' | ')})`)
  confere(c, sh(['git', 'ls-remote', 'origin', 'refs/heads/wip/task-rf-001']).saida.trim().length > 0, 'o ramo WIP existe no remoto')

  // --- 4a. pausada, nao esta pronta para merge
  const pausada = mentor(c, 'pronto-para-merge', '--titulo', 'feat(TASK-RF-001): somar parcelas')
  confere(c, pausada.codigo === 1 && pausada.saida.includes('"pausada" (WIP)'), 'pronto-para-merge recusa tarefa pausada')

  // --- 2 e 3. outro ramo: codigo sem ID barrado, e o principal barrado estando fora dele
  sh(['git', 'checkout', '-q', '-b', 'outro', 'main'])
  escrever(c, 'src/outro.ts', 'export const outro = 1\n')
  commit('mexe no outro')
  const semId = sh(['git', 'push', 'origin', 'outro'])
  // A marca de tarefa e' conferida antes dos gates: commit sem ID barra sem gastar a bateria.
  confere(c, semId.codigo !== 0 && semId.saida.includes('sem ID de tarefa') && !/APROVADO: /.test(semId.saida),
    'envio para ramo comum barra commit de codigo sem ID antes de rodar os gates')
  const aoPrincipal = sh(['git', 'push', 'origin', 'outro:main'])
  confere(c, aoPrincipal.codigo !== 0 && aoPrincipal.saida.includes('push direto no ramo principal'),
    'envio ao principal e barrado mesmo estando em outro ramo')

  // --- 5. o principal avanca; retomar recusa ate o merge
  sh(['git', 'checkout', '-q', 'main'])
  escrever(c, 'src/b.ts', 'export const b = 2\n')
  commit('feat(TASK-RF-002): modulo b')
  sh(['git', 'checkout', '-q', 'rf-001'])
  const antesDoMerge = mentor(c, 'task', 'retomar', 'TASK-RF-001')
  confere(c, antesDoMerge.codigo !== 0 && antesDoMerge.saida.includes('git merge main'), 'retomar recusa com o principal a frente e manda fazer o merge')
  sh(['git', '-c', 'user.email=t@t', '-c', 'user.name=t', 'merge', '-q', '--no-edit', 'main'])
  dizQue(c, mentor(c, 'task', 'retomar', 'TASK-RF-001'), 'retomada em execucao', 'depois do merge, retoma')
  mentor(c, 'task', 'gate', 'TASK-RF-001', 'testes')
  const fim = mentor(c, 'task', 'finalizar', 'TASK-RF-001')
  confere(c, fim.saida.includes('TASK-RF-001 concluida') && !fim.saida.includes('src/b.ts'),
    `com o merge antes do retomar, o finalizar nao acusa o que veio do principal (saiu: ${fim.saida.split('\n').slice(0, 3).join(' | ')})`)
  commit('docs(TASK-RF-001): registrar conclusao')

  // --- 4b. concluida, pronta; Light passa; sem ID nem marca, nao
  dizQue(c, mentor(c, 'pronto-para-merge', '--titulo', 'feat(TASK-RF-001): somar parcelas'), 'Pronto para merge: TASK-RF-001', 'concluida, esta pronta para merge')
  // Light confere o conteudo do PR, nao so' o titulo: neste ramo ha registro de tarefa e hook.
  confere(c, mentor(c, 'pronto-para-merge', '--titulo', 'fix(light): corrigir typo').codigo === 1,
    'PR com titulo Light e conteudo de tarefa nao esta pronto')
  sh(['git', 'checkout', '-q', '-b', 'typo', 'origin/main'])
  escrever(c, 'LEIA.txt', 'texto corrigido\n')
  commit('fix(light): corrigir typo')
  confere(c, mentor(c, 'pronto-para-merge', '--titulo', 'fix(light): corrigir typo').codigo === 0, 'PR Light esta pronto sem tarefa')
  sh(['git', 'checkout', '-q', '-'])
  confere(c, mentor(c, 'pronto-para-merge', '--titulo', 'Bump lodash from 1 to 2').codigo === 1, 'PR sem ID nem marca nao esta pronto')

  // --- 6. doctor lista o WIP; apagar o ramo remoto passa direto
  dizQue(c, mentor(c, 'doctor'), 'ramo(s) WIP no remoto: origin/wip/task-rf-001', 'o doctor lista o ramo WIP do remoto')
  const apagando = sh(['git', 'push', 'origin', '--delete', 'wip/task-rf-001'])
  confere(c, apagando.codigo === 0 && !apagando.saida.includes('GATE_RODOU'), 'apagar ramo remoto nao roda gates')

  // --- 7. instalar --forcar regrava o hook antigo do mentor, e nunca o do projeto
  escrever(c, '.githooks/pre-push', '#!/bin/sh\n# Gerado por `mentor hooks --instalar`. Antigo.\nnode mentor.mjs gates || exit 1\nnode mentor.mjs hooks --pre-push "$@" || exit 1\n')
  dizQue(c, mentor(c, 'instalar', '--destino', c.pasta, '--forcar'), 'Hook .githooks/pre-push regravado', 'instalar avisa que regravou o hook')
  confere(c, !ler(c, '.githooks/pre-push').includes('node mentor.mjs gates'), 'o hook regravado nao roda mais os gates no shell')
  escrever(c, '.githooks/pre-push', '#!/bin/sh\necho hook do projeto\n')
  mentor(c, 'instalar', '--destino', c.pasta, '--forcar')
  confere(c, ler(c, '.githooks/pre-push').includes('hook do projeto'), 'hook escrito pelo projeto nao e tocado')

  fecharTemporario(c)
  rmSync(origem, { recursive: true, force: true })
  return c
}
