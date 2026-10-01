/**
 * As melhorias pequenas da 0.13.0 que se provam melhor chamando a funcao do que pela linha de
 * comando. As outras tres (origem no `task nova`, teto do dossie e ADR das restricoes) estao nos
 * cenarios 03/13/15, 26 e 30.
 */
import { describe, expect, it } from './vitest-local.ts'
import { caminhoCorrespondeDeclaracao, extrairCaminhosDeclarados } from '../.mentor/scripts/arquivos.ts'
import { politicaDaTarefa } from '../.mentor/scripts/politica-rigor.ts'
import type { Contexto, Tarefa } from '../.mentor/scripts/tipos.ts'

describe('D3: caminho declarado no meio da linha do plano.muda', () => {
  // A linha medida em campo: o caminho vem entre parenteses, depois de uma palavra solta.
  const linha = 'doctor.ts (arquivo .mentor/scripts/cmd-doctor.ts) reinstalado via mentor instalar --forcar (pacote v0.6.0)'

  it('o caminho citado no meio da linha conta como declarado', () => {
    const declarados = extrairCaminhosDeclarados([linha])
    expect(caminhoCorrespondeDeclaracao('.mentor/scripts/cmd-doctor.ts', declarados)).toBe(true)
  })

  it('a regra antiga continua: caminho no inicio, antes do separador', () => {
    const declarados = extrairCaminhosDeclarados(['src/relatorio/exportar.ts - serializa em CSV'])
    expect(caminhoCorrespondeDeclaracao('src/relatorio/exportar.ts', declarados)).toBe(true)
  })

  it('prosa com barra nao vira declaracao', () => {
    const declarados = extrairCaminhosDeclarados(['src/a.ts - soma e/ou subtrai, conforme o PR/merge'])
    expect(declarados).not.toContain('e/ou')
    expect(declarados).not.toContain('PR/merge')
  })

  it('arquivo que nao aparece na linha continua fora', () => {
    const declarados = extrairCaminhosDeclarados([linha])
    expect(caminhoCorrespondeDeclaracao('.mentor/scripts/cmd-verificar.ts', declarados)).toBe(false)
  })
})

describe('D5: documento de planejamento nao e risco de persistencia', () => {
  const ctx = {
    projeto: { classificacao: { finalidade: 'pessoal', maturidade: 'prototipo', visibilidade_codigo: 'publico', uso_atual: 'somente_autor' } },
    rigor: { nivel: 'N2', riscos: { dado_pessoal: 'atual', cobranca_ou_dinheiro: 'ausente', uso_por_terceiros: 'ausente', decisao_automatizada_sobre_pessoa: 'ausente' } },
    auditoria: { revisao_incremental_ativa: false },
    gates: {},
  } as unknown as Contexto
  const tarefa = {
    id: 'TASK-RF-001', tipo: 'RF', titulo: 'Ajustar o resumo da tela',
    plano: { muda: ['src/resumo.ts - texto do resumo'], impacto: 'tela de resumo', criterios_aceite: [] },
  } as unknown as Tarefa

  it('plano de estudo com "persist" no nome nao cria risco concreto', () => {
    const politica = politicaDaTarefa(ctx, tarefa, ['docs-mentor/rascunhos/h2b-estudos-persistidos.md', 'src/resumo.ts'])
    expect(politica.risco_concreto).toBe(false)
  })

  it('codigo de armazenamento com dado pessoal atual continua sendo risco', () => {
    const politica = politicaDaTarefa(ctx, tarefa, ['src/storage/idb.ts'])
    expect(politica.risco_concreto).toBe(true)
  })
})
