import { spawnSync } from 'node:child_process'
import { renameSync, rmSync } from 'node:fs'
import { agora, caminhos, escreverJson, escreverTexto, existe, lerJson, lerTexto, listar, NOME_DOS_DOCUMENTOS } from './arquivos.ts'
import { proximoIdDeTarefa } from './ids.ts'
import { carregarContexto, carregarRequisitos, carregarTarefas, fixar, regenerarTudo, registrarRecusa, soltar } from './vistas.ts'
import {
  DESTINOS_DE_ACHADO, ESCALA, MARCADOR, METODOS_COM_VERMELHO, ROTULOS, ROTULOS_DE_EXECUCAO,
  ROTULOS_QUE_EXIGEM_MOTIVO, ROTULOS_QUE_NAO_FECHAM, TIPOS_TAREFA,
} from './tipos.ts'
import type {
  Cerimonia, Escala, MetodoDeTeste, Requisito, Rotulo, Tarefa, TipoTarefa, Urgencia, ValorTarefa,
} from './tipos.ts'
import { baseDoLote, loteNaoAuditado, medirDiffAcumulado } from './cmd-auditar.ts'

type Flags = Record<string, string | undefined>

function exigir(flags: Flags, nome: string): string {
  const v = flags[nome]
  if (!v) throw new Error(`Falta --${nome}`)
  return v
}

function umDe<T extends string>(valor: string, aceitos: readonly T[], campo: string): T {
  if (!(aceitos as readonly string[]).includes(valor)) {
    throw new Error(`${campo} invalido: "${valor}". Aceitos: ${aceitos.join(' | ')}`)
  }
  return valor as T
}

function localizar(id: string): { caminho: string; tarefa: Tarefa } {
  const c = caminhos()
  for (const arquivo of [...listar(c.abertas, '.json'), ...listar(c.concluidas, '.json')]) {
    const tarefa = lerJson<Tarefa>(arquivo)
    if (tarefa.id === id) return { caminho: arquivo, tarefa }
  }
  throw new Error(`Tarefa ${id} nao encontrada.`)
}

const narrativaDe = (caminhoJson: string) => caminhoJson.replace(/\.json$/, '.md')

/** O commit atual, ou `null` se o projeto ainda nao tem git. Nunca lanca: git ausente nao trava tarefa. */
function cabecaDoGit(): string | null {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: caminhos().raiz, encoding: 'utf8' })
  return r.status === 0 ? (r.stdout ?? '').trim() || null : null
}

// ---------------------------------------------------------------- nova

