import { spawnSync } from 'node:child_process'
import { caminhos, escreverTexto, existe, lerTexto } from './arquivos.ts'
import { atualizarContagens, regenerarTudo } from './vistas.ts'

/**
 * Mescla recursivamente valores humanos preservando preenchimentos de ambos os lados.
 * Campos como portões ("respondido" ou "dispensado" vs "aberto") priorizam a resposta.
 */
export function mesclarValores(vOurs: any, vTheirs: any): any {
  if (vOurs === undefined || vOurs === null) return vTheirs
  if (vTheirs === undefined || vTheirs === null) return vOurs

  if (Array.isArray(vOurs) && Array.isArray(vTheirs)) {
    const resultado = [...vOurs]
    for (const item of vTheirs) {
      if (typeof item === 'object' && item !== null) {
        const idOuNome = item.id ?? item.nome
        if (idOuNome) {
          const idx = resultado.findIndex((x) => (x.id ?? x.nome) === idOuNome)
          if (idx >= 0) resultado[idx] = mesclarValores(resultado[idx], item)
          else resultado.push(item)
          continue
        }
      }
      if (!resultado.some((x) => JSON.stringify(x) === JSON.stringify(item))) {
        resultado.push(item)
      }
    }
    return resultado
  }

  if (typeof vOurs === 'object' && typeof vTheirs === 'object') {
    const chaves = new Set([...Object.keys(vOurs), ...Object.keys(vTheirs)])
    const res: Record<string, any> = {}
    for (const k of chaves) {
      res[k] = mesclarValores(vOurs[k], vTheirs[k])
    }
    return res
  }

  if (vOurs === 'aberto' && (vTheirs === 'respondido' || vTheirs === 'dispensado')) {
    return vTheirs
  }

  return vOurs
}

function extrairConflitoTexto(conteudo: string): { ours: string; theirs: string } | null {
  const padrao = /<<<<<<<[^\n]*\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>>[^\n]*\r?\n?/g
  if (!padrao.test(conteudo)) return null

  let ours = ''
  let theirs = ''
  let ultimo = 0
  padrao.lastIndex = 0
  let match
  while ((match = padrao.exec(conteudo)) !== null) {
    const prefixo = conteudo.slice(ultimo, match.index)
    ours += prefixo + match[1]
    theirs += prefixo + match[2]
    ultimo = padrao.lastIndex
  }
  const sufixo = conteudo.slice(ultimo)
  ours += sufixo
  theirs += sufixo
  return { ours, theirs }
}

function carregarVersoesDeArquivo(caminhoRelativo: string): { base: string | null; ours: string | null; theirs: string | null } {
  const c = caminhos()
  const rBase = spawnSync('git', ['show', `:1:${caminhoRelativo}`], { cwd: c.raiz, encoding: 'utf8' })
  const rOurs = spawnSync('git', ['show', `:2:${caminhoRelativo}`], { cwd: c.raiz, encoding: 'utf8' })
  const rTheirs = spawnSync('git', ['show', `:3:${caminhoRelativo}`], { cwd: c.raiz, encoding: 'utf8' })
  const base = rBase.status === 0 && rBase.stdout ? rBase.stdout : null
  const ours = rOurs.status === 0 && rOurs.stdout ? rOurs.stdout : null
  const theirs = rTheirs.status === 0 && rTheirs.stdout ? rTheirs.stdout : null
  if (ours && theirs) {
    return { base, ours, theirs }
  }

  const caminhoAbs = `${c.raiz}/${caminhoRelativo}`
  if (existe(caminhoAbs)) {
    const texto = lerTexto(caminhoAbs)
    const extraido = extrairConflitoTexto(texto)
    if (extraido) return { base: null, ...extraido }
  }

  return { base: null, ours: null, theirs: null }
}

