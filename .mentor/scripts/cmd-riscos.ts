import { agora, caminhos, diasDesde, escreverJson, escreverTexto } from './arquivos.ts'
import { carregarRiscos, carregarTarefas, estadoDoPrazo, regenerarTudo } from './vistas.ts'
import { PRAZO_MAXIMO_RISCO_DIAS } from './tipos.ts'
import type { RiscoAceito } from './tipos.ts'

type Flags = Record<string, string | undefined>

/**
 * Registro de Riscos Aceitos. A diferenca para divida tecnica nao e' de assunto, e' de efeito:
 * divida prioriza refactor; risco aceito **destrava um gate que esta' reprovando**. Por isso ele
 * exige mais: prova, responsavel nominal, saida e prazo.
 */
export interface Avaliacao {
  risco: RiscoAceito
  problemas: string[]
  vencido: boolean
}

export function avaliar(riscos: RiscoAceito[] = carregarRiscos()): Avaliacao[] {
  return riscos.map((r) => {
    const problemas: string[] = []
    if (!r.evidencia?.trim()) problemas.push('sem evidencia: o comando que qualquer um roda para conferir. Sem ela, "nao se aplica" e opiniao')
    if (!r.tarefa_de_saida?.trim()) problemas.push('sem tarefa de saida: aceitar sem caminho de volta nao e decisao, e desistencia')
    if (!r.aceito_por?.trim()) problemas.push('sem responsavel nominal: a IA nao se concede as proprias excecoes')
    if (!r.justificativa?.trim()) problemas.push('sem justificativa')

    const prazo = diasEntre(r.aceito_em, r.data_revisao)
    if (prazo !== null && prazo > PRAZO_MAXIMO_RISCO_DIAS) {
      problemas.push(`prazo de ${prazo} dias, acima do maximo de ${PRAZO_MAXIMO_RISCO_DIAS}`)
    }

    // Um veredito so', vindo de `estadoDoPrazo`. Enquanto esta tela e o doctor faziam a propria
    // conta, as duas discordavam, e quem registrava um risco aceito era punido pelo doctor.
    const estado = estadoDoPrazo(r)
    if (estado === 'ilegivel') problemas.push(`data de revisao ilegivel: "${r.data_revisao}". O formato e DD/MM/AA`)
    return { risco: r, problemas, vencido: estado === 'vencido' }
  })
}

function diasEntre(de: string | null, ate: string | null): number | null {
  const a = diasDesde(de)
  const b = diasDesde(ate)
  return a === null || b === null ? null : a - b
}

export function nova(flags: Flags): void {
  const c = caminhos()
  const riscos = carregarRiscos()
  const exigir = (nome: string) => {
    const v = flags[nome]
    if (!v) throw new Error(`Falta --${nome}. Nenhum campo do registro e opcional: e por isso que ele funciona.`)
    return v
  }
  const r: RiscoAceito = {
    id: `RA-${String(riscos.length + 1).padStart(3, '0')}`,
    titulo: exigir('titulo'),
    advisory: flags.advisory ?? null,
    pacote: flags.pacote ?? null,
    severidade: (flags.severidade ?? 'high') as RiscoAceito['severidade'],
    tipo: (flags.tipo ?? 'producao') as RiscoAceito['tipo'],
    justificativa: exigir('justificativa'),
    evidencia: exigir('evidencia'),
    aceito_por: exigir('aceito-por'),
    aceito_em: agora().log,
    data_revisao: exigir('revisar-em'),
    tarefa_de_saida: exigir('tarefa-de-saida'),
    encerrado_em: null,
  }
  const problemas = avaliar([r])[0]?.problemas ?? []
  if (problemas.length) {
    console.error(`Registro recusado:\n${problemas.map((p) => `  - ${p}`).join('\n')}`)
    process.exitCode = 1
    return
  }
  riscos.push(r)
  escreverJson(c.riscos, riscos)
  gerarVista()
  regenerarTudo()
  console.log(`${r.id} registrado. Revisar ate ${r.data_revisao}: vencido reprova mais alto que o problema original.`)
}

