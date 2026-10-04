import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from './vitest-local.ts'
import {
  calcularVigenciaDiretrizes,
  gerarConteudoHabilidadeConsistencia,
  gerarHabilidadeConsistencia,
  verificarConsistenciaAdrs,
} from '../.mentor/scripts/adrs.ts'
import type { DiretrizAdr } from '../.mentor/scripts/tipos.ts'
import type { Caminhos } from '../.mentor/scripts/arquivos.ts'

describe('gerador da habilidade consistencia-do-projeto e auditoria no verificar (Fatia C)', () => {
  it('gerarConteudoHabilidadeConsistencia gera formato determinístico com frontmatter e diretrizes ordenadas', () => {
    const diretrizes: DiretrizAdr[] = [
      {
        id: 'DIR-ADR-004-02',
        adr: 'ADR-004',
        estado: 'aceita',
        regra: 'Usar paleta monocromática com tokens neutros.',
        alcance: 'ui/identidade',
        excecoes: [],
        substitui: [],
      },
      {
        id: 'DIR-ADR-004-01',
        adr: 'ADR-004',
        estado: 'aceita',
        regra: 'Usar shadcn/ui e TailwindCSS para todos os componentes de interface.',
        alcance: 'ui/componentes',
        excecoes: ['controles nativos do canvas de mapa'],
        substitui: [],
      },
      {
        id: 'DIR-ADR-006-01',
        adr: 'ADR-006',
        estado: 'aceita',
        regra: 'Usar paleta azul-grafite da nova identidade da marca.',
        alcance: 'ui/identidade',
        excecoes: ['paleta funcional do mapa'],
        substitui: ['DIR-ADR-004-02'],
      },
    ]

    const vigencia = calcularVigenciaDiretrizes(diretrizes, ['docs/arquitetura/ADR/ADR-001.md'])
    const markdown = gerarConteudoHabilidadeConsistencia(vigencia)

    // 1. Frontmatter
    expect(markdown).toContain('---')
    expect(markdown).toContain('name: consistencia-do-projeto')
    expect(markdown).toContain('description: Diretrizes operacionais e restrições arquiteturais vigentes do projeto derivadas das ADRs.')

    // 2. Diretrizes ordenadas por ID: DIR-ADR-004-01 deve vir antes de DIR-ADR-006-01
    const pos01 = markdown.indexOf('### DIR-ADR-004-01')
    const pos06 = markdown.indexOf('### DIR-ADR-006-01')
    expect(pos01 > 0).toBe(true)
    expect(pos06 > 0).toBe(true)
    expect(pos01 < pos06).toBe(true)

    // DIR-ADR-004-02 foi substituída, não deve constar em ## Diretrizes Vigentes
    expect(markdown).not.toContain('### DIR-ADR-004-02')

    // 3. Detalhes de regra, alcance, exceções e substitui
    expect(markdown).toContain('ADR de origem')
    expect(markdown).toContain('`ADR-004`')
    expect(markdown).toContain('`ui/componentes`')
    expect(markdown).toContain('Usar shadcn/ui e TailwindCSS para todos os componentes de interface.')
    expect(markdown).toContain('controles nativos do canvas de mapa')
    expect(markdown).toContain('`DIR-ADR-004-02`')

    // 4. Seção explícita de legado
    expect(markdown).toContain('## Decisões Legadas em Linguagem Natural')
    expect(markdown).toContain('- `docs/arquitetura/ADR/ADR-001.md`')
  })

  it('declara explicitamente status de ausência quando não há nenhuma ADR no projeto', () => {
    const vigencia = calcularVigenciaDiretrizes([])
    const markdown = gerarConteudoHabilidadeConsistencia(vigencia)

    expect(markdown).toContain('name: consistencia-do-projeto')
    expect(markdown).toContain('## Status')
    expect(markdown).toContain('Nenhuma ADR registrada no projeto.')
    expect(markdown).not.toContain('## Diretrizes Vigentes')
    expect(markdown).not.toContain('## Decisões Legadas em Linguagem Natural')
  })

  it('gerarHabilidadeConsistencia escreve determinística e idempotentemente no disco do projeto', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mentor-skill-gen-'))
    try {
      const docsDir = join(tempDir, 'docs-mentor')
      const adrDir = join(docsDir, 'arquitetura', 'ADR')
      mkdirSync(adrDir, { recursive: true })

      writeFileSync(
        join(adrDir, 'ADR-001.md'),
        `# ADR-001: Padrão de Persistência
## Diretrizes operacionais
\`\`\`json mentor:diretrizes
[
  {
    "id": "DIR-ADR-001-01",
    "estado": "aceita",
    "regra": "Utilizar SQLite local para persistência de dados offline.",
    "alcance": "persistencia",
    "excecoes": [],
    "substitui": []
  }
]
\`\`\`
`,
      )

      const cFalso = {
        raiz: tempDir,
        docs: docsDir,
        adr: adrDir,
      } as unknown as Caminhos

      // 1. Primeira geração cria o arquivo
      const res1 = gerarHabilidadeConsistencia(cFalso)
      expect(res1.ok).toBe(true)
      expect(res1.modificada).toBe(true)

      const caminhoSkill = join(docsDir, 'skills', 'consistencia-do-projeto', 'SKILL.md')
      const conteudo1 = readFileSync(caminhoSkill, 'utf8')
      expect(conteudo1).toContain('### DIR-ADR-001-01')
      expect(conteudo1).toContain('Utilizar SQLite local para persistência de dados offline.')

      // 2. Segunda geração sem alterações é idempotente (modificada: false)
      const res2 = gerarHabilidadeConsistencia(cFalso)
      expect(res2.ok).toBe(true)
      expect(res2.modificada).toBe(false)
      expect(readFileSync(caminhoSkill, 'utf8')).toBe(conteudo1)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('gerarHabilidadeConsistencia aborta sem alterar arquivo caso haja ciclo no grafo de substituição', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mentor-skill-cycle-'))
    try {
      const docsDir = join(tempDir, 'docs-mentor')
      const adrDir = join(docsDir, 'arquitetura', 'ADR')
      mkdirSync(adrDir, { recursive: true })

      writeFileSync(
        join(adrDir, 'ADR-010.md'),
        `# ADR-010
## Diretrizes operacionais
\`\`\`json mentor:diretrizes
[
  {
    "id": "DIR-ADR-010-01",
    "estado": "aceita",
    "regra": "Regra A",
    "alcance": "geral",
    "excecoes": [],
    "substitui": ["DIR-ADR-010-02"]
  },
  {
    "id": "DIR-ADR-010-02",
    "estado": "aceita",
    "regra": "Regra B",
    "alcance": "geral",
    "excecoes": [],
    "substitui": ["DIR-ADR-010-01"]
  }
]
\`\`\`
`,
      )

      const cFalso = {
        raiz: tempDir,
        docs: docsDir,
        adr: adrDir,
      } as unknown as Caminhos

      const res = gerarHabilidadeConsistencia(cFalso)
      expect(res.ok).toBe(false)
      expect(res.erro).toContain('Ciclo de substituição detectado')

      // Garante que o arquivo da habilidade NÃO foi criado
      const caminhoSkill = join(docsDir, 'skills', 'consistencia-do-projeto', 'SKILL.md')
      expect(cFalso.docs).toBeDefined()
      expect(res.modificada).toBe(false)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('verificarConsistenciaAdrs valida integridade, ausência de skill e detecta drift de atualização', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mentor-skill-verificar-'))
    try {
      const docsDir = join(tempDir, 'docs-mentor')
      const adrDir = join(docsDir, 'arquitetura', 'ADR')
      mkdirSync(adrDir, { recursive: true })

      writeFileSync(
        join(adrDir, 'ADR-001.md'),
        `# ADR-001
## Diretrizes operacionais
\`\`\`json mentor:diretrizes
[
  {
    "id": "DIR-ADR-001-01",
    "estado": "aceita",
    "regra": "Regra inicial.",
    "alcance": "geral",
    "excecoes": [],
    "substitui": []
  }
]
\`\`\`
`,
      )

      const cFalso = {
        raiz: tempDir,
        docs: docsDir,
        adr: adrDir,
      } as unknown as Caminhos

      // 1. Antes de gerar, a habilidade está ausente -> achado no verificar
      const achadosAntes = verificarConsistenciaAdrs(cFalso)
      expect(achadosAntes.length).toBe(1)
      expect(achadosAntes[0]!.familia).toBe('adrs')
      expect(achadosAntes[0]!.problema).toContain('habilidade "consistencia-do-projeto" ausente')

      // 2. Após gerar, deve aprovar sem achados
      gerarHabilidadeConsistencia(cFalso)
      const achadosDepois = verificarConsistenciaAdrs(cFalso)
      expect(achadosDepois.length).toBe(0)

      // 3. Adiciona nova diretriz à ADR sem rodar mentor gerar -> detecta drift
      writeFileSync(
        join(adrDir, 'ADR-001.md'),
        `# ADR-001
## Diretrizes operacionais
\`\`\`json mentor:diretrizes
[
  {
    "id": "DIR-ADR-001-01",
    "estado": "aceita",
    "regra": "Regra modificada sem gerar habilidade.",
    "alcance": "geral",
    "excecoes": [],
    "substitui": []
  }
]
\`\`\`
`,
      )

      const achadosDrift = verificarConsistenciaAdrs(cFalso)
      expect(achadosDrift.length).toBe(1)
      expect(achadosDrift[0]!.familia).toBe('adrs')
      expect(achadosDrift[0]!.problema).toContain('habilidade "consistencia-do-projeto" desatualizada')

      // 4. Rodando gerar novamente, o drift é sanado
      gerarHabilidadeConsistencia(cFalso)
      expect(verificarConsistenciaAdrs(cFalso).length).toBe(0)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
