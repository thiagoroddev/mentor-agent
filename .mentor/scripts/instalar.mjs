// JavaScript puro, e nao TypeScript, por um motivo mecanico: instalado como dependencia, este
// arquivo roda de dentro de `node_modules`, e o Node **se recusa** a remover tipos ali
// (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING). Um `.ts` aqui quebraria a instalacao inteira.
// Fonte unica da copia: `mentor.mjs` chama daqui quando esta em node_modules, e `cmd-pacote.ts`
// chama daqui quando roda do repositorio. Duas copias da mesma logica divergiriam.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/**
 * Copia `.mentor/` e `mentor.mjs` da origem para o destino.
 * Devolve `{ ok, erro }` em vez de lancar: quem chama decide como reportar.
 */
export function copiarPacote(origem, destino, forcar) {
  const pastaDestino = join(destino, '.mentor')
  if (existsSync(pastaDestino) && !forcar) {
    return { ok: false, erro: `Ja existe .mentor/ em ${destino}.`, pastaDestino }
  }
  cpSync(join(origem, '.mentor'), pastaDestino, { recursive: true })
  cpSync(join(origem, 'mentor.mjs'), join(destino, 'mentor.mjs'))
  return { ok: true, erro: null, pastaDestino }
}

// ---------------------------------------------------------------- pontos de entrada

/**
 * Os pontos de entrada das ferramentas de IA. Moram aqui, em JS puro, pelo mesmo motivo do resto
 * deste arquivo: **o caminho que o npm usa passa por `node_modules`**, e la' nao da' para importar
 * `.ts`. Ficaram em TypeScript na primeira tentativa e o resultado foi um `instalar` que copiava o
 * pacote e nao criava entrada nenhuma. Ou seja: instalava um pacote que nada carregava.
 *
 * ⚠️ **Ponteiro, nunca espelho.** No antecessor o `AGENTS.md` tinha 22.616 caracteres duplicados,
 * que envelheceram fora de sincronia. Aqui os tres somam menos de 2 KB e nao repetem uma regra:
 * dizem onde as regras estao. Quando o nucleo muda, nada aqui muda junto.
 */
const NUCLEO = '.mentor/nucleo.md'

/**
 * O texto para as ferramentas que leem markdown comum e nao importam arquivo.
 * As tres linhas de aviso existem porque sao as unicas que precisam valer **antes** da leitura do
 * nucleo: as duas primeiras sao irreversiveis, e a terceira evita a IA inventar dado que ja' existe.
 */
function texto() {
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
function textoClaude() {
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

export const PONTOS_DE_ENTRADA = [
  { arquivo: 'CLAUDE.md', conteudo: textoClaude, ferramenta: 'Claude Code' },
  { arquivo: 'AGENTS.md', conteudo: texto, ferramenta: 'Codex, Cursor, Copilot e outros' },
  { arquivo: 'GEMINI.md', conteudo: texto, ferramenta: 'Gemini CLI' },
]


/**
 * Cria o que falta. **Nunca sobrescreve**: projeto real quase sempre ja' tem um `CLAUDE.md`, e
 * apagar o texto da pessoa para por o nosso seria imperdoavel. Quem ja' existe volta em
 * `preservados`, para quem chamou dizer o que colar a mao.
 */
export function criarPontosDeEntrada(destino) {
  const r = { criados: [], preservados: [] }
  for (const p of PONTOS_DE_ENTRADA) {
    const caminho = join(destino, p.arquivo)
    if (existsSync(caminho)) { r.preservados.push(p.arquivo); continue }
    mkdirSync(dirname(caminho), { recursive: true })
    writeFileSync(caminho, p.conteudo() + '\n', 'utf8')
    r.criados.push(p.arquivo)
  }
  return r
}

// ---------------------------------------------------------------- analisador do projeto

/**
 * O pacote mora **dentro** do repositorio, de proposito, e por isso o analisador do projeto o
 * encontra. Medido em campo: `eslint .` achou `.mentor/scripts/` e produziu **1.975 erros, nenhum
 * em `src/`**. Como o nucleo exige gate verde para fechar tarefa, a instalacao travava o ciclo que
 * ela veio abrir. Pior defeito de adocao possivel: o projeto piora no minuto em que adota.
 *
 * ⚠️ **Adequar o estilo do pacote nao resolve.** Com `prettier/prettier: error` o que se cobra e'
 * bater com a saida do prettier **daquele** projeto, e ela depende de `printWidth`, aspas e ponto e
 * virgula que o pacote nao tem como conhecer. Pior: se o projeto reformatasse `.mentor/`, o
 * `verificar` passaria a acusar divergencia em todos os arquivos. Os dois mecanismos brigariam.
 *
 * `.mentor/` e' dependencia versionada junto, e dependencia nao se analisa: ignora-se, como
 * `node_modules` e `dist`.
 */
const ANALISADORES = [
  { arquivo: 'eslint.config.js', linha: 'ignores: [".mentor"]  (ou globalIgnores(["dist", ".mentor"]))' },
  { arquivo: 'eslint.config.mjs', linha: 'ignores: [".mentor"]  (ou globalIgnores(["dist", ".mentor"]))' },
  { arquivo: 'eslint.config.cjs', linha: 'ignores: [".mentor"]  (ou globalIgnores(["dist", ".mentor"]))' },
  { arquivo: 'eslint.config.ts', linha: 'ignores: [".mentor"]  (ou globalIgnores(["dist", ".mentor"]))' },
  { arquivo: '.eslintrc.json', linha: '"ignorePatterns": [".mentor"]' },
  { arquivo: '.eslintrc.js', linha: 'ignorePatterns: [".mentor"]' },
  { arquivo: '.eslintrc.cjs', linha: 'ignorePatterns: [".mentor"]' },
  { arquivo: '.eslintignore', linha: '.mentor' },
  { arquivo: 'biome.json', linha: '"files": { "includes": ["**", "!.mentor/**"] }' },
  { arquivo: 'biome.jsonc', linha: '"files": { "includes": ["**", "!.mentor/**"] }' },
]

/**
 * Configuracoes de analisador na raiz que **ainda nao mencionam** `.mentor`.
 * Mencionar e' o sinal: quem escreveu `.mentor` ali ja' decidiu o que fazer com ele.
 */
export function analisadoresSemIgnorar(destino) {
  const achados = []
  for (const a of ANALISADORES) {
    const caminho = join(destino, a.arquivo)
    if (!existsSync(caminho)) continue
    let conteudo = ''
    try { conteudo = readFileSync(caminho, 'utf8') } catch { continue }
    if (!conteudo.includes('.mentor')) achados.push(a)
  }
  return achados
}
