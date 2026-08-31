#!/usr/bin/env node
import { inicializar } from './cmd-init.ts'
import { fila, finalizar, iniciar, nova, registrarGate, validar } from './cmd-tarefa.ts'
import { absorver, cancelar, fatiar, guardar, listarReserva, puxar } from './cmd-fila.ts'
import { adicionarFerramenta } from './cmd-stack.ts'
import { verificar } from './cmd-verificar.ts'
import { relatar as relatarRegras, sincronizar as sincronizarRegras } from './cmd-regras.ts'
import { doctor } from './cmd-doctor.ts'
import { gates } from './cmd-gates.ts'
import { instalarHooks } from './cmd-hooks.ts'
import { encerrar as encerrarRisco, nova as novoRisco, relatar as relatarRiscos } from './cmd-riscos.ts'
import { lancamento } from './cmd-lancamento.ts'
import { relatorioDeCampo } from './cmd-campo.ts'
import { gerarManifesto, instalar } from './cmd-pacote.ts'
import { anotar } from './cmd-anotar.ts'
import { preparar as prepararAuditoria, registrar as registrarAuditoria, relatar as relatarAuditorias, resolver as resolverPendencia } from './cmd-auditar.ts'
import { novaReferencia, relatarReferencias } from './cmd-referencia.ts'
import { regenerarTudo } from './vistas.ts'

const AJUDA = `
mentor <comando>

  instalar [--destino <pasta>]         copia o pacote para dentro de um projeto
  manifesto                            grava o hash de cada arquivo do pacote (antes de empacotar)
  init                                 cria docs-mentor/ a partir dos esquemas
  ref [nova|listar]                    referencia a requisito/ADR externo ou historico
       nova --id <ID> --onde <caminho> [--sistema <nome> --titulo <titulo>]
  task nova --tipo T --titulo "..."    cria tarefa (gera ID e data)
       --esforco H/IA --origem "..."
       [--valor --urgencia --depende --requisitos --cerimonia --fatia-de]
  task puxar <ID>                      reserva -> ciclo, conferindo a regra de passagem
  task guardar <ID>                    ciclo -> reserva
  task fatiar <ID> --titulos "a|b|c"   divide em fatias encadeadas
  task cancelar <ID> --motivo "..."    encerra sem fazer; o numero nao volta
  task absorver <ID> --por <ID>        escopo absorvido por outra tarefa
  task validar <ID> --aprovado         registra a validacao manual
       | --dispensado --motivo "..."
  task iniciar <ID>                    escreve o esqueleto do plano e da narrativa
  task gate <ID> <gate>                executa o comando declarado e grava a evidencia
       [--esperando-vermelho]          registra o gate falhando ANTES de implementar (tdd/bdd)
       [--rotulo "..." --motivo "..."] so para os rotulos que nao nascem de execucao
       [--ressalva "..." --url "..."]
  task fila <ID> <n> | --soltar         fixa no topo da fila, ou devolve a ordem calculada
  task finalizar <ID>                  fecha, vincula requisito, regenera as vistas
  stack <ferramenta> [--versao --papel] cria a convencao e registra no contexto
  regras [--sincronizar]               inventario das regras do pacote: quais viraram comando
  verificar                            marcadores, tetos de texto, integridade referencial
  anotar --sobre pacote|projeto "..."  onde a melhoria vai nao e decisao de memoria
  reserva                              lista a reserva (nao entra no contexto)
  gates                                roda todos os gates declarados pelo projeto
  hooks --instalar                     barreira de pre-push, sem dependencia (core.hooksPath)
  ra [nova|encerrar <ID>]              registro de riscos aceitos
       nova --titulo --justificativa --evidencia --aceito-por
            --revisar-em --tarefa-de-saida [--severidade --pacote --advisory]
  lancamento                           pode ir a publico? Roda os gates agora
  relatorio-de-campo [--detalhado]     medicao do uso real, para levar ao repositorio do pacote
  doctor                               folha de saude com veredito binario. Nunca cria tarefa
  auditar [preparar]                   monta o dossie do lote para uma sessao NOVA de IA auditar
       registrar <AUD-ID>              valida e grava o veredito. Recusa aprovar com bloqueio
       resolver <AUD-ID-Bxx>           voce decide o destino do achado; a auditoria nunca decide
            --destino tarefa|divida_tecnica|risco_aceito|descartado --ref "..."
  gerar                                regenera as vistas em Markdown
`

/**
 * Uma passada so'. Separado em duas, o **valor de uma flag entra tambem como posicional** — e ai'
 * `mentor anotar --sobre projeto "texto"` le' `projeto` como se fosse o texto. Aconteceu.
 */
