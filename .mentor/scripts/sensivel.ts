import { extrairCaminhosDeclarados } from './arquivos.ts'
import type { Tarefa } from './tipos.ts'

/**
 * As categorias em que `processos/tarefa.md` torna a validacao manual obrigatoria.
 *
 * ⚠️ **Fonte unica.** Havia tres copias da mesma expressao: duas no `cmd-tarefa.ts` (validar e
 * finalizar) e uma no dossie, que esquecia SPIKE. Nenhuma reconhecia UI, e a taxonomia do processo
 * poe tela como a primeira linha da tabela: tarefa de tela dispensava a validacao com qualquer motivo.
 */
export type CategoriaSensivel = 'persistencia' | 'calculo' | 'ui' | 'regra de negocio' | 'nao funcional' | 'spike'

const PERSISTENCIA = /schema|migration|migra[cç][aã]o|persist|banco|db_|indexeddb|storage/i
const CALCULO = /c[aá]lcul|algor[ií]tm|f[oó]rmula|heur[ií]stic/i
const UI_PALAVRAS = /(^|[^\p{L}])(ui|tela|telas|interface|componente|componentes|layout|css|frontend)([^\p{L}]|$)/iu
const UI_ARQUIVOS = /\.(tsx|jsx|vue|svelte|css|scss|sass|less|html)$/i

export function categoriasSensiveis(t: Tarefa): CategoriaSensivel[] {
  const texto = `${t.titulo} ${t.plano.muda.join(' ')} ${t.plano.impacto ?? ''}`
  const categorias: CategoriaSensivel[] = []
  if (PERSISTENCIA.test(texto)) categorias.push('persistencia')
  if (CALCULO.test(texto)) categorias.push('calculo')
  if (UI_PALAVRAS.test(texto) || extrairCaminhosDeclarados(t.plano.muda).some((c) => UI_ARQUIVOS.test(c))) {
    categorias.push('ui')
  }
  if (t.tipo === 'RN') categorias.push('regra de negocio')
  if (t.tipo === 'RNF') categorias.push('nao funcional')
  if (t.tipo === 'SPIKE') categorias.push('spike')
  return categorias
}

/** Regra 4 do auditor: calculo e persistencia exigem revisao humana, nao so' validacao. */
export function tocaRegra4(categorias: CategoriaSensivel[]): boolean {
  return categorias.some((c) => c === 'persistencia' || c === 'calculo' || c === 'regra de negocio' || c === 'nao funcional')
}

export const MOTIVO_MINIMO_DE_DISPENSA = 30
