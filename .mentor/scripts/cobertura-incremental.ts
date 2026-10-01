import { spawnSync } from 'node:child_process'
import { existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, realpathSync, rmSync } from 'node:fs'
import { isAbsolute, join, relative, sep } from 'node:path'
import { tmpdir } from 'node:os'
import type { Contexto, RevisaoIncremental, Tarefa } from './tipos.ts'
import { assinaturaSemanticaDaTarefa, hashAuditavel, hashSha256 } from './revisao-incremental.ts'
import { politicaDaTarefa } from './politica-rigor.ts'

export interface FonteDeCobertura {
  ler(caminho: string): Buffer | null
  listar(prefixo: string): string[]
}

function git(raiz: string, args: string[], env?: NodeJS.ProcessEnv, input?: Buffer): { ok: boolean; bytes: Buffer } {
  const r = spawnSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: raiz, encoding: 'buffer', maxBuffer: 64 * 1024 * 1024, env, input })
  return { ok: r.status === 0, bytes: Buffer.from(r.stdout ?? []) }
}

function caminhoInterno(raiz: string, caminho: string): string {
  const normalizado = caminho.replace(/\\/g, '/')
  if (!normalizado || isAbsolute(normalizado) || /^[A-Za-z]:/.test(normalizado) || normalizado.split('/').includes('..')) throw new Error(`Caminho fora do projeto: ${caminho}`)
  const absoluto = join(raiz, normalizado)
  const rel = relative(raiz, absoluto)
  if (rel === '..' || rel.startsWith(`..${sep}`)) throw new Error(`Caminho fora do projeto: ${caminho}`)
  return absoluto
}

export function fonteLocal(raiz: string): FonteDeCobertura {
  return {
    ler(caminho) {
      try {
        const absoluto = caminhoInterno(raiz, caminho)
        const rel = relative(realpathSync(raiz), realpathSync(absoluto))
        if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return null
        return lstatSync(absoluto).isSymbolicLink() ? Buffer.from(readlinkSync(absoluto)) : readFileSync(absoluto)
      } catch { return null }
    },
    listar(prefixo) {
      const pasta = caminhoInterno(raiz, prefixo)
      if (!existsSync(pasta)) return []
      return readdirSync(pasta, { withFileTypes: true }).filter((x) => x.isFile()).map((x) => `${prefixo.replace(/\/+$/, '')}/${x.name}`)
    },
  }
}

export function fonteDoRef(raiz: string, sha: string): FonteDeCobertura {
  if (!/^[a-f0-9]{40,64}$/i.test(sha)) throw new Error(`Ref Git inválida: ${sha}`)
  const cache = new Map<string, Buffer | null>()
  return {
    ler(caminho) {
      caminhoInterno(raiz, caminho)
      if (!cache.has(caminho)) {
        const r = git(raiz, ['show', `${sha}:${caminho}`])
        cache.set(caminho, r.ok ? r.bytes : null)
      }
      return cache.get(caminho) ?? null
    },
    listar(prefixo) {
      caminhoInterno(raiz, prefixo)
      const r = git(raiz, ['ls-tree', '-r', '--name-only', '-z', sha, '--', prefixo])
      if (!r.ok) throw new Error(`Não foi possível listar ${prefixo} em ${sha.slice(0, 12)}.`)
      return r.bytes.toString('utf8').split('\0').filter(Boolean)
    },
  }
}

function tarefaNaFonte(fonte: FonteDeCobertura, id: string): Tarefa | null {
  const aberta = fonte.ler(`docs-mentor/tarefas/abertas/${id}.json`)
  if (aberta) return JSON.parse(aberta.toString('utf8')) as Tarefa
  const concluida = fonte.listar('docs-mentor/tarefas/concluidas/').find((p) => p.endsWith(`--${id}.json`))
  const bytes = concluida ? fonte.ler(concluida) : null
  return bytes ? JSON.parse(bytes.toString('utf8')) as Tarefa : null
}

