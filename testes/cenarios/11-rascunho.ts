import { abrirCenario, confere, dizQue, escrever, ler, lerJson, mentor } from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/** Onde a melhoria vai nao e' decisao de memoria, e toda ideia nova comeca em rascunho. */
export function rodar(): Cenario {
  const c = abrirCenario('11-rascunho')
  mentor(c, 'init')

  const leiaMeRascunho = ler(c, 'docs-mentor/rascunhos/LEIA-ME.md')
  confere(c, leiaMeRascunho.includes('Zona livre para exploracao'), 'init cria LEIA-ME.md na pasta de rascunhos')

  const leiaGeral = ler(c, 'docs-mentor/LEIA.md')
  confere(c, leiaGeral.includes('rascunhos/') && leiaGeral.includes('melhorias-do-pacote.md'),
    'LEIA.md documenta rascunhos e melhorias-do-pacote')

  dizQue(c, mentor(c, 'anotar', 'a fila recusou sem dizer o que fazer'),
    'Falta --sobre pacote|projeto', 'o comando recusa decidir por voce onde a anotacao vai')
  dizQue(c, mentor(c, 'anotar', 'x'), 'a regra atrapalhou', 'e mostra a regra que decide, na propria recusa')

  const noPacote = mentor(c, 'anotar', '--sobre', 'pacote', 'o doctor nao lembra de diagrama na descoberta')
  dizQue(c, noPacote, 'Nao vira tarefa daqui', 'anotacao sobre o pacote nao vira tarefa do projeto')
  const melhorias = ler(c, 'docs-mentor/melhorias-do-pacote.md')
  confere(c, melhorias.includes('o doctor nao lembra de diagrama'), 'a anotacao fica registrada com data')

  const noProjeto = mentor(c, 'anotar', '--sobre', 'projeto', 'avaliar cache de sessao no login')
  dizQue(c, noProjeto, 'avaliar-cache-de-sessao-no-login', 'o nome do rascunho vem do texto, nao do valor da flag')

  const rascunho = ler(c, 'docs-mentor/rascunhos/2026-08-29--avaliar-cache-de-sessao-no-login.md')
  confere(c, rascunho.includes('Rascunho nao e tarefa'), 'o rascunho diz o que ele nao e')
  confere(c, rascunho.includes('(ainda em aberto)'), 'e nasce sem destino, que e o estado honesto')

  // --- fase inicial sem rascunho nenhum e' sinal de que se comecou a construir antes de entender
  const limpo = abrirCenario('11-rascunho-vazio')
  mentor(limpo, 'init')
  const ctx = lerJson<Record<string, any>>(limpo, 'docs-mentor/contexto.json')
  ctx['estado'].fase = 'descoberta'
  escrever(limpo, 'docs-mentor/contexto.json', JSON.stringify(ctx, null, 2))
  dizQue(c, mentor(limpo, 'doctor'), 'sem nenhum rascunho',
    'fase inicial sem rascunho e cobrado pelo doctor, sem ninguem pedir')

  const ctx2 = lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
  ctx2['estado'].fase = 'descoberta'
  escrever(c, 'docs-mentor/contexto.json', JSON.stringify(ctx2, null, 2))
  dizQue(c, mentor(c, 'doctor'), '1 rascunho(s) na fase "descoberta"', 'com rascunho, vira confirmacao')

  // --- o relatorio nao carrega o conteudo das anotacoes sem --detalhado
  mentor(c, 'relatorio-de-campo')
  const limpo1 = ler(c, 'docs-mentor/relatorio-de-campo.md')
  confere(c, limpo1.includes('Conteudo omitido'), 'sem --detalhado, o relatorio conta mas nao mostra')
  confere(c, !limpo1.includes('o doctor nao lembra de diagrama'), 'e o texto anotado nao vaza')

  mentor(c, 'relatorio-de-campo', '--detalhado')
  confere(c, ler(c, 'docs-mentor/relatorio-de-campo.md').includes('o doctor nao lembra de diagrama'),
    'com --detalhado, o conteudo entra: quem e dono do projeto e do pacote pode leva-lo junto')
  return c
}
