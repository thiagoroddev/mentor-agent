import { spawnSync } from 'node:child_process'
import { agora, caminhos, diasDesde, escreverJson, listar } from './arquivos.ts'
import { tetos } from './cmd-verificar.ts'
import { rascunhosParados } from './cmd-anotar.ts'
import { PONTOS_DE_ENTRADA, pontosDeEntradaSemNucleo } from './entrada.ts'
import { analisadoresSemIgnorar } from './instalar.mjs'
import {
  carregarContexto, carregarDividas, carregarInvariantes, carregarRequisitos, carregarRiscos, carregarTarefas,
  estadoDoPrazo, riscoVencido,
} from './vistas.ts'
import { CARACTERISTICAS } from './tipos.ts'
import type { Caracteristica, Contexto, EstadoDaCaracteristica, Fase, MetaDeQualidade, Tarefa } from './tipos.ts'

/**
 * Folha de saude do projeto. Tres propriedades a sustentam, e as tres foram medidas em campo:
 * e' **gerada**, nao lembrada; e' **comparavel no tempo**; e termina em **veredito binario**.
 * "Pronto para publico? NAO" e' acionavel; um checklist de 314 itens nao e'.
 *
 * Limite deliberado: o doctor so' verifica o que consegue medir **sem julgar**. Se precisa de
 * julgamento, nao e' doctor, e' revisao geral. Esse limite se aplica sozinho e nao envelhece.
 */

type Estado = 'ok' | 'atencao' | 'bloqueio' | 'neutro'
interface Linha { estado: Estado; texto: string }

const MARCA: Record<Estado, string> = { ok: '✓', atencao: '⚠', bloqueio: '✗', neutro: '·' }

const TODOS = [
  'V_negocio', 'C_obrigacoes', '0_rigor', 'P_problema', 'I_uso',
  'A_arquitetura', 'N_persistencia', 'S_ameacas', 'O_automacao',
]

/** Nao e' ordem de leitura: e' o que a fase atual **ja** exige. */
const PORTOES_POR_FASE: Record<Fase, string[]> = {
  ideia: ['V_negocio'],
  descoberta: ['V_negocio', 'C_obrigacoes', '0_rigor', 'P_problema'],
  construcao: ['V_negocio', 'C_obrigacoes', '0_rigor', 'P_problema', 'I_uso', 'A_arquitetura', 'N_persistencia'],
  'pre-lancamento': TODOS,
  producao: TODOS,
  manutencao: TODOS,
}

// ---------------------------------------------------------------- seguranca

function seguranca(ctx: Contexto): Linha[] {
  const riscos = carregarRiscos()
  const linhas: Linha[] = []
  const vencidos = riscos.filter((r) => riscoVencido(r))
  const ativos = riscos.filter((r) => estadoDoPrazo(r) === 'no_prazo')

  linhas.push(vencidos.length
    ? { estado: 'bloqueio', texto: `${vencidos.length} risco(s) aceito(s) VENCIDO(s): ${vencidos.map((r) => r.id).join(', ')}. Vencido e' mais grave que o problema original` }
    : { estado: 'ok', texto: 'nenhum risco aceito vencido' })
  if (ativos.length) linhas.push({ estado: 'neutro', texto: `${ativos.length} risco(s) aceito(s) no prazo` })

  // Ilegivel nao e' vencido, e nao pode ser invisivel: e' defeito do registro, e o registro e' a
  // unica coisa que sustenta a excecao. Sem esta linha, o estado novo sumiria da folha de saude.
  const ilegiveis = riscos.filter((r) => estadoDoPrazo(r) === 'ilegivel')
  if (ilegiveis.length) {
    linhas.push({ estado: 'bloqueio', texto: `${ilegiveis.length} risco(s) com data de revisao ilegivel: ${ilegiveis.map((r) => r.id).join(', ')}. O formato e DD/MM/AA` })
  }

  const dep = (ctx['operacao'] as { analise_de_dependencias?: { automatica?: boolean | null } })?.analise_de_dependencias
  const rigor = ctx.rigor.nivel
  if (rigor === 'N2' || rigor === 'N3') {
    linhas.push(dep?.automatica === true
      ? { estado: 'ok', texto: 'analise de dependencias automatica' }
      : { estado: 'bloqueio', texto: `analise de dependencias nao e automatica, e o rigor e ${rigor} (guia OPS-27)` })
  }

  const plataforma = ctx['configuracoes_de_plataforma'] as Record<string, unknown> | undefined
  const pendentes = plataforma
    ? Object.entries(plataforma).filter(([k, v]) => !k.startsWith('_') && k !== 'outras' && v === null).map(([k]) => k)
    : []
  if (pendentes.length) {
    linhas.push({ estado: 'atencao', texto: `${pendentes.length} configuracao(oes) de plataforma nao declarada(s): ${pendentes.join(', ')}. Nenhum script alcanca isso` })
  }
  return linhas
}

