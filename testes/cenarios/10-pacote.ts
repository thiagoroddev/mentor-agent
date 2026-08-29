import { abrirCenarioTemporario, confere, dizQue, escrever, fecharTemporario, ler, lerJson, mentor } from '../apoio.ts'
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
  confere(c, ctx['_meta'].versao_do_pacote === '0.1.0',
    'a versao do pacote fica gravada no contexto: sem ela o relatorio nao atribui nada')

  confere(c, mentor(c, 'verificar').codigo === 0, 'pacote recem-instalado nao diverge de nada')

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

  fecharTemporario(c)
  return c
}
