import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { caminhoCorrespondeDeclaracao, caminhos, existe, lerData, lerTexto, relogioDoPacote } from './arquivos.ts'
import { TIPOS_DE_SAIDA_DO_LABORATORIO } from './tipos.ts'
import type { Contexto, Laboratorio, Tarefa } from './tipos.ts'

/**
 * O laboratorio do projeto (0.10.0): onde o experimento vive e o que dele chega ao produto.
 *
 * Nasceu de um vazamento medido no piloto. O codigo do app nao mudou; o laboratorio exportou um JSON
 * que o app importa, com um campo que no app queria dizer "o usuario escolheu". Declaracao no plano nao
 * teria pego: o que pega e' saber os caminhos do laboratorio (para o diff do SPIKE), o inventario das
 * chaves e o teste de contrato de todo artefato que o produto consegue ler.
 */

/** Contexto anterior a 0.10.0 nao tem o bloco: vale o mesmo que nao declarado. */
export function laboratorioDe(ctx: Contexto): Laboratorio {
  const lab = ctx.laboratorio
  return {
    caminhos: Array.isArray(lab?.caminhos) ? lab.caminhos : null,
    saidas: Array.isArray(lab?.saidas) ? lab.saidas : null,
    chaves: Array.isArray(lab?.chaves) ? lab.chaves : [],
    artefatos_importaveis: Array.isArray(lab?.artefatos_importaveis) ? lab.artefatos_importaveis : [],
  }
}

/** Arquivos de codigo do SPIKE fora dos caminhos do laboratorio. `caminhos` vazio: tudo e' produto. */
export function foraDoLaboratorio(arquivos: string[], caminhosDoLab: string[]): string[] {
  return arquivos.filter((a) => !caminhoCorrespondeDeclaracao(a, caminhosDoLab))
}

/**
 * Confere uma referencia `arquivo > nome do teste`: o arquivo existe e contem o nome.
 * E' busca de texto: nao prova que o teste roda nem que checa o que promete (mesmo limite dos
 * criterios de aceite). Devolve o problema, ou `null` quando resolve.
 */
export function problemaDaReferenciaDeTeste(ref: string | null | undefined, raiz: string = caminhos().raiz): string | null {
  if (!ref || !ref.trim()) return 'sem teste nomeado'
  const separador = ref.indexOf(' > ')
  if (separador < 0) return `"${ref}" nao tem a forma "arquivo > nome do teste"`
  const arquivo = ref.slice(0, separador).trim()
  const nome = ref.slice(separador + 3).trim()
  if (!arquivo || !nome) return `"${ref}" nao tem a forma "arquivo > nome do teste"`
  const onde = join(raiz, arquivo)
  if (!existe(onde)) return `${arquivo} nao existe`
  if (!lerTexto(onde).includes(nome)) return `${arquivo} nao contem o teste "${nome}"`
  return null
}

export interface ProblemaDoLaboratorio { onde: string; problema: string }

/** Integridade do inventario: chaves e artefatos importaveis. Usado pelo `verificar`. */
export function problemasDoInventario(ctx: Contexto, raiz: string = caminhos().raiz): ProblemaDoLaboratorio[] {
  const lab = laboratorioDe(ctx)
  const problemas: ProblemaDoLaboratorio[] = []
  lab.chaves.forEach((ch, i) => {
    const onde = `contexto.laboratorio.chaves[${i}]${ch?.nome ? ` (${ch.nome})` : ''}`
    if (!ch?.nome?.trim()) problemas.push({ onde, problema: 'chave sem nome' })
    if (!ch?.dono?.trim()) problemas.push({ onde, problema: 'chave sem dono: chave sem dono nao sai nunca' })
    if (ch?.padrao !== 'desligada') {
      problemas.push({ onde, problema: `padrao "${ch?.padrao ?? ''}": chave de experimento so' pode nascer desligada, senao o experimento esta dentro do produto` })
    }
    if (ch?.remover_em && !lerData(ch.remover_em)) problemas.push({ onde, problema: `remover_em ilegivel: "${ch.remover_em}". O formato e DD/MM/AA` })
    const teste = problemaDaReferenciaDeTeste(ch?.teste, raiz)
    if (teste) problemas.push({ onde, problema: `teste da chave desligada: ${teste}` })
  })
  lab.artefatos_importaveis.forEach((a, i) => {
    const onde = `contexto.laboratorio.artefatos_importaveis[${i}]${a?.artefato ? ` (${a.artefato})` : ''}`
    const teste = problemaDaReferenciaDeTeste(a?.teste_de_contrato, raiz)
    if (teste) problemas.push({ onde, problema: `teste de contrato: ${teste}` })
  })
  return problemas
}