/**
 * Mesclagem semântica de 3 vias (3-way merge): base (:1:), ours (:2:) e theirs (:3:).
 * Se apenas um lado mudou em relação à base, adota a alteração.
 * Para objetos e arrays identificados por id/nome, aplica a regra campo a campo.
 */
export function mesclarValores3Way(vBase: any, vOurs: any, vTheirs: any): any {
  if (vOurs === undefined || vOurs === null) return vTheirs
  if (vTheirs === undefined || vTheirs === null) return vOurs
  if (vBase === undefined || vBase === null) return mesclarValores(vOurs, vTheirs)

  // Se theirs não mudou em relação à base, preserva ours
  if (JSON.stringify(vTheirs) === JSON.stringify(vBase)) return vOurs
  // Se ours não mudou em relação à base, adota theirs (mudança válida de branch remota!)
  if (JSON.stringify(vOurs) === JSON.stringify(vBase)) return vTheirs

  if (Array.isArray(vOurs) && Array.isArray(vTheirs)) {
    const baseArr = Array.isArray(vBase) ? vBase : []
    const resultado = [...vOurs]
    for (const item of vTheirs) {
      if (typeof item === 'object' && item !== null) {
        const idOuNome = item.id ?? item.nome
        if (idOuNome) {
          const idx = resultado.findIndex((x) => (x.id ?? x.nome) === idOuNome)
          const baseItem = baseArr.find((x) => (x.id ?? x.nome) === idOuNome)
          if (idx >= 0) {
            resultado[idx] = mesclarValores3Way(baseItem, resultado[idx], item)
          } else {
            resultado.push(item)
          }
          continue
        }
      }
      if (!resultado.some((x) => JSON.stringify(x) === JSON.stringify(item))) {
        resultado.push(item)
      }
    }
    return resultado
  }

  if (typeof vOurs === 'object' && typeof vTheirs === 'object') {
    const baseObj = (typeof vBase === 'object' && vBase !== null) ? vBase : {}
    const chaves = new Set([...Object.keys(baseObj), ...Object.keys(vOurs), ...Object.keys(vTheirs)])
    const res: Record<string, any> = {}
    for (const k of chaves) {
      res[k] = mesclarValores3Way(baseObj[k], vOurs[k], vTheirs[k])
    }
    return res
  }

  if (vOurs === 'aberto' && (vTheirs === 'respondido' || vTheirs === 'dispensado')) {
    return vTheirs
  }

  return vOurs
}

