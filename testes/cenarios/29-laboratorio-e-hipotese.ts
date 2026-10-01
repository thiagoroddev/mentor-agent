import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  abrirCenarioTemporario, apagar, confere, dizQue, escrever, fecharTemporario, ler, lerJson, mentor,
} from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/**
 * As regras da 0.10.0, uma por incidente medido no piloto:
 * H1. `iniciar` escreve pedido_original, solucao_sugerida e alternativas_profissionais com marcador;
 * H2. sugestao do humano exige duas alternativas profissionais; sem sugestao, basta o pedido;
 * L1. SPIKE com laboratorio declarado recusa codigo fora dele, e `--produto-tocado` exige motivo e grava;
 * L2. SPIKE sem laboratorio declarado fecha, com aviso, e o doctor cobra a declaracao;
 * L3. saida importavel exige teste de contrato que resolve e registrado no contexto;
 * L4. `verificar` reprova chave ligada por padrao e referencias de teste que nao resolvem;
 * L5. `doctor` avisa chave vencida e saida do laboratorio exposta ao git;
 * L6. o dossie mostra pedido, alternativas, saida do laboratorio e o produto tocado.
 */
export function rodar(): Cenario {
  const c = abrirCenarioTemporario('29-laboratorio-e-hipotese')
  const sh = (...args: string[]) => spawnSync(args[0]!, args.slice(1), { cwd: c.pasta, encoding: 'utf8' })
  const commit = (msg: string) => {
    sh('git', 'add', '-A')
    sh('git', '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', msg)
  }

  sh('git', 'init', '-q')
  sh('git', 'branch', '-M', 'main')
  escrever(c, 'README.md', '# Projeto laboratorio\n')
  commit('inicio')
  mentor(c, 'instalar', '--destino', c.pasta)
  mentor(c, 'init')
  const contexto = () => lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
  const gravarContexto = (ctx: Record<string, any>) => escrever(c, 'docs-mentor/contexto.json', JSON.stringify(ctx, null, 2))
  const ctx0 = contexto()
  ctx0.gates.testes = { comando: 'node -e "console.log(\'1 passed\')"' }
  ctx0.qualidade.metodo_de_teste = 'teste-depois'
  ctx0.qualidade.metodo_motivo = 'cenario do proprio pacote'
  gravarContexto(ctx0)
  commit('instala o mentor')

  const merito = {
    problema_canonico: 'sem nome canonico',
    discordancia: { o_que_faria_diferente: 'Nada a objetar', o_que_preocupa: 'Nada a objetar', o_que_existe_pronto_80_porcento: 'Nenhuma conhecida' },
    impacto: 'modulo do cenario', riscos: ['nenhum identificado'], dependencias_novas: [], proporcionalidade: 'do tamanho do pedido',
  }
  const alternativa = (n: number) => ({ pratica: `pratica consolidada ${n}`, pegaria_o_caso: 'sim, porque prende o padrao', custo: 'P' })
  const registro = (id: string) => `docs-mentor/tarefas/abertas/${id}.json`
  const planejar = (id: string, plano: Record<string, unknown>) => {
    const t = lerJson<Record<string, any>>(c, registro(id))
    t.plano = { ...t.plano, ...merito, ...plano }
    escrever(c, registro(id), JSON.stringify(t, null, 2))
  }
  const narrar = (id: string, spike: boolean) => escrever(c, `docs-mentor/tarefas/abertas/${id}.md`, spike
    ? '# s\n\n## A resposta\nAgrupar pela rua basta.\n\n## O que foi descartado\nO motor antigo.\n\n## A tarefa que isto destrava\nnenhuma: resposta registrada\n\n## Desfecho\nGates verdes; nada fora do previsto.\n'
    : '# t\n\n## Decisoes tomadas\na\n\n## O que nao foi feito, e por que\nb\n\n## Testes de descoberta\nNenhuma.\n\n## Aprendizados\nNada.\n\n## Desfecho\nGates verdes; nada fora do previsto.\n')
  const abrir = (tipo: string, id: string, titulo: string) => {
    const extra = tipo === 'SPIKE' ? [] : ['--sem-requisito', '--motivo', 'cenario']
    mentor(c, 'task', 'nova', '--tipo', tipo, '--titulo', titulo, '--esforco', 'P/P', '--origem', 'titulo-autossuficiente', ...extra)
    mentor(c, 'task', 'puxar', id)
    return mentor(c, 'task', 'iniciar', id)
  }
  const concluida = (id: string) => {
    const nome = readdirSync(join(c.pasta, 'docs-mentor/tarefas/concluidas')).find((a) => a.endsWith(`--${id}.json`))
    return lerJson<Record<string, any>>(c, `docs-mentor/tarefas/concluidas/${nome}`)
  }

  // --- H1. o esqueleto pergunta pelo pedido, pela sugestao e pelas alternativas
  abrir('RF', 'TASK-RF-001', 'Impedir que experimento altere o padrao')
  const esqueleto = lerJson<Record<string, any>>(c, registro('TASK-RF-001'))
  confere(c, String(esqueleto.plano.pedido_original).includes('PREENCHER:'), 'H1: iniciar escreve pedido_original com marcador')
  confere(c, String(esqueleto.plano.solucao_sugerida).includes('PREENCHER:'), 'H1: iniciar escreve solucao_sugerida com marcador')
  confere(c, esqueleto.plano.alternativas_profissionais?.length === 2 &&
    String(esqueleto.plano.alternativas_profissionais[0].pegaria_o_caso).includes('PREENCHER:'),
  'H1: iniciar escreve duas alternativas_profissionais com marcador')
  confere(c, esqueleto.plano.saida_do_laboratorio === undefined, 'H1: tarefa que nao e spike nao pergunta pela saida do laboratorio')

  // --- H2. sugestao com uma alternativa so' e' recusada; com duas, fecha
  planejar('TASK-RF-001', {
    muda: ['src/padrao.ts - prende o padrao'], criterios_aceite: [{ texto: 'padrao preso', teste: 'nao se aplica: cenario' }],
    pedido_original: 'deixa a chave do algoritmo de teste desligada',
    solucao_sugerida: 'campo isolamento no plano do spike',
    alternativas_profissionais: [alternativa(1)],
  })
  narrar('TASK-RF-001', false)
  escrever(c, 'src/padrao.ts', 'export const padrao = true\n')
  mentor(c, 'task', 'gate', 'TASK-RF-001', 'testes')
  dizQue(c, mentor(c, 'task', 'finalizar', 'TASK-RF-001'), 'compara 1 alternativa(s) profissional(is)',
    'H2: sugestao do humano com uma alternativa so e recusada')
  planejar('TASK-RF-001', { alternativas_profissionais: [alternativa(1), alternativa(2)] })
  dizQue(c, mentor(c, 'task', 'finalizar', 'TASK-RF-001'), 'TASK-RF-001 concluida', 'H2: com duas alternativas completas, fecha')
  commit('feat(TASK-RF-001): prende o padrao')

  abrir('RF', 'TASK-RF-002', 'Somar paradas')
  planejar('TASK-RF-002', {
    muda: ['src/soma.ts - soma'], criterios_aceite: [{ texto: 'soma', teste: 'nao se aplica: cenario' }],
    pedido_original: '   ', solucao_sugerida: null, alternativas_profissionais: [],
  })
  narrar('TASK-RF-002', false)
  escrever(c, 'src/soma.ts', 'export const soma = 1\n')
  mentor(c, 'task', 'gate', 'TASK-RF-002', 'testes')
  dizQue(c, mentor(c, 'task', 'finalizar', 'TASK-RF-002'), 'plano sem "pedido_original"', 'H2: pedido original vazio e recusado')
  planejar('TASK-RF-002', { pedido_original: 'quero o total de paradas' })
  dizQue(c, mentor(c, 'task', 'finalizar', 'TASK-RF-002'), 'TASK-RF-002 concluida', 'H2: sem sugestao, o pedido basta e nenhuma alternativa e exigida')
  commit('feat(TASK-RF-002): soma')

  // --- L2. spike sem laboratorio declarado: aviso no iniciar e no finalizar, cobranca no doctor
  const avisoIniciar = abrir('SPIKE', 'TASK-SPIKE-001', 'Explorar agrupamento de paradas')
  dizQue(c, avisoIniciar, 'contexto.laboratorio.caminhos nao declarado', 'L2: iniciar de spike avisa sem laboratorio declarado')
  const spikeEsqueleto = lerJson<Record<string, any>>(c, registro('TASK-SPIKE-001'))
  confere(c, String(spikeEsqueleto.plano.saida_do_laboratorio?.tipo).includes('PREENCHER:'), 'L3: iniciar de spike pergunta o tipo da saida do laboratorio')
  dizQue(c, mentor(c, 'doctor'), 'TASK-SPIKE-001 viva(s) e contexto.laboratorio.caminhos nao declarado', 'L2: doctor cobra laboratorio com spike viva')
  const semLab = { tipo: 'relatorio', artefato: null, teste_de_contrato: null }
  const spikeBase = { criterios_aceite: [{ texto: 'a pergunta do spike', teste: 'nao se aplica: spike' }], pedido_original: 'explore o agrupamento', solucao_sugerida: null, alternativas_profissionais: [] }
  planejar('TASK-SPIKE-001', { ...spikeBase, muda: ['src/rascunho.ts - experimento'], saida_do_laboratorio: semLab })
  narrar('TASK-SPIKE-001', true)
  escrever(c, 'src/rascunho.ts', 'export const x = 1\n')
  mentor(c, 'task', 'gate', 'TASK-SPIKE-001', 'testes')
  const l2 = mentor(c, 'task', 'finalizar', 'TASK-SPIKE-001')
  confere(c, l2.saida.includes('Aviso: spike com 1 arquivo(s) de codigo') && l2.saida.includes('TASK-SPIKE-001 concluida'),
    'L2: spike sem laboratorio declarado fecha, com aviso')
  commit('feat(TASK-SPIKE-001): explora agrupamento')

  // Declara o laboratorio
  const ctxLab = contexto()
  ctxLab.laboratorio = { caminhos: ['lab/**'], saidas: ['saidas-lab/**'], chaves: [], artefatos_importaveis: [] }
  gravarContexto(ctxLab)
  commit('chore(light): declara o laboratorio')

  // --- L1. codigo fora do laboratorio e' recusado; motivo curto tambem; so' laboratorio fecha
  abrir('SPIKE', 'TASK-SPIKE-002', 'Explorar ancoras livres')
  planejar('TASK-SPIKE-002', { ...spikeBase, muda: ['lab/motor.ts - experimento', 'src/app.ts - gancho'], saida_do_laboratorio: semLab })
  narrar('TASK-SPIKE-002', true)
  escrever(c, 'lab/motor.ts', 'export const motor = 1\n')
  escrever(c, 'src/app.ts', 'export const gancho = 1\n')
  mentor(c, 'task', 'gate', 'TASK-SPIKE-002', 'testes')
  const fora = mentor(c, 'task', 'finalizar', 'TASK-SPIKE-002')
  dizQue(c, fora, 'spike mudou 1 arquivo(s) fora de contexto.laboratorio.caminhos: src/app.ts', 'L1: spike que muda o produto e recusado, nomeando o arquivo')
  dizQue(c, fora, '--produto-tocado', 'L1: a recusa diz a saida explicita')
  dizQue(c, mentor(c, 'task', 'finalizar', 'TASK-SPIKE-002', '--produto-tocado', 'porque sim'), 'exige motivo com pelo menos 30',
    'L1: --produto-tocado com motivo curto e recusado')
  apagar(c, 'src/app.ts')
  mentor(c, 'task', 'gate', 'TASK-SPIKE-002', 'testes')
  dizQue(c, mentor(c, 'task', 'finalizar', 'TASK-SPIKE-002'), 'TASK-SPIKE-002 concluida', 'L1: spike so no laboratorio fecha')
  commit('feat(TASK-SPIKE-002): explora ancoras')

  abrir('SPIKE', 'TASK-SPIKE-003', 'Comparar motor lado a lado')
  planejar('TASK-SPIKE-003', { ...spikeBase, muda: ['lab/lado.ts - experimento', 'src/gancho.ts - leitura'], saida_do_laboratorio: semLab })
  narrar('TASK-SPIKE-003', true)
  escrever(c, 'lab/lado.ts', 'export const lado = 1\n')
  escrever(c, 'src/gancho.ts', 'export const leitura = 1\n')
  mentor(c, 'task', 'gate', 'TASK-SPIKE-003', 'testes')
  const tocado = mentor(c, 'task', 'finalizar', 'TASK-SPIKE-003', '--produto-tocado', 'o gancho de leitura precisa existir no app para comparar lado a lado')
  dizQue(c, tocado, 'TASK-SPIKE-003 concluida', 'L1: --produto-tocado com motivo substantivo fecha')
  confere(c, String(concluida('TASK-SPIKE-003').produto_tocado_motivo).includes('src/gancho.ts'), 'L1: o motivo fica gravado com os arquivos')
  commit('feat(TASK-SPIKE-003): compara lado a lado')

  // --- L3. saida importavel: teste que resolve e registrado no contexto
  abrir('SPIKE', 'TASK-SPIKE-004', 'Exportar roteiro do experimento')
  const contrato = 'lab/export.test.ts > exporta com o padrao do app'
  planejar('TASK-SPIKE-004', { ...spikeBase, muda: ['lab/** - exportacao'], saida_do_laboratorio: { tipo: 'importavel', artefato: 'roteiro.json', teste_de_contrato: contrato } })
  narrar('TASK-SPIKE-004', true)
  escrever(c, 'lab/export.ts', 'export const exportar = 1\n')
  mentor(c, 'task', 'gate', 'TASK-SPIKE-004', 'testes')
  dizQue(c, mentor(c, 'task', 'finalizar', 'TASK-SPIKE-004'), 'lab/export.test.ts nao existe', 'L3: teste de contrato inexistente e recusado')
  escrever(c, 'lab/export.test.ts', "it('exporta com o padrao do app', () => {})\n")
  mentor(c, 'task', 'gate', 'TASK-SPIKE-004', 'testes')
  dizQue(c, mentor(c, 'task', 'finalizar', 'TASK-SPIKE-004'), 'nao esta em contexto.laboratorio.artefatos_importaveis',
    'L3: teste que resolve e nao esta registrado e recusado')
  const ctxArt = contexto()
  ctxArt.laboratorio.artefatos_importaveis = [{ artefato: 'roteiro.json', teste_de_contrato: contrato }]
  gravarContexto(ctxArt)
  // O contexto e' insumo do gate (hash semantico): registrar o artefato pede o gate de novo.
  mentor(c, 'task', 'gate', 'TASK-SPIKE-004', 'testes')
  dizQue(c, mentor(c, 'task', 'finalizar', 'TASK-SPIKE-004'), 'TASK-SPIKE-004 concluida', 'L3: registrado e resolvido, fecha')
  commit('feat(TASK-SPIKE-004): exporta roteiro')

  // --- L4. verificar confere o inventario
  const ctxChaves = contexto()
  ctxChaves.laboratorio.chaves = [
    { nome: 'EXP_LIGADA', onde: 'env', padrao: 'ligada', dono: 'humano', remover_em: null, teste: contrato },
    { nome: 'EXP_SEM_TESTE', onde: 'env', padrao: 'desligada', dono: 'humano', remover_em: null, teste: 'lab/nao.test.ts > nada' },
  ]
  ctxChaves.laboratorio.artefatos_importaveis = [{ artefato: 'outro.json', teste_de_contrato: 'lab/export.test.ts > teste que nao existe' }]
  gravarContexto(ctxChaves)
  const v = mentor(c, 'verificar')
  dizQue(c, v, "so' pode nascer desligada", 'L4: verificar reprova chave ligada por padrao')
  dizQue(c, v, 'lab/nao.test.ts nao existe', 'L4: verificar reprova chave com teste inexistente')
  dizQue(c, v, 'nao contem o teste "teste que nao existe"', 'L4: verificar reprova artefato com teste que nao resolve')

  // --- L5. doctor: chave vencida e saida exposta ao git
  const ctxDoctor = contexto()
  ctxDoctor.laboratorio.chaves = [{ nome: 'EXP_VELHA', onde: 'env', padrao: 'desligada', dono: 'humano', remover_em: '01/08/26', teste: contrato }]
  ctxDoctor.laboratorio.artefatos_importaveis = [{ artefato: 'roteiro.json', teste_de_contrato: contrato }]
  gravarContexto(ctxDoctor)
  const d1 = mentor(c, 'doctor')
  dizQue(c, d1, 'chave(s) de experimento vencida(s): EXP_VELHA', 'L5: doctor avisa chave vencida')
  dizQue(c, d1, 'saidas-lab/** nao esta no .gitignore', 'L5: doctor avisa saida do laboratorio sem .gitignore')
  escrever(c, '.gitignore', 'saidas-lab/\n')
  confere(c, !mentor(c, 'doctor').saida.includes('exposta ao git'), 'L5: com .gitignore, o aviso some')
  confere(c, !mentor(c, 'verificar').saida.includes('laboratorio'), 'L4: inventario certo nao gera achado')

  // --- L6. o dossie mostra o que o auditor precisa conferir
  commit('chore(light): chave e gitignore')
  mentor(c, 'auditar', 'preparar', '--lote-legado')
  const dossie = ler(c, 'docs-mentor/auditorias/AUD-001-dossie.md')
  confere(c, dossie.includes('pedido original: deixa a chave do algoritmo de teste desligada'), 'L6: dossie mostra o pedido original')
  confere(c, dossie.includes('alternativa: pratica consolidada 2'), 'L6: dossie mostra as alternativas')
  confere(c, dossie.includes('o humano sugeriu a solucao ("campo isolamento no plano do spike")'), 'L6: o ja medido aponta a sugestao ao auditor')
  confere(c, dossie.includes('**Spike que mudou o produto:**'), 'L6: dossie mostra o produto tocado')
  confere(c, dossie.includes('**Saida do laboratorio:** importavel · roteiro.json'), 'L6: dossie mostra a saida importavel')

  fecharTemporario(c)
  return c
}
