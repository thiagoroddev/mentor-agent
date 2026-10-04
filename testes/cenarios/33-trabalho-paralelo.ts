import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  abrirCenarioTemporario, confere, dizQue, fecharTemporario, lerJson, mentor,
  RELOGIO, RAIZ_REPO,
} from '../apoio.ts'
import type { Cenario, Resultado } from '../apoio.ts'

function mentorNaPasta(pasta: string, ...args: string[]): Resultado {
  const r = spawnSync(process.execPath, [join(RAIZ_REPO, 'mentor.mjs'), ...args], {
    encoding: 'utf8',
    cwd: pasta,
    env: { ...process.env, MENTOR_RAIZ: pasta, MENTOR_AGORA: RELOGIO },
  })
  return { codigo: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() }
}

/**
 * Cenario 33: Trabalho paralelo por slots no Mentor (Épico PLAN-trabalho-paralelo-por-slots)
 * 1. Repositório temporário com remoto bare local.
 * 2. Pré-cadastro centralizado de tarefas na linha principal (CP-13).
 * 3. Linked worktrees reais (slot-a e slot-b).
 * 4. Execução concorrente de tarefas distintas respeitando limite de 1 em execução por slot (CP-02).
 * 5. Doctor somente-leitura com diagnóstico multi-worktree (CP-03).
 * 6. Conclusão da primeira fatia e First-to-Merge na linha principal.
 * 7. Merge na segunda fatia gerando conflito em gerados/contexto.json.
 * 8. Resolução semântica com `mentor resolver-gerados` (código 0, índice 100% limpo, histórico preservado - CP-11).
 * 9. Conflito em arquivo não coberto encerra com código 1 e preserva marcadores (CP-06/CP-07/CP-09).
 */
