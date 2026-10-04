import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from './vitest-local.ts'
import { caminhos } from '../.mentor/scripts/arquivos.ts'

describe('Habilidades de UI-Design, Test-Design e Caracterização (Fatia H)', () => {
  const c = caminhos()

  it('a skill ui-design cobre UI existente, inventário de reuso, primitivas vs domínio e fronteiras', () => {
    const caminhoUi = join(c.pacote, 'skills', 'ui-design', 'SKILL.md')
    expect(existsSync(caminhoUi)).toBe(true)

    const conteudo = readFileSync(caminhoUi, 'utf8')
    expect(conteudo).toContain('name: ui-design')
    expect(conteudo).toContain('description:')

    // Inventário de reuso e UI existente
    expect(conteudo).toContain('plano.reuso')
    expect(conteudo).toContain('Primitivas de Design System vs Componentes de Domínio')
    expect(conteudo).toContain('Critérios para Criar Nova Primitiva')

    // Controles nativos e conformidade
    expect(conteudo).toContain('react/forbid-elements')

    // Fronteira com referências externas
    expect(conteudo).toContain('referencia-para-react')

    // Preservação de comportamento e acessibilidade
    expect(conteudo).toContain('Preservação de Comportamento')
    expect(conteudo).toContain('Acessibilidade')
  })

  it('a skill test-design cobre testes de caracterização antes de refatorar e validação discriminatória de contratos', () => {
    const caminhoTest = join(c.pacote, 'skills', 'test-design', 'SKILL.md')
    expect(existsSync(caminhoTest)).toBe(true)

    const conteudo = readFileSync(caminhoTest, 'utf8')
    expect(conteudo).toContain('name: test-design')
    expect(conteudo).toContain('description:')

    // Testes de caracterização
    expect(conteudo).toContain('Testes de Caracterização Antes de Refatorar')
    expect(conteudo).toContain('characterization tests')

    // Validação discriminatória de contratos
    expect(conteudo).toContain('Validação Discriminatória de Contratos')
    expect(conteudo).toContain('Teste Comportamento Público')
    expect(conteudo).toContain('Teste Discriminatório (Sem Falsos Verdes)')

    // TDD e AAA
    expect(conteudo).toContain('Ciclo TDD')
    expect(conteudo).toContain('Arrange, Act, Assert')
  })
})
