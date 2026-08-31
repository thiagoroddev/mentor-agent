import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
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
  escrever(c, 'docs/README.md', '# documentacao do aplicativo\n')
  mentor(c, 'init')

  confere(c, existsSync(join(c.pasta, 'docs-mentor', 'contexto.json')),
    'projeto novo cria a administracao em docs-mentor/')
  confere(c, !existsSync(join(c.pasta, 'docs', 'contexto.json')),
    'projeto novo nao coloniza docs/ com o contexto do mentor')
  confere(c, readFileSync(join(c.pasta, 'docs', 'README.md'), 'utf8').includes('documentacao do aplicativo'),
    'docs/ preexistente e alheio ao mentor fica intacto')

  const ctx = lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')
  confere(c, ctx['_meta'].versao_do_pacote === '0.2.0',
    'a versao do pacote fica gravada no contexto: sem ela o relatorio nao atribui nada')

  confere(c, mentor(c, 'verificar').codigo === 0, 'pacote recem-instalado nao diverge de nada')

  // --- o analisador do projeto encontra o pacote e reprova por estilo que nao e do projeto.
  //     Medido em campo: 1975 erros, nenhum em src/, e o ciclo travava no primeiro finalizar.
  escrever(c, 'eslint.config.js', 'export default [{ files: ["**/*.ts"] }]\n')
  const comLint = mentor(c, 'instalar', '--destino', c.pasta, '--forcar')
  dizQue(c, comLint, 'nao ignora .mentor/', 'o instalar avisa que o analisador vai varrer o pacote')
  dizQue(c, comLint, 'ignores: [".mentor"]', 'e da a linha pronta, em vez de descrever o problema')
  dizQue(c, mentor(c, 'doctor'), 'nao ignora .mentor/', 'o doctor cobra enquanto o ignore nao existir')
  escrever(c, 'eslint.config.js', 'export default [{ ignores: [".mentor"] }]\n')
  confere(c, !mentor(c, 'doctor').saida.includes('nao ignora .mentor/'),
    'mencionar .mentor na config encerra o aviso: quem escreveu ali ja decidiu')

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
  // Irmao do achado 10, e so reproduzivel rodando o mentor.mjs **copiado para o projeto**: ali
  // `origem` e a raiz do projeto, e o package.json de la e o do app do usuario.
  // ⚠️ A primeira versao deste teste usava `mentor()`, que roda sempre o mentor.mjs do repositorio,
  // entao origem nunca era o projeto e a asercao passava sem provar nada. Quinta asercao vazia.
  escrever(c, 'package.json', JSON.stringify({ name: 'app-do-usuario', version: '7.7.7' }, null, 2))
  const daCopia = spawnSync(process.execPath, [join(c.pasta, 'mentor.mjs'), 'instalar', '--destino', join(c.pasta, 'vizinho')], { encoding: 'utf8', cwd: c.pasta })
  const saidaDaCopia = `${daCopia.stdout ?? ''}${daCopia.stderr ?? ''}`
  confere(c, !saidaDaCopia.includes('7.7.7') && saidaDaCopia.includes('instalado em'),
    'a versao anunciada vem do manifesto, nunca do package.json do projeto que hospeda o pacote')
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
  escrever({ ...c, pasta: alvo }, 'eslint.config.js', 'export default [{ files: ["**/*.ts"] }]\n')
  dizQue(c, deDentro('instalar', '--destino', alvo, '--forcar'), 'nao ignora .mentor/',
    'o aviso de lint tambem sai pelo caminho de node_modules, que e como o npm entrega')
  for (const arquivo of ['CLAUDE.md', 'AGENTS.md', 'GEMINI.md']) {
    confere(c, ler({ ...c, pasta: alvo }, arquivo).includes('.mentor/nucleo.md'),
      `${arquivo} criado pelo caminho de node_modules aponta para o nucleo`)
  }
  const semAviso = spawnSync(process.execPath, [join(alvo, 'mentor.mjs'), 'init'], { encoding: 'utf8', cwd: alvo })
  confere(c, !`${semAviso.stdout}${semAviso.stderr}`.includes('MODULE_TYPELESS'),
    'sem aviso de tipo de modulo: `.mentor/package.json` resolve sem mexer no package.json do projeto')

  // --- atualizar 0.1.x exige consentimento explicito para renomear a pasta administrativa.
  //     `docs/` pode ser documentacao do aplicativo: a presenca isolada da pasta nunca autoriza move-la.
  const legado = join(c.pasta, 'projeto-legado')
  mkdirSync(join(legado, 'docs'), { recursive: true })
  escrever({ ...c, pasta: legado }, 'docs/contexto.json', '{"legado":true}\n')
  dizQue(c, mentor(c, 'instalar', '--destino', legado, '--forcar'), '--migrar-docs',
    'instalacao 0.1.x sem autorizacao explica como migrar')
  confere(c, existsSync(join(legado, 'docs', 'contexto.json')) && !existsSync(join(legado, 'docs-mentor')),
    'sem --migrar-docs, instalador nao move nenhum arquivo legado')
  const migrado = mentor(c, 'instalar', '--destino', legado, '--forcar', '--migrar-docs')
  confere(c, migrado.codigo === 0, 'com autorizacao explicita, instalacao 0.1.x migra')
  confere(c, !existsSync(join(legado, 'docs')) && existsSync(join(legado, 'docs-mentor', 'contexto.json')),
    'migracao autorizada renomeia docs/ para docs-mentor/ sem deixar duas fontes')

  const conflito = join(c.pasta, 'projeto-em-conflito')
  mkdirSync(join(conflito, 'docs'), { recursive: true })
  escrever({ ...c, pasta: conflito }, 'docs/contexto.json', '{"legado":true}\n')
  mkdirSync(join(conflito, 'docs-mentor'), { recursive: true })
  escrever({ ...c, pasta: conflito }, 'docs-mentor/sentinela.txt', 'nao mover\n')
  const recusado = mentor(c, 'instalar', '--destino', conflito, '--forcar', '--migrar-docs')
  confere(c, recusado.codigo === 1, 'conflito entre docs/ legado e docs-mentor/ e recusado')
  confere(c, existsSync(join(conflito, 'docs', 'contexto.json')) &&
    ler({ ...c, pasta: conflito }, 'docs-mentor/sentinela.txt').includes('nao mover'),
  'conflito nao move nem sobrescreve nenhuma das duas pastas')

  const legadoNpm = join(c.pasta, 'projeto-legado-via-node-modules')
  mkdirSync(join(legadoNpm, 'docs'), { recursive: true })
  escrever({ ...c, pasta: legadoNpm }, 'docs/contexto.json', '{"legado":true}\n')
  const recusadoPeloNpm = spawnSync(process.execPath, [
    join(dentro, 'mentor.mjs'), 'instalar', '--destino', legadoNpm,
  ], { encoding: 'utf8', cwd: legadoNpm })
  confere(c, recusadoPeloNpm.status === 1 &&
    `${recusadoPeloNpm.stdout}${recusadoPeloNpm.stderr}`.includes('--migrar-docs') &&
    existsSync(join(legadoNpm, 'docs', 'contexto.json')),
  'via node_modules, a migracao sem flag tambem e recusada e explicada sem mover dados')
  const migradoPeloNpm = spawnSync(process.execPath, [
    join(dentro, 'mentor.mjs'), 'instalar', '--destino', legadoNpm, '--migrar-docs',
  ], { encoding: 'utf8', cwd: legadoNpm })
  confere(c, migradoPeloNpm.status === 0 && existsSync(join(legadoNpm, 'docs-mentor', 'contexto.json')),
    'o caminho real de node_modules tambem reconhece --migrar-docs')

  // A versao gravada ACOMPANHA a atualizacao. Antes so o `init` escrevia esse campo, e o `init`
  // recusa rodar em projeto que ja existe: atualizar o pacote deixava o contexto dizendo a versao
  // antiga para sempre, e o relatorio de campo atribuia defeito a versao errada.
  // Por ultimo no cenario de proposito: o manifesto falso derruba a checagem de divergencia acima.
  escrever(c, '.mentor/manifesto.json', JSON.stringify({ versao: '9.9.9', gerado_em: 'x', arquivos: {} }, null, 2))
  mentor(c, 'gerar')
  confere(c, lerJson<Record<string, any>>(c, 'docs-mentor/contexto.json')['_meta'].versao_do_pacote === '9.9.9',
    'atualizar o pacote atualiza a versao gravada: o campo e gerado, nao lembrado')

  fecharTemporario(c)
  return c
}
