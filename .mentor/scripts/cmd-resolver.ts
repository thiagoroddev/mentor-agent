import { spawnSync } from 'node:child_process'
import { join, relative } from 'node:path'
import { caminhos, escreverTexto, existe, lerTexto } from './arquivos.ts'
import { atualizarContagens, regenerarTudo } from './vistas.ts'

export function estaEmRepositorioGit(raiz: string): boolean {
  try {
    const r = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: raiz,
      encoding: 'utf8',
      timeout: 5_000,
    })
    return r.status === 0 && r.stdout.trim() === 'true'
  } catch {
    return false
  }
}

export function obterArquivosEmConflitoNoGit(raiz: string): string[] {
  try {
    const rDiff = spawnSync('git', ['diff', '--name-only', '--diff-filter=U'], {
      cwd: raiz,
      encoding: 'utf8',
      timeout: 5_000,
    })
    if (rDiff.status === 0 && rDiff.stdout) {
      return rDiff.stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    }
    const rLs = spawnSync('git', ['ls-files', '-u'], {
      cwd: raiz,
      encoding: 'utf8',
      timeout: 5_000,
    })
    if (rLs.status === 0 && rLs.stdout) {
      const unmerged = new Set<string>()
      for (const linha of rLs.stdout.split(/\r?\n/).filter(Boolean)) {
        const partes = linha.split('\t')
        if (partes[1]) unmerged.add(partes[1].trim())
      }
      return Array.from(unmerged)
    }
  } catch {
    // continua
  }
  return []
}

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

function extrairConflitoTexto(conteudo: string): { base: string | null; ours: string; theirs: string } | null {
  const padraoDiff3 = /<<<<<<<[^\n]*\r?\n([\s\S]*?)\|\|\|\|\|\|\|[^\n]*\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>>[^\n]*\r?\n?/g
  const padrao2Way = /<<<<<<<[^\n]*\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>>[^\n]*\r?\n?/g

  if (padraoDiff3.test(conteudo)) {
    let base = ''
    let ours = ''
    let theirs = ''
    let ultimo = 0
    padraoDiff3.lastIndex = 0
    let match
    while ((match = padraoDiff3.exec(conteudo)) !== null) {
      const prefixo = conteudo.slice(ultimo, match.index)
      ours += prefixo + match[1]
      base += prefixo + match[2]
      theirs += prefixo + match[3]
      ultimo = padraoDiff3.lastIndex
    }
    const sufixo = conteudo.slice(ultimo)
    ours += sufixo
    base += sufixo
    theirs += sufixo
    return { base, ours, theirs }
  }

  if (padrao2Way.test(conteudo)) {
    let ours = ''
    let theirs = ''
    let ultimo = 0
    padrao2Way.lastIndex = 0
    let match
    while ((match = padrao2Way.exec(conteudo)) !== null) {
      const prefixo = conteudo.slice(ultimo, match.index)
      ours += prefixo + match[1]
      theirs += prefixo + match[2]
      ultimo = padrao2Way.lastIndex
    }
    const sufixo = conteudo.slice(ultimo)
    ours += sufixo
    theirs += sufixo
    return { base: null, ours, theirs }
  }

  return null
}

