import { abrirCenario, apagar, confere, dizQue, escrever, lerJson, mentor } from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/**
 * Prova a resolubilidade de identificadores externos e historicos (Passo 6).
 * Um requisito ou decisao antiga nao precisa ser migrado: basta ser citavel e resolvivel.
 */
export function rodar(): Cenario {
  const c = abrirCenario('13-referencias')
  apagar(c, 'arquivo-historico')
  mentor(c, 'init')

  // 1. init cria referencias.json vazio
  const refsIniciais = lerJson<any[]>(c, 'docs-mentor/referencias.json')
  confere(c, Array.isArray(refsIniciais) && refsIniciais.length === 0, 'init cria referencias.json vazio')

  // 2. Tarefa citando ID historico sem registro e recusada na origem e no verificar
  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Tela de login',
    '--esforco', 'P/P', '--origem', 'RF-012', '--requisitos', 'RF-012')

  const puxarSemRef = mentor(c, 'task', 'puxar', 'TASK-RF-001')
  dizQue(c, puxarSemRef, 'RF-012, que nao existe', 'puxar recusa origem com ID externo nao registrado')

  const verificarSemRef = mentor(c, 'verificar')
  confere(c, verificarSemRef.codigo === 1, 'verificar reprova requisito citado nao registrado')
  dizQue(c, verificarSemRef, 'cita requisito RF-012, que nao existe', 'nomeia o requisito faltante')

  // 3. Registrar referencia com arquivo inexistente e barrado pelo comando e pelo verificar
  const erroArquivoInexistente = mentor(c, 'ref', 'nova', '--id', 'RF-012',
    '--onde', 'arquivo-historico/docs/requisitos/requisitos.json', '--sistema', 'esquadro-agents')
  dizQue(c, erroArquivoInexistente, 'nao existe', 'ref nova recusa arquivo que nao existe em disco')

  // Se o arquivo for forçado no JSON, o verificar deve pegar a quebra de integridade
  escrever(c, 'docs-mentor/referencias.json', JSON.stringify([
    {
      id: 'RF-012',
      onde: 'arquivo-historico/docs/requisitos/requisitos.json',
      sistema: 'esquadro-agents',
      registrado_em: '30/08/26',
    },
  ], null, 2))

  const verificarComArquivoFaltando = mentor(c, 'verificar')
  confere(c, verificarComArquivoFaltando.codigo === 1, 'verificar reprova referencia externa para arquivo inexistente')
  dizQue(c, verificarComArquivoFaltando, 'aponta para arquivo-historico/docs/requisitos/requisitos.json, que nao existe',
    'verificar acusa o arquivo faltante da referencia externa')

  // 4. Criando o arquivo historico real em disco
  escrever(c, 'arquivo-historico/docs/requisitos/requisitos.json', JSON.stringify([
    { id: 'RF-012', enunciado: 'Login com email e senha' },
  ], null, 2))

  // 5. Agora com o arquivo existente, verificar aprova e puxar funciona
  confere(c, mentor(c, 'verificar').codigo === 0, 'verificar aprova com referencia externa valida e arquivo existente')

  const puxarComRef = mentor(c, 'task', 'puxar', 'TASK-RF-001')
  confere(c, puxarComRef.codigo === 0, 'puxar aceita tarefa cuja origem e referencia externa resolvida')

  // 6. Listagem de referencias funciona
  const listagem = mentor(c, 'ref', 'listar')
  dizQue(c, listagem, 'RF-012 [esquadro-agents] -> arquivo-historico/docs/requisitos/requisitos.json', 'ref listar exibe as referencias cadastradas')

  return c
}
