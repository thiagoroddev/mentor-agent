/** Vocabulario fechado do pacote. Rotulo inventado na hora nao e' pesquisavel. */

export const ROTULOS = [
  'APROVADO',
  'APROVADO com ressalva',
  'FALHOU',
  'NÃO EXECUTADO',
  'BLOQUEADO',
  'INVÁLIDO como gate',
  'não se aplica',
] as const
export type Rotulo = (typeof ROTULOS)[number]

/** So' um comando executado produz estes. A IA nunca os escreve. */
export const ROTULOS_DE_EXECUCAO: readonly Rotulo[] = ['APROVADO', 'APROVADO com ressalva', 'FALHOU']

/** Estes nao sustentam conclusao. Nucleo, quarta excecao inegociavel. */
export const ROTULOS_QUE_NAO_FECHAM: readonly Rotulo[] = ['FALHOU', 'BLOQUEADO']

/** Estes exigem motivo escrito para o fechamento se sustentar sem eles. */
export const ROTULOS_QUE_EXIGEM_MOTIVO: readonly Rotulo[] = ['NÃO EXECUTADO', 'INVÁLIDO como gate']

export const TIPOS_TAREFA = ['RF', 'RN', 'RNF', 'BG', 'REF', 'DOC', 'CHORE', 'TEST', 'SPIKE'] as const
export type TipoTarefa = (typeof TIPOS_TAREFA)[number]

export const ESCALA = ['P', 'M', 'G', 'XG'] as const
export type Escala = (typeof ESCALA)[number]

export type EstadoTarefa = 'aberta' | 'em-execucao' | 'pausada' | 'concluida' | 'cancelada'

/**
 * `reserva` e' lembrete e **nao entra no contexto**; `ciclo` e' compromisso do ciclo atual.
 * Toda tarefa nasce em reserva: registrar nunca e' bloqueado, inchar o ciclo sim.
 */
export type Fila = 'ciclo' | 'reserva'

/** "Smoke pendente" virando dado. Era frase solta espalhada por prosa. */
export type Validacao = 'nao_requer' | 'pendente' | 'aprovado' | 'dispensado'

/** Declarado pelo projeto. `tdd` e' o padrao; trocar exige motivo escrito. */
export const METODOS_DE_TESTE = ['tdd', 'bdd', 'teste-depois', 'nenhum'] as const
export type MetodoDeTeste = (typeof METODOS_DE_TESTE)[number]

/** Metodos em que o teste nasce antes do codigo, e por isso exigem o vermelho registrado. */
export const METODOS_COM_VERMELHO: readonly MetodoDeTeste[] = ['tdd', 'bdd']

/**
 * Um criterio de aceite sem teste nomeado nao e' criterio, e' intencao.
 * `teste` aceita a saida honesta `nao se aplica: <motivo>`, como os gates.
 */
export interface EvidenciaCriterio {
  comando?: string | null
  codigo_saida?: number | null
  saida?: string | null
  executado_em?: string | null
}

export interface CriterioDeAceite {
  texto: string
  teste: string
  evidencia?: EvidenciaCriterio | null
}

/** Destinos possiveis de um achado. Nao existe um quinto: achado nao fica pendente. */
export const DESTINOS_DE_ACHADO = ['tarefa', 'divida_tecnica', 'risco_aceito', 'descartado'] as const
export type DestinoDeAchado = (typeof DESTINOS_DE_ACHADO)[number]

/** A lista fechada do nucleo §6. Fora dela nao e' achado e nao vira registro. */
export const CLASSES_DE_ACHADO = {
  1: 'seguranca, inclusive dependencia com vulnerabilidade conhecida',
  2: 'dado pessoal exposto',
  3: 'performance com impacto de usuario',
  4: 'requisito ausente ou contradito pelo codigo',
  5: 'gate que existe e nao checa nada',
} as const
export type ClasseDeAchado = 1 | 2 | 3 | 4 | 5

