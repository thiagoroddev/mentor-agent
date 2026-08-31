import { agora, agoraIso, caminhos, escreverJson, escreverTexto, existe, lerData, lerJson, listar, relogioDoPacote } from './arquivos.ts'
import { join } from 'node:path'
import type { Contexto, DividaTecnica, Recusa, Requisito, RiscoAceito, Tarefa } from './tipos.ts'

const AVISO = '<!-- Gerado por `node mentor.mjs gerar`. Nao edite a mao: a proxima geracao sobrescreve. -->'

export function carregarTarefas(): Tarefa[] {
  const c = caminhos()
  return [...listar(c.abertas, '.json'), ...listar(c.concluidas, '.json')].map((a) => lerJson<Tarefa>(a))
}

export function carregarRequisitos(): Requisito[] {
  const c = caminhos()
  return existe(c.requisitos) ? lerJson<Requisito[]>(c.requisitos) : []
}

export function carregarDividas(): DividaTecnica[] {
  const c = caminhos()
  return existe(c.dividas) ? lerJson<DividaTecnica[]>(c.dividas) : []
}

export function carregarRiscos(): RiscoAceito[] {
  const c = caminhos()
  return existe(c.riscos) ? lerJson<RiscoAceito[]>(c.riscos) : []
}

/**
 * O estado do prazo de um risco, **em um lugar so'**. O `doctor` e o `ra` tinham cada um a sua
 * conta, e as duas discordavam; quem usasse o comando era punido por isso.
 *
 * `ilegivel` existe separado de proposito: **nao conseguir ler uma data nao e' o mesmo que a data
 * ter passado**. Fundir os dois esconde o defeito do registro atras de um prazo que nunca existiu.
 */
export type EstadoDoPrazo = 'encerrado' | 'no_prazo' | 'vencido' | 'ilegivel'

export function estadoDoPrazo(r: RiscoAceito): EstadoDoPrazo {
  if (r.encerrado_em) return 'encerrado'
  const revisao = lerData(r.data_revisao)
  if (!revisao) return 'ilegivel'
  return revisao.getTime() < relogioDoPacote().getTime() ? 'vencido' : 'no_prazo'
}

/** Vencido e' pior que o problema original: a revisao parou de funcionar. Ilegivel nao e' vencido. */
export function riscoVencido(r: RiscoAceito): boolean {
  return estadoDoPrazo(r) === 'vencido'
}

export function carregarRecusas(): Recusa[] {
  const c = caminhos()
  return existe(c.recusas) ? lerJson<Recusa[]>(c.recusas) : []
}

/**
 * Grava a recusa no momento em que ela acontece. E' o unico registro do pacote que so' cresce:
 * apagar recusa seria apagar a evidencia de onde ele atrapalha.
 */
export function registrarRecusa(comando: string, alvo: string, impedimentos: string[]): void {
  const c = caminhos()
  const anteriores = carregarRecusas()
  anteriores.push({ quando: agora().log, comando, alvo, impedimentos })
  escreverJson(c.recusas, anteriores)
}

export function carregarContexto(): Contexto {
  const c = caminhos()
  if (!existe(c.contexto)) {
    throw new Error('docs-mentor/contexto.json nao existe neste projeto. Rode "mentor init" primeiro.')
  }
  return lerJson<Contexto>(c.contexto)
}

const PESO_VALOR = { critico: 0, importante: 1, desejavel: 2 } as const
const PESO_ESFORCO = { P: 0, M: 1, G: 2, XG: 3 } as const

const viva = (t: Tarefa) => t.estado === 'aberta' || t.estado === 'em-execucao'

/** Uma tarefa com fatias abertas nao se executa: ela e' o epico. Sai da fila e vira cabecalho. */
function fatiasVivasDe(id: string, todas: Tarefa[]): Tarefa[] {
  return todas.filter((f) => f.fatia_de === id && viva(f))
}

/**
 * "fatia 2 de 5" e' **calculado na hora de gerar**, nunca guardado.
 * Guardar seria denominador movel: a sexta fatia obrigaria a reescrever as cinco anteriores.
 * Pelo mesmo motivo isso nao entra em nome de arquivo, que carrega so' data e ID, os dois imutaveis.
 */
function posicaoNaFatia(t: Tarefa, todas: Tarefa[]): string {
  if (!t.fatia_de) return '-'
  const irmas = todas
    .filter((f) => f.fatia_de === t.fatia_de)
    .sort((a, b) => a.id.localeCompare(b.id))
  const indice = irmas.findIndex((f) => f.id === t.id)
  return indice < 0 ? t.fatia_de : `${indice + 1}/${irmas.length} de ${t.fatia_de}`
}