export function nova(flags: Flags): void {
  const c = caminhos()
  const tipo = umDe<TipoTarefa>(exigir(flags, 'tipo'), TIPOS_TAREFA, 'tipo')
  const [humano, ia] = exigir(flags, 'esforco').split('/')
  const reqs = (flags.requisitos ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  let semRequisitoMotivo: string | null = null

  if (['RF', 'RN', 'RNF'].includes(tipo)) {
    if (reqs.length === 0) {
      if (flags['sem-requisito'] && flags.motivo && flags.motivo.trim()) {
        semRequisitoMotivo = flags.motivo.trim()
      } else {
        throw new Error(
          `Tarefa do tipo "${tipo}" exige --requisitos <ID> ou --sem-requisito --motivo "<justificativa>". Funcionalidade e regra de negocio precisam estar rastreadas no catalogo de requisitos.`,
        )
      }
    } else if (existe(c.requisitos)) {
      try {
        const catalogo = lerJson<Array<{ id?: string }>>(c.requisitos)
        const ids = new Set(catalogo.map((r) => r.id).filter(Boolean))
        if (ids.size > 0) {
          for (const rid of reqs) {
            if (!ids.has(rid)) {
              throw new Error(
                `Requisito "${rid}" nao encontrado no catalogo (${c.requisitos}). Cadastre primeiro com "mentor req nova" ou vincule a um ID existente.`,
              )
            }
          }
        }
      } catch (e: any) {
        if (e.message?.includes('Requisito "')) throw e
      }
    }
  }

  const t: Tarefa = {
    id: proximoIdDeTarefa(tipo),
    tipo,
    // O marcador de fatia e' do script: o titulo carrega so o que a tarefa faz.
    titulo: exigir(flags, 'titulo').replace(/^\[fatia de [^\]]+\]\s*/i, ''),
    fatia_de: flags['fatia-de'] ?? null,
    estado: 'aberta',
    cerimonia: umDe<Cerimonia>(flags.cerimonia ?? 'Standard', ['Light', 'Standard', 'Strict'], 'cerimonia'),
    valor: umDe<ValorTarefa>(flags.valor ?? 'importante', ['critico', 'importante', 'desejavel'], 'valor'),
    urgencia: umDe<Urgencia>(flags.urgencia ?? 'normal', ['imediata', 'normal'], 'urgencia'),
    esforco: {
      humano: umDe<Escala>(humano ?? '', ESCALA, 'esforco humano'),
      ia: umDe<Escala>(ia ?? '', ESCALA, 'esforco IA'),
    },
    depende_de: (flags.depende ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    // Nasce sempre na reserva: registrar nunca e' bloqueado, inchar o ciclo sim.
    fila: 'reserva',
    ordem: null,
    origem: exigir(flags, 'origem'),
    requisitos: reqs,
    sem_requisito_motivo: semRequisitoMotivo,
    criada_em: agora().log,
    iniciada_em: null,
    commit_base: null,
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
  if (t.esforco.ia === 'XG') {
    console.log('AVISO: esforco XG para IA e sinal de divisao obrigatoria. Quebre antes de executar.')
  }
  escreverJson(`${c.abertas}/${t.id}.json`, t)
  regenerarTudo()
  console.log(`Criada ${t.id} na reserva. Para trazer ao ciclo: mentor task puxar ${t.id}`)
}

// ---------------------------------------------------------------- iniciar

export function iniciar(id: string): void {
  const { caminho, tarefa } = localizar(id)
  if (tarefa.estado !== 'aberta') throw new Error(`${id} esta em "${tarefa.estado}", nao em "aberta".`)
  if (tarefa.fila !== 'ciclo') {
    throw new Error(`${id} esta na reserva. Puxe primeiro: mentor task puxar ${id}`)
  }
  // Trabalho parado pela metade e' o desperdicio mais invisivel, porque parece progresso (guia ES-50).
  const limite = carregarContexto().limites.em_execucao
  const emExecucao = carregarTarefas().filter((t) => t.estado === 'em-execucao')
  if (emExecucao.length >= limite) {
    throw new Error(
      `Ja ha ${emExecucao.length} tarefa(s) em execucao (limite ${limite}): ${emExecucao.map((t) => t.id).join(', ')}. Feche antes de abrir outra.`,
    )
  }
  tarefa.estado = 'em-execucao'
  tarefa.iniciada_em = agora().log
  // Marca o ponto de partida no historico. Sem ele a auditoria nao consegue recortar o diff da
  // tarefa e so' sobraria "o repositorio inteiro", que e' exatamente o escopo que gera o loop.
  tarefa.commit_base = cabecaDoGit()
  const validacaoManual = carregarContexto().gates['validacao_manual'] as { existe?: boolean } | undefined
  if (validacaoManual?.existe === true && tarefa.validacao === 'nao_requer') {
    tarefa.validacao = 'pendente'
  }
  const ehSpike = tarefa.tipo === 'SPIKE'
  tarefa.plano = {
    muda: [`${MARCADOR} caminho/arquivo.ext - o que muda nele, em uma linha`],
    criterios_aceite: [
      ehSpike
        ? { texto: `${MARCADOR} a pergunta que este spike responde`, teste: 'nao se aplica: spike' }
        : {
            texto: `${MARCADOR} como saberemos que esta pronto`,
            teste: `${MARCADOR} arquivo > nome do teste, ou "nao se aplica: <motivo>"`,
          },
    ],
    impacto: `${MARCADOR} modulos afetados`,
    riscos: [`${MARCADOR} o que pode dar errado, ou "nenhum identificado"`],
    dependencias_novas: [],
    proporcionalidade: `${MARCADOR} pediram X, proponho Y, e Y e do tamanho de X porque...`,
  }
  escreverJson(caminho, tarefa)

  const narrativa = narrativaDe(caminho)
  if (!existe(narrativa)) {
    const secoes = ehSpike
      ? [
          '## A resposta',
          `${MARCADOR} o que a exploracao descobriu`,
          '',
          '## O que foi descartado',
          `${MARCADOR} spike e descartavel: o que sai daqui, e o que sobrevive e por que`,
          '',
          '## A tarefa que isto destrava',
          `${MARCADOR} o ID, ou "nenhuma: a resposta foi nao"`,
        ]
      : [
          '## Decisoes tomadas',
          `${MARCADOR} o que foi decidido durante a execucao, e por que`,
          '',
          '## O que nao foi feito, e por que',
          `${MARCADOR} escopo recusado, adiado, ou impossivel agora`,
          '',
          '## Testes de descoberta',
          `${MARCADOR} bordas que so apareceram ao implementar e viraram teste. "Nenhuma" e' resposta`,
          '',
          '## Aprendizados',
          `${MARCADOR} o que a proxima tarefa deveria saber. "Nada" e resposta legitima`,
        ]
    escreverTexto(narrativa, [`# ${tarefa.id} · ${tarefa.titulo}`, '', ...secoes].join('\n'))
  }
  regenerarTudo()
  console.log(`${id} em execucao. Preencha o plano e apresente ao humano antes de executar (nucleo, portao 1).`)
}

// ---------------------------------------------------------------- gate

function recortar(saida: string, limite = 4000): string {
  if (saida.length <= limite) return saida
  const meio = Math.floor(limite / 2)
  return `${saida.slice(0, meio)}\n[...recortado...]\n${saida.slice(-meio)}`
}

export function registrarGate(id: string, gate: string, flags: Flags): void {
  const { caminho, tarefa } = localizar(id)
  const ctx = carregarContexto()
  const rotuloPedido = flags.rotulo as Rotulo | undefined

  if (rotuloPedido) {
    if (!ROTULOS.includes(rotuloPedido)) throw new Error(`Rotulo fora do vocabulario: "${rotuloPedido}".`)
    if (ROTULOS_DE_EXECUCAO.includes(rotuloPedido)) {
      throw new Error(`"${rotuloPedido}" so nasce de comando executado. Rode sem --rotulo. Declaracao escrita a mao nao vale como evidencia.`)
    }
    if (ROTULOS_QUE_EXIGEM_MOTIVO.includes(rotuloPedido) && !flags.motivo) {
      throw new Error(`"${rotuloPedido}" exige --motivo: por que o fechamento se sustenta sem ele.`)
    }
    tarefa.gates[gate] = {
      rotulo: rotuloPedido, vermelho_em: tarefa.gates[gate]?.vermelho_em ?? null,
      comando: null, codigo_saida: null, saida: null,
      executado_em: agora().log, evidencia_url: flags.url ?? null,
      motivo: flags.motivo ?? null, ressalva: null,
    }
    escreverJson(caminho, tarefa)
    console.log(`${id} · ${gate}: ${rotuloPedido}`)
    return
  }

  if (flags['vermelho-dispensado']) {
    if (gate !== 'testes') {
      throw new Error('Dispensa de vermelho so e valida para o gate "testes".')
    }
    if (!flags.motivo || !flags.motivo.trim()) {
      throw new Error(
        '--vermelho-dispensado exige --motivo com a evidencia de teste por mutacao (ex: provar que alteracao intencional no codigo faz o teste falhar).',
      )
    }
    const gateExistente = tarefa.gates[gate]
    if (gateExistente && (gateExistente.rotulo === 'APROVADO' || gateExistente.rotulo === 'APROVADO com ressalva')) {
      if (!flags.arquivo && Boolean(flags['executar']) !== true) {
        gateExistente.vermelho_dispensado = {
          dispensado_em: agora().log,
          motivo: flags.motivo.trim(),
        }
        escreverJson(caminho, tarefa)
        console.log(`${id} · ${gate}: vermelho dispensado com justificativa de mutacao.`)
        return
      }
    }
  }

  const caminhoArquivo = flags.arquivo
  let comandoExecutado: string | null = null
  let codigoSaida: number | null = null
  let saidaBruta = ''

  if (caminhoArquivo) {
    if (!existe(caminhoArquivo)) {
      throw new Error(`Arquivo de evidencia nao encontrado: "${caminhoArquivo}".`)
    }
    saidaBruta = lerTexto(caminhoArquivo)
    comandoExecutado = ctx.gates[gate]?.comando ?? `arquivo:${caminhoArquivo}`
    codigoSaida = flags['codigo-saida'] !== undefined ? Number(flags['codigo-saida']) : 0
    if (isNaN(codigoSaida)) throw new Error(`--codigo-saida invalido: "${flags['codigo-saida']}". Deve ser numero.`)
  } else {
    const comando = ctx.gates[gate]?.comando
    if (!comando) {
      throw new Error(`O projeto nao declarou comando para o gate "${gate}" em docs-mentor/contexto.json. Declarar e a primeira coisa a resolver, nunca inventar um comando.`)
    }
    const r = spawnSync(comando, { shell: true, encoding: 'utf8', cwd: caminhos().raiz, timeout: 120_000 })
    if (r.error && (r.error as { code?: string }).code === 'ETIMEDOUT') {
      throw new Error(`Comando do gate "${gate}" excedeu o timeout de 120s: ${comando}`)
    }
    comandoExecutado = comando
    codigoSaida = r.status
    saidaBruta = `${r.stdout ?? ''}${r.stderr ?? ''}`
  }

  const saida = recortar(saidaBruta.trim())

  // Registrar o vermelho antes de implementar. Se sair verde aqui, o teste passa sem o codigo:
  // ele nao testa o que promete, e isso e' pior que nao existir.
  if (flags['esperando-vermelho']) {
    if (codigoSaida === 0) {
      throw new Error(
        `Esperava vermelho e saiu verde. O teste passa sem o codigo, entao nao testa o que promete. Comando: ${comandoExecutado}`,
      )
    }
    const anterior = tarefa.gates[gate]
    tarefa.gates[gate] = {
      rotulo: 'FALHOU', vermelho_em: agora().log, comando: comandoExecutado, codigo_saida: codigoSaida, saida,
      executado_em: agora().log, evidencia_url: anterior?.evidencia_url ?? null,
      motivo: null, ressalva: null,
    }
    escreverJson(caminho, tarefa)
    console.log(`${id} · ${gate}: vermelho registrado (saida ${codigoSaida}). Agora implemente ate o verde.`)
    return
  }

  if (flags['vermelho-dispensado'] && codigoSaida !== 0) {
    throw new Error(
      `Comando do gate falhou (saida ${codigoSaida}). A dispensa de vermelho exige que o teste passe verde (APROVADO). Se o teste falhou, voce tem um vermelho real — use --esperando-vermelho.`,
    )
  }

  let rotulo: Rotulo = codigoSaida === 0 ? 'APROVADO' : 'FALHOU'
  let motivo: string | null = null
  if (codigoSaida === 0 && (!saida || !saida.trim())) {
    rotulo = 'INVÁLIDO como gate'
    motivo = 'Saída vazia: o comando não produziu evidência verificável'
  }
  const anterior = tarefa.gates[gate]
  const disp = flags['vermelho-dispensado']
    ? { dispensado_em: agora().log, motivo: (flags.motivo ?? '').trim() }
    : (anterior?.vermelho_dispensado ?? null)

  tarefa.gates[gate] = {
    rotulo, vermelho_em: anterior?.vermelho_em ?? null,
    comando: comandoExecutado, codigo_saida: codigoSaida, saida: saida || null,
    executado_em: agora().log, evidencia_url: flags.url ?? null,
    motivo, ressalva: flags.ressalva ?? null,
    vermelho_dispensado: disp,
  }
  if (flags.ressalva && rotulo === 'APROVADO') tarefa.gates[gate]!.rotulo = 'APROVADO com ressalva'
  escreverJson(caminho, tarefa)
  console.log(`${id} · ${gate}: ${tarefa.gates[gate]!.rotulo} (saida ${codigoSaida})`)
}

// ---------------------------------------------------------------- finalizar

function marcadoresEm(valor: unknown, onde: string, achados: string[]): void {
  if (typeof valor === 'string') { if (valor.includes(MARCADOR)) achados.push(onde); return }
  if (Array.isArray(valor)) { valor.forEach((v, i) => marcadoresEm(v, `${onde}[${i}]`, achados)); return }
  if (valor && typeof valor === 'object') {
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) marcadoresEm(v, `${onde}.${k}`, achados)
  }
}

export function finalizar(id: string, flags: Flags = {}): void {
  const c = caminhos()
  const { caminho, tarefa } = localizar(id)
  const ctx = carregarContexto()
  const impedimentos: string[] = []

  if (tarefa.estado !== 'em-execucao') impedimentos.push(`estado e "${tarefa.estado}", nao "em-execucao"`)

  const marcadores: string[] = []
  marcadoresEm(tarefa.plano, 'plano', marcadores)
  if (marcadores.length) impedimentos.push(`marcador ${MARCADOR} nao preenchido em ${marcadores.join(', ')}`)

  // Validação manual: atalho direto na finalização
  if (flags['validado-por-humano']) {
    tarefa.validacao = 'aprovado'
    tarefa.validado_em = agora().log
    tarefa.validacao_motivo = flags['validado-por-humano']
    tarefa.gates['validacao_manual'] = {
      rotulo: 'APROVADO', comando: null, codigo_saida: 0,
      saida: flags['validado-por-humano'], executado_em: tarefa.validado_em,
      evidencia_url: null, motivo: null, ressalva: null, vermelho_em: null,
    }
  } else if (flags['validacao-dispensada']) {
    tarefa.validacao = 'dispensado'
    tarefa.validado_em = agora().log
    tarefa.validacao_motivo = flags.motivo ?? 'dispensada na finalizacao'
    tarefa.gates['validacao_manual'] = {
      rotulo: 'não se aplica', comando: null, codigo_saida: null,
      saida: null, executado_em: tarefa.validado_em,
      evidencia_url: null, motivo: tarefa.validacao_motivo, ressalva: null, vermelho_em: null,
    }
  }

  // Se o projeto declara validação manual ativa, tarefa que não requer vira pendente
  const validacaoManual = ctx.gates['validacao_manual'] as { existe?: boolean } | undefined
  if (validacaoManual?.existe === true && tarefa.validacao === 'nao_requer') {
    tarefa.validacao = 'pendente'
  }

  // Trava de validação manual
  if (tarefa.validacao === 'pendente') {
    impedimentos.push(
      `validacao manual pendente. A conclusao exige aprovacao humana. Execute o teste manual com o usuario e registre: mentor task validar ${id} --aprovado --evidencia "..." (ou use: mentor task finalizar ${id} --validado-por-humano "...")`,
    )
  }

  const gManual = tarefa.gates['validacao_manual']
  if (gManual && (gManual.rotulo === 'NÃO EXECUTADO' || gManual.rotulo === 'BLOQUEADO') && !gManual.motivo) {
    impedimentos.push('gate "validacao_manual" pendente sem aprovacao humana ou motivo de dispensa')
  }

  // Todo criterio de aceite nomeia um teste. Vale em qualquer metodo, ate' em `teste-depois`.
  if (tarefa.tipo !== 'SPIKE') {
    tarefa.plano.criterios_aceite.forEach((cr, i) => {
      if (!cr.teste || !cr.teste.trim()) {
        impedimentos.push(`criterio[${i}] sem teste nomeado. Saida honesta: "nao se aplica: <motivo>"`)
      }
    })
  }

  // Com metodo tdd ou bdd, o gate de testes precisa ter sido visto vermelho antes do verde.
  const metodo = (ctx['qualidade'] as { metodo_de_teste?: MetodoDeTeste } | undefined)?.metodo_de_teste
  if (metodo && METODOS_COM_VERMELHO.includes(metodo) && tarefa.tipo !== 'SPIKE') {
    const gateTestes = tarefa.gates['testes']
    const foiDispensado = Boolean(
      gateTestes?.vermelho_dispensado?.dispensado_em ||
      (gateTestes as any)?.vermelho_dispensado_em,
    )
    if (ctx.gates['testes']?.comando && gateTestes && !gateTestes.vermelho_em && !foiDispensado) {
      impedimentos.push(
        `metodo "${metodo}" exige o gate "testes" visto vermelho antes do verde (ou dispensado com: task gate ${id} testes --vermelho-dispensado --motivo "<mutacao>"). Registre com: task gate ${id} testes --esperando-vermelho`,
      )
    }
  }

  // Achado nao sobrevive ao fechamento: ou tem destino, ou o fechamento para.
  tarefa.achados.forEach((a, i) => {
    if (!DESTINOS_DE_ACHADO.includes(a.destino)) {
      impedimentos.push(`achado[${i}] com destino invalido "${a.destino}". Aceitos: ${DESTINOS_DE_ACHADO.join(' | ')}`)
    }
    if (!a.ref || !a.ref.trim()) {
      impedimentos.push(`achado[${i}] sem "ref": o ID criado, ou o motivo do descarte`)
    }
  })

  const narrativa = narrativaDe(caminho)
  if (!existe(narrativa)) impedimentos.push('narrativa ausente')
  else if (lerTexto(narrativa).includes(MARCADOR)) impedimentos.push(`marcador ${MARCADOR} nao preenchido na narrativa`)

  for (const [nome, decl] of Object.entries(ctx.gates)) {
    if (!decl?.comando) continue
    const reg = tarefa.gates[nome]
    if (!reg) { impedimentos.push(`gate "${nome}" declarado pelo projeto e ausente do registro`); continue }
    if (ROTULOS_QUE_NAO_FECHAM.includes(reg.rotulo)) impedimentos.push(`gate "${nome}" esta ${reg.rotulo} e nao sustenta conclusao`)
    if (ROTULOS_QUE_EXIGEM_MOTIVO.includes(reg.rotulo) && !reg.motivo) impedimentos.push(`gate "${nome}" esta ${reg.rotulo} sem motivo`)
  }

  // Disciplina de escopo Git vs plano.muda (AUD-001-B05: previne arquivos fantasmas)
  if (tarefa.commit_base) {
    const rDiff = spawnSync('git', ['diff', '--name-only', tarefa.commit_base, '--relative'], {
      cwd: caminhos().raiz,
      encoding: 'utf8',
    })
    const rUntracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], {
      cwd: caminhos().raiz,
      encoding: 'utf8',
    })
    const diffFiles = rDiff.status === 0 && rDiff.stdout ? rDiff.stdout.split('\n') : []
    const untrackedFiles = rUntracked.status === 0 && rUntracked.stdout ? rUntracked.stdout.split('\n') : []
    const arquivosModificados = [...diffFiles, ...untrackedFiles].map((s) => s.trim().replace(/\\/g, '/')).filter(Boolean)
    const declarados = new Set<string>()
    for (const linha of tarefa.plano.muda) {
      const arq = linha.split(/[\s:—-]/)[0]?.trim().replace(/\\/g, '/')
      if (arq && !arq.startsWith(MARCADOR)) declarados.add(arq)
    }
    const ignorados = [
      `${NOME_DOS_DOCUMENTOS}/`,
      'docs/',
      'docs-mentor/',
      'package-lock.json',
    ]
    const naoDeclarados = arquivosModificados.filter((arq) => {
      if (ignorados.some((ig) => arq.startsWith(ig) || arq === ig)) return false
      return ![...declarados].some((d) => arq === d || arq.endsWith(d) || d.endsWith(arq))
    })
    if (naoDeclarados.length > 0) {
      impedimentos.push(
        `${naoDeclarados.length} arquivo(s) de codigo modificado(s) no Git fora do plano.muda: ${naoDeclarados.slice(0, 5).join(', ')}. Declare-os no plano antes de fechar a tarefa para manter o escopo rastreado (AUD-001-B05).`,
      )
    }
  }

  if (impedimentos.length) {
    registrarRecusa('task finalizar', id, impedimentos)
    console.error(`Nao da para fechar ${id}:`)
    for (const i of impedimentos) console.error(`  - ${i}`)
    process.exitCode = 1
    return
  }

  tarefa.estado = 'concluida'
  tarefa.concluida_em = agora().log

  const base = `${agora().nome}--${tarefa.id}`
  tarefa.narrativa = `${base}.md`
  escreverJson(`${c.concluidas}/${base}.json`, tarefa)
  renameSync(narrativa, `${c.concluidas}/${base}.md`)
  rmSync(caminho)

  // O vinculo requisito <-> tarefa e gravado aqui, nunca pela IA.
  if (tarefa.requisitos.length) {
    const reqs = carregarRequisitos()
    for (const r of reqs as Requisito[]) {
      if (!tarefa.requisitos.includes(r.id)) continue
      if (!r.tarefas.includes(tarefa.id)) r.tarefas.push(tarefa.id)
      if (tarefa.tipo === 'RF' || tarefa.tipo === 'RN' || tarefa.tipo === 'RNF') {
        r.status = 'implementado'
        r.implementado_em = tarefa.concluida_em
      }
    }
    escreverJson(c.requisitos, reqs)
  }

  const ctxAtualizado = regenerarTudoEDevolverContexto()
  console.log(`${id} concluida.`)

  // A cadencia da auditoria e' contada aqui porque e' aqui que o numero muda.
  const feitas = Number(ctxAtualizado.contagens.tarefas_concluidas ?? 0)
  const desde = feitas - (ctxAtualizado.auditoria.ultima_na_tarefa ?? 0)
  const cadenciaTarefas = ctxAtualizado.auditoria.cadencia_em_tarefas ?? 10
  const cadenciaChars = ctxAtualizado.auditoria.cadencia_em_caracteres ?? 80_000
  const lote = loteNaoAuditado()
  const baseLote = baseDoLote(ctxAtualizado, lote)
  const diffChars = medirDiffAcumulado(baseLote)

  if (desde >= cadenciaTarefas || (cadenciaChars > 0 && diffChars >= cadenciaChars)) {
    console.log(`\n>>> Cadencia de auditoria atingida: ${desde} tarefas concluidas sem auditoria (${diffChars} caracteres de diff acumulados, limite ${cadenciaChars}). Rode: node mentor.mjs auditar preparar`)
    console.log('    O dossie vai para uma sessao NOVA de IA. Quem escreve nao aprova.')
  }
}