function herancaValida(fonte: FonteDeCobertura, revisao: RevisaoIncremental, caminho: string, visitados = new Set<string>()): boolean {
  const arquivo = revisao.arquivos.find((a) => a.caminho === caminho)
  if (!arquivo) return false
  if (!arquivo.cobertura_herdada_de) return revisao.partes.some((p) => p.lida && p.arquivos.includes(caminho))
  const id = arquivo.cobertura_herdada_de
  if (visitados.has(id) || revisao.revisao_anterior !== id) return false
  visitados.add(id)
  const bytes = fonte.ler(`docs-mentor/auditorias/${id}.json`)
  if (!bytes) return false
  let anterior: RevisaoIncremental
  try { anterior = JSON.parse(bytes.toString('utf8')) as RevisaoIncremental } catch { return false }
  const previa = anterior.arquivos.find((a) => a.caminho === caminho)
  if (anterior.estado !== 'aprovada' || anterior.veredito !== 'APROVADO' || !anterior.registrada_em ||
      anterior.partes.some((p) => !p.lida) || !previa || previa.sha256 !== arquivo.sha256 || previa.modo !== arquivo.modo ||
      JSON.stringify(anterior.assinaturas_tarefas) !== JSON.stringify(revisao.assinaturas_tarefas) ||
      JSON.stringify(anterior.contratos) !== JSON.stringify(revisao.contratos) ||
      JSON.stringify(anterior.regras) !== JSON.stringify(revisao.regras)) return false
  return herancaValida(fonte, anterior, caminho, visitados)
}

export function arquivoExigeRevisao(caminho: string): boolean {
  const p = caminho.replace(/\\/g, '/')
  // These requirement indexes are generated views, already omitted by auditar preparar.
  if (p === 'docs-mentor/requisitos/implementados.md' || p === 'docs-mentor/requisitos/pendentes.md') return false
  if (p.startsWith('docs-mentor/tarefas/') || p.startsWith('docs-mentor/auditorias/') || p.startsWith('docs-mentor/.evidencias/')) return false
  if (p === 'docs-mentor/contexto.json') return true
  if (p.startsWith('docs-mentor/')) return /\.test\.[cm]?[jt]sx?$/.test(p) || /^(docs-mentor\/(requisitos|adrs|padroes-de-stack|arquitetura\/ADR)\/)/.test(p)
  if (p.startsWith('docs/') || p.startsWith('.obsidian/')) return false
  if (p.startsWith('.mentor/')) return true
  if (p.endsWith('.md') || p.endsWith('.txt') || p === 'LICENSE') return false
  return true
}

/** Evita que o Mentor exija sua própria bateria de produto para corrigir apenas o pacote local. */
export function escopoExclusivoDoMentor(caminhos: string[]): boolean {
  const arquivos = [...new Set(caminhos.map((p) => p.replace(/\\/g, '/')).filter(Boolean))]
  return arquivos.some((p) => p.startsWith('.mentor/')) &&
    arquivos.every((p) => p.startsWith('.mentor/') ||
      (p.startsWith('docs-mentor/') && (!arquivoExigeRevisao(p) || p === 'docs-mentor/contexto.json' || p === 'docs-mentor/melhorias-do-pacote.test.ts')))
}

/** Filtra modificações puramente geradas em contexto.json e arquivos sem efeito normativo. */
export function caminhosAuditaveisEntre(raiz: string, base: string, caminhos: string[], fonteAlvo: FonteDeCobertura): string[] {
  const fonteBase = fonteDoRef(raiz, base)
  return [...new Set(caminhos)].filter((p) => {
    if (!arquivoExigeRevisao(p)) return false
    const antes = fonteBase.ler(p)
    const depois = fonteAlvo.ler(p)
    const hashAntes = antes ? hashAuditavel(p, antes) : null
    const hashDepois = depois ? hashAuditavel(p, depois) : null
    return hashAntes !== hashDepois
  })
}

/** Dispensa mecânica estreita: só indentação/linhas vazias em código sem template literal. */
export function lightApenasFormatacao(raiz: string, base: string, caminho: string, fonteAlvo: FonteDeCobertura): boolean {
  if (caminho.startsWith('.mentor/') || !/\.(?:[cm]?[jt]sx?)$/.test(caminho)) return false
  const antes = fonteDoRef(raiz, base).ler(caminho)
  const depois = fonteAlvo.ler(caminho)
  if (!antes || !depois || antes.includes(0) || depois.includes(0)) return false
  const a = antes.toString('utf8')
  const b = depois.toString('utf8')
  if (a.includes('`') || b.includes('`') || /\\\r?\n/.test(a) || /\\\r?\n/.test(b)) return false
  const normalizar = (texto: string) => texto.split(/\r?\n/).map((linha) => linha.trim()).filter(Boolean).join('\n')
  return a !== b && normalizar(a) === normalizar(b)
}

