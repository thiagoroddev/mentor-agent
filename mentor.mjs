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
  const { copiarPacote, criarPontosDeEntrada } = await import('./.mentor/scripts/instalar.mjs')
  const args = process.argv.slice(2)
  if (args[0] !== 'instalar') {
    console.error('Instalado como dependencia, so `instalar` roda daqui.')
    console.error('  npx mentor instalar        copia .mentor/ e mentor.mjs para a raiz do projeto')
    console.error('Depois disso, use `node mentor.mjs <comando>` na raiz.')
    process.exitCode = 1
  } else {
    const i = args.indexOf('--destino')
    const destino = i >= 0 && args[i + 1] ? args[i + 1] : process.cwd()
    const r = copiarPacote(aqui, destino, args.includes('--forcar'))
    if (!r.ok) {
      console.error(`${r.erro}\nUse --forcar para sobrescrever.`)
      process.exitCode = 1
    } else {
      console.log(`mentor-agent instalado em ${destino}.`)
      const e = criarPontosDeEntrada(destino)
      if (e.criados.length) console.log(`Ponto de entrada criado: ${e.criados.join(', ')}.`)
      if (e.preservados.length) {
        console.log(`\nJa existia, e nao foi tocado: ${e.preservados.join(', ')}.`)
        console.log('Cole nele, para a ferramenta carregar as leis:')
        for (const arq of e.preservados) {
          console.log(arq === 'CLAUDE.md'
            ? '  CLAUDE.md:  @.mentor/nucleo.md'
            : `  ${arq}:  Antes de qualquer outra coisa, leia \`.mentor/nucleo.md\`.`)
        }
      }
      console.log('\nProximo passo: `node mentor.mjs init`, e depois responder os portoes V, C e 0.')
    }
  }
} else {
  await import('./.mentor/scripts/cli.ts')
}
