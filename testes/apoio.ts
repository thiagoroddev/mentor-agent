import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const RAIZ_REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Relogio congelado: sem isso, cada rodada mudaria toda data e o diff do git viraria ruido. */
export const RELOGIO = '2026-08-29T14:00:00'

export interface Cenario {
  nome: string
  pasta: string
  falhas: string[]
}

/** Apaga so' o `docs/` do exemplo: o que o cenario nao gera nao deveria estar la'. */
export function abrirCenario(nome: string): Cenario {
  const pasta = join(RAIZ_REPO, 'testes', 'exemplos', nome)
  rmSync(join(pasta, 'docs'), { recursive: true, force: true })
  mkdirSync(pasta, { recursive: true })
  return { nome, pasta, falhas: [] }
}

export interface Resultado {
  codigo: number
  saida: string
}

export function mentor(c: Cenario, ...args: string[]): Resultado {
  const r = spawnSync(process.execPath, [join(RAIZ_REPO, 'mentor.mjs'), ...args], {
    encoding: 'utf8',
    cwd: RAIZ_REPO,
    env: { ...process.env, MENTOR_RAIZ: c.pasta, MENTOR_AGORA: RELOGIO },
  })
  return { codigo: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() }
}

export function ler(c: Cenario, relativo: string): string {
  return readFileSync(join(c.pasta, relativo), 'utf8')
}

export function lerJson<T>(c: Cenario, relativo: string): T {
  return JSON.parse(ler(c, relativo)) as T
}

export function escrever(c: Cenario, relativo: string, conteudo: string): void {
  const destino = join(c.pasta, relativo)
  mkdirSync(dirname(destino), { recursive: true })
  writeFileSync(destino, conteudo, 'utf8')
}

export function apagar(c: Cenario, relativo: string): void {
  rmSync(join(c.pasta, relativo), { force: true })
}

export function confere(c: Cenario, condicao: boolean, oQue: string): void {
  if (!condicao) c.falhas.push(oQue)
}

/** A checagem mais usada: o comando disse o que devia dizer. */
export function dizQue(c: Cenario, r: Resultado, trecho: string, oQue: string): void {
  if (!r.saida.includes(trecho)) {
    c.falhas.push(`${oQue}\n      esperava conter: ${trecho}\n      saiu:            ${r.saida.split('\n')[0] ?? '(nada)'}`)
  }
}
