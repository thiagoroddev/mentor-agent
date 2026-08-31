import { spawnSync } from 'node:child_process'
import {
  abrirCenario, abrirCenarioTemporario, confere, dizQue, escrever, fecharTemporario, ler, lerJson, mentor,
} from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/** Entrega: gates do projeto, barreira local sem dependencia, e o gatilho na fase certa. */
export function rodar(): Cenario {
  const c = abrirCenario('07-entrega')
  mentor(c, 'init')
  const ctx = lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
  const salvar = () => escrever(c, 'docs-mentor/contexto.json', JSON.stringify(ctx, null, 2))

  // --- o gatilho: versionamento se cobra em CONSTRUCAO, nao em pre-lancamento
  ctx['estado'].fase = 'ideia'
  salvar()
  confere(c, !mentor(c, 'doctor').saida.includes('versionamento nao declarado'),
    'na fase ideia o versionamento ainda nao e cobrado')

  ctx['estado'].fase = 'construcao'
  salvar()
  dizQue(c, mentor(c, 'doctor'), 'versionamento nao declarado, e a fase "construcao" ja exige',
    'na construcao o versionamento passa a ser bloqueio')

  // --- a pergunta que ninguem faz porque parece obvia demais.
  //     Fora do repositorio, porque os exemplos normais sao cobertos pelo git deste projeto.
  const solto = abrirCenarioTemporario('sem-git')
  mentor(solto, 'init')
  dizQue(c, mentor(solto, 'doctor'), 'nao esta versionado',
    'projeto sem repositorio git e bloqueio, e ninguem precisa lembrar de perguntar')
  fecharTemporario(solto)

  // Tambem fora do repositorio, e a razao vale registrar: esta asercao vivia no exemplo de dentro e
  // quebrou no dia em que o proprio pacote ganhou um remoto. Teste que depende do estado do
  // repositorio hospedeiro nao testa o pacote: testa o ambiente.
  const local = abrirCenarioTemporario('sem-remoto')
  spawnSync('git', ['init', '-q'], { cwd: local.pasta })
  spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'i'], { cwd: local.pasta })
  mentor(local, 'init')
  dizQue(c, mentor(local, 'doctor'), 'sem remoto',
    'versionado sem remoto vira aviso: o trabalho existe so nesta maquina')
  fecharTemporario(local)

  // --- gates: usa os comandos do projeto, nunca um `npm run` suposto
  const semGate = mentor(c, 'gates')
  dizQue(c, semGate, 'Nenhum gate declarado', 'sem gate declarado, o comando diz isso em vez de inventar')

  ctx['gates'].testes.comando = 'echo "3 passed"'
  ctx['gates'].lint.comando = 'exit 1'
  salvar()
  const reprovando = mentor(c, 'gates')
  confere(c, reprovando.codigo === 1, 'gate reprovado faz o comando sair diferente de zero')
  dizQue(c, reprovando, '1 gate(s) reprovado(s)', 'o comando conta quantos reprovaram')

  ctx['gates'].lint.comando = 'echo "sem problemas"'
  salvar()
  confere(c, mentor(c, 'gates').codigo === 0, 'com tudo verde, o comando aprova')

  // --- barreira local: arquivo versionado + core.hooksPath, sem dependencia
  mentor(c, 'hooks', '--instalar')
  const hook = ler(c, '.githooks/pre-push')
  confere(c, hook.includes('node mentor.mjs gates'), 'o hook chama os gates do projeto')
  confere(c, hook.includes('pre-push'), 'o hook documenta por que e pre-push e nao pre-commit')

  // --- rascunho de stack: escrito, mas marcado para confirmar
  mentor(c, 'stack', 'github')
  const convencao = ler(c, 'docs-mentor/padroes-de-stack/github.md')
  confere(c, convencao.includes('Ramo principal protegido'), 'a convencao de github ja vem rascunhada')
  confere(c, (convencao.match(/PREENCHER: confirmar ou trocar/g) ?? []).length >= 7,
    'toda linha do rascunho vem marcada para confirmar ou trocar: nao e padrao imposto')
  const depois = lerJson<Array<Record<string, any>>>(c, 'docs-mentor/contexto.json')
  confere(c, Array.isArray(depois) === false, 'contexto continua sendo objeto')

  const ctxFinal = lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
  confere(c, ctxFinal['ferramentas'].some((f: Record<string, any>) => f['nome'] === 'github'),
    'a ferramenta fica registrada no contexto, ligada ao arquivo de padrao')
  return c
}