/** Mesmo recorte de insumos de fingerprint.ts, agora calculado sobre uma árvore Git imutável. */
export function fingerprintDoRef(raiz: string, sha: string): string | null {
  const pasta = mkdtempSync(join(tmpdir(), 'mentor-fp-ref-'))
  const env = { ...process.env, GIT_INDEX_FILE: join(pasta, 'index') }
  try {
    if (!git(raiz, ['read-tree', sha], env).ok) return null
    for (const p of [
      'docs-mentor/.evidencias', 'docs-mentor/auditorias', 'docs-mentor/tarefas/abertas', 'docs-mentor/tarefas/concluidas',
      'docs-mentor/tarefas/recusas.jsonl', 'docs-mentor/tarefas/recusas.json',
      'docs-mentor/tarefas/backlog.md', 'docs-mentor/tarefas/reserva.md',
      'docs-mentor/contexto.md', 'docs-mentor/tarefas/concluidas/0-indice.md',
    ]) git(raiz, ['rm', '-r', '-q', '--cached', '--ignore-unmatch', '--', p], env)
    const bruto = fonteDoRef(raiz, sha).ler('docs-mentor/contexto.json')
    if (bruto) {
      const ctx = JSON.parse(bruto.toString('utf8')) as Record<string, unknown>
      const projetado = { ...ctx, _meta: ctx._meta ? { ...(ctx._meta as Record<string, unknown>), atualizado_em: null } : null, contagens: null, lembretes: null }
      const bytes = Buffer.from(JSON.stringify(projetado, null, 2) + '\n')
      const blob = git(raiz, ['hash-object', '-w', '--stdin'], env, bytes)
      if (!blob.ok) return null
      if (!git(raiz, ['update-index', '--cacheinfo', '100644', blob.bytes.toString('utf8').trim(), 'docs-mentor/contexto.json'], env).ok) return null
    }
    const tree = git(raiz, ['write-tree'], env)
    return tree.ok ? tree.bytes.toString('utf8').trim() : null
  } catch { return null } finally { rmSync(pasta, { recursive: true, force: true }) }
}

function revisaoAtiva(fonte: FonteDeCobertura): boolean {
  const bytes = fonte.ler('docs-mentor/contexto.json')
  if (!bytes) return false
  try { return JSON.parse(bytes.toString('utf8')).auditoria?.revisao_incremental_ativa === true } catch { return false }
}

