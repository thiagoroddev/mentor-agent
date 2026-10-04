import { createHash } from 'node:crypto'
import { copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative } from 'node:path'
import { agora, caminhos, escreverJson, escreverTexto, existe, lerJson, lerTexto, listar, relativo } from './arquivos.ts'
import type { Caminhos } from './arquivos.ts'
import { incorporarPlanoNaNarrativa } from './narrativa.ts'
import { carregarTarefas } from './vistas.ts'
import type {
  AvaliacaoPlano,
  CriterioDeAceite,
  DecisoesAplicaveis,
  HabilidadesPlano,
  Plano,
  ReusoPlano,
  Tarefa,
} from './tipos.ts'

export interface RegistroPlano {
  id: string
  titulo: string
  arquivo: string
  sha256: string
  secao?: string | null
  registrado_em: string
  origem?: string | null
  manifesto?: Record<string, string>
}

export interface ContratoPlano {
  versao?: number | string
  muda?: string[]
  criterios_aceite?: CriterioDeAceite[]
  impacto?: string | null
  riscos?: string[]
  dependencias_novas?: string[]
  proporcionalidade?: string | null
  decisoes_aplicaveis?: DecisoesAplicaveis | null
  reuso?: ReusoPlano | null
  habilidades?: HabilidadesPlano | null
  avaliacao?: AvaliacaoPlano | null
}

export interface PlanoResolvido {
  origem: 'inline' | 'referenciado'
  arquivo?: string
  sha256?: string
  sha256_atual?: string
  revisao_valida: boolean
  secao?: string | null
  conteudo_md?: string
  versao?: number
  muda: string[]
  criterios_aceite: CriterioDeAceite[]
  impacto: string | null
  riscos: string[]
  dependencias_novas: string[]
  proporcionalidade: string | null
  pedido_original?: string | null
  solucao_sugerida?: string | null
  decisoes_aplicaveis?: DecisoesAplicaveis | null
  reuso?: ReusoPlano | null
  habilidades?: HabilidadesPlano | null
  avaliacao?: AvaliacaoPlano | null
  diagnosticos: string[]
  falta_contrato?: boolean
}

export function calcularSha256(conteudo: string | Buffer): string {
  return createHash('sha256').update(conteudo).digest('hex')
}

export function sha256DoArquivo(caminhoAbsoluto: string): string {
  const buf = readFileSync(caminhoAbsoluto)
  return calcularSha256(buf)
}

export function carregarPlanos(): RegistroPlano[] {
  const c = caminhos()
  if (!existe(c.planos)) return []
  try {
    return lerJson<RegistroPlano[]>(c.planos)
  } catch {
    return []
  }
}

export function salvarPlanos(planos: RegistroPlano[]): void {
  const c = caminhos()
  escreverJson(c.planos, planos)
}

function normalizarCaminhoRelativo(caminho: string): string {
  const c = caminhos()
  const abs = isAbsolute(caminho) ? caminho : join(c.raiz, caminho)
  return relative(c.raiz, abs).replace(/\\/g, '/')
}

