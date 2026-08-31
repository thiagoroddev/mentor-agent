import { agora, caminhos, escreverJson, escreverTexto, existe, NOME_DOS_DOCUMENTOS } from './arquivos.ts'
import { carregarContexto } from './vistas.ts'
import { MARCADOR } from './tipos.ts'

/**
 * Rascunho para ferramentas que quase todo projeto usa do mesmo jeito.
 * **Nao e' padrao imposto:** cada linha nasce marcada para confirmar ou trocar. O pacote continua
 * sem opiniao sobre ferramenta; o que ele economiza e' digitacao.
 */
const RASCUNHOS: Record<string, string[]> = {
  github: [
    'Ramo principal protegido: nao aceita envio direto',
    'Toda mudanca entra por revisao, com a esteira verde',
    'Apagar o ramo automaticamente no merge (Settings > General > Pull Requests)',
    'Alertas de vulnerabilidade e atualizacoes de seguranca ligados (Settings > Code security)',
    'Bot de dependencias semanal, segunda de manha, limite de 5 propostas abertas',
    'Esteira roda em todo ramo; a de publicacao roda so na principal',
    'Segredos no cofre do repositorio, nunca no arquivo da esteira',
  ],
}

/**
 * Cria a convencao de uma ferramenta e registra o vinculo no contexto.
 * O conteudo e' preferencia do dono do projeto: nao existe gate sobre ele.
 * A unica checagem e' referencial: ferramenta declarada tem arquivo, ou tem dispensa com motivo.
 */
export function adicionarFerramenta(nome: string, flags: Record<string, string | undefined>): void {
  const c = caminhos()
  const arquivo = `${c.stack}/${nome}.md`
  const ctx = carregarContexto()

  const rascunho = RASCUNHOS[nome.toLowerCase()]
  if (!existe(arquivo)) {
    escreverTexto(arquivo, [
      `# ${nome}`,
      '',
      `Papel no projeto: ${MARCADOR} para que serve aqui · Versao: ${flags.versao ?? MARCADOR + ' versao'}`,
      '',
      '## Decidido',
      '',
      ...(rascunho
        ? rascunho.map((linha) => `- ${linha}  <!-- ${MARCADOR} confirmar ou trocar -->`)
        : [`- ${MARCADOR} uma linha por convencao, no imperativo`]),
      '',
      '## Por que',
      '',
      `${MARCADOR} so onde a escolha nao e obvia. Apague esta secao se todas forem.`,
      '',
      '## Nao usamos',
      '',
      `- ${MARCADOR} o que foi descartado e por que. Sem isto, a decisao recusada volta na proxima tarefa`,
      '',
      '## Exemplo curto',
      '',
      '```',
      `${MARCADOR} o menor exemplo que mostra a convencao em uso`,
      '```',
      '',
      '## Revisar quando',
      '',
      `${MARCADOR} o evento que torna esta convencao obsoleta`,
    ].join('\n'))
  }

  const jaTem = ctx.ferramentas.find((f) => f.nome === nome)
  if (!jaTem) {
    ctx.ferramentas.push({
      nome,
      papel: flags.papel ?? null,
      versao: flags.versao ?? null,
      padrao: `${NOME_DOS_DOCUMENTOS}/padroes-de-stack/${nome}.md`,
      adotada_em: agora().log,
      adr: flags.adr ?? null,
    })
    escreverJson(c.contexto, ctx)
  }
  console.log(`Convencao criada em ${NOME_DOS_DOCUMENTOS}/padroes-de-stack/${nome}.md`)
  if (rascunho) {
    console.log(`${rascunho.length} linhas ja vem escritas como rascunho, cada uma marcada para confirmar ou trocar.`)
  }
  console.log('Preencha por entrevista (.mentor/processos/padroes-de-stack.md) e apresente antes de valer.')
}
