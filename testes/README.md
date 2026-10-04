# Testes

Cada cenario constroi um **mini-projeto de verdade** em `exemplos/`, roda os comandos reais pela
linha de comando e confere a saida. Nao ha' mock: o que roda aqui e' o mesmo `mentor.mjs` que roda
num projeto.

```bash
npm run verify     # regenera o manifesto, confere tipos, roda os cenarios
```

⚠️ **O manifesto entra antes dos testes de proposito.** Ele guarda o hash de cada arquivo de
`.mentor/`, e o `verificar` compara: num projeto instalado isso detecta divergencia silenciosa, mas
aqui, onde o pacote e' editado o tempo todo, ele precisa ser regenerado a cada rodada.

## Por que os projetos gerados ficam versionados

`exemplos/*/docs-mentor/` e' resultado, e esta' no repositorio de proposito. Serve para duas coisas:

1. **Ler.** Abrir `exemplos/02-epico-fatiado/docs-mentor/tarefas/backlog.md` mostra como o pacote se
   comporta, sem precisar rodar nada.
2. **Ver o que mudou.** Uma alteracao no gerador aparece como diff nos exemplos. Se o diff nao era
   esperado, o defeito apareceu antes de chegar num projeto real.

Para isso funcionar, `MENTOR_AGORA` congela o relogio em `2026-08-29T14:00:00`: sem isso, cada
rodada mudaria toda data e o diff viraria ruido.

## Como o mini-projeto sabe que e' um projeto

`MENTOR_RAIZ` aponta a raiz do projeto; o pacote se resolve pelo proprio arquivo
(`import.meta.url`). Por isso um projeto pode viver dentro do repositorio do pacote sem confundir
os dois.

## Os cenarios

| Cenario | O que prova |
| :-- | :-- |
| `01-ciclo-basico` | o caminho feliz inteiro, ate' o requisito vinculado pelo script |
| `02-epico-fatiado` | XG nao se executa, se divide; `fatia N/M` e' calculado e muda sozinho |
| `03-recusas` | **o que o pacote recusa.** Cada linha aqui e' uma classe de erro que a IA nao consegue mais cometer |
| `31-testes-de-unidade` | suites unitarias describe/it (regressoes, ADRs, worktrees, resolvedor semantico) |
| `32-carregamento-nas-ferramentas` | carregamento de AGENTS.md, CLAUDE.md, GEMINI.md e copias de skills |
| `33-trabalho-paralelo` | trabalho simultaneo em linked worktrees (slots), diagnostico no doctor e fusao 3-way |

O `03` e' o mais importante. Um cenario que so' testa o caminho feliz nao prova nada sobre um
pacote cujo proposito e' recusar.

## Modos de Execução

- **Nível 1 (Rápido / Unidades):** `node testes/executar.ts --unidade` (ou `--rapido`). Executa somente as suítes unitárias puras em segundos, sem levantar 30+ árvores de teste do Git.
- **Nível 2 (Bateria Completa / E2E):** `node testes/executar.ts` ou `npm test`. Executa todos os cenários consolidados sequencialmente.

## Ao acrescentar um cenario

Um arquivo em `cenarios/`, exportando `rodar(): Cenario`, e uma linha em `executar.ts`.
Sem biblioteca de teste: `apoio.ts` tem as quatro funcoes que os cenarios usam. Cenários que exercitam Git multi-árvore e worktrees usam diretórios temporários (`abrirCenarioTemporario`), limpeza no `finally` e não afetam branches de trabalho do mantenedor.

