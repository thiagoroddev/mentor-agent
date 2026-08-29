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

export type EstadoTarefa = 'aberta' | 'em-execucao' | 'concluida' | 'cancelada'

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
export interface CriterioDeAceite {
  texto: string
  teste: string
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
  motivo: string | null
  ressalva: string | null
}

export interface Plano {
  muda: string[]
  criterios_aceite: CriterioDeAceite[]
  impacto: string | null
  riscos: string[]
  dependencias_novas: string[]
  proporcionalidade: string | null
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
  criada_em: string
  iniciada_em: string | null
  concluida_em: string | null
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
    cadencia_em_tarefas: number
    ultima_em: string | null
    ultima_na_tarefa: string | null
    proxima_em_tarefa: number | null
    pendencias_reportadas: string[]
  }
  [bloco: string]: unknown
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