// ---------------------------------------------------------------- perfil de qualidade

function estadoDaCaracteristica(m: MetaDeQualidade | undefined): EstadoDaCaracteristica {
  if (!m || !m.meta) return 'sem_meta'
  if (!m.resultado) return 'sem_afericao'
  return m.resultado
}

const MARCA_PERFIL: Record<EstadoDaCaracteristica, string> = {
  sem_meta: '–', sem_afericao: '?', conforme: '✓', ressalva: '⚠', reprovada: '✗',
}

function perfil(ctx: Contexto): { linhas: string[]; reprovadas: number; resumo: Record<string, number> } {
  const metas = (ctx['qualidade'] as { metas_nao_funcionais?: Record<string, MetaDeQualidade> })?.metas_nao_funcionais ?? {}
  const linhas: string[] = []
  const resumo = { avaliadas: 0, conformes: 0, ressalvas: 0, reprovadas: 0, sem_meta: 0, sem_afericao: 0 }

  for (const nome of CARACTERISTICAS) {
    const m = metas[nome]
    const estado = estadoDaCaracteristica(m)
    resumo[estado === 'conforme' ? 'conformes' : estado === 'ressalva' ? 'ressalvas' : estado === 'reprovada' ? 'reprovadas' : estado]++
    if (estado === 'conforme' || estado === 'ressalva' || estado === 'reprovada') resumo.avaliadas++
    const detalhe = estado === 'sem_meta' ? 'meta nao declarada'
      : estado === 'sem_afericao' ? `meta declarada, nunca aferida: ${m?.meta ?? ''}`
      : (m?.nota ?? m?.meta ?? '')
    linhas.push(`    ${MARCA_PERFIL[estado]}  ${nome.replace(/_/g, ' ').padEnd(22)} ${detalhe}`)
  }
  return { linhas, reprovadas: resumo.reprovadas, resumo }
}

// ---------------------------------------------------------------- qualidade e processo

function qualidade(ctx: Contexto, tarefas: Tarefa[]): Linha[] {
  const linhas: Linha[] = []
  const reqs = carregarRequisitos()
  const implementados = reqs.filter((r) => r.status === 'implementado').length
  if (reqs.length) {
    linhas.push({ estado: 'neutro', texto: `${implementados} de ${reqs.length} requisitos implementados` })
  } else {
    linhas.push({ estado: 'atencao', texto: 'nenhum requisito registrado: o que guia o trabalho nao esta escrito' })
  }

  const metodo = (ctx['qualidade'] as { metodo_de_teste?: string })?.metodo_de_teste
  const concluidas = tarefas.filter((t) => t.estado === 'concluida' && t.tipo !== 'SPIKE')
  const semTeste = concluidas.filter((t) => t.plano.criterios_aceite.some((cr) => !cr.teste?.trim()))
  linhas.push(semTeste.length
    ? { estado: 'bloqueio', texto: `${semTeste.length} tarefa(s) concluida(s) com criterio sem teste nomeado` }
    : { estado: 'ok', texto: `metodo de teste "${metodo ?? 'nao declarado'}", todo criterio com teste nomeado` })

  const estouros = tetos()
  linhas.push(estouros.length
    ? { estado: 'atencao', texto: `${estouros.length} arquivo(s) acima do teto de texto: ${estouros.map((a) => a.onde).join(', ')}` }
    : { estado: 'ok', texto: 'nenhum teto de texto estourado' })

  const dividas = carregarDividas().filter((d) => !d.paga_em)
  if (dividas.length) linhas.push({ estado: 'neutro', texto: `${dividas.length} divida(s) tecnica(s) aberta(s)` })

  const invs = carregarInvariantes()
  if (invs.length) {
    const comMecanismo = invs.filter((i) => Boolean(i.mecanismo?.trim())).length
    linhas.push({
      estado: 'neutro',
      texto: `${comMecanismo} de ${invs.length} invariante(s) com mecanismo automatizado`,
    })
  }
  return linhas
}

