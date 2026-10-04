import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from './vitest-local.ts'
import { caminhos } from '../.mentor/scripts/arquivos.ts'

describe('Instruções do núcleo e habilidade de planejamento (Fatia F)', () => {
  const c = caminhos()

  it('a skill canônica .mentor/skills/planejamento/SKILL.md existe e possui frontmatter e diretrizes essenciais', () => {
    const caminhoSkill = join(c.pacote, 'skills', 'planejamento', 'SKILL.md')
    expect(existsSync(caminhoSkill)).toBe(true)

    const conteudo = readFileSync(caminhoSkill, 'utf8')
    expect(conteudo).toContain('name: planejamento')
    expect(conteudo).toContain('description:')

    // Diretrizes essenciais de descoberta e engenharia
    expect(conteudo).toContain('contexto.json')
    expect(conteudo).toContain('consistencia-do-projeto')
    expect(conteudo).toContain('decisoes_aplicaveis')
    expect(conteudo).toContain('reuso')
    expect(conteudo).toContain('habilidades')
    expect(conteudo).toContain('avaliacao')
    expect(conteudo).toContain('Rolling Wave Planning')

    // Deve apontar expressamente para o processo
    expect(conteudo).toContain('.mentor/processos/planejamento.md')
  })

  it('o processo .mentor/processos/planejamento.md detalha ondas, os 2 níveis, 5 eixos e replanejamento', () => {
    const caminhoProcesso = join(c.pacote, 'processos', 'planejamento.md')
    expect(existsSync(caminhoProcesso)).toBe(true)

    const conteudo = readFileSync(caminhoProcesso, 'utf8')
    expect(conteudo).toContain('carrega_quando: planejamento prévio, planejamento individual ou replanejamento')

    // 2 níveis
    expect(conteudo).toContain('Dois Níveis de Planejamento')
    expect(conteudo).toContain('Nível 1: Planejamento Prévio')
    expect(conteudo).toContain('Nível 2: Planejamento Individual')

    // Ondas
    expect(conteudo).toContain('Rolling Wave Planning')

    // 5 eixos e 4 dimensões de complexidade
    expect(conteudo).toContain('Tamanho / Carga')
    expect(conteudo).toContain('Complexidade')
    expect(conteudo).toContain('Dimensão Dominante')
    expect(conteudo).toContain('Perfil de Modelo')
    expect(conteudo).toContain('Effort')
    expect(conteudo).toContain('incerteza')
    expect(conteudo).toContain('profundidade_raciocinio')
    expect(conteudo).toContain('acoplamento')
    expect(conteudo).toContain('validacao_discriminatoria')

    // Preservação e memória operacional
    expect(conteudo).toContain('mentor:plano:inicio')
    expect(conteudo).toContain('mentor:memoria')

    // Replanejamento e não auto-invalidação
    expect(conteudo).toContain('Diferenças materiais exigem nova aprovação no Portão 1')
    expect(conteudo).toContain('Leitura Somente-Leitura')
  })

  it('o núcleo (.mentor/nucleo.md) ordena o carregamento explícito da skill e processo de planejamento', () => {
    const caminhoNucleo = join(c.pacote, 'nucleo.md')
    const conteudo = readFileSync(caminhoNucleo, 'utf8')

    // Seção 4 cita o processo de planejamento
    expect(conteudo).toContain('processos/planejamento.md')
    expect(conteudo).toContain('skill `planejamento`')
    expect(conteudo).toContain('decisões aplicáveis')
    expect(conteudo).toContain('reuso')
    expect(conteudo).toContain('habilidades de execução')
    expect(conteudo).toContain('avaliação')

    // Seção 9 ordena carregamento obrigatório
    expect(conteudo).toContain('| Planejamento prévio, individual ou replanejamento | a skill `planejamento` e `processos/planejamento.md` |')
    expect(conteudo).toContain('Carregamento de planejamento:')
  })

  it('processos/tarefa.md e processos/rascunho.md referenciam o processo e skill de planejamento', () => {
    const caminhoTarefa = join(c.pacote, 'processos', 'tarefa.md')
    const conteudoTarefa = readFileSync(caminhoTarefa, 'utf8')
    expect(conteudoTarefa).toContain('processos/planejamento.md')
    expect(conteudoTarefa).toContain('skill **`planejamento`**')

    const caminhoRascunho = join(c.pacote, 'processos', 'rascunho.md')
    const conteudoRascunho = readFileSync(caminhoRascunho, 'utf8')
    expect(conteudoRascunho).toContain('processos/planejamento.md')
    expect(conteudoRascunho).toContain('skill **`planejamento`**')
    expect(conteudoRascunho).toContain('Planejamentos prévios e épicos')
  })
})
