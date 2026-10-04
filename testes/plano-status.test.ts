import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from './vitest-local.ts'
import { carregarPlanos, salvarPlanos, statusPlano, type RegistroPlano } from '../.mentor/scripts/cmd-plano.ts'
import { caminhos } from '../.mentor/scripts/arquivos.ts'

function sha256(conteudo: string): string {
  return createHash('sha256').update(conteudo, 'utf8').digest('hex')
}

describe('mentor plano status (Fatia G)', () => {
  it('retorna status derivado dos planos registrados e tarefas vinculadas', () => {
    const resultados = statusPlano()
    expect(resultados.length).toBeGreaterThan(0)

    const fatiaG = resultados.find((r) => r.plano.id === 'PLAN-fatia-g-plano-status-md')
    expect(fatiaG).toBeDefined()
    if (!fatiaG) return

    expect(fatiaG.arquivo_existe).toBe(true)
    expect(fatiaG.revisao_valida).toBe(true)
    expect(fatiaG.sha256_atual).toBe(fatiaG.plano.sha256)
    expect(fatiaG.resumo_tarefas.total).toBeGreaterThan(0)

    const task11 = fatiaG.tarefas_vinculadas.find((t) => t.id === 'TASK-CHORE-011')
    expect(task11).toBeDefined()
    if (!task11) return

    expect(task11.revisao_valida).toBe(true)
    expect(task11.criterios_total).toBe(4)
    expect(task11.fila).toBe('ciclo')
  })

  it('permite filtrar por ID ou por caminho de arquivo e falha em planos inexistentes', () => {
    const porId = statusPlano('PLAN-fatia-g-plano-status-md')
    expect(porId.length).toBe(1)
    expect(porId[0]!.plano.id).toBe('PLAN-fatia-g-plano-status-md')

    // Case insensitive
    const porIdMinusc = statusPlano('plan-fatia-g-plano-status-md')
    expect(porIdMinusc.length).toBe(1)
    expect(porIdMinusc[0]!.plano.id).toBe('PLAN-fatia-g-plano-status-md')

    // Por arquivo
    const porArquivo = statusPlano(undefined, {
      arquivo: 'docs/rascunhos/planejamentos/2026-10-03--evolucao-do-planejamento-do-mentor/fatias/fatia-g-plano-status.md',
    })
    expect(porArquivo.length).toBe(1)
    expect(porArquivo[0]!.plano.id).toBe('PLAN-fatia-g-plano-status-md')

    // Inexistente
    expect(() => statusPlano('PLAN-INEXISTENTE-12345')).toThrow('nao encontrado')
  })

  it('detecta divergência de revisão e ausência de arquivo em plano registrado', () => {
    const c = caminhos()
    const planosOriginais = carregarPlanos()
    const tempDir = mkdtempSync(join(tmpdir(), 'mentor-status-plano-'))

    try {
      const relDoc = 'docs/rascunhos/planejamentos/temp-divergente-teste.md'
      const absDoc = join(c.raiz, relDoc)
      const conteudoV1 = '# Plano de Teste Temporario V1\nConteudo original'
      writeFileSync(absDoc, conteudoV1, 'utf8')

      const hashV1 = sha256(conteudoV1)
      const planoMock: RegistroPlano = {
        id: 'PLAN-TEMP-TESTE-DIV',
        titulo: 'Plano Temp Teste Divergente',
        arquivo: relDoc,
        sha256: hashV1,
        secao: null,
        registrado_em: '04/10/26',
      }

      salvarPlanos([...planosOriginais, planoMock])

      // Consulta v1: deve ser válida
      const resV1 = statusPlano('PLAN-TEMP-TESTE-DIV')
      expect(resV1.length).toBe(1)
      expect(resV1[0]!.arquivo_existe).toBe(true)
      expect(resV1[0]!.revisao_valida).toBe(true)
      expect(resV1[0]!.sha256_atual).toBe(hashV1)

      // Altera arquivo para v2: divergência de revisão
      const conteudoV2 = '# Plano de Teste Temporario V2\nModificado externamente'
      writeFileSync(absDoc, conteudoV2, 'utf8')
      const hashV2 = sha256(conteudoV2)

      const resV2 = statusPlano('PLAN-TEMP-TESTE-DIV')
      expect(resV2.length).toBe(1)
      expect(resV2[0]!.arquivo_existe).toBe(true)
      expect(resV2[0]!.revisao_valida).toBe(false)
      expect(resV2[0]!.sha256_atual).toBe(hashV2)

      // Exclui arquivo: arquivo_existe false e revisao_valida false
      rmSync(absDoc, { force: true })
      const resV3 = statusPlano('PLAN-TEMP-TESTE-DIV')
      expect(resV3.length).toBe(1)
      expect(resV3[0]!.arquivo_existe).toBe(false)
      expect(resV3[0]!.revisao_valida).toBe(false)
      expect(resV3[0]!.sha256_atual).toBeNull()
    } finally {
      salvarPlanos(planosOriginais)
      const relDoc = 'docs/rascunhos/planejamentos/temp-divergente-teste.md'
      const absDoc = join(c.raiz, relDoc)
      if (existsSync(absDoc)) rmSync(absDoc, { force: true })
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('garante comportamento estritamente somente-leitura sem modificar arquivos ou invalidar hashes', () => {
    const c = caminhos()
    const arquivoPlanos = join(c.docs, 'planos.json')
    const hashPlanosAntes = sha256(readFileSync(arquivoPlanos, 'utf8'))
    const mtimePlanosAntes = statSync(arquivoPlanos).mtimeMs

    const fatiaGArq = join(c.raiz, 'docs/rascunhos/planejamentos/2026-10-03--evolucao-do-planejamento-do-mentor/fatias/fatia-g-plano-status.md')
    const hashFatiaGAntes = sha256(readFileSync(fatiaGArq, 'utf8'))

    // Executa a consulta de status
    statusPlano()

    const hashPlanosDepois = sha256(readFileSync(arquivoPlanos, 'utf8'))
    const hashFatiaGDepois = sha256(readFileSync(fatiaGArq, 'utf8'))

    expect(hashPlanosDepois).toBe(hashPlanosAntes)
    expect(hashFatiaGDepois).toBe(hashFatiaGAntes)
    expect(statSync(arquivoPlanos).mtimeMs).toBe(mtimePlanosAntes)
  })

  it('emite JSON estruturado válido quando flag --json é passada', () => {
    const logs: string[] = []
    const originalLog = console.log
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(' '))
    }

    try {
      const retorno = statusPlano('PLAN-fatia-g-plano-status-md', { json: 'true' })
      expect(logs.length).toBeGreaterThan(0)
      const parsed = JSON.parse(logs[logs.length - 1]!)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed.length).toBe(1)
      expect(parsed[0].plano.id).toBe('PLAN-fatia-g-plano-status-md')
      expect(parsed[0].revisao_valida).toBe(true)
      expect(parsed[0]).toEqual(retorno[0])
    } finally {
      console.log = originalLog
    }
  })

  it('emite relatório amigável formatado no modo texto padrão', () => {
    const logs: string[] = []
    const originalLog = console.log
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(' '))
    }

    try {
      statusPlano('PLAN-fatia-g-plano-status-md')
      const saidaCompleta = logs.join('\n')
      expect(saidaCompleta).toContain('STATUS DE PLANOS')
      expect(saidaCompleta).toContain('VIGENTE / ÍNTEGRA')
      expect(saidaCompleta).toContain('TASK-CHORE-011')
      expect(saidaCompleta).toContain('Consulta derivada somente-leitura')
    } finally {
      console.log = originalLog
    }
  })
})