/**
 * A ordem da tabela E' a ordem de execucao, e sai de criterios fixos, nunca de opiniao:
 * ordem fixada a mao primeiro, depois urgencia, dependencias resolvidas, valor, e menor esforco.
 * XG cai sempre para o fim: ele nao se executa, se divide.
 */
function ordenar(tarefas: Tarefa[], todas: Tarefa[]): Tarefa[] {
  const concluidas = new Set(todas.filter((t) => t.estado === 'concluida').map((t) => t.id))
  const livre = (t: Tarefa) => t.depende_de.every((d) => concluidas.has(d))
  return [...tarefas].sort((a, b) => {
    const oa = a.ordem ?? Number.POSITIVE_INFINITY
    const ob = b.ordem ?? Number.POSITIVE_INFINITY
    if (oa !== ob) return oa - ob
    const xa = a.esforco.ia === 'XG' ? 1 : 0
    const xb = b.esforco.ia === 'XG' ? 1 : 0
    if (xa !== xb) return xa - xb
    if (a.urgencia !== b.urgencia) return a.urgencia === 'imediata' ? -1 : 1
    if (livre(a) !== livre(b)) return livre(a) ? -1 : 1
    if (a.valor !== b.valor) return PESO_VALOR[a.valor] - PESO_VALOR[b.valor]
    return PESO_ESFORCO[a.esforco.ia] - PESO_ESFORCO[b.esforco.ia]
  })
}

/**
 * Fixa uma tarefa no topo da fila. So' as fixadas carregam `ordem`: a marca e' rara de proposito,
 * porque ordem fixada a mao e' a unica parte da fila que pode discordar dos criterios e envelhecer.
 */
export function fixar(id: string, posicao: number): Tarefa[] {
  const todas = carregarTarefas()
  const alvo = todas.find((t) => t.id === id)
  if (!alvo) throw new Error(`${id} nao encontrada.`)
  if (alvo.estado === 'concluida' || alvo.estado === 'cancelada') throw new Error(`${id} esta ${alvo.estado}.`)
  const fixadas = todas
    .filter((t) => t.ordem !== null && t.id !== id && (t.estado === 'aberta' || t.estado === 'em-execucao'))
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
  const nova = [...fixadas.slice(0, posicao - 1), alvo, ...fixadas.slice(posicao - 1)]
  nova.forEach((t, i) => { t.ordem = i + 1 })
  return nova
}

/** Devolve a tarefa a' ordem calculada. */
export function soltar(id: string): Tarefa[] {
  const alvo = carregarTarefas().find((t) => t.id === id)
  if (!alvo) throw new Error(`${id} nao encontrada.`)
  alvo.ordem = null
  return [alvo]
}

export function gerarBacklog(): void {
  const c = caminhos()
  const todas = carregarTarefas()
  // O epico aparece mesmo estando na reserva: o que o traz para a vista sao as fatias no ciclo.
  const epicos = todas.filter(
    (t) => viva(t) && fatiasVivasDe(t.id, todas).some((f) => f.fila === 'ciclo'),
  )
  const noCiclo = todas.filter((t) => viva(t) && t.fila === 'ciclo')
  const fila = ordenar(noCiclo.filter((t) => fatiasVivasDe(t.id, todas).length === 0), todas)
  const concluidas = new Set(todas.filter((t) => t.estado === 'concluida').map((t) => t.id))

  const linhas = ['# Backlog', '', AVISO, '']

  if (epicos.length) {
    linhas.push('## Epicos em fatias', '', '| ID | Titulo | Fatias abertas |', '|---|---|---|')
    for (const e of epicos) {
      const fatias = fatiasVivasDe(e.id, todas)
      const marcadas = fatias.map((f) => (f.fila === 'ciclo' ? f.id : `${f.id} (reserva)`))
      linhas.push(`| \`${e.id}\` | ${e.titulo} | ${marcadas.join(', ')} |`)
    }
    linhas.push('', '> Epico nao se executa: executam-se as fatias. Por isso ele nao entra na fila.', '')
  }

  linhas.push(
    '## Fila',
    '',
    '> A ordem da tabela e a ordem de execucao. Ela e calculada, nunca digitada.',
    '> Criterios, nesta ordem: ordem fixada a mao · XG por ultimo · urgencia · dependencia resolvida · valor · menor esforco.',
    '',
    '| # | ID | Titulo | Fatia | Valor | Urgencia | Esforco H/IA | Bloqueada por | Origem |',
    '|--:|---|---|---|---|---|---|---|---|',
  )
  fila.forEach((t, i) => {
    const presos = t.depende_de.filter((d) => !concluidas.has(d))
    const espera = t.validacao === 'pendente' ? ' 🔍' : ''
    const trava = presos.length ? presos.join(', ') : '-'
    const fixa = t.ordem === null ? '' : '📌'
    const aviso = t.esforco.ia === 'XG' ? ' ⚠️ dividir antes' : ''
    linhas.push(
      `| ${i + 1}${fixa} | \`${t.id}\` | ${t.titulo}${aviso}${espera} | ${posicaoNaFatia(t, todas)} | ${t.valor} | ${t.urgencia} | ${t.esforco.humano}/${t.esforco.ia} | ${trava} | ${t.origem} |`,
    )
  })
  if (fila.length === 0) linhas.push('| | | Nenhuma tarefa na fila | | | | | | |')
  escreverTexto(c.backlog, linhas.join('\n'))
}