function lerArgumentos(args: string[]): {
  flags: Record<string, string | undefined>
  posicionais: string[]
} {
  const flags: Record<string, string | undefined> = {}
  const posicionais: string[] = []
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (!a) continue
    if (!a.startsWith('--')) { posicionais.push(a); continue }
    const proximo = args[i + 1]
    if (proximo && !proximo.startsWith('--')) { flags[a.slice(2)] = proximo; i++ }
    else flags[a.slice(2)] = 'true'
  }
  return { flags, posicionais }
}

function principal(argv: string[]): number {
  const [comando, ...resto] = argv
  const { flags, posicionais } = lerArgumentos(resto)

  switch (comando) {
    case 'instalar': instalar(flags); return process.exitCode === 1 ? 1 : 0
    case 'manifesto': gerarManifesto(); return 0
    case 'init': inicializar(); return 0
    case 'ref':
    case 'referencia': {
      const sub = posicionais[0]
      if (!sub || sub === 'listar') { relatarReferencias(); return 0 }
      if (sub === 'nova') { novaReferencia(flags); return 0 }
      throw new Error(`Subcomando de ref desconhecido: "${sub}". Use: mentor ref [listar|nova]`)
    }
    case 'gerar': regenerarTudo(); console.log('Vistas regeneradas.'); return 0
    case 'anotar': anotar(posicionais[0], flags.sobre); return 0
    case 'reserva': listarReserva(); return 0
    case 'regras':
      if (flags.sincronizar) sincronizarRegras()
      else relatarRegras()
      return 0
    case 'verificar': return verificar()
    case 'gates': return gates()
    case 'hooks':
      if (!flags.instalar) throw new Error('Use: mentor hooks --instalar')
      instalarHooks(); return 0
    case 'lancamento': return lancamento()
    case 'relatorio-de-campo': return relatorioDeCampo(flags)
    case 'ra': {
      const sub = posicionais[0]
      if (!sub) { relatarRiscos(); return 0 }
      if (sub === 'nova') { novoRisco(flags); return process.exitCode === 1 ? 1 : 0 }
      if (sub === 'encerrar') {
        const id = posicionais[1]
        if (!id) throw new Error('Falta o ID. Use: mentor ra encerrar RA-001 --motivo "..."')
        encerrarRisco(id, flags.motivo); return 0
      }
      throw new Error(`Subcomando de ra desconhecido: "${sub}".`)
    }
    case 'doctor': return doctor()
    case 'auditar': {
      const sub = posicionais[0]
      if (!sub) return relatarAuditorias()
      if (sub === 'preparar') return prepararAuditoria()
      if (sub === 'registrar') {
        const alvo = posicionais[1]
        if (!alvo) throw new Error('Falta o ID. Use: mentor auditar registrar AUD-001')
        return registrarAuditoria(alvo)
      }
      if (sub === 'resolver') {
        const alvo = posicionais[1]
        if (!alvo) throw new Error('Falta o ID da pendencia. Use: mentor auditar resolver AUD-001-B01 --destino ... --ref "..."')
        return resolverPendencia(alvo, flags)
      }
      throw new Error(`Subcomando de auditar desconhecido: "${sub}".`)
    }
    case 'stack': {
      const nome = posicionais[0]
      if (!nome) throw new Error('Falta o nome da ferramenta.')
      adicionarFerramenta(nome, flags); return 0
    }
    case 'task': {
      const sub = posicionais[0]
      const id = posicionais[1]
      if (sub === 'nova') { nova(flags); return 0 }
      if (!id) throw new Error(`Falta o ID da tarefa. Use: mentor task ${sub ?? '<sub>'} <ID>`)
      if (sub === 'iniciar') { iniciar(id); return 0 }
      if (sub === 'puxar') { puxar(id); return process.exitCode === 1 ? 1 : 0 }
      if (sub === 'guardar') { guardar(id); return 0 }
      if (sub === 'fatiar') { fatiar(id, flags); return 0 }
      if (sub === 'cancelar') { cancelar(id, flags.motivo); return 0 }
      if (sub === 'absorver') { absorver(id, flags.por); return 0 }
      if (sub === 'validar') { validar(id, flags); return 0 }
      if (sub === 'fila') {
        const posicao = Number(posicionais[2])
        const liberar = flags.soltar === 'true'
        if (!liberar && (!Number.isInteger(posicao) || posicao < 1)) throw new Error('Use: mentor task fila <ID> <posicao> | mentor task fila <ID> --soltar')
        fila(id, posicao, liberar); return 0
      }
      if (sub === 'finalizar') { finalizar(id); return process.exitCode === 1 ? 1 : 0 }
      if (sub === 'gate') {
        const gate = posicionais[2]
        if (!gate) throw new Error('Falta o nome do gate.')
        registrarGate(id, gate, flags); return 0
      }
      throw new Error(`Subcomando de task desconhecido: "${sub}".`)
    }
    default:
      console.log(AJUDA)
      return comando ? 1 : 0
  }
}

try {
  process.exitCode = principal(process.argv.slice(2))
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : String(erro))
  process.exitCode = 1
}