export function verificarEnvioIncremental(raiz: string, shaLocal: string, shaRemoto: string | null): string[] {
  const alvo = fonteDoRef(raiz, shaLocal)
  // A política do commit enviado governa o envio; o ref remoto é apenas a base do diff.
  if (!revisaoAtiva(alvo)) return []
  const basePrincipal = !shaRemoto ? git(raiz, ['merge-base', shaLocal, 'refs/remotes/origin/main']) : null
  const baseNova = basePrincipal?.ok ? basePrincipal.bytes.toString('utf8').trim() : null
  const intervalo = shaRemoto ? [`${shaRemoto}..${shaLocal}`] : baseNova ? [`${baseNova}..${shaLocal}`] : [shaLocal, '--not', '--remotes']
  const revs = git(raiz, ['rev-list', '--reverse', ...intervalo])
  if (!revs.ok) return [`Não foi possível enumerar commits enviados para ${shaLocal.slice(0, 12)}.`]
  const commits = revs.bytes.toString('utf8').split('\n').filter(Boolean)
  const ordemDosCommits = new Map(commits.map((sha, i) => [sha, i]))
  const grupos = new Map<string, { ultimo: string; caminhos: Set<string> }>()
  const problemas: string[] = []
  for (const sha of commits) {
    const titulo = git(raiz, ['show', '-s', '--format=%s', sha])
    const pais = git(raiz, ['show', '-s', '--format=%P', sha])
    if (!titulo.ok || !pais.ok) { problemas.push(`Não foi possível ler commit ${sha.slice(0, 12)}.`); continue }
    const pai = pais.bytes.toString('utf8').trim().split(/\s+/)[0]
    const nomes = git(raiz, pai ? ['diff', '--name-only', '-z', pai, sha] : ['diff-tree', '--root', '--no-commit-id', '--name-only', '-r', '-z', sha])
    if (!nomes.ok) { problemas.push(`Não foi possível ler arquivos de ${sha.slice(0, 12)}.`); continue }
    const brutos = nomes.bytes.toString('utf8').split('\0').filter(Boolean)
    const fonteCommit = fonteDoRef(raiz, sha)
    const auditaveis = pai ? caminhosAuditaveisEntre(raiz, pai, brutos, fonteCommit) : brutos.filter(arquivoExigeRevisao)
    const ids = [...new Set(titulo.bytes.toString('utf8').match(/\bTASK-[A-Z]+-\d{3}\b/g) ?? [])]
    if (!ids.length && auditaveis.length) {
      const exigem = auditaveis.filter((p) => !pai || !lightApenasFormatacao(raiz, pai, p, fonteCommit))
      if (!exigem.length) continue
      problemas.push(`Commit ${sha.slice(0, 12)} altera ${exigem.slice(0, 3).join(', ')} sem tarefa revisada; Light só dispensa documentação não normativa ou formatação comprovada.`)
      continue
    }
    for (const id of ids) {
      const grupo = grupos.get(id) ?? { ultimo: sha, caminhos: new Set<string>() }
      grupo.ultimo = sha
      for (const p of auditaveis) grupo.caminhos.add(p)
      grupos.set(id, grupo)
    }
  }
  const ultimasVersoesRevisadas = new Map<string, { id: string; sha: string; ordem: number }>()
  for (const [id, grupo] of grupos) {
    const fonte = fonteDoRef(raiz, grupo.ultimo)
    const tarefa = tarefaNaFonte(fonte, id)
    if (!tarefa) { problemas.push(`${id} não possui registro de tarefa no ref enviado.`); continue }
    if (!tarefa.revisao_incremental_requerida) continue
    if (!tarefa.commit_base) { problemas.push(`${id} não possui commit_base.`); continue }
    const mudados = caminhosAuditaveisEntre(raiz, tarefa.commit_base, [...grupo.caminhos], fonte)
      .filter((p) => tarefa.cerimonia !== 'Light' || !lightApenasFormatacao(raiz, tarefa.commit_base!, p, fonte))
    const contexto = fonte.ler('docs-mentor/contexto.json')
    if (!contexto) { problemas.push(`${id}: contexto.json ausente no ref enviado.`); continue }
    let politica
    try { politica = politicaDaTarefa(JSON.parse(contexto.toString('utf8')) as Contexto, tarefa, mudados) }
    catch { problemas.push(`${id}: contexto.json inválido no ref enviado.`); continue }
    if (politica.revisao !== 'bloqueia') continue
    const cobertura = verificarCobertura(tarefa, fonte, mudados)
    if (!cobertura.ok) problemas.push(...cobertura.problemas)
    if (!mudados.length) continue
    const ordem = ordemDosCommits.get(grupo.ultimo) ?? -1
    for (const caminho of mudados) {
      const previa = ultimasVersoesRevisadas.get(caminho)
      if (!previa || ordem > previa.ordem) ultimasVersoesRevisadas.set(caminho, { id, sha: grupo.ultimo, ordem })
    }
    const fp = fingerprintDoRef(raiz, grupo.ultimo)
    if (!fp) { problemas.push(`${id}: não foi possível identificar os insumos dos gates no ref enviado.`); continue }
    const declarados = (JSON.parse(contexto.toString('utf8')) as Contexto).gates
    for (const nome of politica.gates_obrigatorios) {
      const gate = declarados[nome]
      if (!gate?.comando) continue
      const evidencia = tarefa.gates?.[nome]
      if (!evidencia || !['APROVADO', 'APROVADO com ressalva'].includes(evidencia.rotulo) || evidencia.arvore_hash !== fp || evidencia.comando !== gate.comando) {
        problemas.push(`${id}: gate ${nome} não comprova a árvore enviada em ${grupo.ultimo.slice(0, 12)}.`)
      }
    }
  }
  for (const [caminho, ultima] of ultimasVersoesRevisadas) {
    const bytesRevisados = fonteDoRef(raiz, ultima.sha).ler(caminho)
    const bytesFinais = alvo.ler(caminho)
    const hashRevisado = bytesRevisados ? hashAuditavel(caminho, bytesRevisados) : null
    const hashFinal = bytesFinais ? hashAuditavel(caminho, bytesFinais) : null
    if (hashRevisado !== hashFinal) problemas.push(`${ultima.id}: conteúdo final de ${caminho} diverge da última revisão no ref enviado.`)
  }
  return problemas
}

export interface ResultadoCobertura { ok: boolean; revisao: string | null; problemas: string[] }

