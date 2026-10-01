import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { agora, caminhos, lerJson, lerTexto } from './arquivos.ts'
import { calcularFingerprintDosInsumos, chaveDeCacheDoGate } from './fingerprint.ts'
import { carregarContexto, regenerarTudo } from './vistas.ts'
import {
  ROTULOS, ROTULOS_DE_EXECUCAO, ROTULOS_QUE_EXIGEM_MOTIVO,
} from './tipos.ts'
import type { Rotulo, Tarefa } from './tipos.ts'

export interface ResultadoExecucaoGate {
  versao_executor: '1.0'
  gate: string
  comando: string
  codigo_saida: number | null
  rotulo: Rotulo
  executado_em: string
  inicio_em: string
  fim_em: string
  duracao_ms: number
  log_ref: string | null
  resumo: string | null
  motivo: string | null
  ressalva: string | null
  arvore_hash: string | null
  commit_execucao: string | null
  arvore_sem_documentos: boolean
}

/**
 * O log bruto de cada execucao fica so' na maquina: a tarefa ja' grava comando, codigo de saida e o
 * resumo. Sem o `.gitignore` proprio, a pasta entrava no git de quem nao ignorava `logs` por acaso, e
 * cada gate virava arquivo no diff da auditoria.
 */
function pastaDeLogs(): string {
  const c = caminhos()
  const pasta = join(c.docs, '.evidencias', 'logs')
  mkdirSync(pasta, { recursive: true })
  const ignorar = join(pasta, '.gitignore')
  if (!existsSync(ignorar)) writeFileSync(ignorar, '*\n', 'utf8')
  return pasta
}

function cabecaDoGit(): string | null {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: caminhos().raiz, encoding: 'utf8' })
  return r.status === 0 ? (r.stdout ?? '').trim() || null : null
}

function recortarResumo(texto: string, maxLinhas = 10): string {
  const linhas = texto.trim().split('\n')
  if (linhas.length <= maxLinhas) return linhas.join('\n')
  return [
    ...linhas.slice(0, 3),
    `... [${linhas.length - 6} linhas omitidas] ...`,
    ...linhas.slice(-3),
  ].join('\n')
}

