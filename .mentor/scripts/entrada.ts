import { caminhos, escreverTexto, existe, lerTexto } from './arquivos.ts'
import { join } from 'node:path'

/**
 * Os pontos de entrada das ferramentas de IA.
 *
 * Sem eles o pacote **nao existe**: `nucleo.md` diz "carregamento: sempre" no cabecalho e nada no
 * mundo le' esse campo. Lei que so' existe dentro do arquivo que ninguem abriu e' lei nenhuma.
 *
 * ⚠️ **Ponteiro, nunca espelho.** No antecessor o `AGENTS.md` tinha 22.616 caracteres de conteudo
 * duplicado, que envelheceu fora de sincronia com a fonte. Aqui os tres arquivos somados dao menos
 * de 2 KB e **nao repetem uma regra sequer**: dizem onde as regras estao. Quando o nucleo muda,
 * nada aqui precisa mudar junto.
 */

const NUCLEO = '.mentor/nucleo.md'

/**
 * O texto para as ferramentas que leem markdown comum e nao importam arquivo.
 * As tres linhas de aviso existem porque sao as unicas que precisam valer **antes** da leitura do
 * nucleo: as duas primeiras sao irreversiveis, e a terceira evita a IA inventar dado que ja' existe.
 */
function texto(): string {
  return [
    '# Instrucoes do agente',
    '',
    'Este projeto usa o **mentor-agent**. As leis vivem em `' + NUCLEO + '`.',
    '',
    '**Antes de qualquer outra coisa, leia `' + NUCLEO + '`.** Ele e curto, e a autoridade sobre',
    'este repositorio, e traz a tabela que diz o que mais carregar em cada situacao. Nada aqui repete',
    'o que esta la: uma copia envelheceria em silencio.',
    '',
    'Tres coisas valem antes mesmo dessa leitura, porque as duas primeiras sao irreversiveis:',
    '',
    '1. Nao commite, nao faca push e nao crie ramo sem autorizacao explicita da pessoa.',
    '2. Nao apague nem reescreva historico, arquivo de configuracao ou dado de ninguem sem perguntar.',
    '3. Data, hora, ID e contagem **nunca se digitam**: saem de `node mentor.mjs`.',
    '',
    'Sem argumento, `node mentor.mjs` lista os comandos.',
    '',
    '---',
    '',
    '*Criado por `mentor instalar`. Se voce editar, ele nao sobrescreve: reinstalar preserva este arquivo.*',
  ].join('\n')
}

/**
 * O do Claude Code e' o unico com carregamento **mecanico**: `@arquivo` traz o conteudo para o
 * contexto sem depender de o agente decidir abrir nada. Nas outras ferramentas e' instrucao, e
 * instrucao pode ser ignorada. E' o teto do que existe hoje.
 */
function textoClaude(): string {
  return [
    '# Instrucoes do agente',
    '',
    'As leis deste repositorio, sempre carregadas:',
    '',
    '@' + NUCLEO,
    '',
    '@AGENTS.md',
    '',
    '---',
    '',
    '*Criado por `mentor instalar`. Se voce editar, ele nao sobrescreve.*',
  ].join('\n')
}

export const PONTOS_DE_ENTRADA: ReadonlyArray<{ arquivo: string; conteudo: () => string; ferramenta: string }> = [
  { arquivo: 'CLAUDE.md', conteudo: textoClaude, ferramenta: 'Claude Code' },
  { arquivo: 'AGENTS.md', conteudo: texto, ferramenta: 'Codex, Cursor, Copilot e outros' },
  { arquivo: 'GEMINI.md', conteudo: texto, ferramenta: 'Gemini CLI' },
]

export interface ResultadoDeEntrada { criados: string[]; preservados: string[] }

/**
 * Cria o que falta. **Nunca sobrescreve**: projeto real quase sempre ja' tem um `CLAUDE.md`, e
 * apagar o texto da pessoa para pos o nosso seria imperdoavel. Quem ja' existe volta em
 * `preservados`, para quem chamou dizer o que colar a mao.
 */
export function criarPontosDeEntrada(destino: string): ResultadoDeEntrada {
  const r: ResultadoDeEntrada = { criados: [], preservados: [] }
  for (const p of PONTOS_DE_ENTRADA) {
    const caminho = join(destino, p.arquivo)
    if (existe(caminho)) { r.preservados.push(p.arquivo); continue }
    escreverTexto(caminho, p.conteudo())
    r.criados.push(p.arquivo)
  }
  return r
}

/**
 * Mensuravel, sem julgamento: o arquivo existe, e cita o nucleo? E' o que o doctor consegue checar.
 * Nao ha como medir daqui se a ferramenta de fato carregou.
 */
export function pontosDeEntradaSemNucleo(): { ausentes: string[]; mudos: string[] } {
  const raiz = caminhos().raiz
  const ausentes: string[] = []
  const mudos: string[] = []
  for (const p of PONTOS_DE_ENTRADA) {
    const caminho = join(raiz, p.arquivo)
    if (!existe(caminho)) { ausentes.push(p.arquivo); continue }
    if (!lerTexto(caminho).includes(NUCLEO)) mudos.push(p.arquivo)
  }
  return { ausentes, mudos }
}
