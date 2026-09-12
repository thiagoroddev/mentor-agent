import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { abrirCenario, confere, dizQue, escrever, lerJson, mentor } from '../apoio.ts'
import type { Cenario } from '../apoio.ts'
import type { Tarefa } from '../../.mentor/scripts/tipos.ts'
import { lerTexto } from '../../.mentor/scripts/arquivos.ts'

/**
 * Prova a decodificacao UTF-16LE, a flag --arquivo no task gate e as mensagens orientativas do doctor.
 */
export function rodar(): Cenario {
  const c = abrirCenario('20-evidencia-externa-e-narrativa')
  mentor(c, 'init')

  // 1. Provar decodificacao UTF-16LE com BOM via lerTexto
  const caminhoUtf16 = join(c.pasta, 'saida-powershell.log')
  const textoOriginal = 'Build com sucesso'
  const bufUtf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(textoOriginal, 'utf16le')])
  writeFileSync(caminhoUtf16, bufUtf16)

  const lido = lerTexto(caminhoUtf16)
  confere(c, lido.trim() === textoOriginal, 'lerTexto decodifica UTF-16LE com BOM corretamente')

  // 2. Criar e iniciar tarefa para teste de gate com --arquivo
  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Teste de gate externo', '--esforco', 'P/P', '--origem', 'chat', '--sem-requisito', '--motivo', 'teste de gate')
  mentor(c, 'task', 'puxar', 'TASK-RF-001')
  mentor(c, 'task', 'iniciar', 'TASK-RF-001')

  // 3. Executar task gate usando --arquivo
  const saidaGate = mentor(c, 'task', 'gate', 'TASK-RF-001', 'build', '--arquivo', caminhoUtf16, '--codigo-saida', '0')
  dizQue(c, saidaGate, 'APROVADO', 'task gate com --arquivo registra APROVADO')

  const tarefaGravada = lerJson<Tarefa>(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.json')
  confere(c, tarefaGravada.gates.build?.rotulo === 'APROVADO', 'rotulo salvo como APROVADO no JSON')
  confere(c, tarefaGravada.gates.build?.codigo_saida === 0, 'codigo de saida registrado como 0')
  confere(c, Boolean(tarefaGravada.gates.build?.saida?.includes(textoOriginal)), 'conteudo da saida externa gravado no gate')

  // 4. Testar arquivo vazio com --arquivo virando INVALIDO como gate
  const caminhoVazio = join(c.pasta, 'vazio.log')
  writeFileSync(caminhoVazio, '')
  const saidaVazio = mentor(c, 'task', 'gate', 'TASK-RF-001', 'build', '--arquivo', caminhoVazio)
  dizQue(c, saidaVazio, 'INVÁLIDO como gate', 'arquivo de evidencia vazio e rotulado como INVALIDO como gate')

  // 5. Testar novas mensagens do doctor para requisitos e plataforma
  const saidaDoctor = mentor(c, 'doctor')
  dizQue(c, saidaDoctor, 'se migrou projeto legado, preencha docs-mentor/requisitos/requisitos.json', 'doctor orienta acao recuperavel em requisitos')
  dizQue(c, saidaDoctor, 'Branches / Code security', 'doctor orienta configuracoes de plataforma no GitHub')

  return c
}
