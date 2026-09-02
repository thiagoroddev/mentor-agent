import { spawnSync } from 'node:child_process'
import { caminhos } from './arquivos.ts'
import { avaliar } from './cmd-riscos.ts'
import { carregarContexto, carregarTarefas } from './vistas.ts'
import { CARACTERISTICAS } from './tipos.ts'
import type { MetaDeQualidade } from './tipos.ts'

/**
 * Portao de lancamento. Responde **uma** pergunta: este projeto pode ir a publico?
 *
 * Publicar deixa de ser ato de vontade e passa a ser consequencia de um gate verde.
 * Existe porque, num projeto real, entre escrever o checklist de performance e rodar a primeira
 * medicao passaram **197 tarefas**: regra que nao vira comando nao acontece.
 *
 * `NÃO EXECUTADO` tambem reprova. Gate que nao rodou nao e' gate verde.
 */

type Veredito = 'APROVADO' | 'REPROVADO' | 'NÃO EXECUTADO'
interface Item { nome: string; veredito: Veredito; detalhe: string }

export function lancamento(): number {
  const ctx = carregarContexto()
  const itens: Item[] = []

  // 1. Todo gate declarado, rodado agora. Nao vale evidencia antiga: o portao mede o estado atual.
  const declarados = Object.entries(ctx.gates).filter(([, g]) => g?.comando)
  if (declarados.length === 0) {
    itens.push({ nome: 'gates do projeto', veredito: 'NÃO EXECUTADO', detalhe: 'nenhum gate declarado em docs-mentor/contexto.json' })
  } else {
    for (const [nome, g] of declarados) {
      const r = spawnSync(g!.comando!, { shell: true, encoding: 'utf8', cwd: caminhos().raiz, timeout: 120_000 })
      itens.push({
        nome: `gate ${nome}`,
        veredito: r.status === 0 ? 'APROVADO' : 'REPROVADO',
        detalhe: g!.comando!,
      })
    }
  }

  // 2. Risco aceito vencido ou invalido: mais grave que o problema original.
  const avaliacoes = avaliar().filter((a) => !a.risco.encerrado_em)
  const ruins = avaliacoes.filter((a) => a.vencido || a.problemas.length)
  itens.push(ruins.length
    ? { nome: 'riscos aceitos', veredito: 'REPROVADO', detalhe: `${ruins.length} vencido(s) ou invalido(s): ${ruins.map((a) => a.risco.id).join(', ')}` }
    : { nome: 'riscos aceitos', veredito: 'APROVADO', detalhe: `${avaliacoes.length} ativo(s), todos no prazo` })

  // 3. Perfil de qualidade: caracteristica reprovada barra; sem afericao nao aprova.
  const metas = (ctx['qualidade'] as { metas_nao_funcionais?: Record<string, MetaDeQualidade> })?.metas_nao_funcionais ?? {}
  const reprovadas = CARACTERISTICAS.filter((k) => metas[k]?.resultado === 'reprovada')
  const semAfericao = CARACTERISTICAS.filter((k) => metas[k]?.meta && !metas[k]?.resultado)
  if (reprovadas.length) {
    itens.push({ nome: 'perfil de qualidade', veredito: 'REPROVADO', detalhe: `reprovada em ${reprovadas.join(', ')}` })
  } else if (semAfericao.length) {
    itens.push({ nome: 'perfil de qualidade', veredito: 'NÃO EXECUTADO', detalhe: `meta declarada e nunca aferida em ${semAfericao.join(', ')}` })
  } else {
    itens.push({ nome: 'perfil de qualidade', veredito: 'APROVADO', detalhe: 'nenhuma caracteristica reprovada' })
  }

  // 4. Reversao: so' existe se ja' foi executada de verdade (guia OPS-22).
  const op = ctx['operacao'] as { reversao?: { testada_em?: string | null } } | undefined
  itens.push(op?.reversao?.testada_em
    ? { nome: 'reversao', veredito: 'APROVADO', detalhe: `executada em ${op.reversao.testada_em}` }
    : { nome: 'reversao', veredito: 'NÃO EXECUTADO', detalhe: 'nunca executada. Saber voltar e mais importante que publicar rapido' })

  // 5. Copia de seguranca: restauracao testada, nao apenas configurada.
  const per = ctx['persistencia'] as { copia_de_seguranca?: { restauracao_testada_em?: string | null } } | undefined
  itens.push(per?.copia_de_seguranca?.restauracao_testada_em
    ? { nome: 'restauracao da copia', veredito: 'APROVADO', detalhe: `testada em ${per.copia_de_seguranca.restauracao_testada_em}` }
    : { nome: 'restauracao da copia', veredito: 'NÃO EXECUTADO', detalhe: 'copia configurada nao e copia testada' })

  // 6. Validacao manual pendente: alguem ainda precisa olhar.
  const pendentes = carregarTarefas().filter((t) => t.validacao === 'pendente')
  itens.push(pendentes.length
    ? { nome: 'validacao manual', veredito: 'REPROVADO', detalhe: `${pendentes.length} pendente(s): ${pendentes.map((t) => t.id).join(', ')}` }
    : { nome: 'validacao manual', veredito: 'APROVADO', detalhe: 'nada pendente' })

  const marca = (v: Veredito) => (v === 'APROVADO' ? '✓' : v === 'REPROVADO' ? '✗' : '?')
  console.log('PORTAO DE LANCAMENTO — este projeto pode ir a publico?\n')
  for (const i of itens) console.log(`  ${marca(i.veredito)} ${i.nome.padEnd(22)} ${i.veredito.padEnd(14)} ${i.detalhe}`)

  const barram = itens.filter((i) => i.veredito !== 'APROVADO')
  console.log('')
  if (barram.length === 0) {
    console.log('APROVADO. Publicar e consequencia de um gate verde, nao ato de vontade.')
    return 0
  }
  console.log(`REPROVADO — ${barram.length} item(ns) barram.`)
  console.log('`NÃO EXECUTADO` tambem reprova: gate que nao rodou nao e gate verde.')
  return 1
}
