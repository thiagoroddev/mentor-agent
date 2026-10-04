import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from './vitest-local.ts'
import { criterio, obterLogDeEvidencia } from '../.mentor/scripts/cmd-tarefa.ts'
import type { Tarefa } from '../.mentor/scripts/tipos.ts'
import { caminhos } from '../.mentor/scripts/arquivos.ts'
import { regenerarTudo } from '../.mentor/scripts/vistas.ts'

describe('Compacidade de evidências no JSON (Fatia D3)', () => {
  it('obterLogDeEvidencia recupera log integral do arquivo quando log_ref existe', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mentor-compacidade-'))
    try {
      const pastaLogs = join(tempDir, 'docs', '.evidencias', 'logs')
      const caminhoLog = join(pastaLogs, 'TASK-1-criterio-0.log')
      const conteudoCompleto = 'Linha 1\nLinha 2\nLinha 3\nLinha 4\nLinha 5\nLinha 6'

      const evidencia = {
        comando: 'npm test',
        codigo_saida: 0,
        saida: 'Linha 1\n... [2 linhas omitidas] ...\nLinha 6',
        log_ref: 'docs/.evidencias/logs/TASK-1-criterio-0.log',
      }

      // Se o arquivo não existir, recua para saida
      expect(obterLogDeEvidencia(evidencia, tempDir)).toBe(evidencia.saida)

      // Criando o arquivo, deve ler o conteúdo completo
      mkdirSync(pastaLogs, { recursive: true })
      writeFileSync(caminhoLog, conteudoCompleto, 'utf8')

      expect(obterLogDeEvidencia(evidencia, tempDir)).toBe(conteudoCompleto)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('obterLogDeEvidencia suporta registros legados sem log_ref com fallback para saida', () => {
    const evidenciaLegada = {
      comando: 'node -e "console.log(1)"',
      codigo_saida: 0,
      saida: '1\nsucesso total',
      executado_em: '01/01/26 10:00',
    }

    expect(obterLogDeEvidencia(evidenciaLegada)).toBe('1\nsucesso total')
    expect(obterLogDeEvidencia(null)).toBe('')
    expect(obterLogDeEvidencia(undefined)).toBe('')
  })

  it('criterio com comando longo gera arquivo de log e armazena resumo conciso no JSON', () => {
    const c = caminhos()
    // Criamos uma tarefa temporária na pasta abertas para testar criterio()
    const idTeste = 'TASK-CHORE-TEST-D3'
    const arquivoTarefa = join(c.abertas, `${idTeste}.json`)

    const tarefaTeste: Tarefa = {
      id: idTeste,
      revisao_incremental_requerida: false,
      tipo: 'CHORE',
      titulo: 'Tarefa Teste Compacidade',
      fatia_de: null,
      estado: 'em-execucao',
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
      criada_em: '04/10/26 14:00',
      iniciada_em: '04/10/26 14:01',
      commit_base: null,
      concluida_em: null,
      plano_ref: null,
      plano: {
        versao: 2,
        muda: ['src/app.ts'],
        criterios_aceite: [
          { texto: 'criterio com muitas linhas de log', teste: 'comando de teste', evidencia: null },
        ],
        impacto: 'local',
        riscos: [],
        dependencias_novas: [],
        proporcionalidade: 'Standard',
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
      narrativa: null,
    }

    try {
      writeFileSync(arquivoTarefa, JSON.stringify(tarefaTeste, null, 2), 'utf8')

      // Executa criterio com comando gerando 25 linhas
      criterio(
        idTeste,
        '0',
        { comando: 'node -e "for(let i=1;i<=25;i++) console.log(\'Linha de saida \' + i)"' },
      )

      const salva = JSON.parse(readFileSync(arquivoTarefa, 'utf8')) as Tarefa
      const ev = salva.plano.criterios_aceite[0]?.evidencia
      expect(ev).toBeDefined()
      expect(ev?.codigo_saida).toBe(0)
      expect(ev?.log_ref).toBeDefined()
      expect(ev?.log_ref).toContain('.evidencias/logs')

      // Verifica que o arquivo de log existe no caminho apontado
      const caminhoLogAbs = join(c.raiz, ev!.log_ref!)
      expect(existsSync(caminhoLogAbs)).toBe(true)

      const conteudoLog = readFileSync(caminhoLogAbs, 'utf8')
      expect(conteudoLog).toContain('Linha de saida 1')
      expect(conteudoLog).toContain('Linha de saida 25')

      // Verifica que dita evidencia no JSON é concisa (resumida)
      expect(ev?.saida).toContain('linhas omitidas')
      expect(Boolean(ev?.saida && ev.saida.length < conteudoLog.length)).toBe(true)

      let logCriado: string | null = null
      if (ev?.log_ref) logCriado = join(c.raiz, ev.log_ref)

      // obterLogDeEvidencia devolve o conteúdo na íntegra
      expect(obterLogDeEvidencia(ev)).toBe(conteudoLog.trim())
      if (logCriado) rmSync(logCriado, { force: true })
    } finally {
      rmSync(arquivoTarefa, { force: true })
      regenerarTudo()
    }
  })

  it('criterio com --saida longa persiste em log e mantem campo saida conciso', () => {
    const c = caminhos()
    const idTeste = 'TASK-CHORE-TEST-SAIDA'
    const arquivoTarefa = join(c.abertas, `${idTeste}.json`)

    const tarefaTeste: Tarefa = {
      id: idTeste,
      revisao_incremental_requerida: false,
      tipo: 'CHORE',
      titulo: 'Tarefa Teste Saida Longa',
      fatia_de: null,
      estado: 'em-execucao',
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
      criada_em: '04/10/26 14:00',
      iniciada_em: '04/10/26 14:01',
      commit_base: null,
      concluida_em: null,
      plano_ref: null,
      plano: {
        versao: 2,
        muda: ['src/app.ts'],
        criterios_aceite: [
          { texto: 'criterio manual longo', teste: 'manual', evidencia: null },
        ],
        impacto: 'local',
        riscos: [],
        dependencias_novas: [],
        proporcionalidade: 'Standard',
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
      narrativa: null,
    }

    try {
      writeFileSync(arquivoTarefa, JSON.stringify(tarefaTeste, null, 2), 'utf8')

      // String longa de 1500 caracteres
      const saidaLonga = Array.from({ length: 30 }, (_, i) => `Linha detalhada de evidencia manual ${i + 1}`).join('\n')
      criterio(idTeste, '0', { saida: saidaLonga })

      const salva = JSON.parse(readFileSync(arquivoTarefa, 'utf8')) as Tarefa
      const ev = salva.plano.criterios_aceite[0]?.evidencia
      expect(ev).toBeDefined()
      expect(ev?.log_ref).toBeDefined()
      expect(Boolean(ev?.saida && ev.saida.length < saidaLonga.length)).toBe(true)

      let logCriado: string | null = null
      if (ev?.log_ref) logCriado = join(c.raiz, ev.log_ref)

      // obterLogDeEvidencia recupera os 1500 caracteres
      expect(obterLogDeEvidencia(ev)).toBe(saidaLonga)
      if (logCriado) rmSync(logCriado, { force: true })
    } finally {
      rmSync(arquivoTarefa, { force: true })
      regenerarTudo()
    }
  })
})
