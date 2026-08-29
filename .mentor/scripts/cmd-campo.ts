import { join } from 'node:path'
import { agora, caminhos, diasDesde, escreverTexto, existe, lerJson, lerTexto, raizPacote } from './arquivos.ts'
import { lerInventario } from './cmd-regras.ts'
import { tetos } from './cmd-verificar.ts'
import {
  carregarContexto, carregarDividas, carregarRecusas, carregarRequisitos, carregarRiscos,
  carregarTarefas, riscoVencido,
} from './vistas.ts'
import { MARCADOR } from './tipos.ts'
import type { Tarefa } from './tipos.ts'

/**
 * Relatorio de campo: como a melhoria volta ao pacote sem o projeto virar projeto sobre o pacote.
 *
 * Sai do projeto e entra no repositorio do pacote, **nunca como tarefa**. Duas partes, e a primeira
 * vale mais: a A e' medida por script, a B e' escrita e exige referencia a ID e data.
 *
 * **So' metadado de processo.** Nada de codigo, requisito, nome de pessoa ou URL: e' o que torna o
 * relatorio colavel em qualquer lugar sem revisar linha por linha.
 */
function contar<T extends string>(itens: T[]): Array<[T, number]> {
  const mapa = new Map<T, number>()
  for (const i of itens) mapa.set(i, (mapa.get(i) ?? 0) + 1)
  return [...mapa].sort((a, b) => b[1] - a[1])
}

const tabela = (cab: string[], linhas: string[][]) => [
  `| ${cab.join(' | ')} |`,
  `|${cab.map(() => '---').join('|')}|`,
  ...linhas.map((l) => `| ${l.join(' | ')} |`),
]

/**
 * `--detalhado` so' faz sentido quando quem escreve o relatorio e' dono do projeto **e** do pacote.
 * O padrao continua limpo, porque o relatorio pode vir de outra pessoa que usa o pacote, e ai' o
 * detalhe do produto dela nao e' meu para carregar.
 */
