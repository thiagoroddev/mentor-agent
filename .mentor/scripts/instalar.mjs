// JavaScript puro, e nao TypeScript, por um motivo mecanico: instalado como dependencia, este
// arquivo roda de dentro de `node_modules`, e o Node **se recusa** a remover tipos ali
// (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING). Um `.ts` aqui quebraria a instalacao inteira.
// Fonte unica da copia: `mentor.mjs` chama daqui quando esta em node_modules, e `cmd-pacote.ts`
// chama daqui quando roda do repositorio. Duas copias da mesma logica divergiriam.
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
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

// ---------------------------------------------------------------- hook de pre-push

const ASSINATURA_DO_HOOK = 'Gerado por `mentor hooks --instalar`'

/**
 * O arquivo do hook. Mora aqui, em JS puro, porque o `instalar` pelo `npx` precisa regrava-lo.
 *
 * ⚠️ Uma linha so'. Ate' a 0.8.x o arquivo rodava `node mentor.mjs gates` antes do `hooks --pre-push`,
 * e o shell nao sabe para onde o push vai: nao dava para pular os gates num envio de WIP. Agora quem
 * decide e' o `hooks --pre-push`, que le da entrada padrao os ramos enviados.
 */
export const HOOK_PRE_PUSH = [
  '#!/bin/sh',
  `# ${ASSINATURA_DO_HOOK}. Roda os gates e verificacoes de pre-push do mentor.`,
  '# Em pre-push, nao em pre-commit: commit barato evita que alguem aprenda `--no-verify`.',
  '# O git passa na entrada padrao os ramos enviados; envio so para wip/ pula os gates.',
  'node mentor.mjs hooks --pre-push "$@" || exit 1',
].join('\n') + '\n'

/**
 * Regrava o `.githooks/pre-push` que o mentor gerou, se estiver no modelo antigo. Hook escrito pelo
 * projeto (sem a assinatura) nunca e' tocado. Devolve `true` quando regravou.
 */