/** Mesma decisão para o fechamento local e para a árvore imutável que será enviada. */
export function verificarCobertura(tarefa: Tarefa, fonte: FonteDeCobertura, caminhosMudados: string[]): ResultadoCobertura {
  if (!tarefa.revisao_incremental_requerida || caminhosMudados.length === 0) return { ok: true, revisao: null, problemas: [] }
  const registros = fonte.listar('docs-mentor/auditorias/').filter((p) => /\/REV-\d+\.json$/.test(p))
    .map((p) => { try { return JSON.parse(fonte.ler(p)!.toString('utf8')) as RevisaoIncremental } catch { return null } })
    .filter((r): r is RevisaoIncremental => r?.schema === 'auditoria-incremental/1' && r.tarefas.includes(tarefa.id))
    .sort((a, b) => Number(b.id.slice(4)) - Number(a.id.slice(4)))
  if (!registros.length) return { ok: false, revisao: null, problemas: [`${tarefa.id} não possui REV; rode auditar preparar --tarefa ${tarefa.id}.`] }
  let ultimo: ResultadoCobertura = { ok: false, revisao: registros[0]!.id, problemas: [] }
  for (const r of registros) {
    const problemas: string[] = []
    if (r.estado !== 'aprovada' || r.veredito !== 'APROVADO' || !r.registrada_em) problemas.push(`${r.id} não tem parecer APROVADO registrado`)
    if (!r.sessao_revisora?.trim()) problemas.push(`${r.id} não declara a sessão revisora`)
    if (r.partes.some((p) => !p.lida)) problemas.push(`${r.id} possui parte não examinada`)
    if (r.arquivos.some((a) => a.ambiguidade)) problemas.push(`${r.id} possui arquivo ambíguo`)
    if (r.pendencias.some((p) => p.nivel === 'bloqueia' && !p.resolvida_em)) problemas.push(`${r.id} possui achado bloqueante sem resolução`)
    if (!r.assinaturas_tarefas || !r.contratos) problemas.push(`${r.id} não possui identidade de critérios e contratos`)
    for (const [id, assinatura] of Object.entries(r.assinaturas_tarefas ?? {})) {
      const atual = tarefaNaFonte(fonte, id)
      if (!atual || assinaturaSemanticaDaTarefa(atual) !== assinatura) problemas.push(`${r.id}: critérios/plano de ${id} mudaram`)
    }
    for (const contrato of r.contratos ?? []) {
      const bytes = fonte.ler(contrato.caminho)
      if (!bytes || hashSha256(bytes) !== contrato.sha256) problemas.push(`${r.id}: regra/contrato ${contrato.caminho} mudou`)
    }
    for (const contexto of r.contextos) {
      const bytes = fonte.ler(contexto.arquivo)
      if (!bytes || hashSha256(bytes) !== contexto.sha256) problemas.push(`${r.id}: contexto adicional ${contexto.arquivo} mudou`)
    }
    const cobertos = new Set(r.arquivos.filter((a) => !a.motivo_omissao).flatMap((a) => [a.caminho, ...(a.caminho_anterior ? [a.caminho_anterior] : [])]))
    for (const caminho of caminhosMudados) if (!cobertos.has(caminho)) problemas.push(`${r.id}: arquivo ${caminho} não está no manifesto revisado`)
    for (const arquivo of r.arquivos.filter((a) => !a.motivo_omissao)) {
      if (!herancaValida(fonte, r, arquivo.caminho)) problemas.push(`${r.id}: cobertura de ${arquivo.caminho} não foi comprovada por parte lida ou parecer anterior`)
      const bytes = fonte.ler(arquivo.caminho)
      const hash = bytes ? hashAuditavel(arquivo.caminho, bytes) : null
      if (hash !== arquivo.sha256) problemas.push(`${r.id}: conteúdo de ${arquivo.caminho} mudou`)
    }
    if (!problemas.length) return { ok: true, revisao: r.id, problemas: [] }
    if (r === registros[0]) ultimo = { ok: false, revisao: r.id, problemas }
  }
  return ultimo
}

export function nomesAlteradosLocais(raiz: string, base: string): string[] {
  const diff = git(raiz, ['diff', '--name-only', '-z', base, '--'])
  const novos = git(raiz, ['ls-files', '--others', '--exclude-standard', '-z'])
  if (!diff.ok || !novos.ok) throw new Error('Não foi possível identificar os arquivos alterados para a revisão.')
  return [...new Set([...diff.bytes.toString('utf8').split('\0'), ...novos.bytes.toString('utf8').split('\0')].filter(Boolean))]
}