export function rodar(): Cenario {
  const c = abrirCenarioTemporario('33-trabalho-paralelo')
  const origemBare = mkdtempSync(join(tmpdir(), 'mentor-33-bare-'))
  const slotA = mkdtempSync(join(tmpdir(), 'mentor-33-slot-a-'))
  const slotB = mkdtempSync(join(tmpdir(), 'mentor-33-slot-b-'))

  const sh = (cwd: string, ...args: string[]) => {
    const r = spawnSync(args[0]!, args.slice(1), { cwd, encoding: 'utf8' })
    return { codigo: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() }
  }

  const commit = (cwd: string, msg: string) => {
    sh(cwd, 'git', 'add', '-A')
    sh(cwd, 'git', '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', msg)
  }

  try {
    // 1. Inicializa remoto bare e repositório principal
    spawnSync('git', ['init', '-q', '--bare', origemBare], { encoding: 'utf8' })
    sh(c.pasta, 'git', 'init', '-q')
    sh(c.pasta, 'git', 'branch', '-M', 'main')
    sh(c.pasta, 'git', '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '--allow-empty', '-q', '-m', 'inicio')

    mentor(c, 'instalar', '--destino', c.pasta)
    mentor(c, 'init')

    const ctx = lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
    ctx.gates.testes = { comando: 'echo "1 passed"' }
    ctx.qualidade.metodo_de_teste = 'teste-depois'
    ctx.qualidade.metodo_motivo = 'cenario de trabalho paralelo'
    ctx.versionamento.ramo_principal = 'main'
    ctx.limites = { em_execucao: 1 }
    writeFileSync(join(c.pasta, 'docs-mentor', 'contexto.json'), JSON.stringify(ctx, null, 2))

    commit(c.pasta, 'configura mentor na main')
    sh(c.pasta, 'git', 'remote', 'add', 'origin', origemBare)
    sh(c.pasta, 'git', 'push', '-q', 'origin', 'main')

    // 2. Pré-cadastro sequencial das tarefas na linha principal (CP-13)
    mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Interface do Dashboard', '--esforco', 'P/P',
      '--origem', 'titulo-autossuficiente', '--sem-requisito', '--motivo', 'cenario 33 front')
    mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'API de Agregacao', '--esforco', 'P/P',
      '--origem', 'titulo-autossuficiente', '--sem-requisito', '--motivo', 'cenario 33 back')

    commit(c.pasta, 'docs(tarefas): pre-cadastra TASK-RF-001 e TASK-RF-002')
    sh(c.pasta, 'git', 'push', '-q', 'origin', 'main')

    // 3. Cria linked worktrees reais do Git
    rmSync(slotA, { recursive: true, force: true })
    rmSync(slotB, { recursive: true, force: true })

    const rWtA = sh(c.pasta, 'git', 'worktree', 'add', slotA, '-b', 'task/TASK-RF-001')
    confere(c, rWtA.codigo === 0, `criou worktree slotA: ${rWtA.saida}`)

    const rWtB = sh(c.pasta, 'git', 'worktree', 'add', slotB, '-b', 'task/TASK-RF-002')
    confere(c, rWtB.codigo === 0, `criou worktree slotB: ${rWtB.saida}`)

    // 4. Execução em slot-a (Front): puxar e iniciar TASK-RF-001
    const rPuxarA = mentorNaPasta(slotA, 'task', 'puxar', 'TASK-RF-001')
    dizQue(c, rPuxarA, 'no ciclo', 'slotA puxou TASK-RF-001 para o ciclo')

    const rIniciarA = mentorNaPasta(slotA, 'task', 'iniciar', 'TASK-RF-001')
    dizQue(c, rIniciarA, 'em execucao', 'slotA iniciou TASK-RF-001')

    // Puxar TASK-RF-002 no slot-a para tentar iniciar 2 tarefas simultâneas no mesmo slot
    mentorNaPasta(slotA, 'task', 'puxar', 'TASK-RF-002')
    const rIniciarA2 = mentorNaPasta(slotA, 'task', 'iniciar', 'TASK-RF-002')
    confere(c, rIniciarA2.codigo !== 0, 'slotA recusa iniciar 2a tarefa com limite local 1 em execucao (CP-02)')
    confere(c, rIniciarA2.saida.includes('Ja ha 1 tarefa(s) em execucao'), 'mensagem de erro indica limite de 1 tarefa em execucao atingido')
    // Devolve TASK-RF-002 para reserva no slotA
    mentorNaPasta(slotA, 'task', 'guardar', 'TASK-RF-002')

    // 5. Execução em slot-b (Back): puxar e iniciar TASK-RF-002
    const rPuxarB = mentorNaPasta(slotB, 'task', 'puxar', 'TASK-RF-002')
    dizQue(c, rPuxarB, 'no ciclo', 'slotB puxou TASK-RF-002 para o ciclo de forma isolada')

    const rIniciarB = mentorNaPasta(slotB, 'task', 'iniciar', 'TASK-RF-002')
    dizQue(c, rIniciarB, 'em execucao', 'slotB iniciou TASK-RF-002 concorrentemente')

    // 6. Diagnóstico do Doctor na pasta principal (somente-leitura, CP-03)
    const statusAntes = sh(c.pasta, 'git', 'status', '--porcelain').saida
    const rDoc = mentor(c, 'doctor')
    confere(c, rDoc.codigo === 0, 'doctor executou com sucesso na presenca de worktrees')
    confere(c, rDoc.saida.includes('worktree(s) observada(s)'), 'doctor reporta worktrees observadas')
    confere(c, rDoc.saida.includes('TASK-RF-001'), 'doctor identifica TASK-RF-001 na worktree')
    confere(c, rDoc.saida.includes('TASK-RF-002'), 'doctor identifica TASK-RF-002 na worktree')

    const statusDepois = sh(c.pasta, 'git', 'status', '--porcelain').saida
    confere(c, statusAntes === statusDepois, 'doctor e estritamente somente-leitura')

    // 7. Implementação e conclusão em slot-a (First-to-Merge)
    mkdirSync(join(slotA, 'src'), { recursive: true })
    writeFileSync(join(slotA, 'src', 'dashboard.ts'), 'export const dashboard = "front"\n')

    const t1Json = JSON.parse(readFileSync(join(slotA, 'docs-mentor', 'tarefas', 'abertas', 'TASK-RF-001.json'), 'utf8'))
    t1Json.plano = {
      muda: ['src/dashboard.ts'],
      criterios_aceite: [{ texto: 'dashboard renderiza', teste: 'echo "1 passed"', evidencia: 'ok' }],
      impacto: 'front',
      riscos: [],
      dependencias_novas: [],
      proporcionalidade: 'direto',
    }
    writeFileSync(join(slotA, 'docs-mentor', 'tarefas', 'abertas', 'TASK-RF-001.json'), JSON.stringify(t1Json, null, 2))
    writeFileSync(
      join(slotA, 'docs-mentor', 'tarefas', 'abertas', 'TASK-RF-001.md'),
      '# TASK-RF-001 · Interface do Dashboard\n\n## Plano\nImplementar dashboard.\n\n## O que foi feito\nComponente criado.\n\n## Desfecho\nGates verdes.\n',
    )

    mentorNaPasta(slotA, 'task', 'gate', 'TASK-RF-001', 'testes')
    const rFinA = mentorNaPasta(slotA, 'task', 'finalizar', 'TASK-RF-001')
    dizQue(c, rFinA, 'concluida', 'slotA finalizou TASK-RF-001')

    // Modificação concorrente em contexto.json para garantir conflito semântico 3-way
    const ctxA = JSON.parse(readFileSync(join(slotA, 'docs-mentor', 'contexto.json'), 'utf8'))
    ctxA.stack_slot = 'slot-a'
    writeFileSync(join(slotA, 'docs-mentor', 'contexto.json'), JSON.stringify(ctxA, null, 2))

    commit(slotA, 'feat(TASK-RF-001): dashboard concluido')

    // Merge de slot-a na main e push
    sh(c.pasta, 'git', 'checkout', '-q', 'main')
    const rMergeA = sh(c.pasta, 'git', 'merge', '-q', 'task/TASK-RF-001', '-m', 'merge: integrar TASK-RF-001')
    confere(c, rMergeA.codigo === 0, `main integrou TASK-RF-001: ${rMergeA.saida}`)
    sh(c.pasta, 'git', 'push', '-q', 'origin', 'main')

    // 8. Implementação e conclusão em slot-b
    mkdirSync(join(slotB, 'src'), { recursive: true })
    writeFileSync(join(slotB, 'src', 'api.ts'), 'export const api = "back"\n')

    const t2Json = JSON.parse(readFileSync(join(slotB, 'docs-mentor', 'tarefas', 'abertas', 'TASK-RF-002.json'), 'utf8'))
    t2Json.plano = {
      muda: ['src/api.ts'],
      criterios_aceite: [{ texto: 'api responde', teste: 'echo "1 passed"', evidencia: 'ok' }],
      impacto: 'back',
      riscos: [],
      dependencias_novas: [],
      proporcionalidade: 'direto',
    }
    writeFileSync(join(slotB, 'docs-mentor', 'tarefas', 'abertas', 'TASK-RF-002.json'), JSON.stringify(t2Json, null, 2))
    writeFileSync(
      join(slotB, 'docs-mentor', 'tarefas', 'abertas', 'TASK-RF-002.md'),
      '# TASK-RF-002 · API de Agregacao\n\n## Plano\nImplementar API.\n\n## O que foi feito\nEndpoints criados.\n\n## Desfecho\nGates verdes.\n',
    )

    mentorNaPasta(slotB, 'task', 'gate', 'TASK-RF-002', 'testes')
    const rFinB = mentorNaPasta(slotB, 'task', 'finalizar', 'TASK-RF-002')
    dizQue(c, rFinB, 'concluida', 'slotB finalizou TASK-RF-002')

    // Modificação concorrente na mesma chave de contexto.json no slot B
    const ctxB = JSON.parse(readFileSync(join(slotB, 'docs-mentor', 'contexto.json'), 'utf8'))
    ctxB.stack_slot = 'slot-b'
    writeFileSync(join(slotB, 'docs-mentor', 'contexto.json'), JSON.stringify(ctxB, null, 2))

    commit(slotB, 'feat(TASK-RF-002): api concluida')

    // 9. Atualizar slot-b com origin/main (gera conflito nos gerados do Mentor)
    sh(slotB, 'git', 'fetch', '-q', 'origin')
    const rMergeOrigin = sh(slotB, 'git', 'merge', 'origin/main')
    confere(c, rMergeOrigin.codigo !== 0, 'git merge origin/main acusa conflito concorrente em gerados')

    // 10. Resolução semântica com mentor resolver-gerados (CP-11)
    const rResolverOk = mentorNaPasta(slotB, 'resolver-gerados')
    dizQue(c, rResolverOk, 'Resolucao de gerados finalizada com sucesso', 'resolver-gerados resolveu conflitos com codigo 0')
    confere(c, rResolverOk.codigo === 0, 'resolver-gerados saiu com codigo 0')

    // Verifica que o índice do Git está limpo de conflitos U
    const diffU = sh(slotB, 'git', 'diff', '--name-only', '--diff-filter=U').saida
    confere(c, diffU.length === 0, 'nenhum arquivo permanece em conflito (U) apos resolver-gerados')

    // Conclui merge em slot-b
    commit(slotB, 'merge: integrar origin/main com TASK-RF-002')

    // Verifica preservação de registros: ambas as tarefas aparecem em concluidas
    const concluidasB = sh(slotB, 'git', 'ls-files', 'docs-mentor/tarefas/concluidas/').saida
    confere(c, concluidasB.includes('TASK-RF-001'), 'registro de TASK-RF-001 preservado no slotB')
    confere(c, concluidasB.includes('TASK-RF-002'), 'registro de TASK-RF-002 preservado no slotB')

    // 11. Teste de falha verificável: conflito externo em arquivo de aplicação não gerenciado (CP-06/CP-07/CP-09)
    sh(slotB, 'git', 'checkout', '-q', '-b', 'temp-conflito-externo')
    writeFileSync(join(slotB, 'src', 'conflito.ts'), 'export const x = 1\n')
    commit(slotB, 'branch temp com x=1')
    sh(slotB, 'git', 'checkout', '-q', 'task/TASK-RF-002')
    writeFileSync(join(slotB, 'src', 'conflito.ts'), 'export const x = 2\n')
    commit(slotB, 'branch task com x=2')

    sh(slotB, 'git', 'merge', 'temp-conflito-externo')
    // Agora src/conflito.ts esta em estado de conflito real no indice Git (unmerged)
    const rResolverFalha = mentorNaPasta(slotB, 'resolver-gerados')
    confere(c, rResolverFalha.codigo === 1, 'resolver-gerados sai com codigo 1 na presenca de conflito externo em codigo')
    confere(c, rResolverFalha.saida.includes('INCOMPLETA ou COM FALHAS'), 'resolver-gerados avisa de indice com falhas')
    confere(c, rResolverFalha.saida.includes('src/conflito.ts'), 'resolver-gerados lista arquivo nao resolvido remanescente')

    // Aborta merge de teste
    sh(slotB, 'git', 'merge', '--abort')
  } finally {
    // Limpeza de worktrees e repositórios temporários
    try {
      sh(c.pasta, 'git', 'worktree', 'remove', '--force', slotA)
      sh(c.pasta, 'git', 'worktree', 'remove', '--force', slotB)
    } catch {}
    rmSync(origemBare, { recursive: true, force: true })
    rmSync(slotA, { recursive: true, force: true })
    rmSync(slotB, { recursive: true, force: true })
    fecharTemporario(c)
  }

  return c
}
