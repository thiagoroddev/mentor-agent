import { carregarTarefas } from './vistas.ts'
import { ID_DE_TAREFA_NO_TITULO, MARCA_LIGHT_NO_TITULO } from './tipos.ts'

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
export function prontoParaMerge(titulo: string | undefined): number {
  if (!titulo?.trim()) {
    console.error('Falta --titulo "<titulo do PR>". Na esteira, passe o titulo por variavel de ambiente, nunca interpolado no comando.')
    return 1
  }
  const ids = [...new Set(titulo.match(new RegExp(ID_DE_TAREFA_NO_TITULO.source, 'g')) ?? [])]
  if (ids.length === 0) {
    if (MARCA_LIGHT_NO_TITULO.test(titulo)) {
      console.log('Pronto para merge: PR Light, sem tarefa. A auditoria lista os commits Light para conferir se cabiam na lista.')
      return 0
    }
    console.error(`Nao esta pronto para merge: o titulo nao cita tarefa (TASK-X-NNN) nem a marca (light): "${titulo}"`)
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
