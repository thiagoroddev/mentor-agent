import { join } from 'node:path'
import { agoraIso, caminhos, escreverJson, escreverTexto, existe, garantirPasta, lerJson } from './arquivos.ts'
import { regenerarTudo } from './vistas.ts'
import type { Contexto } from './tipos.ts'

/**
 * Cria a estrutura de docs-mentor/ do projeto a partir dos esquemas do pacote.
 * Nao preenche nada: campo null e' a pauta que o mentor cobra depois.
 */
export function inicializar(): void {
  // O `init` e' o unico comando que nao procura o projeto: ele o cria onde voce esta'.
  const c = caminhos(process.env['MENTOR_RAIZ'] ?? process.cwd())
  if (existe(c.contexto)) {
    console.log('docs-mentor/contexto.json ja existe. Nada a fazer.')
    return
  }
  for (const pasta of [c.abertas, c.concluidas, c.stack, c.adr, c.docs + '/requisitos', c.docs + '/dividas', c.docs + '/seguranca']) {
    garantirPasta(pasta)
  }

  const modelo = lerJson<Contexto>(c.esquemas + '/contexto.json')
  modelo._meta.gerado_em = agoraIso()
  const manifesto = join(c.pacote, 'manifesto.json')
  modelo._meta['versao_do_pacote'] = existe(manifesto)
    ? lerJson<{ versao?: string }>(manifesto).versao ?? 'desconhecida'
    : 'desconhecida (pacote sem manifesto: copiado a mao?)'
  modelo.ferramentas = []
  escreverJson(c.contexto, modelo)
  escreverJson(c.requisitos, [])
  escreverJson(c.dividas, [])
  escreverJson(c.riscos, [])

  escreverTexto(
    c.docs + '/LEIA.md',
    [
      '# docs-mentor/',
      '',
      'Fonte e vista geradas. **Arquivo `.json` e fonte; `.md` gerado nunca se edita a mao.**',
      '',
      '| Fonte | Vista gerada |',
      '|---|---|',
      '| `contexto.json` | `contexto.md` |',
      '| `requisitos/requisitos.json` | `requisitos/implementados.md`, `requisitos/pendentes.md` |',
      '| `tarefas/abertas/*.json` | `tarefas/backlog.md` (ciclo) e `tarefas/reserva.md` |',
      '| `dividas/dividas.json` | ainda sem vista |',
      '| `seguranca/riscos-aceitos.json` | ainda sem vista |',
      '',
      'Escritos a mao: a narrativa de cada tarefa concluida, as ADRs e as convencoes de stack.',
    ].join('\n'),
  )

  regenerarTudo()
  console.log('Projeto inicializado. Proximo passo: responder os portoes V, C e 0,')
  console.log('que decidem o nivel de rigor. Processo em .mentor/processos/inicializacao.md')
}
