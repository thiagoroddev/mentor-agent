import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from './vitest-local.ts'
import { caminhos, listar } from '../.mentor/scripts/arquivos.ts'
import { arquivoDaAdr, adrCitaRestricao } from '../.mentor/scripts/restricoes.ts'

describe('Fatia A: Origem configuravel de ADRs no contexto', () => {
  let tempRoot: string

  beforeAll(() => {
    tempRoot = mkdtempSync(join(tmpdir(), 'mentor-adrs-cfg-'))
  })

  afterAll(() => {
    rmSync(tempRoot, { recursive: true, force: true })
  })

  it('1. fallback padrao: usa docs-mentor/arquitetura/ADR quando nao configurado', () => {
    const projeto = join(tempRoot, 'p1-padrao')
    mkdirSync(join(projeto, 'docs-mentor'), { recursive: true })
    writeFileSync(
      join(projeto, 'docs-mentor', 'contexto.json'),
      JSON.stringify({ arquitetura: {}, convencoes: {} }, null, 2),
    )

    const c = caminhos(projeto)
    expect(c.adr).toBe(resolve(projeto, 'docs-mentor', 'arquitetura', 'ADR'))
  })

  it('2. fallback legado: usa docs/arquitetura/ADR em instalacao legada docs/', () => {
    const projeto = join(tempRoot, 'p2-legado')
    mkdirSync(join(projeto, 'docs'), { recursive: true })
    writeFileSync(
      join(projeto, 'docs', 'contexto.json'),
      JSON.stringify({ arquitetura: {}, convencoes: {} }, null, 2),
    )

    const c = caminhos(projeto)
    expect(c.adr).toBe(resolve(projeto, 'docs', 'arquitetura', 'ADR'))
  })

  it('3. configuracao em arquitetura.onde_ficam_as_adrs resolve corretamente', () => {
    const projeto = join(tempRoot, 'p3-custom-arq')
    const pastaAdrs = join(projeto, 'docs', 'arquitetura', 'ADR')
    mkdirSync(pastaAdrs, { recursive: true })
    mkdirSync(join(projeto, 'docs-mentor'), { recursive: true })

    writeFileSync(
      join(pastaAdrs, 'ADR-001-decisao-piloto.md'),
      '# ADR-001: Decisao de teste\n\nTexto citando restricao R1.\n',
    )
    writeFileSync(
      join(pastaAdrs, 'ADR-002-outra-decisao.md'),
      '# ADR-002: Outra decisao\n',
    )

    writeFileSync(
      join(projeto, 'docs-mentor', 'contexto.json'),
      JSON.stringify({
        arquitetura: {
          onde_ficam_as_adrs: 'docs/arquitetura/ADR',
        },
      }, null, 2),
    )

    const c = caminhos(projeto)
    expect(c.adr).toBe(resolve(pastaAdrs))
    expect(listar(c.adr, '.md').length).toBe(2)

    // restricoes.ts encontra a ADR na pasta configurada
    const adrEncontrada = arquivoDaAdr(c, 'ADR-001')
    expect(adrEncontrada).not.toBeNull()
    expect(adrEncontrada?.replace(/\\/g, '/')).toContain('docs/arquitetura/ADR/ADR-001-decisao-piloto.md')
    expect(adrCitaRestricao(c, 'ADR-001', 'restricao R1')).toBe(true)
  })

  it('4. configuracao em convencoes.onde_ficam_as_adrs como alternativa', () => {
    const projeto = join(tempRoot, 'p4-custom-conv')
    const pastaAdrs = join(projeto, 'minhas-adrs')
    mkdirSync(pastaAdrs, { recursive: true })
    mkdirSync(join(projeto, 'docs-mentor'), { recursive: true })

    writeFileSync(
      join(pastaAdrs, 'ADR-009-regra.md'),
      '# ADR-009\n',
    )

    writeFileSync(
      join(projeto, 'docs-mentor', 'contexto.json'),
      JSON.stringify({
        arquitetura: {},
        convencoes: {
          onde_ficam_as_adrs: 'minhas-adrs',
        },
      }, null, 2),
    )

    const c = caminhos(projeto)
    expect(c.adr).toBe(resolve(pastaAdrs))
    expect(listar(c.adr, '.md').length).toBe(1)
  })

  it('5. rejeita path traversal relativo (../../fora)', () => {
    const projeto = join(tempRoot, 'p5-traversal-rel')
    mkdirSync(join(projeto, 'docs-mentor'), { recursive: true })
    writeFileSync(
      join(projeto, 'docs-mentor', 'contexto.json'),
      JSON.stringify({
        arquitetura: {
          onde_ficam_as_adrs: '../../fora-do-projeto',
        },
      }, null, 2),
    )

    expect(() => caminhos(projeto)).toThrow(/escapa da raiz do projeto/)
  })

  it('6. rejeita caminho absoluto externo fora da raiz do projeto', () => {
    const projeto = join(tempRoot, 'p6-traversal-abs')
    mkdirSync(join(projeto, 'docs-mentor'), { recursive: true })
    writeFileSync(
      join(projeto, 'docs-mentor', 'contexto.json'),
      JSON.stringify({
        arquitetura: {
          onde_ficam_as_adrs: '/tmp/adrs-fora-absoluto',
        },
      }, null, 2),
    )

    expect(() => caminhos(projeto)).toThrow(/escapa da raiz do projeto/)
  })

  it('7. rejeita symlink apontando para fora da raiz do projeto', () => {
    const projeto = join(tempRoot, 'p7-symlink-externo')
    const pastaExterna = join(tempRoot, 'pasta-real-externa')
    mkdirSync(pastaExterna, { recursive: true })
    mkdirSync(join(projeto, 'docs-mentor'), { recursive: true })

    const linkInterno = join(projeto, 'adrs-link')
    try {
      symlinkSync(pastaExterna, linkInterno, 'dir')
    } catch {
      // Se o SO nao permitir symlinks para usuarios normais, ignora este caso especifico
      return
    }

    writeFileSync(
      join(projeto, 'docs-mentor', 'contexto.json'),
      JSON.stringify({
        arquitetura: {
          onde_ficam_as_adrs: 'adrs-link',
        },
      }, null, 2),
    )

    expect(() => caminhos(projeto)).toThrow(/link simbolico/)
  })
})
