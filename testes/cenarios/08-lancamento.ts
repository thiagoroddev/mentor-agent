import { abrirCenario, confere, dizQue, escrever, ler, lerJson, mentor } from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/** Risco aceito e portão de lançamento: publicar vira consequência de gate verde. */
export function rodar(): Cenario {
  const c = abrirCenario('08-lancamento')
  mentor(c, 'init')
  const ctx = lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
  ctx['estado'].fase = 'pre-lancamento'
  ctx['gates'].testes.comando = 'echo "12 passed"'
  const salvar = () => escrever(c, 'docs-mentor/contexto.json', JSON.stringify(ctx, null, 2))
  salvar()

  // --- nenhum campo do registro e opcional: e por isso que ele funciona
  dizQue(c, mentor(c, 'ra', 'nova', '--titulo', 'CVE em dependencia de producao'),
    'Falta --justificativa', 'registro sem justificativa e recusado')
  dizQue(c, mentor(c, 'ra', 'nova', '--titulo', 'x', '--justificativa', 'y',
    '--evidencia', 'npm audit --json', '--revisar-em', '15/11/26 14:00', '--tarefa-de-saida', 'TASK-BG-001'),
    'Falta --aceito-por', 'registro sem responsavel nominal e recusado: a IA nao se concede excecoes')

  const criado = mentor(c, 'ra', 'nova',
    '--titulo', 'Redirecionamento aberto em rota nao alcancavel neste app',
    '--justificativa', 'a falha e do modo servidor; este app e cliente puro, sem servidor',
    '--evidencia', 'npm audit --json | grep -c "rota-servidor"',
    '--aceito-por', 'Thiago', '--revisar-em', '15/11/26 14:00', '--tarefa-de-saida', 'TASK-BG-001')
  dizQue(c, criado, 'RA-001 registrado', 'com todos os campos, o registro nasce')
  dizQue(c, criado, 'vencido reprova mais alto que o problema original', 'o comando avisa o que o prazo significa')

  const vista = ler(c, 'docs-mentor/seguranca/riscos-aceitos.md')
  confere(c, vista.includes('no prazo'), 'a vista mostra o estado do risco')
  confere(c, vista.includes('## Encerrados'), 'a vista tem secao de encerrados: encerrar move, nunca apaga')

  // --- prazo acima de 90 dias e invalido
  const riscos = lerJson<Array<Record<string, any>>>(c, 'docs-mentor/seguranca/riscos-aceitos.json')
  riscos[0]!['data_revisao'] = '29/03/27 14:00'
  escrever(c, 'docs-mentor/seguranca/riscos-aceitos.json', JSON.stringify(riscos, null, 2))
  dizQue(c, mentor(c, 'ra'), 'acima do maximo de 90', 'prazo maior que 90 dias invalida o registro')

  // --- vencido
  riscos[0]!['data_revisao'] = '01/08/26 14:00'
  escrever(c, 'docs-mentor/seguranca/riscos-aceitos.json', JSON.stringify(riscos, null, 2))
  dizQue(c, mentor(c, 'ra'), 'VENCIDO', 'data no passado deixa o registro vencido')

  // --- `ra` e `doctor` nunca podem discordar sobre o mesmo risco.
  //     Era essa a invariante que faltava: as duas telas tinham implementacoes proprias de
  //     "vencido", e so uma estava certa. Registrar um risco aceito PIORAVA o doctor.
  const prazo = (data: string) => {
    riscos[0]!['data_revisao'] = data
    escrever(c, 'docs-mentor/seguranca/riscos-aceitos.json', JSON.stringify(riscos, null, 2))
    const ra = mentor(c, 'ra').saida
    const dr = mentor(c, 'doctor').saida
    // Ancorado no texto que so existe quando ha vencido. `/risco.*vencido/i` casava com a
    // mensagem NEGATIVA "nenhum risco aceito vencido", e o teste reprovava o codigo certo.
    return { ra, dr, raVencido: ra.includes('VENCIDO'), drVencido: dr.includes('aceito(s) VENCIDO(s)') }
  }

  const futuro = prazo('15/11/26 14:00')
  confere(c, !futuro.raVencido && !futuro.drVencido,
    'data no futuro nao vence em lugar nenhum: registrar risco aceito nao pode piorar o doctor')
  confere(c, futuro.raVencido === futuro.drVencido, 'ra e doctor concordam sobre data futura')

  const passado = prazo('01/08/26 14:00')
  confere(c, passado.raVencido && passado.drVencido, 'data no passado vence nos dois')
  confere(c, passado.raVencido === passado.drVencido, 'ra e doctor concordam sobre data passada')

  const ilegivel = prazo('quinze de novembro')
  confere(c, ilegivel.ra.includes('ilegivel'), '`ra` chama data ilegivel pelo nome')
  confere(c, !ilegivel.drVencido && /ilegivel/i.test(ilegivel.dr),
    'data ilegivel nao e "vencida": nao conseguir ler nao e o mesmo que ter passado do prazo')

  // --- vencido barra o lancamento
  riscos[0]!['data_revisao'] = '01/08/26 14:00'
  escrever(c, 'docs-mentor/seguranca/riscos-aceitos.json', JSON.stringify(riscos, null, 2))
  const barrado = mentor(c, 'lancamento')
  confere(c, barrado.codigo === 1, 'risco vencido barra o lancamento')
  dizQue(c, barrado, 'REPROVADO', 'o portao reprova')

  // --- consertado, o portao passa a barrar so o que nunca foi executado
  riscos[0]!['data_revisao'] = '15/11/26 14:00'
  escrever(c, 'docs-mentor/seguranca/riscos-aceitos.json', JSON.stringify(riscos, null, 2))
  const semReversao = mentor(c, 'lancamento')
  dizQue(c, semReversao, 'NÃO EXECUTADO', 'reversao nunca executada barra')
  dizQue(c, semReversao, 'Saber voltar e mais importante que publicar rapido', 'e diz por que')
  confere(c, semReversao.codigo === 1, '`NAO EXECUTADO` tambem reprova: gate que nao rodou nao e verde')

  ctx['operacao'].reversao.testada_em = '29/08/26 14:00'
  ctx['persistencia'].copia_de_seguranca.restauracao_testada_em = '29/08/26 14:00'
  salvar()
  const aprovado = mentor(c, 'lancamento')
  dizQue(c, aprovado, 'APROVADO. Publicar e consequencia de um gate verde', 'com tudo executado, aprova')
  confere(c, aprovado.codigo === 0, 'aprovado sai com codigo zero')

  // --- encerrar move, nunca apaga
  mentor(c, 'ra', 'encerrar', 'RA-001', '--motivo', 'dependencia atualizada na TASK-BG-001')
  const depois = ler(c, 'docs-mentor/seguranca/riscos-aceitos.md')
  confere(c, /## Encerrados[\s\S]*RA-001/.test(depois), 'o risco encerrado aparece na secao de encerrados')
  return c
}
