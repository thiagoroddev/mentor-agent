import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, executarSuites } from './vitest-local.ts'
import { descobrirWorktrees, parsearPorcelainWorktrees } from '../.mentor/scripts/worktrees.ts'
import { doctor } from '../.mentor/scripts/cmd-doctor.ts'

function shaArquivo(caminho: string): string {
  const buf = readFileSync(caminho)
  return createHash('sha256').update(buf).digest('hex')
}

describe('Fatia B: Diagnóstico de tarefas entre worktrees no doctor', () => {
  let tempBase: string

  beforeAll(() => {
    tempBase = mkdtempSync(join(tmpdir(), 'mentor-wt-test-'))
  })

  afterAll(() => {
    rmSync(tempBase, { recursive: true, force: true })
  })

  it('1. parsearPorcelainWorktrees lida com formato padrao, -z, detached e caminhos com espacos', () => {
    // Formato padrão com quebra de linha dupla
    const saidaPadrao = [
      'worktree /caminho com espacos/slot-a',
      'HEAD 1111111111111111111111111111111111111111',
      'branch refs/heads/codex/task-100',
      '',
      'worktree /outro caminho/slot-b',
      'HEAD 2222222222222222222222222222222222222222',
      'detached',
      '',
      'worktree /bare/repo',
      'bare',
    ].join('\n')

    const rPadrao = parsearPorcelainWorktrees(saidaPadrao, false)
    expect(rPadrao.length).toBe(3)
    expect(rPadrao[0]!.worktree).toBe('/caminho com espacos/slot-a')
    expect(rPadrao[0]!.branch).toBe('codex/task-100')
    expect(rPadrao[0]!.detached).toBe(false)
    expect(rPadrao[1]!.worktree).toBe('/outro caminho/slot-b')
    expect(rPadrao[1]!.branch).toBe(null)
    expect(rPadrao[1]!.detached).toBe(true)
    expect(rPadrao[2]!.bare).toBe(true)

    // Formato -z com delimitador NUL
    const saidaZ = [
      'worktree /caminho com espacos/slot-a\0HEAD 1111111111111111111111111111111111111111\0branch refs/heads/main\0',
      'worktree /slot-c\0HEAD 3333333333333333333333333333333333333333\0detached\0',
    ].join('\0')

    const rZ = parsearPorcelainWorktrees(saidaZ, true)
    expect(rZ.length).toBe(2)
    expect(rZ[0]!.worktree).toBe('/caminho com espacos/slot-a')
    expect(rZ[0]!.branch).toBe('main')
    expect(rZ[1]!.worktree).toBe('/slot-c')
    expect(rZ[1]!.detached).toBe(true)
  })

  it('2. estrutura de monorepo: localiza o subprojeto relativo dentro de cada checkout', () => {
    const repoDir = join(tempBase, 'monorepo-principal')
    mkdirSync(repoDir, { recursive: true })

    spawnSync('git', ['init', '-b', 'main'], { cwd: repoDir, encoding: 'utf8' })
    spawnSync('git', ['config', 'user.name', 'Tester'], { cwd: repoDir, encoding: 'utf8' })
    spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoDir, encoding: 'utf8' })

    // Cria estrutura do projeto no monorepo
    const projRel = join('apps', 'servidor')
    const projDir = join(repoDir, projRel)
    const docsDir = join(projDir, 'docs-mentor')
    mkdirSync(join(docsDir, 'tarefas', 'abertas'), { recursive: true })

    writeFileSync(
      join(docsDir, 'contexto.json'),
      JSON.stringify({ limites: { em_execucao: 2 } }, null, 2),
    )
    writeFileSync(join(repoDir, 'README.md'), '# Monorepo\n')

    spawnSync('git', ['add', '.'], { cwd: repoDir, encoding: 'utf8' })
    spawnSync('git', ['commit', '-m', 'feat: init monorepo'], { cwd: repoDir, encoding: 'utf8' })

    // Cria worktree secundária a partir da base limpa
    const wtDir = join(tempBase, 'monorepo-slot-b')
    spawnSync('git', ['worktree', 'add', '-b', 'work/slot-b', wtDir, 'main'], { cwd: repoDir, encoding: 'utf8' })

    // Adiciona tarefa na worktree principal
    writeFileSync(
      join(docsDir, 'tarefas', 'abertas', 'TASK-RF-001.json'),
      JSON.stringify({ id: 'TASK-RF-001', estado: 'em-execucao' }, null, 2),
    )

    // Adiciona tarefa na worktree secundária dentro da mesma pasta relativa
    const wtProjDir = join(wtDir, projRel)
    const wtDocsDir = join(wtProjDir, 'docs-mentor')
    mkdirSync(join(wtDocsDir, 'tarefas', 'abertas'), { recursive: true })
    writeFileSync(
      join(wtDocsDir, 'tarefas', 'abertas', 'TASK-RF-002.json'),
      JSON.stringify({ id: 'TASK-RF-002', estado: 'em-execucao' }, null, 2),
    )

    const diag = descobrirWorktrees(projDir)
    expect(diag.worktrees.length).toBe(2)

    const wtPrincipal = diag.worktrees.find((w) => resolve(w.caminho) === resolve(repoDir))
    expect(wtPrincipal).toBeDefined()
    expect(wtPrincipal!.projetoRaiz).toBe(resolve(projDir))
    expect(wtPrincipal!.temMentor).toBe(true)
    expect(wtPrincipal!.tarefasEmExecucao).toEqual(['TASK-RF-001'])
    expect(wtPrincipal!.limiteEmExecucao).toBe(2)

    const wtSec = diag.worktrees.find((w) => resolve(w.caminho) === resolve(wtDir))
    expect(wtSec).toBeDefined()
    expect(wtSec!.projetoRaiz).toBe(resolve(wtProjDir))
    expect(wtSec!.temMentor).toBe(true)
    expect(wtSec!.tarefasEmExecucao).toEqual(['TASK-RF-002'])

    // IDs distintos: sem duplicidade
    expect(diag.duplicidades.length).toBe(0)
    expect(diag.totalEmExecucao).toBe(2)
  })

  it('3. suporta docs legado (docs/) e padrao (docs-mentor/) sem conflito', () => {
    const repoLegado = join(tempBase, 'repo-docs-legado')
    mkdirSync(repoLegado, { recursive: true })

    spawnSync('git', ['init', '-b', 'main'], { cwd: repoLegado, encoding: 'utf8' })
    spawnSync('git', ['config', 'user.name', 'Tester'], { cwd: repoLegado, encoding: 'utf8' })
    spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoLegado, encoding: 'utf8' })

    const docsLegado = join(repoLegado, 'docs')
    mkdirSync(join(docsLegado, 'tarefas', 'abertas'), { recursive: true })
    writeFileSync(
      join(docsLegado, 'contexto.json'),
      JSON.stringify({ limites: { em_execucao: 1 } }, null, 2),
    )
    writeFileSync(
      join(docsLegado, 'tarefas', 'abertas', 'TASK-LEG-01.json'),
      JSON.stringify({ id: 'TASK-LEG-01', estado: 'em-execucao' }, null, 2),
    )
    writeFileSync(join(repoLegado, 'README.md'), '# Legado\n')

    spawnSync('git', ['add', '.'], { cwd: repoLegado, encoding: 'utf8' })
    spawnSync('git', ['commit', '-m', 'init legado'], { cwd: repoLegado, encoding: 'utf8' })

    const diag = descobrirWorktrees(repoLegado)
    expect(diag.worktrees.length).toBe(1)
    expect(diag.worktrees[0]!.temMentor).toBe(true)
    expect(diag.worktrees[0]!.docsPasta).toBe(resolve(docsLegado))
    expect(diag.worktrees[0]!.tarefasEmExecucao).toEqual(['TASK-LEG-01'])
  })

  it('4. isolamento: MENTOR_RAIZ de uma sessao nao redireciona leitura das arvores irmas', () => {
    const repoIso = join(tempBase, 'repo-isolamento')
    mkdirSync(repoIso, { recursive: true })

    spawnSync('git', ['init', '-b', 'main'], { cwd: repoIso, encoding: 'utf8' })
    spawnSync('git', ['config', 'user.name', 'Tester'], { cwd: repoIso, encoding: 'utf8' })
    spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoIso, encoding: 'utf8' })

    const docsA = join(repoIso, 'docs-mentor')
    mkdirSync(join(docsA, 'tarefas', 'abertas'), { recursive: true })
    writeFileSync(join(docsA, 'contexto.json'), JSON.stringify({ limites: { em_execucao: 1 } }, null, 2))
    writeFileSync(join(repoIso, 'README.md'), '# Iso\n')

    spawnSync('git', ['add', '.'], { cwd: repoIso, encoding: 'utf8' })
    spawnSync('git', ['commit', '-m', 'init iso'], { cwd: repoIso, encoding: 'utf8' })

    const wtIso = join(tempBase, 'repo-isolamento-slot-2')
    spawnSync('git', ['worktree', 'add', '-b', 'work/iso-2', wtIso, 'main'], { cwd: repoIso, encoding: 'utf8' })

    writeFileSync(join(docsA, 'tarefas', 'abertas', 'TASK-ISO-01.json'), JSON.stringify({ id: 'TASK-ISO-01', estado: 'em-execucao' }, null, 2))

    const docsB = join(wtIso, 'docs-mentor')
    mkdirSync(join(docsB, 'tarefas', 'abertas'), { recursive: true })
    writeFileSync(join(docsB, 'tarefas', 'abertas', 'TASK-ISO-02.json'), JSON.stringify({ id: 'TASK-ISO-02', estado: 'em-execucao' }, null, 2))

    const anteriorEnv = process.env['MENTOR_RAIZ']
    try {
      // Força MENTOR_RAIZ apontando para uma pasta externa
      process.env['MENTOR_RAIZ'] = repoIso

      const diag = descobrirWorktrees(repoIso)
      expect(diag.worktrees.length).toBe(2)

      const w2 = diag.worktrees.find((w) => resolve(w.caminho) === resolve(wtIso))
      expect(w2).toBeDefined()
      // A worktree 2 deve ler seu próprio projeto local (docsB), e não a raiz de MENTOR_RAIZ
      expect(w2!.tarefasEmExecucao).toEqual(['TASK-ISO-02'])
    } finally {
      if (anteriorEnv !== undefined) process.env['MENTOR_RAIZ'] = anteriorEnv
      else delete process.env['MENTOR_RAIZ']
    }
  })

  it('5. tolerancia a arvore ausente, detached ou sem mentor (CP-05)', () => {
    const repoTol = join(tempBase, 'repo-tolerancia')
    mkdirSync(repoTol, { recursive: true })

    spawnSync('git', ['init', '-b', 'main'], { cwd: repoTol, encoding: 'utf8' })
    spawnSync('git', ['config', 'user.name', 'Tester'], { cwd: repoTol, encoding: 'utf8' })
    spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoTol, encoding: 'utf8' })

    const docs = join(repoTol, 'docs-mentor')
    mkdirSync(join(docs, 'tarefas', 'abertas'), { recursive: true })
    writeFileSync(join(docs, 'contexto.json'), JSON.stringify({ limites: { em_execucao: 1 } }, null, 2))
    writeFileSync(join(repoTol, 'README.md'), '# Tol\n')

    spawnSync('git', ['add', '.'], { cwd: repoTol, encoding: 'utf8' })
    spawnSync('git', ['commit', '-m', 'init tol'], { cwd: repoTol, encoding: 'utf8' })

    // Worktree normal que será deletada do disco
    const wtApagada = join(tempBase, 'repo-tol-apagada')
    spawnSync('git', ['worktree', 'add', '-b', 'work/tol-apagada', wtApagada, 'main'], { cwd: repoTol, encoding: 'utf8' })
    rmSync(wtApagada, { recursive: true, force: true })

    // Worktree detached
    const wtDetached = join(tempBase, 'repo-tol-detached')
    spawnSync('git', ['worktree', 'add', '--detach', wtDetached, 'main'], { cwd: repoTol, encoding: 'utf8' })

    const diag = descobrirWorktrees(repoTol)
    expect(diag.worktrees.length).toBe(3)

    const wApagada = diag.worktrees.find((w) => resolve(w.caminho) === resolve(wtApagada))
    expect(wApagada).toBeDefined()
    expect(wApagada!.disponivel).toBe(false)
    expect(wApagada!.erro).toContain('indisponível')

    const wDetached = diag.worktrees.find((w) => resolve(w.caminho) === resolve(wtDetached))
    expect(wDetached).toBeDefined()
    expect(wDetached!.disponivel).toBe(true)
    expect(wDetached!.detached).toBe(true)
    expect(wDetached!.branch).toBe(null)
  })

  it('6. detecta possivel atribuicao duplicada quando o mesmo ID esta ativo em mais de uma worktree (CP-03)', () => {
    const repoDup = join(tempBase, 'repo-duplicidade')
    mkdirSync(repoDup, { recursive: true })

    spawnSync('git', ['init', '-b', 'main'], { cwd: repoDup, encoding: 'utf8' })
    spawnSync('git', ['config', 'user.name', 'Tester'], { cwd: repoDup, encoding: 'utf8' })
    spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoDup, encoding: 'utf8' })

    const docs = join(repoDup, 'docs-mentor')
    mkdirSync(join(docs, 'tarefas', 'abertas'), { recursive: true })
    writeFileSync(join(docs, 'contexto.json'), JSON.stringify({ limites: { em_execucao: 1 } }, null, 2))
    writeFileSync(join(docs, 'tarefas', 'abertas', 'TASK-DUP-001.json'), JSON.stringify({ id: 'TASK-DUP-001', estado: 'em-execucao' }, null, 2))
    writeFileSync(join(repoDup, 'README.md'), '# Dup\n')

    spawnSync('git', ['add', '.'], { cwd: repoDup, encoding: 'utf8' })
    spawnSync('git', ['commit', '-m', 'init dup'], { cwd: repoDup, encoding: 'utf8' })

    const wtDup = join(tempBase, 'repo-duplicidade-slot-2')
    spawnSync('git', ['worktree', 'add', '-b', 'work/dup-2', wtDup, 'main'], { cwd: repoDup, encoding: 'utf8' })

    // Slot 2 também declara a MESMA tarefa em execução
    const docs2 = join(wtDup, 'docs-mentor')
    mkdirSync(join(docs2, 'tarefas', 'abertas'), { recursive: true })
    writeFileSync(join(docs2, 'tarefas', 'abertas', 'TASK-DUP-001.json'), JSON.stringify({ id: 'TASK-DUP-001', estado: 'em-execucao' }, null, 2))

    const diag = descobrirWorktrees(repoDup)
    expect(diag.duplicidades.length).toBe(1)
    expect(diag.duplicidades[0]!.id).toBe('TASK-DUP-001')
    expect(diag.duplicidades[0]!.caminhos.length).toBe(2)
  })

  it('7. consulta e estritamente somente-leitura e conserva bytes e refs (CP-06)', () => {
    // Tira snapshot de arquivos do projeto atual antes
    const raizReal = resolve('.')
    const contextoPath = join(raizReal, 'docs', 'contexto.json')
    const hashAntes = existsSync(contextoPath) ? shaArquivo(contextoPath) : null

    const gitStatusAntes = spawnSync('git', ['status', '--porcelain'], { cwd: raizReal, encoding: 'utf8' }).stdout

    // Executa descobrirWorktrees e doctor
    const diag = descobrirWorktrees(raizReal)
    expect(diag).toBeDefined()
    expect(diag.worktrees.length).toBeGreaterThan(0)

    const gitStatusDepois = spawnSync('git', ['status', '--porcelain'], { cwd: raizReal, encoding: 'utf8' }).stdout
    const hashDepois = existsSync(contextoPath) ? shaArquivo(contextoPath) : null

    // Garante ausência total de modificações ou efeitos colaterais
    expect(gitStatusDepois).toBe(gitStatusAntes)
    if (hashAntes) {
      expect(hashDepois).toBe(hashAntes)
    }
  })
})

export function executarSuite(): { total: number; falhas: string[] } {
  return executarSuites()
}
