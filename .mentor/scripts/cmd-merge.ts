import { spawnSync } from 'node:child_process'
import { caminhos } from './arquivos.ts'
import { carregarTarefas } from './vistas.ts'
import { ID_DE_TAREFA_NO_TITULO, MARCA_LIGHT_NO_TITULO, MARCA_PLANO_NO_TITULO } from './tipos.ts'

/**
 * A pergunta da esteira no PR: **o que este PR entrega ja' esta' concluido no ramo?**
 *
 * WIP pode subir para o remoto (0.9.0); o que nao pode e' entrar no ramo principal. O pre-push nao
 * alcanca o merge, que acontece no servidor, entao a checagem mora aqui e a esteira a chama com o
 * titulo do PR. "Deixar de ser WIP" e' a tarefa concluida, nao o nome do ramo.
 *
 * ⚠️ Sem protecao de ramo no GitHub (plano gratuito com repositorio privado), a esteira vermelha avisa
 * e nao impede o merge. O que segura e' so' mergear com a esteira verde.
 */
export function prontoParaMerge(titulo: string | undefined, flags: Record<string, string | undefined> = {}): number {
  if (!titulo?.trim()) {
    console.error('Falta --titulo "<titulo do PR>". Na esteira, passe o titulo por variavel de ambiente, nunca interpolado no comando.')
    return 1
  }
  const ids = [...new Set(titulo.match(new RegExp(ID_DE_TAREFA_NO_TITULO.source, 'g')) ?? [])]
  const ehLight = MARCA_LIGHT_NO_TITULO.test(titulo)
  const ehPlano = MARCA_PLANO_NO_TITULO.test(titulo)

  const c = caminhos()
  const baseSolicitada = flags.base || 'origin/main'
  const headSolicitada = flags.head || 'HEAD'

  let baseRef = baseSolicitada
  const rBase = spawnSync('git', ['rev-parse', '--verify', baseRef], { cwd: c.raiz, encoding: 'utf8' })
  if (rBase.status !== 0 && !baseRef.startsWith('origin/')) {
    const rOrigin = spawnSync('git', ['rev-parse', '--verify', `origin/${baseRef}`], { cwd: c.raiz, encoding: 'utf8' })
    if (rOrigin.status === 0) baseRef = `origin/${baseRef}`
  } else if (rBase.status !== 0 && baseRef === 'origin/main') {
    const rMain = spawnSync('git', ['rev-parse', '--verify', 'main'], { cwd: c.raiz, encoding: 'utf8' })
    if (rMain.status === 0) baseRef = 'main'
  }

  const rChecaBase = spawnSync('git', ['rev-parse', '--verify', baseRef], { cwd: c.raiz, encoding: 'utf8' })
  if (rChecaBase.status !== 0) {
    console.error(`Falha ao resolver ref base "${baseSolicitada}": ref inexistente ou nao obtida por fetch.`)
    return 1
  }

  const rChecaHead = spawnSync('git', ['rev-parse', '--verify', headSolicitada], { cwd: c.raiz, encoding: 'utf8' })
  if (rChecaHead.status !== 0) {
    console.error(`Falha ao resolver ref head "${headSolicitada}": ref inexistente.`)
    return 1
  }

  const rDiff = spawnSync('git', ['diff', '--name-only', `${baseRef}...${headSolicitada}`], { cwd: c.raiz, encoding: 'utf8' })
  if (rDiff.status !== 0) {
    console.error(`Erro ao executar git diff entre "${baseRef}" e "${headSolicitada}":\n${rDiff.stderr ?? ''}`)
    return 1
  }

  const arquivos = (rDiff.stdout ?? '')
    .split('\n')
    .map((l) => l.trim().replace(/\\/g, '/'))
    .filter(Boolean)

  if (ehLight) {
    // Matriz restrita de (light): não permite bypass de código arbitrário, regras, workflows ou tarefas históricas
    const proibidosParaLight = arquivos.filter((arq) => {
      if (arq.startsWith('.github/') || arq.startsWith('.githooks/') || arq.startsWith('.mentor/')) return true
      if (arq.startsWith('docs-mentor/tarefas/concluidas/')) return true
      if (arq === 'docs-mentor/contexto.json') return true
      if (arq.endsWith('.test.ts') || arq.endsWith('.test.js') || arq.endsWith('.spec.ts')) return true
      return false
    })

    if (proibidosParaLight.length > 0) {
      console.error('Nao esta pronto para merge: PR marcado como (light) contem alteracoes em arquivos protegidos ou de configuracao/esteira:')
      for (const f of proibidosParaLight) console.error(`  - ${f}`)
      return 1
    }

    console.log('Pronto para merge: PR Light, sem tarefa. A auditoria lista os commits Light para conferir se cabiam na lista.')
    return 0
  }

  if (ehPlano) {
    const padroesPermitidos = [
      /^docs-mentor\/planos\.json$/,
      /^docs\/planos\.json$/,
      /^docs-mentor\/requisitos\//,
      /^docs\/requisitos\//,
      /^docs-mentor\/rascunhos\//,
      /^docs\/rascunhos\//,
      /^docs-mentor\/auditorias\//,
      /^docs\/auditorias\//,
      /^docs-mentor\/dividas\//,
      /^docs\/dividas\//,
      /^docs-mentor\/tarefas\/abertas\//,
      /^docs\/tarefas\/abertas\//,
      /^docs-mentor\/tarefas\/reserva\.md$/,
      /^docs\/tarefas\/reserva\.md$/,
      /^docs-mentor\/tarefas\/backlog\.md$/,
      /^docs\/tarefas\/backlog\.md$/,
      /^docs-mentor\/melhorias-do-pacote\.md$/,
      /^docs-mentor\/referencias\./,
      /^docs-mentor\/invariantes\./,
      /^docs-mentor\/contexto\./,
      /^docs\/contexto\./,
      /^docs-mentor\/LEIA\.md$/,
    ]

    const arquivosProibidos: string[] = []
    for (const arq of arquivos) {
      const permitido = padroesPermitidos.some((re) => re.test(arq))
      if (!permitido) {
        arquivosProibidos.push(arq)
      }
    }

    if (arquivosProibidos.length > 0) {
      console.error('Nao esta pronto para merge: PR de planejamento (plano) contem arquivos fora do escopo de planejamento:')
      for (const f of arquivosProibidos) console.error(`  - ${f}`)
      return 1
    }

    // Não permite testes ou executáveis sob docs-mentor no PR de plano
    const testesSobDoc = arquivos.filter((a) => a.endsWith('.test.ts') || a.endsWith('.test.js') || a.endsWith('.spec.ts'))
    if (testesSobDoc.length > 0) {
      console.error('Nao esta pronto para merge: PR de planejamento (plano) contem testes ou codigo executavel:')
      for (const f of testesSobDoc) console.error(`  - ${f}`)
      return 1
    }

    // Validação semântica de tarefas abertas: nenhuma pode ter gates aprovados/executados nem conclusão
    const tarefasAbertas = carregarTarefas()
    for (const arq of arquivos) {
      if (arq.includes('/tarefas/abertas/') && arq.endsWith('.json')) {
        const id = arq.replace(/^.*[\\/]/, '').replace(/\.json$/, '')
        const t = tarefasAbertas.find((x) => x.id === id)
        if (t) {
          if (t.estado !== 'aberta') {
            console.error(`Nao esta pronto para merge: PR de planejamento (plano) nao pode alterar estado de tarefa (${t.id} esta em "${t.estado}").`)
            return 1
          }
          if (t.concluida_em) {
            console.error(`Nao esta pronto para merge: PR de planejamento (plano) nao pode concluir tarefa (${t.id} tem concluida_em preenchido).`)
            return 1
          }
          for (const [nomeG, g] of Object.entries(t.gates ?? {})) {
            if (g && (g.rotulo === 'APROVADO' || g.executado_em !== null)) {
              console.error(`Nao esta pronto para merge: PR de planejamento (plano) nao pode registrar execucao ou aprovacao de gate (${t.id} · gate ${nomeG}).`)
              return 1
            }
          }
        }
      }
    }

    console.log('Pronto para merge: PR de planejamento (plano) validado.')
    return 0
  }

  // PR de implementação: exige tarefa concluída
  if (ids.length === 0) {
    console.error(`Nao esta pronto para merge: o titulo nao cita tarefa (TASK-X-NNN), nem a marca (light), nem (plano): "${titulo}"`)
    return 1
  }

  const tarefas = carregarTarefas()
  const faltam: string[] = []
  for (const id of ids) {
    const registros = tarefas.filter((t) => t.id === id)
    if (registros.length === 0) {
      faltam.push(`${id} nao existe neste ramo`)
    } else if (!registros.some((t) => t.estado === 'concluida')) {
      const estado = registros[0]!.estado
      faltam.push(`${id} esta "${estado}"${estado === 'pausada' ? ' (WIP)' : ''}: feche com "task finalizar" antes do merge`)
    }
  }
  if (faltam.length) {
    console.error('Nao esta pronto para merge:')
    for (const f of faltam) console.error(`  - ${f}`)
    return 1
  }
  console.log(`Pronto para merge: ${ids.join(', ')} concluida(s) no ramo.`)
  return 0
}
