/**
 * O subconjunto da API do Vitest que os testes de campo usam, para rodarem pelo `executar.ts`.
 *
 * Os testes nasceram no projeto piloto, escritos em Vitest, protegendo correcoes feitas no `.mentor/`
 * de la'. Reescreve-los no estilo dos cenarios trocaria 2 mil linhas provadas por 2 mil linhas novas,
 * e a pergunta "o teste portado ainda prova o mesmo?" ficaria sem resposta. Com este adaptador, o
 * arquivo vem igual, so' com o `import` trocado. Matcher que nao esta' aqui falha alto, nunca passa.
 */

type Funcao = () => void

interface Suite {
  nome: string
  antes: Funcao[]
  depois: Funcao[]
  testes: Array<{ nome: string; fn: Funcao }>
}

const suites: Suite[] = []
let atual: Suite | null = null

export function describe(nome: string, fn: Funcao, _tempo?: number): void {
  const anterior = atual
  const suite: Suite = { nome: anterior ? `${anterior.nome} > ${nome}` : nome, antes: [], depois: [], testes: [] }
  suites.push(suite)
  atual = suite
  try {
    fn()
  } finally {
    atual = anterior
  }
}

function suiteAtual(oQue: string): Suite {
  if (!atual) throw new Error(`${oQue} fora de describe: o adaptador so' conhece testes agrupados`)
  return atual
}

/** Sem condicao verdadeira, o grupo nem e' coletado: igual ao Vitest, que nao roda o que pulou. */
describe.skipIf = (pular: boolean) => (nome: string, fn: Funcao, tempo?: number): void => {
  if (!pular) describe(nome, fn, tempo)
}

// O tempo limite do Vitest e' aceito e ignorado: aqui tudo e' sincrono, nada fica pendurado.
export const it = (nome: string, fn: Funcao, _tempo?: number): void => { suiteAtual('it').testes.push({ nome, fn }) }
export const test = it
export const beforeAll = (fn: Funcao, _tempo?: number): void => { suiteAtual('beforeAll').antes.push(fn) }
export const afterAll = (fn: Funcao, _tempo?: number): void => { suiteAtual('afterAll').depois.push(fn) }

/** Roda tudo o que foi registrado e devolve as falhas, uma linha por teste. */
export function executarSuites(): { total: number; falhas: string[] } {
  const falhas: string[] = []
  let total = 0
  for (const s of suites) {
    let preparou = true
    for (const fn of s.antes) {
      try { fn() } catch (e) { preparou = false; falhas.push(`${s.nome} [beforeAll]: ${mensagem(e)}`) }
    }
    for (const t of s.testes) {
      total++
      if (!preparou) { falhas.push(`${s.nome} > ${t.nome}: nao rodou, o beforeAll falhou`); continue }
      try { t.fn() } catch (e) { falhas.push(`${s.nome} > ${t.nome}: ${mensagem(e)}`) }
    }
    for (const fn of s.depois) {
      try { fn() } catch (e) { falhas.push(`${s.nome} [afterAll]: ${mensagem(e)}`) }
    }
  }
  return { total, falhas }
}

function mensagem(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

const mostrar = (v: unknown): string => {
  try {
    const s = typeof v === 'string' ? JSON.stringify(v) : JSON.stringify(v) ?? String(v)
    return s.length > 300 ? `${s.slice(0, 300)}...` : s
  } catch {
    return String(v)
  }
}

/** Igualdade do `toEqual`: recursiva, e propriedade `undefined` conta como ausente. */
function igual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => igual(x, b[i]))
  const ra = a as Record<string, unknown>
  const rb = b as Record<string, unknown>
  const chaves = new Set([...Object.keys(ra), ...Object.keys(rb)])
  for (const k of chaves) if (!igual(ra[k], rb[k])) return false
  return true
}

/** Subconjunto do `toMatchObject`: o esperado cabe dentro do recebido. */
function contem(recebido: unknown, esperado: unknown): boolean {
  if (typeof esperado !== 'object' || esperado === null) return igual(recebido, esperado)
  if (typeof recebido !== 'object' || recebido === null) return false
  if (Array.isArray(esperado)) {
    return Array.isArray(recebido) && recebido.length === esperado.length && esperado.every((x, i) => contem(recebido[i], x))
  }
  const r = recebido as Record<string, unknown>
  return Object.entries(esperado as Record<string, unknown>).every(([k, v]) => contem(r[k], v))
}

function matchers(recebido: unknown, negado: boolean, contexto?: string) {
  const conferir = (passou: boolean, descricao: string): void => {
    if (passou !== negado) return
    const extra = contexto ? `\n        ${contexto.slice(0, 600)}` : ''
    throw new Error(`esperava ${negado ? 'que NAO ' : ''}${descricao}; recebeu ${mostrar(recebido)}${extra}`)
  }
  return {
    toBe: (esperado: unknown) => conferir(Object.is(recebido, esperado), `fosse ${mostrar(esperado)}`),
    toEqual: (esperado: unknown) => conferir(igual(recebido, esperado), `igualasse ${mostrar(esperado)}`),
    toMatchObject: (esperado: unknown) => conferir(contem(recebido, esperado), `contivesse ${mostrar(esperado)}`),
    toContain: (item: unknown) => {
      const passou = typeof recebido === 'string'
        ? typeof item === 'string' && recebido.includes(item)
        : Array.isArray(recebido) && recebido.includes(item)
      conferir(passou, `contivesse ${mostrar(item)}`)
    },
    toBeDefined: () => conferir(recebido !== undefined, 'estivesse definido'),
    toBeUndefined: () => conferir(recebido === undefined, 'fosse undefined'),
    toBeNull: () => conferir(recebido === null, 'fosse null'),
    toBeTruthy: () => conferir(Boolean(recebido), 'fosse verdadeiro'),
    toBeGreaterThan: (n: number) => conferir(typeof recebido === 'number' && recebido > n, `fosse maior que ${n}`),
    toBeLessThanOrEqual: (n: number) => conferir(typeof recebido === 'number' && recebido <= n, `fosse menor ou igual a ${n}`),
    toThrow: (esperado?: string | RegExp) => {
      if (typeof recebido !== 'function') throw new Error('toThrow precisa de uma funcao')
      let erro: unknown = null
      let lancou = false
      try { (recebido as Funcao)() } catch (e) { lancou = true; erro = e }
      const msg = lancou ? mensagem(erro) : ''
      const casou = lancou && (esperado === undefined ||
        (typeof esperado === 'string' ? msg.includes(esperado) : esperado.test(msg)))
      if (casou === negado) {
        throw new Error(`esperava ${negado ? 'que NAO ' : ''}lancasse${esperado ? ` ${mostrar(String(esperado))}` : ''}; ${lancou ? `lancou "${msg}"` : 'nao lancou'}`)
      }
    },
  }
}

/** O segundo argumento e' a mensagem extra do Vitest: aparece junto da falha. */
export function expect(recebido: unknown, contexto?: string) {
  return { ...matchers(recebido, false, contexto), not: matchers(recebido, true, contexto) }
}
