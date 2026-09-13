import { spawnSync } from 'node:child_process'
import { chmodSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { caminhos, escreverTexto, existe, lerTexto } from './arquivos.ts'
import { carregarContexto } from './vistas.ts'
import { arquivoIntactoDoPacote } from './cmd-pacote.ts'
import { coletarAchados } from './cmd-verificar.ts'
import { gates } from './cmd-gates.ts'
import { HOOK_PRE_PUSH } from './instalar.mjs'
import { ID_DE_TAREFA_NO_TITULO, MARCA_LIGHT_NO_TITULO } from './tipos.ts'

function exigePr(texto: unknown): boolean {
  if (typeof texto !== 'string' || !texto.trim()) return false
  const t = texto.toLowerCase()
  if (t.includes('sem pr') || t.includes('dispensado') || t.includes('nao exige') || t.includes('nenhum')) return false
  return t.includes('pr') || t.includes('pull request') || t.includes('revisao')
}

function arquivoEhCodigo(arquivo: string): boolean {
  const norm = arquivo.replace(/\\/g, '/')
  // Pacote intacto nao e' codigo do projeto; patch local em `.mentor/` e'. A mesma regra do `finalizar` e da auditoria.
  if (norm.startsWith('.mentor/')) return !arquivoIntactoDoPacote(norm)
  if (
    norm.startsWith('docs-mentor/') ||
    norm.startsWith('docs/') ||
    norm.startsWith('.githooks/') ||
    norm.startsWith('.github/') ||
    norm.startsWith('.obsidian/')
  ) {
    return false
  }
  if (norm.endsWith('.md') || norm.endsWith('.txt') || norm === '.gitignore' || norm === '.gitattributes' || norm === 'LICENSE') {
    return false
  }
  return true
}

const SO_ZEROS = /^0+$/
const PREFIXO_WIP = 'refs/heads/wip/'

interface RefEnviada { local: string; shaLocal: string; remoto: string; shaRemoto: string }

/**
 * O protocolo do git: o `pre-push` recebe na entrada padrao uma linha por ramo enviado,
 * `<ref local> <sha local> <ref remoto> <sha remoto>`. `null` quando nao ha entrada, que e' o caso de
 * quem roda `hooks --pre-push` a mao: ai' vale o ramo atual, como ate' a 0.8.x.
 *
 * ⚠️ Ate' a 0.8.x o hook olhava so' o ramo atual. `git push origin outro:main` a partir de outro ramo
 * passava pela trava do principal, e conferia os commits do ramo errado.
 */
function lerRefsEnviadas(): RefEnviada[] | null {
  if (process.stdin.isTTY) return null
  let texto = ''
  try { texto = readFileSync(0, 'utf8') } catch { return null }
  const refs = texto.split('\n')
    .map((l) => l.trim().split(/\s+/))
    .filter((p) => p.length === 4)
    .map(([local, shaLocal, remoto, shaRemoto]) => ({ local: local!, shaLocal: shaLocal!, remoto: remoto!, shaRemoto: shaRemoto! }))
  return refs.length ? refs : null
}

/** O arquivo do hook ainda e' o modelo da 0.8.x, que roda os gates antes de chamar este comando. */
function hookAntigoJaRodouGates(raiz: string): boolean {
  const arquivo = join(raiz, '.githooks', 'pre-push')
  return existe(arquivo) && lerTexto(arquivo).split('\n').some((l) => l.trim().startsWith('node mentor.mjs gates'))
}

/**
 * Tres barreiras, nesta ordem: gates, envio direto ao principal protegido, commit de codigo sem tarefa.
 * Envio so' para `wip/` passa direto: WIP guarda trabalho fora do disco, e o que barra e' o merge no
 * principal, conferido na esteira por `pronto-para-merge`.
 */
export function prePush(): number {
  const c = caminhos()
  const refs = lerRefsEnviadas()
  const enviando = refs ? refs.filter((r) => !SO_ZEROS.test(r.shaLocal)) : null
  if (enviando && enviando.length === 0) return 0 // so' apagando ramo remoto
  if (enviando && enviando.every((r) => r.remoto.startsWith(PREFIXO_WIP))) {
    console.log(`\nEnvio de WIP (${enviando.map((r) => r.remoto.replace('refs/heads/', '')).join(', ')}): sem gates e sem checagem de ID.`)
    console.log('WIP guarda o trabalho fora do disco. O que barra e o merge no ramo principal: pronto-para-merge na esteira.')
    if (hookAntigoJaRodouGates(c.raiz)) {
      console.log('Aviso: .githooks/pre-push e do modelo antigo e rodou os gates antes daqui. Para o WIP pular os gates: node mentor.mjs hooks --instalar')
    }
    return 0
  }

  // 1. Gates. Ficavam no arquivo do hook, que nao sabe para onde o push vai.
  if (hookAntigoJaRodouGates(c.raiz)) {
    console.log('Aviso: .githooks/pre-push e do modelo antigo e ja rodou os gates. Para o envio de WIP pular os gates: node mentor.mjs hooks --instalar')
  } else if (gates() !== 0) {
    console.error('\nEnvio barrado: gate reprovado. Conserte, ou, se for trabalho em andamento, envie para um ramo wip/<id>.')
    return 1
  }

  if (!existe(join(c.raiz, '.git'))) return 0

  let ctx: any = null
  try { ctx = carregarContexto() } catch { return 0 }

  // 2. Mostrar o `verificar`, sem barrar. Medido em campo: reprovado chegou ao main e ficou dias sem
  // ninguem ver, porque nada o rodava. Barrar nao serve: tarefa em execucao e rascunho de stack tem
  // marcador legitimo, e travar o envio por eles vira laco. Quem barra e' a esteira.
  try {
    const achados = coletarAchados()
    if (achados.length) {
      console.warn(`\nAviso: o verificar tem ${achados.length} achado(s). O envio segue; a esteira pode barrar.`)
      for (const a of achados.slice(0, 10)) console.warn(`  [${a.familia}] ${a.onde}: ${a.problema}`)
      if (achados.length > 10) console.warn(`  ... e mais ${achados.length - 10}. Rode: node mentor.mjs verificar`)
    }
  } catch {
    // verificar quebrado nao pode travar o envio
  }

  const ramoPrincipal = ctx?.versionamento?.ramo_principal ?? 'main'
  const revisao = ctx?.versionamento?.revisao_antes_do_merge

  // 3. Envio direto ao ramo principal com PR obrigatorio (GIT 5/5), venha de onde vier
  const rRamo = spawnSync('git', ['branch', '--show-current'], { cwd: c.raiz, encoding: 'utf8' })
  const ramoAtual = (rRamo.stdout ?? '').trim()
  const vaiAoPrincipal = enviando
    ? enviando.some((r) => r.remoto === `refs/heads/${ramoPrincipal}`)
    : ramoAtual === ramoPrincipal
  if (vaiAoPrincipal && exigePr(revisao)) {
    console.error(
      `\nEnvio barrado: push direto no ramo principal "${ramoPrincipal}".\n` +
      `O projeto declara em docs-mentor/contexto.json (versionamento.revisao_antes_do_merge):\n` +
      `"${revisao}"\n` +
      `Crie uma branch de trabalho e envie uma Pull Request.\n`,
    )
    return 1
  }

  // 4. Commits tocando codigo sem ID de tarefa (GIT 3/5): os dos ramos enviados, menos os que vao para wip/
  const intervalos: string[][] = []
  if (enviando) {
    for (const r of enviando.filter((x) => !x.remoto.startsWith(PREFIXO_WIP))) {
      // Ramo novo no remoto: os commits que nenhum ramo remoto conhecido tem ainda.
      intervalos.push(SO_ZEROS.test(r.shaRemoto) ? [r.shaLocal, '--not', '--remotes'] : [`${r.shaRemoto}..${r.shaLocal}`])
    }
  } else {
    let revRange = `origin/${ramoPrincipal}..HEAD`
    const rChecaRef = spawnSync('git', ['rev-parse', '--verify', `origin/${ramoPrincipal}`], { cwd: c.raiz, encoding: 'utf8' })
    if (rChecaRef.status !== 0) {
      if (ramoAtual !== ramoPrincipal) revRange = `${ramoPrincipal}..HEAD`
      else revRange = 'HEAD~5..HEAD'
    }
    intervalos.push([revRange])
  }

  for (const intervalo of intervalos) {
    const semMarca = commitDeCodigoSemMarca(c.raiz, intervalo)
    if (semMarca) {
      console.error(
        `\nEnvio barrado: commit sem ID de tarefa tocando codigo de producao.\n` +
        `Commit: ${semMarca.hash.slice(0, 7)} - "${semMarca.titulo}"\n` +
        `Arquivos afetados: ${semMarca.arquivos.slice(0, 3).join(', ')}${semMarca.arquivos.length > 3 ? '...' : ''}\n` +
        `O Nucleo §2 pede, para commit que toca codigo, uma das duas marcas no titulo:\n` +
        `  com tarefa:  <tipo>(<ID da tarefa>): <descricao>   ex: feat(TASK-RF-001): adicionar validacao\n` +
        `  Light:       <tipo>(light): <descricao>            ex: fix(light): corrigir typo no botao\n` +
        `Light e' lista fechada (nucleo §5): typo, formatacao, renomear arquivo, dependencia de desenvolvimento.\n` +
        `A auditoria lista todo commit Light para conferir se cabia na lista.\n` +
        `Para corrigir o titulo do ultimo commit sem perder o trabalho: git commit --amend -m "<titulo>".\n` +
        `Se for trabalho em andamento, envie para um ramo wip/<id>: WIP nao passa por esta checagem.\n`,
      )
      return 1
    }
  }
  return 0
}

/** O primeiro commit do intervalo que toca codigo sem ID de tarefa nem marca Light. Merge e revert sao isentos. */
function commitDeCodigoSemMarca(raiz: string, intervalo: string[]): { hash: string; titulo: string; arquivos: string[] } | null {
  try {
    const rCommits = spawnSync('git', ['log', ...intervalo, '--format=%H%x09%P%x09%s'], { cwd: raiz, encoding: 'utf8' })
    if (rCommits.status === 0 && rCommits.stdout) {
      const linhas = rCommits.stdout.split('\n').map((s) => s.trim()).filter(Boolean)
      for (const linha of linhas) {
        const [hash, paisStr, ...resto] = linha.split('\t')
        if (!hash) continue
        const titulo = resto.join('\t')
        const pais = (paisStr ?? '').split(' ').filter(Boolean)

        // Isencao: merge commits
        if (pais.length > 1 || titulo.startsWith('Merge ')) continue
        // Isencao: revert commits
        if (titulo.startsWith('Revert ')) continue

        const rDiff = spawnSync('git', ['diff-tree', '--no-commit-id', '--name-only', '-r', hash], { cwd: raiz, encoding: 'utf8' })
        if (rDiff.status === 0 && rDiff.stdout) {
          const arquivos = rDiff.stdout.split('\n').map((s) => s.trim()).filter(Boolean).filter(arquivoEhCodigo)
          if (arquivos.length && !ID_DE_TAREFA_NO_TITULO.test(titulo) && !MARCA_LIGHT_NO_TITULO.test(titulo)) {
            return { hash, titulo, arquivos }
          }
        }
      }
    }
  } catch {
    // git quebrado nao trava o envio
  }
  return null
}

/**
 * Barreira local, sem dependencia nenhuma: um arquivo versionado mais `core.hooksPath`.
 *
 * Deliberadamente em **`pre-push`, nao em `pre-commit`**: commit precisa continuar barato, senao
 * alguem aprende a usar `--no-verify` e a barreira inteira deixa de existir.
 */
export function instalarHooks(): void {
  const c = caminhos()
  const pasta = join(c.raiz, '.githooks')
  const arquivo = join(pasta, 'pre-push')

  escreverTexto(arquivo, HOOK_PRE_PUSH)
  try { chmodSync(arquivo, 0o755) } catch { /* Windows nao precisa, e nao falha por isso */ }

  const r = spawnSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: c.raiz, encoding: 'utf8' })
  if (r.status === 0) {
    console.log('Hook instalado em .githooks/pre-push e ligado por core.hooksPath.')
    console.log('Versionado junto do projeto: quem clonar so precisa rodar `mentor hooks --instalar`.')
  } else {
    console.log('Arquivo criado em .githooks/pre-push, mas nao consegui rodar o git aqui.')
    console.log('Ligue com: git config core.hooksPath .githooks')
  }
  if (!existe(join(c.raiz, '.git'))) {
    console.log('Aviso: este projeto ainda nao tem repositorio git.')
  }
}
