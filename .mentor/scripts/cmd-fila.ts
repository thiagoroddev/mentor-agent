import { rmSync } from 'node:fs'
import { join } from 'node:path'
import {
  agora, caminhos, escreverJson, escreverTexto, existe, lerJson, lerTexto, listar, relativo,
} from './arquivos.ts'
import { proximoIdDeTarefa } from './ids.ts'
import {
  carregarContexto, carregarDividas, carregarInvariantes, carregarReferencias, carregarRequisitos, carregarRiscos, carregarTarefas,
  regenerarTudo, registrarRecusa,
} from './vistas.ts'
import { MARCADOR, type Tarefa } from './tipos.ts'

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
  const idsInvariante = new Set(carregarInvariantes().map((i) => i.id))
  const nomesAdr = listar(c.adr, '.md').map((a) => relativo(a))
  const nomesRev = listar(`${c.docs}/arquitetura/revisoes-gerais`, '.md').map((a) => relativo(a))
  const refs = carregarReferencias()
  const mapaRefs = new Map(refs.map((r) => [r.id, r]))

  const quebrados: string[] = []
  for (const bruto of texto.split(',')) {
    const id = bruto.trim()
    if (!id) continue
    if (mapaRefs.has(id)) {
      const ref = mapaRefs.get(id)!
      if (!existe(join(c.raiz, ref.onde))) {
        quebrados.push(`${id} (referencia externa aponta para ${ref.onde}, que nao existe)`)
      }
      continue
    }
    const familia = /^([A-Z]+)-/.exec(id)?.[1]
    switch (familia) {
      case 'RF': case 'RN': case 'RNF':
        if (!idsRequisito.has(id)) quebrados.push(id)
        break
      case 'DT': if (!idsDivida.has(id)) quebrados.push(id); break
      case 'RA': if (!idsRisco.has(id)) quebrados.push(id); break
      case 'INV': if (!idsInvariante.has(id)) quebrados.push(id); break
      case 'ADR': if (!nomesAdr.some((n) => n.includes(id))) quebrados.push(id); break
      case 'REV': if (!nomesRev.some((n) => n.includes(id))) quebrados.push(id); break
      default: quebrados.push(`${id} (familia desconhecida)`)
    }
  }
  if (quebrados.length === 0) return null
  return `origem aponta para ${quebrados.join(', ')}, que nao existe. Criar o registro duravel e parte de criar a tarefa`
}

// ---------------------------------------------------------------- puxar e guardar

