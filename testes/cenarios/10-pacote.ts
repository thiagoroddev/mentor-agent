import { cpSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import {
  RAIZ_REPO, abrirCenarioTemporario, confere, dizQue, escrever, fecharTemporario, ler, lerJson, mentor,
} from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/**
 * Instalacao e divergencia. Fora do repositorio, porque instalar copia o pacote para uma raiz
 * limpa, e aqui dentro ele ja' existe.
 */
export function rodar(): Cenario {
  const c = abrirCenarioTemporario('10-pacote')
  dizQue(c, mentor(c, 'instalar', '--destino', c.pasta), 'instalado em', 'instalar copia o pacote')
  mentor(c, 'init')

  const ctx = lerJson<Record<string, any>>(c, 'docs/contexto.json')
  confere(c, ctx['_meta'].versao_do_pacote === '0.1.3',
    'a versao do pacote fica gravada no contexto: sem ela o relatorio nao atribui nada')

  confere(c, mentor(c, 'verificar').codigo === 0, 'pacote recem-instalado nao diverge de nada')

  // --- pontos de entrada. Sem eles nenhuma ferramenta le o nucleo, e o pacote inteiro nao existe.
  //     No antecessor isto so foi notado quando um projeto real carregou nada.
  for (const arquivo of ['CLAUDE.md', 'AGENTS.md', 'GEMINI.md']) {
    confere(c, ler(c, arquivo).includes('.mentor/nucleo.md'), `${arquivo} aponta para o nucleo`)
  }
  confere(c, ler(c, 'CLAUDE.md').includes('@.mentor/nucleo.md'),
    'no Claude o carregamento e mecanico: `@` traz o conteudo sem depender de o agente abrir nada')
  const somados = ['CLAUDE.md', 'AGENTS.md', 'GEMINI.md'].reduce((n, f) => n + ler(c, f).length, 0)
  confere(c, somados < 4000,
    `ponteiro, nunca espelho: ${somados} chars nos tres (o AGENTS.md do antecessor sozinho tinha 22.616)`)
  dizQue(c, mentor(c, 'doctor'), 'pontos de entrada apontam para o nucleo', 'o doctor confere que existe quem carregue')

  // --- o arquivo da pessoa nunca e sobrescrito
  escrever(c, 'CLAUDE.md', '# Meu arquivo\n\nTexto que nao pode sumir.\n')
  const reinstala = mentor(c, 'instalar', '--destino', c.pasta, '--forcar')
  confere(c, ler(c, 'CLAUDE.md').includes('nao pode sumir'),
    'CLAUDE.md existente sobrevive a reinstalacao: apagar o texto da pessoa seria imperdoavel')
  dizQue(c, reinstala, 'Ja existia, e nao foi tocado', 'e o comando diz o que colar a mao')
  dizQue(c, mentor(c, 'doctor'), 'nao cita .mentor/nucleo.md',
    'ponto de entrada que nao chega nas leis e bloqueio, nao aviso')

  // --- editar para destravar e legitimo; esquecer que editou nao
  const nucleo = ler(c, '.mentor/nucleo.md')
  escrever(c, '.mentor/nucleo.md', nucleo + '\n<!-- ajuste local para destravar -->\n')
  escrever(c, '.mentor/processos/inventado.md', '# processo local\n')
  const divergente = mentor(c, 'verificar')
  confere(c, divergente.codigo === 1, 'pacote editado depois da instalacao reprova o verificar')
  dizQue(c, divergente, '1 mudado(s): nucleo.md', 'a mensagem nomeia o arquivo alterado')
  dizQue(c, divergente, '1 acrescentado(s): processos/inventado.md', 'e o arquivo acrescentado')
  dizQue(c, divergente, 'esquecer que editou vira divergencia silenciosa',
    'a mensagem diz por que isso importa, e nao proibe editar')

  // --- reinstalar por cima avisa antes de descartar
  const recusa = mentor(c, 'instalar', '--destino', c.pasta)
  confere(c, recusa.codigo === 1, 'nao reinstala por cima sem --forcar')
  dizQue(c, recusa, 'Reinstalar por cima descarta essas mudancas',
    'e avisa que ha divergencia a registrar antes')

  dizQue(c, mentor(c, 'instalar', '--destino', c.pasta, '--forcar'), 'instalado em', 'com --forcar, reinstala')
  confere(c, !ler(c, '.mentor/nucleo.md').includes('ajuste local'), 'a reinstalacao devolve o arquivo original')

  // --- o caminho real de entrega: `npm i` poe o pacote em node_modules, e la' o Node **se recusa**
  // a remover tipos de `.ts` (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING). O `mentor.mjs` precisa
  // atravessar isso em JS puro. Sem este cenario, o defeito so' apareceria no primeiro projeto real.
  const dentro = join(c.pasta, 'node_modules', 'mentor-agent')
  mkdirSync(dentro, { recursive: true })
  cpSync(join(RAIZ_REPO, '.mentor'), join(dentro, '.mentor'), { recursive: true })
  cpSync(join(RAIZ_REPO, 'mentor.mjs'), join(dentro, 'mentor.mjs'))
  cpSync(join(RAIZ_REPO, 'package.json'), join(dentro, 'package.json'))
  const alvo = join(c.pasta, 'projeto-novo')
  mkdirSync(alvo, { recursive: true })
  const deDentro = (...args: string[]) => {
    const r = spawnSync(process.execPath, [join(dentro, 'mentor.mjs'), ...args], { encoding: 'utf8', cwd: alvo })
    return { codigo: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() }
  }
  const outro = deDentro('doctor')
  confere(c, outro.codigo === 1, 'de dentro de node_modules, so instalar roda')
  dizQue(c, outro, 'so `instalar` roda daqui', 'e diz qual e o caminho, em vez de estourar')
  const deLa = deDentro('instalar', '--destino', alvo)
  dizQue(c, deLa, 'instalado em', 'instalar funciona de dentro de node_modules, que e como o npm entrega')
  confere(c, ler({ ...c, pasta: alvo }, '.mentor/nucleo.md').length > 0, 'o pacote chegou inteiro na raiz do projeto')
  // Este e o caminho que o usuario real percorre, e ja falhou aqui uma vez: os pontos de entrada
  // moravam num `.ts`, que de dentro de node_modules nao carrega. O `instalar` copiava o pacote e
  // nao criava entrada nenhuma, ou seja, instalava um pacote que nada carregava.
  dizQue(c, deLa, 'Ponto de entrada criado', 'de node_modules tambem cria os pontos de entrada')
  for (const arquivo of ['CLAUDE.md', 'AGENTS.md', 'GEMINI.md']) {
    confere(c, ler({ ...c, pasta: alvo }, arquivo).includes('.mentor/nucleo.md'),
      `${arquivo} criado pelo caminho de node_modules aponta para o nucleo`)
  }
  const semAviso = spawnSync(process.execPath, [join(alvo, 'mentor.mjs'), 'init'], { encoding: 'utf8', cwd: alvo })
  confere(c, !`${semAviso.stdout}${semAviso.stderr}`.includes('MODULE_TYPELESS'),
    'sem aviso de tipo de modulo: `.mentor/package.json` resolve sem mexer no package.json do projeto')

  fecharTemporario(c)
  return c
}
