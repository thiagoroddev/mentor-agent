import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, executarSuites } from './vitest-local.ts'
import { estaEmRepositorioGit, obterArquivosEmConflitoNoGit, resolverGerados } from '../.mentor/scripts/cmd-resolver.ts'

describe('Fatia C: Resolvedor de gerados com falhas verificáveis', () => {
  let tempBase: string

  beforeAll(() => {
    tempBase = mkdtempSync(join(tmpdir(), 'mentor-res-test-'))
  })

  afterAll(() => {
    rmSync(tempBase, { recursive: true, force: true })
  })

  it('1. merge valido de 3 vias preserva semantica de ambos os lados e zera conflitos no indice (CP-07)', () => {
    const repo = join(tempBase, 'repo-cp07')
    mkdirSync(repo, { recursive: true })

    spawnSync('git', ['init', '-b', 'main'], { cwd: repo, encoding: 'utf8' })
    spawnSync('git', ['config', 'user.name', 'Tester'], { cwd: repo, encoding: 'utf8' })
    spawnSync('git', ['config', 'user.email', 'tester@example.com'], { cwd: repo, encoding: 'utf8' })

    const docs = join(repo, 'docs-mentor')
    mkdirSync(join(docs, 'tarefas'), { recursive: true })

    const ctxBase = {
      _meta: { schema: 'contexto-projeto/1' },
      projeto: { nome: 'cp07' },
      estado: {
        fase: 'construcao',
        portoes: {
          V_negocio: { status: 'respondido' },
          C_obrigacoes: { status: 'aberto' },
        },
      },
      ferramentas: [],
      auditoria: { ultima_na_tarefa: 10 },
    }

    writeFileSync(join(docs, 'contexto.json'), JSON.stringify(ctxBase, null, 2) + '\n')
    writeFileSync(join(docs, 'tarefas', 'recusas.jsonl'), '{"quando":"01/10/26","alvo":"TASK-01","impedimentos":["e1"]}\n')
    writeFileSync(join(repo, 'README.md'), '# CP07\n')

    spawnSync('git', ['add', '.'], { cwd: repo, encoding: 'utf8' })
    spawnSync('git', ['commit', '-m', 'commit base'], { cwd: repo, encoding: 'utf8' })

    // Branch A: responde portão C e adiciona recusa 2
    spawnSync('git', ['checkout', '-b', 'branch-a'], { cwd: repo, encoding: 'utf8' })
    const ctxA = JSON.parse(JSON.stringify(ctxBase))
    ctxA.estado.portoes.C_obrigacoes.status = 'respondido'
    ctxA.auditoria.ultima_na_tarefa = 12
    writeFileSync(join(docs, 'contexto.json'), JSON.stringify(ctxA, null, 2) + '\n')
    writeFileSync(join(docs, 'tarefas', 'recusas.jsonl'), '{"quando":"01/10/26","alvo":"TASK-01","impedimentos":["e1"]}\n{"quando":"02/10/26","alvo":"TASK-02","impedimentos":["e2"]}\n')
    spawnSync('git', ['commit', '-am', 'branch A'], { cwd: repo, encoding: 'utf8' })

    // Branch B a partir da main: adiciona ferramenta e adiciona recusa 3
    spawnSync('git', ['checkout', 'main'], { cwd: repo, encoding: 'utf8' })
    spawnSync('git', ['checkout', '-b', 'branch-b'], { cwd: repo, encoding: 'utf8' })
    const ctxB = JSON.parse(JSON.stringify(ctxBase))
    ctxB.ferramentas.push({ nome: 'vitest', padrao: 'docs-mentor/padroes-de-stack/vitest.md' })
    ctxB.auditoria.ultima_na_tarefa = 11
    writeFileSync(join(docs, 'contexto.json'), JSON.stringify(ctxB, null, 2) + '\n')
    writeFileSync(join(docs, 'tarefas', 'recusas.jsonl'), '{"quando":"01/10/26","alvo":"TASK-01","impedimentos":["e1"]}\n{"quando":"03/10/26","alvo":"TASK-03","impedimentos":["e3"]}\n')
    spawnSync('git', ['commit', '-am', 'branch B'], { cwd: repo, encoding: 'utf8' })

    // Realiza merge gerando conflito
    spawnSync('git', ['merge', 'branch-a'], { cwd: repo, encoding: 'utf8' })

    // Confirma que git colocou arquivos em conflito no índice
    const unmergedAntes = obterArquivosEmConflitoNoGit(repo)
    expect(unmergedAntes.length).toBeGreaterThan(0)

    // Executa resolverGerados
    const status = resolverGerados(repo)
    expect(status).toBe(0)

    // Índice deve estar sem unmerged
    const unmergedDepois = obterArquivosEmConflitoNoGit(repo)
    expect(unmergedDepois.length).toBe(0)

    // Conteúdo final mesclou ambas as alterações
    const ctxFinal = JSON.parse(readFileSync(join(docs, 'contexto.json'), 'utf8'))
    expect(ctxFinal.estado.portoes.C_obrigacoes.status).toBe('respondido')
    expect(ctxFinal.ferramentas.some((f: any) => f.nome === 'vitest')).toBe(true)
    expect(ctxFinal.auditoria.ultima_na_tarefa).toBe(12)

    // Recusas possui todas as linhas
    const recFinal = readFileSync(join(docs, 'tarefas', 'recusas.jsonl'), 'utf8')
    expect(recFinal).toContain('TASK-01')
    expect(recFinal).toContain('TASK-02')
    expect(recFinal).toContain('TASK-03')
  })

  it('2. falha de parse/fusao em fonte tratada retorna 1 e NAO adiciona fonte ao stage (CP-08)', () => {
    const repo = join(tempBase, 'repo-cp08')
    mkdirSync(repo, { recursive: true })

    spawnSync('git', ['init', '-b', 'main'], { cwd: repo, encoding: 'utf8' })
    spawnSync('git', ['config', 'user.name', 'Tester'], { cwd: repo, encoding: 'utf8' })
    spawnSync('git', ['config', 'user.email', 'tester@example.com'], { cwd: repo, encoding: 'utf8' })

    const docs = join(repo, 'docs-mentor')
    mkdirSync(docs, { recursive: true })

    writeFileSync(join(docs, 'contexto.json'), '{"projeto":{"nome":"cp08"}}\n')
    writeFileSync(join(repo, 'README.md'), '# CP08\n')
    spawnSync('git', ['add', '.'], { cwd: repo, encoding: 'utf8' })
    spawnSync('git', ['commit', '-m', 'base'], { cwd: repo, encoding: 'utf8' })

    // Branch A: JSON malformado de propósito
    spawnSync('git', ['checkout', '-b', 'corrupt-a'], { cwd: repo, encoding: 'utf8' })
    writeFileSync(join(docs, 'contexto.json'), '{\ninvalid_json: true\n')
    spawnSync('git', ['commit', '-am', 'corrupt json'], { cwd: repo, encoding: 'utf8' })

    // Branch B: JSON válido com alteração
    spawnSync('git', ['checkout', 'main'], { cwd: repo, encoding: 'utf8' })
    spawnSync('git', ['checkout', '-b', 'valid-b'], { cwd: repo, encoding: 'utf8' })
    writeFileSync(join(docs, 'contexto.json'), '{"projeto":{"nome":"cp08-mudou"}}\n')
    spawnSync('git', ['commit', '-am', 'valid json'], { cwd: repo, encoding: 'utf8' })

    // Merge gera conflito
    spawnSync('git', ['merge', 'corrupt-a'], { cwd: repo, encoding: 'utf8' })

    // Executa resolverGerados
    const status = resolverGerados(repo)
    expect(status).toBe(1)

    // O arquivo em falha NÃO deve ter sido staged como resolvido
    const unmerged = obterArquivosEmConflitoNoGit(repo)
    const relCtx = join('docs-mentor', 'contexto.json').replace(/\\/g, '/')
    expect(unmerged.some((u) => u.replace(/\\/g, '/') === relCtx)).toBe(true)

    // O arquivo ainda contém evidência de conflito
    const conteudoDisco = readFileSync(join(docs, 'contexto.json'), 'utf8')
    expect(conteudoDisco).toContain('<<<<<<<')
  })

  it('3. conflito fora da cobertura conserva conteudo, nao resolve na forca e retorna 1 com caminho acionavel (CP-09)', () => {
    const repo = join(tempBase, 'repo-cp09')
    mkdirSync(repo, { recursive: true })

    spawnSync('git', ['init', '-b', 'main'], { cwd: repo, encoding: 'utf8' })
    spawnSync('git', ['config', 'user.name', 'Tester'], { cwd: repo, encoding: 'utf8' })
    spawnSync('git', ['config', 'user.email', 'tester@example.com'], { cwd: repo, encoding: 'utf8' })

    const docs = join(repo, 'docs-mentor')
    mkdirSync(join(repo, 'src'), { recursive: true })
    mkdirSync(docs, { recursive: true })

    writeFileSync(join(docs, 'contexto.json'), '{"projeto":{"nome":"cp09"}}\n')
    writeFileSync(join(repo, 'src', 'app.ts'), 'export const versao = "1.0";\n')
    spawnSync('git', ['add', '.'], { cwd: repo, encoding: 'utf8' })
    spawnSync('git', ['commit', '-m', 'base'], { cwd: repo, encoding: 'utf8' })

    // Branch A: altera código e contexto
    spawnSync('git', ['checkout', '-b', 'mod-a'], { cwd: repo, encoding: 'utf8' })
    writeFileSync(join(docs, 'contexto.json'), '{"projeto":{"nome":"cp09"},"modulo":"A"}\n')
    writeFileSync(join(repo, 'src', 'app.ts'), 'export const versao = "2.0-A";\n')
    spawnSync('git', ['commit', '-am', 'mod A'], { cwd: repo, encoding: 'utf8' })

    // Branch B: altera código e contexto conflitante
    spawnSync('git', ['checkout', 'main'], { cwd: repo, encoding: 'utf8' })
    spawnSync('git', ['checkout', '-b', 'mod-b'], { cwd: repo, encoding: 'utf8' })
    writeFileSync(join(docs, 'contexto.json'), '{"projeto":{"nome":"cp09"},"modulo":"B"}\n')
    writeFileSync(join(repo, 'src', 'app.ts'), 'export const versao = "2.0-B";\n')
    spawnSync('git', ['commit', '-am', 'mod B'], { cwd: repo, encoding: 'utf8' })

    // Merge gera conflito em src/app.ts e contexto.json
    spawnSync('git', ['merge', 'mod-a'], { cwd: repo, encoding: 'utf8' })

    // Executa resolverGerados
    const status = resolverGerados(repo)
    expect(status).toBe(1)

    // contexto.json foi resolvido
    const unmerged = obterArquivosEmConflitoNoGit(repo)
    const relApp = join('src', 'app.ts').replace(/\\/g, '/')
    expect(unmerged.some((u) => u.replace(/\\/g, '/') === relApp)).toBe(true)

    // src/app.ts não foi sobrescrito nem alterado por resolverGerados
    const conteudoApp = readFileSync(join(repo, 'src', 'app.ts'), 'utf8')
    expect(conteudoApp).toContain('<<<<<<<')
    expect(conteudoApp).toContain('export const versao = "2.0-A";')
    expect(conteudoApp).toContain('export const versao = "2.0-B";')
  })

  it('4. ambiente fora do Git: regenera vistas em fontes sem marcadores, ou falha se houver marcadores sem base', () => {
    const fora = join(tempBase, 'fora-do-git')
    mkdirSync(join(fora, 'docs-mentor'), { recursive: true })

    // Sem Git e sem marcadores de conflito
    writeFileSync(join(fora, 'docs-mentor', 'contexto.json'), JSON.stringify({
      _meta: { schema: 'contexto-projeto/1' },
      projeto: { nome: 'sem-git' },
      estado: { fase: 'ideia', portoes: {} },
    }, null, 2))

    expect(estaEmRepositorioGit(fora)).toBe(false)
    const statusOk = resolverGerados(fora)
    expect(statusOk).toBe(0)

    // Se arquivo contiver marcadores de conflito fora do Git: falha com 1
    writeFileSync(join(fora, 'docs-mentor', 'contexto.json'), '<<<<<<<\nours\n=======\ntheirs\n>>>>>>>\n')
    const statusErro = resolverGerados(fora)
    expect(statusErro).toBe(1)
  })
})

export function executarSuite(): { total: number; falhas: string[] } {
  return executarSuites()
}
