import { rmSync } from 'node:fs'
import {
  agora, caminhos, escreverJson, escreverTexto, existe, lerJson, lerTexto, listar, relativo,
} from './arquivos.ts'
import { proximoIdDeTarefa } from './ids.ts'
import {
  carregarContexto, carregarDividas, carregarRequisitos, carregarRiscos, carregarTarefas,
  regenerarTudo, registrarRecusa,
} from './vistas.ts'
import type { Tarefa } from './tipos.ts'

type Flags = Record<string, string | undefined>

function localizarViva(id: string): { caminho: string; tarefa: Tarefa } {
  const c = caminhos()
  for (const arquivo of listar(c.abertas, '.json')) {
    const tarefa = lerJson<Tarefa>(arquivo)
    if (tarefa.id === id) return { caminho: arquivo, tarefa }
  }
  throw new Error(`${id} nao esta entre as tarefas abertas.`)
}

/**
 * A origem nao aceita vazio, e nao aceita ponteiro que nao resolve.
 * Medido no antecessor: quando o ponteiro nao resolve, o texto que deveria estar num documento
 * vaza para dentro do backlog. Foram 57 linhas em tres tarefas nao iniciadas.
 */
export function origemNaoResolve(origem: string): string | null {
  const texto = origem.trim()
  if (!texto) return 'origem vazia'
  if (texto === 'titulo-autossuficiente') return null

  const c = caminhos()
  const idsRequisito = new Set(carregarRequisitos().map((r) => r.id))
  const idsDivida = new Set(carregarDividas().map((d) => d.id))
  const idsRisco = new Set(carregarRiscos().map((r) => r.id))
  const nomesAdr = listar(c.adr, '.md').map((a) => relativo(a))
  const nomesRev = listar(`${c.docs}/arquitetura/revisoes-gerais`, '.md').map((a) => relativo(a))

  const quebrados: string[] = []
  for (const bruto of texto.split(',')) {
    const id = bruto.trim()
    if (!id) continue
    const familia = /^([A-Z]+)-/.exec(id)?.[1]
    switch (familia) {
      case 'RF': case 'RN': case 'RNF':
        if (!idsRequisito.has(id)) quebrados.push(id)
        break
      case 'DT': if (!idsDivida.has(id)) quebrados.push(id); break
      case 'RA': if (!idsRisco.has(id)) quebrados.push(id); break
      case 'ADR': if (!nomesAdr.some((n) => n.includes(id))) quebrados.push(id); break
      case 'REV': if (!nomesRev.some((n) => n.includes(id))) quebrados.push(id); break
      default: quebrados.push(`${id} (familia desconhecida)`)
    }
  }
  if (quebrados.length === 0) return null
  return `origem aponta para ${quebrados.join(', ')}, que nao existe. Criar o registro duravel e parte de criar a tarefa`
}

// ---------------------------------------------------------------- puxar e guardar

/** Regra de passagem (guia ES-54): o que precisa ser verdade para a tarefa entrar no ciclo. */
export function puxar(id: string): void {
  const c = caminhos()
  const { caminho, tarefa } = localizarViva(id)
  const ctx = carregarContexto()
  const todas = carregarTarefas()
  const impedimentos: string[] = []

  if (tarefa.fila === 'ciclo') impedimentos.push('ja esta no ciclo')
  const problemaDeOrigem = origemNaoResolve(tarefa.origem)
  if (problemaDeOrigem) impedimentos.push(problemaDeOrigem)
  if (tarefa.esforco.ia === 'XG') impedimentos.push('esforco XG para IA: divida antes com `task fatiar`')

  const concluidas = new Set(todas.filter((t) => t.estado === 'concluida').map((t) => t.id))
  const noCiclo = new Set(todas.filter((t) => t.fila === 'ciclo').map((t) => t.id))
  for (const d of tarefa.depende_de) {
    if (!concluidas.has(d) && !noCiclo.has(d)) impedimentos.push(`depende de ${d}, que nao esta concluida nem no ciclo`)
  }

  const ocupadas = todas.filter(
    (t) => t.fila === 'ciclo' && (t.estado === 'aberta' || t.estado === 'em-execucao'),
  ).length
  if (ocupadas >= ctx.limites.ciclo_tarefas) {
    impedimentos.push(`ciclo cheio: ${ocupadas} de ${ctx.limites.ciclo_tarefas}. Guarde outra antes`)
  }

  if (impedimentos.length) {
    registrarRecusa('task puxar', id, impedimentos)
    console.error(`Nao da para puxar ${id}:`)
    for (const i of impedimentos) console.error(`  - ${i}`)
    process.exitCode = 1
    return
  }
  tarefa.fila = 'ciclo'
  escreverJson(caminho, tarefa)
  regenerarTudo()
  console.log(`${id} no ciclo (${ocupadas + 1} de ${ctx.limites.ciclo_tarefas}).`)
}

export function guardar(id: string): void {
  const { caminho, tarefa } = localizarViva(id)
  if (tarefa.estado === 'em-execucao') throw new Error(`${id} esta em execucao. Termine ou cancele antes de guardar.`)
  tarefa.fila = 'reserva'
  tarefa.ordem = null
  escreverJson(caminho, tarefa)
  regenerarTudo()
  console.log(`${id} guardada na reserva.`)
}

