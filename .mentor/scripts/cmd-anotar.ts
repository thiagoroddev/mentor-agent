import { join } from 'node:path'
import { agora, caminhos, escreverTexto, existe, garantirPasta, lerTexto, listar } from './arquivos.ts'
import { diasDesde } from './arquivos.ts'

/**
 * Onde a anotacao vai **nao e' decisao de memoria**. O comando exige `--sobre`, e a regra que
 * decide entre os dois valores esta' em `processos/rascunho.md`.
 *
 * Sem isso, melhoria do pacote vira tarefa do projeto, e todo projeto acaba virando um projeto
 * sobre o pacote. Foi o que produziu 40 CHORE e 35 DOC no antecessor.
 */
export function anotar(texto: string | undefined, sobre: string | undefined): void {
  if (!texto) throw new Error('Falta o texto. Use: mentor anotar --sobre pacote|projeto "..."')
  if (sobre !== 'pacote' && sobre !== 'projeto') {
    throw new Error(
      'Falta --sobre pacote|projeto.\n' +
      '  pacote  = a regra atrapalhou, faltou lembrete, um comando recusou o que nao devia\n' +
      '  projeto = preciso de algo so deste projeto: convencao, gate a mais, valor diferente\n' +
      'Tabela completa em .mentor/processos/rascunho.md',
    )
  }
  const c = caminhos()
  if (sobre === 'pacote') {
    const caminho = join(c.docs, 'melhorias-do-pacote.md')
    const cabecalho = [
      '# Melhorias do pacote, vistas daqui',
      '',
      '> Anotado por `mentor anotar --sobre pacote`. **Nao vira tarefa deste projeto.**',
      '> Entra no relatorio de campo, e o trabalho acontece no repositorio do `mentor-agent`.',
      '',
    ].join('\n')
    const anterior = existe(caminho) ? lerTexto(caminho) : cabecalho
    escreverTexto(caminho, `${anterior.trimEnd()}\n\n- **${agora().log}** · ${texto}\n`)
    console.log('Anotado em docs-mentor/melhorias-do-pacote.md. Nao vira tarefa daqui.')
    console.log('Entra no relatorio de campo; o trabalho acontece no repositorio do pacote.')
    return
  }
  const pasta = join(c.docs, 'rascunhos')
  garantirPasta(pasta)
  const slug = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
  const arquivo = join(pasta, `${agora().nome.slice(0, 10)}--${slug || 'ideia'}.md`)
  escreverTexto(arquivo, [
    `# ${texto}`,
    '',
    `Rascunho aberto em ${agora().log}.`,
    '',
    '> Rascunho nao e tarefa: sem gate, sem criterio de aceite, fora da fila.',
    '> Sai daqui de quatro jeitos: requisito · ADR · tarefa · descartado com uma linha.',
    '',
    '## O que se sabe',
    '',
    '## O que falta decidir',
    '',
    '## Destino',
    '',
    '(ainda em aberto)',
  ].join('\n'))
  console.log(`Rascunho em ${arquivo.replace(c.raiz, '.')}`)
}

/** Rascunho parado e' pauta, nao patrimonio. A resposta certa costuma ser descartar com uma linha. */
export function rascunhosParados(diasLimite = 60): Array<{ arquivo: string; dias: number }> {
  const c = caminhos()
  const parados: Array<{ arquivo: string; dias: number }> = []
  for (const a of listar(join(c.docs, 'rascunhos'), '.md')) {
    const texto = lerTexto(a)
    if (!/\(ainda em aberto\)/.test(texto)) continue
    const data = /Rascunho aberto em (\d{2}\/\d{2}\/\d{2})/.exec(texto)?.[1]
    const dias = diasDesde(data ?? null)
    if (dias !== null && dias >= diasLimite) parados.push({ arquivo: a.replace(`${c.raiz}/`, ''), dias })
  }
  return parados
}