/** Encerrar move para a secao propria. Nunca apaga: o historico e' a trilha de auditoria. */
export function encerrar(id: string, motivo: string | undefined): void {
  if (!motivo) throw new Error('Falta --motivo.')
  const c = caminhos()
  const riscos = carregarRiscos()
  const alvo = riscos.find((r) => r.id === id)
  if (!alvo) throw new Error(`${id} nao existe.`)
  alvo.encerrado_em = agora().log
  alvo.justificativa = `${alvo.justificativa}\n\nEncerrado em ${alvo.encerrado_em}: ${motivo}`
  escreverJson(c.riscos, riscos)
  gerarVista()
  regenerarTudo()
  console.log(`${id} encerrado. Continua no registro: o historico e a trilha de auditoria.`)
}

export function gerarVista(): void {
  const c = caminhos()
  const avaliacoes = avaliar()
  const ativos = avaliacoes.filter((a) => !a.risco.encerrado_em)
  const encerrados = avaliacoes.filter((a) => a.risco.encerrado_em)

  const linhas = [
    '# Registro de Riscos Aceitos',
    '',
    '<!-- Gerado por `mentor ra`. Fonte: seguranca/riscos-aceitos.json -->',
    '',
    '> Riscos de seguranca que se decidiu **nao** corrigir agora, com prazo e responsavel.',
    '> Diferente de divida tecnica: divida prioriza refactor, risco aceito **destrava um gate que',
    '> esta reprovando**. Por isso exige prova, responsavel nominal, saida e revisao em ate 90 dias.',
    '',
    '## Ativos',
    '',
    '| ID | Titulo | Severidade | Aceito por | Revisar ate | Saida | Estado |',
    '|---|---|---|---|---|---|---|',
  ]
  for (const a of ativos) {
    const estado = a.problemas.length ? `INVALIDO: ${a.problemas[0]}` : a.vencido ? '**VENCIDO**' : 'no prazo'
    linhas.push(`| \`${a.risco.id}\` | ${a.risco.titulo} | ${a.risco.severidade} | ${a.risco.aceito_por} | ${a.risco.data_revisao} | ${a.risco.tarefa_de_saida} | ${estado} |`)
  }
  if (ativos.length === 0) linhas.push('| | Nenhum | | | | | |')

  linhas.push('', '## Encerrados', '', '| ID | Titulo | Encerrado em |', '|---|---|---|')
  for (const a of encerrados) linhas.push(`| \`${a.risco.id}\` | ${a.risco.titulo} | ${a.risco.encerrado_em} |`)
  if (encerrados.length === 0) linhas.push('| | Nenhum | |')

  escreverTexto(`${c.docs}/seguranca/riscos-aceitos.md`, linhas.join('\n'))
}

export function relatar(): void {
  const avaliacoes = avaliar()
  if (avaliacoes.length === 0) { console.log('Nenhum risco aceito registrado.'); return }
  for (const a of avaliacoes) {
    const marca = a.problemas.length ? '✗' : a.vencido ? '✗' : a.risco.encerrado_em ? '·' : '✓'
    console.log(`${marca} ${a.risco.id}  ${a.risco.titulo}`)
    if (a.vencido) console.log('    VENCIDO: mais grave que o problema original, porque a revisao parou de funcionar')
    for (const p of a.problemas) console.log(`    ${p}`)
  }
  const idsDeTarefa = new Set(carregarTarefas().map((t) => t.id))
  for (const a of avaliacoes) {
    if (a.risco.tarefa_de_saida && !idsDeTarefa.has(a.risco.tarefa_de_saida) && !/^TASK-/.test(a.risco.tarefa_de_saida)) continue
    if (a.risco.tarefa_de_saida && !idsDeTarefa.has(a.risco.tarefa_de_saida)) {
      console.log(`  aviso: ${a.risco.id} aponta para ${a.risco.tarefa_de_saida}, que nao existe`)
    }
  }
}
