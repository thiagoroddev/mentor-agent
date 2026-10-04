import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { describe, expect, it } from './vitest-local.ts'
import { resolverPlano, vincularPlano } from '../.mentor/scripts/cmd-plano.ts'
import { motivosDeExclusao } from '../.mentor/scripts/cmd-auditar.ts'
import { assinaturaSemanticaDaTarefa, contratosDaRevisao } from '../.mentor/scripts/revisao-incremental.ts'
import type { Tarefa } from '../.mentor/scripts/tipos.ts'
import { caminhos } from '../.mentor/scripts/arquivos.ts'
import { regenerarTudo } from '../.mentor/scripts/vistas.ts'

describe('Herança, hashes e revisão incremental (Fatia E)', () => {
  it('vincularPlano gera manifesto seletivo com documentos_herdados sem incluir todo o diretório', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mentor-heranca-'))
    try {
      const pastaEpico = join(tempDir, 'docs', 'rascunhos', 'planejamentos', 'epico')
      mkdirSync(pastaEpico, { recursive: true })

      const arqReadme = join(pastaEpico, 'README.md')
      const arqFatia1 = join(pastaEpico, 'fatia-1.md')
      const arqFatia1Contrato = join(pastaEpico, 'fatia-1.contrato.json')
      const arqNormativo1 = join(pastaEpico, '01-arquitetura.md')
      const arqNormativo2 = join(pastaEpico, '02-seguranca.md')
      const arqOutraFatia = join(pastaEpico, 'fatia-2-outra.md')

      writeFileSync(arqReadme, '# README do Épico', 'utf8')
      writeFileSync(arqFatia1, '# Fatia 1', 'utf8')
      writeFileSync(arqNormativo1, '# Diretrizes de Arquitetura', 'utf8')
      writeFileSync(arqNormativo2, '# Diretrizes de Segurança', 'utf8')
      writeFileSync(arqOutraFatia, '# Fatia 2 independente', 'utf8')

      const contrato = {
        versao: 2,
        muda: ['src/index.ts'],
        criterios_aceite: [{ texto: 'criterio 1', teste: 't1', evidencia: null }],
        documentos_herdados: [
          '01-arquitetura.md',
          '02-seguranca.md',
        ],
      }
      writeFileSync(arqFatia1Contrato, JSON.stringify(contrato, null, 2), 'utf8')

      const c = caminhos()
      const idTeste = 'TASK-CHORE-TEST-HERANCA-1'
      const arqTarefa = join(c.abertas, `${idTeste}.json`)
      const tarefaTeste: Tarefa = {
        id: idTeste,
        tipo: 'CHORE',
        titulo: 'Teste Manifesto Seletivo',
        fatia_de: null,
        estado: 'em-execucao',
        cerimonia: 'Standard',
        valor: 'importante',
        urgencia: 'normal',
        esforco: { humano: 'P', ia: 'P' },
        depende_de: [],
        fila: 'ciclo',
        ordem: null,
        origem: 'titulo-autossuficiente',
        requisitos: [],
        sem_requisito_motivo: null,
        criada_em: '04/10/26 14:00',
        iniciada_em: '04/10/26 14:01',
        commit_base: null,
        concluida_em: null,
        plano: {
          versao: 2,
          muda: ['src/index.ts'],
          criterios_aceite: [{ texto: 'criterio 1', teste: 't1', evidencia: null }],
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
        writeFileSync(arqTarefa, JSON.stringify(tarefaTeste, null, 2), 'utf8')
        vincularPlano(idTeste, { arquivo: arqFatia1 })

        const salva = JSON.parse(readFileSync(arqTarefa, 'utf8')) as Tarefa
        expect(salva.plano_ref).toBeDefined()
        expect(salva.plano_ref?.manifesto).toBeDefined()

        const manifesto = salva.plano_ref!.manifesto!
        const chaves = Object.keys(manifesto)

        // Deve conter fatia-1.md, fatia-1.contrato.json e os dois normativos herdados
        expect(chaves.some((k) => k.endsWith('fatia-1.md'))).toBe(true)
        expect(chaves.some((k) => k.endsWith('fatia-1.contrato.json'))).toBe(true)
        expect(chaves.some((k) => k.endsWith('01-arquitetura.md'))).toBe(true)
        expect(chaves.some((k) => k.endsWith('02-seguranca.md'))).toBe(true)

        // NÃO deve conter fatia-2-outra.md nem README.md não declarado
        expect(chaves.some((k) => k.endsWith('fatia-2-outra.md'))).toBe(false)
        expect(chaves.some((k) => k.endsWith('README.md'))).toBe(false)
      } finally {
        rmSync(arqTarefa, { force: true })
        rmSync(join(c.abertas, `${idTeste}.md`), { force: true })
        regenerarTudo()
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('resolverPlano valida isolamento: alteração em não-herdado preserva validade; em herdado invalida', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mentor-isolamento-'))
    try {
      const pastaEpico = join(tempDir, 'docs', 'rascunhos', 'planejamentos', 'epico')
      mkdirSync(pastaEpico, { recursive: true })

      const arqFatia = join(pastaEpico, 'fatia-1.md')
      const arqNormativo = join(pastaEpico, '01-arquitetura.md')
      const arqNaoHerdado = join(pastaEpico, 'fatia-2-outra.md')

      writeFileSync(arqFatia, '# Fatia 1 Original', 'utf8')
      writeFileSync(arqNormativo, '# Diretriz Original', 'utf8')
      writeFileSync(arqNaoHerdado, '# Outra fatia v1', 'utf8')

      const relFatia = relative(tempDir, arqFatia).replace(/\\/g, '/')
      const relNormativo = relative(tempDir, arqNormativo).replace(/\\/g, '/')

      const tarefa: Tarefa = {
        id: 'TASK-CHORE-TEST-ISOLAMENTO',
        tipo: 'CHORE',
        titulo: 'Teste Isolamento de Revisao',
        fatia_de: null,
        estado: 'em-execucao',
        cerimonia: 'Standard',
        valor: 'importante',
        urgencia: 'normal',
        esforco: { humano: 'P', ia: 'P' },
        depende_de: [],
        fila: 'ciclo',
        ordem: null,
        origem: 'titulo-autossuficiente',
        requisitos: [],
        sem_requisito_motivo: null,
        criada_em: '04/10/26 14:00',
        iniciada_em: '04/10/26 14:01',
        commit_base: null,
        concluida_em: null,
        plano: {
          versao: 2,
          muda: ['src/app.ts'],
          criterios_aceite: [{ texto: 'criterio', teste: 't', evidencia: null }],
          impacto: 'local',
          riscos: [],
          dependencias_novas: [],
          proporcionalidade: 'Standard',
          documentos_herdados: [relNormativo],
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
        plano_ref: {
          arquivo: relFatia,
          sha256: 'sha-original-fatia',
          secao: null,
          manifesto: {},
        },
      }

      // Calcula hashes reais iniciais
      const hashFatia = createHash('sha256').update(readFileSync(arqFatia)).digest('hex')
      const hashNormativo = createHash('sha256').update(readFileSync(arqNormativo)).digest('hex')

      tarefa.plano_ref!.sha256 = hashFatia
      tarefa.plano_ref!.manifesto = {
        [relFatia]: hashFatia,
        [relNormativo]: hashNormativo,
      }

      // 1. Estado inicial é válido
      const resInicial = resolverPlano(tarefa, tempDir)
      expect(resInicial.revisao_valida).toBe(true)
      expect(resInicial.diagnosticos).toEqual([])

      // 2. Modifica arquivo NÃO herdado (fatia-2-outra.md)
      writeFileSync(arqNaoHerdado, '# Outra fatia modificada com novos requisitos', 'utf8')
      const resAposNaoHerdado = resolverPlano(tarefa, tempDir)
      expect(resAposNaoHerdado.revisao_valida).toBe(true)
      expect(resAposNaoHerdado.diagnosticos).toEqual([])

      // 3. Modifica documento herdado (01-arquitetura.md)
      writeFileSync(arqNormativo, '# Diretriz de Arquitetura REVISADA MATERIALMENTE', 'utf8')
      const resAposHerdado = resolverPlano(tarefa, tempDir)
      expect(resAposHerdado.revisao_valida).toBe(false)
      expect(resAposHerdado.diagnosticos.some((d) => d.includes('Revisao de documento normativo divergente'))).toBe(true)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('assinaturaSemanticaDaTarefa inclui campos v2 e manifesto em plano_ref', () => {
    const baseTarefa: Tarefa = {
      id: 'TASK-1',
      tipo: 'CHORE',
      titulo: 'Tarefa Base',
      fatia_de: null,
      estado: 'em-execucao',
      cerimonia: 'Standard',
      valor: 'importante',
      urgencia: 'normal',
      esforco: { humano: 'P', ia: 'P' },
      depende_de: [],
      fila: 'ciclo',
      ordem: null,
      origem: 'titulo-autossuficiente',
      requisitos: [],
      sem_requisito_motivo: null,
      criada_em: '04/10/26 14:00',
      iniciada_em: '04/10/26 14:01',
      commit_base: 'commit-1',
      concluida_em: null,
      plano: {
        versao: 2,
        muda: ['src/app.ts'],
        criterios_aceite: [{ texto: 'c1', teste: 't1', evidencia: null }],
        impacto: 'local',
        riscos: ['risco 1'],
        dependencias_novas: [],
        proporcionalidade: 'Standard',
        decisoes_aplicaveis: [{ adr: 'ADR-001', aplicacao: 'uso de ts' }],
        reuso: { existentes: ['util.ts'], novos: [], motivo_sem_reuso: null },
        habilidades: { planejamento: [{ nome: 'p', motivo: 'm', origem: 'o' }] },
        avaliacao: { planejamento: { complexidade: 'baixa', perfil_modelo: 'geral' } },
        documentos_herdados: ['docs/diretriz.md'],
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
      plano_ref: {
        arquivo: 'docs/plano.md',
        sha256: 'hash-1',
        secao: null,
        manifesto: { 'docs/plano.md': 'hash-1', 'docs/diretriz.md': 'hash-d1' },
      },
    }

    const sigBase = assinaturaSemanticaDaTarefa(baseTarefa)

    // Alteração em campos contratuais v2 altera a assinatura
    const comNovaDecisao: Tarefa = {
      ...baseTarefa,
      plano: {
        ...baseTarefa.plano,
        decisoes_aplicaveis: [{ adr: 'ADR-002', aplicacao: 'nova regra' }],
      },
    }
    expect(assinaturaSemanticaDaTarefa(comNovaDecisao)).not.toBe(sigBase)

    const comNovoReuso: Tarefa = {
      ...baseTarefa,
      plano: {
        ...baseTarefa.plano,
        reuso: { existentes: ['outro.ts'], novos: [], motivo_sem_reuso: null },
      },
    }
    expect(assinaturaSemanticaDaTarefa(comNovoReuso)).not.toBe(sigBase)

    const comNovoManifesto: Tarefa = {
      ...baseTarefa,
      plano_ref: {
        ...baseTarefa.plano_ref!,
        manifesto: { 'docs/plano.md': 'hash-1', 'docs/diretriz.md': 'hash-d2-alterado' },
      },
    }
    expect(assinaturaSemanticaDaTarefa(comNovoManifesto)).not.toBe(sigBase)

    // Alteração em campos não contratuais (gates, concluida_em, validado_em) preserva a assinatura
    const comGatesAlterados: Tarefa = {
      ...baseTarefa,
      concluida_em: '04/10/26 15:00',
      validado_em: '04/10/26 15:00',
      gates: {
        tipos: {
          rotulo: 'APROVADO',
          comando: 'npm test',
          codigo_saida: 0,
          saida: 'ok',
          executado_em: '04/10/26 15:00',
          vermelho_em: null,
          vermelho_dispensado: null,
          evidencia_url: null,
          motivo: null,
          ressalva: null,
        },
      },
    }
    expect(assinaturaSemanticaDaTarefa(comGatesAlterados)).toBe(sigBase)
  })

  it('contratosDaRevisao inclui arquivos do manifesto de tarefas vinculadas', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mentor-contratos-'))
    try {
      const pastaMentor = join(tempDir, '.mentor')
      const pastaProc = join(tempDir, '.mentor', 'processos')
      mkdirSync(pastaProc, { recursive: true })
      writeFileSync(join(pastaMentor, 'nucleo.md'), '# Núcleo', 'utf8')
      writeFileSync(join(pastaProc, 'revisao.md'), '# Revisão', 'utf8')

      const docHerdado = join(tempDir, 'docs', 'diretriz-heranca.md')
      mkdirSync(dirname(docHerdado), { recursive: true })
      writeFileSync(docHerdado, '# Diretriz', 'utf8')

      const relDoc = relative(tempDir, docHerdado).replace(/\\/g, '/')

      const tarefa: Tarefa = {
        id: 'TASK-1',
        tipo: 'CHORE',
        titulo: 'T1',
        fatia_de: null,
        estado: 'em-execucao',
        cerimonia: 'Standard',
        valor: 'importante',
        urgencia: 'normal',
        esforco: { humano: 'P', ia: 'P' },
        depende_de: [],
        fila: 'ciclo',
        ordem: null,
        origem: 'titulo-autossuficiente',
        requisitos: [],
        sem_requisito_motivo: null,
        criada_em: '04/10/26 14:00',
        iniciada_em: '04/10/26 14:01',
        commit_base: null,
        concluida_em: null,
        plano: {
          versao: 2,
          muda: [],
          criterios_aceite: [],
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
        plano_ref: {
          arquivo: relDoc,
          sha256: 'sha',
          manifesto: {
            [relDoc]: 'sha',
          },
        },
      }

      const contratos = contratosDaRevisao(tempDir, [tarefa], [])
      const caminhosContratos = contratos.map((c) => c.caminho)

      expect(caminhosContratos).toContain('.mentor/nucleo.md')
      expect(caminhosContratos).toContain('.mentor/processos/revisao.md')
      expect(caminhosContratos).toContain(relDoc)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('motivosDeExclusao dá precedência ao vínculo normativo sobre rascunho genérico', () => {
    const arquivos = [
      'docs/rascunhos/ideia-descartada.md',
      'docs/rascunhos/planejamentos/fatia-declarada.md',
    ]
    const declarados = [
      'docs/rascunhos/planejamentos/fatia-declarada.md',
    ]

    const mapa = motivosDeExclusao(arquivos, undefined, declarados)

    // O rascunho sem vínculo é classificado como nota
    expect(mapa.get('docs/rascunhos/ideia-descartada.md')).toBe('nota')

    // O rascunho com vínculo normativo declarado tem precedência e motivo é null (incluído na revisão)
    expect(mapa.get('docs/rascunhos/planejamentos/fatia-declarada.md')).toBeNull()
  })
})
