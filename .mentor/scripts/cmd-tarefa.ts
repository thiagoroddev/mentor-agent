import { spawnSync } from 'node:child_process'
import { copyFileSync, renameSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import {
  agora, caminhos, caminhoCorrespondeDeclaracao, extrairCaminhosDeclarados, escreverJson,
  escreverTexto, existe, lerJson, lerTexto, listar, NOME_DOS_DOCUMENTOS, relativo,
} from './arquivos.ts'
import { proximoIdDeTarefa } from './ids.ts'
import { carregarContexto, carregarRequisitos, carregarTarefas, fixar, regenerarTudo, registrarRecusa, soltar } from './vistas.ts'
import {
  DESTINOS_DE_ACHADO, ESCALA, MARCADOR, METODOS_COM_VERMELHO, ROTULOS, ROTULOS_DE_EXECUCAO,
  ROTULOS_QUE_EXIGEM_MOTIVO, ROTULOS_QUE_NAO_FECHAM, TIPOS_TAREFA,
} from './tipos.ts'
import type {
  Cerimonia, Escala, MetodoDeTeste, Requisito, Rotulo, Tarefa, TipoTarefa, Urgencia, ValorTarefa,
} from './tipos.ts'
import { estadoDaCadencia } from './cmd-auditar.ts'
import { arquivoIntactoDoPacote } from './cmd-pacote.ts'
import { categoriasSensiveis, MOTIVO_MINIMO_DE_DISPENSA } from './sensivel.ts'

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

/**
 * A arvore do codigo como esta' agora: os rastreados com as mudancas locais e os nao rastreados que o
 * `.gitignore` nao esconde, **sem a pasta de documentos do mentor**.
 *
 * ⚠️ Ate' a 0.7.0 era `git stash create`, que tem dois furos medidos em campo: inclui `docs-mentor/`,
 * e cada `task gate` grava o registro ali, entao dois gates seguidos nunca tinham o mesmo hash; e deixa
 * de fora o arquivo novo nao rastreado. O hash era gravado e nunca dava para conferir.
 *
 * Indice temporario copiado do real: o `git add` reaproveita o cache de stat em vez de reler o
 * repositorio inteiro, e o indice de verdade nao e' tocado. `null` sem git.
 */
export function hashDaArvoreAtual(): string | null {
  const c = caminhos()
  const git = (args: string[], env?: NodeJS.ProcessEnv) => spawnSync('git', args, { cwd: c.raiz, encoding: 'utf8', env })
  const onde = git(['rev-parse', '--git-path', 'index'])
  if (onde.status !== 0) return null
  const relativoAoIndice = (onde.stdout ?? '').trim()
  const indiceReal = isAbsolute(relativoAoIndice) ? relativoAoIndice : join(c.raiz, relativoAoIndice)
  const temporario = join(tmpdir(), `mentor-indice-${process.pid}-${Date.now()}`)
  try {
    if (existe(indiceReal)) copyFileSync(indiceReal, temporario)
    const env = { ...process.env, GIT_INDEX_FILE: temporario }
    if (git(['add', '-A', '--', '.'], env).status !== 0) return null
    git(['rm', '-r', '-q', '--cached', '--ignore-unmatch', '--', relativo(c.docs)], env)
    const arvore = git(['write-tree'], env)
    return arvore.status === 0 ? (arvore.stdout ?? '').trim() || null : null
  } finally {
    rmSync(temporario, { force: true })
  }
}

/** O que todo registro de execucao grava para provar em que codigo rodou. */
function rastroDaExecucao() {
  return { commit_execucao: cabecaDoGit(), arvore_hash: hashDaArvoreAtual(), arvore_sem_documentos: true }
}

/** Arquivos do projeto que diferem entre duas arvores. `null` se uma delas nao existe mais. */
function arquivosEntreArvores(antes: string, depois: string): string[] | null {
  const c = caminhos()
  const r = spawnSync('git', ['-c', 'core.quotepath=false', 'diff-tree', '-r', '--name-only', '--no-renames', antes, depois], { cwd: c.raiz, encoding: 'utf8' })
  if (r.status !== 0) return null
  // As arvores sao do repositorio inteiro; o projeto pode ser uma subpasta dele.
  const prefixo = (spawnSync('git', ['rev-parse', '--show-prefix'], { cwd: c.raiz, encoding: 'utf8' }).stdout ?? '').trim()
  return (r.stdout ?? '').split('\n').map((s) => s.trim()).filter((s) => s && s.startsWith(prefixo)).map((s) => s.slice(prefixo.length))
}

export { caminhoCorrespondeDeclaracao, extrairCaminhosDeclarados } from './arquivos.ts'

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

export function iniciar(id: string, flags: Flags = {}): void {
  const { caminho, tarefa } = localizar(id)
  if (tarefa.estado !== 'aberta') throw new Error(`${id} esta em "${tarefa.estado}", nao em "aberta".`)
  if (tarefa.fila !== 'ciclo') {
    throw new Error(`${id} esta na reserva. Puxe primeiro: mentor task puxar ${id}`)
  }
  // M6: Bloqueio por reincidência de spikes inconclusivos consecutivos
  if (tarefa.tipo === 'SPIKE') {
    const c = caminhos()
    const spikesConcluidos = carregarTarefas().filter((t) => t.tipo === 'SPIKE' && t.estado === 'concluida')
    if (spikesConcluidos.length >= 2) {
      const ultimos2 = spikesConcluidos.slice(-2)
      const inconclusivos = ultimos2.filter((s) => {
        const nar = s.narrativa ? join(c.concluidas, s.narrativa) : null
        const txt = nar && existe(nar) ? lerTexto(nar).toLowerCase() : ''
        return (
          txt.includes('inconclusivo') ||
          txt.includes('sem conclusao') ||
          s.achados.some((a) => a.descricao?.toLowerCase().includes('inconclusivo'))
        )
      })
      if (inconclusivos.length >= 2 && !flags['estrategia-revisada']) {
        throw new Error(
          'Reincidencia de spikes inconclusivos: os ultimos 2 spikes fecharam inconclusivos. Abra revisao de estrategia antes de abrir novo spike (ou use: mentor task iniciar ' +
            id +
            ' --estrategia-revisada).',
        )
      }
    }
  }

  // Trabalho parado pela metade e' o desperdicio mais invisivel, porque parece progresso (guia ES-50).
  const limite = carregarContexto().limites.em_execucao
  const emExecucao = carregarTarefas().filter((t) => t.estado === 'em-execucao')
  if (emExecucao.length >= limite) {
    throw new Error(
      `Ja ha ${emExecucao.length} tarefa(s) em execucao (limite ${limite}): ${emExecucao.map((t) => t.id).join(', ')}. Feche antes de abrir outra.`,
    )
  }
  const statusGit = spawnSync('git', ['status', '--porcelain'], { cwd: caminhos().raiz, encoding: 'utf8' })
  if (statusGit.status === 0 && statusGit.stdout && statusGit.stdout.trim()) {
    console.warn('! Aviso: a arvore de trabalho possui alteracoes locais nao commitadas. Certifique-se de que correspondem a esta tarefa.')
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
  const ehGrande = tarefa.esforco.ia === 'G' || tarefa.esforco.ia === 'XG'
  const ehSpikeDeMedicao = ehSpike && /\b(melhor|ganh|otimiz|reduz|desempenho|latenci|taxa|bench|med)/i.test(tarefa.titulo)
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
    problema_canonico: `${MARCADOR} nome canonico na literatura (ex: TSP, CRDT), ou "sem nome canonico"`,
    discordancia: {
      o_que_faria_diferente: `${MARCADOR} o que eu faria diferente, ou "Nada a objetar"`,
      o_que_preocupa: `${MARCADOR} o que me preocupa neste plano, ou "Nada a objetar"`,
      o_que_existe_pronto_80_porcento: `${MARCADOR} ferramenta/lib consolidada que resolve 80%, ou "Nenhuma conhecida"`,
    },
    ...(ehSpikeDeMedicao
      ? {
          reguas_de_medicao: {
            piso: `${MARCADOR} baseline trivial a superar`,
            teto: `${MARCADOR} otimo calculado ou melhor ref externa`,
            padrao: `${MARCADOR} solucao consolidada da industria`,
          },
        }
      : {}),
    ...(ehGrande
      ? {
          estado_da_arte: {
            implementacoes_consolidadas: [`${MARCADOR} alternativa 1`, `${MARCADOR} alternativa 2`],
            motivo_descarte: `${MARCADOR} por que cada alternativa foi descartada`,
            o_que_resta_construir: `${MARCADOR} o que ainda precisa ser feito mesmo adotando a solucao`,
          },
          custo_de_oportunidade: {
            o_que_existe_pronto: `${MARCADOR} o que existe pronto no mercado`,
            custo_estimado: `${MARCADOR} custo em dinheiro ou licenca`,
            dependencias_ou_infra: `${MARCADOR} backend ou dependencias necessarias`,
            tempo_substituido: `${MARCADOR} semanas de desenvolvimento substituidas`,
          },
        }
      : {}),
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

// ---------------------------------------------------------------- pausar

export function pausar(id: string, flags: Flags = {}): void {
  const { caminho, tarefa } = localizar(id)
  if (tarefa.estado !== 'em-execucao') {
    throw new Error(`${id} esta em "${tarefa.estado}", nao em "em-execucao". So e possivel pausar tarefa em execucao.`)
  }
  const motivo = flags.motivo?.trim()
  if (!motivo) {
    throw new Error(`Falta --motivo. Informe por que a tarefa esta sendo pausada (ex: mentor task pausar ${id} --motivo "aguardando ajuste de UI e correcao de bug").`)
  }

  const c = caminhos()
  // Inspeciona se o Git possui arquivos modificados ou untracked
  const rStatus = spawnSync('git', ['status', '--porcelain'], { cwd: c.raiz, encoding: 'utf8' })
  const temAlteracoes = rStatus.status === 0 && Boolean(rStatus.stdout?.trim())

  if (temAlteracoes) {
    if (flags.commit !== undefined) {
      // Auto-commit das alterações em WIP
      const msg = `wip(${id}): pausada - ${motivo}`
      const add = spawnSync('git', ['add', '-A'], { cwd: c.raiz, encoding: 'utf8' })
      if (add.status !== 0) throw new Error(`Falha ao adicionar arquivos no Git: ${add.stderr}`)
      const com = spawnSync('git', ['commit', '-m', msg], { cwd: c.raiz, encoding: 'utf8' })
      if (com.status !== 0) throw new Error(`Falha ao commitar no Git: ${com.stderr}`)
      console.log(`Commit de pausa realizado: ${msg}`)
    } else {
      throw new Error(
        `Existem alteracoes nao commitadas no Git. Para pausar sem contaminar a proxima tarefa, commite as alteracoes atuais (ex: git commit -m "wip(${id}): pausada - ${motivo}") ou passe a flag --commit para commitar automaticamente.`,
      )
    }
  }

  const commitPausa = cabecaDoGit()
  const agoraPausa = agora().log
  const bloqueadaPor = (flags['bloqueada-por'] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (!tarefa.pausas) tarefa.pausas = []
  tarefa.pausas.push({
    pausada_em: agoraPausa,
    retomada_em: null,
    motivo,
    bloqueada_por: bloqueadaPor,
    commit_pausa: commitPausa,
    commit_retomada: null,
  })

  tarefa.estado = 'pausada'
  tarefa.pausada_em = agoraPausa
  tarefa.pausa_motivo = motivo
  tarefa.bloqueada_por = bloqueadaPor

  escreverJson(caminho, tarefa)
  regenerarTudo()
  console.log(
    `Tarefa ${id} pausada com sucesso.${bloqueadaPor.length ? ` Bloqueada por: ${bloqueadaPor.join(', ')}.` : ''} Slot de execucao liberado.`,
  )
  // Pausa so' no disco se perde com o disco. O push continua sendo ato do humano (portao 3).
  console.log(`Para guardar fora do disco (envio para wip/ nao passa por gates nem checagem de ID): git push -u origin HEAD:wip/${id.toLowerCase()}`)
}

// ---------------------------------------------------------------- retomar

/** O ramo principal (remoto, pelo ultimo fetch, ou local) com commits que o ramo atual nao tem. */
function principalAFrente(): { ref: string; commits: number } | null {
  const c = caminhos()
  const git = (args: string[]) => spawnSync('git', args, { cwd: c.raiz, encoding: 'utf8' })
  const principal = (carregarContexto()['versionamento'] as { ramo_principal?: string | null } | undefined)?.ramo_principal ?? 'main'
  if ((git(['branch', '--show-current']).stdout ?? '').trim() === principal) return null
  for (const ref of [`origin/${principal}`, principal]) {
    if (git(['rev-parse', '--verify', '--quiet', ref]).status !== 0) continue
    const contagem = Number((git(['rev-list', '--count', `HEAD..${ref}`]).stdout ?? '').trim())
    if (contagem > 0) return { ref, commits: contagem }
  }
  return null
}

export function retomar(id: string, flags: Flags = {}): void {
  const { caminho, tarefa } = localizar(id)
  if (tarefa.estado !== 'pausada') {
    throw new Error(`${id} esta em "${tarefa.estado}", nao em "pausada".`)
  }

  const limite = carregarContexto().limites.em_execucao
  const emExecucao = carregarTarefas().filter((t) => t.estado === 'em-execucao')
  if (emExecucao.length >= limite) {
    throw new Error(
      `Ja ha ${emExecucao.length} tarefa(s) em execucao (limite ${limite}): ${emExecucao.map((t) => t.id).join(', ')}. Feche ou pause a tarefa ativa antes de retomar ${id}.`,
    )
  }

  // Se houver tarefas declaradas em bloqueada_por, verifica se já foram concluídas ou canceladas
  if (tarefa.bloqueada_por && tarefa.bloqueada_por.length > 0) {
    const todas = carregarTarefas()
    const pendentes = tarefa.bloqueada_por.filter((bid) => {
      const b = todas.find((t) => t.id === bid)
      return !b || (b.estado !== 'concluida' && b.estado !== 'cancelada')
    })
    if (pendentes.length > 0 && !flags.forcar) {
      throw new Error(
        `Tarefa(s) bloqueadora(s) ainda nao concluida(s): ${pendentes.join(', ')}. Conclua-as antes de retomar ${id} (ou use --forcar).`,
      )
    }
  }

  // O retomar grava o commit de volta, e o `finalizar` mede o escopo a partir dele. Merge do ramo
  // principal DEPOIS daqui faz tudo o que veio dele parecer mudanca da tarefa, e a trava de escopo
  // recusa por arquivos que a tarefa nunca tocou. Por isso o merge vem antes. Rebase, nunca: troca o
  // `commit_pausa` gravado e exige push forcado do ramo WIP.
  if (!flags['sem-merge']) {
    const atraso = principalAFrente()
    if (atraso) {
      throw new Error(
        `${atraso.ref} tem ${atraso.commits} commit(s) que este ramo nao tem. Faca o merge antes de retomar: git merge ${atraso.ref}\n` +
        'O retomar grava o commit de volta, e o finalizar mede o escopo a partir dele: merge depois faz o que veio do ramo principal parecer mudanca da tarefa. ' +
        'Merge, nunca rebase: o rebase troca o commit_pausa gravado. Para retomar sem trazer o ramo principal: --sem-merge',
      )
    }
  }

  const agoraRetomada = agora().log
  const commitRetomada = cabecaDoGit()

  if (tarefa.pausas && tarefa.pausas.length > 0) {
    const ultima = tarefa.pausas[tarefa.pausas.length - 1]
    if (ultima) {
      ultima.retomada_em = agoraRetomada
      ultima.commit_retomada = commitRetomada
    }
  }

  tarefa.estado = 'em-execucao'
  escreverJson(caminho, tarefa)
  regenerarTudo()
  console.log(`Tarefa ${id} retomada em execucao.`)
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
      executado_em: agora().log, ...rastroDaExecucao(),
      evidencia_url: anterior?.evidencia_url ?? null,
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
    executado_em: agora().log, ...rastroDaExecucao(),
    evidencia_url: flags.url ?? null,
    motivo, ressalva: flags.ressalva ?? null,
    vermelho_dispensado: disp,
  }
  if (flags.ressalva && rotulo === 'APROVADO') tarefa.gates[gate]!.rotulo = 'APROVADO com ressalva'
  escreverJson(caminho, tarefa)
  console.log(`${id} · ${gate}: ${tarefa.gates[gate]!.rotulo} (saida ${codigoSaida})`)
}

// ---------------------------------------------------------------- finalizar

/** Tarefa sensivel (`sensivel.ts`) so' dispensa validacao com motivo que se sustente sozinho. */
function exigirMotivoDeDispensa(tarefa: Tarefa, motivo: string): void {
  const categorias = categoriasSensiveis(tarefa)
  if (categorias.length && motivo.length < MOTIVO_MINIMO_DE_DISPENSA) {
    throw new Error(
      `Dispensar validacao em tarefa sensivel (${categorias.join(', ')}) exige --motivo detalhado (minimo ${MOTIVO_MINIMO_DE_DISPENSA} caracteres) justificando a dispensa.`,
    )
  }
}

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

  const ehSpike = tarefa.tipo === 'SPIKE'
  const temCriterioDeMedicao = tarefa.plano.criterios_aceite.some((c) =>
    /\b(melhor|ganh|otimiz|reduz|desempenho|latenci|taxa|bench|med)/i.test(c.texto || ''),
  )

  const planoParaVerificar = { ...tarefa.plano }
  if (ehSpike && !temCriterioDeMedicao) {
    delete (planoParaVerificar as Record<string, unknown>).reguas_de_medicao
  }

  const marcadores: string[] = []
  marcadoresEm(planoParaVerificar, 'plano', marcadores)
  if (marcadores.length) impedimentos.push(`marcador ${MARCADOR} nao preenchido em ${marcadores.join(', ')}`)

  // Validação manual: atalho direto na finalização
  if (flags['validado-por-humano']) {
    const ev = flags['validado-por-humano'].trim()
    if (!ev || ev.length < 10) {
      throw new Error('--validado-por-humano exige evidencia conferivel detalhada (passos testados e resultado observado).')
    }
    tarefa.validacao = 'aprovado'
    tarefa.validado_em = agora().log
    tarefa.validacao_motivo = ev
    tarefa.gates['validacao_manual'] = {
      rotulo: 'APROVADO', comando: null, codigo_saida: null,
      saida: ev, executado_em: tarefa.validado_em,
      ...rastroDaExecucao(),
      evidencia_url: null, motivo: null, ressalva: null, vermelho_em: null,
    }
  } else if (flags['validacao-dispensada']) {
    const mot = (flags.motivo ?? 'dispensada na finalizacao').trim()
    exigirMotivoDeDispensa(tarefa, mot)
    tarefa.validacao = 'dispensado'
    tarefa.validado_em = agora().log
    tarefa.validacao_motivo = mot
    tarefa.gates['validacao_manual'] = {
      rotulo: 'não se aplica', comando: null, codigo_saida: null,
      saida: null, executado_em: tarefa.validado_em,
      ...rastroDaExecucao(),
      evidencia_url: null, motivo: mot, ressalva: null, vermelho_em: null,
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

  // M2: Problema canônico obrigatório no plano
  if (tarefa.plano.problema_canonico !== undefined) {
    if (!tarefa.plano.problema_canonico || !tarefa.plano.problema_canonico.trim()) {
      impedimentos.push('plano sem "problema_canonico": declare o nome canonico na literatura (ex: TSP, VRP, CRDT) ou "sem nome canonico"')
    }
  }

  // M7: Seção de discordância obrigatória no plano
  if (tarefa.plano.discordancia !== undefined) {
    const d = tarefa.plano.discordancia
    if (
      !d ||
      !d.o_que_faria_diferente || !d.o_que_faria_diferente.trim() ||
      !d.o_que_preocupa || !d.o_que_preocupa.trim() ||
      !d.o_que_existe_pronto_80_porcento || !d.o_que_existe_pronto_80_porcento.trim()
    ) {
      impedimentos.push(
        'plano sem secao "discordancia" completa (exige o_que_faria_diferente, o_que_preocupa e o_que_existe_pronto_80_porcento; "Nada a objetar" e valido)',
      )
    }
  }

  // M4: Três réguas para spike de medição
  if (ehSpike && temCriterioDeMedicao) {
    const r = tarefa.plano.reguas_de_medicao
    if (!r || !r.piso || !r.piso.trim() || !r.teto || !r.teto.trim() || !r.padrao || !r.padrao.trim()) {
      impedimentos.push('spike de medicao sem as tres reguas obrigatorias em reguas_de_medicao (piso, teto e padrao)')
    }
  }

  // M1 & M8: Estado da arte e custo de oportunidade em G/XG
  const ehGrande = tarefa.esforco.ia === 'G' || tarefa.esforco.ia === 'XG'
  if (ehGrande) {
    const eda = tarefa.plano.estado_da_arte
    if (
      !eda ||
      !Array.isArray(eda.implementacoes_consolidadas) ||
      eda.implementacoes_consolidadas.length === 0 ||
      !eda.motivo_descarte || !eda.motivo_descarte.trim() ||
      !eda.o_que_resta_construir || !eda.o_que_resta_construir.trim()
    ) {
      impedimentos.push(
        'tarefa com esforco IA G/XG exige secao "estado_da_arte" preenchida (implementacoes_consolidadas, motivo_descarte e o_que_resta_construir)',
      )
    }
    const co = tarefa.plano.custo_de_oportunidade
    if (
      !co ||
      !co.o_que_existe_pronto || !co.o_que_existe_pronto.trim() ||
      !co.custo_estimado || !co.custo_estimado.trim() ||
      !co.dependencias_ou_infra || !co.dependencias_ou_infra.trim() ||
      !co.tempo_substituido || !co.tempo_substituido.trim()
    ) {
      impedimentos.push('tarefa com esforco IA G/XG exige secao "custo_de_oportunidade" preenchida')
    }
  } else {
    if (tarefa.plano.estado_da_arte) {
      const eda = tarefa.plano.estado_da_arte
      if (
        !Array.isArray(eda.implementacoes_consolidadas) ||
        eda.implementacoes_consolidadas.length === 0 ||
        !eda.motivo_descarte?.trim() ||
        !eda.o_que_resta_construir?.trim()
      ) {
        impedimentos.push('secao "estado_da_arte" incompleta no plano')
      }
    }
    if (tarefa.plano.custo_de_oportunidade) {
      const co = tarefa.plano.custo_de_oportunidade
      if (
        !co.o_que_existe_pronto?.trim() ||
        !co.custo_estimado?.trim() ||
        !co.dependencias_ou_infra?.trim() ||
        !co.tempo_substituido?.trim()
      ) {
        impedimentos.push('secao "custo_de_oportunidade" incompleta no plano')
      }
    }
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
    const arquivosSet = new Set<string>()
    if (tarefa.pausas && tarefa.pausas.length > 0) {
      let pontoAnterior: string | null = tarefa.commit_base
      for (const p of tarefa.pausas) {
        if (pontoAnterior && p.commit_pausa && pontoAnterior !== p.commit_pausa) {
          const r = spawnSync('git', ['diff', '--name-only', pontoAnterior, p.commit_pausa, '--relative'], {
            cwd: caminhos().raiz,
            encoding: 'utf8',
          })
          if (r.status === 0 && r.stdout) {
            r.stdout.split('\n').forEach((f) => arquivosSet.add(f.trim().replace(/\\/g, '/')))
          }
        }
        pontoAnterior = p.commit_retomada
      }
      if (pontoAnterior) {
        const r = spawnSync('git', ['diff', '--name-only', pontoAnterior, '--relative'], {
          cwd: caminhos().raiz,
          encoding: 'utf8',
        })
        if (r.status === 0 && r.stdout) {
          r.stdout.split('\n').forEach((f) => arquivosSet.add(f.trim().replace(/\\/g, '/')))
        }
      }
    } else {
      const rDiff = spawnSync('git', ['diff', '--name-only', tarefa.commit_base, '--relative'], {
        cwd: caminhos().raiz,
        encoding: 'utf8',
      })
      if (rDiff.status === 0 && rDiff.stdout) {
        rDiff.stdout.split('\n').forEach((f) => arquivosSet.add(f.trim().replace(/\\/g, '/')))
      }
    }
    const rUntracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], {
      cwd: caminhos().raiz,
      encoding: 'utf8',
    })
    if (rUntracked.status === 0 && rUntracked.stdout) {
      rUntracked.stdout.split('\n').forEach((f) => arquivosSet.add(f.trim().replace(/\\/g, '/')))
    }
    const arquivosModificados = [...arquivosSet].filter(Boolean)
    const declarados = extrairCaminhosDeclarados(tarefa.plano.muda)
    const ignorados = [
      `${NOME_DOS_DOCUMENTOS}/`,
      'docs/',
      'docs-mentor/',
      'package-lock.json',
    ]
    const naoDeclarados = arquivosModificados.filter((arq) => {
      if (ignorados.some((ig) => arq.startsWith(ig) || arq === ig)) return false
      // Arquivo do pacote igual ao manifesto nao e' mudanca do projeto: a mesma regra do hook e da auditoria.
      if (arquivoIntactoDoPacote(arq)) return false
      return !caminhoCorrespondeDeclaracao(arq, declarados)
    })
    if (naoDeclarados.length > 0) {
      impedimentos.push(
        `${naoDeclarados.length} arquivo(s) de codigo modificado(s) no Git fora do plano.muda: ${naoDeclarados.slice(0, 5).join(', ')}. Declare-os no plano antes de fechar a tarefa para manter o escopo rastreado (AUD-001-B05).`,
      )
    }

    // Deteccao de tarefa retroativa (AUD-002-B02): a tarefa nao tocou nada do que declarou, e o commit
    // da base ja' tinha tocado. O diff ativo e' o mesmo da trava de escopo acima (arvore de trabalho,
    // nao rastreados, intervalos de pausa). Ate' a 0.7.0 era `commit_base..HEAD`, so' o commitado: como
    // o `finalizar` roda antes do commit, saia vazio em toda tarefa e acusava tarefa legitima.
    if (tarefa.commit_base && !flags['retroativa']) {
      if (declarados.length > 0) {
        const tocouDeclarados = arquivosModificados.some((a) => caminhoCorrespondeDeclaracao(a, declarados))
        if (!tocouDeclarados) {
          const rPrev = spawnSync('git', ['diff', '--name-only', `${tarefa.commit_base}~1..${tarefa.commit_base}`], {
            cwd: caminhos().raiz,
            encoding: 'utf8',
          })
          const arqsNoPrev = rPrev.status === 0 && rPrev.stdout
            ? rPrev.stdout.split('\n').map((x) => x.trim().replace(/\\/g, '/')).filter(Boolean)
            : []
          if (arqsNoPrev.some((a) => caminhoCorrespondeDeclaracao(a, declarados))) {
            impedimentos.push(
              `Tarefa retroativa detectada: os arquivos declarados em plano.muda ja foram commitados antes de commit_base (${tarefa.commit_base}) e o diff da tarefa esta vazio. Para registrar como retroativa intencional, finalize com: mentor task finalizar ${id} --retroativa`,
            )
          }
        }
      }
    }

    const headAtual = cabecaDoGit()
    for (const [nomeGate, g] of Object.entries(tarefa.gates)) {
      if (!g || g.rotulo !== 'APROVADO') continue
      if (nomeGate === 'testes' || nomeGate === 'build') {
        if (g.commit_execucao && headAtual && g.commit_execucao !== headAtual && !g.evidencia_url) {
          console.warn(
            `! Alerta: gate "${nomeGate}" rodou no commit ${g.commit_execucao}, diferente do HEAD atual (${headAtual}). Recomenda-se reexecutar o gate ou anexar o link do CI via "mentor task anexar ${id} --url ...".`,
          )
        }
      }
    }
  }

  // A evidencia de testes e build precisa ser da arvore que fecha. Recusa quando mudou arquivo
  // rastreado ou declarado depois do gate; artefato nao rastreado fora do plano so' avisa, porque
  // recusar por ele criaria o laco de rodar o gate, regenerar o artefato e recusar de novo.
  const gatesComArvore = (['testes', 'build'] as const)
    .map((nome) => [nome, tarefa.gates[nome]] as const)
    .filter(([, g]) => g?.arvore_sem_documentos && g.arvore_hash && !g.evidencia_url &&
      (g.rotulo === 'APROVADO' || g.rotulo === 'APROVADO com ressalva'))
  const arvoreAtual = gatesComArvore.length ? hashDaArvoreAtual() : null
  if (arvoreAtual) {
    const declarados = extrairCaminhosDeclarados(tarefa.plano.muda)
    const lsFiles = spawnSync('git', ['-c', 'core.quotepath=false', 'ls-files'], { cwd: caminhos().raiz, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    const rastreados = new Set((lsFiles.stdout ?? '').split('\n').map((s) => s.trim()).filter(Boolean))
    for (const [nome, g] of gatesComArvore) {
      if (!g?.arvore_hash || g.arvore_hash === arvoreAtual) continue
      const mudaram = arquivosEntreArvores(g.arvore_hash, arvoreAtual)
      if (mudaram === null) {
        console.warn(`! Aviso: nao consegui comparar a arvore do gate "${nome}" com a atual. Se o codigo mudou depois dele, rode de novo: mentor task gate ${id} ${nome}`)
        continue
      }
      const pesam = mudaram.filter((a) => rastreados.has(a) || caminhoCorrespondeDeclaracao(a, declarados))
      if (pesam.length) {
        impedimentos.push(
          `gate "${nome}" rodou antes de ${pesam.length} arquivo(s) mudar(em): ${pesam.slice(0, 5).join(', ')}. A evidencia e' de outra arvore. Rode de novo: mentor task gate ${id} ${nome}`,
        )
      } else if (mudaram.length) {
        console.warn(`! Aviso: depois do gate "${nome}" mudaram ${mudaram.length} arquivo(s) nao rastreado(s) e fora do plano: ${mudaram.slice(0, 3).join(', ')}. Se forem artefatos, ignore.`)
      }
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

  // A cadencia da auditoria e' conferida aqui porque e' aqui que o numero muda.
  const cadencia = estadoDaCadencia(ctxAtualizado)
  if (cadencia.estado !== 'em-dia') {
    console.log(`\n>>> Cadencia de auditoria atingida: ${cadencia.contam.length} tarefa(s) com codigo sem auditoria (cadencia ${cadencia.cadencia}). Rode: node mentor.mjs auditar preparar`)
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
    const ev = (flags.evidencia ?? flags.motivo ?? '').trim()
    if (!ev || ev.length < 10) {
      throw new Error('Validacao manual aprovada exige --evidencia substantiva (passos executados e resultado observado).')
    }
    tarefa.validacao = 'aprovado'
    tarefa.validacao_motivo = ev
    tarefa.validado_em = agora().log
    tarefa.gates['validacao_manual'] = {
      rotulo: 'APROVADO',
      comando: null,
      codigo_saida: null,
      saida: ev,
      executado_em: tarefa.validado_em,
      ...rastroDaExecucao(),
      evidencia_url: flags.url ?? null,
      motivo: null,
      ressalva: null,
      vermelho_em: null,
    }
  } else if (flags.dispensado) {
    const mot = (flags.motivo ?? '').trim()
    if (!mot) throw new Error('Dispensar validacao exige --motivo.')
    exigirMotivoDeDispensa(tarefa, mot)
    tarefa.validacao = 'dispensado'
    tarefa.validacao_motivo = mot
    tarefa.validado_em = agora().log
    tarefa.gates['validacao_manual'] = {
      rotulo: 'não se aplica',
      comando: null,
      codigo_saida: null,
      saida: null,
      executado_em: tarefa.validado_em,
      ...rastroDaExecucao(),
      evidencia_url: null,
      motivo: mot,
      ressalva: null,
      vermelho_em: null,
    }
  } else {
    throw new Error('Use --aprovado --evidencia "..." ou --dispensado --motivo "...".')
  }
  escreverJson(caminho, tarefa)
  regenerarTudo()
  console.log(`${id} · validacao ${tarefa.validacao}.`)
}

// ---------------------------------------------------------------- anexar evidencia externa

/**
 * Anexa link de execucao (ex: run do CI, PR de entrega) a um gate de uma tarefa,
 * mesmo que a tarefa ja esteja concluida (atendendo ao fluxo de entrega do entrega.md).
 */
export function anexar(id: string, flags: Flags): void {
  const url = exigir(flags, 'url')
  const gateNome = (flags.gate as string) || 'build'
  const { caminho, tarefa } = localizar(id)
  if (!tarefa.gates[gateNome]) {
    tarefa.gates[gateNome] = {
      rotulo: 'APROVADO',
      comando: null,
      codigo_saida: 0,
      saida: 'Evidencia anexada externamente.',
      executado_em: agora().log,
      ...rastroDaExecucao(),
      evidencia_url: url,
      motivo: null,
      ressalva: null,
      vermelho_em: null,
    }
  } else {
    tarefa.gates[gateNome]!.evidencia_url = url
    if (flags.rotulo && ROTULOS.includes(flags.rotulo as Rotulo)) {
      tarefa.gates[gateNome]!.rotulo = flags.rotulo as Rotulo
    }
  }
  escreverJson(caminho, tarefa)
  regenerarTudo()
  console.log(`${id} · evidencia anexada ao gate "${gateNome}": ${url}`)
}

// ---------------------------------------------------------------- criterio com comando

/**
 * Registra a evidencia de execucao de comando para um criterio de aceite do plano (AUD-002-B02).
 */
export function criterio(id: string, indiceStr: string, flags: Flags): void {
  const { caminho, tarefa } = localizar(id)
  const idx = parseInt(indiceStr, 10)
  if (isNaN(idx) || idx < 0 || idx >= tarefa.plano.criterios_aceite.length) {
    throw new Error(
      `Indice de criterio invalido: "${indiceStr}". A tarefa possui ${tarefa.plano.criterios_aceite.length} criterios (0 a ${tarefa.plano.criterios_aceite.length - 1}).`,
    )
  }
  let comando: string | null = null
  let saida: string | null = null
  let codigoSaida: number | null = null
  // `--cmd` e' o nome que a ajuda anunciou ate' a 0.7.0; os dois valem para nao quebrar quem seguiu a ajuda.
  const comandoPedido = flags.comando ?? flags.cmd
  if (comandoPedido) {
    comando = comandoPedido
    const r = spawnSync(comando, { shell: true, encoding: 'utf8', cwd: caminhos().raiz, timeout: 60_000 })
    codigoSaida = r.status
    saida = recortar(`${r.stdout ?? ''}${r.stderr ?? ''}`.trim())
  } else if (flags.saida) {
    saida = flags.saida.trim()
    codigoSaida = 0
  } else {
    throw new Error('mentor task criterio exige --comando "<cmd>" ou --saida "<texto>".')
  }
  tarefa.plano.criterios_aceite[idx]!.evidencia = {
    comando,
    codigo_saida: codigoSaida,
    saida,
    executado_em: agora().log,
  }
  escreverJson(caminho, tarefa)
  regenerarTudo()
  console.log(`${id} · criterio [${idx}] evidenciado com sucesso (codigo ${codigoSaida}).`)
}
