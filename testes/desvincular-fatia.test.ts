import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from './vitest-local.ts'
import { caminhos } from '../.mentor/scripts/arquivos.ts'
import { desvincular } from '../.mentor/scripts/cmd-fila.ts'
import { MARCADOR, type Tarefa } from '../.mentor/scripts/tipos.ts'

describe('mentor task desvincular (TASK-CHORE-020)', () => {
  function prepararCenario() {
    const raiz = mkdtempSync(join(tmpdir(), 'mentor-desvincular-'))
    const docs = join(raiz, 'docs-mentor')
    const abertas = join(docs, 'tarefas', 'abertas')
    const concluidas = join(docs, 'tarefas', 'concluidas')
    mkdirSync(abertas, { recursive: true })
    mkdirSync(concluidas, { recursive: true })

    const contexto = {
      _meta: { schema: 'contexto-projeto/1', versao_do_pacote: '0.15.0' },
      projeto: { nome: 'teste-desvincular' },
      limites: { em_execucao: 1, ciclo_tarefas: 12 },
      gates: {},
    }
    writeFileSync(join(docs, 'contexto.json'), JSON.stringify(contexto, null, 2))

    const epico1: Tarefa = {
      id: 'TASK-RF-001',
      tipo: 'RF',
      titulo: 'Epico Original 1',
      fatia_de: null,
      estado: 'aberta',
      cerimonia: 'Standard',
      perfil: null,
      valor: 'importante',
      urgencia: 'normal',
      esforco: { humano: 'G', ia: 'G' },
      depende_de: [],
      ordem_motivo: null,
      fila: 'ciclo',
      ordem: null,
      origem: 'titulo-autossuficiente',
      requisitos: [],
      sem_requisito_motivo: null,
      criada_em: '05/10/26 10:00',
      iniciada_em: null,
      commit_base: null,
      concluida_em: null,
      plano_do_epico: {
        objetivo: 'Objetivo do epico',
        problema_canonico: 'sem nome canonico',
        hipotese: 'hipotese',
        sinal_de_desvio: 'desvio',
        revisoes: [],
      },
      plano: {
        muda: [],
        criterios_aceite: [],
        pedido_original: null,
        solucao_sugerida: null,
        alternativas_profissionais: [],
        problema_canonico: 'sem nome canonico',
        discordancia: { o_que_faria_diferente: null, o_que_preocupa: null, o_que_existe_pronto_80_porcento: null },
        impacto: null,
        riscos: [],
        dependencias_novas: [],
        proporcionalidade: null,
        restricoes_reavaliadas: [],
        meio_de_validacao: null,
        composicao: null,
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

    const fatia1: Tarefa = {
      ...epico1,
      id: 'TASK-RF-002',
      titulo: 'Fatia 1 do Epico 1',
      fatia_de: 'TASK-RF-001',
      esforco: { humano: 'M', ia: 'M' },
      plano_do_epico: null,
      plano: {
        ...epico1.plano,
        composicao: {
          o_que_esta_fatia_entrega: 'Entrega 1',
          a_direcao_se_mantem: true,
          porque: 'Direcao mantida',
        },
      },
    }

    const fatia2: Tarefa = {
      ...epico1,
      id: 'TASK-RF-003',
      titulo: 'Fatia 2 do Epico 1',
      fatia_de: 'TASK-RF-001',
      esforco: { humano: 'M', ia: 'M' },
      depende_de: ['TASK-RF-002'],
      ordem_motivo: 'fatia 2 depende da fatia 1',
      plano_do_epico: null,
      plano: {
        ...epico1.plano,
        composicao: {
          o_que_esta_fatia_entrega: 'Entrega 2',
          a_direcao_se_mantem: true,
          porque: 'Direcao mantida',
        },
      },
    }

    const epico2: Tarefa = {
      ...epico1,
      id: 'TASK-RF-010',
      titulo: 'Epico Destino 2',
      plano_do_epico: {
        objetivo: 'Segundo epico',
        problema_canonico: 'sem nome canonico',
        hipotese: 'hipotese 2',
        sinal_de_desvio: 'desvio 2',
        revisoes: [],
      },
    }

    const tarefaAvulsa: Tarefa = {
      ...epico1,
      id: 'TASK-RF-020',
      titulo: 'Tarefa Avulsa',
      plano_do_epico: null,
    }

    const tarefaConcluida: Tarefa = {
      ...fatia1,
      id: 'TASK-RF-030',
      titulo: 'Fatia Concluida',
      estado: 'concluida',
      concluida_em: '05/10/26 12:00',
    }

    writeFileSync(join(abertas, 'TASK-RF-001.json'), JSON.stringify(epico1, null, 2))
    writeFileSync(join(abertas, 'TASK-RF-002.json'), JSON.stringify(fatia1, null, 2))
    writeFileSync(join(abertas, 'TASK-RF-003.json'), JSON.stringify(fatia2, null, 2))
    writeFileSync(join(abertas, 'TASK-RF-010.json'), JSON.stringify(epico2, null, 2))
    writeFileSync(join(abertas, 'TASK-RF-020.json'), JSON.stringify(tarefaAvulsa, null, 2))
    writeFileSync(join(concluidas, '2026-10-05--12h00--TASK-RF-030.json'), JSON.stringify(tarefaConcluida, null, 2))

    return { raiz, docs, abertas, concluidas }
  }

  function lerJson<T>(caminho: string): T {
    return JSON.parse(readFileSync(caminho, 'utf8')) as T
  }

  it('1. desvincula fatia para tarefa avulsa, zera ordem_motivo, limpa composicao por higiene e grava revisao no pai', () => {
    const { raiz, abertas, docs } = prepararCenario()
    const anteriorRaiz = process.env.MENTOR_RAIZ
    process.env.MENTOR_RAIZ = raiz

    try {
      desvincular('TASK-RF-003', { motivo: 'promovida a tarefa independente' })

      const t3 = lerJson<Tarefa>(join(abertas, 'TASK-RF-003.json'))
      expect(t3.fatia_de).toBeNull()
      expect(t3.ordem_motivo).toBeNull()
      expect(t3.plano.composicao).toBeNull()
      // Mantém dependências de ex-irmãs intactas
      expect(t3.depende_de).toEqual(['TASK-RF-002'])

      // Rastro no épico pai
      const pai = lerJson<Tarefa>(join(abertas, 'TASK-RF-001.json'))
      expect(pai.plano_do_epico?.revisoes?.length).toBe(1)
      const rev = pai.plano_do_epico?.revisoes?.[0]
      expect(rev?.apos_fatia).toBe('TASK-RF-003')
      expect(rev?.motivo).toContain('promovida a tarefa independente')

      // Vistas regeneradas
      const backlog = readFileSync(join(docs, 'tarefas', 'backlog.md'), 'utf8')
      expect(backlog).toContain('`TASK-RF-003`')
    } finally {
      process.env.MENTOR_RAIZ = anteriorRaiz
      rmSync(raiz, { recursive: true, force: true })
    }
  })

  it('2. transfere fatia para outro epico (--mover-para), reinicia composicao com MARCADOR e grava rastro em ambos', () => {
    const { raiz, abertas } = prepararCenario()
    const anteriorRaiz = process.env.MENTOR_RAIZ
    process.env.MENTOR_RAIZ = raiz

    try {
      desvincular('TASK-RF-002', {
        'mover-para': 'TASK-RF-010',
        motivo: 'remanejada para modulo B',
      })

      const t2 = lerJson<Tarefa>(join(abertas, 'TASK-RF-002.json'))
      expect(t2.fatia_de).toBe('TASK-RF-010')
      // Composição reiniciada com esqueleto e marcador para cobrar novo preenchimento
      expect(t2.plano.composicao).toBeDefined()
      expect(t2.plano.composicao?.o_que_esta_fatia_entrega).toContain(MARCADOR)
      expect(t2.plano.composicao?.porque).toContain(MARCADOR)
      expect(t2.plano.composicao?.a_direcao_se_mantem).toBe(true)

      // Rastro no pai original
      const pai1 = lerJson<Tarefa>(join(abertas, 'TASK-RF-001.json'))
      expect(pai1.plano_do_epico?.revisoes?.length).toBe(1)
      expect(pai1.plano_do_epico?.revisoes?.[0]?.motivo).toContain('TASK-RF-010')

      // Rastro no novo pai
      const pai2 = lerJson<Tarefa>(join(abertas, 'TASK-RF-010.json'))
      expect(pai2.plano_do_epico?.revisoes?.length).toBe(1)
      expect(pai2.plano_do_epico?.revisoes?.[0]?.motivo).toContain('TASK-RF-001')
    } finally {
      process.env.MENTOR_RAIZ = anteriorRaiz
      rmSync(raiz, { recursive: true, force: true })
    }
  })

  it('3. recusa desvincular sem --motivo', () => {
    const { raiz } = prepararCenario()
    const anteriorRaiz = process.env.MENTOR_RAIZ
    process.env.MENTOR_RAIZ = raiz

    try {
      expect(() => desvincular('TASK-RF-002', {})).toThrow('Falta --motivo')
    } finally {
      process.env.MENTOR_RAIZ = anteriorRaiz
      rmSync(raiz, { recursive: true, force: true })
    }
  })

  it('4. recusa desvincular tarefa que ja e avulsa', () => {
    const { raiz } = prepararCenario()
    const anteriorRaiz = process.env.MENTOR_RAIZ
    process.env.MENTOR_RAIZ = raiz

    try {
      expect(() => desvincular('TASK-RF-020', { motivo: 'tentativa invalida' })).toThrow('ja e uma tarefa avulsa')
    } finally {
      process.env.MENTOR_RAIZ = anteriorRaiz
      rmSync(raiz, { recursive: true, force: true })
    }
  })

  it('5. recusa desvincular tarefa concluida ou cancelada com mensagem especifica', () => {
    const { raiz } = prepararCenario()
    const anteriorRaiz = process.env.MENTOR_RAIZ
    process.env.MENTOR_RAIZ = raiz

    try {
      expect(() => desvincular('TASK-RF-030', { motivo: 'tentativa em concluida' })).toThrow('concluida')
    } finally {
      process.env.MENTOR_RAIZ = anteriorRaiz
      rmSync(raiz, { recursive: true, force: true })
    }
  })

  it('6. recusa mover para epico inexistente, para si mesma, ou para destino que nao e epico (sem plano_do_epico)', () => {
    const { raiz } = prepararCenario()
    const anteriorRaiz = process.env.MENTOR_RAIZ
    process.env.MENTOR_RAIZ = raiz

    try {
      // Inexistente
      expect(() => desvincular('TASK-RF-002', { 'mover-para': 'TASK-INEXISTENTE', motivo: 'teste' }))
        .toThrow('nao existe')

      // Para si mesma
      expect(() => desvincular('TASK-RF-002', { 'mover-para': 'TASK-RF-002', motivo: 'teste' }))
        .toThrow('nao pode ser fatia de si mesma')

      // Para tarefa avulsa sem plano_do_epico
      expect(() => desvincular('TASK-RF-002', { 'mover-para': 'TASK-RF-020', motivo: 'teste' }))
        .toThrow('plano_do_epico')
    } finally {
      process.env.MENTOR_RAIZ = anteriorRaiz
      rmSync(raiz, { recursive: true, force: true })
    }
  })

  it('7. detecta ciclo e recusa mover para descendente', () => {
    const { raiz, abertas } = prepararCenario()
    const anteriorRaiz = process.env.MENTOR_RAIZ
    process.env.MENTOR_RAIZ = raiz

    try {
      // Cria hierarquia com epico filho
      const epicoFilho: Tarefa = {
        ...lerJson<Tarefa>(join(abertas, 'TASK-RF-001.json')),
        id: 'TASK-RF-040',
        titulo: 'Sub-epico filho de RF-002',
        fatia_de: 'TASK-RF-002',
        plano_do_epico: {
          objetivo: 'sub-epico',
          problema_canonico: 'sem nome canonico',
          hipotese: 'hip',
          sinal_de_desvio: 'desv',
          revisoes: [],
        },
      }
      writeFileSync(join(abertas, 'TASK-RF-040.json'), JSON.stringify(epicoFilho, null, 2))

      // Tenta mover TASK-RF-002 para TASK-RF-040 (que é seu descendente!)
      expect(() => desvincular('TASK-RF-002', { 'mover-para': 'TASK-RF-040', motivo: 'geraria ciclo' }))
        .toThrow('Ciclo detectado')
    } finally {
      process.env.MENTOR_RAIZ = anteriorRaiz
      rmSync(raiz, { recursive: true, force: true })
    }
  })

  it('8. emite aviso quando a fatia desvinculada for a ultima ativa do epico', () => {
    const { raiz } = prepararCenario()
    const anteriorRaiz = process.env.MENTOR_RAIZ
    process.env.MENTOR_RAIZ = raiz

    const avisos: string[] = []
    const warnOriginal = console.warn
    console.warn = (msg: string) => avisos.push(msg)

    try {
      // Desvincula fatia 1
      desvincular('TASK-RF-002', { motivo: 'primeira saida' })
      // Desvincula fatia 2 (agora é a última!)
      desvincular('TASK-RF-003', { motivo: 'segunda saida (ultima)' })

      expect(avisos.some((a) => a.includes('ultima fatia') || a.includes('nao possui mais fatias'))).toBe(true)
    } finally {
      console.warn = warnOriginal
      process.env.MENTOR_RAIZ = anteriorRaiz
      rmSync(raiz, { recursive: true, force: true })
    }
  })
})