export function relatorioDeCampo(flags: Record<string, string | undefined> = {}): number {
  const c = caminhos()
  const ctx = carregarContexto()
  const tarefas = carregarTarefas()
  const concluidas = tarefas.filter((t) => t.estado === 'concluida')
  const encerradas = tarefas.filter((t) => t.estado === 'concluida' || t.estado === 'cancelada')
  const recusas = carregarRecusas()
  const regras = lerInventario()
  const manifesto = join(raizPacote(), 'package.json')
  const versao = existe(manifesto) ? (lerJson<{ version?: string }>(manifesto).version ?? '?') : '?'

  const l: string[] = [
    `# Relatorio de campo · ${ctx.projeto['nome'] ?? 'projeto'} · ${agora().log}`,
    '',
    `Pacote **mentor-agent ${versao}** · ${concluidas.length} tarefas concluidas`,
    '',
    '> Partes A e C sao geradas. A parte B e escrita, e item sem ID de tarefa e data **nao entra**.',
    '> So metadado de processo: nada de codigo, requisito, nome de pessoa ou URL.',
    '',
    '## A · Medicao',
    '',
    '### A.1 Tarefas concluidas, por tipo',
    '',
  ]
  const porTipo = contar(concluidas.map((t) => t.tipo))
  l.push(...tabela(['Tipo', 'Qtd', '%'], porTipo.map(([t, n]) => [t, String(n), `${Math.round((n / Math.max(1, concluidas.length)) * 100)}%`])))
  const funcionalidade = concluidas.filter((t) => ['RF', 'RN', 'RNF'].includes(t.tipo)).length
  const proporcao = Math.round((funcionalidade / Math.max(1, concluidas.length)) * 100)
  l.push('', `**Funcionalidade (RF+RN+RNF): ${proporcao}%.** Abaixo de 50% indica pacote consumindo o projeto.`, '')

  l.push('### A.2 Regras do pacote: escrita x comando', '')
  const comComando = regras.filter((r) => r.comando).length
  l.push(...tabela(['Total', 'Viraram comando', 'Sao orientacao'], [[String(regras.length), String(comComando), String(regras.length - comComando)]]))
  l.push('', 'Regra sem comando nao e defeito: e orientacao declarada. O que importa e a proporcao mudar', 'entre uma versao e outra.', '')

  l.push('### A.3 Onde o pacote recusou', '')
  if (recusas.length === 0) {
    l.push('Nenhuma recusa registrada.', '')
  } else {
    const motivos = contar(recusas.flatMap((r) => r.impedimentos.map((i) => classificar(i))))
    l.push(...tabela(['Impedimento', 'Vezes'], motivos.map(([m, n]) => [m, String(n)])))
    l.push('', `${recusas.length} recusa(s) no total. **Mede onde a IA falha, sem ninguem opinar:** se um`, 'impedimento domina, o defeito esta no que o pacote pede, nao em quem preenche.', '')
  }

  l.push('### A.4 Rotulos de gate', '')
  const rotulos = contar(concluidas.flatMap((t) => Object.values(t.gates).map((g) => g!.rotulo)))
  l.push(...(rotulos.length ? tabela(['Rotulo', 'Vezes'], rotulos.map(([r, n]) => [r, String(n)])) : ['Nenhum gate registrado.']))
  const comVermelho = concluidas.filter((t) => Object.values(t.gates).some((g) => g?.vermelho_em)).length
  l.push('', `Tarefas com vermelho registrado antes do verde: **${comVermelho} de ${concluidas.length}**.`, '')

  l.push('### A.5 Achados', '')
  const achados = concluidas.flatMap((t) => t.achados)
  l.push(...(achados.length
    ? tabela(['Destino', 'Vezes'], contar(achados.map((a) => a.destino)).map(([d, n]) => [d, String(n)]))
    : ['Nenhum achado registrado.']))
  l.push('')

  l.push('### A.6 Divida tecnica e risco aceito', '')
  const dividas = carregarDividas()
  const riscos = carregarRiscos()
  l.push(...tabela(
    ['Dividas abertas', 'Dividas pagas', 'Riscos ativos', 'Riscos vencidos'],
    [[
      String(dividas.filter((d) => !d.paga_em).length), String(dividas.filter((d) => d.paga_em).length),
      String(riscos.filter((r) => !r.encerrado_em && !riscoVencido(r)).length),
      String(riscos.filter((r) => riscoVencido(r)).length),
    ]],
  ))
  l.push('')

  l.push('### A.7 Fila', '')
  const xg = tarefas.filter((t) => t.esforco.ia === 'XG')
  const fatiadas = xg.filter((p) => tarefas.some((f) => f.fatia_de === p.id))
  const fixadas = tarefas.filter((t) => t.ordem !== null).length
  l.push(...tabela(
    ['Nascidas XG', 'Delas, fatiadas', 'Ordem fixada a mao', 'Validacoes pendentes'],
    [[String(xg.length), String(fatiadas.length), String(fixadas), String(tarefas.filter((t) => t.validacao === 'pendente').length)]],
  ))
  l.push('', '**Ordem fixada a mao com frequencia significa que os criterios de ordenacao estao errados.**',
    'Nesse caso quem muda e o pacote, nao quem usa.', '')

  l.push('### A.8 Tempo', '')
  const espera = mediana(tarefas.map((t) => diferenca(t.criada_em, t.iniciada_em)))
  const execucao = mediana(tarefas.map((t) => diferenca(t.iniciada_em, t.concluida_em)))
  l.push(...tabela(['Dias parada antes de iniciar (mediana)', 'Dias em execucao (mediana)'],
    [[espera ?? '-', execucao ?? '-']]))
  l.push('')

  l.push('### A.9 Tetos de texto', '')
  const estouros = tetos()
  l.push(estouros.length ? estouros.map((a) => `- ${a.onde}: ${a.problema}`).join('\n') : 'Nenhum estouro.', '')

  const anotadas = join(c.docs, 'melhorias-do-pacote.md')
  if (existe(anotadas)) {
    const itens = lerTexto(anotadas).split('\n').filter((x: string) => x.startsWith('- **'))
    l.push('### A.10 Melhorias anotadas durante o uso', '')
    l.push(`${itens.length} anotacao(oes) por \`mentor anotar --sobre pacote\`.`, '')
    if (flags.detalhado) {
      l.push(...itens, '')
    } else {
      l.push('> Conteudo omitido: rode com `--detalhado` se voce e dono do projeto **e** do pacote.', '')
    }
  }

  l.push(
    '## B · Atrito (escrita, com referencia obrigatoria)', '',
    '### B.1 Regras que atrapalharam', '',
    `- ${MARCADOR} <regra> · TASK-XXX-NNN · <data> · o que aconteceu · o que teria funcionado`, '',
    '### B.2 O que o pacote deixou de lembrar', '',
    `- ${MARCADOR} <assunto> · TASK-XXX-NNN · <data> · quando isso deveria ter aparecido`, '',
    '### B.3 O que a IA teve que improvisar', '',
    `- ${MARCADOR} <processo ausente> · TASK-XXX-NNN · <data>`, '',
    '> Item sem ID de tarefa e data **nao entra**.', '',
    '## C · O que funcionou', '',
  )
  const encerradasSemRecusa = encerradas.length - new Set(recusas.map((r) => r.alvo)).size
  l.push(
    `- ${regras.length} regras no inventario, ${comComando} com comando`,
    `- ${encerradasSemRecusa} de ${encerradas.length} tarefas encerradas sem nenhuma recusa`,
    `- ${rotulos.find(([r]) => r === 'APROVADO')?.[1] ?? 0} gates aprovados por execucao, nao por declaracao`,
    '',
    '> Analise honesta reconhece o que funciona, senao vira reescrita gratuita. Sem esta secao, todo',
    '> relatorio vira lista de defeitos, e a leitura seguinte conclui que nada presta.',
  )

  if (!flags.detalhado) {
    l.splice(5, 0, '> Modo limpo: so metadado de processo. Use `--detalhado` quando voce for dono do',
      '> projeto e do pacote, e o conteudo puder viajar junto.', '')
  }

  const destino = `${c.docs}/relatorio-de-campo.md`
  escreverTexto(destino, l.join('\n'))
  console.log(`Relatorio gerado em docs/relatorio-de-campo.md (${concluidas.length} tarefas).`)
  console.log('A parte B esta com marcadores: preencha com referencia a ID e data, e leve o arquivo')
  console.log('para o repositorio do pacote. Ele nao cria tarefa em lugar nenhum.')
  return 0
}

