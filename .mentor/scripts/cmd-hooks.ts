import { spawnSync } from 'node:child_process'
import { caminhos, escreverTexto, existe } from './arquivos.ts'
import { carregarContexto } from './vistas.ts'
import { arquivoIntactoDoPacote } from './cmd-pacote.ts'
import { coletarAchados } from './cmd-verificar.ts'
import { ID_DE_TAREFA_NO_TITULO, MARCA_LIGHT_NO_TITULO } from './tipos.ts'
import { chmodSync } from 'node:fs'
import { join } from 'node:path'

function exigePr(texto: unknown): boolean {
  if (typeof texto !== 'string' || !texto.trim()) return false
  const t = texto.toLowerCase()
  if (t.includes('sem pr') || t.includes('dispensado') || t.includes('nao exige') || t.includes('nenhum')) return false
  return t.includes('pr') || t.includes('pull request') || t.includes('revisao')
}

function arquivoEhCodigo(arquivo: string): boolean {
  const norm = arquivo.replace(/\\/g, '/')
  // Pacote intacto nao e' codigo do projeto; patch local em `.mentor/` e'. A mesma regra do `finalizar` e da auditoria.
  if (norm.startsWith('.mentor/')) return !arquivoIntactoDoPacote(norm)
  if (
    norm.startsWith('docs-mentor/') ||
    norm.startsWith('docs/') ||
    norm.startsWith('.githooks/') ||
    norm.startsWith('.github/') ||
    norm.startsWith('.obsidian/')
  ) {
    return false
  }
  if (norm.endsWith('.md') || norm.endsWith('.txt') || norm === '.gitignore' || norm === '.gitattributes' || norm === 'LICENSE') {
    return false
  }
  return true
}

/**
 * O que roda **depois** dos gates. Os gates ficam no arquivo do hook (`node mentor.mjs gates`), e nao
 * aqui: ate' a 0.7.0 rodavam nos dois lugares, e todo push executava a suite inteira duas vezes.
 */