function carregarVersoesDeArquivo(caminhoRelativo: string, raiz?: string): { base: string | null; ours: string | null; theirs: string | null; temConflito: boolean } {
  const c = caminhos(raiz)
  const rel = caminhoRelativo.replace(/\\/g, '/')
  const rBase = spawnSync('git', ['show', `:1:${rel}`], { cwd: c.raiz, encoding: 'utf8', timeout: 5_000 })
  const rOurs = spawnSync('git', ['show', `:2:${rel}`], { cwd: c.raiz, encoding: 'utf8', timeout: 5_000 })
  const rTheirs = spawnSync('git', ['show', `:3:${rel}`], { cwd: c.raiz, encoding: 'utf8', timeout: 5_000 })
  const base = rBase.status === 0 && rBase.stdout ? rBase.stdout : null
  const ours = rOurs.status === 0 && rOurs.stdout ? rOurs.stdout : null
  const theirs = rTheirs.status === 0 && rTheirs.stdout ? rTheirs.stdout : null
  if (ours !== null && theirs !== null) {
    return { base, ours, theirs, temConflito: true }
  }

  const caminhoAbs = `${c.raiz}/${rel}`
  if (existe(caminhoAbs)) {
    const texto = lerTexto(caminhoAbs)
    const extraido = extrairConflitoTexto(texto)
    if (extraido) return { ...extraido, temConflito: true }
  }

  return { base: null, ours: null, theirs: null, temConflito: false }
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

export function resolverGerados(raizInformada?: string): number {
  const c = caminhos(raizInformada)
  const emGit = estaEmRepositorioGit(c.raiz)
  console.log('Resolvendo conflitos em arquivos gerados e modelos hibridos...\n')

  const fontesComSucesso = new Set<string>()
  const fontesComFalha = new Map<string, string>()

  // 1. Resolver contexto.json
  const relContexto = relative(c.raiz, c.contexto).replace(/\\/g, '/')
  const ctxVersoes = carregarVersoesDeArquivo(relContexto, c.raiz)
  if (ctxVersoes.temConflito) {
    if (ctxVersoes.ours && ctxVersoes.theirs) {
      try {
        const objBase = ctxVersoes.base ? JSON.parse(ctxVersoes.base) : null
        const objOurs = JSON.parse(ctxVersoes.ours)
        const objTheirs = JSON.parse(ctxVersoes.theirs)
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
        fontesComSucesso.add(c.contexto)
        console.log(`✓ ${relContexto}: fusao semantica 3-way concluida com sucesso.`)
      } catch (e: any) {
        fontesComFalha.set(c.contexto, `falha na fusao: ${e.message}`)
        console.warn(`! Nao foi possivel realizar fusao automatica de ${relContexto}: ${e.message}`)
      }
    } else {
      fontesComFalha.set(c.contexto, 'marcador de conflito presente sem versoes validas')
      console.warn(`! Marcador de conflito presente em ${relContexto} sem versoes extraiveis`)
    }
  } else {
    if (existe(c.contexto) && lerTexto(c.contexto).includes('<<<<<<<')) {
      fontesComFalha.set(c.contexto, 'marcador de conflito presente')
    } else if (existe(c.contexto)) {
      console.log(`– ${relContexto}: sem marcadores ou conflito pendente.`)
    }
  }

  // 2. Resolver requisitos.json com política semântica
  const relRequisitos = relative(c.raiz, c.requisitos).replace(/\\/g, '/')
  const reqVersoes = carregarVersoesDeArquivo(relRequisitos, c.raiz)
  if (reqVersoes.temConflito) {
    if (reqVersoes.ours && reqVersoes.theirs) {
      try {
        const objBase = reqVersoes.base ? JSON.parse(reqVersoes.base) : null
        const objOurs = JSON.parse(reqVersoes.ours)
        const objTheirs = JSON.parse(reqVersoes.theirs)
        const mesclado = mesclarRequisitos3Way(objBase, objOurs, objTheirs)
        escreverTexto(c.requisitos, JSON.stringify(mesclado, null, 2) + '\n')
        fontesComSucesso.add(c.requisitos)
        console.log(`✓ ${relRequisitos}: fusao semantica 3-way concluida com sucesso.`)
      } catch (e: any) {
        fontesComFalha.set(c.requisitos, `falha na fusao: ${e.message}`)
        console.error(`! Falha ao realizar fusao semantica de ${relRequisitos}: ${e.message}`)
      }
    } else {
      fontesComFalha.set(c.requisitos, 'marcador de conflito presente sem versoes validas')
      console.warn(`! Marcador de conflito presente em ${relRequisitos} sem versoes extraiveis`)
    }
  } else {
    if (existe(c.requisitos) && lerTexto(c.requisitos).includes('<<<<<<<')) {
      fontesComFalha.set(c.requisitos, 'marcador de conflito presente')
    } else if (existe(c.requisitos)) {
      console.log(`– ${relRequisitos}: sem marcadores ou conflito pendente.`)
    }
  }

  // 3. Resolver dividas.json (se houver conflito pendente)
  const relDividas = relative(c.raiz, c.dividas).replace(/\\/g, '/')
  const divVersoes = carregarVersoesDeArquivo(relDividas, c.raiz)
  if (divVersoes.temConflito) {
    if (divVersoes.ours && divVersoes.theirs) {
      try {
        const objBase = divVersoes.base ? JSON.parse(divVersoes.base) : null
        const objOurs = JSON.parse(divVersoes.ours)
        const objTheirs = JSON.parse(divVersoes.theirs)
        const mesclado = mesclarValores3Way(objBase, objOurs, objTheirs)
        escreverTexto(c.dividas, JSON.stringify(mesclado, null, 2) + '\n')
        fontesComSucesso.add(c.dividas)
        console.log(`✓ ${relDividas}: fusao semantica 3-way concluida com sucesso.`)
      } catch (e: any) {
        fontesComFalha.set(c.dividas, `falha na fusao: ${e.message}`)
        console.warn(`! Nao foi possivel realizar fusao automatica de ${relDividas}: ${e.message}`)
      }
    } else {
      fontesComFalha.set(c.dividas, 'marcador de conflito presente sem versoes validas')
      console.warn(`! Marcador de conflito presente em ${relDividas} sem versoes extraiveis`)
    }
  } else {
    if (existe(c.dividas) && lerTexto(c.dividas).includes('<<<<<<<')) {
      fontesComFalha.set(c.dividas, 'marcador de conflito presente')
    }
  }

  // 4. Resolver riscos-aceitos.json (se houver conflito pendente)
  const relRiscos = relative(c.raiz, c.riscos).replace(/\\/g, '/')
  const risVersoes = carregarVersoesDeArquivo(relRiscos, c.raiz)
  if (risVersoes.temConflito) {
    if (risVersoes.ours && risVersoes.theirs) {
      try {
        const objBase = risVersoes.base ? JSON.parse(risVersoes.base) : null
        const objOurs = JSON.parse(risVersoes.ours)
        const objTheirs = JSON.parse(risVersoes.theirs)
        const mesclado = mesclarValores3Way(objBase, objOurs, objTheirs)
        escreverTexto(c.riscos, JSON.stringify(mesclado, null, 2) + '\n')
        fontesComSucesso.add(c.riscos)
        console.log(`✓ ${relRiscos}: fusao semantica 3-way concluida com sucesso.`)
      } catch (e: any) {
        fontesComFalha.set(c.riscos, `falha na fusao: ${e.message}`)
        console.warn(`! Nao foi possivel realizar fusao automatica de ${relRiscos}: ${e.message}`)
      }
    } else {
      fontesComFalha.set(c.riscos, 'marcador de conflito presente sem versoes validas')
      console.warn(`! Marcador de conflito presente em ${relRiscos} sem versoes extraiveis`)
    }
  } else {
    if (existe(c.riscos) && lerTexto(c.riscos).includes('<<<<<<<')) {
      fontesComFalha.set(c.riscos, 'marcador de conflito presente')
    }
  }

  // 5. Resolver recusas.jsonl
  const relRecusas = relative(c.raiz, c.recusas).replace(/\\/g, '/')
  const recVersoes = carregarVersoesDeArquivo(relRecusas, c.raiz)
  if (recVersoes.temConflito) {
    if (recVersoes.ours && recVersoes.theirs) {
      try {
        const linhasOurs = recVersoes.ours.split('\n').map((l) => l.trim()).filter(Boolean)
        const linhasTheirs = recVersoes.theirs.split('\n').map((l) => l.trim()).filter(Boolean)
        const conjunto = new Set([...linhasOurs, ...linhasTheirs])
        escreverTexto(c.recusas, Array.from(conjunto).join('\n') + '\n')
        fontesComSucesso.add(c.recusas)
        console.log(`✓ ${relRecusas}: uniao de registros efetuada.`)
      } catch (e: any) {
        fontesComFalha.set(c.recusas, `falha na fusao: ${e.message}`)
        console.warn(`! Falha na uniao de ${relRecusas}: ${e.message}`)
      }
    } else {
      fontesComFalha.set(c.recusas, 'marcador de conflito presente sem versoes validas')
    }
  } else {
    if (existe(c.recusas) && lerTexto(c.recusas).includes('<<<<<<<')) {
      fontesComFalha.set(c.recusas, 'marcador de conflito presente')
    }
  }

  // Atualizar contagens se contexto for valido
  if (existe(c.contexto) && !fontesComFalha.has(c.contexto)) {
    try {
      atualizarContagens()
    } catch {
      // continua
    }
  }

  // 6. Regenerar todas as vistas Markdown diretamente dos modelos
  const vistasComSucesso = new Set<string>()
  if (fontesComFalha.has(c.contexto) || fontesComFalha.has(c.requisitos)) {
    console.warn('! Vistas Markdown nao regeneradas: fontes necessarias (contexto/requisitos) possuem falhas ou conflitos pendentes.')
  } else {
    try {
      regenerarTudo()
      console.log('✓ Vistas Markdown (contexto.md, backlog.md, reserva.md, 0-indice.md, pendentes.md, implementados.md) regeneradas.')
      const pendentesMd = join(c.docs, 'requisitos', 'pendentes.md')
      const implementadosMd = join(c.docs, 'requisitos', 'implementados.md')
      for (const v of [c.contextoMd, c.backlog, c.reservaMd, c.indiceConcluidas, pendentesMd, implementadosMd]) {
        if (existe(v)) vistasComSucesso.add(v)
      }
    } catch (e: any) {
      console.warn(`! Erro ao regenerar vistas markdown: ${e.message}`)
    }
  }

  // 7. Git add estrito apenas nos arquivos resolvidos com sucesso
  const arquivosParaAdd: string[] = []
  for (const f of [...fontesComSucesso, ...vistasComSucesso]) {
    if (existe(f) && !fontesComFalha.has(f)) {
      arquivosParaAdd.push(f)
    }
  }

  let stageFalhou = false
  if (emGit && arquivosParaAdd.length > 0) {
    const rAdd = spawnSync('git', ['add', ...arquivosParaAdd], { cwd: c.raiz, encoding: 'utf8', timeout: 10_000 })
    if (rAdd.status === 0) {
      console.log(`✓ ${arquivosParaAdd.length} arquivo(s) resolvido(s) adicionado(s) ao stage do Git (git add).`)
    } else {
      stageFalhou = true
      console.error(`✗ Falha ao executar git add: ${rAdd.stderr || rAdd.stdout}`)
    }
  }

  // 8. Checagem estrita de conflitos remanescentes
  if (!emGit) {
    if (fontesComFalha.size > 0) {
      console.error('\n✗ Resolucao finalizada com erro: ha falhas ou marcadores de conflito pendentes fora do Git.')
      return 1
    }
    console.log('\nInformacao: operacao executada fora de repositorio Git; sem verificacao de indice.')
    console.log('Resolucao de gerados finalizada com sucesso.')
    return 0
  }

  const conflitosRestantes = obterArquivosEmConflitoNoGit(c.raiz)
  if (fontesComFalha.size > 0 || stageFalhou || conflitosRestantes.length > 0) {
    console.error('\n✗ Resolucao de gerados INCOMPLETA ou COM FALHAS (codigo 1):')
    if (fontesComFalha.size > 0) {
      console.error(`  - ${fontesComFalha.size} fonte(s) do Mentor falharam na fusao:`)
      for (const [arq, motivo] of fontesComFalha.entries()) {
        console.error(`    * ${relative(c.raiz, arq).replace(/\\/g, '/')}: ${motivo}`)
      }
    }
    if (stageFalhou) {
      console.error('  - Falha ao atualizar o stage do Git (git add).')
    }
    if (conflitosRestantes.length > 0) {
      console.error(`  - ${conflitosRestantes.length} arquivo(s) permanecem em conflito no indice do Git (unmerged):`)
      for (const arq of conflitosRestantes) {
        console.error(`    * ${arq}`)
      }
      console.error('    Resolva os conflitos remanescentes manualmente antes de concluir o merge.')
    }
    return 1
  }

  console.log('\nResolucao de gerados finalizada com sucesso.')
  return 0
}
