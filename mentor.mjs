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
  const { copiarPacote } = await import('./.mentor/scripts/instalar.mjs')
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
      console.log('Proximo passo: `node mentor.mjs init`, e depois responder os portoes V, C e 0.')
    }
  }
} else {
  await import('./.mentor/scripts/cli.ts')
}
