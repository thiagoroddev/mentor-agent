import { readdirSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { caminhos, existe, lerJson, lerTexto, listar, raizPacote, relativo } from './arquivos.ts'
import { comparar } from './cmd-regras.ts'
import { carregarContexto, carregarRequisitos, carregarTarefas } from './vistas.ts'
import { MARCADOR } from './tipos.ts'
import type { Tetos } from './tipos.ts'

export interface Achado { familia: string; onde: string; problema: string }

function casa(padrao: string, caminho: string): boolean {
  const re = new RegExp('^' + padrao.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$')
  return re.test(caminho)
}

/** Familia 1: nenhum marcador sobrevivente. O script escreve o esqueleto; ninguem entrega o esqueleto. */
function marcadores(): Achado[] {
  const c = caminhos()
  const achados: Achado[] = []
  const alvos = [...listar(c.docs, '.md'), ...listar(c.docs, '.json')]
  for (const a of alvos) {
    if (lerTexto(a).includes(MARCADOR)) {
      achados.push({ familia: 'marcador', onde: relativo(a), problema: `contem ${MARCADOR} nao preenchido` })
    }
  }
  return achados
}

/** Familia 2: teto de texto em caracteres. Linha se burla juntando paragrafos; caractere nao. */
export function tetos(): Achado[] {
  const c = caminhos()
  if (!existe(c.tetos)) return []
  const cfg = lerJson<Tetos>(c.tetos)
  const achados: Achado[] = []
  const alvos = [...listar(c.pacote, '.md'), ...listar(c.docs, '.md')]
  for (const a of alvos) {
    const rel = relativo(a)
    const excecao = cfg.excecoes.find((e) => e.caminho === rel)
    const regra = cfg.regras.find((r) => casa(r.padrao, rel))
    const teto = excecao?.teto ?? regra?.teto
    if (!teto) continue
    const tamanho = lerTexto(a).length
    if (tamanho > teto * (1 + cfg.tolerancia)) {
      const pct = Math.round((tamanho / teto) * 100)
      achados.push({ familia: 'teto', onde: rel, problema: `${tamanho} caracteres, ${pct}% do teto ${teto}` })
    }
  }
  return achados
}

/**
 * Existe **com a grafia exata**. O Windows tem sistema de arquivos insensivel a maiusculas, entao um
 * link para `32-adr.md` apontando para o arquivo `32-ADR.md` funciona na maquina do autor e quebra
 * no GitHub e no Linux. Aqui a comparacao e' byte a byte, segmento por segmento.
 */
function existeComGrafiaExata(caminho: string): boolean {
  if (!existe(caminho)) return false
  let atual = resolve(caminho)
  for (;;) {
    const pai = dirname(atual)
    if (pai === atual) return true
    if (!readdirSync(pai).includes(basename(atual))) return false
    atual = pai
  }
}

const CERCA = /```[\s\S]*?```|`[^`\n]*`/g
const LINK = /\[[^\]]*\]\(([^)\s]+)\)/g

/** Familia 3a: link relativo em markdown resolve para arquivo que existe, com a grafia certa. */
function links(): Achado[] {
  const c = caminhos()
  const achados: Achado[] = []
  const alvos = [...listar(c.pacote, '.md'), ...listar(c.docs, '.md')]
  for (const arquivo of alvos) {
    const rel = relativo(arquivo)
    if (basename(arquivo).endsWith('.md.md')) {
      achados.push({ familia: 'referencia', onde: rel, problema: 'extensao dupla .md.md' })
    }
    const texto = lerTexto(arquivo).replace(CERCA, '')
    for (const casou of texto.matchAll(LINK)) {
      const bruto = casou[1]
      if (!bruto) continue
      if (/^(https?:|mailto:|#)/.test(bruto)) continue
      const semAncora = bruto.split('#')[0]
      if (!semAncora) continue
      const alvo = join(dirname(arquivo), decodeURI(semAncora))
      if (!existeComGrafiaExata(alvo)) {
        const existeIgnorandoCaixa = existe(alvo)
        achados.push({
          familia: 'referencia',
          onde: rel,
          problema: existeIgnorandoCaixa
            ? `link "${bruto}" so resolve porque este sistema de arquivos ignora maiusculas. Quebra no Linux e no GitHub`
            : `link "${bruto}" nao resolve`,
        })
      }
    }
  }
  return achados
}

/** Familia 3b: o inventario de regras espelha o guia, nos dois sentidos. */
function inventarioDeRegras(): Achado[] {
  const d = comparar()
  const achados: Achado[] = []
  const onde = '.mentor/regras.json'
  if (d.faltando.length) {
    achados.push({ familia: 'referencia', onde, problema: `${d.faltando.length} regra(s) do guia fora do inventario: ${d.faltando.slice(0, 6).join(', ')}${d.faltando.length > 6 ? '...' : ''}. Rode: mentor regras --sincronizar` })
  }
  if (d.sobrando.length) {
    achados.push({ familia: 'referencia', onde, problema: `${d.sobrando.length} regra(s) no inventario que sumiram do guia: ${d.sobrando.slice(0, 6).join(', ')}${d.sobrando.length > 6 ? '...' : ''}` })
  }
  if (d.movidas.length) {
    achados.push({ familia: 'referencia', onde, problema: `${d.movidas.length} regra(s) mudaram de arquivo: ${d.movidas.slice(0, 6).join(', ')}` })
  }
  return achados
}

/** Familia 3: integridade referencial. Todo ponteiro resolve para algo que existe. */
function referencias(): Achado[] {
  const c = caminhos()
  const achados: Achado[] = []
  const ctx = carregarContexto()
  const tarefas = carregarTarefas()
  const reqs = carregarRequisitos()
  const idsTarefa = new Set(tarefas.map((t) => t.id))
  const idsReq = new Set(reqs.map((r) => r.id))

  for (const f of ctx.ferramentas) {
    if (f.dispensa_motivo) continue
    if (!f.padrao) achados.push({ familia: 'referencia', onde: `ferramenta ${f.nome}`, problema: 'sem arquivo de padrao e sem dispensa_motivo' })
    else if (!existe(`${c.raiz}/${f.padrao}`)) achados.push({ familia: 'referencia', onde: `ferramenta ${f.nome}`, problema: `padrao aponta para ${f.padrao}, que nao existe` })
  }

  for (const t of tarefas) {
    for (const d of t.depende_de) if (!idsTarefa.has(d)) achados.push({ familia: 'referencia', onde: t.id, problema: `depende de ${d}, que nao existe` })
    for (const r of t.requisitos) if (!idsReq.has(r)) achados.push({ familia: 'referencia', onde: t.id, problema: `cita requisito ${r}, que nao existe` })
    if (t.fatia_de && !idsTarefa.has(t.fatia_de)) achados.push({ familia: 'referencia', onde: t.id, problema: `fatia de ${t.fatia_de}, que nao existe` })
    if (!t.origem) achados.push({ familia: 'referencia', onde: t.id, problema: 'origem vazia: use IDs resolviveis ou o token titulo-autossuficiente' })
    if (t.estado === 'concluida' && (!t.narrativa || !existe(`${c.concluidas}/${t.narrativa}`))) {
      achados.push({ familia: 'referencia', onde: t.id, problema: 'concluida sem narrativa em disco' })
    }
  }

  for (const r of reqs) {
    if (r.status === 'implementado' && r.tarefas.length === 0) {
      achados.push({ familia: 'referencia', onde: r.id, problema: 'marcado implementado sem nenhuma tarefa vinculada' })
    }
  }
  return achados
}

export function verificar(): number {
  const achados = [...marcadores(), ...tetos(), ...referencias(), ...links(), ...inventarioDeRegras()]
  if (achados.length === 0) {
    console.log('APROVADO. Tres familias: marcadores, tetos de texto, integridade referencial (ponteiros, links e inventario de regras).')
    return 0
  }
  console.error(`REPROVADO. ${achados.length} achado(s):\n`)
  for (const a of achados) console.error(`  [${a.familia}] ${a.onde}: ${a.problema}`)
  return 1
}