export function mesclarRequisitos3Way(
  baseInput: any,
  oursInput: any,
  theirsInput: any,
): any {
  const eWrapper = (oursInput && typeof oursInput === 'object' && !Array.isArray(oursInput) && 'requisitos' in oursInput) ||
                  (theirsInput && typeof theirsInput === 'object' && !Array.isArray(theirsInput) && 'requisitos' in theirsInput)

  const baseArr: Array<Record<string, any>> = Array.isArray(baseInput)
    ? baseInput
    : baseInput?.requisitos ?? []
  const oursArr: Array<Record<string, any>> = Array.isArray(oursInput)
    ? oursInput
    : oursInput?.requisitos ?? []
  const theirsArr: Array<Record<string, any>> = Array.isArray(theirsInput)
    ? theirsInput
    : theirsInput?.requisitos ?? []

  const baseList = Array.isArray(baseArr) ? baseArr : []
  const todosIds = new Set<string>([
    ...baseList.map((r) => r.id),
    ...oursArr.map((r) => r.id),
    ...theirsArr.map((r) => r.id),
  ].filter(Boolean))

  const resultado: Array<Record<string, any>> = []

  for (const id of todosIds) {
    const inBase = baseList.find((r) => r.id === id)
    const inOurs = oursArr.find((r) => r.id === id)
    const inTheirs = theirsArr.find((r) => r.id === id)

    // Caso 1: Não existia na base (Adição)
    if (!inBase) {
      if (inOurs && !inTheirs) {
        resultado.push(inOurs)
      } else if (!inOurs && inTheirs) {
        resultado.push(inTheirs)
      } else if (inOurs && inTheirs) {
        // Criado em ambos: colisão add/add?
        if (JSON.stringify(inOurs) === JSON.stringify(inTheirs)) {
          resultado.push(inOurs)
        } else {
          if (inOurs.enunciado !== inTheirs.enunciado || inOurs.tipo !== inTheirs.tipo) {
            throw new Error(
              `Colisao add/add no requisito "${id}": foi criado em ambos os ramos com enunciados/conteudos diferentes. Renumere um dos requisitos antes de fundir.`,
            )
          }
          resultado.push(mesclarValores3Way(null, inOurs, inTheirs))
        }
      }
      continue
    }

    // Caso 2: Existia na base
    if (!inOurs && !inTheirs) {
      continue
    }
    if (!inOurs && inTheirs) {
      if (JSON.stringify(inTheirs) === JSON.stringify(inBase)) {
        continue
      } else {
        throw new Error(
          `Conflito exclusao vs edicao no requisito "${id}": foi excluido no ramo atual e modificado no ramo recebido. Resolva manualmente.`,
        )
      }
    }
    if (inOurs && !inTheirs) {
      if (JSON.stringify(inOurs) === JSON.stringify(inBase)) {
        continue
      } else {
        throw new Error(
          `Conflito exclusao vs edicao no requisito "${id}": foi modificado no ramo atual e excluido no ramo recebido. Resolva manualmente.`,
        )
      }
    }

    // Presente em todos: fusão 3-way por campo com regras semânticas
    if (inOurs && inTheirs) {
      if (JSON.stringify(inTheirs) === JSON.stringify(inBase)) {
        resultado.push(inOurs)
      } else if (JSON.stringify(inOurs) === JSON.stringify(inBase)) {
        resultado.push(inTheirs)
      } else {
        const chaves = new Set([...Object.keys(inBase), ...Object.keys(inOurs), ...Object.keys(inTheirs)])
        const reqMesclado: Record<string, any> = {}
        for (const k of chaves) {
          const vBase = inBase[k]
          const vOurs = inOurs[k]
          const vTheirs = inTheirs[k]
          if (k === 'tarefas' && Array.isArray(vOurs) && Array.isArray(vTheirs)) {
            reqMesclado[k] = Array.from(new Set([...vOurs, ...vTheirs]))
          } else if (k === 'status') {
            if (vOurs === 'implementado' || vTheirs === 'implementado') {
              reqMesclado[k] = 'implementado'
            } else if (vOurs === 'cancelado' || vTheirs === 'cancelado') {
              reqMesclado[k] = 'cancelado'
            } else {
              reqMesclado[k] = vOurs ?? vTheirs
            }
          } else {
            reqMesclado[k] = mesclarValores3Way(vBase, vOurs, vTheirs)
          }
        }
        resultado.push(reqMesclado)
      }
    }
  }

  if (eWrapper) {
    const objBase = baseInput && typeof baseInput === 'object' && !Array.isArray(baseInput) ? baseInput : {}
    const objTheirs = theirsInput && typeof theirsInput === 'object' && !Array.isArray(theirsInput) ? theirsInput : {}
    const objOurs = oursInput && typeof oursInput === 'object' && !Array.isArray(oursInput) ? oursInput : {}
    return {
      ...objBase,
      ...objTheirs,
      ...objOurs,
      requisitos: resultado,
    }
  }

  return resultado
}

