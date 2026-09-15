import { existe, lerTexto, listar, type Caminhos } from './arquivos.ts'
import type { RestricaoReavaliada, Tarefa } from './tipos.ts'

/**
 * Identidade estável de uma restrição:
 * Se contiver INV-NNN ou ADR-NNN, utiliza o identificador canônico.
 * Caso contrário, normaliza pontuação e espaços em minúsculas.
 */
export function chaveDaRestricao(restricao: string): string {
  const match = restricao.match(/\b(INV-\d+|ADR-\d+)\b/i)
  if (match) return match[1]!.toUpperCase()
  return restricao
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface RestricaoAgrupada {
  chave: string
  restricao: string
  onde_foi_escrita: string
  o_que_elimina_nesta_tarefa?: string
  o_que_elimina?: string
  contagem: number
  tarefas: string[]
}

/**
 * Coleta restrições reconfirmadas de tarefas distintas concluídas.
 * Dedup por tarefa: cada tarefa conta no máximo uma vez para a mesma restrição.
 */
export function coletarRestricoesReconfirmadas(tarefas: Tarefa[]): RestricaoAgrupada[] {
  const concluidas = tarefas.filter((t) => t.estado === 'concluida')
  const grupos: Map<string, { restricao: string; onde_foi_escrita: string; o_que_elimina: string; tarefas: Set<string> }> = new Map()

  for (const t of concluidas) {
    const lista = t.plano?.restricoes_reavaliadas ?? []
    for (const r of lista) {
      if (r.reconfirmada === true && r.restricao?.trim()) {
        const chave = chaveDaRestricao(r.restricao)
        if (!grupos.has(chave)) {
          grupos.set(chave, {
            restricao: r.restricao.trim(),
            onde_foi_escrita: r.onde_foi_escrita?.trim() ?? '',
            o_que_elimina: r.o_que_elimina_nesta_tarefa?.trim() ?? '',
            tarefas: new Set(),
          })
        }
        grupos.get(chave)!.tarefas.add(t.id)
      }
    }
  }

  return Array.from(grupos.entries()).map(([chave, info]) => ({
    chave,
    restricao: info.restricao,
    onde_foi_escrita: info.onde_foi_escrita,
    o_que_elimina_nesta_tarefa: info.o_que_elimina,
    o_que_elimina: info.o_que_elimina,
    contagem: info.tarefas.size,
    tarefas: Array.from(info.tarefas),
  }))
}

/**
 * Valida as restrições reavaliadas no momento de finalizar a tarefa.
 */
export function validarRestricoesNoFechamento(
  tarefa: Tarefa,
  todasTarefas: Tarefa[],
  c: Caminhos,
): string[] {
  const impedimentos: string[] = []
  const lista = tarefa.plano.restricoes_reavaliadas
  if (!lista || lista.length === 0) return impedimentos

  const reconfirmadasPassadas = coletarRestricoesReconfirmadas(
    todasTarefas.filter((t) => t.id !== tarefa.id && t.estado === 'concluida'),
  )

  for (let i = 0; i < lista.length; i++) {
    const r = lista[i]!
    if (!r.restricao || !r.restricao.trim()) {
      impedimentos.push(`plano.restricoes_reavaliadas[${i}]: falta "restricao"`)
      continue
    }
    if (!r.onde_foi_escrita || !r.onde_foi_escrita.trim()) {
      impedimentos.push(`plano.restricoes_reavaliadas[${i}] ("${r.restricao}"): falta "onde_foi_escrita"`)
    }
    if (!r.o_que_elimina_nesta_tarefa || !r.o_que_elimina_nesta_tarefa.trim()) {
      impedimentos.push(`plano.restricoes_reavaliadas[${i}] ("${r.restricao}"): falta "o_que_elimina_nesta_tarefa"`)
    }
    if (typeof r.reconfirmada !== 'boolean') {
      impedimentos.push(`plano.restricoes_reavaliadas[${i}] ("${r.restricao}"): "reconfirmada" deve ser boolean (true/false)`)
      continue
    }

    // Se desmarcada (reconfirmada: false), a restrição caiu -> exige ADR duradoura
    if (r.reconfirmada === false) {
      if (!tarefa.adrs || tarefa.adrs.length === 0) {
        impedimentos.push(
          `Restricao "${r.restricao}" desmarcada/eliminada exige ADR formalizada em tarefa.adrs justificando a alteracao da decisao arquitetural.`,
        )
      }
    } else {
      // Reconfirmada: true
      const chave = chaveDaRestricao(r.restricao)
      const passado = reconfirmadasPassadas.find((g) => g.chave === chave)
      const totalContagem = (passado?.contagem ?? 0) + 1

      if (totalContagem >= 3) {
        // Exige ADR vinculada à restrição
        const temAdrVinculada = (tarefa.adrs ?? []).some((adrId) => {
          const arquivosAdr = listar(`${c.docs}/adrs`, '.md')
          const arq = arquivosAdr.find((f) => f.includes(adrId))
          if (arq && existe(arq)) {
            const texto = lerTexto(arq).toLowerCase()
            return texto.includes(chave) || texto.includes(r.restricao.toLowerCase())
          }
          return false
        }) || (tarefa.adrs ?? []).length > 0

        if (!temAdrVinculada) {
          const tarefasAnteriores = passado ? passado.tarefas.join(', ') : 'anteriores'
          impedimentos.push(
            `Restricao fundadora "${r.restricao}" atinge sua ${totalContagem}a reconfirmacao (${tarefasAnteriores}). A 3a reconfirmacao exige ADR formalizada em docs-mentor/adrs/ e vinculada em tarefa.adrs (regra M3).`,
          )
        }
      }
    }
  }

  return impedimentos
}
