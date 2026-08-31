import { spawnSync } from 'node:child_process'
import { caminhos, escreverTexto, existe } from './arquivos.ts'
import { chmodSync } from 'node:fs'
import { join } from 'node:path'

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
    '# Gerado por `mentor hooks --instalar`. Roda os gates declarados em docs-mentor/contexto.json.',
    '# Em pre-push, nao em pre-commit: commit barato evita que alguem aprenda `--no-verify`.',
    'node mentor.mjs gates || {',
    '  echo ""',
    '  echo "Envio barrado: gate reprovado. Conserte, ou envie com --no-verify e assuma."',
    '  exit 1',
    '}',
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
