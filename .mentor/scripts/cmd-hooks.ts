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
import { escopoExclusivoDoMentor, verificarEnvioIncremental } from './cobertura-incremental.ts'
import { perfilDeProcesso } from './politica-rigor.ts'

function exigePr(texto: unknown): boolean {
  if (typeof texto !== 'string' || !texto.trim()) return false
  const t = texto.toLowerCase()
  if (t.includes('sem pr') || t.includes('dispensado') || t.includes('nao exige') || t.includes('nenhum')) return false
  return t.includes('pr') || t.includes('pull request') || t.includes('revisao')
}

export function arquivoEhCodigo(arquivo: string): boolean {
  const norm = arquivo.replace(/\\/g, '/')
  // Testes sob qualquer pasta (inclusive docs-mentor/) sao codigo
  if (
    norm.endsWith('.test.ts') ||
    norm.endsWith('.test.js') ||
    norm.endsWith('.spec.ts') ||
    norm.endsWith('.spec.js')
  ) {
    return true
  }
  // Scripts de esteira e hooks sao codigo/regras executaveis
  if (norm.startsWith('.github/workflows/') || norm.startsWith('.githooks/')) {
    return true
  }
  // Pacote intacto nao e' codigo do projeto; patch local em `.mentor/` e'. A mesma regra do `finalizar` e da auditoria.
  if (norm.startsWith('.mentor/')) return !arquivoIntactoDoPacote(norm)
  if (
    norm.startsWith('docs-mentor/') ||
    norm.startsWith('docs/') ||
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

function shaEstaEmWorktree(raiz: string, sha: string): boolean {
  try {
    const r = spawnSync('git', ['worktree', 'list', '--porcelain'], { cwd: raiz, encoding: 'utf8' })
    if (r.status === 0 && r.stdout) {
      return r.stdout.split('\n').some((linha) => linha.startsWith('HEAD ') && linha.slice(5).trim() === sha)
    }
  } catch {
    // ignora se git worktree falhar
  }
  return false
}

function envioExclusivoDoMentor(raiz: string, refs: RefEnviada[] | null): boolean {
  if (!refs?.length) return false
  const destinos = refs.filter((r) => !SO_ZEROS.test(r.shaLocal) && !r.remoto.startsWith(PREFIXO_WIP))
  if (!destinos.length) return false
  return destinos.every((r) => {
    let base = r.shaRemoto
    if (SO_ZEROS.test(base)) {
      const ancestral = spawnSync('git', ['merge-base', r.shaLocal, 'refs/remotes/origin/main'], { cwd: raiz, encoding: 'utf8' })
      if (ancestral.status !== 0) return false
      base = ancestral.stdout.trim()
    }
    const diff = spawnSync('git', ['-c', 'core.quotepath=false', 'diff', '--name-only', '-z', base, r.shaLocal], { cwd: raiz, encoding: 'utf8' })
    return diff.status === 0 && escopoExclusivoDoMentor(diff.stdout.split('\0'))
  })
}

/**
 * Ordem do pre-push (V5):
 * 1. Exclusao de ramos remotos (sem gates)
 * 2. Envio exclusivo para wip/ passa direto
 * 3. Checagens baratas primeiro:
 *    - Envio direto ao ramo principal protegido
 *    - Commits tocando codigo sem marca de tarefa ou light
 *    - Consistencia da arvore local e commit enviado
 * 4. Execucao de gates (com cache conservador e parada na primeira falha)
 * 5. Aviso de achados do verificar
 */
export function prePush(): number {
  const c = caminhos()
  const refs = lerRefsEnviadas()

  // 1. Exclusao de ramos remotos
  if (refs && refs.length > 0 && refs.every((r) => SO_ZEROS.test(r.shaLocal))) {
    console.log('Exclusao de ramo remoto: sem gates e sem checagens.')
    return 0
  }

  const enviando = refs ? refs.filter((r) => !SO_ZEROS.test(r.shaLocal)) : null
  if (enviando && enviando.length === 0) return 0

  // 2. Envio exclusivo de WIP
  if (enviando && enviando.every((r) => r.remoto.startsWith(PREFIXO_WIP))) {
    console.log(`\nEnvio de WIP (${enviando.map((r) => r.remoto.replace('refs/heads/', '')).join(', ')}): sem gates e sem checagem de ID.`)
    console.log('WIP guarda o trabalho fora do disco. O que barra e o merge no ramo principal: pronto-para-merge na esteira.')
    if (hookAntigoJaRodouGates(c.raiz)) {
      console.log('Aviso: .githooks/pre-push e do modelo antigo e rodou os gates antes daqui. Para o WIP pular os gates: node mentor.mjs hooks --instalar')
    }
    return 0
  }

  if (!existe(join(c.raiz, '.git'))) return 0

  let ctx: any = null
  try { ctx = carregarContexto() } catch (e: any) {
    console.error(`Envio barrado: não foi possível carregar contexto.json para conferir a política de revisão: ${e.message}`)
    return 1
  }

  const ramoPrincipal = ctx?.versionamento?.ramo_principal ?? 'main'
  const revisao = ctx?.versionamento?.revisao_antes_do_merge

  // 3.1. Envio direto ao ramo principal com PR obrigatorio (GIT 5/5)
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

  // 3.2. Commits tocando codigo sem ID de tarefa (GIT 3/5): ramos enviados menos os que vao para wip/
  const intervalos: string[][] = []
  if (enviando) {
    for (const r of enviando.filter((x) => !x.remoto.startsWith(PREFIXO_WIP))) {
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

  // 3.3. Consistencia entre working tree e commit enviado
  const rStatus = spawnSync('git', ['status', '--porcelain'], { cwd: c.raiz, encoding: 'utf8' })
  const linhasStatus = (rStatus.stdout ?? '').split('\n').map((l) => l.trim()).filter(Boolean)
  const arquivosSujos = linhasStatus
    .map((l) => l.slice(3).trim())
    .filter(arquivoEhCodigo)
  if (arquivosSujos.length > 0) {
    console.error('\nEnvio barrado: working tree possui alteracoes nao commitadas em arquivos de codigo:')
    for (const a of arquivosSujos.slice(0, 5)) console.error(`  - ${a}`)
    console.error('Comite ou descarte as alteracoes para que a verificacao reflita exatamente o commit enviado.')
    return 1
  }

  if (enviando) {
    const rHead = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: c.raiz, encoding: 'utf8' })
    const headAtual = rHead.status === 0 ? (rHead.stdout ?? '').trim() : null
    const naoCasam = enviando.filter((r) => !r.remoto.startsWith(PREFIXO_WIP) && r.shaLocal !== headAtual)
    if (naoCasam.length > 0) {
      const emWorktree = shaEstaEmWorktree(c.raiz, naoCasam[0]!.shaLocal)
      if (emWorktree) {
        console.log(`\nEnvio de ramo em worktree: commit ${naoCasam[0]!.shaLocal.slice(0, 7)} ativo em worktree secundario.`)
      } else {
        console.warn(
          `\nAviso: o commit enviado para ${naoCasam[0]!.remoto} (${naoCasam[0]!.shaLocal.slice(0, 7)}) difere do HEAD local (${headAtual ? headAtual.slice(0, 7) : 'indefinido'}).\n` +
          `Os gates locais avaliam o working tree atual. A esteira remota do GitHub validara o conteudo do PR.\n`,
        )
      }
    }
  }

  // A revisão é conferida contra cada ref enviada, nunca contra o HEAD da janela atual.
  const destinosDaRevisao = enviando
    ? enviando.filter((r) => !r.remoto.startsWith(PREFIXO_WIP)).map((r) => ({ local: r.shaLocal, remoto: SO_ZEROS.test(r.shaRemoto) ? null : r.shaRemoto }))
    : [{ local: (spawnSync('git', ['rev-parse', 'HEAD'], { cwd: c.raiz, encoding: 'utf8' }).stdout ?? '').trim(), remoto: null }]
  for (const destino of destinosDaRevisao) {
    try {
      const problemas = verificarEnvioIncremental(c.raiz, destino.local, destino.remoto)
      if (problemas.length) {
        console.error(`\nEnvio barrado: revisão incremental não cobre o ref ${destino.local.slice(0, 12)}:`)
        for (const problema of problemas) console.error(`  - ${problema}`)
        return 1
      }
    } catch (e: any) {
      console.error(`\nEnvio barrado: não foi possível conferir a revisão incremental: ${e.message}`)
      return 1
    }
  }

  // 4. Execucao de Gates (com cache e parada na primeira falha)
  if (hookAntigoJaRodouGates(c.raiz)) {
    console.log('Aviso: .githooks/pre-push e do modelo antigo e ja rodou os gates. Para o envio de WIP pular os gates: node mentor.mjs hooks --instalar')
  } else if (envioExclusivoDoMentor(c.raiz, enviando)) {
    console.log('Envio exclusivo de melhoria do Mentor: gates do produto não se aplicam.')
  } else if (perfilDeProcesso(ctx) !== 'estrito') {
    console.log('Perfil proporcional: pre-push não executa a suíte inteira; riscos concretos exigem evidência na tarefa enviada.')
  } else if (gates() !== 0) {
    console.error('\nEnvio barrado: gate reprovado. Conserte, ou, se for trabalho em andamento, envie para um ramo wip/<id>.')
    return 1
  }

  // 5. Mostrar o `verificar`, sem barrar
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
