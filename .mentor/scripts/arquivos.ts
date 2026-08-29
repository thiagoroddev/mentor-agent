import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Onde o pacote mora. Sai do proprio arquivo, nunca do diretorio de trabalho: assim um projeto
 * pode viver em qualquer lugar, inclusive dentro do repositorio do pacote, como os exemplos de teste.
 */
export function raizPacote(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
}

/**
 * Onde o projeto mora. Em uso normal e' a mesma pasta do pacote; em teste, cada mini-projeto tem
 * a sua. A ordem de resolucao e' explicita de proposito:
 *   1. `MENTOR_RAIZ`, para quem sabe o que quer
 *   2. o ancestral mais proximo que ja' tem `docs/contexto.json`, que e' o projeto inicializado
 *   3. o ancestral mais proximo que tem `.mentor`, que e' o caso de antes do `init`
 */
export function raizProjeto(partida: string = process.cwd()): string {
  const declarada = process.env['MENTOR_RAIZ']
  if (declarada) return resolve(declarada)

  let atual = resolve(partida)
  const candidatos: string[] = []
  for (;;) {
    if (existsSync(join(atual, 'docs', 'contexto.json'))) return atual
    if (existsSync(join(atual, '.mentor'))) candidatos.push(atual)
    const pai = dirname(atual)
    if (pai === atual) break
    atual = pai
  }
  const primeiro = candidatos[0]
  if (primeiro) return primeiro
  throw new Error(
    'Nao achei um projeto subindo a partir de ' + partida +
    '. Rode `mentor init` na pasta do projeto, ou declare MENTOR_RAIZ.',
  )
}

/** Compatibilidade: quem so' quer "a raiz" quer a do projeto. */
export const raiz = raizProjeto

/**
 * O pacote **que este projeto usa**, que nao e' necessariamente o que esta' rodando.
 * Instalado, `.mentor/` vive no repositorio do projeto, e e' esse que a IA le' e que o `verificar`
 * confere. So' quando o projeto nao tem copia propria e' que se cai no pacote em execucao.
 */
function pacoteDoProjeto(r: string): string {
  const local = join(r, '.mentor')
  return existsSync(local) ? local : join(raizPacote(), '.mentor')
}

export const caminhos = (r: string = raizProjeto()) => ({
  raiz: r,
  pacote: pacoteDoProjeto(r),
  esquemas: join(pacoteDoProjeto(r), 'esquemas'),
  tetos: join(pacoteDoProjeto(r), 'tetos.json'),
  docs: join(r, 'docs'),
  contexto: join(r, 'docs', 'contexto.json'),
  contextoMd: join(r, 'docs', 'contexto.md'),
  requisitos: join(r, 'docs', 'requisitos', 'requisitos.json'),
  tarefas: join(r, 'docs', 'tarefas'),
  abertas: join(r, 'docs', 'tarefas', 'abertas'),
  concluidas: join(r, 'docs', 'tarefas', 'concluidas'),
  backlog: join(r, 'docs', 'tarefas', 'backlog.md'),
  recusas: join(r, 'docs', 'tarefas', 'recusas.json'),
  reservaMd: join(r, 'docs', 'tarefas', 'reserva.md'),
  indiceConcluidas: join(r, 'docs', 'tarefas', 'concluidas', '0-indice.md'),
  dividas: join(r, 'docs', 'dividas', 'dividas.json'),
  riscos: join(r, 'docs', 'seguranca', 'riscos-aceitos.json'),
  stack: join(r, 'docs', 'padroes-de-stack'),
  adr: join(r, 'docs', 'arquitetura', 'ADR'),
})

export function garantirPasta(caminho: string): void {
  mkdirSync(caminho, { recursive: true })
}

export function lerJson<T>(caminho: string): T {
  return JSON.parse(readFileSync(caminho, 'utf8')) as T
}

export function escreverJson(caminho: string, dado: unknown): void {
  garantirPasta(dirname(caminho))
  writeFileSync(caminho, JSON.stringify(dado, null, 2) + '\n', 'utf8')
}

export function lerTexto(caminho: string): string {
  return readFileSync(caminho, 'utf8')
}

export function escreverTexto(caminho: string, texto: string): void {
  garantirPasta(dirname(caminho))
  writeFileSync(caminho, texto.endsWith('\n') ? texto : texto + '\n', 'utf8')
}

export function existe(caminho: string): boolean {
  return existsSync(caminho)
}

/** Lista arquivos com a extensao dada, recursivamente. Devolve caminhos absolutos. */
export function listar(pasta: string, extensao: string): string[] {
  if (!existsSync(pasta)) return []
  const achados: string[] = []
  for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, entrada.name)
    if (entrada.isDirectory()) achados.push(...listar(caminho, extensao))
    else if (entrada.name.endsWith(extensao)) achados.push(caminho)
  }
  return achados.sort()
}

export function relativo(caminho: string, r: string = raizProjeto()): string {
  return relative(r, caminho).split('\\').join('/')
}

const doisDigitos = (n: number) => String(n).padStart(2, '0')

/**
 * `MENTOR_AGORA` congela o relogio. Existe para os exemplos de teste sairem byte a byte iguais a
 * cada execucao: sem isso, cada rodada mudaria toda data e o diff do git viraria ruido.
 */
function relogio(): Date {
  const congelado = process.env['MENTOR_AGORA']
  return congelado ? new Date(congelado) : new Date()
}

/**
 * Data e hora nunca se digitam. Justificativa medida no antecessor: de 37 registros
 * concluidos com log datado, 19 tinham timestamp fora do intervalo declarado no proprio cabecalho.
 */
export function agora(d: Date = relogio()) {
  const dia = doisDigitos(d.getDate())
  const mes = doisDigitos(d.getMonth() + 1)
  const hora = doisDigitos(d.getHours())
  const min = doisDigitos(d.getMinutes())
  return {
    log: `${dia}/${mes}/${doisDigitos(d.getFullYear() % 100)} ${hora}:${min}`,
    nome: `${d.getFullYear()}-${mes}-${dia}--${hora}h${min}`,
    iso: d.toISOString(),
  }
}

/** Quantos dias se passaram desde um carimbo `DD/MM/AA HH:MM`. `null` se nao der para ler. */
export function diasDesde(log: string | null): number | null {
  if (!log) return null
  const casou = /^(\d{2})\/(\d{2})\/(\d{2})/.exec(log.trim())
  if (!casou) return null
  const [, dia, mes, ano] = casou
  const quando = new Date(2000 + Number(ano), Number(mes) - 1, Number(dia))
  if (Number.isNaN(quando.getTime())) return null
  return Math.floor((relogio().getTime() - quando.getTime()) / 86_400_000)
}

/** Mesma fonte de tempo do `agora()`, para o carimbo tecnico dos JSON. */
export function agoraIso(): string {
  return relogio().toISOString()
}