function processo(ctx: Contexto, tarefas: Tarefa[]): Linha[] {
  const linhas: Linha[] = []
  const viva = (t: Tarefa) => t.estado === 'aberta' || t.estado === 'em-execucao'
  const emExecucao = tarefas.filter((t) => t.estado === 'em-execucao')
  const noCiclo = tarefas.filter((t) => viva(t) && t.fila === 'ciclo')

  linhas.push(emExecucao.length > ctx.limites.em_execucao
    ? { estado: 'bloqueio', texto: `${emExecucao.length} tarefas em execucao, limite ${ctx.limites.em_execucao}` }
    : { estado: 'ok', texto: `${emExecucao.length} de ${ctx.limites.em_execucao} em execucao` })
  linhas.push({ estado: noCiclo.length > ctx.limites.ciclo_tarefas ? 'atencao' : 'neutro',
    texto: `${noCiclo.length} de ${ctx.limites.ciclo_tarefas} no ciclo, ${tarefas.filter((t) => viva(t) && t.fila === 'reserva').length} na reserva` })

  // Trabalho parado pela metade e' o desperdicio mais invisivel, porque parece progresso (ES-50).
  for (const t of noCiclo.filter((x) => x.valor === 'critico' && x.urgencia === 'imediata')) {
    const dias = diasDesde(t.criada_em)
    if (dias !== null && dias >= 30) {
      linhas.push({ estado: 'atencao', texto: `${t.id} e critica+imediata e esta aberta ha ${dias} dias` })
    }
  }

  const pendentes = tarefas.filter((t) => t.validacao === 'pendente')
  if (pendentes.length) {
    linhas.push({ estado: 'atencao', texto: `${pendentes.length} validacao(oes) manual(is) pendente(s): ${pendentes.map((t) => t.id).join(', ')}` })
  }

  const fase = ctx.estado.fase
  if (!fase) {
    linhas.push({ estado: 'bloqueio', texto: 'a fase do projeto nao foi declarada; sem ela nada mais pode ser cobrado' })
  } else {
    const abertos = (PORTOES_POR_FASE[fase] ?? []).filter((p) => ctx.estado.portoes[p]?.status === 'aberto')
    linhas.push(abertos.length
      ? { estado: 'bloqueio', texto: `${abertos.length} portao(oes) que a fase "${fase}" ja exige continuam abertos: ${abertos.join(', ')}` }
      : { estado: 'ok', texto: `portoes exigidos pela fase "${fase}" respondidos` })
  }

  // A pergunta que ninguem faz porque parece obvia demais, e que por isso nao e feita.
  // Foi assim que o proprio pacote passou cinco fases sendo construido sem repositorio.
  const raiz = caminhos().raiz
  // Pergunta ao git, nao procura a pasta `.git`: um projeto dentro de um repositorio maior esta'
  // versionado pelo pai, e worktree e submodulo tambem nao tem a pasta onde se espera.
  const dentroDeRepo = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: raiz, encoding: 'utf8' })
  if (dentroDeRepo.status !== 0) {
    linhas.push({ estado: 'bloqueio', texto: 'o projeto nao esta versionado: nao ha repositorio git. Nada aqui e recuperavel' })
  } else {
    const commits = spawnSync('git', ['rev-list', '--count', 'HEAD'], { cwd: raiz, encoding: 'utf8' })
    const remoto = spawnSync('git', ['remote'], { cwd: raiz, encoding: 'utf8' })
    if (commits.status !== 0) {
      linhas.push({ estado: 'bloqueio', texto: 'repositorio git sem nenhum commit' })
    } else if (!remoto.stdout?.trim()) {
      linhas.push({ estado: 'atencao', texto: 'repositorio sem remoto: o trabalho existe so nesta maquina' })
    } else {
      linhas.push({ estado: 'ok', texto: `versionado, ${commits.stdout?.trim()} commit(s), remoto configurado` })
    }
  }

  // Versionamento se responde em CONSTRUCAO, nao em pre-lancamento: quando ha o que publicar,
  // o historico ja foi feito de outro jeito e nao da para refazer.
  const EXIGE_VERSIONAMENTO: Fase[] = ['construcao', 'pre-lancamento', 'producao', 'manutencao']
  if (fase && EXIGE_VERSIONAMENTO.includes(fase)) {
    const v = ctx['versionamento'] as Record<string, unknown> | undefined
    const nulos = v
      ? Object.entries(v).filter(([k, x]) => !k.startsWith('_') && k !== 'esteira_barra' && x === null).map(([k]) => k)
      : []
    if (!v || nulos.length === Object.keys(v ?? {}).length - 1) {
      linhas.push({ estado: 'bloqueio', texto: `versionamento nao declarado, e a fase "${fase}" ja exige (processos/entrega.md)` })
    } else if (nulos.length) {
      linhas.push({ estado: 'atencao', texto: `versionamento incompleto: ${nulos.join(', ')}` })
    } else {
      linhas.push({ estado: 'ok', texto: 'versionamento declarado' })
    }
  }

  // Rascunho parado e' pauta, nao patrimonio.
  const parados = rascunhosParados()
  if (parados.length) {
    linhas.push({ estado: 'atencao', texto: `${parados.length} rascunho(s) sem destino ha mais de 60 dias: ${parados.map((r) => r.arquivo).join(', ')}` })
  }

  // Fase inicial sem nenhum rascunho: comecou-se a construir antes de entender.
  const FASE_INICIAL: Fase[] = ['ideia', 'descoberta']
  if (fase && FASE_INICIAL.includes(fase)) {
    const rascunhos = listar(`${caminhos().docs}/rascunhos`, '.md').filter((a) => !a.endsWith('LEIA-ME.md') && !a.endsWith('README.md')).length
    linhas.push(rascunhos === 0
      ? { estado: 'atencao', texto: `fase "${fase}" sem nenhum rascunho. Fluxo atual, atores, estados, entidades e telas moram em docs-mentor/rascunhos/ (processos/rascunho.md)` }
      : { estado: 'ok', texto: `${rascunhos} rascunho(s) na fase "${fase}"` })
  }

  const semPadrao = ctx.ferramentas.filter((f) => !f.padrao && !f.dispensa_motivo)
  if (semPadrao.length) {
    linhas.push({ estado: 'atencao', texto: `${semPadrao.length} ferramenta(s) sem convencao escrita: ${semPadrao.map((f) => f.nome).join(', ')}` })
  }

  // O gate de lint do projeto reprovando por estilo do PACOTE nao mede nada do codigo do projeto,
  // e trava o ciclo no primeiro `finalizar`. Medido em campo: 1.975 erros, nenhum em src/.
  const lintCego = analisadoresSemIgnorar(caminhos().raiz)
  if (lintCego.length) {
    linhas.push({ estado: 'atencao', texto: `${lintCego.map((l) => l.arquivo).join(', ')} nao ignora .mentor/: o gate de lint reprova por estilo do pacote. Acrescente ${lintCego[0]?.linha}` })
  }

  // A checagem mais barata do pacote, e a que sustenta todas as outras: se nenhuma ferramenta
  // carrega o nucleo, as 494 regras nao existem. `carregamento: sempre` no cabecalho do nucleo nao
  // e' lido por nada: quem faz o carregamento acontecer sao estes arquivos.
  const entrada = pontosDeEntradaSemNucleo()
  if (entrada.ausentes.length === PONTOS_DE_ENTRADA.length) {
    linhas.push({ estado: 'bloqueio', texto: 'nenhum ponto de entrada de IA no projeto: nada carrega o nucleo, e sem o nucleo o pacote nao existe. Rode: mentor instalar' })
  } else {
    if (entrada.ausentes.length) {
      linhas.push({ estado: 'atencao', texto: `sem ponto de entrada para ${entrada.ausentes.join(', ')}: nessas ferramentas o nucleo nao carrega` })
    }
    if (entrada.mudos.length) {
      linhas.push({ estado: 'bloqueio', texto: `${entrada.mudos.join(', ')} existe mas nao cita .mentor/nucleo.md: a ferramenta carrega o arquivo e nao chega nas leis` })
    }
    if (!entrada.ausentes.length && !entrada.mudos.length) {
      linhas.push({ estado: 'ok', texto: 'pontos de entrada apontam para o nucleo' })
    }
  }

  // Auditoria: o doctor mede a cadencia e conta os bloqueios que ela reportou. Nao julga nada
  // do que ela achou — julgar e' da auditoria, e ela ja' julgou em contexto novo.
  const concluidasParaAuditoria = tarefas.filter((t) => t.estado === 'concluida').length
  const au = ctx.auditoria
  const semAuditar = concluidasParaAuditoria - (au.ultima_na_tarefa ?? 0)
  if (semAuditar >= au.cadencia_em_tarefas * 2) {
    linhas.push({ estado: 'bloqueio', texto: `${semAuditar} tarefas sem auditoria, e a cadencia e ${au.cadencia_em_tarefas}. Rode: mentor auditar preparar` })
  } else if (semAuditar >= au.cadencia_em_tarefas) {
    linhas.push({ estado: 'atencao', texto: `${semAuditar} tarefas sem auditoria (cadencia ${au.cadencia_em_tarefas}). Rode: mentor auditar preparar` })
  } else if (au.ultima_em) {
    linhas.push({ estado: 'ok', texto: `auditoria em dia: ultima em ${au.ultima_em}, ${semAuditar} tarefa(s) desde entao` })
  }
  const bloqueiosDeAuditoria = au.pendencias_reportadas
  if (bloqueiosDeAuditoria.length) {
    linhas.push({ estado: 'bloqueio', texto: `${bloqueiosDeAuditoria.length} achado(s) de auditoria nivel "bloqueia" sem destino: ${bloqueiosDeAuditoria.join(', ')}. Decida com: mentor auditar resolver <ID> --destino ... --ref "..."` })
  }

  // A revisao geral e' a unica auditoria que custa uma sessao. Por isso e' a unica com lembrete.
  const concluidas = tarefas.filter((t) => t.estado === 'concluida').length
  const desde = concluidas - (ctx.revisao_geral.ultima_na_tarefa ?? 0)
  const r = ctx.revisao_geral
  if (desde >= r.bloqueio_em_tarefas) {
    linhas.push({ estado: 'bloqueio', texto: `${desde} tarefas desde a ultima revisao geral (bloqueia em ${r.bloqueio_em_tarefas})` })
  } else if (desde >= r.atraso_em_tarefas) {
    linhas.push({ estado: 'atencao', texto: `revisao geral atrasada: ${desde} tarefas desde a ultima` })
  } else if (desde >= r.aviso_em_tarefas) {
    linhas.push({ estado: 'atencao', texto: `revisao geral pendente ha ${desde} tarefas` })
  }
  return linhas
}

