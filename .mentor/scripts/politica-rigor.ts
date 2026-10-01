import { categoriasSensiveis } from './sensivel.ts'
import type { Contexto, Tarefa } from './tipos.ts'

export type PerfilDeProcesso = 'enxuto' | 'equilibrado' | 'estrito'
export type NivelDeExigencia = 'bloqueia' | 'avisa' | 'dispensa'

/** Classificação ausente conserva a política anterior até o projeto declarar seu contexto. */
export function perfilDeProcesso(ctx: Contexto): PerfilDeProcesso {
  const c = ctx.projeto?.classificacao as Record<string, unknown> | undefined
  if (!c || !['pessoal', 'comercial', 'institucional'].includes(String(c.finalidade)) ||
      !['prototipo', 'piloto', 'produto'].includes(String(c.maturidade)) ||
      !['privado', 'publico'].includes(String(c.visibilidade_codigo)) ||
      (c.uso_atual !== null && !['somente_autor', 'convidados', 'publico'].includes(String(c.uso_atual)))) return 'estrito'
  const riscos = ctx.rigor?.riscos as Record<string, unknown> | undefined
  if (!riscos || ['dado_pessoal', 'cobranca_ou_dinheiro', 'uso_por_terceiros', 'decisao_automatizada_sobre_pessoa']
    .some((nome) => !['atual', 'planejado', 'ausente', 'indefinido'].includes(String(riscos[nome])))) return 'estrito'
  if (ctx.rigor?.nivel === 'N3' || c.uso_atual === 'publico' ||
      (c.finalidade === 'comercial' && c.maturidade === 'produto')) return 'estrito'
  if (c.finalidade === 'pessoal' && c.maturidade === 'prototipo' && c.uso_atual === 'somente_autor' &&
      !riscoAtual(ctx, 'cobranca_ou_dinheiro') && !riscoAtual(ctx, 'uso_por_terceiros')) return 'enxuto'
  return 'equilibrado'
}

function riscoAtual(ctx: Contexto, nome: string): boolean {
  const estados = ctx.rigor?.riscos as Record<string, unknown> | undefined
  return estados?.[nome] === 'atual'
}

/** Documento nao e' codigo: o nome dele fala do assunto, nao toca armazenamento nem autorizacao. */
const DOCUMENTO = /(?:^|\/)(?:docs-mentor|docs)\/|\.(?:md|mdx|txt|rst|adoc)$/i

function riscoDaMudanca(ctx: Contexto, tarefa: Tarefa, caminhos: string[]): boolean {
  const categorias = categoriasSensiveis(tarefa)
  // Medido em campo: um plano chamado "h2b-estudos-persistidos.md" casou com /persist/ e exigiu
  // validacao de persistencia numa tarefa que nao tocava armazenamento.
  const nomes = caminhos.filter((c) => !DOCUMENTO.test(c.replace(/\\/g, '/'))).join(' ')
  const texto = `${tarefa.titulo} ${tarefa.plano.muda.join(' ')} ${nomes}`
  if (categorias.includes('seguranca') || categorias.includes('autorizacao') ||
      /auth|security|seguranca|permission|permissao|credencial|token/i.test(nomes)) return true
  if (/migra[cç][aã]o|migration|migrate|\.env\b|secrets?\b|credencia/i.test(texto)) return true
  if (riscoAtual(ctx, 'dado_pessoal') &&
      (categorias.includes('persistencia') || /indexeddb|persist|storage|database|\/db[./-]|\/idb[./-]|schema/i.test(nomes))) return true
  if (riscoAtual(ctx, 'cobranca_ou_dinheiro') && /cobran[cç]a|pagamento|billing|payment|checkout/i.test(texto)) return true
  return false
}

export interface PoliticaDaTarefa {
  perfil: PerfilDeProcesso
  risco_concreto: boolean
  revisao: NivelDeExigencia
  validacao_manual: NivelDeExigencia
  gates: NivelDeExigencia
  gates_obrigatorios: string[]
}

/** Decisão única usada por fechamento, pre-push e diagnóstico. O marcador da tarefa impede cobrança retroativa. */
export function politicaDaTarefa(ctx: Contexto, tarefa: Tarefa, caminhos: string[] = []): PoliticaDaTarefa {
  const perfil = perfilDeProcesso(ctx)
  const risco_concreto = riscoDaMudanca(ctx, tarefa, caminhos)
  const sensivel = categoriasSensiveis(tarefa).length > 0
  const exigeRevisao = tarefa.revisao_incremental_requerida === true && ctx.auditoria?.revisao_incremental_ativa === true &&
    (perfil === 'estrito' || (perfil === 'equilibrado' && (sensivel || risco_concreto)) || risco_concreto)
  const exigeGate = perfil === 'estrito' || risco_concreto || (perfil === 'equilibrado' && sensivel)
  const gates_obrigatorios = exigeGate
    ? Object.entries(ctx.gates ?? {}).filter(([nome, decl]) => nome !== 'validacao_manual' && Boolean(decl?.comando) &&
        (perfil === 'estrito' || nome === 'testes')).map(([nome]) => nome)
    : []
  return {
    perfil,
    risco_concreto,
    revisao: exigeRevisao ? 'bloqueia' : tarefa.revisao_incremental_requerida ? 'avisa' : 'dispensa',
    validacao_manual: perfil === 'estrito' || (perfil === 'equilibrado' && sensivel) || risco_concreto ? 'bloqueia' : 'avisa',
    gates: exigeGate ? 'bloqueia' : 'avisa',
    gates_obrigatorios,
  }
}