export interface Achado {
  classe: ClasseDeAchado
  descricao: string
  destino: DestinoDeAchado
  /** O ID criado, ou o motivo do descarte. Nunca vazio: e' o que impede o achado de ficar em limbo. */
  ref: string
}
export type Cerimonia = 'Light' | 'Standard' | 'Strict'
export type ValorTarefa = 'critico' | 'importante' | 'desejavel'
export type Urgencia = 'imediata' | 'normal'

export const FASES = [
  'ideia', 'descoberta', 'construcao', 'pre-lancamento', 'producao', 'manutencao',
] as const
export type Fase = (typeof FASES)[number]

export const NOMES_DE_GATE = ['tipos', 'lint', 'testes', 'build', 'validacao_manual'] as const
export type NomeGate = (typeof NOMES_DE_GATE)[number]

/** Marcador que o script escreve e a IA substitui. Nenhum pode sobreviver ao fechamento. */
export const MARCADOR = 'PREENCHER:'

/** Commit que toca codigo carrega a tarefa no titulo: `feat(TASK-RF-001): ...`. */
export const ID_DE_TAREFA_NO_TITULO = /\bTASK-[A-Z]+-\d{3,}\b/

/**
 * Light (nucleo §5) nao tem tarefa, e o commit dele que toca codigo diz isso: `fix(light): ...`.
 *
 * ⚠️ Ate' a 0.8.0 o hook aceitava **qualquer** escopo no lugar do ID, entao `feat(ui): tela nova`
 * subia sem tarefa e `fix: typo` sem escopo era barrado. A marca troca o atalho acidental por um
 * explicito, que o dossie da auditoria lista para conferir se era mesmo Light.
 */
export const MARCA_LIGHT_NO_TITULO = /^[a-z]+\(light\)!?:\s*\S/i
export const MARCA_PLANO_NO_TITULO = /^[a-z]+\(plano\)!?:\s*\S/i

export interface VermelhoDispensado {
  dispensado_em: string
  motivo: string
}

export interface RegistroGate {
  rotulo: Rotulo
  /**
   * Quando este gate foi visto **falhando** antes de passar. Teste que nunca falhou nao e' evidencia:
   * asercao fraca, dublê que devolve o esperado, ramo que nem executa, tudo isso passa de primeira.
   */
  vermelho_em: string | null
  comando: string | null
  codigo_saida: number | null
  saida: string | null
  executado_em: string | null
  evidencia_url: string | null
  commit_execucao?: string | null
  arvore_hash?: string | null
  /**
   * `true` quando `arvore_hash` e' a arvore do codigo (sem a pasta de documentos, com nao rastreados),
   * que o `finalizar` confere. Registro da 0.7.0 nao tem o campo: o hash incluia os documentos, que
   * mudam a cada gate, e por isso nunca era comparavel.
   */
  arvore_sem_documentos?: boolean
  motivo: string | null
  ressalva: string | null
  vermelho_dispensado?: VermelhoDispensado | null
  /** @deprecated Legado plano para retrocompatibilidade com TASK-RF-040/042 */
  vermelho_dispensado_em?: string | null
  /** @deprecated Legado plano */
  vermelho_motivo?: string | null
}

export interface DiscordanciaPlano {
  o_que_faria_diferente: string | null
  o_que_preocupa: string | null
  o_que_existe_pronto_80_porcento: string | null
}

export interface EstadoDaArtePlano {
  implementacoes_consolidadas: string[]
  motivo_descarte: string | null
  o_que_resta_construir: string | null
}

export interface CustoDeOportunidadePlano {
  o_que_existe_pronto: string | null
  custo_estimado: string | null
  dependencias_ou_infra: string | null
  tempo_substituido: string | null
}

export interface ReguasDeMedicao {
  piso: string | null
  teto: string | null
  padrao: string | null
}

export interface RestricaoReavaliada {
  restricao: string
  onde_foi_escrita: string
  o_que_elimina_nesta_tarefa: string
  reconfirmada?: boolean
  porque?: string | null
}

/**
 * Uma pratica profissional comparada a solucao que o humano sugeriu (0.10.0). A sugestao e' hipotese:
 * sem pelo menos duas destas, o `finalizar` recusa o plano que registrou uma.
 */