export function prePush(): number {
  const c = caminhos()
  if (!existe(join(c.raiz, '.git'))) return 0

  let ctx: any = null
  try { ctx = carregarContexto() } catch { return 0 }

  // 1. Mostrar o `verificar`, sem barrar. Medido em campo: reprovado chegou ao main e ficou dias sem
  // ninguem ver, porque nada o rodava. Barrar nao serve: tarefa em execucao e rascunho de stack tem
  // marcador legitimo, e travar o envio por eles vira laco. Quem barra e' a esteira.
  try {
    const achados = coletarAchados()
    if (achados.length) {
      console.warn(`\nAviso: o verificar tem ${achados.length} achado(s). O envio segue; a esteira pode barrar.`)
      for (const a of achados.slice(0, 10)) console.warn(`  [${a.familia}] ${a.onde}: ${a.problema}`)
      if (achados.length > 10) console.warn(`  ... e mais ${achados.length - 10}. Rode: node mentor.mjs verificar`)
    }
  } catch {
    // verificar quebrado nao pode travar o envio
  }

  const ramoPrincipal = ctx?.versionamento?.ramo_principal ?? 'main'
  const revisao = ctx?.versionamento?.revisao_antes_do_merge

  // 2. Verificar push direto no ramo principal com PR obrigatorio (GIT 5/5)
  const rRamo = spawnSync('git', ['branch', '--show-current'], { cwd: c.raiz, encoding: 'utf8' })
  const ramoAtual = (rRamo.stdout ?? '').trim()
  if (ramoAtual === ramoPrincipal && exigePr(revisao)) {
    console.error(
      `\nEnvio barrado: push direto no ramo principal "${ramoPrincipal}".\n` +
      `O projeto declara em docs-mentor/contexto.json (versionamento.revisao_antes_do_merge):\n` +
      `"${revisao}"\n` +
      `Crie uma branch de trabalho e envie uma Pull Request.\n`,
    )
    return 1
  }

  // 3. Verificar commits tocando codigo sem ID de tarefa (GIT 3/5)
  try {
    let revRange = `origin/${ramoPrincipal}..HEAD`
    const rChecaRef = spawnSync('git', ['rev-parse', '--verify', `origin/${ramoPrincipal}`], { cwd: c.raiz, encoding: 'utf8' })
    if (rChecaRef.status !== 0) {
      if (ramoAtual !== ramoPrincipal) revRange = `${ramoPrincipal}..HEAD`
      else revRange = 'HEAD~5..HEAD'
    }

    const rCommits = spawnSync('git', ['log', revRange, '--format=%H%x09%P%x09%s'], { cwd: c.raiz, encoding: 'utf8' })
    if (rCommits.status === 0 && rCommits.stdout) {
      const linhas = rCommits.stdout.split('\n').map((s) => s.trim()).filter(Boolean)
      for (const linha of linhas) {
        const [hash, paisStr, ...resto] = linha.split('\t')
        if (!hash) continue
        const titulo = resto.join('\t')
        const pais = (paisStr ?? '').split(' ').filter(Boolean)

        // Isencao: merge commits
        if (pais.length > 1 || titulo.startsWith('Merge ')) continue
        // Isencao: revert commits
        if (titulo.startsWith('Revert ')) continue

        // Verificar se toca codigo
        const rDiff = spawnSync('git', ['diff-tree', '--no-commit-id', '--name-only', '-r', hash], { cwd: c.raiz, encoding: 'utf8' })
        if (rDiff.status === 0 && rDiff.stdout) {
          const arquivos = rDiff.stdout.split('\n').map((s) => s.trim()).filter(Boolean)
          const arquivosCodigo = arquivos.filter(arquivoEhCodigo)
          if (arquivosCodigo.length > 0) {
            if (!ID_DE_TAREFA_NO_TITULO.test(titulo) && !MARCA_LIGHT_NO_TITULO.test(titulo)) {
              console.error(
                `\nEnvio barrado: commit sem ID de tarefa tocando codigo de producao.\n` +
                `Commit: ${hash.slice(0, 7)} - "${titulo}"\n` +
                `Arquivos afetados: ${arquivosCodigo.slice(0, 3).join(', ')}${arquivosCodigo.length > 3 ? '...' : ''}\n` +
                `O Nucleo §2 pede, para commit que toca codigo, uma das duas marcas no titulo:\n` +
                `  com tarefa:  <tipo>(<ID da tarefa>): <descricao>   ex: feat(TASK-RF-001): adicionar validacao\n` +
                `  Light:       <tipo>(light): <descricao>            ex: fix(light): corrigir typo no botao\n` +
                `Light e' lista fechada (nucleo §5): typo, formatacao, renomear arquivo, dependencia de desenvolvimento.\n` +
                `A auditoria lista todo commit Light para conferir se cabia na lista.\n` +
                `Para corrigir o titulo sem perder o trabalho: git rebase -i e "reword" no commit.\n`,
              )
              return 1
            }
          }
        }
      }
    }
  } catch {
    // continua
  }

  return 0
}

/**
 * Barreira local, sem dependencia nenhuma: um arquivo versionado mais `core.hooksPath`.
 *
 * Deliberadamente em **`pre-push`, nao em `pre-commit`**: commit precisa continuar barato, senao
 * alguem aprende a usar `--no-verify` e a barreira inteira deixa de existir.
 */
export function instalarHooks(): void {
  const c = caminhos()
  const pasta = join(c.raiz, '.githooks')
  const arquivo = join(pasta, 'pre-push')

  escreverTexto(arquivo, [
    '#!/bin/sh',
    '# Gerado por `mentor hooks --instalar`. Roda os gates e verificacoes de pre-push do mentor.',
    '# Em pre-push, nao em pre-commit: commit barato evita que alguem aprenda `--no-verify`.',
    'node mentor.mjs gates || exit 1',
    'node mentor.mjs hooks --pre-push "$@" || exit 1',
  ].join('\n'))
  try { chmodSync(arquivo, 0o755) } catch { /* Windows nao precisa, e nao falha por isso */ }

  const r = spawnSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: c.raiz, encoding: 'utf8' })
  if (r.status === 0) {
    console.log('Hook instalado em .githooks/pre-push e ligado por core.hooksPath.')
    console.log('Versionado junto do projeto: quem clonar so precisa rodar `mentor hooks --instalar`.')
  } else {
    console.log('Arquivo criado em .githooks/pre-push, mas nao consegui rodar o git aqui.')
    console.log('Ligue com: git config core.hooksPath .githooks')
  }
  if (!existe(join(c.raiz, '.git'))) {
    console.log('Aviso: este projeto ainda nao tem repositorio git.')
  }
}