export function resolverGerados(): number {
  const c = caminhos()
  console.log('Resolvendo conflitos em arquivos gerados e modelos hibridos...\n')

  // 1. Resolver contexto.json
  const relContexto = c.contexto.replace(c.raiz + '/', '').replace(c.raiz + '\\', '').replace(/\\/g, '/')
  const { base: ctxBaseStr, ours: ctxOursStr, theirs: ctxTheirsStr } = carregarVersoesDeArquivo(relContexto)
  if (ctxOursStr && ctxTheirsStr) {
    try {
      const objBase = ctxBaseStr ? JSON.parse(ctxBaseStr) : null
      const objOurs = JSON.parse(ctxOursStr)
      const objTheirs = JSON.parse(ctxTheirsStr)
      const mesclado = mesclarValores3Way(objBase, objOurs, objTheirs)

      // Regra de avanço histórico para auditoria e revisões gerais
      if (objOurs.auditoria && objTheirs.auditoria) {
        const nOurs = objOurs.auditoria.ultima_na_tarefa ?? 0
        const nTheirs = objTheirs.auditoria.ultima_na_tarefa ?? 0
        if (nTheirs > nOurs) {
          mesclado.auditoria = { ...objTheirs.auditoria }
        } else if (nOurs > nTheirs) {
          mesclado.auditoria = { ...objOurs.auditoria }
        } else {
          const dOurs = objOurs.auditoria.ultima_em ?? ''
          const dTheirs = objTheirs.auditoria.ultima_em ?? ''
          mesclado.auditoria = dTheirs > dOurs ? { ...objTheirs.auditoria } : { ...objOurs.auditoria }
        }
      }
      if (objOurs.revisao_geral && objTheirs.revisao_geral) {
        const rOurs = objOurs.revisao_geral.ultima_na_tarefa ?? 0
        const rTheirs = objTheirs.revisao_geral.ultima_na_tarefa ?? 0
        mesclado.revisao_geral = rTheirs > rOurs ? { ...objTheirs.revisao_geral } : { ...objOurs.revisao_geral }
      }
      // Lembretes obsoletos nunca devem ser fundidos: sempre regenerados
      mesclado.lembretes = []

      escreverTexto(c.contexto, JSON.stringify(mesclado, null, 2) + '\n')
      console.log('✓ docs-mentor/contexto.json: fusao semantica 3-way concluida com sucesso.')
    } catch (e: any) {
      console.warn(`! Nao foi possivel realizar fusao automatica de contexto.json: ${e.message}`)
    }
  } else {
    console.log('– docs-mentor/contexto.json: sem marcadores ou conflito pendente.')
  }

  // 1.5. Resolver requisitos.json com política semântica
  const relRequisitos = c.requisitos.replace(c.raiz + '/', '').replace(c.raiz + '\\', '').replace(/\\/g, '/')
  const { base: reqBaseStr, ours: reqOursStr, theirs: reqTheirsStr } = carregarVersoesDeArquivo(relRequisitos)
  if (reqOursStr && reqTheirsStr) {
    try {
      const objBase = reqBaseStr ? JSON.parse(reqBaseStr) : null
      const objOurs = JSON.parse(reqOursStr)
      const objTheirs = JSON.parse(reqTheirsStr)
      const mesclado = mesclarRequisitos3Way(objBase, objOurs, objTheirs)
      escreverTexto(c.requisitos, JSON.stringify(mesclado, null, 2) + '\n')
      console.log('✓ docs-mentor/requisitos/requisitos.json: fusao semantica 3-way concluida com sucesso.')
    } catch (e: any) {
      console.error(`! Falha ao realizar fusao semantica de requisitos.json: ${e.message}`)
      return 1
    }
  } else {
    console.log('– docs-mentor/requisitos/requisitos.json: sem marcadores ou conflito pendente.')
  }

  if (existe(c.contexto)) {
    try {
      atualizarContagens()
    } catch {
      // continua
    }
  }

  // 2. Resolver dividas.json (se houver conflito pendente)
  const relDividas = c.dividas.replace(c.raiz + '/', '').replace(c.raiz + '\\', '').replace(/\\/g, '/')
  const { base: divBaseStr, ours: divOursStr, theirs: divTheirsStr } = carregarVersoesDeArquivo(relDividas)
  if (divOursStr && divTheirsStr) {
    try {
      const objBase = divBaseStr ? JSON.parse(divBaseStr) : null
      const objOurs = JSON.parse(divOursStr)
      const objTheirs = JSON.parse(divTheirsStr)
      const mesclado = mesclarValores3Way(objBase, objOurs, objTheirs)
      escreverTexto(c.dividas, JSON.stringify(mesclado, null, 2) + '\n')
      console.log('✓ docs-mentor/dividas/dividas.json: fusao semantica 3-way concluida com sucesso.')
    } catch (e: any) {
      console.warn(`! Nao foi possivel realizar fusao automatica de dividas.json: ${e.message}`)
    }
  }

  // 3. Resolver riscos-aceitos.json (se houver conflito pendente)
  const relRiscos = c.riscos.replace(c.raiz + '/', '').replace(c.raiz + '\\', '').replace(/\\/g, '/')
  const { base: risBaseStr, ours: risOursStr, theirs: risTheirsStr } = carregarVersoesDeArquivo(relRiscos)
  if (risOursStr && risTheirsStr) {
    try {
      const objBase = risBaseStr ? JSON.parse(risBaseStr) : null
      const objOurs = JSON.parse(risOursStr)
      const objTheirs = JSON.parse(risTheirsStr)
      const mesclado = mesclarValores3Way(objBase, objOurs, objTheirs)
      escreverTexto(c.riscos, JSON.stringify(mesclado, null, 2) + '\n')
      console.log('✓ docs-mentor/seguranca/riscos-aceitos.json: fusao semantica 3-way concluida com sucesso.')
    } catch (e: any) {
      console.warn(`! Nao foi possivel realizar fusao automatica de riscos-aceitos.json: ${e.message}`)
    }
  }

  // 4. Resolver recusas.jsonl
  const relRecusas = c.recusas.replace(c.raiz + '/', '').replace(c.raiz + '\\', '').replace(/\\/g, '/')
  const { ours: recOursStr, theirs: recTheirsStr } = carregarVersoesDeArquivo(relRecusas)
  if (recOursStr && recTheirsStr) {
    const linhasOurs = recOursStr.split('\n').map((l) => l.trim()).filter(Boolean)
    const linhasTheirs = recTheirsStr.split('\n').map((l) => l.trim()).filter(Boolean)
    const conjunto = new Set([...linhasOurs, ...linhasTheirs])
    escreverTexto(c.recusas, Array.from(conjunto).join('\n') + '\n')
    console.log('✓ docs-mentor/tarefas/recusas.jsonl: uniao de registros efetuada.')
  }

  // 5. Regenerar todas as vistas Markdown diretamente dos modelos
  try {
    regenerarTudo()
    console.log('✓ Vistas Markdown (contexto.md, backlog.md, reserva.md, 0-indice.md, pendentes.md, implementados.md) regeneradas.')
  } catch (e: any) {
    console.warn(`! Erro ao regenerar vistas markdown: ${e.message}`)
    return 1
  }

  // 6. Git add nos arquivos resolvidos
  const pendentesMd = `${c.docs}/requisitos/pendentes.md`
  const implementadosMd = `${c.docs}/requisitos/implementados.md`
  const arquivosParaAdd = [
    c.contexto,
    c.requisitos,
    c.dividas,
    c.riscos,
    c.recusas,
    c.contextoMd,
    c.backlog,
    c.reservaMd,
    c.indiceConcluidas,
    pendentesMd,
    implementadosMd,
  ].filter(existe)

  if (arquivosParaAdd.length && existe(`${c.raiz}/.git`)) {
    spawnSync('git', ['add', ...arquivosParaAdd], { cwd: c.raiz })
    console.log('✓ Arquivos gerados adicionados ao stage do Git (git add).')
  }

  console.log('\nResolucao de gerados finalizada com sucesso.')
  return 0
}
