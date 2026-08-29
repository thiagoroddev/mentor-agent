import { spawnSync } from 'node:child_process'
import {
  abrirCenarioTemporario, confere, dizQue, escrever, fecharTemporario, ler, lerJson, mentor,
} from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/**
 * O auditor. Um pacote cujo proposito e' **separar quem escreve de quem aprova** nao se prova
 * mostrando que o dossie sai bonito: prova-se mostrando o que ele **recusa**.
 * Precisa de git de verdade, entao roda fora do repositorio, num diretorio temporario.
 */
export function rodar(): Cenario {
  const c = abrirCenarioTemporario('12-auditoria')
  const sh = (...args: string[]) =>
    spawnSync(args[0]!, args.slice(1), { cwd: c.pasta, encoding: 'utf8' })
  const commit = (msg: string) => {
    sh('git', 'add', '-A')
    sh('git', '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', msg)
  }

  sh('git', 'init', '-q')
  escrever(c, 'a.ts', 'export const soma = (a: number, b: number) => a + b\n')
  commit('inicio')
  mentor(c, 'init')

  const ctx = lerJson<Record<string, any>>(c, 'docs/contexto.json')
  ctx['gates']['testes'].comando = 'echo "1 passed"'
  ctx['qualidade'].metodo_de_teste = 'teste-depois'
  ctx['qualidade'].metodo_motivo = 'cenario de teste do proprio pacote'
  ctx['auditoria'].cadencia_em_tarefas = 2
  escrever(c, 'docs/contexto.json', JSON.stringify(ctx, null, 2))
  commit('mentor init')

  const fechar = (id: string, arquivo: string, conteudo: string) => {
    mentor(c, 'task', 'iniciar', id)
    escrever(c, arquivo, conteudo)
    const t = lerJson<Record<string, any>>(c, `docs/tarefas/abertas/${id}.json`)
    t['plano'] = {
      muda: [`${arquivo} - a mudanca`],
      criterios_aceite: [{ texto: 'faz o que foi pedido', teste: 'a.test.ts > caso feliz' }],
      impacto: 'modulo a', riscos: ['nenhum identificado'], dependencias_novas: [],
      proporcionalidade: 'do tamanho do pedido',
    }
    escrever(c, `docs/tarefas/abertas/${id}.json`, JSON.stringify(t, null, 2))
    escrever(c, `docs/tarefas/abertas/${id}.md`,
      '# t\n\n## Decisoes tomadas\na\n\n## O que nao foi feito, e por que\nb\n\n' +
      '## Testes de descoberta\nNenhuma.\n\n## Aprendizados\nNada.\n')
    mentor(c, 'task', 'gate', id, 'testes')
    return mentor(c, 'task', 'finalizar', id)
  }

  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Somar parcelas', '--esforco', 'P/P', '--origem', 'titulo-autossuficiente')
  mentor(c, 'task', 'puxar', 'TASK-RF-001')
  fechar('TASK-RF-001', 'a.ts', 'export const soma = (a: number, b: number) => a + b + 0\n')
  const t1 = lerJson<Record<string, any>>(c, 'docs/tarefas/concluidas/2026-08-29--14h00--TASK-RF-001.json')
  confere(c, typeof t1['commit_base'] === 'string' && t1['commit_base'].length === 40,
    'o iniciar grava o commit_base, que e a base do diff da auditoria')
  commit('TASK-RF-001')

  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Subtrair parcelas', '--esforco', 'P/P', '--origem', 'titulo-autossuficiente')
  mentor(c, 'task', 'puxar', 'TASK-RF-002')
  const fim = fechar('TASK-RF-002', 'b.ts', 'export const sub = (a: number, b: number) => a - b\n')
  dizQue(c, fim, 'sem auditoria', 'ao bater a cadencia, o finalizar avisa sozinho')
  commit('TASK-RF-002')
  // Depois do commit de proposito: arquivo que o git nunca viu nao sai em `git diff`, e e' onde o
  // erro novo costuma morar. Se ele entrar no dossie por ser rastreado, o teste nao prova nada.
  escrever(c, 'login.ts', 'const SENHA = "hunter2"\nexport const login = (u: string, p: string) => p === SENHA\n')

  // --- o dossie
  dizQue(c, mentor(c, 'auditar', 'preparar'), '2 tarefa(s) no lote', 'o lote e o que foi concluido desde a ultima auditoria')
  const dossie = ler(c, 'docs/auditorias/AUD-001-dossie.md')
  confere(c, dossie.includes('TASK-RF-001') && dossie.includes('TASK-RF-002'), 'o dossie traz as duas tarefas')
  confere(c, dossie.includes('+export const sub'), 'o dossie traz o diff de verdade, nao a promessa de que houve um')
  confere(c, dossie.includes('Nao leia o resto do repositorio'), 'o escopo fechado vai escrito no dossie')
  confere(c, dossie.includes('a.ts') && dossie.includes('b.ts'), 'os arquivos do lote aparecem')
  confere(c, dossie.includes('+const SENHA = "hunter2"'),
    'arquivo nunca commitado entra inteiro: e onde o erro novo mora, e o git diff nao o mostra')
  confere(c, !dossie.includes('"tarefas_concluidas"'),
    'as vistas geradas ficam fora do diff: contabilidade do proprio pacote afogaria o codigo')

  dizQue(c, mentor(c, 'auditar', 'preparar'), 'preparada e nunca registrada',
    'nao se abre auditoria nova com uma pendurada: seria assim que ela vira ritual')

  // --- as recusas
  const aud = () => lerJson<Record<string, any>>(c, 'docs/auditorias/AUD-001.json')
  const gravar = (a: Record<string, any>) => escrever(c, 'docs/auditorias/AUD-001.json', JSON.stringify(a, null, 2))

  dizQue(c, mentor(c, 'auditar', 'registrar', 'AUD-001'), 'sem veredito', 'registrar sem veredito nao passa')

  const a1 = aud()
  a1['veredito'] = 'APROVADO'
  a1['nao_verificado'] = []
  gravar(a1)
  dizQue(c, mentor(c, 'auditar', 'registrar', 'AUD-001'), '"nao_verificado" vazio',
    'auditoria que diz ter verificado tudo esta quebrada, e o comando recusa')

  const a2 = aud()
  a2['nao_verificado'] = ['nao rodei a aplicacao: o diff nao inclui como executa-la']
  a2['pendencias'] = [{ id: '', nivel: 'bloqueia', descricao: 'b.ts nao tem teste nomeado no criterio', tarefas: ['TASK-RF-002'], destino: null, ref: null, resolvida_em: null }]
  gravar(a2)
  dizQue(c, mentor(c, 'auditar', 'registrar', 'AUD-001'), 'nao ha aprovacao com bloqueio pendente',
    'APROVADO com achado que bloqueia e contradicao, e o comando recusa')

  const a3 = aud()
  a3['veredito'] = 'REPROVADO'
  a3['pendencias'][0].destino = 'tarefa'
  a3['pendencias'][0].ref = 'TASK-BG-001'
  gravar(a3)
  dizQue(c, mentor(c, 'auditar', 'registrar', 'AUD-001'), 'nunca decide o que vira trabalho',
    'o auditor que ja escolhe o destino esta abrindo tarefa por conta propria')

  const a4 = aud()
  a4['pendencias'][0].destino = null
  a4['pendencias'][0].ref = null
  gravar(a4)
  const ok = mentor(c, 'auditar', 'registrar', 'AUD-001')
  dizQue(c, ok, 'REPROVADO', 'com tudo no lugar, registra')
  dizQue(c, ok, 'AUD-001-B01', 'o ID do achado sai do script, nunca do auditor')

  const ctxDepois = lerJson<Record<string, any>>(c, 'docs/contexto.json')
  confere(c, ctxDepois['auditoria'].pendencias_reportadas.length === 1, 'o bloqueio fica no contexto ate alguem decidir')
  confere(c, ctxDepois['auditoria'].ultima_na_tarefa === 2, 'a cadencia recomeca do numero certo')
  dizQue(c, mentor(c, 'doctor'), 'sem destino', 'o doctor conta o achado da auditoria como bloqueio')

  // --- o destino e do humano
  dizQue(c, mentor(c, 'auditar', 'resolver', 'AUD-001-B01', '--destino', 'tarefa'), 'Falta --ref',
    'destino sem referencia deixa o achado em limbo')
  dizQue(c, mentor(c, 'auditar', 'resolver', 'AUD-001-B01', '--destino', 'divida_tecnica', '--ref', 'DT-1'),
    'resolvida', 'com destino e ref, o humano fecha o achado')
  const ctxFinal = lerJson<Record<string, any>>(c, 'docs/contexto.json')
  confere(c, ctxFinal['auditoria'].pendencias_reportadas.length === 0, 'resolvido sai do contexto')

  dizQue(c, mentor(c, 'auditar', 'preparar'), 'Nada a auditar', 'sem tarefa nova, nao ha lote')

  fecharTemporario(c)
  return c
}