export function executarComandoGate(options: {
  nome: string
  comando: string
  idTarefa?: string
  esperandoVermelho?: boolean
  timeoutMs?: number
  arquivoEvidencia?: string
  codigoSaidaForcado?: number
}): ResultadoExecucaoGate {
  const inicio = new Date()
  const c = caminhos()
  const timeoutMs = Number(process.env.MENTOR_GATE_TIMEOUT_MS) || (options.timeoutMs ?? 300_000)

  let saidaBruta = ''
  let codigoSaida: number | null = null
  let comandoExecutado = options.comando
  let motivo: string | null = null

  if (options.arquivoEvidencia) {
    if (!existsSync(options.arquivoEvidencia)) {
      throw new Error(`Arquivo de evidencia nao encontrado: "${options.arquivoEvidencia}".`)
    }
    saidaBruta = lerTexto(options.arquivoEvidencia)
    comandoExecutado = `arquivo:${options.arquivoEvidencia}`
    codigoSaida = options.codigoSaidaForcado ?? 0
  } else {
    try {
      const r = spawnSync(options.comando, {
        shell: true,
        encoding: 'utf8',
        cwd: c.raiz,
        timeout: timeoutMs,
      })
      if (r.error && (r.error as { code?: string }).code === 'ETIMEDOUT') {
        motivo = `Comando excedeu o timeout de ${Math.round(timeoutMs / 1000)}s`
        codigoSaida = 124
      } else {
        codigoSaida = r.status
      }
      saidaBruta = `${r.stdout ?? ''}${r.stderr ?? ''}`
    } catch (e: any) {
      motivo = `Falha ao iniciar processo: ${e.message}`
      codigoSaida = 1
    }
  }

  const fim = new Date()
  const duracaoMs = fim.getTime() - inicio.getTime()

  // Grava log detalhado em pasta de evidencias
  const prefixoId = options.idTarefa ? `${options.idTarefa}-` : ''
  const nomeLog = `${prefixoId}${options.nome}-${Date.now()}.log`
  const caminhoAbsLog = join(pastaDeLogs(), nomeLog)
  writeFileSync(caminhoAbsLog, saidaBruta, 'utf8')
  const logRef = relative(c.raiz, caminhoAbsLog).replace(/\\/g, '/')
  const resumo = recortarResumo(saidaBruta)

  // Tratamento de esperado vermelho
  if (options.esperandoVermelho) {
    if (codigoSaida === 0) {
      return {
        versao_executor: '1.0',
        gate: options.nome,
        comando: comandoExecutado,
        codigo_saida: codigoSaida,
        rotulo: 'INVÁLIDO como gate',
        executado_em: agora().log,
        inicio_em: inicio.toISOString(),
        fim_em: fim.toISOString(),
        duracao_ms: duracaoMs,
        log_ref: logRef,
        resumo,
        motivo: 'Esperava vermelho e saiu verde: teste passa sem o codigo',
        ressalva: null,
        arvore_hash: calcularFingerprintDosInsumos()?.arvore_hash ?? null,
        commit_execucao: cabecaDoGit(),
        arvore_sem_documentos: true,
      }
    }
    return {
      versao_executor: '1.0',
      gate: options.nome,
      comando: comandoExecutado,
      codigo_saida: codigoSaida,
      rotulo: 'FALHOU',
      executado_em: agora().log,
      inicio_em: inicio.toISOString(),
      fim_em: fim.toISOString(),
      duracao_ms: duracaoMs,
      log_ref: logRef,
      resumo,
      motivo: 'Vermelho registrado antes da implementacao',
      ressalva: null,
      arvore_hash: calcularFingerprintDosInsumos()?.arvore_hash ?? null,
      commit_execucao: cabecaDoGit(),
      arvore_sem_documentos: true,
    }
  }

  // Tratamento de sucesso vs falha
  let rotulo: Rotulo = codigoSaida === 0 ? 'APROVADO' : 'FALHOU'

  // Silencio com saida 0 e' sucesso para quem e' silencioso por convencao (`tsc --noEmit`, eslint).
  // Nao e' para o arquivo de evidencia vazio: sem codigo de saida, nada nele prova que algo rodou.
  // Nem para o gate de testes: todo executor de testes diz quantos rodou, e o silencio e' o gate que
  // existe e nao checa nada. Runner calado de proposito precisa imprimir a propria evidencia.
  if (codigoSaida === 0 && !saidaBruta.trim() && (options.arquivoEvidencia || options.nome === 'testes')) {
    rotulo = 'INVÁLIDO como gate'
    motivo = 'Saída vazia: o comando não produziu evidência verificável'
  }

  // Regra de teste sem asserções/testes coletados (G02-3)
  if (codigoSaida === 0 && options.nome === 'testes') {
    const semTestesPadroes = [
      /no test files found/i,
      /no tests found/i,
      /\b0 passed\b.*\b0 failed\b.*\b0 total\b/i,
      /\b0 tests\b/i,
      /\bcollected 0 items\b/i,
    ]
    if (semTestesPadroes.some((p) => p.test(saidaBruta))) {
      rotulo = 'INVÁLIDO como gate'
      motivo = 'Nenhum teste foi executado ou coletado pelo runner'
    }
  }

  return {
    versao_executor: '1.0',
    gate: options.nome,
    comando: comandoExecutado,
    codigo_saida: codigoSaida,
    rotulo,
    executado_em: agora().log,
    inicio_em: inicio.toISOString(),
    fim_em: fim.toISOString(),
    duracao_ms: duracaoMs,
    log_ref: logRef,
    resumo,
    motivo,
    ressalva: null,
    arvore_hash: calcularFingerprintDosInsumos()?.arvore_hash ?? null,
    commit_execucao: cabecaDoGit(),
    arvore_sem_documentos: true,
  }
}