/** Agrupa impedimentos parecidos para a contagem nao virar lista de frases unicas. */
function classificar(impedimento: string): string {
  if (impedimento.includes(MARCADOR)) return 'marcador do esqueleto nao preenchido'
  if (impedimento.includes('sem teste nomeado')) return 'criterio de aceite sem teste'
  if (impedimento.includes('vermelho')) return 'gate sem vermelho antes do verde'
  if (impedimento.includes('achado')) return 'achado sem destino resolvido'
  if (impedimento.includes('narrativa')) return 'narrativa ausente'
  if (impedimento.includes('nao sustenta conclusao')) return 'gate vermelho ou bloqueado'
  if (impedimento.includes('origem aponta')) return 'origem que nao resolve'
  if (impedimento.includes('XG')) return 'XG sem fatiar'
  if (impedimento.includes('ciclo cheio')) return 'ciclo cheio'
  return 'outro'
}

function diferenca(de: string | null, ate: string | null): number | null {
  const a = diasDesde(de)
  const b = diasDesde(ate)
  return a === null || b === null ? null : a - b
}

function mediana(valores: Array<number | null>): string | null {
  const n = valores.filter((v): v is number => v !== null).sort((a, b) => a - b)
  if (n.length === 0) return null
  return String(n[Math.floor(n.length / 2)])
}