export interface AlternativaProfissional {
  pratica: string | null
  /** Se ela resolveria o caso concreto que motivou o pedido, e por que. */
  pegaria_o_caso: string | null
  custo: string | null
}

export const TIPOS_DE_SAIDA_DO_LABORATORIO = ['relatorio', 'importavel'] as const
export type TipoDeSaidaDoLaboratorio = (typeof TIPOS_DE_SAIDA_DO_LABORATORIO)[number]

/**
 * O que o SPIKE produz (0.10.0). `relatorio` fica no laboratorio. `importavel` e' dado que o produto
 * consegue ler, e por isso exige teste de contrato registrado em `contexto.laboratorio`.
 */
export interface SaidaDoLaboratorio {
  tipo: TipoDeSaidaDoLaboratorio | string | null
  artefato: string | null
  /** `arquivo > nome do teste`, igual aos criterios de aceite. */
  teste_de_contrato: string | null
}

export interface MeioDeValidacao {
  tipo?: string | null
  meio?: 'tabela-de-casos' | 'fixture' | 'prototipo' | 'harness' | 'passos' | 'testes_automatizados' | string | null
  o_teste_cobre?: string | null
  por_que_nao_basta?: string | null
  porque_nao_automatizado?: string | null
  roteiro?: string | null
  artefato?: string | null
  casos?: string | null
}

export interface ComposicaoFatia {
  o_que_esta_fatia_ensinou_sobre_o_epico?: string | null
  o_que_esta_fatia_entrega?: string | null
  a_direcao_se_mantem: boolean | null
  porque: string | null
}

export interface ContratoEntreFatias {
  forma: string | null
  tipo: 'forma' | 'codigo' | null
  onde_vive: string | null
  fatia_que_cria: string | null
  dados_compartilhados?: string | null
}

export interface RevisaoDeEstrategia {
  quando?: string
  data?: string
  motivo?: string
  nova_direcao?: string
  apos_fatia?: string
  versao_do_plano?: string | null
  aprovado_por_humano?: boolean
}

export interface PlanoDoEpico {
  objetivo: string | null
  problema_canonico: string | null
  estado_da_arte?: EstadoDaArtePlano | null
  hipotese: string | null
  sinal_de_desvio: string | null
  contrato_entre_fatias?: ContratoEntreFatias | null
  restricoes_reavaliadas?: RestricaoReavaliada[]
  revisoes?: RevisaoDeEstrategia[]
  revisoes_de_estrategia?: RevisaoDeEstrategia[]
}

export interface Plano {
  muda: string[]
  criterios_aceite: CriterioDeAceite[]
  /** As palavras do humano, antes de qualquer reformulacao (0.10.0). */
  pedido_original?: string | null
  /** A solucao que o humano sugeriu, ou `null` quando ele so' descreveu o problema. */
  solucao_sugerida?: string | null
  alternativas_profissionais?: AlternativaProfissional[]
  saida_do_laboratorio?: SaidaDoLaboratorio | null
  problema_canonico?: string | null
  discordancia?: DiscordanciaPlano | null
  estado_da_arte?: EstadoDaArtePlano | null
  custo_de_oportunidade?: CustoDeOportunidadePlano | null
  reguas_de_medicao?: ReguasDeMedicao | null
  restricoes_reavaliadas?: RestricaoReavaliada[]
  meio_de_validacao?: MeioDeValidacao | null
  composicao?: ComposicaoFatia | null
  impacto: string | null
  riscos: string[]
  dependencias_novas: string[]
  proporcionalidade: string | null
}

export interface PausaTarefa {
  pausada_em: string
  retomada_em: string | null
  motivo: string
  bloqueada_por: string[]
  commit_pausa: string | null
  commit_retomada: string | null
}

