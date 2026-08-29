import { abrirCenario, apagar, confere, dizQue, escrever, mentor } from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/**
 * Prova que o `verificar` **reprova**. Um verificador so' testado no caso verde nao prova nada:
 * ele passaria igual estando quebrado.
 */
export function rodar(): Cenario {
  const c = abrirCenario('05-verificacao')
  mentor(c, 'init')
  confere(c, mentor(c, 'verificar').codigo === 0, 'projeto recem-criado passa')

  // --- link que nao resolve
  escrever(c, 'docs/arquitetura/ADR/ADR-001.md',
    '# ADR-001\n\nVer [a analise](./analise-que-nao-existe.md) para o contexto.\n')
  const quebrado = mentor(c, 'verificar')
  confere(c, quebrado.codigo === 1, 'link que nao resolve reprova')
  dizQue(c, quebrado, 'nao resolve', 'a mensagem diz que o link nao resolve')

  // --- link dentro de bloco de codigo nao conta
  escrever(c, 'docs/arquitetura/ADR/ADR-001.md',
    '# ADR-001\n\nExemplo:\n\n```md\n[isto e exemplo](./tambem-nao-existe.md)\n```\n\n' +
    'E um `[inline](./nem-este.md)` tambem nao.\n')
  confere(c, mentor(c, 'verificar').codigo === 0, 'link dentro de bloco de codigo e ignorado')

  // --- grafia diferente da do arquivo
  escrever(c, 'docs/arquitetura/ADR/ADR-002.md', '# ADR-002\n')
  escrever(c, 'docs/arquitetura/ADR/ADR-001.md', '# ADR-001\n\nVer [a outra](./adr-002.md).\n')
  const caixa = mentor(c, 'verificar')
  confere(c, caixa.codigo === 1, 'link com a grafia errada reprova, mesmo no Windows')
  dizQue(c, caixa, 'adr-002.md', 'a mensagem nomeia o link errado')

  // --- extensao dupla
  escrever(c, 'docs/arquitetura/ADR/ADR-001.md', '# ADR-001\n\nVer [a outra](./ADR-002.md).\n')
  escrever(c, 'docs/arquitetura/ADR/ADR-003.md.md', '# vazio\n')
  const dupla = mentor(c, 'verificar')
  confere(c, dupla.codigo === 1, 'extensao dupla .md.md reprova')
  dizQue(c, dupla, 'extensao dupla', 'a mensagem nomeia a extensao dupla')

  // --- inventario de regras: o espelho tem que bater com o guia nos dois sentidos
  //     (nao mexo no arquivo real; so' confiro que o comando de comparacao existe e responde)
  confere(c, mentor(c, 'regras').codigo === 0, 'o relatorio de regras responde')

  // Deixa o exemplo num estado que passa: o valor de um exemplo versionado e' mostrar o normal,
  // e as falhas ja' foram provadas acima.
  apagar(c, 'docs/arquitetura/ADR/ADR-003.md.md')
  confere(c, mentor(c, 'verificar').codigo === 0, 'com os defeitos removidos, volta a passar')
  return c
}