/**
 * Escrita atômica em arquivo de tarefa no mesmo volume para concorrência segura (G02-4).
 */
export function atualizarTarefaAtomicamente(id: string, mutador: (tarefa: Tarefa) => void): Tarefa {
  const c = caminhos()
  const camAbertas = join(c.abertas, `${id}.json`)
  const camConcluidas = join(c.concluidas, `${id}.json`)
  const caminhoReal = existsSync(camAbertas) ? camAbertas : (existsSync(camConcluidas) ? camConcluidas : null)

  if (!caminhoReal) throw new Error(`Tarefa ${id} nao encontrada.`)

  const tarefa = lerJson<Tarefa>(caminhoReal)
  mutador(tarefa)

  const temp = `${caminhoReal}.tmp-${process.pid}-${Date.now()}`
  writeFileSync(temp, JSON.stringify(tarefa, null, 2) + '\n', 'utf8')
  renameSync(temp, caminhoReal)
  return tarefa
}

export function executarGateDaTarefa(id: string, gate: string, flags: Record<string, string | undefined>): number {
  const ctx = carregarContexto()
  const declaracao = ctx.gates[gate]

  // Casos manuais/rotulo manual
  if (flags.rotulo) {
    const rotuloPedido = flags.rotulo as Rotulo
    if (!ROTULOS.includes(rotuloPedido)) throw new Error(`Rotulo fora do vocabulario: "${rotuloPedido}".`)
    if (ROTULOS_DE_EXECUCAO.includes(rotuloPedido)) {
      throw new Error(`"${rotuloPedido}" so nasce de comando executado. Rode sem --rotulo.`)
    }
    if (ROTULOS_QUE_EXIGEM_MOTIVO.includes(rotuloPedido) && !flags.motivo) {
      throw new Error(`"${rotuloPedido}" exige --motivo: por que o fechamento se sustenta sem ele.`)
    }
    atualizarTarefaAtomicamente(id, (t) => {
      t.gates[gate] = {
        rotulo: rotuloPedido,
        vermelho_em: t.gates[gate]?.vermelho_em ?? null,
        comando: null,
        codigo_saida: null,
        saida: null,
        executado_em: agora().log,
        evidencia_url: flags.url ?? null,
        motivo: flags.motivo ?? null,
        ressalva: null,
      }
    })
    regenerarTudo()
    console.log(`${id} · ${gate}: ${rotuloPedido}`)
    return 0
  }

  // Dispensa de vermelho justificada
  let dispensaPedida: { dispensado_em: string; motivo: string } | null = null
  if (flags['vermelho-dispensado']) {
    if (gate !== 'testes') throw new Error('Dispensa de vermelho so e valida para o gate "testes".')
    if (!flags.motivo || !flags.motivo.trim()) {
      throw new Error('--vermelho-dispensado exige --motivo com a evidencia de teste por mutacao.')
    }
    dispensaPedida = { dispensado_em: agora().log, motivo: flags.motivo.trim() }
  }
  // Gate ja' executado: a dispensa so' anota. Sem execucao anterior, ela cai na execucao abaixo, que
  // exige verde. Antes, anotar um gate inexistente nao gravava nada e ainda dizia que tinha gravado.
  if (dispensaPedida && !flags.arquivo && Boolean(flags['executar']) !== true) {
    let anotou = false
    atualizarTarefaAtomicamente(id, (t) => {
      const g = t.gates[gate]
      if (g) {
        g.vermelho_dispensado = dispensaPedida
        anotou = true
      }
    })
    if (anotou) {
      regenerarTudo()
      console.log(`${id} · ${gate}: vermelho dispensado com justificativa de mutacao.`)
      return 0
    }
  }

  const comando = declaracao?.comando
  if (!comando && !flags.arquivo) {
    console.error(`Gate "${gate}" nao possui comando declarado em docs-mentor/contexto.json.`)
    return 1
  }

  const c = caminhos()
  const comandoEfetivo = comando ?? (flags.arquivo ? `arquivo:${flags.arquivo}` : '')
  const forcar =
    flags.forcar === 'true' ||
    flags.forcar === '' ||
    Boolean(flags['sem-cache']) ||
    process.env.MENTOR_SEM_CACHE === '1' ||
    process.env.MENTOR_SEM_CACHE === 'true'
  const fpAntes = calcularFingerprintDosInsumos()

  // Reutilização de resultado conservadora (Etapa 03)
  if (!forcar && !dispensaPedida && fpAntes !== null && comandoEfetivo) {
    const chaveEsperada = chaveDeCacheDoGate({
      gate,
      comando: comandoEfetivo,
      arvoreHash: fpAntes.arvore_hash,
    })
    const camAbertas = join(c.abertas, `${id}.json`)
    const camConcluidas = join(c.concluidas, `${id}.json`)
    const camReal = existsSync(camAbertas) ? camAbertas : (existsSync(camConcluidas) ? camConcluidas : null)
    if (camReal) {
      try {
        const t = lerJson<Tarefa>(camReal)
        const gAnt = t.gates[gate]
        if (gAnt && gAnt.rotulo === 'APROVADO' && gAnt.chave_cache === chaveEsperada) {
          if (gAnt.log_ref && !existsSync(join(c.raiz, gAnt.log_ref))) {
            console.log(`! Cache descartado para gate "${gate}": artefato de log ausente (${gAnt.log_ref}).`)
          } else {
            console.log(`✓ [reutilizado] APROVADO: ${gate} (executado em ${gAnt.executado_em})`)
            return 0
          }
        }
      } catch {
        // continua para execucao
      }
    }
  } else if (!forcar && fpAntes === null) {
    console.log(`! Cache desabilitado: nao foi possivel calcular o fingerprint dos insumos.`)
  }

  const resultado = executarComandoGate({
    nome: gate,
    comando: comando ?? '',
    idTarefa: id,
    esperandoVermelho: Boolean(flags['esperando-vermelho']),
    arquivoEvidencia: flags.arquivo,
    codigoSaidaForcado: flags['codigo-saida'] !== undefined ? Number(flags['codigo-saida']) : undefined,
  })

  // Conferencia do fingerprint apos execucao
  const fpDepois = calcularFingerprintDosInsumos()
  let chaveCache: string | null = null

  if (fpAntes !== null && fpDepois !== null && fpAntes.arvore_hash === fpDepois.arvore_hash && comandoEfetivo) {
    if (resultado.rotulo === 'APROVADO') {
      chaveCache = chaveDeCacheDoGate({
        gate,
        comando: comandoEfetivo,
        arvoreHash: fpDepois.arvore_hash,
      })
    }
  } else if (fpAntes && fpDepois && fpAntes.arvore_hash !== fpDepois.arvore_hash) {
    resultado.motivo = (resultado.motivo ? `${resultado.motivo}; ` : '') + 'Insumos modificados durante a execucao: cache desabilitado'
  }

  atualizarTarefaAtomicamente(id, (t) => {
    const anterior = t.gates[gate]
    t.gates[gate] = {
      rotulo: resultado.rotulo,
      vermelho_em: optionsVermelho(anterior?.vermelho_em, resultado),
      comando: resultado.comando,
      codigo_saida: resultado.codigo_saida,
      saida: resultado.resumo,
      executado_em: resultado.executado_em,
      commit_execucao: resultado.commit_execucao,
      arvore_hash: fpDepois?.arvore_hash ?? resultado.arvore_hash,
      arvore_sem_documentos: resultado.arvore_sem_documentos,
      evidencia_url: anterior?.evidencia_url ?? flags.url ?? null,
      motivo: resultado.motivo,
      ressalva: flags.ressalva ?? null,
      log_ref: resultado.log_ref,
      chave_cache: chaveCache,
      digest_insumos: fpDepois?.digest ?? null,
      vermelho_dispensado: dispensaPedida && resultado.rotulo === 'APROVADO'
        ? dispensaPedida
        : (anterior?.vermelho_dispensado ?? null),
    }
  })

  regenerarTudo()
  if (dispensaPedida && resultado.rotulo !== 'APROVADO') {
    console.error(`Comando do gate saiu ${resultado.rotulo}. A dispensa de vermelho exige que o teste passe verde. Se o teste falhou, voce tem um vermelho real: use --esperando-vermelho.`)
  }

  const durSegundos = (resultado.duracao_ms / 1000).toFixed(1)
  const icone = resultado.rotulo === 'APROVADO' ? '✓' : '✗'
  const logMsg = resultado.log_ref ? ` (log: ${resultado.log_ref})` : ''
  const motivoMsg = resultado.motivo ? ` [${resultado.motivo}]` : ''
  // O codigo de saida vai na linha: e' dele que o rotulo sai, e quem le precisa ver a prova.
  const saidaMsg = resultado.codigo_saida !== null ? `saida ${resultado.codigo_saida}, ` : ''
  console.log(`${icone} ${resultado.rotulo}: ${gate} (${saidaMsg}${durSegundos}s)${motivoMsg}${logMsg}`)
  if (optionsVermelho(null, resultado)) {
    console.log(`${id} · ${gate}: vermelho registrado. Agora implemente ate o verde.`)
  }

  if (flags.detalhe && resultado.resumo) {
    console.log('\n--- Saida do gate ---')
    console.log(resultado.resumo)
    console.log('---------------------')
  }

  return resultado.rotulo === 'APROVADO' ? 0 : 1
}