export function atualizarHookDoMentor(destino) {
  const arquivo = join(destino, '.githooks', 'pre-push')
  if (!existsSync(arquivo)) return false
  const atual = readFileSync(arquivo, 'utf8').replace(/\r\n/g, '\n')
  if (!atual.includes(ASSINATURA_DO_HOOK) || atual === HOOK_PRE_PUSH) return false
  writeFileSync(arquivo, HOOK_PRE_PUSH, 'utf8')
  return true
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

  if (existsSync(pastaDestino) && forcar) {
    try {
      const pastaAbertas = join(documentosAtuais, 'tarefas', 'abertas')
      let temTarefaEmExecucao = false
      if (existsSync(pastaAbertas)) {
        const arqs = readdirSync(pastaAbertas)
        for (const arq of arqs) {
          if (arq.endsWith('.json')) {
            const t = JSON.parse(readFileSync(join(pastaAbertas, arq), 'utf8'))
            if (t.estado === 'em-execucao') {
              temTarefaEmExecucao = true
              break
            }
          }
        }
      }
      if (!temTarefaEmExecucao) {
        console.warn(
          '! Aviso de atualizacao: executando "instalar --forcar" sem tarefa ativa em execucao.\n' +
          '  Roteiro recomendado para atualizacao de versao (processos/inicializacao.md e README):\n' +
          '  1. Crie a tarefa: mentor task nova --tipo CHORE --titulo "Atualizar mentor-agent para vX.Y.Z" ...\n' +
          '  2. Inicie a tarefa: mentor task puxar <ID> && mentor task iniciar <ID>\n' +
          '  3. Instale o pacote: npm i <pacote> && mentor instalar --forcar\n' +
          '  4. Rode verificar e testes, preencha a narrativa e finalize: mentor task finalizar <ID>\n'
        )
      }
    } catch {
      // continua
    }
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
      'docs-mentor/requisitos/pendentes.md merge=ours',
      'docs-mentor/requisitos/implementados.md merge=ours',
      'docs-mentor/tarefas/backlog.md merge=ours',
      'docs-mentor/tarefas/reserva.md merge=ours',
      'docs-mentor/tarefas/concluidas/0-indice.md merge=ours',
      '# recusas.jsonl usa union: duplicatas de append entre branches sao toleradas no log',
      'docs-mentor/tarefas/recusas.jsonl merge=union',
    ].join('\n')

    if (existsSync(gitattributes)) {
      try {
        let conteudoAttr = readFileSync(gitattributes, 'utf8')
        if (!conteudoAttr.includes('recusas.jsonl')) {
          conteudoAttr = `${conteudoAttr.trimEnd()}\n\n${regrasGitattributes}\n`
          writeFileSync(gitattributes, conteudoAttr, 'utf8')
        } else if (!conteudoAttr.includes('requisitos/pendentes.md')) {
          const adicionais = [
            'docs-mentor/requisitos/pendentes.md merge=ours',
            'docs-mentor/requisitos/implementados.md merge=ours',
          ].join('\n')
          writeFileSync(gitattributes, `${conteudoAttr.trimEnd()}\n${adicionais}\n`, 'utf8')
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

// ---------------------------------------------------------------- carregamento: o que as ferramentas de IA leem

/**
 * Tudo o que decide o que Codex, Claude Code e Antigravity carregam: os pontos de entrada, o nucleo
 * dentro do `AGENTS.md` e as copias das skills. Mora aqui, em JS puro, pelo mesmo motivo do resto
 * deste arquivo: **o caminho que o npm usa passa por `node_modules`**, e la' nao da' para importar
 * `.ts`. Ficaram em TypeScript na primeira tentativa e o resultado foi um `instalar` que copiava o
 * pacote e nao criava entrada nenhuma.
 *
 * Cada funcao recebe `{ raiz, pacote, docs }`: a raiz do projeto, a pasta do pacote e a pasta de
 * documentos. Nos testes o pacote roda do repositorio dele, fora do projeto; num projeto, mora em
 * `<raiz>/.mentor`.
 *
 * ⚠️ **Por que o nucleo vai dentro do `AGENTS.md`.** Ate' a 0.13.0 os pontos de entrada so' diziam
 * "leia `.mentor/nucleo.md`". No Claude Code o `@` carregava o arquivo; no Codex e no Antigravity a
 * leitura dependia de o modelo decidir abrir. Medido em campo: cada ferramenta seguia um processo
 * diferente. Com o nucleo no `AGENTS.md`, as tres carregam o mesmo texto sem decidir nada.
 */
function locais(opcoes) {
  const raiz = typeof opcoes === 'string' ? opcoes : opcoes.raiz
  const pacote = (typeof opcoes === 'object' && opcoes.pacote) || join(raiz, '.mentor')
  const docs = (typeof opcoes === 'object' && opcoes.docs) || join(raiz, 'docs-mentor')
  return { raiz, pacote, docs }
}

const lf = (texto) => texto.replace(/\r\n/g, '\n')
const comFimDeLinha = (texto, eol) => (eol === '\r\n' ? texto.replace(/\n/g, '\r\n') : texto)
const posix = (caminho) => caminho.split('\\').join('/')

function lerNucleo(pacote) {
  const caminho = join(pacote, 'nucleo.md')
  return existsSync(caminho) ? readFileSync(caminho, 'utf8') : null
}

// ---- o bloco do nucleo

export const MARCA_INICIO = '<!-- mentor:nucleo:inicio -->'
export const MARCA_FIM = '<!-- mentor:nucleo:fim -->'
/**
 * O Antigravity trunca arquivo de regra acima de 24.000 bytes; o Codex soma os `AGENTS.md` ate' 32 KiB.
 * O mais apertado manda. O aviso vem a 90%, para sobrar folga antes de cortar.
 */
export const LIMITE_AGENTES = 24_000
export const AVISO_AGENTES = 21_600

/** O corpo do nucleo, sem o cabecalho YAML: metadado do arquivo, que dentro do AGENTS.md seria ruido. */
function corpoDoNucleo(nucleo) {
  return lf(nucleo).replace(/^---\n[\s\S]*?\n---\n/, '').trim()
}

export function blocoDoNucleo(nucleo) {
  return [
    MARCA_INICIO,
    '<!-- Gerado por `node mentor.mjs gerar` a partir de .mentor/nucleo.md. Nao edite este bloco: mude o nucleo e rode `gerar`. -->',
    '',
    '> Caminhos `processos/`, `guia/`, `skills/` e `esquemas/` citados abaixo sao relativos a `.mentor/`.',
    '',
    corpoDoNucleo(nucleo),
    '',
    MARCA_FIM,
  ].join('\n')
}

function posicoes(texto, marca) {
  const achadas = []
  for (let i = texto.indexOf(marca); i >= 0; i = texto.indexOf(marca, i + marca.length)) achadas.push(i)
  return achadas
}

/** Exatamente um inicio antes de exatamente um fim. Qualquer outra forma e' invalida, e nada se altera. */
export function localizarBloco(texto) {
  const t = lf(texto)
  const inicios = posicoes(t, MARCA_INICIO)
  const fins = posicoes(t, MARCA_FIM)
  if (!inicios.length && !fins.length) return { estado: 'ausente' }
  if (inicios.length !== 1 || fins.length !== 1 || fins[0] < inicios[0]) {
    const ordem = inicios.length === 1 && fins.length === 1 ? ', com o fim antes do inicio' : ''
    return { estado: 'invalido', detalhe: `${inicios.length} marcador(es) de inicio e ${fins.length} de fim${ordem}` }
  }
  return { estado: 'presente', inicio: inicios[0], fim: fins[0] + MARCA_FIM.length, texto: t }
}

/**
 * O estado sem escrever nada: e' o que o `verificar` e o `doctor` leem.
 * @returns {{ estado: string, bytes: number, detalhe?: string }}
 */
export function estadoDoBloco(opcoes) {
  const { raiz, pacote } = locais(opcoes)
  const arquivo = join(raiz, 'AGENTS.md')
  if (!existsSync(arquivo)) return { estado: 'sem-agents', bytes: 0 }
  const texto = readFileSync(arquivo, 'utf8')
  const bytes = Buffer.byteLength(texto, 'utf8')
  const nucleo = lerNucleo(pacote)
  const local = localizarBloco(texto)
  if (local.estado !== 'presente') return { ...local, bytes }
  if (nucleo === null) return { estado: 'sem-nucleo', bytes }
  return { estado: local.texto.slice(local.inicio, local.fim) === blocoDoNucleo(nucleo) ? 'igual' : 'divergente', bytes }
}

/**
 * Insere o bloco no topo do `AGENTS.md`, ou atualiza o que ja' esta' la'. O texto fora dos marcadores
 * e' do projeto e nunca e' tocado. `inserir: false` so' atualiza bloco existente: o `gerar` nao muda a
 * forma de um arquivo que a pessoa ainda nao migrou.
 * @returns {{ estado: string, detalhe?: string }}
 */
export function sincronizarAgentes(opcoes, { inserir = true } = {}) {
  const { raiz, pacote } = locais(opcoes)
  const arquivo = join(raiz, 'AGENTS.md')
  const nucleo = lerNucleo(pacote)
  if (nucleo === null) return { estado: 'sem-nucleo' }
  if (!existsSync(arquivo)) return { estado: 'sem-agents' }
  const original = readFileSync(arquivo, 'utf8')
  const eol = original.includes('\r\n') ? '\r\n' : '\n'
  const local = localizarBloco(original)
  if (local.estado === 'invalido') return local
  const bloco = blocoDoNucleo(nucleo)
  let novo
  if (local.estado === 'ausente') {
    if (!inserir) return { estado: 'ausente' }
    const resto = lf(original).replace(/^\n+/, '')
    novo = resto ? `${bloco}\n\n${resto}` : `${bloco}\n`
  } else {
    if (local.texto.slice(local.inicio, local.fim) === bloco) return { estado: 'igual' }
    novo = local.texto.slice(0, local.inicio) + bloco + local.texto.slice(local.fim)
  }
  writeFileSync(arquivo, comFimDeLinha(novo, eol), 'utf8')
  return { estado: local.estado === 'ausente' ? 'inserido' : 'atualizado' }
}

// ---- os pontos de entrada

/**
 * ⚠️ **Ponteiro, nunca espelho**, menos o nucleo. No antecessor o `AGENTS.md` tinha 22.616 caracteres
 * copiados a mao, que envelheceram fora de sincronia. O nucleo dentro do `AGENTS.md` nao repete esse
 * erro porque e' **gerado**: o `verificar` reprova quando o bloco difere do `.mentor/nucleo.md`.
 */
function textoAgents(nucleo) {
  return [
    blocoDoNucleo(nucleo),
    '',
    '# Instrucoes deste projeto',
    '',
    'O bloco acima vem de `.mentor/nucleo.md` e vale em toda ferramenta que le este arquivo: Codex,',
    'Antigravity e, pelo `@AGENTS.md` do `CLAUDE.md`, o Claude Code. Daqui para baixo, so\' o que e\'',
    'deste projeto.',
  ].join('\n')
}

/** `@` e' carregamento mecanico no Claude Code. Importar o nucleo aqui tambem o carregaria duas vezes. */
function textoClaude() {
  return [
    '# Instrucoes do agente',
    '',
    '@AGENTS.md',
    '',
    '---',
    '',
    '*Criado por `mentor instalar`. O nucleo do mentor vem dentro do `AGENTS.md`: nao importe',
    '`.mentor/nucleo.md` aqui, ou ele carrega duas vezes.*',
  ].join('\n')
}

/** O Antigravity carrega o `GEMINI.md` junto com o `AGENTS.md`: aqui so' o ponteiro, sem import. */
function textoGemini() {
  return [
    '# Instrucoes do agente',
    '',
    'As instrucoes deste projeto, com o nucleo do mentor-agent, estao em `AGENTS.md`. O Antigravity',
    'carrega os dois arquivos; nada aqui repete o que esta la.',
    '',
    '---',
    '',
    '*Criado por `mentor instalar`.*',
  ].join('\n')
}

export const PONTOS_DE_ENTRADA = [
  { arquivo: 'AGENTS.md', conteudo: textoAgents, ferramenta: 'Codex, Antigravity, Cursor e Copilot' },
  { arquivo: 'CLAUDE.md', conteudo: textoClaude, ferramenta: 'Claude Code' },
  { arquivo: 'GEMINI.md', conteudo: textoGemini, ferramenta: 'Antigravity e Gemini CLI' },
]

/**
 * Cria o que falta. **Nunca sobrescreve**: projeto real quase sempre ja' tem um `CLAUDE.md`, e
 * apagar o texto da pessoa para por o nosso seria imperdoavel. Quem ja' existe volta em
 * `preservados`; a migracao deles e' o `entrada migrar`, explicito.
 */
export function criarPontosDeEntrada(opcoes) {
  const { raiz, pacote } = locais(opcoes)
  const nucleo = lerNucleo(pacote) ?? ''
  const r = { criados: [], preservados: [] }
  for (const p of PONTOS_DE_ENTRADA) {
    const caminho = join(raiz, p.arquivo)
    if (existsSync(caminho)) { r.preservados.push(p.arquivo); continue }
    mkdirSync(dirname(caminho), { recursive: true })
    writeFileSync(caminho, p.conteudo(nucleo) + '\n', 'utf8')
    r.criados.push(p.arquivo)
  }
  return r
}

const IMPORTA_NUCLEO = /^[ \t]*@\.mentor\/nucleo\.md[ \t]*$/m
const IMPORTA_AGENTS = /^[ \t]*@AGENTS\.md[ \t]*$/m

/** Linhas dos modelos ate' a 0.13.0 que o nucleo, agora carregado inteiro, ja' cobre. */
const LINHAS_DO_MODELO_ANTIGO = [
  'Antes de qualquer outra coisa, leia `.mentor/nucleo.md`.',
  'Tres coisas valem antes mesmo dessa leitura',
  'Postura ativa do mentor e o dever de contrariar',
  'Nao commite, nao faca push e nao crie ramo sem autorizacao explicita',
  'Data, hora, ID e contagem **nunca se digitam**',
]

function linhasRepetidas(texto) {
  return LINHAS_DO_MODELO_ANTIGO.filter((trecho) => texto.includes(trecho))
}

/**
 * `entrada migrar`: leva instalacao antiga ao modelo novo, sem apagar o que e' do projeto.
 * - `AGENTS.md`: insere o bloco do nucleo no topo.
 * - `CLAUDE.md`: garante `@AGENTS.md` e tira `@.mentor/nucleo.md` (carregaria duas vezes).
 * - `GEMINI.md`: se nao citar o `AGENTS.md`, ganha o ponteiro no topo.
 * - skills: copia para as pastas das ferramentas.
 * Linha propria do projeto fica; linha do modelo antigo que o nucleo ja' cobre so' e' apontada.
 * Rodar de novo nao muda nada.
 */
export function migrarPontosDeEntrada(opcoes) {
  const l = locais(opcoes)
  const linhas = []
  let recusou = false
  const e = criarPontosDeEntrada(l)
  for (const arquivo of e.criados) linhas.push(`${arquivo}: criado no modelo novo.`)

  const bloco = sincronizarAgentes(l)
  if (bloco.estado === 'inserido') linhas.push('AGENTS.md: nucleo inserido no topo, entre marcadores. O resto do arquivo nao foi tocado.')
  else if (bloco.estado === 'atualizado') linhas.push('AGENTS.md: nucleo atualizado.')
  else if (bloco.estado === 'invalido') {
    recusou = true
    linhas.push(`AGENTS.md: marcadores do nucleo invalidos (${bloco.detalhe}). Nada foi alterado: conserte a mao e rode de novo.`)
  }

  const claude = join(l.raiz, 'CLAUDE.md')
  if (!e.criados.includes('CLAUDE.md') && existsSync(claude)) {
    const original = readFileSync(claude, 'utf8')
    const eol = original.includes('\r\n') ? '\r\n' : '\n'
    let partes = lf(original).split('\n')
    const tirou = partes.some((p) => IMPORTA_NUCLEO.test(p))
    partes = partes.filter((p) => !IMPORTA_NUCLEO.test(p))
    const pos = !IMPORTA_AGENTS.test(partes.join('\n'))
    if (pos) {
      const titulo = partes[0]?.startsWith('#') ? 1 : 0
      partes.splice(titulo, 0, ...(titulo ? ['', '@AGENTS.md'] : ['@AGENTS.md', '']))
    }
    const novo = partes.join('\n').replace(/\n{3,}/g, '\n\n')
    if (novo !== lf(original)) {
      writeFileSync(claude, comFimDeLinha(novo, eol), 'utf8')
      linhas.push(`CLAUDE.md:${pos ? ' + @AGENTS.md' : ''}${tirou ? ' - @.mentor/nucleo.md' : ''}. As outras linhas ficaram.`)
    }
  }

  const gemini = join(l.raiz, 'GEMINI.md')
  if (!e.criados.includes('GEMINI.md') && existsSync(gemini)) {
    const original = readFileSync(gemini, 'utf8')
    if (!original.includes('AGENTS.md')) {
      const eol = original.includes('\r\n') ? '\r\n' : '\n'
      const ponteiro = 'As instrucoes deste projeto, com o nucleo do mentor-agent, estao em `AGENTS.md`, que o Antigravity carrega junto com este arquivo.'
      writeFileSync(gemini, comFimDeLinha(`${ponteiro}\n\n${lf(original)}`, eol), 'utf8')
      linhas.push('GEMINI.md: + ponteiro para o AGENTS.md no topo. As outras linhas ficaram.')
    }
  }

  for (const arquivo of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']) {
    const caminho = join(l.raiz, arquivo)
    if (!existsSync(caminho)) continue
    let texto = lf(readFileSync(caminho, 'utf8'))
    const local = localizarBloco(texto)
    if (local.estado === 'presente') texto = local.texto.slice(0, local.inicio) + local.texto.slice(local.fim)
    const repetidas = linhasRepetidas(texto)
    if (repetidas.length) linhas.push(`${arquivo}: ${repetidas.length} trecho(s) do modelo antigo que o nucleo ja cobre; podem sair a mao (nada foi apagado).`)
  }

  const skills = sincronizarSkills(l)
  linhas.push(...relatorioDeSkills(skills))
  if (skills.recusas.length) recusou = true
  if (!linhas.length) linhas.push('Nada a migrar: pontos de entrada e skills ja estao no modelo novo.')
  return { linhas, recusou }
}

/**
 * O que o `doctor` mostra. Sem ponto de entrada nenhum carrega o nucleo, e sem o nucleo as regras
 * nao existem: por isso a ausencia total e' bloqueio, e o resto e' atencao com o comando que resolve.
 */
export function diagnosticoDosPontosDeEntrada(opcoes) {
  const l = locais(opcoes)
  const ler = (nome) => (existsSync(join(l.raiz, nome)) ? readFileSync(join(l.raiz, nome), 'utf8') : null)
  const agents = ler('AGENTS.md')
  const claude = ler('CLAUDE.md')
  const gemini = ler('GEMINI.md')
  if (agents === null && claude === null && gemini === null) {
    return [{ estado: 'bloqueio', texto: 'nenhum ponto de entrada de IA no projeto: nada carrega o nucleo, e sem o nucleo o pacote nao existe. Rode: mentor instalar' }]
  }
  const migrar = 'Rode: node mentor.mjs entrada migrar'
  const itens = []
  const bloco = estadoDoBloco(l)
  if (agents === null) itens.push({ estado: 'bloqueio', texto: `sem AGENTS.md: Codex e Antigravity nao carregam o nucleo. ${migrar}` })
  else if (bloco.estado === 'invalido') itens.push({ estado: 'bloqueio', texto: `AGENTS.md com marcadores do nucleo invalidos (${bloco.detalhe}): o gerar recusa ate' consertar a mao` })
  else if (bloco.estado === 'ausente') {
    itens.push(agents.includes('.mentor/nucleo.md')
      ? { estado: 'atencao', texto: `AGENTS.md so manda ler o nucleo: o carregamento depende de o modelo abrir o arquivo. ${migrar}` }
      : { estado: 'bloqueio', texto: `AGENTS.md nao chega no nucleo: a ferramenta carrega o arquivo e nao chega nas leis. ${migrar}` })
  } else if (bloco.estado === 'divergente') itens.push({ estado: 'atencao', texto: 'o nucleo dentro do AGENTS.md esta diferente de .mentor/nucleo.md. Rode: node mentor.mjs gerar' })

  if (claude === null) itens.push({ estado: 'atencao', texto: `sem CLAUDE.md: o Claude Code so le o AGENTS.md sozinho nas versoes recentes. ${migrar}` })
  else if (!IMPORTA_AGENTS.test(claude)) {
    itens.push(IMPORTA_NUCLEO.test(claude)
      ? { estado: 'atencao', texto: `CLAUDE.md importa o nucleo, mas nao o AGENTS.md: as regras do projeto nao chegam ao Claude. ${migrar}` }
      : { estado: 'bloqueio', texto: `CLAUDE.md nao importa o AGENTS.md: o Claude Code carrega o arquivo e nao chega nas leis. ${migrar}` })
  } else if (IMPORTA_NUCLEO.test(claude)) {
    itens.push({ estado: 'atencao', texto: `CLAUDE.md importa o AGENTS.md e tambem o nucleo: o nucleo carrega duas vezes. ${migrar}` })
  }
  if (gemini !== null && !gemini.includes('AGENTS.md')) itens.push({ estado: 'atencao', texto: `GEMINI.md nao cita o AGENTS.md. ${migrar}` })

  const skills = estadoDasSkills(l)
  if (!skills.sincronizadas && !skills.destinos.some((d) => d.registro.estado === 'corrompido')) {
    itens.push({ estado: 'atencao', texto: `skills do mentor fora das pastas que as ferramentas leem (.agents/skills e .claude/skills). ${migrar}` })
  } else if (problemasDasSkills(skills).length) {
    itens.push({ estado: 'atencao', texto: `${problemasDasSkills(skills).length} problema(s) nas copias de skills. Rode: node mentor.mjs verificar` })
  }
  if (!itens.length) itens.push({ estado: 'ok', texto: 'pontos de entrada carregam o nucleo pelo AGENTS.md, e as skills estao nas pastas das ferramentas' })
  return itens
}

// ---- skills por copia gerada

/**
 * O Codex e o Antigravity procuram skills em `.agents/skills/`; o Claude Code, em `.claude/skills/`.
 * Nenhum olha `.mentor/skills/`.
 *
 * ⚠️ **Copia, nao link.** Link de pasta nao vai para o git: o clone em outra maquina dependeria de
 * um script de instalacao, que falha calado com `--ignore-scripts`. E nenhuma das tres ferramentas
 * documenta juncao do Windows. Copia versionada funciona no clone na hora; o `verificar` confere que
 * ela continua igual a fonte.
 */
export const DESTINOS_DE_SKILLS = ['.agents/skills', '.claude/skills']
export const REGISTRO_DE_SKILLS = '.mentor-skills.json'

function arquivosDaPasta(pasta, base = pasta) {
  return readdirSync(pasta).sort().flatMap((nome) => {
    const caminho = join(pasta, nome)
    return statSync(caminho).isDirectory() ? arquivosDaPasta(caminho, base) : [posix(relative(base, caminho))]
  })
}

/**
 * Caminho e conteudo de **todos** os arquivos da pasta, inclusive os de apoio. Texto entra com fim
 * de linha normalizado: o git de outra maquina pode trocar `\n` por `\r\n` no checkout, e a copia
 * nao pode virar "editada" so' por isso.
 */
export function hashDaPasta(pasta) {
  const total = createHash('sha256')
  for (const rel of arquivosDaPasta(pasta)) {
    const bruto = readFileSync(join(pasta, rel))
    const conteudo = bruto.includes(0) ? bruto : Buffer.from(lf(bruto.toString('utf8')), 'utf8')
    total.update(rel).update('\0').update(createHash('sha256').update(conteudo).digest('hex')).update('\n')
  }
  return total.digest('hex')
}

/** Pastas com `SKILL.md`. Nome repetido entre pacote e projeto e' conflito: nenhum dos dois vence sozinho. */
export function fontesDeSkills(opcoes) {
  const { pacote, docs } = locais(opcoes)
  const fontes = new Map()
  const conflitos = []
  for (const [origem, base] of [['pacote', join(pacote, 'skills')], ['projeto', join(docs, 'skills')]]) {
    if (!existsSync(base)) continue
    for (const nome of readdirSync(base).sort()) {
      const pasta = join(base, nome)
      if (!statSync(pasta).isDirectory() || !existsSync(join(pasta, 'SKILL.md'))) continue
      const ja = fontes.get(nome)
      if (ja) { conflitos.push({ nome, caminhos: [ja.pasta, pasta] }); continue }
      fontes.set(nome, { pasta, origem })
    }
  }
  for (const c of conflitos) fontes.delete(c.nome)
  return { fontes, conflitos }
}

function lerRegistro(pastaDestino) {
  const arquivo = join(pastaDestino, REGISTRO_DE_SKILLS)
  if (!existsSync(arquivo)) return { estado: 'ausente', copias: {} }
  try {
    const j = JSON.parse(readFileSync(arquivo, 'utf8'))
    if (!j || typeof j.copias !== 'object' || j.copias === null || Array.isArray(j.copias)) throw new Error('forma')
    for (const v of Object.values(j.copias)) if (!v || typeof v.hash !== 'string') throw new Error('forma')
    return { estado: 'ok', copias: j.copias }
  } catch {
    return { estado: 'corrompido', copias: {} }
  }
}

function escreverRegistro(pastaDestino, copias) {
  mkdirSync(pastaDestino, { recursive: true })
  const ordenadas = Object.fromEntries(Object.entries(copias).sort(([a], [b]) => a.localeCompare(b)))
  writeFileSync(join(pastaDestino, REGISTRO_DE_SKILLS), JSON.stringify({
    _leia: 'Gerado pelo mentor-agent. As pastas listadas aqui sao copias das skills do pacote (.mentor/skills) e do projeto (docs-mentor/skills), com o hash de cada uma. Pasta fora desta lista nao e do mentor e nunca e tocada. Edite a fonte, nao a copia, e rode `node mentor.mjs gerar`.',
    copias: ordenadas,
  }, null, 2) + '\n', 'utf8')
}

/**
 * O retrato de cada destino, sem escrever nada. Uma pasta so' e' do mentor se esta' no registro **e**
 * o hash dela e' o registrado: registro ausente ou corrompido nao autoriza assumir nada.
 */
export function estadoDasSkills(opcoes) {
  const l = locais(opcoes)
  const { fontes, conflitos } = fontesDeSkills(l)
  const hashDaFonte = new Map([...fontes].map(([nome, f]) => [nome, hashDaPasta(f.pasta)]))
  const destinos = DESTINOS_DE_SKILLS.map((rel) => {
    const pasta = join(l.raiz, rel)
    const registro = lerRegistro(pasta)
    const itens = []
    if (registro.estado === 'corrompido') return { rel, pasta, registro, itens }
    for (const [nome, fonte] of fontes) {
      const copia = join(pasta, nome)
      const registrada = registro.copias[nome]
      if (!existsSync(copia)) { itens.push({ nome, estado: 'ausente', fonte }); continue }
      if (!registrada) { itens.push({ nome, estado: 'conflito', fonte }); continue }
      const atual = hashDaPasta(copia)
      if (atual !== registrada.hash) { itens.push({ nome, estado: 'editada', fonte }); continue }
      itens.push({ nome, estado: atual === hashDaFonte.get(nome) ? 'ok' : 'desatualizada', fonte })
    }
    for (const [nome, registrada] of Object.entries(registro.copias)) {
      if (fontes.has(nome) || conflitos.some((c) => c.nome === nome)) continue
      const copia = join(pasta, nome)
      if (!existsSync(copia)) itens.push({ nome, estado: 'orfa-sumida' })
      else itens.push({ nome, estado: hashDaPasta(copia) === registrada.hash ? 'orfa' : 'orfa-editada' })
    }
    return { rel, pasta, registro, itens }
  })
  return { raiz: l.raiz, fontes, conflitos, destinos, sincronizadas: destinos.some((d) => d.registro.estado === 'ok') }
}

/** O que impede as copias de serem iguais as fontes, uma linha por problema. */
export function problemasDasSkills(estado) {
  const problemas = []
  for (const c of estado.conflitos) {
    problemas.push({ onde: `skills/${c.nome}`, problema: `existe no pacote e no projeto (${c.caminhos.map(posix).join(' e ')}): nenhuma das duas e copiada. Renomeie a do projeto` })
  }
  for (const d of estado.destinos) {
    if (d.registro.estado === 'corrompido') {
      problemas.push({ onde: `${d.rel}/${REGISTRO_DE_SKILLS}`, problema: 'registro corrompido: nada e copiado nem removido nessa pasta. Apague as copias do mentor e o registro, e rode gerar' })
      continue
    }
    for (const i of d.itens) {
      const onde = `${d.rel}/${i.nome}`
      if (i.estado === 'ausente') problemas.push({ onde, problema: 'copia ausente. Rode: node mentor.mjs gerar' })
      else if (i.estado === 'desatualizada') problemas.push({ onde, problema: 'copia diferente da fonte. Rode: node mentor.mjs gerar' })
      else if (i.estado === 'conflito') problemas.push({ onde, problema: 'pasta que o mentor nao criou, com o nome de uma skill dele: nada foi sobrescrito. Mova a skill do projeto para docs-mentor/skills/ ou renomeie' })
      else if (i.estado === 'editada') problemas.push({ onde, problema: `copia editada depois de gerada: leve a mudanca para ${posix(relative(estado.raiz, i.fonte.pasta))} (a fonte) e apague a copia para gerar de novo` })
      else if (i.estado === 'orfa') problemas.push({ onde, problema: 'a fonte saiu e a copia ficou. Rode: node mentor.mjs gerar' })
      else if (i.estado === 'orfa-editada') problemas.push({ onde, problema: 'a fonte saiu e a copia foi editada: preservada. Apague a pasta se nao for mais usada' })
      else if (i.estado === 'orfa-sumida') problemas.push({ onde, problema: 'registrada e apagada a mao. Rode: node mentor.mjs gerar' })
    }
  }
  return problemas
}

/**
 * Copia o que falta, atualiza o que ficou para tras, remove a copia intacta cuja fonte saiu. Nunca
 * sobrescreve nem remove pasta que nao seja do mentor, nem copia editada. Recusa e diz o motivo.
 */
export function sincronizarSkills(opcoes) {
  const l = locais(opcoes)
  const estado = estadoDasSkills(l)
  const r = { copiadas: [], atualizadas: [], removidas: [], avisos: [], recusas: [] }
  for (const c of estado.conflitos) {
    r.recusas.push(`skill "${c.nome}" existe no pacote e no projeto (${c.caminhos.map((p) => posix(relative(l.raiz, p))).join(' e ')}): nenhuma das duas foi copiada. Renomeie a do projeto.`)
  }
  for (const d of estado.destinos) {
    if (d.registro.estado === 'corrompido') {
      r.recusas.push(`${d.rel}/${REGISTRO_DE_SKILLS} corrompido: nada foi copiado nem removido em ${d.rel}. Apague as copias do mentor e o registro, e rode de novo.`)
      continue
    }
    const copias = { ...d.registro.copias }
    let mudou = false
    for (const i of d.itens) {
      const copia = join(d.pasta, i.nome)
      if (i.estado === 'ausente' || i.estado === 'desatualizada') {
        if (i.estado === 'desatualizada') rmSync(copia, { recursive: true, force: true })
        mkdirSync(d.pasta, { recursive: true })
        cpSync(i.fonte.pasta, copia, { recursive: true })
        copias[i.nome] = { fonte: posix(relative(l.raiz, i.fonte.pasta)), hash: hashDaPasta(copia) }
        ;(i.estado === 'ausente' ? r.copiadas : r.atualizadas).push(`${d.rel}/${i.nome}`)
        mudou = true
      } else if (i.estado === 'conflito') {
        r.recusas.push(`${d.rel}/${i.nome} ja existe e nao foi criada pelo mentor: nada foi sobrescrito. Mova a skill do projeto para docs-mentor/skills/ ou renomeie.`)
      } else if (i.estado === 'editada') {
        r.avisos.push(`${d.rel}/${i.nome} foi editada depois de gerada: preservada. Leve a mudanca para a fonte e apague a copia para gerar de novo.`)
      } else if (i.estado === 'orfa') {
        rmSync(copia, { recursive: true, force: true })
        delete copias[i.nome]
        r.removidas.push(`${d.rel}/${i.nome}`)
        mudou = true
      } else if (i.estado === 'orfa-sumida') {
        delete copias[i.nome]
        mudou = true
      } else if (i.estado === 'orfa-editada') {
        r.avisos.push(`${d.rel}/${i.nome}: a fonte saiu e a copia foi editada; preservada. Apague a pasta se nao for mais usada.`)
      }
    }
    if (mudou || (d.registro.estado === 'ausente' && Object.keys(copias).length)) escreverRegistro(d.pasta, copias)
  }
  return r
}

export function relatorioDeSkills(r) {
  const linhas = []
  if (r.copiadas.length) linhas.push(`Skills copiadas: ${r.copiadas.join(', ')}.`)
  if (r.atualizadas.length) linhas.push(`Skills atualizadas: ${r.atualizadas.join(', ')}.`)
  if (r.removidas.length) linhas.push(`Copias sem fonte removidas: ${r.removidas.join(', ')}.`)
  for (const a of r.avisos) linhas.push(`AVISO: ${a}`)
  for (const a of r.recusas) linhas.push(`RECUSA: ${a}`)
  return linhas
}

// ---- o fim da instalacao, igual nos dois caminhos

/**
 * O que acontece depois da copia, chamado por `mentor.mjs` (de dentro de `node_modules`) e por
 * `cmd-pacote.ts` (da raiz). Ate' a 0.13.0 cada caminho repetia esses passos, e os dois divergiram.
 *
 * @param {string} destino
 * @param {{ normas?: Array<{ arquivo: string, estado: string, mais: number, menos: number }>, migrouDocs?: boolean }} [opcoes]
 */
export function concluirInstalacao(destino, { normas = [], migrouDocs = false } = {}) {
  const l = locais(destino)
  for (const linha of avisoDeNormas(normas)) console.log(linha)
  if (atualizarHookDoMentor(destino)) console.log('Hook .githooks/pre-push regravado no modelo novo: envio para wip/ pula os gates.')
  if (migrouDocs) console.log('Migracao concluida: docs/ foi renomeada para docs-mentor/.')

  const e = criarPontosDeEntrada(l)
  if (e.criados.length) console.log(`Ponto de entrada criado: ${e.criados.join(', ')}.`)
  const bloco = sincronizarAgentes(l)
  if (bloco.estado === 'inserido') console.log('Nucleo inserido no topo do AGENTS.md, entre marcadores: o resto do arquivo nao foi tocado.')
  else if (bloco.estado === 'atualizado') console.log('Nucleo atualizado dentro do AGENTS.md.')
  else if (bloco.estado === 'invalido') console.log(`AVISO: AGENTS.md com marcadores do nucleo invalidos (${bloco.detalhe}): nada foi alterado. Conserte e rode node mentor.mjs gerar.`)
  for (const linha of relatorioDeSkills(sincronizarSkills(l))) console.log(linha)

  if (e.preservados.length) {
    const pendentes = diagnosticoDosPontosDeEntrada(l).filter((i) => i.estado !== 'ok' && !i.texto.startsWith('skills'))
    console.log(`\nJa existia, e nao foi editado: ${e.preservados.join(', ')}.`)
    for (const p of pendentes) console.log(`  ${p.texto}`)
  }

  const lint = analisadoresSemIgnorar(destino)
  if (lint.length) {
    console.log(`\nAVISO: ${lint.map((a) => a.arquivo).join(', ')} nao ignora .mentor/.`)
    console.log('O analisador vai varrer o pacote e reprovar o gate de lint por estilo que nao e do seu codigo.')
    console.log('Acrescente:')
    for (const a of lint) console.log(`  ${a.arquivo}:  ${a.linha}`)
  }
  // Reinstalar sobre projeto inicializado nao pede `init`: convidar a refazer os portoes ja
  // respondidos e' o comando desaprendendo o estado do projeto a cada atualizacao.
  console.log(existsSync(join(destino, 'docs-mentor', 'contexto.json'))
    ? '\nProjeto ja inicializado. Proximo passo: `node mentor.mjs gerar`, para regenerar as vistas com a versao nova.'
    : '\nProximo passo: `node mentor.mjs init`, e depois responder os portoes V, C e 0.')
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