export interface Tarefa {
  id: string
  tipo: TipoTarefa
  titulo: string
  fatia_de: string | null
  estado: EstadoTarefa
  cerimonia: Cerimonia
  valor: ValorTarefa
  urgencia: Urgencia
  esforco: { humano: Escala; ia: Escala }
  depende_de: string[]
  fila: Fila
  /** Posicao fixada a mao. null = a fila calcula. Ver `mentor task fila`. */
  ordem: number | null
  origem: string
  requisitos: string[]
  sem_requisito_motivo?: string | null
  criada_em: string
  iniciada_em: string | null
  /** HEAD no momento do `iniciar`. E' a base do diff que a auditoria le'. `null` = projeto sem git. */
  commit_base: string | null
  concluida_em: string | null
  pausada_em?: string | null
  pausa_motivo?: string | null
  bloqueada_por?: string[]
  pausas?: PausaTarefa[]
  /** SPIKE que fechou mudando arquivo fora de `contexto.laboratorio.caminhos`, e por que (0.10.0). */
  produto_tocado_motivo?: string | null
  plano: Plano
  gates: Partial<Record<string, RegistroGate>>
  achados: Achado[]
  validacao: Validacao
  validado_em: string | null
  validacao_motivo: string | null
  tarefas_geradas: string[]
  adrs: string[]
  divida_tecnica: string[]
  riscos_aceitos: string[]
  absorvida_por: string | null
  cancelamento_motivo: string | null
  ordem_motivo?: string | null
  plano_do_epico?: PlanoDoEpico | null
  narrativa: string | null
}

/** Decisao de nao corrigir agora, com o custo conhecido. Exige gatilho e dono, ou nao vence nunca. */
export interface DividaTecnica {
  id: string
  tipo: 'codigo' | 'arquitetura' | 'teste' | 'documentacao'
  o_que: string
  motivo: string
  custo_futuro: string
  gatilho: string
  dono: string
  criada_em: string
  tarefa_origem: string | null
  paga_em: string | null
  tarefa_pagamento: string | null
}

/**
 * Vulnerabilidade conhecida nao corrigida agora. Destrava um gate que esta' reprovando,
 * e por isso exige mais que a divida tecnica: prova, responsavel nominal, saida e prazo.
 * Entrada vencida reprova **mais alto** que o problema original.
 */
export interface RiscoAceito {
  id: string
  titulo: string
  advisory: string | null
  pacote: string | null
  severidade: 'low' | 'moderate' | 'high' | 'critical'
  tipo: 'producao' | 'desenvolvimento'
  justificativa: string
  /** O comando que qualquer pessoa roda para conferir. Sem ele, "nao se aplica" e' opiniao. */
  evidencia: string
  /** Nome de pessoa. A IA nao se concede as proprias excecoes. */
  aceito_por: string
  aceito_em: string
  /** No maximo 90 dias apos o aceite. Renovar exige nova avaliacao escrita. */
  data_revisao: string
  /** Aceitar sem caminho de saida nao e' decisao, e' desistencia. */
  tarefa_de_saida: string
  encerrado_em: string | null
}

export const PRAZO_MAXIMO_RISCO_DIAS = 90

export interface Requisito {
  id: string
  tipo: 'RF' | 'RN' | 'RNF'
  enunciado: string
  historia: string | null
  prioridade: 'essencial' | 'importante' | 'desejavel'
  status: 'pendente' | 'em-execucao' | 'implementado' | 'cancelado'
  criterios_aceite: string[]
  tarefas: string[]
  adr: string | null
  criado_em: string
  implementado_em: string | null
  pendente_de_validacao: boolean
}

/**
 * Ponteiro para documento ou identificador de sistema externo/historico.
 * Permite resolubilidade de requisitos, ADRs ou dividas sem exigir migracao de documentos imutaveis.
 */
export interface ReferenciaExterna {
  id: string
  onde: string
  sistema?: string | null
  titulo?: string | null
  registrado_em?: string | null
}

/**
 * Invariante de dominio ou restricao arquitetural.
 * O codigo mostra o que e'; a invariante mostra o que precisa continuar sendo.
 */
export interface Invariante {
  id: string
  enunciado: string
  porque: string
  mecanismo: string | null
  declarada_em: string
  conferida_em: string
}