function regenerarTudoEDevolverContexto() {
  regenerarTudo()
  return carregarContexto()
}

// ---------------------------------------------------------------- fila

/** O humano diz "esta e a proxima"; o script grava. Soltar devolve a' ordem calculada. */
export function fila(id: string, posicao: number, liberar: boolean): void {
  const c = caminhos()
  for (const t of liberar ? soltar(id) : fixar(id, posicao)) {
    escreverJson(`${c.abertas}/${t.id}.json`, t)
  }
  regenerarTudo()
  console.log(liberar ? `${id} solta: volta a' ordem calculada.` : `${id} fixada na posicao ${posicao}.`)
}

// ---------------------------------------------------------------- validacao manual

/**
 * O que so' uma pessoa consegue conferir. No antecessor isso vivia como "smoke pendente" escrito
 * em prosa, espalhado, e por isso se perdia: aqui e' estado, e o doctor conta.
 */
export function validar(id: string, flags: Flags): void {
  const { caminho, tarefa } = localizar(id)
  if (flags.aprovado) {
    tarefa.validacao = 'aprovado'
    tarefa.validacao_motivo = flags.evidencia ?? flags.motivo ?? null
    tarefa.validado_em = agora().log
    tarefa.gates['validacao_manual'] = {
      rotulo: 'APROVADO',
      comando: null,
      codigo_saida: 0,
      saida: tarefa.validacao_motivo ?? 'Validado e aprovado pelo humano.',
      executado_em: tarefa.validado_em,
      evidencia_url: flags.url ?? null,
      motivo: null,
      ressalva: null,
      vermelho_em: null,
    }
  } else if (flags.dispensado) {
    if (!flags.motivo) throw new Error('Dispensar validacao exige --motivo.')
    tarefa.validacao = 'dispensado'
    tarefa.validacao_motivo = flags.motivo
    tarefa.validado_em = agora().log
    tarefa.gates['validacao_manual'] = {
      rotulo: 'não se aplica',
      comando: null,
      codigo_saida: null,
      saida: null,
      executado_em: tarefa.validado_em,
      evidencia_url: null,
      motivo: flags.motivo,
      ressalva: null,
      vermelho_em: null,
    }
  } else {
    throw new Error('Use --aprovado [--evidencia "..."] ou --dispensado --motivo "...".')
  }
  escreverJson(caminho, tarefa)
  regenerarTudo()
  console.log(`${id} · validacao ${tarefa.validacao}.`)
}