// ---------------------------------------------------------------- saida

export function doctor(): number {
  const ctx = carregarContexto()
  const tarefas = carregarTarefas()
  const secoes: Array<[string, Linha[]]> = [
    ['SEGURANCA', seguranca(ctx)],
    ['QUALIDADE', qualidade(ctx, tarefas)],
    ['PROCESSO', processo(ctx, tarefas)],
  ]
  const p = perfil(ctx)

  console.log(`SAUDE DO PROJETO — ${agora().log}\n`)
  for (const [titulo, linhas] of secoes) {
    console.log(titulo)
    for (const l of linhas) console.log(`  ${MARCA[l.estado]}  ${l.texto}`)
    if (titulo === 'QUALIDADE') {
      console.log('\n  Perfil ISO/IEC 25010, contra as metas do proprio projeto:')
      for (const l of p.linhas) console.log(l)
      console.log(`\n    avaliadas ${p.resumo.avaliadas} de 8 · conformes ${p.resumo.conformes} · ressalva ${p.resumo.ressalvas} · reprovadas ${p.resumo.reprovadas} · sem meta ${p.resumo.sem_meta} · sem afericao ${p.resumo.sem_afericao}`)
      console.log('    Caracteristica sem meta e "–", nunca conforme: ausencia de medicao nao e conformidade.')
    }
    console.log('')
  }

  const bloqueios = secoes.flatMap(([, l]) => l).filter((l) => l.estado === 'bloqueio').length + p.reprovadas
  console.log(bloqueios === 0
    ? 'PRONTO PARA PUBLICO?  SIM — nenhum bloqueio'
    : `PRONTO PARA PUBLICO?  NAO — ${bloqueios} bloqueio(s)`)

  // Os lembretes sao SAIDA: o doctor os calcula e sobrescreve. Campo livre acumularia prosa.
  ctx.lembretes = secoes.flatMap(([, l]) => l).filter((l) => l.estado !== 'ok' && l.estado !== 'neutro').map((l) => l.texto)
  const q = ctx['qualidade'] as Record<string, unknown>
  q['perfil'] = { _gerado_por_doctor: true, de: 8, ...p.resumo }
  escreverJson(caminhos().contexto, ctx)
  return 0
}
