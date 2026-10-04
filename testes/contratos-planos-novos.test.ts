import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from './vitest-local.ts'
import { resolverPlano, validarReferenciasDoContrato, vincularPlano, salvarPlanos } from '../.mentor/scripts/cmd-plano.ts'
import type { Tarefa } from '../.mentor/scripts/tipos.ts'
import { caminhos } from '../.mentor/scripts/arquivos.ts'

describe('Contratos novos de plano (Fatia D1)', () => {
  it('resolverPlano preserva todos os 4 campos novos em planos inline', () => {
    const tarefaFake: Tarefa = {
      id: 'TASK-CHORE-901',
      revisao_incremental_requerida: false,
      tipo: 'CHORE',
      titulo: 'Teste Contrato Inline',
      fatia_de: null,
      estado: 'aberta',
      cerimonia: 'Standard',
      perfil: 'completo',
      valor: 'importante',
      urgencia: 'normal',
      esforco: { humano: 'P', ia: 'P' },
      depende_de: [],
      ordem_motivo: null,
      fila: 'ciclo',
      ordem: null,
      origem: 'titulo-autossuficiente',
      requisitos: [],
      sem_requisito_motivo: null,
      criada_em: '04/10/26 12:00',
      iniciada_em: null,
      commit_base: null,
      concluida_em: null,
      plano_ref: null,
      plano: {
        versao: 2,
        muda: ['src/app.ts'],
        criterios_aceite: [{ texto: 'criterio 1', teste: 'teste 1', evidencia: null }],
        impacto: 'local',
        riscos: ['baixo'],
        dependencias_novas: [],
        proporcionalidade: 'Standard',
        decisoes_aplicaveis: [
          { adr: 'ADR-001', aplicacao: 'Segue ADR 001', excecoes: null }
        ],
        reuso: {
          existentes: ['src/utils.ts'],
          novos: [{ artefato: 'NovoCard', local: 'src/components', motivo: 'Reuso' }]
        },
        habilidades: {
          planejamento: [{ nome: 'planejamento', motivo: 'Planejar', origem: 'builtin' }],
          execucao: [{ nome: 'ui-design', motivo: 'Estilizar', origem: 'builtin' }]
        },
        avaliacao: {
          planejamento: {
            complexidade: 'baixa',
            dimensao_dominante: 'incerteza',
            justificativa: 'Simples',
            perfil_modelo: 'economico',
            effort: 'baixo'
          },
          execucao: {
            complexidade: 'baixa',
            dimensao_dominante: 'acoplamento',
            justificativa: 'Simples',
            perfil_modelo: 'economico',
            effort: 'baixo'
          }
        }
      },
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
      narrativa: null
    }

    const res = resolverPlano(tarefaFake)
    expect(res.origem).toBe('inline')
    expect(res.versao).toBe(2)
    expect(res.decisoes_aplicaveis).toEqual(tarefaFake.plano.decisoes_aplicaveis)
    expect(res.reuso).toEqual(tarefaFake.plano.reuso)
    expect(res.habilidades).toEqual(tarefaFake.plano.habilidades)
    expect(res.avaliacao).toEqual(tarefaFake.plano.avaliacao)
  })

  it('validarReferenciasDoContrato acusa ADR inexistente e habilidade sem origem', () => {
    const c = caminhos()
    const planoComErros = {
      versao: 2,
      decisoes_aplicaveis: [
        { adr: 'ADR-999-INEXISTENTE', aplicacao: 'Invalida' }
      ],
      habilidades: {
        planejamento: [
          { nome: 'habilidade-fantasma-inexistente', motivo: 'Sem arquivo e sem origem' }
        ]
      }
    }

    const diagnosticos = validarReferenciasDoContrato(planoComErros, c)
    expect(diagnosticos.length).toBe(2)
    expect(diagnosticos[0]).toContain('ADR-999-INEXISTENTE')
    expect(diagnosticos[1]).toContain('habilidade-fantasma-inexistente')
  })

  it('validarReferenciasDoContrato aceita habilidade com origem explicita e ADR existente', () => {
    const c = caminhos()
    // Criamos pasta temporária de ADR se necessário ou testamos com ADR existente
    const planoValido = {
      versao: 2,
      decisoes_aplicaveis: {
        motivo_ausencia: 'Projeto sem ADRs no momento'
      },
      habilidades: {
        planejamento: [
          { nome: 'habilidade-remota', motivo: 'Vem de plugin externo', origem: 'plugin-externo' }
        ]
      }
    }

    const diagnosticos = validarReferenciasDoContrato(planoValido, c)
    expect(diagnosticos.length).toBe(0)
  })

  it('resolverPlano carrega campos de contrato acompanhante (.contrato.json)', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mentor-contrato-acompanhante-'))
    try {
      const planoMd = join(tempDir, 'plano.md')
      const contratoJson = join(tempDir, 'plano.contrato.json')

      writeFileSync(planoMd, '# Plano com Contrato\n\nTexto do plano.\n')
      const contrato = {
        versao: 2,
        muda: ['src/novo.ts'],
        criterios_aceite: [{ texto: 'ok', teste: 'teste-ok' }],
        impacto: 'alto',
        riscos: ['nenhum'],
        decisoes_aplicaveis: { motivo_ausencia: 'Nenhuma adr necessaria' },
        reuso: { motivo_sem_reuso: 'Codigo totalmente novo' },
        habilidades: {
          planejamento: [{ nome: 'planejamento', motivo: 'Planejar', origem: 'builtin' }]
        },
        avaliacao: {
          planejamento: {
            complexidade: 'baixa',
            dimensao_dominante: 'incerteza',
            justificativa: 'Simples',
            perfil_modelo: 'economico',
            effort: 'baixo'
          }
        }
      }
      writeFileSync(contratoJson, JSON.stringify(contrato, null, 2))

      const tarefa: Tarefa = {
        id: 'TASK-CHORE-902',
        revisao_incremental_requerida: false,
        tipo: 'CHORE',
        titulo: 'Tarefa com plano acompanhante',
        fatia_de: null,
        estado: 'aberta',
        cerimonia: 'Standard',
        perfil: 'completo',
        valor: 'importante',
        urgencia: 'normal',
        esforco: { humano: 'P', ia: 'P' },
        depende_de: [],
        ordem_motivo: null,
        fila: 'ciclo',
        ordem: null,
        origem: 'titulo-autossuficiente',
        requisitos: [],
        sem_requisito_motivo: null,
        criada_em: '04/10/26 12:00',
        iniciada_em: null,
        commit_base: null,
        concluida_em: null,
        plano_ref: {
          arquivo: 'plano.md',
          sha256: '0000', // forçado para testar resolução
          secao: null
        },
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
        narrativa: null
      }

      const res = resolverPlano(tarefa, tempDir)
      expect(res.versao).toBe(2)
      expect(res.muda).toEqual(['src/novo.ts'])
      expect(res.decisoes_aplicaveis).toEqual(contrato.decisoes_aplicaveis)
      expect(res.reuso).toEqual(contrato.reuso)
      expect(res.habilidades).toEqual(contrato.habilidades)
      expect(res.avaliacao).toEqual(contrato.avaliacao)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('retrocompatibilidade: contratos legados (versão ausente) funcionam sem exigir novos campos', () => {
    const tarefaLegada: Tarefa = {
      id: 'TASK-CHORE-903',
      revisao_incremental_requerida: false,
      tipo: 'CHORE',
      titulo: 'Tarefa Legada',
      fatia_de: null,
      estado: 'aberta',
      cerimonia: 'Standard',
      perfil: 'compacto',
      valor: 'importante',
      urgencia: 'normal',
      esforco: { humano: 'P', ia: 'P' },
      depende_de: [],
      ordem_motivo: null,
      fila: 'ciclo',
      ordem: null,
      origem: 'titulo-autossuficiente',
      requisitos: [],
      sem_requisito_motivo: null,
      criada_em: '04/10/26 12:00',
      iniciada_em: null,
      commit_base: null,
      concluida_em: null,
      plano_ref: null,
      plano: {
        muda: ['src/legado.ts'],
        criterios_aceite: [{ texto: 'criterio', teste: 'teste', evidencia: null }],
        impacto: 'local',
        riscos: [],
        dependencias_novas: [],
        proporcionalidade: 'compacto'
      },
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
      narrativa: null
    }

    const res = resolverPlano(tarefaLegada)
    expect(res.revisao_valida).toBe(true)
    expect(res.diagnosticos.length).toBe(0)
    expect(res.versao).toBeUndefined()
  })
})
