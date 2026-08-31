import { createHash } from 'node:crypto'
import { join, relative } from 'node:path'
import { analisadoresSemIgnorar, copiarPacote } from './instalar.mjs'
import { criarPontosDeEntrada } from './entrada.ts'
import {
  agoraIso, caminhos, escreverJson, escreverTexto, existe, lerJson, lerTexto, listar, raizPacote,
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

function hashDe(texto: string): string {
  return createHash('sha256').update(texto).digest('hex').slice(0, 16)
}

function arquivosDoPacote(pasta: string): Array<[string, string]> {
  const alvos = ['.md', '.json', '.ts', '.mjs'].flatMap((ext) => listar(pasta, ext))
  return alvos
    .filter((a) => !a.endsWith(NOME))
    .map((a) => [relative(pasta, a).split('\\').join('/'), hashDe(lerTexto(a))] as [string, string])
    .sort((a, b) => a[0].localeCompare(b[0]))
}

export function gerarManifesto(): void {
  const raiz = raizPacote()
  const versao = lerJson<{ version?: string }>(join(raiz, 'package.json')).version ?? '0.0.0'
  const m: Manifesto = {
    versao,
    gerado_em: agoraIso(),
    arquivos: Object.fromEntries(arquivosDoPacote(join(raiz, '.mentor'))),
  }
  escreverJson(join(raiz, '.mentor', NOME), m)
  console.log(`Manifesto gerado: ${Object.keys(m.arquivos).length} arquivos, versao ${versao}.`)
}

export interface Divergencia {
  versao: string | null
  mudados: string[]
  faltando: string[]
  acrescentados: string[]
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

  const copia = copiarPacote(origem, destino, true, Boolean(flags['migrar-docs']))
  if (!copia.ok) {
    console.error(copia.erro)
    process.exitCode = 1
    return
  }
  if (copia.migrouDocs) console.log('Migracao concluida: docs/ foi renomeada para docs-mentor/.')
  // Manifesto primeiro, `package.json` so' como reserva. Rodando de dentro de um projeto ja
  // instalado, `origem` e' a raiz DELE, e o `package.json` de la e' o do app: a mensagem sairia
  // anunciando a versao do projeto do usuario como se fosse a do pacote. Irmao do achado 10,
  // encontrado varrendo a classe em vez de so' o call site reportado.
  const doManifesto = join(origem, '.mentor', NOME)
  const versao = existe(doManifesto)
    ? lerJson<{ versao?: string }>(doManifesto).versao ?? '0.0.0'
    : lerJson<{ version?: string }>(join(origem, 'package.json')).version ?? '0.0.0'
  console.log(`mentor-agent ${versao} instalado em ${destino}.`)

  // Sem ponto de entrada, nenhuma ferramenta le' o nucleo, e o pacote inteiro nao existe.
  const e = criarPontosDeEntrada(destino)
  if (e.criados.length) console.log(`Ponto de entrada criado: ${e.criados.join(', ')}.`)
  if (e.preservados.length) {
    console.log(`\nJa existia, e nao foi tocado: ${e.preservados.join(', ')}.`)
    console.log('Cole nele, para a ferramenta carregar as leis:')
    for (const arquivo of e.preservados) {
      console.log(arquivo === 'CLAUDE.md'
        ? '  CLAUDE.md:  @.mentor/nucleo.md'
        : `  ${arquivo}:  Antes de qualquer outra coisa, leia \`.mentor/nucleo.md\`.`)
    }
  }

  const lint = analisadoresSemIgnorar(destino)
  if (lint.length) {
    console.log(`\nAVISO: ${lint.map((l) => l.arquivo).join(', ')} nao ignora .mentor/.`)
    console.log('O analisador vai varrer o pacote e reprovar o gate de lint por estilo que nao e do seu codigo.')
    console.log('Acrescente:')
    for (const l of lint) console.log(`  ${l.arquivo}:  ${l.linha}`)
  }
  // Reinstalar sobre projeto inicializado nao pede `init`: convidar a refazer os portoes ja
  // respondidos e' o comando desaprendendo o estado do projeto a cada atualizacao.
  console.log(existe(join(destino, 'docs-mentor', 'contexto.json'))
    ? '\nProjeto ja inicializado. Proximo passo: `node mentor.mjs gerar`, para regenerar as vistas com a versao nova.'
    : '\nProximo passo: `node mentor.mjs init`, e depois responder os portoes V, C e 0.')

  if (!existe(join(pastaDestino, NOME))) {
    escreverTexto(join(destino, '.mentor', 'LEIA-ME-MANIFESTO.txt'),
      'Este pacote foi instalado sem manifesto: nao da para detectar divergencia.\n' +
      'Rode `mentor manifesto` no repositorio do pacote antes de empacotar.\n')
  }
}
