import { caminhos } from './arquivos.ts'
import {
  diagnosticoDosPontosDeEntrada, estadoDasSkills as retratoDasSkills, migrarPontosDeEntrada, relatorioDeSkills,
  sincronizarAgentes, sincronizarSkills,
} from './instalar.mjs'

export {
  PONTOS_DE_ENTRADA, criarPontosDeEntrada, diagnosticoDosPontosDeEntrada, estadoDoBloco, estadoDasSkills,
} from './instalar.mjs'

/** Os tres lugares que as funcoes de carregamento precisam: no teste o pacote roda fora do projeto. */
export function locaisDoProjeto(): { raiz: string; pacote: string; docs: string } {
  const c = caminhos()
  return { raiz: c.raiz, pacote: c.pacote, docs: c.docs }
}

/**
 * Mensuravel, sem julgamento: o que cada ferramenta vai carregar ao abrir o projeto. E' o que o doctor
 * consegue checar; nao ha como medir daqui se a ferramenta de fato carregou.
 * A geracao mora em `instalar.mjs`, em JS puro, porque o `instalar` roda de dentro de node_modules.
 */
export function pontosDeEntrada(): Array<{ estado: string; texto: string }> {
  return diagnosticoDosPontosDeEntrada(locaisDoProjeto())
}

/**
 * O que o `gerar` faz alem das vistas: atualiza o nucleo que ja' esta' no `AGENTS.md` e as copias das
 * skills que ja' foram sincronizadas. Nao insere bloco nem cria copia em projeto que ainda nao migrou:
 * mudar a forma dos arquivos e' o `instalar` ou o `entrada migrar`, explicitos.
 */
export function gerarCarregamento(): number {
  const l = locaisDoProjeto()
  let codigo = 0
  const bloco = sincronizarAgentes(l, { inserir: false })
  if (bloco.estado === 'atualizado') console.log('Nucleo atualizado dentro do AGENTS.md.')
  else if (bloco.estado === 'invalido') {
    console.error(`AGENTS.md com marcadores do nucleo invalidos (${bloco.detalhe}): nada foi alterado. Conserte a mao e rode de novo.`)
    codigo = 1
  }
  const retrato = retratoDasSkills(l)
  if (retrato.sincronizadas || retrato.destinos.some((d: { registro: { estado: string } }) => d.registro.estado === 'corrompido')) {
    const r = sincronizarSkills(l)
    for (const linha of relatorioDeSkills(r)) console.log(linha)
    if (r.recusas.length) codigo = 1
  }
  return codigo
}

/** `entrada migrar`: leva os pontos de entrada e as skills de instalacao antiga ao modelo novo. */
export function migrarEntrada(): number {
  const r = migrarPontosDeEntrada(locaisDoProjeto())
  for (const linha of r.linhas) console.log(linha)
  return r.recusou ? 1 : 0
}