export function puxar(id: string, flags: Flags = {}): void {
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

  // M5: Bloqueio por premissa refutada em dependencia
  for (const d of tarefa.depende_de) {
    const depConcluida = todas.find((t) => t.id === d && t.estado === 'concluida')
    if (depConcluida) {
      const achadoRefutador = depConcluida.achados?.find(
        (a) =>
          (a.classe === 3 || a.classe === 4) &&
          /\b(refuta|refutou|contradiz|premissa refutada|hipotese refutada)\b/i.test(`${a.descricao} ${a.ref}`),
      )
      if (achadoRefutador && !flags['premissa-reconfirmada']) {
        impedimentos.push(
          `dependencia ${d} possui achado refutando a premissa ("${achadoRefutador.descricao}"). Replaneje a tarefa ou passe: mentor task puxar ${id} --premissa-reconfirmada --motivo "<justificativa>"`,
        )
      }
    }
  }

  const ocupadas = todas.filter(
    (t) => t.fila === 'ciclo' && (t.estado === 'aberta' || t.estado === 'em-execucao' || t.estado === 'pausada'),
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
  if (tarefa.estado === 'em-execucao' || tarefa.estado === 'pausada') {
    throw new Error(`${id} esta em "${tarefa.estado}". Termine ou cancele antes de guardar.`)
  }
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
    todas.some((f) => f.fatia_de === id && f.fila === 'ciclo' && (f.estado === 'aberta' || f.estado === 'em-execucao' || f.estado === 'pausada'))
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
  const sufixo = absorvidaPor ? 'ABSORVIDA' : 'CANCELADA'
  const base = `${agora().nome}--${tarefa.id}--${sufixo}`
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

  const ordemStr = (flags.ordem ?? '').trim()
  const paresOrdem: Array<{ de: number; para: number }> = []
  let motivoOrdem: string | null = null

  if (ordemStr) {
    motivoOrdem = (flags['motivo-ordem'] ?? '').trim()
    if (!motivoOrdem) {
      throw new Error('Uso de --ordem exige --motivo-ordem "<motivo>" explicitando a dependencia real de codigo.')
    }
    const pares = ordemStr.split(',').map((p) => p.trim()).filter(Boolean)
    for (const p of pares) {
      const partes = p.split('>')
      if (partes.length !== 2) {
        throw new Error(`Formato invalido em --ordem: "${p}". Use o formato "1>2,1>3".`)
      }
      const de = parseInt(partes[0]!.trim(), 10)
      const para = parseInt(partes[1]!.trim(), 10)
      if (isNaN(de) || isNaN(para) || de < 1 || de > titulos.length || para < 1 || para > titulos.length) {
        throw new Error(`Indice invalido em --ordem: "${p}". Os indices devem estar entre 1 e ${titulos.length}.`)
      }
      if (de === para) {
        throw new Error(`Autorreferencia invalida em --ordem: "${p}". Uma fatia nao pode depender de si mesma.`)
      }
      paresOrdem.push({ de, para })
    }

    // Validação de ciclos no grafo de dependências
    const adj: Map<number, number[]> = new Map()
    for (let i = 1; i <= titulos.length; i++) adj.set(i, [])
    for (const { de, para } of paresOrdem) {
      adj.get(de)!.push(para)
    }
    const visitado = new Set<number>()
    const naPilha = new Set<number>()
    function temCiclo(u: number): boolean {
      visitado.add(u)
      naPilha.add(u)
      for (const v of adj.get(u) ?? []) {
        if (!visitado.has(v)) {
          if (temCiclo(v)) return true
        } else if (naPilha.has(v)) {
          return true
        }
      }
      naPilha.delete(u)
      return false
    }
    for (let i = 1; i <= titulos.length; i++) {
      if (!visitado.has(i)) {
        if (temCiclo(i)) {
          throw new Error(`Ciclo detectado na definicao de --ordem: "${ordemStr}".`)
        }
      }
    }
  }

  // Alocação atômica dos IDs
  const idsFatias: string[] = []
  for (let i = 0; i < titulos.length; i++) {
    const idNova = proximoIdDeTarefa(pai.tipo)
    escreverJson(`${c.abertas}/${idNova}.json`, { id: idNova })
    idsFatias.push(idNova)
  }

  const criadas: string[] = []
  for (let i = 0; i < titulos.length; i++) {
    const titulo = titulos[i]!
    const fatiaId = idsFatias[i]!
    const depsIrmas = paresOrdem.filter((p) => p.para === i + 1).map((p) => idsFatias[p.de - 1]!)
    const depsExternas = pai.depende_de ?? []

    const fatia: Tarefa = {
      ...pai,
      id: fatiaId,
      titulo,
      fatia_de: pai.id,
      estado: 'aberta',
      fila: pai.fila,
      ordem: null,
      ordem_motivo: motivoOrdem,
      plano_do_epico: null,
      esforco: { humano: (esforco[0] ?? 'M') as Tarefa['esforco']['humano'], ia: (esforco[1] ?? 'M') as Tarefa['esforco']['ia'] },
      depende_de: [...depsExternas, ...depsIrmas],
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
  }

  if (!pai.plano_do_epico) {
    pai.plano_do_epico = {
      objetivo: null,
      problema_canonico: null,
      estado_da_arte: null,
      hipotese: null,
      sinal_de_desvio: null,
      contrato_entre_fatias: {
        forma: null,
        tipo: 'codigo',
        onde_vive: null,
        fatia_que_cria: null,
      },
      restricoes_reavaliadas: [],
      revisoes: [],
    }
    escreverJson(`${c.abertas}/${pai.id}.json`, pai)
  }

  regenerarTudo()
  if (ordemStr) {
    console.log(`${id} fatiada em ${criadas.length} com ordem declarada: ${criadas.join(' -> ')}`)
  } else {
    console.log(`${id} fatiada em ${criadas.length} independentes: ${criadas.join(', ')}`)
  }
  console.log(`${id} vira epico: sai da fila e nao se executa. Executam-se as fatias.`)
}