export interface Portao {
  status: 'aberto' | 'respondido' | 'dispensado'
  guia: string
  decidido_em: string | null
  dispensa_motivo: string | null
}

export interface Ferramenta {
  nome: string
  papel: string | null
  versao: string | null
  padrao: string | null
  dispensa_motivo?: string | null
  adotada_em: string | null
  adr: string | null
}

export interface Contexto {
  _meta: { schema: string; gerado_em: string | null; atualizado_em: string | null; [k: string]: unknown }
  projeto: Record<string, unknown>
  estado: { fase: Fase | null; portoes: Record<string, Portao>; [k: string]: unknown }
  rigor: { nivel: 'N1' | 'N2' | 'N3' | null; promovido_por: Record<string, boolean | null>; [k: string]: unknown }
  ferramentas: Ferramenta[]
  gates: Record<string, { comando: string | null; [k: string]: unknown }>
  contagens: Record<string, number | null | boolean>
  limites: { em_execucao: number; ciclo_tarefas: number }
  offsets_de_id?: Record<string, number>
  revisao_geral: {
    ultima_em: string | null
    ultima_na_tarefa: number | null
    aviso_em_tarefas: number
    atraso_em_tarefas: number
    bloqueio_em_tarefas: number
  }
  /** GERADO pelo doctor a cada execucao. Campo livre aqui acumularia prosa como qualquer outro. */
  lembretes: string[]
  auditoria: {
    /** Quantas tarefas concluidas **com diff auditavel** vencem a auditoria. */
    cadencia_em_tarefas: number
    /** @deprecated Desde a 0.8.0 nao dispara nada: a cadencia conta tarefas. O `doctor` avisa. */
    cadencia_em_caracteres?: number
    ultima_em: string | null
    /** Quantas concluidas ja' estavam em algum lote quando a ultima auditoria foi registrada. */
    ultima_na_tarefa: number | null
    /** HEAD quando ela foi registrada: e' onde comeca a busca por commits sem tarefa da proxima. */
    ultimo_commit: string | null
    /** Estimativa: `ultima_na_tarefa + cadencia`. Tarefa sem diff auditavel empurra a proxima. */
    proxima_em_tarefa: number | null
    /** IDs das pendencias 🔴 ainda em aberto. GERADO pelo `auditar`, nunca digitado. */
    pendencias_reportadas: string[]
    /** Padroes a tirar do diff da auditoria (ex: fixtures geradas). `linguist-generated` no `.gitattributes` tambem tira. */
    ignorar_diff?: string[]
  }
  /** Onde o experimento vive e o que dele chega ao produto (0.10.0). Ausente em contexto antigo. */
  laboratorio?: Laboratorio
  [bloco: string]: unknown
}

/** Chave de experimento: comportamento de teste atras de um interruptor desligado por padrao. */
export interface ChaveDeExperimento {
  nome: string | null
  /** Onde se liga: variavel de ambiente, flag de linha de comando, arquivo. */
  onde: string | null
  /** So' `desligada` e' aceito: chave ligada por padrao e' o experimento dentro do produto. */
  padrao: string | null
  dono: string | null
  /** `DD/MM/AA`, ou `null` para chave permanente de laboratorio. Vencida, o `doctor` avisa. */
  remover_em: string | null
  /** `arquivo > nome do teste` que prova o comportamento com a chave desligada. */
  teste: string | null
}

export interface ArtefatoImportavel {
  artefato: string | null
  /** `arquivo > nome do teste` que prende o contrato na fronteira: o que o produto recebe por padrao. */
  teste_de_contrato: string | null
}

export interface Laboratorio {
  /** Globs de onde o experimento vive. `null` = nao declarado; `[]` = o projeto nao tem laboratorio. */
  caminhos: string[] | null
  /** Onde a saida do experimento cai. Tem de estar fora do git: pode conter dado real. */
  saidas: string[] | null
  chaves: ChaveDeExperimento[]
  artefatos_importaveis: ArtefatoImportavel[]
}

