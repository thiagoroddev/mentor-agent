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
  for (const pasta of [c.abertas, c.concluidas, c.stack, c.adr, c.docs + '/requisitos', c.docs + '/dividas', c.docs + '/seguranca', c.docs + '/rascunhos']) {
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
  escreverJson(c.referencias, [])
  escreverJson(c.invariantes, [])

  escreverTexto(
    c.glossario,
    [
      '# Glossario do Dominio',
      '',
      '> Termos canonicos e conceitos do sistema. Evita ambiguidade de nomenclatura entre IA e desenvolvedores.',
      '',
      '| Termo | Significado no projeto | Sinonimos evitados |',
      '|---|---|---|',
      '',
    ].join('\n'),
  )

  escreverTexto(
    c.docs + '/rascunhos/LEIA-ME.md',
    [
      '# Rascunhos',
      '',
      '> **Zona livre para exploracao, analises comerciais, pesquisas, ideias e prototipos.**',
      '> Rascunho nao e tarefa: nao tem gate, nao tem criterio de aceite e nao conta no ciclo.',
      '',
      'Organize livremente em arquivos ou subpastas (ex: `comercial/`, `pesquisas/`, `prototipos/`).',
      '',
      '**Destinos possiveis para um rascunho:**',
      '1. **Requisito (`RF`, `RN`, `RNF`)**: quando a ideia vira o que o produto faz.',
      '2. **ADR**: quando e uma decisao arquitetural cara de reverter.',
      '3. **Tarefa**: quando vira trabalho acionavel e bem resolvido.',
      '4. **Descartado**: com uma linha justificando o descarte.',
    ].join('\n'),
  )

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
      '| `referencias.json` | `referencias.md` (mapa de links para documentos do projeto) |',
      '| `invariantes.json` | invariantes de dominio e restricoes arquiteturais |',
      '| `glossario.md` | termos canonicos do dominio |',
      '| `rascunhos/` | zona livre para ideias, pesquisas e analises de negocio |',
      '| `melhorias-do-pacote.md` | anotacoes sobre o mentor-agent (criado por `mentor anotar --sobre pacote`) |',
      '| `dividas/dividas.json` | ainda sem vista |',
      '| `seguranca/riscos-aceitos.json` | ainda sem vista |',
      '',
      'Escritos a mao: a narrativa de cada tarefa concluida, as ADRs, as convencoes de stack e os rascunhos.',
    ].join('\n'),
  )

  regenerarTudo()
  console.log('Projeto inicializado com sucesso!')
  console.log('Proximo passo: ler docs/ e codigo se for legado, e responder os portoes V, C e 0 (nivel de rigor).')
  console.log('Roteiro detalhado em .mentor/processos/inicializacao.md')
}
