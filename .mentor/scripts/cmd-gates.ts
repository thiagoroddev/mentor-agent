import { spawnSync } from 'node:child_process'
import { caminhos } from './arquivos.ts'
import { carregarContexto } from './vistas.ts'

/**
 * Roda todos os gates declarados pelo projeto e reprova se algum falhar.
 * E' o que o hook de pre-push chama: assim a barreira usa **os comandos do projeto**, nao um
 * `npm run` suposto pelo pacote.
 */
export function gates(): number {
  const ctx = carregarContexto()
  const declarados = Object.entries(ctx.gates).filter(([, g]) => g?.comando)
  if (declarados.length === 0) {
    console.log('Nenhum gate declarado em docs-mentor/contexto.json. Declarar e a primeira coisa a resolver.')
    return 0
  }
  let reprovou = 0
  for (const [nome, g] of declarados) {
    const comando = g?.comando
    if (!comando) continue
    const r = spawnSync(comando, { shell: true, stdio: 'inherit', cwd: caminhos().raiz })
    const ok = r.status === 0
    if (!ok) reprovou++
    console.log(`${ok ? '✓' : '✗'} ${nome}: ${comando}`)
  }
  console.log(reprovou === 0 ? '\nTodos os gates verdes.' : `\n${reprovou} gate(s) reprovado(s).`)
  return reprovou === 0 ? 0 : 1
}
