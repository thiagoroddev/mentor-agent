// JavaScript puro, e nao TypeScript, por um motivo mecanico: instalado como dependencia, este
// arquivo roda de dentro de `node_modules`, e o Node **se recusa** a remover tipos ali
// (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING). Um `.ts` aqui quebraria a instalacao inteira.
// Fonte unica da copia: `mentor.mjs` chama daqui quando esta em node_modules, e `cmd-pacote.ts`
// chama daqui quando roda do repositorio. Duas copias da mesma logica divergiriam.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'

const trocarRaizAdministrativa = (valor) => typeof valor === 'string'
  ? valor.replace(/^docs\//, 'docs-mentor/')
  : valor

/**
 * O rename muda tres referencias estruturadas que alimentam automacao. Texto livre, ADR e tarefa
 * nao entram: `docs/...` ali pode apontar para documentacao do aplicativo ou para um historico.
 * Devolve uma funcao de rollback para a migracao continuar atomica se a copia falhar depois.
 */
function migrarReferenciasAdministrativas(pasta) {
  const anteriores = []
  const substituir = (caminho, transformar) => {
    if (!existsSync(caminho)) return
    const antes = readFileSync(caminho, 'utf8')
    const depois = transformar(antes)
    if (depois === antes) return
    anteriores.push([caminho, antes])
    writeFileSync(caminho, depois, 'utf8')
  }

  const restaurar = () => {
    for (const [caminho, conteudo] of anteriores.toReversed()) writeFileSync(caminho, conteudo, 'utf8')
  }

  try {
    substituir(join(pasta, 'contexto.json'), (texto) => {
      const contexto = JSON.parse(texto)
      if (contexto.convencoes) {
        contexto.convencoes.onde_ficam_as_de_stack = trocarRaizAdministrativa(
          contexto.convencoes.onde_ficam_as_de_stack,
        )
      }
      if (Array.isArray(contexto.ferramentas)) {
        for (const ferramenta of contexto.ferramentas) {
          ferramenta.padrao = trocarRaizAdministrativa(ferramenta.padrao)
        }
      }
      return JSON.stringify(contexto, null, 2) + '\n'
    })
    substituir(join(pasta, 'tetos.json'), (texto) => {
      const tetos = JSON.parse(texto)
      if (Array.isArray(tetos.excecoes)) {
        for (const excecao of tetos.excecoes) {
          excecao.caminho = trocarRaizAdministrativa(excecao.caminho)
        }
      }
      return JSON.stringify(tetos, null, 2) + '\n'
    })
    substituir(join(pasta, 'LEIA.md'), (texto) =>
      texto.replace(/^# docs\/(\r?\n)/, '# docs-mentor/$1'))
  } catch (erro) {
    restaurar()
    throw erro
  }
  return restaurar
}

/** Linhas que existem num texto e nao no outro, contando repeticao. Suficiente para dizer o tamanho da mudanca. */
function linhasSoEm(a, b) {
  const restantes = new Map()
  for (const l of b) restantes.set(l, (restantes.get(l) ?? 0) + 1)
  let so = 0
  for (const l of a) {
    const n = restantes.get(l) ?? 0
    if (n > 0) restantes.set(l, n - 1)
    else so++
  }
  return so
}

/**
 * As leis que a copia vai trocar: `nucleo.md` e `processos/`. Chamada **antes** de copiar, pelos dois
 * caminhos do `instalar`.
 *
 * ⚠️ Morava so' em `cmd-pacote.ts`, e o comando documentado (`npx mentor instalar --forcar`) roda de
 * `node_modules`, onde `mentor.mjs` chama este arquivo direto. Medido em campo: a 0.7.0 mudou 19 linhas
 * de `processos/tarefa.md` e a atualizacao nao disse nada. `.mentor/` e' versionado no projeto, entao o
 * texto inteiro fica a um `git diff` de distancia depois da copia.
 */
export function normasQueMudam(origem, destino) {
  const pastaOrigem = join(origem, '.mentor')
  const pastaDestino = join(destino, '.mentor')
  if (!existsSync(pastaDestino)) return []
  const ler = (caminho) => readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n')
  const processos = (pasta) => existsSync(join(pasta, 'processos'))
    ? readdirSync(join(pasta, 'processos')).filter((f) => f.endsWith('.md')).map((f) => `processos/${f}`)
    : []
  // So' o que o pacote traz: a copia nao apaga arquivo que so' existe no projeto.
  const nomes = ['nucleo.md', ...processos(pastaOrigem).sort()]
  const mudancas = []
  for (const rel of nomes) {
    const noPacote = join(pastaOrigem, rel)
    const noProjeto = join(pastaDestino, rel)
    if (!existsSync(noPacote)) continue
    if (!existsSync(noProjeto)) { mudancas.push({ arquivo: rel, estado: 'novo', mais: ler(noPacote).split('\n').length, menos: 0 }); continue }
    const novo = ler(noPacote).split('\n')
    const antigo = ler(noProjeto).split('\n')
    const mais = linhasSoEm(novo, antigo)
    const menos = linhasSoEm(antigo, novo)
    if (mais || menos) mudancas.push({ arquivo: rel, estado: 'mudado', mais, menos })
  }
  return mudancas
}

/** O texto do aviso, igual nos dois caminhos. */
export function avisoDeNormas(mudancas) {
  if (!mudancas.length) return []
  return [
    '',
    'ATENCAO: esta atualizacao troca leis do projeto:',
    ...mudancas.map((m) => `  .mentor/${m.arquivo}  ${m.estado === 'mudado' ? `+${m.mais} -${m.menos} linhas` : m.estado}`),
    'Leia antes de seguir: git diff -- .mentor/nucleo.md .mentor/processos/',
    '',
  ]
}

/**
 * Copia `.mentor/` e `mentor.mjs` da origem para o destino.
 * Devolve `{ ok, erro }` em vez de lancar: quem chama decide como reportar.
 */
export function copiarPacote(origem, destino, forcar, migrarDocs = false) {
  const pastaDestino = join(destino, '.mentor')
  const documentosLegados = join(destino, 'docs')
  const contextoLegado = join(documentosLegados, 'contexto.json')
  const documentosAtuais = join(destino, 'docs-mentor')

  // `docs/` so e' reconhecida como instalacao 0.1 quando contem o contexto do mentor. Uma pasta
  // `docs/` comum pertence ao aplicativo e nunca e' tocada. Mesmo no caso legado, mover exige uma
  // autorizacao separada: `--forcar` autoriza substituir o pacote, nao renomear dados do projeto.
  if (existsSync(contextoLegado)) {
    if (existsSync(documentosAtuais)) {
      return {
        ok: false,
        erro: 'Conflito de migracao: existem docs/contexto.json e docs-mentor/. Nada foi movido.',
        pastaDestino,
      }
    }
    if (!migrarDocs) {
      return {
        ok: false,
        erro: 'Instalacao 0.1.x detectada em docs/. Revise-a e repita com --migrar-docs para renomear a pasta.',
        pastaDestino,
      }
    }
  }
  if (existsSync(pastaDestino) && !forcar) {
    return { ok: false, erro: `Ja existe .mentor/ em ${destino}.`, pastaDestino }
  }

  const deveMigrar = existsSync(contextoLegado)
  let desfazerReferencias = () => {}
  if (deveMigrar) {
    renameSync(documentosLegados, documentosAtuais)
    try {
      desfazerReferencias = migrarReferenciasAdministrativas(documentosAtuais)
    } catch (erro) {
      renameSync(documentosAtuais, documentosLegados)
      throw erro
    }
  }
  try {
    cpSync(join(origem, '.mentor'), pastaDestino, { recursive: true })
    cpSync(join(origem, 'mentor.mjs'), join(destino, 'mentor.mjs'))

    const gitignore = join(destino, '.gitignore')
    if (existsSync(gitignore)) {
      try {
        const conteudo = readFileSync(gitignore, 'utf8')
        if (!conteudo.includes('.mentor-saidas')) {
          writeFileSync(gitignore, `${conteudo.trimEnd()}\n\n# Logs e saidas temporarias do mentor\n.mentor-saidas/\n`, 'utf8')
        }
      } catch {
        // continua
      }
    }

    const gitattributes = join(destino, '.gitattributes')
    const regrasGitattributes = [
      '# Gerados pelo mentor-agent (merge=ours e regeneracao via mentor resolver-gerados)',
      'docs-mentor/contexto.md merge=ours',
      'docs-mentor/tarefas/backlog.md merge=ours',
      'docs-mentor/tarefas/reserva.md merge=ours',
      'docs-mentor/tarefas/concluidas/0-indice.md merge=ours',
      '# recusas.jsonl usa union: duplicatas de append entre branches sao toleradas no log',
      'docs-mentor/tarefas/recusas.jsonl merge=union',
    ].join('\n')

    if (existsSync(gitattributes)) {
      try {
        const conteudoAttr = readFileSync(gitattributes, 'utf8')
        if (!conteudoAttr.includes('recusas.jsonl')) {
          writeFileSync(gitattributes, `${conteudoAttr.trimEnd()}\n\n${regrasGitattributes}\n`, 'utf8')
        }
      } catch {
        // continua
      }
    } else {
      try {
        writeFileSync(gitattributes, `${regrasGitattributes}\n`, 'utf8')
      } catch {
        // continua
      }
    }

    if (existsSync(join(destino, '.git'))) {
      try {
        spawnSync('git', ['config', 'merge.ours.driver', 'true'], { cwd: destino })
      } catch {
        // continua
      }
    }
  } catch (erro) {
    if (deveMigrar && existsSync(documentosAtuais) && !existsSync(documentosLegados)) {
      desfazerReferencias()
      renameSync(documentosAtuais, documentosLegados)
    }
    throw erro
  }
  return { ok: true, erro: null, pastaDestino, migrouDocs: deveMigrar }
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
    '**Postura ativa do mentor e o dever de contrariar:** ao iniciar qualquer sessao, receber saudacoes ou quando',
    'nao houver tarefa ativa em execucao, inspecione `docs-mentor/contexto.json` e o `doctor`, identifique',
    'o estado do projeto e apresente imediatamente o diagnostico com os proximos passos recomendados.',
    'Voce e um mentor, nao um executor: tem a obrigacao de contrariar no planejamento se o problema tem',
    'nome canonico ou solucao consolidada no mercado. O silencio sobre alternativa melhor e uma falha grave.',
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