function verificarSecaoNoTexto(conteudo: string, secao: string): boolean {
  const normalizada = secao.trim().toLowerCase()
  const linhas = conteudo.split('\n')
  for (const l of linhas) {
    const limpa = l.trim()
    if (limpa.startsWith('#')) {
      const textoCabecalho = limpa.replace(/^#+\s*/, '').trim().toLowerCase()
      if (textoCabecalho === normalizada || textoCabecalho.includes(normalizada)) {
        return true
      }
    }
  }
  return false
}

/**
 * Validação de integridade referencial dos novos campos de contrato (versão >= 2):
 * - ADRs citadas em `decisoes_aplicaveis` devem existir na pasta de ADRs configurada.
 * - Habilidades citadas em `habilidades` sem origem explícita devem existir localmente (.mentor/skills ou docs/skills).
 */
export function validarReferenciasDoContrato(plano: Partial<Plano> | null | undefined, c: Caminhos): string[] {
  if (!plano) return []
  const diagnosticos: string[] = []

  // Validação de ADRs citadas em decisoes_aplicaveis
  if (plano.decisoes_aplicaveis) {
    const itens = Array.isArray(plano.decisoes_aplicaveis)
      ? plano.decisoes_aplicaveis
      : plano.decisoes_aplicaveis.itens ?? []

    for (const item of itens) {
      if (!item.adr) continue
      const idOuNome = item.adr.trim()
      if (!idOuNome) continue
      const nomeComMd = idOuNome.endsWith('.md') ? idOuNome : `${idOuNome}.md`
      const caminhoDireto = join(c.adr, nomeComMd)
      let achou = existe(caminhoDireto) || existe(join(c.adr, idOuNome))
      if (!achou && existe(c.adr)) {
        try {
          const arquivos = readdirSync(c.adr)
          const alvo = idOuNome.replace(/\.md$/, '').toLowerCase()
          achou = arquivos.some((a) => a.toLowerCase().startsWith(alvo) || a.toLowerCase().includes(alvo))
        } catch {
          // ignora
        }
      }
      if (!achou) {
        diagnosticos.push(`ADR referenciada em "decisoes_aplicaveis" não encontrada na pasta de ADRs (${relativo(c.adr, c.raiz)}): "${idOuNome}"`)
      }
    }
  }

  // Validação de habilidades citadas em habilidades
  if (plano.habilidades) {
    const lista = [
      ...(plano.habilidades.planejamento ?? []),
      ...(plano.habilidades.execucao ?? []),
    ]
    for (const hab of lista) {
      if (!hab.nome) continue
      const nome = hab.nome.trim()
      if (!nome) continue
      if (!hab.origem || !hab.origem.trim()) {
        const habBuiltin = join(c.raiz, '.mentor', 'skills', nome, 'SKILL.md')
        const habDoc = join(c.docs, 'skills', nome, 'SKILL.md')
        const existeLocal = existe(habBuiltin) || existe(habDoc)
        if (!existeLocal) {
          diagnosticos.push(`Habilidade "${nome}" citada em habilidades sem arquivo local correspondente e sem campo "origem" declarado.`)
        }
      }
    }
  }

  return diagnosticos
}

export function resolverPlano(tarefa: Tarefa, raizDoProjeto = caminhos().raiz): PlanoResolvido {
  const c = caminhos()
  if (!tarefa.plano_ref) {
    const versao = typeof tarefa.plano?.versao === 'number' ? tarefa.plano.versao : undefined
    const diagnosticos: string[] = []
    if (versao && versao >= 2) {
      diagnosticos.push(...validarReferenciasDoContrato(tarefa.plano, c))
    }
    return {
      origem: 'inline',
      revisao_valida: diagnosticos.length === 0,
      versao,
      muda: tarefa.plano?.muda ?? [],
      criterios_aceite: tarefa.plano?.criterios_aceite ?? [],
      impacto: tarefa.plano?.impacto ?? null,
      riscos: tarefa.plano?.riscos ?? [],
      dependencias_novas: tarefa.plano?.dependencias_novas ?? [],
      proporcionalidade: tarefa.plano?.proporcionalidade ?? null,
      pedido_original: tarefa.plano?.pedido_original ?? null,
      solucao_sugerida: tarefa.plano?.solucao_sugerida ?? null,
      decisoes_aplicaveis: tarefa.plano?.decisoes_aplicaveis ?? null,
      reuso: tarefa.plano?.reuso ?? null,
      habilidades: tarefa.plano?.habilidades ?? null,
      avaliacao: tarefa.plano?.avaliacao ?? null,
      diagnosticos,
      falta_contrato: false,
    }
  }

  const rel = tarefa.plano_ref.arquivo
  const abs = join(raizDoProjeto, rel)
  const diagnosticos: string[] = []

  if (!existsSync(abs)) {
    diagnosticos.push(`Arquivo de plano referenciado nao existe: "${rel}"`)
    return {
      origem: 'referenciado',
      arquivo: rel,
      sha256: tarefa.plano_ref.sha256,
      revisao_valida: false,
      secao: tarefa.plano_ref.secao,
      versao: typeof tarefa.plano?.versao === 'number' ? tarefa.plano.versao : undefined,
      muda: tarefa.plano?.muda ?? [],
      criterios_aceite: tarefa.plano?.criterios_aceite ?? [],
      impacto: tarefa.plano?.impacto ?? null,
      riscos: tarefa.plano?.riscos ?? [],
      dependencias_novas: tarefa.plano?.dependencias_novas ?? [],
      proporcionalidade: tarefa.plano?.proporcionalidade ?? null,
      decisoes_aplicaveis: tarefa.plano?.decisoes_aplicaveis ?? null,
      reuso: tarefa.plano?.reuso ?? null,
      habilidades: tarefa.plano?.habilidades ?? null,
      avaliacao: tarefa.plano?.avaliacao ?? null,
      diagnosticos,
      falta_contrato: false,
    }
  }

  const stat = lstatSync(abs)
  let conteudoMd = ''
  let sha256Atual = ''

  if (stat.isDirectory()) {
    // Pacote de plano
    const readme = join(abs, 'README.md')
    if (existsSync(readme)) {
      conteudoMd = lerTexto(readme)
      sha256Atual = sha256DoArquivo(readme)
    } else {
      diagnosticos.push(`Pacote de plano "${rel}" nao possui README.md`)
    }
  } else {
    conteudoMd = lerTexto(abs)
    sha256Atual = sha256DoArquivo(abs)
  }

  const revisaoValida = sha256Atual === tarefa.plano_ref.sha256
  if (!revisaoValida) {
    diagnosticos.push(
      `Revisao do plano divergente: esperado ${tarefa.plano_ref.sha256.slice(0, 8)}, atual ${sha256Atual.slice(0, 8)}`,
    )
  }

  if (tarefa.plano_ref.secao) {
    const secaoOk = verificarSecaoNoTexto(conteudoMd, tarefa.plano_ref.secao)
    if (!secaoOk) {
      diagnosticos.push(`Secao "${tarefa.plano_ref.secao}" nao encontrada no plano "${rel}"`)
    }
  }

  // Busca contrato estruturado acompanhante se houver
  let versao: number | undefined = typeof tarefa.plano?.versao === 'number' ? tarefa.plano.versao : undefined
  let muda = tarefa.plano?.muda ?? []
  let criterios = tarefa.plano?.criterios_aceite ?? []
  let impacto = tarefa.plano?.impacto ?? null
  let riscos = tarefa.plano?.riscos ?? []
  let depsNovas = tarefa.plano?.dependencias_novas ?? []
  let prop = tarefa.plano?.proporcionalidade ?? null
  let decisoes = tarefa.plano?.decisoes_aplicaveis ?? null
  let reuso = tarefa.plano?.reuso ?? null
  let habilidades = tarefa.plano?.habilidades ?? null
  let avaliacao = tarefa.plano?.avaliacao ?? null
  let faltaContrato = false

  const contratoJson1 = stat.isDirectory() ? join(abs, 'contrato.json') : abs.replace(/\.md$/, '.contrato.json')
  const contratoJson2 = stat.isDirectory() ? null : abs.replace(/\.md$/, '.json')
  const caminhoContrato = existsSync(contratoJson1) ? contratoJson1 : (contratoJson2 && existsSync(contratoJson2) ? contratoJson2 : null)

  if (caminhoContrato) {
    try {
      const parsed = lerJson<ContratoPlano>(caminhoContrato)
      if (parsed.versao !== undefined) versao = Number(parsed.versao)
      if (parsed.muda) muda = parsed.muda
      if (parsed.criterios_aceite) criterios = parsed.criterios_aceite
      if (parsed.impacto !== undefined) impacto = parsed.impacto
      if (parsed.riscos) riscos = parsed.riscos
      if (parsed.dependencias_novas) depsNovas = parsed.dependencias_novas
      if (parsed.proporcionalidade !== undefined) prop = parsed.proporcionalidade
      if (parsed.decisoes_aplicaveis !== undefined) decisoes = parsed.decisoes_aplicaveis
      if (parsed.reuso !== undefined) reuso = parsed.reuso
      if (parsed.habilidades !== undefined) habilidades = parsed.habilidades
      if (parsed.avaliacao !== undefined) avaliacao = parsed.avaliacao
    } catch (e: any) {
      diagnosticos.push(`Contrato estruturado "${caminhoContrato}" invalido: ${e.message}`)
    }
  } else if ((!muda || muda.length === 0) && (!criterios || criterios.length === 0)) {
    faltaContrato = true
  }

  if (versao && versao >= 2) {
    diagnosticos.push(...validarReferenciasDoContrato({
      versao,
      muda,
      criterios_aceite: criterios,
      impacto,
      riscos,
      dependencias_novas: depsNovas,
      proporcionalidade: prop,
      decisoes_aplicaveis: decisoes,
      reuso,
      habilidades,
      avaliacao,
    }, c))
  }

  return {
    origem: 'referenciado',
    arquivo: rel,
    sha256: tarefa.plano_ref.sha256,
    sha256_atual: sha256Atual,
    revisao_valida: revisaoValida && diagnosticos.length === 0,
    secao: tarefa.plano_ref.secao,
    conteudo_md: conteudoMd,
    versao,
    muda,
    criterios_aceite: criterios,
    impacto,
    riscos,
    dependencias_novas: depsNovas,
    proporcionalidade: prop,
    decisoes_aplicaveis: decisoes,
    reuso,
    habilidades,
    avaliacao,
    diagnosticos,
    falta_contrato: faltaContrato,
  }
}

export function registrarPlano(flags: Record<string, string | undefined>): void {
  const arquivo = flags.arquivo?.trim()
  if (!arquivo) {
    throw new Error('Falta --arquivo. Use: mentor plano registrar --arquivo <caminho> [--secao <id>] [--titulo <titulo>]')
  }

  const c = caminhos()
  const rel = normalizarCaminhoRelativo(arquivo)
  const abs = join(c.raiz, rel)

  if (!existsSync(abs)) {
    throw new Error(`Arquivo "${arquivo}" nao existe em ${c.raiz}.`)
  }

  const stat = lstatSync(abs)
  let sha256 = ''
  let titulo = (flags.titulo ?? '').trim()
  let manifesto: Record<string, string> | undefined

  if (stat.isDirectory()) {
    const readme = join(abs, 'README.md')
    if (!existsSync(readme)) {
      throw new Error(`Pasta de plano "${rel}" deve conter um README.md.`)
    }
    sha256 = sha256DoArquivo(readme)
    if (!titulo) {
      const primeiroCabecalho = lerTexto(readme).match(/^#\s+(.+)$/m)?.[1]
      titulo = primeiroCabecalho?.trim() || basename(abs)
    }
    manifesto = {}
    for (const f of listar(abs, '')) {
      const fRel = relative(abs, f).replace(/\\/g, '/')
      manifesto[fRel] = sha256DoArquivo(f)
    }
  } else {
    sha256 = sha256DoArquivo(abs)
    if (!titulo) {
      const primeiroCabecalho = lerTexto(abs).match(/^#\s+(.+)$/m)?.[1]
      titulo = primeiroCabecalho?.trim() || basename(abs, '.md')
    }
  }

  const secao = flags.secao?.trim() || null
  if (secao && !stat.isDirectory()) {
    const conteudo = lerTexto(abs)
    if (!verificarSecaoNoTexto(conteudo, secao)) {
      throw new Error(`Secao "${secao}" nao encontrada no documento "${rel}".`)
    }
  }

  const planos = carregarPlanos()
  const id = flags.id?.trim() || `PLAN-${basename(rel).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 30)}`
  const data = agora().log.split(' ')[0] ?? ''

  const existenteIdx = planos.findIndex((p) => p.arquivo === rel && (p.secao ?? null) === secao)
  const registro: RegistroPlano = {
    id: existenteIdx >= 0 ? planos[existenteIdx]!.id : id,
    titulo,
    arquivo: rel,
    sha256,
    secao,
    registrado_em: data,
    manifesto,
  }

  if (existenteIdx >= 0) {
    planos[existenteIdx] = registro
  } else {
    planos.push(registro)
  }

  salvarPlanos(planos)
  console.log(`Plano registrado: [${registro.id}] "${titulo}" -> ${rel} (sha256: ${sha256.slice(0, 8)})`)
}

export function importarPlano(flags: Record<string, string | undefined>): void {
  const arquivo = flags.arquivo?.trim()
  const destino = flags.destino?.trim()
  if (!arquivo || !destino) {
    throw new Error('Use: mentor plano importar --arquivo <origem> --destino <destino> [--forcar]')
  }

  const c = caminhos()
  const origemAbs = isAbsolute(arquivo) ? arquivo : join(c.raiz, arquivo)
  if (!existsSync(origemAbs)) {
    throw new Error(`Origem "${arquivo}" nao existe.`)
  }

  const destinoRel = normalizarCaminhoRelativo(destino)
  const destinoAbs = join(c.raiz, destinoRel)

  if (existsSync(destinoAbs) && !flags.forcar) {
    throw new Error(`Destino "${destinoRel}" ja existe. Use --forcar para sobrescrever.`)
  }

  mkdirSync(dirname(destinoAbs), { recursive: true })

  const stat = lstatSync(origemAbs)
  if (stat.isDirectory()) {
    cpSync(origemAbs, destinoAbs, { recursive: true })
  } else {
    copyFileSync(origemAbs, destinoAbs)
    const contratoOrigem = origemAbs.replace(/\.md$/, '.contrato.json')
    const contratoDestino = destinoAbs.replace(/\.md$/, '.contrato.json')
    if (existsSync(contratoOrigem)) {
      copyFileSync(contratoOrigem, contratoDestino)
    }
  }

  registrarPlano({ ...flags, arquivo: destinoRel, origem: arquivo })
  console.log(`Plano importado literalmente de "${arquivo}" para "${destinoRel}".`)
}

export function listarPlanos(): void {
  const planos = carregarPlanos()
  const tarefas = carregarTarefas()

  if (planos.length === 0) {
    console.log('Nenhum plano registrado em docs-mentor/planos.json.')
    return
  }

  console.log(`PLANOS REGISTRADOS (${planos.length}):\n`)
  for (const p of planos) {
    const vinculadas = tarefas
      .filter((t) => t.plano_ref?.arquivo === p.arquivo)
      .map((t) => t.id)
    const sec = p.secao ? ` § ${p.secao}` : ''
    const tasks = vinculadas.length ? ` [tarefas: ${vinculadas.join(', ')}]` : ' [sem tarefas vinculadas]'
    console.log(`  ${p.id}: "${p.titulo}"${sec}`)
    console.log(`    arquivo: ${p.arquivo} (sha256: ${p.sha256.slice(0, 8)})${tasks}`)
  }
}

export function vincularPlano(id: string, flags: Record<string, string | undefined>, planoOuArquivo?: string): void {
  const c = caminhos()
  const planos = carregarPlanos()

  let arquivo = flags.arquivo?.trim()
  let secao = flags.secao?.trim() || null

  const idPlano = flags.plano?.trim() || (planoOuArquivo && !flags.arquivo ? planoOuArquivo.trim() : null)
  if (idPlano) {
    const encontrado = planos.find((p) => p.id === idPlano || p.id.toLowerCase() === idPlano.toLowerCase())
    if (encontrado) {
      arquivo = encontrado.arquivo
      if (!secao && encontrado.secao) secao = encontrado.secao
    } else if (!arquivo && (idPlano.endsWith('.md') || existe(join(c.raiz, idPlano)))) {
      arquivo = idPlano
    }
  }

  if (!arquivo) {
    throw new Error(`Falta plano ou --arquivo. Use: mentor task vincular-plano ${id} [<PLANO-ID> | --plano <PLANO-ID> | --arquivo <path>] [--secao <id>]`)
  }

  const todas = carregarTarefas()
  const t = todas.find((x) => x.id === id)
  if (!t) throw new Error(`Tarefa ${id} nao encontrada.`)

  const rel = normalizarCaminhoRelativo(arquivo)
  const abs = join(c.raiz, rel)
  if (!existsSync(abs)) {
    throw new Error(`Arquivo "${arquivo}" nao existe em ${c.raiz}.`)
  }

  const stat = lstatSync(abs)
  let sha256 = ''

  if (stat.isDirectory()) {
    const readme = join(abs, 'README.md')
    if (!existsSync(readme)) {
      throw new Error(`Pasta de plano "${rel}" deve conter um README.md.`)
    }
    sha256 = sha256DoArquivo(readme)
  } else {
    sha256 = sha256DoArquivo(abs)
    if (secao) {
      const conteudo = lerTexto(abs)
      if (!verificarSecaoNoTexto(conteudo, secao)) {
        throw new Error(`Secao "${secao}" nao encontrada no documento "${rel}".`)
      }
    }
  }

  t.plano_ref = {
    arquivo: rel,
    sha256,
    secao,
  }

  // Procura se tem contrato acompanhante
  const contratoJson1 = stat.isDirectory() ? join(abs, 'contrato.json') : abs.replace(/\.md$/, '.contrato.json')
  const contratoJson2 = stat.isDirectory() ? null : abs.replace(/\.md$/, '.json')
  const caminhoContrato = existsSync(contratoJson1) ? contratoJson1 : (contratoJson2 && existsSync(contratoJson2) ? contratoJson2 : null)

  if (caminhoContrato) {
    try {
      const parsed = lerJson<ContratoPlano>(caminhoContrato)
      if (parsed.versao !== undefined) t.plano.versao = Number(parsed.versao)
      if (parsed.muda && parsed.muda.length > 0) t.plano.muda = parsed.muda
      if (parsed.criterios_aceite && parsed.criterios_aceite.length > 0) t.plano.criterios_aceite = parsed.criterios_aceite
      if (parsed.impacto !== undefined) t.plano.impacto = parsed.impacto
      if (parsed.riscos && parsed.riscos.length > 0) t.plano.riscos = parsed.riscos
      if (parsed.dependencias_novas) t.plano.dependencias_novas = parsed.dependencias_novas
      if (parsed.proporcionalidade !== undefined) t.plano.proporcionalidade = parsed.proporcionalidade
      if (parsed.decisoes_aplicaveis !== undefined) t.plano.decisoes_aplicaveis = parsed.decisoes_aplicaveis
      if (parsed.reuso !== undefined) t.plano.reuso = parsed.reuso
      if (parsed.habilidades !== undefined) t.plano.habilidades = parsed.habilidades
      if (parsed.avaliacao !== undefined) t.plano.avaliacao = parsed.avaliacao
    } catch {
      // continua
    }
  }

  // Localiza arquivo json da tarefa para gravar
  const arquivoTarefa = join(t.estado === 'concluida' ? c.concluidas : c.abertas, `${t.id}.json`)
  escreverJson(arquivoTarefa, t)

  // Se a tarefa estiver aberta e o plano tiver conteúdo, atualiza a narrativa com cópia integral do plano
  if (t.estado !== 'concluida') {
    const caminhoNarrativa = join(c.abertas, `${t.id}.md`)
    const planoRes = resolverPlano(t)
    const textoAtual = existe(caminhoNarrativa) ? lerTexto(caminhoNarrativa) : null
    const resInc = incorporarPlanoNaNarrativa(textoAtual, t, planoRes)
    if (resInc.modificado) {
      escreverTexto(caminhoNarrativa, resInc.conteudo)
    }
  }

  console.log(`Tarefa ${id} vinculada ao plano "${rel}" (sha256: ${sha256.slice(0, 8)}).`)
}
