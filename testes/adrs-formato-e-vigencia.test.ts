import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from './vitest-local.ts'
import {
  calcularVigenciaDiretrizes,
  carregarDiretrizesDoProjeto,
  extrairDiretrizesDeTexto,
} from '../.mentor/scripts/adrs.ts'
import type { DiretrizAdr } from '../.mentor/scripts/tipos.ts'
import type { Caminhos } from '../.mentor/scripts/arquivos.ts'

describe('Fatia B: Formato operacional e vigência das ADRs (TASK-CHORE-005)', () => {
  it('extrai bloco mentor:diretrizes estruturado de ADR em Markdown', () => {
    const markdown = `# ADR-004: Sistema de Componentes

Contexto histórico e decisões tomadas anteriormente.

## Diretrizes operacionais

\`\`\`json mentor:diretrizes
[
  {
    "id": "DIR-ADR-004-01",
    "estado": "aceita",
    "regra": "Usar primitivas shadcn/ui em src/components/ui/ para toda entrada de dados.",
    "alcance": "ui/componentes",
    "excecoes": ["controles de canvas do mapa"],
    "substitui": []
  },
  {
    "id": "DIR-ADR-004-02",
    "estado": "aceita",
    "regra": "Usar paleta ciano nos botões de destaque.",
    "alcance": "ui/identidade",
    "excecoes": [],
    "substitui": []
  }
]
\`\`\`

## Consequências
Documentação de impactos futuros.
`

    const res = extrairDiretrizesDeTexto(markdown, 'ADR-004.md')
    expect(res.legado).toBe(false)
    expect(res.erro).toBeUndefined()
    expect(res.diretrizes.length).toBe(2)
    expect(res.diretrizes[0]!.id).toBe('DIR-ADR-004-01')
    expect(res.diretrizes[0]!.adr).toBe('ADR-004')
    expect(res.diretrizes[0]!.estado).toBe('aceita')
    expect(res.diretrizes[0]!.excecoes).toEqual(['controles de canvas do mapa'])
    expect(res.diretrizes[1]!.id).toBe('DIR-ADR-004-02')
  })

  it('classifica ADR sem bloco estruturado como legado sem interromper fluxo', () => {
    const markdownLegado = `# ADR-001: Padrão Arquitetural

Apenas prosa em linguagem natural sem bloco estruturado de diretrizes.

## Decisão
Adotamos arquitetura em camadas.
`

    const res = extrairDiretrizesDeTexto(markdownLegado, 'ADR-001.md')
    expect(res.legado).toBe(true)
    expect(res.erro).toBeUndefined()
    expect(res.diretrizes.length).toBe(0)
  })

  it('acusa erro quando bloco estruturado possui JSON inválido ou esquema violado', () => {
    const markdownInvalido = `## Diretrizes operacionais
\`\`\`json mentor:diretrizes
{ "id": "nao-eh-array" }
\`\`\`
`
    const res1 = extrairDiretrizesDeTexto(markdownInvalido, 'ADR-002.md')
    expect(res1.erro).toContain('deve ser um array JSON')

    const markdownItemInvalido = `## Diretrizes operacionais
\`\`\`json mentor:diretrizes
[
  {
    "id": "invalido_sem_prefixo_dir",
    "estado": "aceita",
    "regra": "regra teste",
    "alcance": "geral"
  }
]
\`\`\`
`
    const res2 = extrairDiretrizesDeTexto(markdownItemInvalido, 'ADR-003.md')
    expect(res2.erro).toContain('id inválido')
  })

  it('calcula vigência com substituição parcial (ADR-006 substituindo parte da ADR-004)', () => {
    const diretrizes: DiretrizAdr[] = [
      {
        id: 'DIR-ADR-004-01',
        adr: 'ADR-004',
        estado: 'aceita',
        regra: 'Usar shadcn/ui para componentes.',
        alcance: 'ui/componentes',
        excecoes: [],
        substitui: [],
      },
      {
        id: 'DIR-ADR-004-02',
        adr: 'ADR-004',
        estado: 'aceita',
        regra: 'Usar paleta ciano.',
        alcance: 'ui/identidade',
        excecoes: [],
        substitui: [],
      },
      {
        id: 'DIR-ADR-006-01',
        adr: 'ADR-006',
        estado: 'aceita',
        regra: 'Usar paleta azul-grafite da nova identidade da marca.',
        alcance: 'ui/identidade',
        excecoes: ['paleta funcional do mapa'],
        substitui: ['DIR-ADR-004-02'], // substitui apenas a diretriz 02 da ADR-004!
      },
    ]

    const vigencia = calcularVigenciaDiretrizes(diretrizes, ['docs/arquitetura/ADR/ADR-001.md'])

    // DIR-ADR-004-01 continua vigente!
    // DIR-ADR-006-01 é a nova vigente de identidade!
    expect(vigencia.problemas.length).toBe(0)
    expect(vigencia.vigentes.map((d) => d.id)).toEqual(['DIR-ADR-004-01', 'DIR-ADR-006-01'])

    // DIR-ADR-004-02 foi substituída pela DIR-ADR-006-01
    expect(vigencia.substituidas.length).toBe(1)
    expect(vigencia.substituidas[0]!.diretriz.id).toBe('DIR-ADR-004-02')
    expect(vigencia.substituidas[0]!.substituida_por).toBe('DIR-ADR-006-01')

    // Legado sem diretrizes preservado
    expect(vigencia.legado_sem_diretrizes).toEqual(['docs/arquitetura/ADR/ADR-001.md'])
  })

  it('trata diretrizes revogadas e propostas separadamente de vigentes', () => {
    const diretrizes: DiretrizAdr[] = [
      {
        id: 'DIR-ADR-007-01',
        adr: 'ADR-007',
        estado: 'revogada',
        regra: 'Decisão que foi revogada sem substituta direta.',
        alcance: 'persistencia',
        excecoes: [],
        substitui: [],
      },
      {
        id: 'DIR-ADR-008-01',
        adr: 'ADR-008',
        estado: 'proposta',
        regra: 'Decisão em rascunho ainda não aceita.',
        alcance: 'roteamento',
        excecoes: [],
        substitui: [],
      },
    ]

    const vigencia = calcularVigenciaDiretrizes(diretrizes)
    expect(vigencia.vigentes.length).toBe(0)
    expect(vigencia.revogadas.map((d) => d.id)).toEqual(['DIR-ADR-007-01'])
    expect(vigencia.problemas.length).toBe(0)
  })

  it('detecta ciclo de substituição e referencia inexistente', () => {
    const diretrizesComCiclo: DiretrizAdr[] = [
      {
        id: 'DIR-ADR-010-01',
        adr: 'ADR-010',
        estado: 'aceita',
        regra: 'Regra A',
        alcance: 'geral',
        excecoes: [],
        substitui: ['DIR-ADR-010-02'],
      },
      {
        id: 'DIR-ADR-010-02',
        adr: 'ADR-010',
        estado: 'aceita',
        regra: 'Regra B',
        alcance: 'geral',
        excecoes: [],
        substitui: ['DIR-ADR-010-01'], // ciclo A -> B -> A!
      },
      {
        id: 'DIR-ADR-010-03',
        adr: 'ADR-010',
        estado: 'aceita',
        regra: 'Regra C',
        alcance: 'geral',
        excecoes: [],
        substitui: ['DIR-INEXISTENTE'],
      },
    ]

    const vigencia = calcularVigenciaDiretrizes(diretrizesComCiclo)
    expect(vigencia.problemas.some((p) => p.includes('Ciclo de substituição detectado'))).toBe(true)
    expect(vigencia.problemas.some((p) => p.includes('DIR-INEXISTENTE'))).toBe(true)
  })

  it('detecta IDs de diretrizes duplicados', () => {
    const duplicadas: DiretrizAdr[] = [
      {
        id: 'DIR-ADR-005-01',
        adr: 'ADR-005',
        estado: 'aceita',
        regra: 'Primeira definicao',
        alcance: 'geral',
        excecoes: [],
        substitui: [],
      },
      {
        id: 'DIR-ADR-005-01',
        adr: 'ADR-006',
        estado: 'aceita',
        regra: 'Segunda definicao com mesmo ID',
        alcance: 'geral',
        excecoes: [],
        substitui: [],
      },
    ]

    const vigencia = calcularVigenciaDiretrizes(duplicadas)
    expect(vigencia.problemas.some((p) => p.includes('ID de diretriz duplicado'))).toBe(true)
  })

  it('carrega diretrizes e identifica legados a partir do disco', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'mentor-adrs-test-'))
    try {
      // 1 ADR com diretrizes estruturadas
      writeFileSync(
        join(tempDir, 'ADR-001.md'),
        `# ADR-001
## Diretrizes operacionais
\`\`\`json mentor:diretrizes
[
  {
    "id": "DIR-ADR-001-01",
    "estado": "aceita",
    "regra": "Regra valida em disco.",
    "alcance": "backend",
    "excecoes": [],
    "substitui": []
  }
]
\`\`\`
`,
      )

      // 1 ADR legada
      writeFileSync(join(tempDir, 'ADR-002.md'), '# ADR-002\nSem bloco estruturado.\n')

      const cFalso = {
        raiz: tempDir,
        adr: tempDir,
      } as unknown as Caminhos

      const { diretrizes, legados, erros } = carregarDiretrizesDoProjeto(cFalso)
      expect(erros.length).toBe(0)
      expect(diretrizes.length).toBe(1)
      expect(diretrizes[0]!.id).toBe('DIR-ADR-001-01')
      expect(legados).toContain('ADR-002.md')

      const vigencia = calcularVigenciaDiretrizes(diretrizes, legados)
      expect(vigencia.vigentes.length).toBe(1)
      expect(vigencia.legado_sem_diretrizes).toContain('ADR-002.md')
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