/**
 * A reserva e' lembrete, e **nao entra no contexto da IA**. Ela existe em disco para o humano
 * consultar; o custo de ordenar a fila nunca inclui o que esta' aqui.
 */
export function gerarReserva(): void {
  const c = caminhos()
  const todas = carregarTarefas()
  // O epico so' sai daqui quando ja' aparece como cabecalho do backlog, isto e', quando alguma
  // fatia dele foi puxada. Antes disso ele fica visivel aqui, senao sumiria das duas vistas.
  const guardadas = todas
    .filter((t) => t.estado === 'aberta' && t.fila === 'reserva')
    .filter((t) => !fatiasVivasDe(t.id, todas).some((f) => f.fila === 'ciclo'))
  const linhas = [
    '# Reserva',
    '',
    AVISO,
    '',
    '> Lembretes sem compromisso. Nao entram no contexto: puxe com `mentor task puxar <ID>`.',
    '> Requisito pendente nao precisa de tarefa aqui: `requisitos/pendentes.md` ja e o lembrete dele.',
    '',
    '| ID | Titulo | Fatia | Tipo | Valor | Esforco H/IA | Origem |',
    '|---|---|---|---|---|---|---|',
  ]
  for (const t of guardadas) {
    const fatias = fatiasVivasDe(t.id, todas)
    const marca = fatias.length ? `epico, ${fatias.length} fatias` : posicaoNaFatia(t, todas)
    linhas.push(`| \`${t.id}\` | ${t.titulo} | ${marca} | ${t.tipo} | ${t.valor} | ${t.esforco.humano}/${t.esforco.ia} | ${t.origem} |`)
  }
  if (guardadas.length === 0) linhas.push('| | Nada guardado | | | | | |')
  escreverTexto(c.reservaMd, linhas.join('\n'))
}

/**
 * Indice das encerradas. Substitui o `0-indice-concluidas.md` mantido a mao, e absorve a secao
 * "Numeros aposentados": cancelada e absorvida aparecem aqui, e o numero nunca volta a ser usado.
 */
export function gerarIndiceDeConcluidas(): void {
  const c = caminhos()
  const todas = carregarTarefas()
  const encerradas = todas
    .filter((t) => t.estado === 'concluida' || t.estado === 'cancelada')
    .sort((a, b) => (a.concluida_em ?? '').localeCompare(b.concluida_em ?? ''))

  const linhas = [
    '# Tarefas encerradas',
    '',
    AVISO,
    '',
    '| Encerrada em | ID | Tipo | Titulo | Fatia | Desfecho | Validacao |',
    '|---|---|---|---|---|---|---|',
  ]
  for (const t of encerradas) {
    const desfecho =
      t.estado === 'concluida' ? 'concluida'
      : t.absorvida_por ? `absorvida por ${t.absorvida_por}`
      : `cancelada: ${t.cancelamento_motivo ?? 'sem motivo'}`
    const registro = t.narrativa ? `[\`${t.id}\`](./${t.narrativa})` : `\`${t.id}\``
    linhas.push(
      `| ${t.concluida_em ?? '-'} | ${registro} | ${t.tipo} | ${t.titulo} | ${posicaoNaFatia(t, todas)} | ${desfecho} | ${t.validacao} |`,
    )
  }
  if (encerradas.length === 0) linhas.push('| | | | Nada encerrado ainda | | | |')
  escreverTexto(c.indiceConcluidas, linhas.join('\n'))
}