/** As oito caracteristicas da ISO/IEC 25010, que sao a tabela QS-24 do guia. */
export const CARACTERISTICAS = [
  'adequacao_funcional', 'desempenho', 'compatibilidade', 'usabilidade',
  'confiabilidade', 'seguranca', 'manutenibilidade', 'portabilidade',
] as const
export type Caracteristica = (typeof CARACTERISTICAS)[number]

export interface MetaDeQualidade {
  pergunta: string
  meta: string | null
  aferida_em: string | null
  resultado: 'conforme' | 'ressalva' | 'reprovada' | null
  nota: string | null
}

/**
 * Cinco estados, e os dois primeiros existem porque a maioria dos sistemas de nota os funde:
 * `sem_meta` nao e' o mesmo que `sem_afericao`, e nenhum dos dois e' conformidade.
 */
export type EstadoDaCaracteristica = 'sem_meta' | 'sem_afericao' | 'conforme' | 'ressalva' | 'reprovada'

/**
 * Uma recusa do pacote, gravada quando acontece.
 * **Mede onde a IA falha, sem ninguem opinar.** Se 80% das recusas forem "marcador nao preenchido",
 * o defeito esta' no esqueleto do plano, nao em quem preenche.
 */
export interface Recusa {
  quando: string
  comando: string
  alvo: string
  impedimentos: string[]
}

export interface RegraDeTeto { padrao: string; teto: number }
export interface ExcecaoDeTeto { caminho: string; teto: number; motivo: string }
export interface Tetos {
  tolerancia: number
  fator_linha: number
  excecoes: ExcecaoDeTeto[]
  regras: RegraDeTeto[]
}

// ---------------------------------------------------------------- auditoria

/**
 * Tres niveis, e a diferenca entre eles nao e' tema, e' **classe de falsidade**.
 * Erro de estilo em codigo de seguranca nao bloqueia; criterio de aceite contradito num botao sim.
 */
export const NIVEIS_DE_AUDITORIA = ['bloqueia', 'recomendacao', 'observacao'] as const
export type NivelDeAuditoria = (typeof NIVEIS_DE_AUDITORIA)[number]

/**
 * ⚠️ Grafia diferente da dos gates de proposito. `APROVADO COM RESSALVAS` julga **codigo**;
 * `APROVADO com ressalva` julga **um comando executado**. As duas existem porque as duas foram
 * medidas em uso, e trocar uma pela outra apaga a distincao.
 */
export const VEREDITOS_DE_REVISAO = ['APROVADO', 'APROVADO COM RESSALVAS', 'REPROVADO'] as const
export type VereditoDeRevisao = (typeof VEREDITOS_DE_REVISAO)[number]

/**
 * Achado de auditoria. Nao vira tarefa aqui: recebe **destino** depois, e quem decide e' o humano.
 * E' essa separacao que impede a auditoria de virar maquina de gerar trabalho.
 */
export interface PendenciaDeAuditoria {
  id: string
  nivel: NivelDeAuditoria
  descricao: string
  /** As tarefas do lote a que o achado se refere. Vazio = achado do lote inteiro. */
  tarefas: string[]
  destino: DestinoDeAchado | null
  ref: string | null
  resolvida_em: string | null
}

export interface Auditoria {
  id: string
  lote: string[]
  commit_base: string | null
  commit_final: string | null
  preparada_em: string
  registrada_em: string | null
  veredito: VereditoDeRevisao | null
  /**
   * A parte mais util do relatorio. Auditoria que aprova tudo esta' quebrada; se nao achou nada,
   * o que sustenta o veredito e' a lista do que **nao** deu para verificar.
   */
  nao_verificado: string[]
  pendencias: PendenciaDeAuditoria[]
  /** Tarefas do lote sem codigo para revisar: so' registros, notas, ou atualizacao do pacote. */
  sem_diff_auditavel?: string[]
  /** Concluidas que nao couberam no teto do dossie e esperam o proximo `preparar`. */
  ficaram_para_depois?: string[]
}
