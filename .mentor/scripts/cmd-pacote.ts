import { createHash } from 'node:crypto'
import { join, relative } from 'node:path'
import { concluirInstalacao, copiarPacote, normasQueMudam } from './instalar.mjs'
import { MARCA_AREAS_FIM, MARCA_AREAS_INICIO, tabelaDasAreasDeRevisao } from './revisao-incremental.ts'
import {
  agoraIso, caminhos, escreverJson, escreverTexto, existe, lerJson, lerTexto, listar, raizPacote, raizProjeto,
} from './arquivos.ts'

/**
 * Manifesto do pacote: caminho -> hash de cada arquivo de `.mentor/`.
 *
 * Existe por causa de uma historia real: o pacote foi copiado a mao entre projetos e chegou
 * incompleto, e **nada comparava, entao nada avisava**. Editar `.mentor/` para destravar continua
 * permitido; o que deixa de ser possivel e' **esquecer que editou**.
 */
export interface Manifesto {
  versao: string
  gerado_em: string
  arquivos: Record<string, string>
}

const NOME = 'manifesto.json'

export function hashDe(texto: string): string {
  return createHash('sha256').update(texto).digest('hex').slice(0, 16)
}

function arquivosDoPacote(pasta: string): Array<[string, string]> {
  const alvos = ['.md', '.json', '.ts', '.mjs'].flatMap((ext) => listar(pasta, ext))
  return alvos
    .filter((a) => !a.endsWith(NOME))
    .map((a) => [relative(pasta, a).split('\\').join('/'), hashDe(lerTexto(a))] as [string, string])
    .sort((a, b) => a[0].localeCompare(b[0]))
}

/**
 * A tabela de areas de `processos/revisao.md` sai de `AREAS_DE_REVISAO`, antes do hash: o arquivo e'
 * do pacote, entao e' gerado aqui, no repositorio dele, e chega pronto aos projetos.
 */
function atualizarTabelaDeRevisao(pacote: string): void {
  const caminho = join(pacote, 'processos', 'revisao.md')
  if (!existe(caminho)) return
  const texto = lerTexto(caminho)
  const inicio = texto.indexOf(MARCA_AREAS_INICIO)
  const fim = texto.indexOf(MARCA_AREAS_FIM)
  if (inicio < 0 || fim < inicio) throw new Error('processos/revisao.md sem os marcadores da tabela de areas: nada foi gerado')
  const novo = texto.slice(0, inicio) + tabelaDasAreasDeRevisao() + texto.slice(fim + MARCA_AREAS_FIM.length)
  if (novo !== texto) escreverTexto(caminho, novo)
}

export function gerarManifesto(): void {
  const c = caminhos()
  atualizarTabelaDeRevisao(c.pacote)
  const r = raizProjeto()
  const caminhoPkg = existe(join(r, 'package.json')) ? join(r, 'package.json') : join(raizPacote(), 'package.json')
  const versao = existe(caminhoPkg) ? (lerJson<{ version?: string }>(caminhoPkg).version ?? '0.0.0') : '0.0.0'
  const m: Manifesto = {
    versao,
    gerado_em: agoraIso(),
    arquivos: Object.fromEntries(arquivosDoPacote(c.pacote)),
  }
  escreverJson(join(c.pacote, NOME), m)
  console.log(`Manifesto gerado: ${Object.keys(m.arquivos).length} arquivos, versao ${versao}.`)
}

export interface Divergencia {
  versao: string | null
  mudados: string[]
  faltando: string[]
  acrescentados: string[]
}

let manifestoLido: { pacote: string; arquivos: Record<string, string> | null } | null = null

/**
 * Arquivo de `.mentor/` igual ao que o manifesto registra: e' o pacote, nao mudanca do projeto.
 * Patch local (hash diferente) e arquivo acrescentado sao mudanca do projeto.
 *
 * ⚠️ **Uma regra so' para tres travas.** O hook tratava `.mentor/` inteiro como nao-codigo, o
 * `finalizar` exigia declarar todo arquivo do pacote no `plano.muda`, e a auditoria comparava com o
 * manifesto. Medido em campo: a atualizacao para a 0.7.0 precisou declarar `.mentor/**` para fechar.
 *
 * Sem manifesto nao ha como separar patch de pacote, entao tudo em `.mentor/` conta como pacote.
 * Compara com o manifesto **atual**: patch antigo sobrescrito por atualizacao ja' nao existe.
 */