export function listarReserva(): void {
  const todas = carregarTarefas()
  // Epico so' sai daqui quando ja' aparece como cabecalho do backlog: antes disso, some das duas.
  const temFatiaNoCiclo = (id: string) =>
    todas.some((f) => f.fatia_de === id && f.fila === 'ciclo' && (f.estado === 'aberta' || f.estado === 'em-execucao'))
  const guardadas = todas.filter(
    (t) => t.estado === 'aberta' && t.fila === 'reserva' && !temFatiaNoCiclo(t.id),
  )
  if (guardadas.length === 0) { console.log('Reserva vazia.'); return }
  console.log(`Reserva: ${guardadas.length} tarefa(s). Nao entram no contexto.\n`)
  for (const t of guardadas) {
    const esforco = `${t.esforco.humano}/${t.esforco.ia}`.padEnd(6)
    console.log(`  ${t.id.padEnd(18)} ${esforco} ${t.titulo}`)
  }
}

// ---------------------------------------------------------------- encerrar sem fazer

function encerrar(id: string, motivo: string, absorvidaPor: string | null): void {
  const c = caminhos()
  const { caminho, tarefa } = localizarViva(id)
  tarefa.estado = 'cancelada'
  tarefa.cancelamento_motivo = motivo
  tarefa.absorvida_por = absorvidaPor
  tarefa.concluida_em = agora().log
  const base = `${agora().nome}--${tarefa.id}--CANCELADA`
  const narrativa = caminho.replace(/\.json$/, '.md')
  if (existe(narrativa)) {
    escreverTexto(`${c.concluidas}/${base}.md`, lerTexto(narrativa))
    tarefa.narrativa = `${base}.md`
    rmSync(narrativa)
  }
  escreverJson(`${c.concluidas}/${base}.json`, tarefa)
  rmSync(caminho)
  regenerarTudo()
}

/** Cancelar sem motivo escrito nao e' decisao, e' abandono. O numero nunca volta a ser usado. */
export function cancelar(id: string, motivo: string | undefined): void {
  if (!motivo) throw new Error('Falta --motivo. Cancelar sem motivo escrito nao deixa rastro de decisao.')
  encerrar(id, motivo, null)
  console.log(`${id} cancelada. O numero nao sera reaproveitado.`)
}

/** Escopo absorvido por outra tarefa. Substitui a secao "Numeros aposentados" mantida a mao. */
export function absorver(id: string, por: string | undefined): void {
  if (!por) throw new Error('Falta --por <ID da tarefa que absorveu>.')
  const existeDestino = carregarTarefas().some((t) => t.id === por)
  if (!existeDestino) throw new Error(`${por} nao existe.`)
  encerrar(id, `escopo absorvido por ${por}`, por)
  console.log(`${id} absorvida por ${por}. O numero nao sera reaproveitado.`)
}

// ---------------------------------------------------------------- fatiar

/**
 * XG nao se executa, se divide. As fatias herdam valor, urgencia e cerimonia do pai,
 * e nascem encadeadas: cada uma depende da anterior, que e' a ordem em que foram escritas.
 */
export function fatiar(id: string, flags: Flags): void {
  const c = caminhos()
  const { tarefa: pai } = localizarViva(id)
  const titulos = (flags.titulos ?? '').split('|').map((t) => t.trim()).filter(Boolean)
  if (titulos.length < 2) {
    throw new Error('Use --titulos "primeira|segunda|terceira". Fatia sem titulo proprio nao e fatia.')
  }
  const esforco = (flags.esforco ?? 'M/M').split('/')
  const criadas: string[] = []
  let anterior: string | null = null

  for (const titulo of titulos) {
    const fatia: Tarefa = {
      ...pai,
      id: proximoIdDeTarefa(pai.tipo),
      titulo,
      fatia_de: pai.id,
      estado: 'aberta',
      fila: pai.fila,
      ordem: null,
      esforco: { humano: (esforco[0] ?? 'M') as Tarefa['esforco']['humano'], ia: (esforco[1] ?? 'M') as Tarefa['esforco']['ia'] },
      depende_de: anterior ? [anterior] : [],
      criada_em: agora().log,
      iniciada_em: null,
      concluida_em: null,
      plano: { muda: [], criterios_aceite: [], impacto: null, riscos: [], dependencias_novas: [], proporcionalidade: null },
      gates: {},
      achados: [],
      validacao: 'nao_requer',
      validado_em: null,
      validacao_motivo: null,
      tarefas_geradas: [],
      adrs: [],
      divida_tecnica: [],
      riscos_aceitos: [],
      absorvida_por: null,
      cancelamento_motivo: null,
      narrativa: null,
    }
    escreverJson(`${c.abertas}/${fatia.id}.json`, fatia)
    criadas.push(fatia.id)
    anterior = fatia.id
  }
  regenerarTudo()
  console.log(`${id} fatiada em ${criadas.length}: ${criadas.join(' -> ')}`)
  console.log(`${id} vira epico: sai da fila e nao se executa. Executam-se as fatias.`)
}
