import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import {
  RAIZ_REPO, abrirCenarioTemporario, apagar, confere, dizQue, escrever, fecharTemporario, ler, mentor,
} from '../apoio.ts'
import type { Cenario } from '../apoio.ts'
import {
  AVISO_AGENTES, LIMITE_AGENTES, MARCA_FIM, MARCA_INICIO, REGISTRO_DE_SKILLS, blocoDoNucleo,
} from '../../.mentor/scripts/instalar.mjs'

/**
 * 0.14.0: Codex, Claude Code e Antigravity carregam o mesmo. O nucleo vai dentro do AGENTS.md, gerado;
 * as skills vao por copia para as pastas que cada ferramenta le. Projeto instalado de verdade, numa
 * pasta temporaria, porque o fim do cenario e' um clone: o que outra maquina recebe sem rodar nada.
 */
export function rodar(): Cenario {
  const c = abrirCenarioTemporario('32-carregamento')
  const sh = (...args: string[]) => {
    const r = spawnSync(args[0]!, args.slice(1), { cwd: c.pasta, encoding: 'utf8' })
    return { codigo: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}` }
  }
  const commit = (msg: string) => {
    sh('git', 'add', '-A')
    sh('git', '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', msg)
  }
  const existe = (rel: string) => existsSync(join(c.pasta, rel))
  const vezes = (texto: string, trecho: string) => texto.split(trecho).length - 1
  const skillsDoPacote = readdirSync(join(RAIZ_REPO, '.mentor', 'skills'))
    .filter((n) => existsSync(join(RAIZ_REPO, '.mentor', 'skills', n, 'SKILL.md')))
  const nucleo = readFileSync(join(RAIZ_REPO, '.mentor', 'nucleo.md'), 'utf8')
  sh('git', 'init', '-q')
  sh('git', 'branch', '-M', 'main')

  // --- 1. instalar: nucleo no AGENTS.md, CLAUDE.md so com @AGENTS.md, GEMINI.md so ponteiro, skills nos dois destinos
  mentor(c, 'instalar', '--destino', c.pasta)
  mentor(c, 'init')
  const agentes = ler(c, 'AGENTS.md')
  confere(c, agentes.includes(blocoDoNucleo(nucleo)), 'B1: o AGENTS.md novo traz o nucleo inteiro, entre marcadores')
  confere(c, !agentes.includes('carregamento: sempre'), 'B1: sem o cabecalho YAML do nucleo dentro do bloco')
  confere(c, Buffer.byteLength(agentes, 'utf8') < AVISO_AGENTES,
    `B1: o AGENTS.md novo cabe com folga no limite do Antigravity (${Buffer.byteLength(agentes, 'utf8')} bytes)`)
  const claude = ler(c, 'CLAUDE.md')
  confere(c, claude.includes('@AGENTS.md') && !claude.includes('@.mentor/nucleo.md'),
    'B2: o CLAUDE.md importa o AGENTS.md, e so ele: importar o nucleo tambem carregaria duas vezes')
  confere(c, ler(c, 'GEMINI.md').includes('AGENTS.md') && !/^@/m.test(ler(c, 'GEMINI.md')),
    'B2: o GEMINI.md aponta para o AGENTS.md, sem import (o Antigravity carrega os dois)')
  confere(c, skillsDoPacote.length === 9 && skillsDoPacote.includes('revisao') && skillsDoPacote.includes('planejamento'), 'B4: o catalogo do pacote tem 9 skills, com revisao e planejamento')
  for (const destino of ['.agents/skills', '.claude/skills']) {
    confere(c, skillsDoPacote.every((s) => existe(`${destino}/${s}/SKILL.md`)), `B3: as ${skillsDoPacote.length} skills foram copiadas para ${destino}`)
    confere(c, existe(`${destino}/${REGISTRO_DE_SKILLS}`), `B3: ${destino} guarda o registro das copias do mentor`)
  }
  dizQue(c, mentor(c, 'verificar'), 'APROVADO', 'instalado e inicializado, passa no verificar')
  dizQue(c, mentor(c, 'doctor'), 'pontos de entrada carregam o nucleo pelo AGENTS.md', 'o doctor confirma o carregamento')

  // --- 2. idempotente: gerar e reinstalar nao duplicam nada
  const antes = ler(c, 'AGENTS.md')
  mentor(c, 'gerar')
  mentor(c, 'gerar')
  confere(c, ler(c, 'AGENTS.md') === antes, 'B1: gerar duas vezes nao muda o AGENTS.md')
  mentor(c, 'instalar', '--destino', c.pasta, '--forcar')
  confere(c, ler(c, 'AGENTS.md') === antes && vezes(ler(c, 'AGENTS.md'), MARCA_INICIO) === 1, 'B1: reinstalar nao duplica o bloco')

  // --- 3. bloco editado a mao reprova; o gerar devolve o nucleo
  escrever(c, 'AGENTS.md', antes.replace('Termina, apresenta, aguarda', 'Termina e segue'))
  dizQue(c, mentor(c, 'verificar'), 'o nucleo dentro do bloco e diferente', 'B1: bloco editado a mao reprova o verificar')
  mentor(c, 'gerar')
  confere(c, ler(c, 'AGENTS.md') === antes, 'B1: o gerar devolve o bloco ao nucleo, sem tocar no resto do arquivo')

  // --- 4. marcador invalido: recusa sem alterar
  const duplicado = `${MARCA_INICIO}\n${antes}`
  escrever(c, 'AGENTS.md', duplicado)
  confere(c, mentor(c, 'gerar').codigo === 1 && ler(c, 'AGENTS.md') === duplicado, 'B1: marcador duplicado faz o gerar recusar sem alterar')
  dizQue(c, mentor(c, 'verificar'), 'marcadores do nucleo invalidos', 'B1: e o verificar reprova')
  const semFim = antes.replace(MARCA_FIM, '')
  escrever(c, 'AGENTS.md', semFim)
  confere(c, mentor(c, 'gerar').codigo === 1 && ler(c, 'AGENTS.md') === semFim, 'B1: marcador incompleto tambem recusa sem alterar')
  escrever(c, 'AGENTS.md', antes)

  // --- 5. limite de bytes do Antigravity
  const preencher = (bytes: number) => `${antes}\n${'x'.repeat(Math.max(0, bytes - Buffer.byteLength(antes, 'utf8') - 2))}\n`
  escrever(c, 'AGENTS.md', preencher(LIMITE_AGENTES + 200))
  dizQue(c, mentor(c, 'verificar'), 'o Antigravity trunca o arquivo', 'B1: AGENTS.md acima de 24.000 bytes reprova')
  escrever(c, 'AGENTS.md', preencher(AVISO_AGENTES + 200))
  const perto = mentor(c, 'verificar')
  confere(c, perto.codigo === 0 && perto.saida.includes('perto do limite'), 'B1: entre 21.600 e 24.000 bytes o verificar so avisa')
  escrever(c, 'AGENTS.md', antes)

  // --- 6. entrada migrar: instalacao antiga vai ao modelo novo sem perder linha do projeto
  escrever(c, 'CLAUDE.md', '# Meu projeto\n\nLinha minha, que fica.\n\n@.mentor/nucleo.md\n')
  escrever(c, 'GEMINI.md', '# Gemini\n\nAntes de qualquer outra coisa, leia `.mentor/nucleo.md`.\n\nRegra minha do Gemini.\n')
  escrever(c, 'AGENTS.md', '# Instrucoes do agente\n\nAntes de qualquer outra coisa, leia `.mentor/nucleo.md`.\n\nRegra minha do AGENTS.\n')
  dizQue(c, mentor(c, 'doctor'), 'CLAUDE.md importa o nucleo, mas nao o AGENTS.md', 'B2: o doctor aponta a instalacao antiga')
  const migrou = mentor(c, 'entrada', 'migrar')
  const novoClaude = ler(c, 'CLAUDE.md')
  confere(c, novoClaude.includes('@AGENTS.md') && !novoClaude.includes('@.mentor/nucleo.md') && novoClaude.includes('Linha minha, que fica.'),
    'B2: migrar poe @AGENTS.md, tira o import do nucleo e preserva o resto do CLAUDE.md')
  confere(c, ler(c, 'GEMINI.md').includes('AGENTS.md') && ler(c, 'GEMINI.md').includes('Regra minha do Gemini.'),
    'B2: migrar aponta o GEMINI.md para o AGENTS.md e preserva o resto')
  confere(c, ler(c, 'AGENTS.md').startsWith(MARCA_INICIO) && ler(c, 'AGENTS.md').includes('Regra minha do AGENTS.'),
    'B2: migrar insere o nucleo no topo do AGENTS.md e preserva o resto')
  dizQue(c, migrou, 'trecho(s) do modelo antigo', 'B2: aponta as linhas antigas que o nucleo ja cobre, sem apagar')
  const retrato = () => ['CLAUDE.md', 'GEMINI.md', 'AGENTS.md'].map((f) => ler(c, f)).join('\0')
  const depoisDeMigrar = retrato()
  mentor(c, 'entrada', 'migrar')
  confere(c, retrato() === depoisDeMigrar, 'B2: migrar de novo nao muda nada')

  // --- 7. mesmo nome no pacote e no projeto: recusa, sem escolher
  escrever(c, 'docs-mentor/skills/mermaid/SKILL.md', '---\nname: mermaid\ndescription: versao do projeto\n---\n')
  const conflito = mentor(c, 'gerar')
  confere(c, conflito.codigo === 1 && conflito.saida.includes('existe no pacote e no projeto'), 'B3: mesmo nome no pacote e no projeto recusa, sem escolher')
  dizQue(c, mentor(c, 'verificar'), 'existe no pacote e no projeto', 'B3: e o verificar reprova o conflito')
  apagar(c, 'docs-mentor/skills/mermaid')

  // --- 8. pasta que o mentor nao criou nunca e' sobrescrita
  escrever(c, '.agents/skills/alheia/SKILL.md', 'conteudo de outra ferramenta\n')
  escrever(c, 'docs-mentor/skills/alheia/SKILL.md', '---\nname: alheia\ndescription: skill do projeto\n---\n')
  const alheia = mentor(c, 'gerar')
  confere(c, ler(c, '.agents/skills/alheia/SKILL.md') === 'conteudo de outra ferramenta\n', 'B3: pasta que o mentor nao criou nunca e sobrescrita')
  confere(c, existe('.claude/skills/alheia/SKILL.md') && alheia.codigo === 1, 'B3: o outro destino recebe a copia, e o comando sai com recusa')
  dizQue(c, mentor(c, 'verificar'), 'pasta que o mentor nao criou', 'B3: o verificar nomeia o conflito')
  apagar(c, '.agents/skills/alheia')
  mentor(c, 'gerar')
  confere(c, ler(c, '.agents/skills/alheia/SKILL.md').includes('skill do projeto'), 'B3: sem a pasta alheia, a copia da skill do projeto nasce')

  // --- 9. copia editada: preservada, apontada, e refeita so' quando apagada
  const copia = '.claude/skills/revisao/SKILL.md'
  escrever(c, copia, `${ler(c, copia)}\nEdicao local.\n`)
  const editada = mentor(c, 'gerar')
  confere(c, ler(c, copia).includes('Edicao local.'), 'B3: copia editada e preservada pelo gerar')
  dizQue(c, editada, 'foi editada depois de gerada', 'B3: e o gerar avisa')
  dizQue(c, mentor(c, 'verificar'), 'copia editada depois de gerada', 'B3: o verificar reprova a copia editada e aponta a fonte')
  apagar(c, '.claude/skills/revisao')
  mentor(c, 'gerar')
  confere(c, !ler(c, copia).includes('Edicao local.'), 'B3: apagada a copia, o gerar a refaz a partir da fonte')
  // O hash cobre todos os arquivos da pasta, nao so' o SKILL.md: arquivo de apoio acrescentado e' edicao.
  escrever(c, '.claude/skills/revisao/apoio.md', 'arquivo de apoio acrescentado na copia\n')
  dizQue(c, mentor(c, 'verificar'), 'copia editada depois de gerada', 'B3: arquivo de apoio acrescentado na copia conta como edicao')
  apagar(c, '.claude/skills/revisao')
  mentor(c, 'gerar')
  // Outra maquina com core.autocrlf troca \n por \r\n no checkout: a copia nao pode virar "editada" por isso.
  const crlf = '.agents/skills/mermaid/SKILL.md'
  escrever(c, crlf, ler(c, crlf).replace(/\r?\n/g, '\r\n'))
  dizQue(c, mentor(c, 'verificar'), 'APROVADO', 'B3: copia com fim de linha \\r\\n continua igual a fonte')

  // --- 10. registro corrompido nao autoriza nada
  const registro = join(c.pasta, '.agents/skills', REGISTRO_DE_SKILLS)
  writeFileSync(registro, '{ quebrado')
  apagar(c, '.agents/skills/mermaid')
  const corrompido = mentor(c, 'gerar')
  confere(c, !existe('.agents/skills/mermaid') && readFileSync(registro, 'utf8') === '{ quebrado' && corrompido.codigo === 1,
    'B3: registro corrompido nao autoriza copiar, remover nem reescrever o registro')
  dizQue(c, mentor(c, 'verificar'), 'registro corrompido', 'B3: o verificar reprova o registro corrompido')
  apagar(c, '.agents/skills')
  mentor(c, 'gerar')
  confere(c, existe('.agents/skills/mermaid/SKILL.md') && existe(`.agents/skills/${REGISTRO_DE_SKILLS}`),
    'B3: sem registro e sem copias, o gerar recria a pasta inteira')

  // --- 11. fonte removida: copia intacta sai, copia editada fica
  apagar(c, 'docs-mentor/skills/alheia')
  mentor(c, 'gerar')
  confere(c, !existe('.agents/skills/alheia') && !existe('.claude/skills/alheia'), 'B3: fonte que saiu leva junto a copia intacta')
  escrever(c, 'docs-mentor/skills/temporaria/SKILL.md', '---\nname: temporaria\ndescription: t\n---\n')
  mentor(c, 'gerar')
  escrever(c, '.claude/skills/temporaria/SKILL.md', 'editada\n')
  apagar(c, 'docs-mentor/skills/temporaria')
  const orfa = mentor(c, 'gerar')
  confere(c, existe('.claude/skills/temporaria') && !existe('.agents/skills/temporaria'), 'B3: sem fonte, a copia editada fica e a intacta sai')
  dizQue(c, orfa, 'a fonte saiu e a copia foi editada', 'B3: e o gerar avisa da copia editada')
  apagar(c, '.claude/skills/temporaria')
  mentor(c, 'gerar')

  // --- 12. outra maquina: clone sem gerar e sem script de instalacao
  dizQue(c, mentor(c, 'verificar'), 'APROVADO', 'antes do clone, o projeto esta integro')
  commit('projeto com o mentor 0.14')
  const clone = `${c.pasta}-clone`
  spawnSync('git', ['-c', 'core.longpaths=true', 'clone', '-q', c.pasta, clone], { encoding: 'utf8' })
  const doClone = { ...c, pasta: clone }
  for (const destino of ['.agents/skills', '.claude/skills']) {
    confere(c, skillsDoPacote.every((s) => existsSync(join(clone, destino, s, 'SKILL.md'))), `clone: as ${skillsDoPacote.length} skills chegaram em ${destino} sem gerar`)
  }
  confere(c, ler(doClone, 'AGENTS.md').includes(blocoDoNucleo(nucleo)), 'clone: o nucleo chegou dentro do AGENTS.md')
  dizQue(c, mentor(doClone, 'verificar'), 'APROVADO', 'clone: o verificar aprova sem gerar nem script de instalacao')

  rmSync(clone, { recursive: true, force: true })
  fecharTemporario(c)
  return c
}
