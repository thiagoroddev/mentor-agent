import { describe, expect, it } from './vitest-local.ts'
import {
  TAG_PLANO_INICIO_PREFIXO,
  TAG_PLANO_FIM,
  incorporarPlanoNaNarrativa,
  extrairMemoriaOperacional,
} from '../.mentor/scripts/narrativa.ts'
import type { Tarefa } from '../.mentor/scripts/tipos.ts'
import type { PlanoResolvido } from '../.mentor/scripts/cmd-plano.ts'

describe('Narrativa e Memória Operacional (Fatia D2)', () => {
  const tarefaFake: Tarefa = {
    id: 'TASK-CHORE-888',
    revisao_incremental_requerida: false,
    tipo: 'CHORE',
    titulo: 'Tarefa Teste Narrativa',
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
    criada_em: '04/10/26 12:00',
    iniciada_em: '04/10/26 12:01',
    commit_base: null,
    concluida_em: null,
    plano_ref: {
      arquivo: 'docs/planos/plano-exemplo.md',
      sha256: 'abc123sha',
      secao: null,
    },
    plano: {
      versao: 2,
      muda: ['src/index.ts'],
      criterios_aceite: [{ texto: 'criterio 1', teste: 'teste 1', evidencia: null }],
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

  const planoRes: PlanoResolvido = {
    origem: 'referenciado',
    arquivo: 'docs/planos/plano-exemplo.md',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    versao: 2,
    muda: ['src/index.ts'],
    criterios_aceite: [{ texto: 'criterio 1', teste: 'teste 1', evidencia: null }],
    impacto: 'local',
    riscos: [],
    dependencias_novas: [],
    proporcionalidade: 'Standard',
    conteudo_md: '# Estudo de Engenharia\n\nTexto integral do plano sem resumo.\n\n### Detalhes técnicos\nMais prosa.',
    revisao_valida: true,
    diagnosticos: [],
  }

  it('incorporarPlanoNaNarrativa inicializa narrativa vazia com cabeçalho e delimitadores do plano', () => {
    const res = incorporarPlanoNaNarrativa(null, tarefaFake, planoRes)
    expect(res.modificado).toBe(true)
    expect(res.conteudo).toContain('# TASK-CHORE-888 · Tarefa Teste Narrativa')
    expect(res.conteudo).toContain('<!-- mentor:plano:inicio sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" -->')
    expect(res.conteudo).toContain('# Estudo de Engenharia')
    expect(res.conteudo).toContain('<!-- mentor:plano:fim -->')
  })

  it('incorporarPlanoNaNarrativa é 100% idempotente com mesmo hash e preserva desfecho posterior', () => {
    const primeiraVez = incorporarPlanoNaNarrativa(null, tarefaFake, planoRes)
    const narrativaComDesfecho = `${primeiraVez.conteudo}\n## 5. Desfecho e Validação Real\n\nDesfecho manual já preenchido.\n`

    const segundaVez = incorporarPlanoNaNarrativa(narrativaComDesfecho, tarefaFake, planoRes)
    expect(segundaVez.modificado).toBe(false)
    expect(segundaVez.conteudo).toBe(narrativaComDesfecho)
    expect(segundaVez.conteudo).toContain('## 5. Desfecho e Validação Real')
  })

  it('incorporarPlanoNaNarrativa atualiza bloco do plano quando o sha256 muda (revisão) mantendo o resto', () => {
    const primeiraVez = incorporarPlanoNaNarrativa(null, tarefaFake, planoRes)
    const narrativaComDesfecho = `${primeiraVez.conteudo}\n## 5. Desfecho e Validação Real\n\nConteúdo do desfecho preservado.\n`

    const planoRevisado: PlanoResolvido = {
      ...planoRes,
      sha256: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      conteudo_md: '# Estudo de Engenharia Revisado\n\nNovo texto do plano atualizado.',
    }

    const atualizado = incorporarPlanoNaNarrativa(narrativaComDesfecho, tarefaFake, planoRevisado)
    expect(atualizado.modificado).toBe(true)
    expect(atualizado.conteudo).toContain('sha256="ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"')
    expect(atualizado.conteudo).toContain('# Estudo de Engenharia Revisado')
    expect(atualizado.conteudo).not.toContain('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    expect(atualizado.conteudo).toContain('## 5. Desfecho e Validação Real\n\nConteúdo do desfecho preservado.')
  })

  it('incorporarPlanoNaNarrativa substitui stub simples de 2 linhas pelo plano integral', () => {
    const stub = `# TASK-CHORE-888 · Tarefa Teste Narrativa\n\nPlano de referencia: docs/planos/plano-exemplo.md\n`
    const res = incorporarPlanoNaNarrativa(stub, tarefaFake, planoRes)
    expect(res.modificado).toBe(true)
    expect(res.conteudo).toContain('<!-- mentor:plano:inicio')
    expect(res.conteudo).toContain('# Estudo de Engenharia')
  })

  it('extrairMemoriaOperacional retorna vazio quando não há bloco mentor:memoria', () => {
    const texto = '## 5. Desfecho\n\nTudo certo sem bloco estruturado.'
    const res = extrairMemoriaOperacional(texto)
    expect(res.memoria).toBeUndefined()
    expect(res.erro).toBeUndefined()
  })

  it('extrairMemoriaOperacional extrai com sucesso bloco mentor:memoria válido', () => {
    const texto = `
## 5. Desfecho e Validação Real

Aqui está a descrição do desfecho.

\`\`\`json mentor:memoria
{
  "resultado": "Fatia D2 implementada com sucesso com testes passando",
  "aprendizados": [
    "Delimitadores HTML ocultos facilitam idempotência sem sujar a renderização",
    "Extração determinística dispensa qualquer chamada de inferência LLM"
  ],
  "limites_conhecidos": [
    "Tarefas com Markdown mal formatado exigem fechamento correto de bloco de código"
  ]
}
\`\`\`
`
    const res = extrairMemoriaOperacional(texto)
    expect(res.erro).toBeUndefined()
    expect(res.memoria).toBeDefined()
    expect(res.memoria?.resultado).toBe('Fatia D2 implementada com sucesso com testes passando')
    expect(res.memoria?.aprendizados.length).toBe(2)
    expect(res.memoria?.limites_conhecidos.length).toBe(1)
  })

  it('extrairMemoriaOperacional detecta JSON malformado e campos obrigatórios ausentes', () => {
    const jsonInvalido = `\`\`\`json mentor:memoria\n{ resultado: sem_aspas }\n\`\`\``
    const erroJson = extrairMemoriaOperacional(jsonInvalido)
    expect(erroJson.erro).toBeDefined()
    expect(erroJson.erro).toContain('JSON inválido')

    const semResultado = `\`\`\`json mentor:memoria\n{ "aprendizados": [], "limites_conhecidos": [] }\n\`\`\``
    const erroResultado = extrairMemoriaOperacional(semResultado)
    expect(erroResultado.erro).toContain('"resultado" é obrigatório')

    const semAprendizados = `\`\`\`json mentor:memoria\n{ "resultado": "ok", "limites_conhecidos": [] }\n\`\`\``
    const erroAprendizados = extrairMemoriaOperacional(semAprendizados)
    expect(erroAprendizados.erro).toContain('"aprendizados" é obrigatório')

    const semLimites = `\`\`\`json mentor:memoria\n{ "resultado": "ok", "aprendizados": [] }\n\`\`\``
    const erroLimites = extrairMemoriaOperacional(semLimites)
    expect(erroLimites.erro).toContain('"limites_conhecidos" é obrigatório')
  })

  it('validação de encerramento: tarefa versão 2 exige bloco mentor:memoria válido enquanto legada não exige', () => {
    const textoSemMemoria = '## 5. Desfecho e Validação Real\n\nDesfecho sem memoria estruturada.'
    const textoComMemoria = `${textoSemMemoria}\n\n\`\`\`json mentor:memoria\n{\n  "resultado": "Sucesso",\n  "aprendizados": ["Aprendizado 1"],\n  "limites_conhecidos": ["Limite 1"]\n}\n\`\`\``

    function validarMemoria(versao: number | undefined, conteudo: string): string[] {
      const impedimentos: string[] = []
      const extMemoria = extrairMemoriaOperacional(conteudo)
      if (extMemoria.erro) {
        impedimentos.push(extMemoria.erro)
      } else if (versao && versao >= 2 && !extMemoria.memoria) {
        impedimentos.push('tarefa versao 2 exige bloco "```json mentor:memoria" no Desfecho com resultado, aprendizados e limites_conhecidos')
      }
      return impedimentos
    }

    const impV2Sem = validarMemoria(2, textoSemMemoria)
    expect(impV2Sem.length).toBe(1)
    expect(impV2Sem[0]).toContain('tarefa versao 2 exige bloco')

    const impV2Com = validarMemoria(2, textoComMemoria)
    expect(impV2Com.length).toBe(0)

    const impLegada = validarMemoria(undefined, textoSemMemoria)
    expect(impLegada.length).toBe(0)

    const impV1 = validarMemoria(1, textoSemMemoria)
    expect(impV1.length).toBe(0)
  })
})