export function gerarVistasDeRequisitos(): void {
  const c = caminhos()
  const reqs = carregarRequisitos()
  const monta = (titulo: string, lista: Requisito[], colunaTarefa: string) => {
    const l = [`# ${titulo}`, '', AVISO, '', `| ID | Tipo | Enunciado | Prioridade | ${colunaTarefa} |`, '|---|---|---|---|---|']
    for (const r of lista) {
      const t = r.tarefas.length ? r.tarefas.join(', ') : '-'
      l.push(`| \`${r.id}\` | ${r.tipo} | ${r.enunciado} | ${r.prioridade} | ${t} |`)
    }
    if (lista.length === 0) l.push('| | | Nenhum ainda | | |')
    return l.join('\n')
  }
  const base = c.docs + '/requisitos'
  escreverTexto(base + '/implementados.md', monta('Requisitos implementados', reqs.filter((r) => r.status === 'implementado'), 'Tarefas'))
  escreverTexto(base + '/pendentes.md', monta('Requisitos ainda nao implementados', reqs.filter((r) => r.status !== 'implementado' && r.status !== 'cancelado'), 'Tarefa prevista'))
}

const IGNORAR = (chave: string) =>
  chave.startsWith('_') || chave.endsWith('_possiveis') || chave.endsWith('_aceita') ||
  chave === 'nota' || chave === 'guia'

/** Blocos que a vista resume no cabecalho e nao repete na lista de decisoes. */
const RESUMIDOS = ['estado.portoes', 'contagens', 'auditoria']

type Achatado = { rotulo: string; valor: string }

/**
 * O valor que o **esquema entrega pronto**, para o mesmo caminho de campo.
 * Existe porque campo preenchido pelo pacote e campo respondido pela pessoa sao coisas diferentes,
 * e o contador que os soma faz o projeto parecer decidido sem ninguem ter decidido nada. O primeiro
 * `contexto.md` de um projeto real dizia "Decidido: 25 campos" com **zero** decisao tomada.
 */
function valorDoEsquema(rotulo: string): string | null {
  const arquivo = join(caminhos().esquemas, 'contexto.json')
  if (!existe(arquivo)) return null
  let no: unknown = lerJson<Record<string, unknown>>(arquivo)
  for (const parte of rotulo.split('.')) {
    if (no === null || typeof no !== 'object') return null
    no = (no as Record<string, unknown>)[parte]
  }
  if (no === null || no === undefined) return null
  if (Array.isArray(no)) return `${no.length} item(s)`
  if (typeof no === 'object') return null
  return String(no)
}

/** Devolve so' o que foi decidido, e conta o que nao foi. Campo null e' pauta, nao conteudo. */
function achatar(no: unknown, prefixo: string, cheios: Achatado[], vazios: string[]): void {
  if (no === null || no === undefined) { vazios.push(prefixo); return }
  if (Array.isArray(no)) {
    if (no.length === 0) vazios.push(prefixo)
    else cheios.push({ rotulo: prefixo, valor: `${no.length} item(s)` })
    return
  }
  if (typeof no === 'object') {
    if (RESUMIDOS.includes(prefixo)) return
    for (const [chave, filho] of Object.entries(no as Record<string, unknown>)) {
      if (IGNORAR(chave)) continue
      achatar(filho, prefixo ? `${prefixo}.${chave}` : chave, cheios, vazios)
    }
    return
  }
  cheios.push({ rotulo: prefixo, valor: String(no) })
}

