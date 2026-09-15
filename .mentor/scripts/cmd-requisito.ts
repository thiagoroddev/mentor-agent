import { spawnSync } from 'node:child_process'
import { agora, caminhos, escreverJson, existe, lerJson } from './arquivos.ts'
import { proximoIdDeRequisito } from './ids.ts'
import { carregarRequisitos, carregarTarefas, regenerarTudo } from './vistas.ts'
import type { Requisito } from './tipos.ts'

const TIPOS_VALIDOS = ['RF', 'RN', 'RNF'] as const
type TipoRequisito = (typeof TIPOS_VALIDOS)[number]

const PRIORIDADES_VALIDAS = ['essencial', 'importante', 'desejavel'] as const
type PrioridadeRequisito = (typeof PRIORIDADES_VALIDAS)[number]

/**
 * Cria um novo requisito funcional (RF), regra de negocio (RN) ou requisito nao-funcional (RNF).
 * Gera ID deterministico, calcula datas e regenera vistas de pendentes/implementados.
 */
export function novoRequisito(flags: Record<string, string | undefined>): void {
  const c = caminhos()

  try {
    const rRamo = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: c.raiz, encoding: 'utf8' })
    const ramoAtual = rRamo.status === 0 && rRamo.stdout ? rRamo.stdout.trim() : ''
    if (ramoAtual && ramoAtual !== 'main' && ramoAtual !== 'master' && !ramoAtual.startsWith('plan/')) {
      const emExecucao = carregarTarefas().some((x) => x.estado === 'em-execucao')
      if (emExecucao) {
        console.warn(
          '! Aviso de planejamento: ha tarefa em execucao neste ramo. Requisitos independentes devem preferencialmente ser criados em ramo plan/<data>-<tema> (via worktree ou a partir da main) para serem integrados sem esperar o termino da tarefa atual (processos/entrega.md).',
        )
      }
    }
  } catch {
    // continua
  }
  const tipoRaw = (flags['tipo'] ?? 'RF').toUpperCase()
  if (!TIPOS_VALIDOS.includes(tipoRaw as TipoRequisito)) {
    throw new Error(`Tipo invalido: "${tipoRaw}". Use: RF (Funcional), RN (Regra de Negocio) ou RNF (Nao-Funcional).`)
  }
  const tipo = tipoRaw as TipoRequisito

  const enunciado = flags['titulo'] ?? flags['enunciado']
  if (!enunciado || !enunciado.trim()) {
    throw new Error('Falta o titulo/enunciado do requisito. Use: --titulo "..." ou --enunciado "..."')
  }

  const prioridadeRaw = (flags['prioridade'] ?? 'importante').toLowerCase()
  if (!PRIORIDADES_VALIDAS.includes(prioridadeRaw as PrioridadeRequisito)) {
    throw new Error(`Prioridade invalida: "${prioridadeRaw}". Use: essencial, importante ou desejavel.`)
  }
  const prioridade = prioridadeRaw as PrioridadeRequisito

  const criterios = flags['criterios']
    ? flags['criterios'].split('|').map((c) => c.trim()).filter(Boolean)
    : []

  const historia = flags['historia']?.trim() || null
  const adr = flags['adr']?.trim() || null

  const reqs = existe(c.requisitos) ? lerJson<Requisito[]>(c.requisitos) : []

  const id = flags['id']?.trim() || proximoIdDeRequisito(tipo)
  if (reqs.some((r) => r.id === id)) {
    throw new Error(`Ja existe um requisito com o ID ${id}.`)
  }

  const novo: Requisito = {
    id,
    tipo,
    enunciado: enunciado.trim(),
    historia,
    prioridade,
    status: 'pendente',
    criterios_aceite: criterios,
    tarefas: [],
    adr,
    criado_em: agora().log,
    implementado_em: null,
    pendente_de_validacao: false,
  }

  reqs.push(novo)
  escreverJson(c.requisitos, reqs)
  regenerarTudo()

  console.log(`Requisito ${novo.id} criado: "${novo.enunciado}" (${novo.tipo}, prioridade ${novo.prioridade}).`)
  console.log(`Vistas atualizadas em docs-mentor/requisitos/pendentes.md.`)
}

/**
 * Lista todos os requisitos organizados por tipo e status.
 */
export function relatarRequisitos(flags: Record<string, string | undefined> = {}): void {
  const reqs = carregarRequisitos()
  if (reqs.length === 0) {
    console.log('Nenhum requisito cadastrado em docs-mentor/requisitos/requisitos.json.')
    console.log('Crie o primeiro com: node mentor.mjs req nova --tipo RF --titulo "..."')
    return
  }

  const tipoFiltro = flags['tipo']?.toUpperCase()
  const filtrados = tipoFiltro ? reqs.filter((r) => r.tipo === tipoFiltro) : reqs

  console.log(`REQUISITOS DO PROJETO (${filtrados.length} no total)\n`)
  for (const tipo of TIPOS_VALIDOS) {
    const doTipo = filtrados.filter((r) => r.tipo === tipo)
    if (doTipo.length === 0) continue

    const nomeTipo = tipo === 'RF' ? 'Requisitos Funcionais (RF)' : tipo === 'RN' ? 'Regras de Negocio (RN)' : 'Requisitos Nao-Funcionais (RNF)'
    console.log(`=== ${nomeTipo} ===`)
    for (const r of doTipo) {
      const statusIcon = r.status === 'implementado' ? '✓' : r.status === 'cancelado' ? '✗' : '·'
      const tarefasInfo = r.tarefas.length ? ` [tarefas: ${r.tarefas.join(', ')}]` : ''
      console.log(`${statusIcon} ${r.id.padEnd(8)} ${r.enunciado} (${r.prioridade})${tarefasInfo}`)
    }
    console.log('')
  }
}
