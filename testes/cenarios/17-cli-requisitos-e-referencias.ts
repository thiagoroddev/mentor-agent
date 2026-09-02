import { abrirCenario, confere, dizQue, escrever, ler, lerJson, mentor } from '../apoio.ts'
import type { Cenario } from '../apoio.ts'
import type { Requisito } from '../../.mentor/scripts/tipos.ts'

/**
 * Prova o CLI de requisitos, a rastreabilidade bidirecional em pendentes.md e o mapa de referencias.md (Passo 2).
 */
export function rodar(): Cenario {
  const c = abrirCenario('17-cli-requisitos-e-referencias')
  mentor(c, 'init')

  // 1. Criar requisitos funcionais, de negócio e não-funcionais via CLI
  const rfCriado = mentor(c, 'req', 'nova',
    '--tipo', 'RF',
    '--titulo', 'Exportar relatorio em CSV',
    '--criterios', 'Suporta .csv | Separador por virgula',
    '--prioridade', 'essencial',
    '--historia', 'Como analista quero exportar dados para CSV')
  dizQue(c, rfCriado, 'RF-1 criado', 'req nova cria requisito funcional com ID deterministico')

  const rnCriado = mentor(c, 'req', 'nova',
    '--tipo', 'RN',
    '--titulo', 'Desconto maximo de 10% para compras a vista',
    '--criterios', 'Apenas para pagamento via PIX')
  dizQue(c, rnCriado, 'RN-1 criado', 'req nova cria regra de negocio')

  const rnfCriado = mentor(c, 'req', 'nova',
    '--tipo', 'RNF',
    '--titulo', 'Tempo de resposta inferior a 200ms',
    '--criterios', 'Medido no percentil 95')
  dizQue(c, rnfCriado, 'RNF-1 criado', 'req nova cria requisito nao-funcional')

  // 2. Conferir requisitos.json gravado
  const reqs = lerJson<Requisito[]>(c, 'docs-mentor/requisitos/requisitos.json')
  confere(c, reqs.length === 3, 'tres requisitos gravados no JSON')
  confere(c, reqs[0]?.id === 'RF-1' && reqs[0]?.criterios_aceite.length === 2, 'RF-1 tem 2 criterios')
  confere(c, reqs[1]?.id === 'RN-1' && reqs[1]?.tipo === 'RN', 'RN-1 tipo correto')
  confere(c, reqs[2]?.id === 'RNF-1' && reqs[2]?.tipo === 'RNF', 'RNF-1 tipo correto')

  // 3. Listagem via CLI
  const listagem = mentor(c, 'req', 'listar')
  dizQue(c, listagem, 'RF-1', 'listar inclui RF-1')
  dizQue(c, listagem, 'RN-1', 'listar inclui RN-1')
  dizQue(c, listagem, 'RNF-1', 'listar inclui RNF-1')

  // 4. Rastreabilidade bidirecional em pendentes.md ao criar tarefa com --requisitos
  mentor(c, 'task', 'nova',
    '--tipo', 'RF',
    '--titulo', 'Implementar gerador CSV',
    '--esforco', 'P/M',
    '--valor', 'importante',
    '--origem', 'RF-1',
    '--requisitos', 'RF-1')

  const pendentes = ler(c, 'docs-mentor/requisitos/pendentes.md')
  confere(c, pendentes.includes('TASK-RF-001'), 'pendentes.md mostra TASK-RF-001 vinculada a RF-1')

  // 5. Criar referência externa e conferir geração automática de docs-mentor/referencias.md
  escrever(c, 'README.md', '# Meu Projeto\n\nDocumentacao inicial.')
  mentor(c, 'ref', 'nova',
    '--id', 'DOC-README',
    '--onde', 'README.md',
    '--titulo', 'Guia inicial do projeto')

  const refsMd = ler(c, 'docs-mentor/referencias.md')
  confere(c, refsMd.includes('DOC-README') && refsMd.includes('README.md'), 'referencias.md gerado com mapa de links')

  return c
}