export function gerarContextoMd(): { cheios: number; vazios: number } {
  const c = caminhos()
  const ctx = carregarContexto()
  const cheios: Achatado[] = []
  const vazios: string[] = []
  achatar(ctx, '', cheios, vazios)

  // Padrao do pacote nao e' decisao. Igual ao esquema = ninguem olhou ainda.
  const padroes = cheios.filter((f) => valorDoEsquema(f.rotulo) === f.valor)
  const respondidos = cheios.filter((f) => valorDoEsquema(f.rotulo) !== f.valor)

  const portoesAbertos = Object.entries(ctx.estado.portoes)
    .filter(([, p]) => p.status === 'aberto')
    .map(([nome]) => nome)

  const linhas = [
    '# Contexto do projeto',
    '',
    AVISO,
    '',
    `**Fase:** ${ctx.estado.fase ?? 'nao definida'} · **Rigor:** ${ctx.rigor.nivel ?? 'nao definido'}`,
    `**Respondido por voce:** ${respondidos.length} · **Padrao do pacote:** ${padroes.length} · **Em aberto:** ${vazios.length}`,
    '',
    portoesAbertos.length
      ? `⚠️ **Portoes ainda abertos:** ${portoesAbertos.join(' · ')}. Cada um tem arquivo em \`.mentor/guia/00-indice.md\`.`
      : 'Todos os portoes foram respondidos ou dispensados com motivo.',
    '',
    '## Respondido por voce',
    '',
  ]
  if (respondidos.length === 0) {
    linhas.push('Nenhum campo ainda. Tudo o que esta preenchido veio pronto do pacote.', '')
  }
  for (const { rotulo, valor } of respondidos) linhas.push(`- \`${rotulo}\`: ${valor}`)
  // Os padroes sao contados, nunca listados. Esta vista entra em contexto a cada sessao, e listar
  // 25 valores que ninguem escolheu custa caracteres para nao dizer nada. O numero ja' diz tudo:
  // eles existem, e nenhum foi decidido.
  if (padroes.length) {
    linhas.push(`${padroes.length} campo(s) vieram preenchidos pelo pacote e ainda nao foram olhados.`)
    linhas.push('Valem enquanto ninguem decidir outra coisa.')
  }
  linhas.push('', '> O JSON completo, com os campos em aberto, esta' + "'" + ' em `docs-mentor/contexto.json`.')
  escreverTexto(c.contextoMd, linhas.join('\n'))
  return { cheios: cheios.length, vazios: vazios.length }
}

export function atualizarContagens(): Contexto {
  const c = caminhos()
  const ctx = carregarContexto()
  const tarefas = carregarTarefas()
  const reqs = carregarRequisitos()
  const concluidas = tarefas.filter((t) => t.estado === 'concluida').length
  const { vazios } = gerarContextoMd()

  const dividas = carregarDividas()
  const riscos = carregarRiscos()
  const vivas = tarefas.filter((t) => t.estado === 'aberta' || t.estado === 'em-execucao')

  ctx.contagens = {
    _gerado_por_script: true,
    tarefas_concluidas: concluidas,
    tarefas_abertas: vivas.length,
    tarefas_no_ciclo: vivas.filter((t) => t.fila === 'ciclo').length,
    tarefas_na_reserva: vivas.filter((t) => t.fila === 'reserva').length,
    validacoes_pendentes: tarefas.filter((t) => t.validacao === 'pendente').length,
    requisitos_total: reqs.length,
    requisitos_implementados: reqs.filter((r) => r.status === 'implementado').length,
    requisitos_pendentes: reqs.filter((r) => r.status === 'pendente').length,
    divida_tecnica_aberta: dividas.filter((d) => !d.paga_em).length,
    riscos_aceitos_ativos: riscos.filter((r) => !r.encerrado_em && !riscoVencido(r)).length,
    riscos_aceitos_vencidos: riscos.filter((r) => riscoVencido(r)).length,
    tarefas_desde_revisao_geral: concluidas - (ctx.revisao_geral.ultima_na_tarefa ?? 0),
    adrs: listar(c.adr, '.md').length,
    ferramentas_sem_padrao: ctx.ferramentas.filter((f) => !f.padrao && !f.dispensa_motivo).length,
    campos_nulos_do_contexto: vazios,
    // Preenchidos pelo doctor (fase 4), que e' quem classifica achado por severidade.
    divida_tecnica_com_gatilho_vencido: ctx.contagens['divida_tecnica_com_gatilho_vencido'] ?? null,
  }
  ctx.auditoria.proxima_em_tarefa =
    Math.floor(concluidas / ctx.auditoria.cadencia_em_tarefas + 1) * ctx.auditoria.cadencia_em_tarefas
  // A versao vem do manifesto do pacote INSTALADO, a cada geracao. Era gravada so' pelo `init`, e o
  // `init` recusa rodar em projeto que ja' existe: atualizar o pacote nunca atualizava o numero.
  // Achado em campo com a 0.1.3 instalada e o contexto ainda dizendo 0.1.2, o que faz o relatorio
  // atribuir defeito a versao errada e destroi a unica coisa que o campo mede. Gerado, nao lembrado.
  const manifesto = join(c.pacote, 'manifesto.json')
  if (existe(manifesto)) {
    ctx._meta['versao_do_pacote'] = lerJson<{ versao?: string }>(manifesto).versao ?? 'desconhecida'
  }
  ctx._meta.atualizado_em = agoraIso()
  escreverJson(c.contexto, ctx)
  return ctx
}

export function regenerarTudo(): void {
  gerarBacklog()
  gerarReserva()
  gerarIndiceDeConcluidas()
  gerarVistasDeRequisitos()
  atualizarContagens()
}
