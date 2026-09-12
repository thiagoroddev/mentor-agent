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

function carregarVersoesDeArquivo(caminhoRelativo: string): { ours: string | null; theirs: string | null } {
  const c = caminhos()
  const rOurs = spawnSync('git', ['show', `:2:${caminhoRelativo}`], { cwd: c.raiz, encoding: 'utf8' })
  const rTheirs = spawnSync('git', ['show', `:3:${caminhoRelativo}`], { cwd: c.raiz, encoding: 'utf8' })
  if (rOurs.status === 0 && rTheirs.status === 0 && rOurs.stdout && rTheirs.stdout) {
    return { ours: rOurs.stdout, theirs: rTheirs.stdout }
  }

  const caminhoAbs = `${c.raiz}/${caminhoRelativo}`
  if (existe(caminhoAbs)) {
    const texto = lerTexto(caminhoAbs)
    const extraido = extrairConflitoTexto(texto)
    if (extraido) return extraido
  }

  return { ours: null, theirs: null }
}

export function resolverGerados(): number {
  const c = caminhos()
  console.log('Resolvendo conflitos em arquivos gerados e modelos hibridos...\n')

  // 1. Resolver contexto.json
  const relContexto = c.contexto.replace(c.raiz + '/', '').replace(c.raiz + '\\', '').replace(/\\/g, '/')
  const { ours: ctxOursStr, theirs: ctxTheirsStr } = carregarVersoesDeArquivo(relContexto)
  if (ctxOursStr && ctxTheirsStr) {
    try {
      const objOurs = JSON.parse(ctxOursStr)
      const objTheirs = JSON.parse(ctxTheirsStr)
      const mesclado = mesclarValores(objOurs, objTheirs)
      escreverTexto(c.contexto, JSON.stringify(mesclado, null, 2) + '\n')
      console.log('✓ docs-mentor/contexto.json: fusao semantica concluida com sucesso.')
    } catch (e: any) {
      console.warn(`! Nao foi possivel realizar fusao automatica de contexto.json: ${e.message}`)
    }
  } else {
    console.log('– docs-mentor/contexto.json: sem marcadores ou conflito pendente.')
  }

  if (existe(c.contexto)) {
    try {
      atualizarContagens()
    } catch {
      // continua
    }
  }

  // 2. Resolver recusas.jsonl
  const relRecusas = c.recusas.replace(c.raiz + '/', '').replace(c.raiz + '\\', '').replace(/\\/g, '/')
  const { ours: recOursStr, theirs: recTheirsStr } = carregarVersoesDeArquivo(relRecusas)
  if (recOursStr && recTheirsStr) {
    const linhasOurs = recOursStr.split('\n').map((l) => l.trim()).filter(Boolean)
    const linhasTheirs = recTheirsStr.split('\n').map((l) => l.trim()).filter(Boolean)
    const conjunto = new Set([...linhasOurs, ...linhasTheirs])
    escreverTexto(c.recusas, Array.from(conjunto).join('\n') + '\n')
    console.log('✓ docs-mentor/tarefas/recusas.jsonl: uniao de registros efetuada.')
  }

  // 3. Regenerar todas as vistas Markdown diretamente dos modelos
  try {
    regenerarTudo()
    console.log('✓ Vistas Markdown (contexto.md, backlog.md, reserva.md, 0-indice.md) regeneradas.')
  } catch (e: any) {
    console.warn(`! Erro ao regenerar vistas markdown: ${e.message}`)
  }

  // 4. Git add nos arquivos resolvidos
  const arquivosParaAdd = [c.contexto, c.recusas, c.contextoMd, c.backlog, c.reservaMd, c.indiceConcluidas].filter(existe)
  if (arquivosParaAdd.length && existe(`${c.raiz}/.git`)) {
    spawnSync('git', ['add', ...arquivosParaAdd], { cwd: c.raiz })
    console.log('✓ Arquivos gerados adicionados ao stage do Git (git add).')
  }

  console.log('\nResolucao de gerados finalizada com sucesso.')
  return 0
}
