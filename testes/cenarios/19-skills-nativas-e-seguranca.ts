import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { abrirCenario, confere, dizQue, ler, mentor, RAIZ_REPO } from '../apoio.ts'
import type { Cenario } from '../apoio.ts'

/**
 * Prova o catalogo de Skills Nativas de Apoio, a matriz de seguranca GitHub e a extensibilidade de skills no projeto (Passo 4).
 */
export function rodar(): Cenario {
  const c = abrirCenario('19-skills-nativas-e-seguranca')
  mentor(c, 'init')

  // 1. init cria docs-mentor/skills/ com LEIA-ME.md
  const leiaMeSkills = ler(c, 'docs-mentor/skills/LEIA-ME.md')
  confere(c, leiaMeSkills.includes('Skills do Projeto') || leiaMeSkills.includes('Habilidades do Projeto'),
    'init cria LEIA-ME.md na pasta de skills do projeto')

  const leiaGeral = ler(c, 'docs-mentor/LEIA.md')
  confere(c, leiaGeral.includes('skills/'), 'LEIA.md documenta a pasta skills/')

  // 2. Catalogo de 7 skills nativas do pacote
  const skillsEsperadas = [
    'github-ci',
    'contratos-de-api',
    'ui-design',
    'mermaid',
    'test-design',
    'data-modeling',
    'spike-e-investigacao',
  ]

  for (const skill of skillsEsperadas) {
    const caminhoSkill = join(RAIZ_REPO, '.mentor', 'skills', skill, 'SKILL.md')
    confere(c, existsSync(caminhoSkill), `skill nativa .mentor/skills/${skill}/SKILL.md existe`)
    const conteudo = readFileSync(caminhoSkill, 'utf8')
    confere(c, conteudo.startsWith('---') && conteudo.includes('name:') && conteudo.includes('description:'),
      `skill ${skill} contem frontmatter YAML valido (name e description)`)
  }

  // 3. Verificacao especifica da skill github-ci (Matriz completa de Seguranca GitHub)
  const githubCi = readFileSync(join(RAIZ_REPO, '.mentor', 'skills', 'github-ci', 'SKILL.md'), 'utf8')
  confere(c, githubCi.includes('Dependabot') && githubCi.includes('dependabot.yml'), 'github-ci instrui configuracao do Dependabot')
  confere(c, githubCi.includes('Dependency review') || githubCi.includes('dependency-review'), 'github-ci instrui Dependency Review em PRs')
  confere(c, githubCi.includes('SECURITY.md'), 'github-ci instrui politica de seguranca SECURITY.md')
  confere(c, githubCi.includes('Secret scanning') || githubCi.includes('Push protection'), 'github-ci instrui Secret Scanning e Push Protection')
  confere(c, githubCi.includes('CodeQL') || githubCi.includes('codeql'), 'github-ci instrui analise estatica CodeQL')
  confere(c, githubCi.includes('publico') && githubCi.includes('privado'), 'github-ci compara diferencas de repositorios publicos vs privados')

  // 4. Verificacao especifica de contratos-de-api (Design-First e Mocks para Front/Back paralelos)
  const contratosApi = readFileSync(join(RAIZ_REPO, '.mentor', 'skills', 'contratos-de-api', 'SKILL.md'), 'utf8')
  confere(c, contratosApi.includes('mock') || contratosApi.includes('Mock'), 'contratos-de-api instrui desenvolvimento com mocks')
  confere(c, contratosApi.includes('RFC 7807') || contratosApi.includes('Problem Details') || contratosApi.includes('padronizacao de erros'),
    'contratos-de-api padroniza estrutura de erros')

  // 5. Verificacao especifica de ui-design (Decomposição Figma e 4 estados de UI)
  const uiDesign = readFileSync(join(RAIZ_REPO, '.mentor', 'skills', 'ui-design', 'SKILL.md'), 'utf8')
  confere(c, uiDesign.includes('Figma') || uiDesign.includes('print'), 'ui-design orienta decomposicao a partir de print/Figma')
  confere(c, uiDesign.includes('Vazio') && uiDesign.includes('Carregando') && uiDesign.includes('Erro') && uiDesign.includes('Sucesso'),
    'ui-design exige os 4 estados obrigatorios de interface')

  // 6. nucleo.md referencia o carregamento de skills
  const nucleo = readFileSync(join(RAIZ_REPO, '.mentor', 'nucleo.md'), 'utf8')
  confere(c, nucleo.includes('.mentor/skills/'), 'nucleo.md inclui referencia para carregar skills')

  return c
}
