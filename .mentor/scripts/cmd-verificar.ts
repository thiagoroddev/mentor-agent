import { readdirSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { caminhos, existe, lerJson, lerTexto, listar, raizPacote, relativo } from './arquivos.ts'
import { comparar } from './cmd-regras.ts'
import { conferirManifesto } from './cmd-pacote.ts'
import { carregarContexto, carregarInvariantes, carregarReferencias, carregarRequisitos, carregarTarefas } from './vistas.ts'
import { MARCADOR } from './tipos.ts'
import type { Tetos } from './tipos.ts'

export interface Achado { familia: string; onde: string; problema: string }

function casa(padrao: string, caminho: string): boolean {
  const re = new RegExp('^' + padrao.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$')
  return re.test(caminho)
}

/**
 * Arquivos onde o marcador aparece **como conteudo**, nao como esqueleto por preencher:
 * - `recusas.json` guarda a frase do impedimento, e ela cita o marcador. Acusar o registro de um
 *   erro como se fosse o erro apagaria justamente a medicao de onde o pacote atrapalha.
 * - `relatorio-de-campo.md` e' entregue ao repositorio do PACOTE, nao ao projeto: os marcadores da
 *   parte B sao para quem escreve o relatorio, e nao devem barrar o trabalho do projeto.
 * - `atrito-de-campo.md` e' a fonte escrita da mesma parte B. As tres categorias sao opcionais;
 *   seus marcadores orientam a medicao, mas nao significam trabalho incompleto do projeto.
 */
const MARCADOR_E_CONTEUDO = ['recusas.json', 'relatorio-de-campo.md', 'atrito-de-campo.md']

/** Familia 1: nenhum marcador sobrevivente. O script escreve o esqueleto; ninguem entrega o esqueleto. */
function marcadores(): Achado[] {
  const c = caminhos()
  const achados: Achado[] = []
  const alvos = [...listar(c.docs, '.md'), ...listar(c.docs, '.json')]
    .filter((a) => !MARCADOR_E_CONTEUDO.some((nome) => a.endsWith(nome)))
  for (const a of alvos) {
    if (lerTexto(a).includes(MARCADOR)) {
      achados.push({ familia: 'marcador', onde: relativo(a), problema: `contem ${MARCADOR} nao preenchido` })
    }
  }
  return achados
}

/** Familia 2: teto de texto em caracteres. Linha se burla juntando paragrafos; caractere nao. */
/**
 * Os tetos do pacote, mais os do projeto por cima.
 *
 * ⚠️ **O projeto precisa de um lugar proprio.** Medido em campo: um projeto com 10 ADRs migradas
 * declarou 10 excecoes dentro de `.mentor/tetos.json`, e elas sumiriam no proximo
 * `instalar --forcar`. Decisao do projeto guardada na pasta do pacote e' decisao com data de
 * validade. O arquivo do projeto vem primeiro em toda busca, entao ele sobrepoe sem apagar nada.
 */
export function carregarTetos(): Tetos | null {
  const c = caminhos()
  const doPacote = existe(c.tetos) ? lerJson<Tetos>(c.tetos) : null
  const doProjeto = existe(c.tetosProjeto) ? lerJson<Partial<Tetos>>(c.tetosProjeto) : null
  if (!doPacote && !doProjeto) return null
  return {
    tolerancia: doProjeto?.tolerancia ?? doPacote?.tolerancia ?? 0.1,
    fator_linha: doProjeto?.fator_linha ?? doPacote?.fator_linha ?? 60,
    excecoes: [...(doProjeto?.excecoes ?? []), ...(doPacote?.excecoes ?? [])],
    regras: [...(doProjeto?.regras ?? []), ...(doPacote?.regras ?? [])],
  }
}

export function tetos(): Achado[] {
  const c = caminhos()
  const cfg = carregarTetos()
  if (!cfg) return []
  const achados: Achado[] = []
  const alvos = [...listar(c.pacote, '.md'), ...listar(c.docs, '.md')]
  for (const a of alvos) {
    const rel = relativo(a)
    // Excecao casa por glob, igual as regras. Antes comparava caminho exato, e migrar 10 ADRs
    // exigia 10 entradas literais identicas: uma linha por arquivo, para dizer a mesma coisa.
    const excecao = cfg.excecoes.find((e) => casa(e.caminho, rel))
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

/**
 * Familia 3c: o `.mentor/` instalado bate com a versao que ele diz ser.
 * Nao proibe editar para destravar; proibe **esquecer que editou**, que foi como o pacote chegou
 * incompleto num projeto e ninguem descobriu.
 */
function divergenciaDoPacote(): Achado[] {
  const d = conferirManifesto()
  if (!d) return []
  const total = d.mudados.length + d.faltando.length + d.acrescentados.length
  if (total === 0) return []
  const partes = [
    d.mudados.length ? `${d.mudados.length} mudado(s): ${d.mudados.slice(0, 4).join(', ')}` : '',
    d.faltando.length ? `${d.faltando.length} faltando: ${d.faltando.slice(0, 4).join(', ')}` : '',
    d.acrescentados.length ? `${d.acrescentados.length} acrescentado(s): ${d.acrescentados.slice(0, 4).join(', ')}` : '',
  ].filter(Boolean)
  return [{
    familia: 'referencia',
    onde: `.mentor/ (versao ${d.versao})`,
    problema: `${partes.join(' · ')}. Editar para destravar e legitimo; esquecer que editou vira divergencia silenciosa. Registre no relatorio de campo`,
  }]
}

/** Familia 3: integridade referencial. Todo ponteiro resolve para algo que existe. */
function referencias(): Achado[] {
  const c = caminhos()
  const achados: Achado[] = []
  const ctx = carregarContexto()
  const tarefas = carregarTarefas()
  const reqs = carregarRequisitos()
  const refs = carregarReferencias()

  const idsExternosValidos = new Set<string>()
  for (const ref of refs) {
    if (!ref.id || !ref.onde) {
      achados.push({ familia: 'referencia', onde: 'docs-mentor/referencias.json', problema: 'referencia incompleta (id ou onde ausente)' })
      continue
    }
    const alvo = join(c.raiz, ref.onde)
    if (!existeComGrafiaExata(alvo)) {
      achados.push({
        familia: 'referencia',
        onde: 'docs-mentor/referencias.json',
        problema: `referencia ${ref.id} aponta para ${ref.onde}, que nao existe`,
      })
    } else {
      idsExternosValidos.add(ref.id)
    }
  }

  const invs = carregarInvariantes()
  for (const inv of invs) {
    if (!inv.id || !inv.enunciado || !inv.porque) {
      achados.push({ familia: 'referencia', onde: 'docs-mentor/invariantes.json', problema: `invariante ${inv.id ?? '(sem id)'} incompleta` })
    }
  }

  const idsTarefa = new Set(tarefas.map((t) => t.id))
  const idsReq = new Set([...reqs.map((r) => r.id), ...idsExternosValidos])

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
  const achados = [
    ...marcadores(), ...tetos(), ...referencias(),
    ...links(), ...inventarioDeRegras(), ...divergenciaDoPacote(),
  ]
  if (achados.length === 0) {
    console.log('APROVADO. Tres familias: marcadores, tetos de texto, integridade referencial (ponteiros, links e inventario de regras).')
    return 0
  }
  console.error(`REPROVADO. ${achados.length} achado(s):\n`)
  for (const a of achados) console.error(`  [${a.familia}] ${a.onde}: ${a.problema}`)
  return 1
}