/** Chaves com `remover_em` ja' passado. Chave de experimento esquecida vira comportamento do produto. */
export function chavesVencidas(ctx: Contexto): string[] {
  const hoje = relogioDoPacote()
  return laboratorioDe(ctx).chaves
    .filter((ch) => {
      const quando = lerData(ch?.remover_em ?? null)
      return quando !== null && quando.getTime() < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime()
    })
    .map((ch) => `${ch.nome ?? '(sem nome)'} (remover em ${ch.remover_em})`)
}

/**
 * Saidas do laboratorio que o git guardaria: com arquivo rastreado, ou sem regra de ignorar.
 * A saida do experimento costuma levar dado real, e dado real nao vai para o git.
 */
export function saidasVersionadas(ctx: Contexto, raiz: string = caminhos().raiz): string[] {
  const saidas = laboratorioDe(ctx).saidas ?? []
  const problemas: string[] = []
  for (const saida of saidas) {
    const prefixo = saida.replace(/\\/g, '/').split('*')[0]!.replace(/\/+$/, '')
    if (!prefixo) continue
    const rastreados = spawnSync('git', ['ls-files', '--', prefixo], { cwd: raiz, encoding: 'utf8' })
    if (rastreados.status !== 0) continue
    if (rastreados.stdout.trim()) { problemas.push(`${saida} tem arquivo rastreado pelo git`); continue }
    const ignorado = spawnSync('git', ['check-ignore', '-q', `${prefixo}/__sonda-do-mentor__`], { cwd: raiz, encoding: 'utf8' })
    if (ignorado.status === 1) problemas.push(`${saida} nao esta no .gitignore`)
  }
  return problemas
}

/**
 * O que o `finalizar` cobra da saida de um SPIKE com plano da 0.10.0. `importavel` exige teste de
 * contrato que resolve **e** registrado no contexto: o spike e' descartavel, o inventario fica.
 */
export function problemasDaSaidaDoSpike(t: Tarefa, ctx: Contexto, raiz: string = caminhos().raiz): string[] {
  const saida = t.plano.saida_do_laboratorio
  if (saida === undefined) return []
  if (!saida || !TIPOS_DE_SAIDA_DO_LABORATORIO.includes(saida.tipo as never)) {
    return [`plano.saida_do_laboratorio.tipo precisa ser ${TIPOS_DE_SAIDA_DO_LABORATORIO.map((x) => `"${x}"`).join(' ou ')}`]
  }
  if (saida.tipo !== 'importavel') return []
  const problemas: string[] = []
  if (!saida.artefato?.trim()) problemas.push('saida importavel sem "artefato": diga o que o produto importa')
  const teste = problemaDaReferenciaDeTeste(saida.teste_de_contrato, raiz)
  if (teste) {
    problemas.push(`saida importavel sem teste de contrato que resolve: ${teste}`)
  } else {
    const registrado = laboratorioDe(ctx).artefatos_importaveis.some((a) => a?.teste_de_contrato?.trim() === saida.teste_de_contrato!.trim())
    if (!registrado) {
      problemas.push(`o teste de contrato "${saida.teste_de_contrato}" nao esta em contexto.laboratorio.artefatos_importaveis: registre, para a checagem sobreviver ao spike`)
    }
  }
  return problemas
}
