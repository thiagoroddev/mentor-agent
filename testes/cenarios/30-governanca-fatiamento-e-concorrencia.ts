import { spawnSync } from 'node:child_process'
import {
  abrirCenarioTemporario, apagar, confere, dizQue, escrever, fecharTemporario, ler, lerJson, mentor,
} from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/**
 * Cenario 30: Governanca de Fatiamento, Concorrencia e Restricoes (Frentes A, B, C, D, F, G)
 * 1. Fatiamento independente (sem encadeamento automatico) e ordenacao explicita com --ordem e --motivo-ordem.
 * 2. Validacao de ciclos em --ordem.
 * 3. Governanca de epico: primeira fatia exige plano_do_epico preenchido; desvio de estrategia bloqueia
 *    fatia seguinte ate --estrategia-revisada --motivo.
 * 4. Meio de validacao e catalogo estruturado (--casos) em formato JSON, e evidencia >= 30 caracteres.
 * 5. Resolucao 3-way de conflitos em requisitos.json via resolver-gerados.
 * 6. Governanca de restricoes fundadoras (M3): alerta no doctor na 2a reconfirmacao, bloqueio sem ADR na 3a
 *    e finalizacao com ADR vinculada.
 */
export function rodar(): Cenario {
  const c = abrirCenarioTemporario('30-governanca-fatiamento-e-concorrencia')
  const sh = (...args: string[]) =>
    spawnSync(args[0]!, args.slice(1), { cwd: c.pasta, encoding: 'utf8' })
  const commit = (msg: string) => {
    sh('git', 'add', '-A')
    sh('git', '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', msg)
  }

  sh('git', 'init', '-q')
  sh('git', 'branch', '-M', 'main')
  escrever(c, 'README.md', '# Projeto Governanca e Concorrencia\n')
  commit('inicio')
  mentor(c, 'instalar', '--destino', c.pasta)
  mentor(c, 'init')

  // Configura gates basicos
  const ctx = lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
  ctx.gates.testes = { comando: 'node -e "console.log(\'1 passed\')"' }
  ctx.qualidade.metodo_de_teste = 'teste-depois'
  ctx.qualidade.metodo_motivo = 'cenario de governanca'
  escrever(c, 'docs-mentor/contexto.json', JSON.stringify(ctx, null, 2))
  commit('configura gates')

  const basePlano = {
    impacto: 'modulo do cenario',
    riscos: ['nenhum identificado'],
    dependencias_novas: [],
    proporcionalidade: 'direto',
    problema_canonico: 'sem nome canonico',
    pedido_original: 'pedido do cenario',
    solucao_sugerida: null,
    alternativas_profissionais: [],
    discordancia: {
      o_que_faria_diferente: 'Nada a objetar',
      o_que_preocupa: 'Nada a objetar',
      o_que_existe_pronto_80_porcento: 'Nenhuma conhecida',
    },
  }

  // =========================================================================
  // 1. Frente C: Fatiamento Independente e Ordenacao Explicita (--ordem)
  // =========================================================================
  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Refatorar motor de calculo',
    '--esforco', 'XG/XG', '--origem', 'titulo-autossuficiente', '--sem-requisito', '--motivo', 'epico')
  
  // Fatiamento padrao: fatias sao independentes (depende_de: [])
  const rFatiarPadrao = mentor(c, 'task', 'fatiar', 'TASK-RF-001',
    '--titulos', 'Parser de expressoes|Avaliador de AST|Formatador de saida')
  dizQue(c, rFatiarPadrao, 'independentes', 'fatiar padrao cria fatias independentes sem encadeamento automatico')

  const f2 = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-RF-002.json')
  const f3 = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-RF-003.json')
  const f4 = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-RF-004.json')
  confere(c, f2.depende_de.length === 0, 'fatia 2 (primeira) nao depende de nada')
  confere(c, f3.depende_de.length === 0, 'fatia 3 nao depende automaticamente de fatia 2')
  confere(c, f4.depende_de.length === 0, 'fatia 4 nao depende automaticamente de fatia 3')

  // Novo epico para testar regras de --ordem
  mentor(c, 'task', 'nova', '--tipo', 'RF', '--titulo', 'Segundo epico com ordem explicita',
    '--esforco', 'XG/XG', '--origem', 'titulo-autossuficiente', '--sem-requisito', '--motivo', 'epico 2')

  // Recusa --ordem sem --motivo-ordem
  const rSemMotivoOrdem = mentor(c, 'task', 'fatiar', 'TASK-RF-005',
    '--titulos', 'Entrada|Processamento|Saida',
    '--ordem', '1>2,2>3')
  dizQue(c, rSemMotivoOrdem, '--ordem exige --motivo-ordem', 'fatiar recusa --ordem sem --motivo-ordem')

  // Recusa --ordem com ciclo
  const rCicloOrdem = mentor(c, 'task', 'fatiar', 'TASK-RF-005',
    '--titulos', 'Entrada|Processamento|Saida',
    '--ordem', '1>2,2>1',
    '--motivo-ordem', 'dependencia mutua')
  dizQue(c, rCicloOrdem, 'Ciclo detectado', 'fatiar recusa ciclo no grafo de fatias')

  // Aceita --ordem valida
  const rOrdemOk = mentor(c, 'task', 'fatiar', 'TASK-RF-005',
    '--titulos', 'Entrada|Processamento|Saida',
    '--ordem', '1>2,1>3',
    '--motivo-ordem', '2 e 3 consomem o modelo gerado por 1')
  dizQue(c, rOrdemOk, 'com ordem declarada', 'fatiar com ordem valida e motivo sucede')

  const f7 = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-RF-007.json')
  confere(c, f7.depende_de.includes('TASK-RF-006'), 'fatia 7 depende de fatia 6 conforme ordem')
  confere(c, f7.ordem_motivo === '2 e 3 consomem o modelo gerado por 1', 'ordem_motivo registrado na fatia')

  // =========================================================================
  // 2. Frente F: Governanca de Epico e Revisao de Estrategia
  // =========================================================================
  // Puxar a primeira fatia do primeiro epico (TASK-RF-002)
  mentor(c, 'task', 'puxar', 'TASK-RF-002')

  // Se o epico pai tiver marcador em plano_do_epico, iniciar da primeira fatia recusa
  const epico1 = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.json')
  epico1.plano_do_epico.objetivo = 'PREENCHER: onde a soma chega'
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.json', JSON.stringify(epico1, null, 2))

  const rIniRecusaEpico = mentor(c, 'task', 'iniciar', 'TASK-RF-002')
  dizQue(c, rIniRecusaEpico, 'contem marcador PREENCHER:', 'iniciar primeira fatia recusa se plano_do_epico do pai contem marcadores')

  // Preenche plano_do_epico do pai
  epico1.plano_do_epico = {
    objetivo: 'Motor modular sem acoplamento',
    problema_canonico: 'Parser e avaliador misturados',
    estado_da_arte: 'Arquitetura monolitica anterior',
    hipotese: 'Separacao em pipeline reduz complexidade ciclomatica',
    sinal_de_desvio: 'AST exigir estado global compartilhado',
    contrato_entre_fatias: {
      forma: 'interface AST',
      tipo: 'codigo',
      onde_vive: 'src/ast.ts',
      fatia_que_cria: 'TASK-RF-002',
    },
    restricoes_reavaliadas: [],
    revisoes_de_estrategia: [],
  }
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-001.json', JSON.stringify(epico1, null, 2))

  // Agora iniciar a fatia 2 (primeira fatia) sucede e inicializa plano.composicao
  const rIniF2 = mentor(c, 'task', 'iniciar', 'TASK-RF-002')
  dizQue(c, rIniF2, 'em execucao', 'iniciar primeira fatia sucede com plano_do_epico preenchido')

  const f2Ini = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-RF-002.json')
  confere(c, Boolean(f2Ini.plano?.composicao), 'iniciar preencheu esqueleto de composicao')

  // =========================================================================
  // 3. Frente D: Validacao Estruturada (--casos) e Evidencia
  // =========================================================================
  // Evidencia curta (<30 caracteres) e recusada
  const rValCurta = mentor(c, 'task', 'validar', 'TASK-RF-002', '--aprovado', '--evidencia', 'teste ok')
  dizQue(c, rValCurta, 'minimo 30 caracteres', 'validar recusa evidencia curta')

  // Catalogo de casos com caso com erro e recusado
  escrever(c, 'casos-com-falha.json', JSON.stringify([
    { id: 'C1', descricao: 'parser simples', esperado: 'AST', observado: 'AST quebrada', resultado: 'reprovado' },
  ]))
  const rValCasosFalha = mentor(c, 'task', 'validar', 'TASK-RF-002', '--aprovado', '--casos', 'casos-com-falha.json')
  dizQue(c, rValCasosFalha, 'resultado reprovado', 'validar recusa catalogo contendo teste com status FAIL')
  apagar(c, 'casos-com-falha.json')

  // Catalogo de casos valido
  escrever(c, 'casos-sucesso.json', JSON.stringify([
    { id: 'C1', descricao: 'parser binario', esperado: 'AST binaria', observado: 'AST binaria', resultado: 'aprovado' },
    { id: 'C2', descricao: 'parser unario', esperado: 'AST unaria', observado: 'AST unaria', resultado: 'aprovado' },
  ]))
  const rValOk = mentor(c, 'task', 'validar', 'TASK-RF-002',
    '--aprovado',
    '--casos', 'casos-sucesso.json',
    '--evidencia', 'Todos os 2 casos de teste estruturados executaram com sucesso total.')
  dizQue(c, rValOk, 'validacao aprovado', 'validar aceita catalogo estruturado valido com evidencia completa')

  // Preparar fechamento de TASK-RF-002 com desvio de estrategia (a_direcao_se_mantem: false)
  f2Ini.plano = {
    ...f2Ini.plano,
    ...basePlano,
    muda: ['src/ast.ts - definicao de AST', 'casos-sucesso.json - catalogo de testes'],
    criterios_aceite: [{ texto: 'gera AST', teste: 'nao se aplica: cenario' }],
    composicao: {
      fatia_de: 'TASK-RF-001',
      o_que_esta_fatia_entrega: 'interface AST basica',
      a_direcao_se_mantem: false,
      porque: 'Descoberta tecnica inviabiliza arquitetura linear original',
    },
    restricoes_reavaliadas: [
      {
        restricao: 'Usar somente TypeScript puro',
        onde_foi_escrita: 'docs-mentor/normas.md',
        o_que_elimina_nesta_tarefa: 'dependencias de runtime',
        reconfirmada: true,
      },
    ],
  }
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-002.json', JSON.stringify(f2Ini, null, 2))
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-002.md', '# F2\n\n## Decisoes tomadas\nOk.\n\n## O que nao foi feito, e por que\nNada.\n\n## Aprendizados\nNada.\n\n## Desfecho\nGates verdes; nada fora do previsto.\n')
  escrever(c, 'src/ast.ts', 'export interface AST { tipo: string }\n')
  mentor(c, 'task', 'gate', 'TASK-RF-002', 'testes')
  const rFinF2 = mentor(c, 'task', 'finalizar', 'TASK-RF-002')
  dizQue(c, rFinF2, 'concluida', 'finaliza fatia 2 com desvio registrado na composicao')
  commit('fecha TASK-RF-002')

  // Iniciar fatia 3 (TASK-RF-003) sem --estrategia-revisada e RECUSADO devido ao desvio em fatia 2
  mentor(c, 'task', 'puxar', 'TASK-RF-003')
  const rIniF3Bloq = mentor(c, 'task', 'iniciar', 'TASK-RF-003')
  dizQue(c, rIniF3Bloq, 'direcao do epico nao se mantem', 'iniciar fatia seguinte bloqueia se fatia anterior registrou desvio sem revisao de estrategia')

  // Iniciar fatia 3 com revisao de estrategia explicita
  const rIniF3Ok = mentor(c, 'task', 'iniciar', 'TASK-RF-003',
    '--estrategia-revisada',
    '--motivo', 'Estrategia revisada para modelo baseado em grafo conforme aprendizado da fatia 2')
  dizQue(c, rIniF3Ok, 'em execucao', 'iniciar fatia seguinte sucede com --estrategia-revisada e --motivo')

  // =========================================================================
  // 4. Frente G: Restricoes Fundadoras e ADRs (M3)
  // =========================================================================
  // TASK-RF-003 reconfirma a mesma restricao fundadora pela 2a vez
  const f3Ini = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-RF-003.json')
  f3Ini.plano = {
    ...f3Ini.plano,
    ...basePlano,
    muda: ['src/grafo.ts - modelo de grafo'],
    criterios_aceite: [{ texto: 'modelo de grafo', teste: 'nao se aplica: cenario' }],
    composicao: {
      fatia_de: 'TASK-RF-001',
      o_que_esta_fatia_entrega: 'estrutura em grafo',
      a_direcao_se_mantem: true,
      porque: 'Validado tecnicamente',
    },
    restricoes_reavaliadas: [
      {
        restricao: 'Usar somente TypeScript puro',
        onde_foi_escrita: 'docs-mentor/normas.md',
        o_que_elimina_nesta_tarefa: 'dependencias de parser externo',
        reconfirmada: true,
      },
    ],
  }
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-003.json', JSON.stringify(f3Ini, null, 2))
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-003.md', '# F3\n\n## Decisoes tomadas\nOk.\n\n## O que nao foi feito, e por que\nNada.\n\n## Aprendizados\nNada.\n\n## Desfecho\nGates verdes; nada fora do previsto.\n')
  escrever(c, 'src/grafo.ts', 'export const grafo = true\n')
  mentor(c, 'task', 'gate', 'TASK-RF-003', 'testes')
  const rFinF3 = mentor(c, 'task', 'finalizar', 'TASK-RF-003')
  dizQue(c, rFinF3, 'concluida', 'finaliza fatia 3 na segunda reconfirmacao')
  commit('fecha TASK-RF-003')

  // Doctor alerta sobre a 2a reconfirmacao
  const rDoc2 = mentor(c, 'doctor')
  dizQue(c, rDoc2, 'reconfirmada em 2 tarefas', 'doctor alerta na 2a reconfirmacao de restricao fundadora')

  // Agora fatia 4 tenta reconfirmar pela 3a vez sem ADR: deve ser RECUSADA
  mentor(c, 'task', 'puxar', 'TASK-RF-004')
  mentor(c, 'task', 'iniciar', 'TASK-RF-004')
  const f4Ini = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-RF-004.json')
  f4Ini.plano = {
    ...f4Ini.plano,
    ...basePlano,
    muda: ['src/saida.ts - formatador'],
    criterios_aceite: [{ texto: 'formata saida', teste: 'nao se aplica: cenario' }],
    composicao: {
      fatia_de: 'TASK-RF-001',
      o_que_esta_fatia_entrega: 'formatador final',
      a_direcao_se_mantem: true,
      porque: 'Conforme planejado',
    },
    restricoes_reavaliadas: [
      {
        restricao: 'Usar somente TypeScript puro',
        onde_foi_escrita: 'docs-mentor/normas.md',
        o_que_elimina_nesta_tarefa: 'formatador externo',
        reconfirmada: true,
      },
    ],
  }
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-004.json', JSON.stringify(f4Ini, null, 2))
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-004.md', '# F4\n\n## Decisoes tomadas\nOk.\n\n## O que nao foi feito, e por que\nNada.\n\n## Aprendizados\nNada.\n\n## Desfecho\nGates verdes; nada fora do previsto.\n')
  escrever(c, 'src/saida.ts', 'export const saida = true\n')
  mentor(c, 'task', 'gate', 'TASK-RF-004', 'testes')

  // Finalizar sem ADR na 3a reconfirmacao recusa
  const rFinF4SemAdr = mentor(c, 'task', 'finalizar', 'TASK-RF-004')
  dizQue(c, rFinF4SemAdr, 'A 3a reconfirmacao exige ADR', 'finalizar recusa na 3a reconfirmacao sem ADR (regra M3)')

  // Vincular um ID sem ADR escrita nao basta: ate' a 0.12.0, qualquer valor em tarefa.adrs liberava.
  const f4ComAdr = lerJson<Record<string, any>>(c, 'docs-mentor/tarefas/abertas/TASK-RF-004.json')
  f4ComAdr.adrs = ['ADR-001']
  escrever(c, 'docs-mentor/tarefas/abertas/TASK-RF-004.json', JSON.stringify(f4ComAdr, null, 2))
  dizQue(c, mentor(c, 'task', 'finalizar', 'TASK-RF-004'), 'A 3a reconfirmacao exige ADR',
    'ID em tarefa.adrs sem o arquivo da ADR continua recusado')

  // ADR com numero parecido nao conta: "ADR-0010" nao e' a ADR-001
  escrever(c, 'docs-mentor/arquitetura/ADR/ADR-0010-outra-decisao.md', '# ADR-0010\n\nUsar somente TypeScript puro, em outro contexto.\n')
  dizQue(c, mentor(c, 'task', 'finalizar', 'TASK-RF-004'), 'A 3a reconfirmacao exige ADR',
    'o ID da ADR casa como palavra inteira, nao como prefixo')

  // ADR no caminho oficial, citando a restricao: fecha
  escrever(c, 'docs-mentor/arquitetura/ADR/ADR-001-typescript-puro.md',
    '# ADR-001 · TypeScript puro\n\nDecisao: usar somente TypeScript puro no parser, sem dependencia externa.\n')
  const rFinF4ComAdr = mentor(c, 'task', 'finalizar', 'TASK-RF-004')
  dizQue(c, rFinF4ComAdr, 'concluida', 'finalizar sucede na 3a reconfirmacao com ADR vinculada')
  commit('fecha TASK-RF-004 com ADR')
  dizQue(c, mentor(c, 'doctor'), 'possui ADR vinculada', 'doctor encontra a ADR no mesmo caminho que o finalizar')

  // =========================================================================
  // 5. Frente B: Resolucao Semantica 3-Way de Requisitos Conflitantes
  // =========================================================================
  // Inserir conflito simulado de git merge em requisitos.json
  const conflitoRequisitos = `<<<<<<< HEAD
[
  {
    "id": "RF-1",
    "tipo": "RF",
    "enunciado": "Requisito da Branch A",
    "historia": "Como usuario, quero A",
    "prioridade": "essencial",
    "status": "pendente",
    "criterios_aceite": [],
    "tarefas": [],
    "adr": null,
    "criado_em": "29/08/26 14:00",
    "implementado_em": null,
    "pendente_de_validacao": false
  }
]
=======
[
  {
    "id": "RF-2",
    "tipo": "RF",
    "enunciado": "Requisito da Branch B",
    "historia": "Como usuario, quero B",
    "prioridade": "desejavel",
    "status": "pendente",
    "criterios_aceite": [],
    "tarefas": [],
    "adr": null,
    "criado_em": "29/08/26 14:00",
    "implementado_em": null,
    "pendente_de_validacao": false
  }
]
>>>>>>> branch-b
`
  escrever(c, 'docs-mentor/requisitos/requisitos.json', conflitoRequisitos)

  const rResolver = mentor(c, 'resolver-gerados')
  dizQue(c, rResolver, 'fusao semantica 3-way concluida com sucesso', 'resolver-gerados resolve conflitos 3-way em requisitos.json')

  const reqPos = lerJson<any[]>(c, 'docs-mentor/requisitos/requisitos.json')
  confere(c, Array.isArray(reqPos), 'requisitos.json e array valido apos resolucao')
  confere(c, reqPos.some((r: any) => r.id === 'RF-1') &&
             reqPos.some((r: any) => r.id === 'RF-2'),
  'ambos os requisitos das duas pontas foram preservados sem perda')

  // Limpa arquivos auxiliares de teste para garantir verificar integro
  sh('rm', '-f', 'casos-com-falha.json')
  commit('apos resolucao 3-way')
  const rVerif = mentor(c, 'verificar')
  confere(c, rVerif.codigo === 0, 'verificar final aprova projeto integro')

  fecharTemporario(c)
  return c
}
