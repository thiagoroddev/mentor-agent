import { abrirCenario, confere, dizQue, ler, lerJson, mentor } from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/**
 * Prova o registro estruturado de invariantes e o glossário do domínio (Passo 7).
 * O código mostra o que é; a invariante mostra o que precisa continuar sendo.
 */
export function rodar(): Cenario {
  const c = abrirCenario('15-invariantes-e-glossario')
  mentor(c, 'init')

  // 1. init cria invariantes.json e glossario.md
  const invsIniciais = lerJson<any[]>(c, 'docs-mentor/invariantes.json')
  confere(c, Array.isArray(invsIniciais) && invsIniciais.length === 0, 'init cria invariantes.json vazio')

  const glossario = ler(c, 'docs-mentor/glossario.md')
  confere(c, glossario.includes('# Glossario do Dominio'), 'init cria glossario.md com cabecalho')

  const leia = ler(c, 'docs-mentor/LEIA.md')
  confere(c, leia.includes('invariantes.json') && leia.includes('glossario.md'), 'LEIA.md documenta invariantes e glossario')

  // 2. Criação de invariantes via CLI (uma automatizada e uma sem mecanismo)
  mentor(c, 'inv', 'nova', '--id', 'INV-1',
    '--enunciado', 'Preco final e calculado apenas no servidor',
    '--porque', 'evitar adulteracao no cliente',
    '--mecanismo', 'testes/preco.test.ts > recalcula no servidor')

  mentor(c, 'inv', 'nova', '--id', 'INV-2',
    '--enunciado', 'Tokens JWT nunca sao expostos em logs',
    '--porque', 'seguranca da autenticacao')

  const invs = lerJson<any[]>(c, 'docs-mentor/invariantes.json')
  confere(c, invs.length === 2, 'duas invariantes gravadas')
  confere(c, invs[0]?.id === 'INV-1' && invs[0]?.mecanismo === 'testes/preco.test.ts > recalcula no servidor',
    'INV-1 grava com mecanismo declarado')
  confere(c, invs[1]?.id === 'INV-2' && invs[1]?.mecanismo === null,
    'INV-2 grava com mecanismo null')

  // 3. Listagem via CLI
  const listagem = mentor(c, 'inv', 'listar')
  dizQue(c, listagem, 'INV-1', 'listar inclui INV-1')
  dizQue(c, listagem, 'testes/preco.test.ts', 'listar exibe mecanismo')
  dizQue(c, listagem, 'sem mecanismo', 'listar avisa quando mecanismo e nulo')

  // 4. doctor relata a proporção de invariantes automatizadas
  const doc = mentor(c, 'doctor')
  dizQue(c, doc, '1 de 2 invariante(s) com mecanismo automatizado',
    'doctor afere quantas invariantes tem mecanismo automatizado')

  // 5. Tarefa com origem INV-1 é aceita pelo puxar
  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Reforcar calculo backend',
    '--esforco', 'P/P', '--origem', 'INV-1')
  const puxarValido = mentor(c, 'task', 'puxar', 'TASK-RF-001')
  confere(c, puxarValido.codigo === 0, 'puxar aceita origem com INV-1 valido')

  // 6. Tarefa com origem INV-99 inexistente é recusada pelo puxar
  mentor(c, 'task', 'nova', '--tipo', 'BG', '--titulo', 'Bug sem invariante',
    '--esforco', 'P/P', '--origem', 'INV-99')
  const puxarInvalido = mentor(c, 'task', 'puxar', 'TASK-BG-001')
  dizQue(c, puxarInvalido, 'INV-99, que nao existe', 'puxar recusa origem com INV-99 inexistente')

  // 7. verificar aprova projeto
  confere(c, mentor(c, 'verificar').codigo === 0, 'verificar aprova com invariantes e glossario')

  return c
}
