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

// ---------------------------------------------------------------- desvincular

/**
 * Desvincula uma fatia de seu épico pai, tornando-a avulsa ou transferindo-a para outro épico.
 * Trata rastro em plano_do_epico.revisoes, zera ordem_motivo, reinicia composicao se movida
 * e regenera as vistas derivadas.
 */
export function desvincular(id: string, flags: Flags = {}): void {
  const motivo = (flags.motivo ?? '').trim()
  if (!motivo) {
    throw new Error('Falta --motivo. Desvincular fatia exige justificativa registrada no epico.')
  }

  const c = caminhos()
  const todas = carregarTarefas()
  const tarefa = todas.find((t) => t.id === id)
  if (!tarefa) throw new Error(`Tarefa ${id} nao encontrada.`)

  if (tarefa.estado === 'concluida' || tarefa.estado === 'cancelada') {
    throw new Error(`${id} esta em estado "${tarefa.estado}". Apenas tarefas abertas, em execucao ou pausadas podem ser desvinculadas.`)
  }

  if (!tarefa.fatia_de) {
    throw new Error(`${id} ja e uma tarefa avulsa (nao possui fatia_de).`)
  }

  const idOrigem = tarefa.fatia_de
  const paiOrigem = todas.find((t) => t.id === idOrigem)

  const destinoId = flags['mover-para']?.trim()
  let novoPai: Tarefa | null = null

  if (destinoId) {
    novoPai = todas.find((t) => t.id === destinoId) ?? null
    if (!novoPai) throw new Error(`Epico de destino ${destinoId} nao existe.`)
    if (novoPai.id === id) throw new Error('Uma tarefa nao pode ser fatia de si mesma.')
    if (novoPai.estado === 'concluida' || novoPai.estado === 'cancelada') {
      throw new Error(`Epico de destino ${novoPai.id} esta em estado "${novoPai.estado}". Nao e permitido mover para epico encerrado.`)
    }
    if (!novoPai.plano_do_epico) {
      throw new Error(`Tarefa ${novoPai.id} nao e um epico (nao possui plano_do_epico). Use mentor task fatiar para fatiar um epico.`)
    }

    // Validação de ciclos na árvore de pais
    let atual: Tarefa | undefined = novoPai
    while (atual?.fatia_de) {
      if (atual.fatia_de === id) {
        throw new Error(`Ciclo detectado: ${novoPai.id} e descendente de ${id}. Nao e permitido mover para descendente.`)
      }
      atual = todas.find((t) => t.id === atual?.fatia_de)
    }
  }

  // Zera ordem_motivo que pertencia ao arranjo de fatias anterior
  tarefa.ordem_motivo = null

  // Alerta sobre dependências de ex-irmãs sem apagá-las
  if (paiOrigem) {
    const irmasOrigem = todas.filter((t) => t.fatia_de === paiOrigem.id && t.id !== id)
    const depsExIrmas = tarefa.depende_de.filter((depId) => irmasOrigem.some((i) => i.id === depId))
    if (depsExIrmas.length > 0) {
      console.warn(`! Aviso: ${id} mantem dependencias de ex-irmas (${depsExIrmas.join(', ')}). Verifique se ainda fazem sentido.`)
    }
  }

  if (novoPai) {
    tarefa.fatia_de = novoPai.id
    // Se a tarefa já estava iniciada, reinicia a composição com marcadores para cobrar novo preenchimento
    if (tarefa.plano && tarefa.plano.composicao) {
      tarefa.plano.composicao = {
        o_que_esta_fatia_entrega: `${MARCADOR} o que esta fatia entrega e como se integra ao todo`,
        a_direcao_se_mantem: true,
        porque: `${MARCADOR} por que a direcao do epico se mantem ou mudou`,
      }
    }
  } else {
    tarefa.fatia_de = null
    // Higiene: anula o bloco de composição já que a tarefa não é mais fatia
    if (tarefa.plano?.composicao) {
      tarefa.plano.composicao = null
    }
  }

  // Salva a tarefa atualizada
  const caminhoTarefa = join(c.abertas, `${tarefa.id}.json`)
  escreverJson(caminhoTarefa, tarefa)

  // Grava rastro no épico de origem
  if (paiOrigem && paiOrigem.plano_do_epico) {
    if (!paiOrigem.plano_do_epico.revisoes) paiOrigem.plano_do_epico.revisoes = []
    paiOrigem.plano_do_epico.revisoes.push({
      data: agora().log,
      motivo: novoPai
        ? `fatia ${id} transferida para ${novoPai.id}: ${motivo}`
        : `fatia ${id} desvinculada para tarefa avulsa: ${motivo}`,
      apos_fatia: id,
    })
    const caminhoPaiOrigem = join(c.abertas, `${paiOrigem.id}.json`)
    if (existe(caminhoPaiOrigem)) escreverJson(caminhoPaiOrigem, paiOrigem)
  }

  // Grava rastro no novo épico de destino
  if (novoPai && novoPai.plano_do_epico) {
    if (!novoPai.plano_do_epico.revisoes) novoPai.plano_do_epico.revisoes = []
    novoPai.plano_do_epico.revisoes.push({
      data: agora().log,
      motivo: `fatia ${id} recebida vinda de ${idOrigem}: ${motivo}`,
      apos_fatia: id,
    })
    const caminhoNovoPai = join(c.abertas, `${novoPai.id}.json`)
    if (existe(caminhoNovoPai)) escreverJson(caminhoNovoPai, novoPai)
  }

  // Alerta quando a fatia desvinculada for a última viva do épico de origem
  if (paiOrigem) {
    const vivasRestantes = todas.filter(
      (t) => t.fatia_de === paiOrigem.id && t.id !== id && t.estado !== 'concluida' && t.estado !== 'cancelada',
    )
    if (vivasRestantes.length === 0) {
      console.warn(`! Aviso: ${id} era a ultima fatia ativa de ${paiOrigem.id}. O epico agora nao possui mais fatias ativas.`)
    }
  }

  regenerarTudo()

  if (novoPai) {
    console.log(`${id} transferida do epico ${idOrigem} para o epico ${novoPai.id}.`)
  } else {
    console.log(`${id} desvinculada do epico ${idOrigem}. Agora e uma tarefa avulsa.`)
  }
}
