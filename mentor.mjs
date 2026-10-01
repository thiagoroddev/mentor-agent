#!/usr/bin/env node
// Atalho de linha de comando. Existe para nao precisar digitar o caminho dos scripts,
// e para fugir do `--` que o npm exige antes de repassar flags.
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))

// O Node nao remove tipos de arquivo dentro de `node_modules`. Entao, enquanto o pacote e' so' uma
// dependencia, este arquivo nao pode importar `.ts` nenhum — nem indiretamente. Ele faz a unica
// coisa que precisa fazer ali (copiar-se para dentro do projeto) e todos os outros comandos passam
// a rodar da raiz, onde a remocao de tipos funciona. Medido: sem isto, `npx mentor instalar` morre.
if (aqui.split(/[\\/]/).includes('node_modules')) {
  const { concluirInstalacao, copiarPacote, normasQueMudam } = await import('./.mentor/scripts/instalar.mjs')
  const args = process.argv.slice(2)
  if (args[0] !== 'instalar') {
    console.error('Instalado como dependencia, so `instalar` roda daqui.')
    console.error('  npx mentor instalar        copia .mentor/ e mentor.mjs para a raiz do projeto')
    console.error('Depois disso, use `node mentor.mjs <comando>` na raiz.')
    process.exitCode = 1
  } else {
    const i = args.indexOf('--destino')
    const destino = i >= 0 && args[i + 1] ? args[i + 1] : process.cwd()
    // Medido antes de copiar: depois, o projeto ja' tem as leis novas e nao sobra com o que comparar.
    const normas = args.includes('--forcar') ? normasQueMudam(aqui, destino) : []
    const r = copiarPacote(aqui, destino, args.includes('--forcar'), args.includes('--migrar-docs'))
    if (!r.ok) {
      console.error(r.erro)
      if (r.erro.startsWith('Ja existe .mentor/')) console.error('Use --forcar para sobrescrever.')
      process.exitCode = 1
    } else {
      console.log(`mentor-agent instalado em ${destino}.`)
      concluirInstalacao(destino, { normas, migrouDocs: r.migrouDocs })
    }
  }
} else {
  await import('./.mentor/scripts/cli.ts')
}