function optionsVermelho(anterior: string | null | undefined, r: ResultadoExecucaoGate): string | null {
  if (r.rotulo === 'FALHOU' && r.motivo?.includes('Vermelho registrado')) return r.executado_em
  return anterior ?? null
}

export function executarGatesDaTarefa(id: string, flags: Record<string, string | undefined>): number {
  const ctx = carregarContexto()
  const declarados = Object.entries(ctx.gates).filter(([nome, g]) => g?.comando && nome !== 'validacao_manual')

  if (declarados.length === 0) {
    console.error('Nenhum gate automatico declarado em docs-mentor/contexto.json.')
    return 1
  }

  console.log(`Executando bateria de gates para tarefa ${id} (${declarados.length} gates declarados)...\n`)
  let falhou = false

  for (const [nome] of declarados) {
    const codigo = executarGateDaTarefa(id, nome, flags)
    if (codigo !== 0) {
      falhou = true
      console.error(`\nBateria interrompida na primeira falha: gate "${nome}" nao passou.`)
      break
    }
  }

  return falhou ? 1 : 0
}

export function executarGatesDoProjeto(flags: Record<string, string | undefined>): number {
  const ctx = carregarContexto()
  const declarados = Object.entries(ctx.gates).filter(([nome, g]) => g?.comando && nome !== 'validacao_manual')

  if (declarados.length === 0) {
    console.log('Nenhum gate declarado em docs-mentor/contexto.json.')
    return 0
  }

  let falhas = 0
  for (const [nome, g] of declarados) {
    const comando = g!.comando!
    const resultado = executarComandoGate({
      nome,
      comando,
    })
    const durSegundos = (resultado.duracao_ms / 1000).toFixed(1)
    const icone = resultado.rotulo === 'APROVADO' ? '✓' : '✗'
    const motivoMsg = resultado.motivo ? ` [${resultado.motivo}]` : ''
    console.log(`${icone} ${resultado.rotulo}: ${nome} (${durSegundos}s)${motivoMsg}`)

    if (resultado.rotulo !== 'APROVADO') {
      falhas++
      if (!flags.continuar) {
        console.error(`\nInterrompido no primeiro gate reprovado: ${nome}`)
        console.log(`\n${falhas} gate(s) reprovado(s).`)
        return 1
      }
    }
  }

  console.log(falhas === 0 ? '\nTodos os gates verdes.' : `\n${falhas} gate(s) reprovado(s).`)
  return falhas === 0 ? 0 : 1
}
