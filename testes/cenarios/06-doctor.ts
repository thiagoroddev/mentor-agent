import { abrirCenario, confere, dizQue, escrever, lerJson, mentor } from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/** A folha de saude: perfil ISO 25010, cadencia da revisao geral, e o veredito binario. */
export function rodar(): Cenario {
  const c = abrirCenario('06-doctor')
  mentor(c, 'init')
  // Precondicao de projeto instalado de verdade: sem ponto de entrada, nenhuma ferramenta carrega o
  // nucleo, e o doctor bloqueia com razao. Escrito a mao aqui em vez de rodar `instalar`, que
  // copiaria os 55 arquivos do pacote para dentro de cada exemplo versionado.
  for (const arquivo of ['CLAUDE.md', 'AGENTS.md', 'GEMINI.md']) {
    escrever(c, arquivo, `# entrada\n\nLeia .mentor/nucleo.md.\n`)
  }

  const ctx = lerJson<Record<string, any>>(c, 'docs/contexto.json')
  ctx['estado'].fase = 'construcao'
  for (const p of Object.keys(ctx['estado'].portoes)) {
    ctx['estado'].portoes[p].status = 'respondido'
    ctx['estado'].portoes[p].decidido_em = '29/08/26 14:00'
  }
  ctx['rigor'].nivel = 'N1'
  // Este cenario mede o perfil, nao a entrega: declara o versionamento para o unico bloqueio
  // possivel vir do perfil. Quem cobre versionamento e o cenario 07.
  for (const k of Object.keys(ctx['versionamento'])) {
    if (!k.startsWith('_')) ctx['versionamento'][k] = k === 'esteira_barra' ? ['testes'] : 'declarado'
  }
  const salvar = () => escrever(c, 'docs/contexto.json', JSON.stringify(ctx, null, 2))
  salvar()

  const limpo = mentor(c, 'doctor')
  dizQue(c, limpo, 'PRONTO PARA PUBLICO?  SIM', 'projeto sem bloqueio da veredito positivo')
  dizQue(c, limpo, 'sem meta 8', 'as oito caracteristicas comecam sem meta')

  // Meta declarada e nunca aferida NAO e' conformidade: e' um quinto estado proprio.
  const metas = ctx['qualidade'].metas_nao_funcionais
  metas.desempenho.meta = 'primeira pintura util abaixo de 2 s em 3G'
  metas.seguranca.meta = 'matriz de papeis e permissoes escrita'
  metas.seguranca.resultado = 'reprovada'
  metas.seguranca.aferida_em = '29/08/26 14:00'
  metas.seguranca.nota = '1 advisory HIGH em producao, sem risco aceito'
  metas.manutenibilidade.meta = 'nenhum arquivo acima do teto'
  metas.manutenibilidade.resultado = 'conforme'
  salvar()

  const comPerfil = mentor(c, 'doctor')
  dizQue(c, comPerfil, '?  desempenho', 'meta declarada e nunca aferida aparece como "?"')
  dizQue(c, comPerfil, '✗  seguranca', 'caracteristica reprovada aparece como reprovada')
  dizQue(c, comPerfil, 'avaliadas 2 de 8', 'conta so o que foi aferido, nao o que tem meta')
  dizQue(c, comPerfil, 'sem meta 5', 'as sem meta continuam separadas das sem afericao')
  dizQue(c, comPerfil, 'NAO — 1 bloqueio', 'caracteristica reprovada conta como bloqueio no veredito')

  // Cadencia da revisao geral: 20 avisa, 30 atrasa, 40 bloqueia.
  ctx['revisao_geral'].ultima_na_tarefa = 0
  ctx['contagens'].tarefas_concluidas = 0
  salvar()

  const escalar = (concluidas: number) => {
    const t = {
      id: `TASK-CHORE-${String(concluidas).padStart(3, '0')}`, tipo: 'CHORE', titulo: 'ruido',
      fatia_de: null, estado: 'concluida', cerimonia: 'Light', valor: 'desejavel', urgencia: 'normal',
      esforco: { humano: 'P', ia: 'P' }, depende_de: [], fila: 'ciclo', ordem: null,
      origem: 'titulo-autossuficiente', requisitos: [], criada_em: '29/08/26 14:00',
      iniciada_em: '29/08/26 14:00', concluida_em: '29/08/26 14:00',
      plano: { muda: [], criterios_aceite: [], impacto: null, riscos: [], dependencias_novas: [], proporcionalidade: null },
      gates: {}, achados: [], validacao: 'nao_requer', validado_em: null, validacao_motivo: null,
      tarefas_geradas: [], adrs: [], divida_tecnica: [], riscos_aceitos: [],
      absorvida_por: null, cancelamento_motivo: null, narrativa: null,
    }
    escrever(c, `docs/tarefas/concluidas/x-${t.id}.json`, JSON.stringify(t, null, 2))
  }
  for (let i = 1; i <= 21; i++) escalar(i)
  dizQue(c, mentor(c, 'doctor'), 'revisao geral pendente ha 21 tarefas', 'em 20 tarefas o doctor avisa')
  for (let i = 22; i <= 41; i++) escalar(i)
  dizQue(c, mentor(c, 'doctor'), '41 tarefas desde a ultima revisao geral', 'em 40 tarefas vira bloqueio')

  const depois = lerJson<Record<string, any>>(c, 'docs/contexto.json')
  confere(c, Array.isArray(depois['lembretes']) && depois['lembretes'].length > 0,
    'os lembretes sao gravados no contexto pelo doctor')
  confere(c, depois['qualidade'].perfil.reprovadas === 1, 'o perfil fica registrado no contexto')
  return c
}