export function arquivoIntactoDoPacote(caminhoRel: string): boolean {
  const norm = caminhoRel.replace(/\\/g, '/').replace(/^\.\//, '')
  if (!norm.startsWith('.mentor/')) return false
  const rel = norm.slice('.mentor/'.length)
  if (rel === NOME || rel === 'LEIA-ME-MANIFESTO.txt') return true
  const c = caminhos()
  if (manifestoLido?.pacote !== c.pacote) {
    const caminho = join(c.pacote, NOME)
    manifestoLido = { pacote: c.pacote, arquivos: existe(caminho) ? lerJson<Manifesto>(caminho).arquivos : null }
  }
  if (!manifestoLido.arquivos) return true
  const esperado = manifestoLido.arquivos[rel]
  if (!esperado) return false
  const abs = join(c.pacote, rel)
  return existe(abs) && hashDe(lerTexto(abs)) === esperado
}

/** `null` quando nao ha manifesto: o pacote foi copiado a mao, e ai' nao da' para comparar nada. */
export function conferirManifesto(): Divergencia | null {
  const c = caminhos()
  const caminho = join(c.pacote, NOME)
  if (!existe(caminho)) return null
  const m = lerJson<Manifesto>(caminho)
  const atual = new Map(arquivosDoPacote(c.pacote))
  const mudados: string[] = []
  const faltando: string[] = []
  for (const [arquivo, hash] of Object.entries(m.arquivos)) {
    const agora = atual.get(arquivo)
    if (agora === undefined) faltando.push(arquivo)
    else if (agora !== hash) mudados.push(arquivo)
  }
  const acrescentados = [...atual.keys()].filter((a) => !(a in m.arquivos))
  return { versao: m.versao, mudados, faltando, acrescentados }
}

/** Copia o pacote para dentro de um projeto. O `.mentor/` mora no repositorio, nao em node_modules. */
export function instalar(flags: Record<string, string | undefined>): void {
  const origem = raizPacote()
  const destino = flags.destino ?? process.cwd()
  const pastaDestino = join(destino, '.mentor')

  if (existe(pastaDestino) && !flags.forcar) {
    const d = conferirManifesto()
    console.error(`Ja existe .mentor/ em ${destino}.`)
    if (d && (d.mudados.length || d.faltando.length)) {
      console.error(`Atencao: ${d.mudados.length + d.faltando.length} arquivo(s) divergem da versao ${d.versao}.`)
      console.error('Reinstalar por cima descarta essas mudancas. Registre no relatorio de campo antes.')
    }
    console.error('Use --forcar para sobrescrever.')
    process.exitCode = 1
    return
  }

  // Medido antes de copiar, pela mesma funcao que o caminho de `node_modules` usa.
  const normas = flags.forcar ? normasQueMudam(origem, destino) : []
  const copia = copiarPacote(origem, destino, true, Boolean(flags['migrar-docs']))
  if (!copia.ok) {
    console.error(copia.erro)
    process.exitCode = 1
    return
  }
  // Manifesto primeiro, `package.json` so' como reserva. Rodando de dentro de um projeto ja
  // instalado, `origem` e' a raiz DELE, e o `package.json` de la e' o do app: a mensagem sairia
  // anunciando a versao do projeto do usuario como se fosse a do pacote. Irmao do achado 10,
  // encontrado varrendo a classe em vez de so' o call site reportado.
  const doManifesto = join(origem, '.mentor', NOME)
  const versao = existe(doManifesto)
    ? lerJson<{ versao?: string }>(doManifesto).versao ?? '0.0.0'
    : lerJson<{ version?: string }>(join(origem, 'package.json')).version ?? '0.0.0'
  console.log(`mentor-agent ${versao} instalado em ${destino}.`)
  // O resto e' igual ao caminho de `node_modules`, e mora num lugar so'.
  concluirInstalacao(destino, { normas, migrouDocs: Boolean(copia.migrouDocs) })

  if (!existe(join(pastaDestino, NOME))) {
    escreverTexto(join(destino, '.mentor', 'LEIA-ME-MANIFESTO.txt'),
      'Este pacote foi instalado sem manifesto: nao da para detectar divergencia.\n' +
      'Rode `mentor manifesto` no repositorio do pacote antes de empacotar.\n')
  }
}
