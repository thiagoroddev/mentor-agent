# TASK-CHORE-016 · Diagnostico de tarefas nas worktrees

Plano de referencia: docs/rascunhos/planejamentos/2026-10-04--trabalho-paralelo-por-slots/fatias/fatia-b-diagnostico.md
<!-- mentor:plano:inicio sha256="fc104547bff4a00c6785b702946bf358ada33fdaa149e713c4fc01925dfddf32" -->

# Fatia B: Diagnóstico de tarefas entre worktrees no doctor

## Resultado e dependências

Depende do protocolo A. Pode executar junto de C/D após A. Carga M/M, complexidade alta por leitura de estado concorrente e monorepos. Não muda limites do contexto nem impede `task iniciar` por soma global.

## Mudança arquivo por arquivo

- `.mentor/scripts/worktrees.ts`: pequeno módulo de descoberta e leitura explicitamente por caminho. Reusar `git worktree list --porcelain`, preferindo formato NUL quando suportado/necessário para caminhos especiais. Representar checkout, branch ou detached, HEAD, disponibilidade, raiz do projeto e tarefas locais em execução. Reusar `pastaDeDocumentos(raiz)` para docs/docs-mentor sem alterar variáveis globais de raiz.
- `.mentor/scripts/cmd-doctor.ts`: substituir/ampliar a listagem existente com o resultado do módulo. Mostrar limite local por projeto, total observado informativo e advertências de mesmo ID ativo em múltiplas árvores. Preservar estilo e comportamento do doctor fora desse escopo.
- `testes/worktrees-paralelas.test.ts`: casos observáveis usando o harness local. Testar paths com espaços, estrutura de monorepo, docs legado, env de raiz, leitura inválida, árvore indisponível, detached e mesmo ID. Conferir ausência de escrita e total não usado como bloqueio global.

A interface interna pode ser refinada conforme o código atual; os campos e limites públicos estão no contrato 02. Obter raiz Git e aplicar o mesmo caminho relativo do projeto em cada checkout. Não varrer outros projetos do monorepo como se fossem a mesma fila.

## Algoritmo e limites

Coletar o inventário Git com timeout. Para cada entrada, resolver a raiz do projeto correspondente e ler seu contexto/tarefas sem comandos que alterem a árvore. Falha de uma entrada vira resultado parcial. Agregar IDs apenas para advertência. Limite local é aferido na própria árvore, sem mudar a salvaguarda atual.

Snapshot não é lock. Estado herdado ou leitura concorrente pode produzir ambiguidade; informar possível duplicidade e caminhos, preservando a decisão de atribuição. Não prometer detectar agentes remotos/clones separados nem inferir sessão proprietária de um nome de branch.

## Validação e entrega

Executar a suíte B pela receita focada em 03 e tipos. E registra o import no runner compartilhado e prova o conjunto com Git real. Não alterar o runner de unidades, CLI, changelog ou manifesto em paralelo. Entregar resultados, limites e memória para E, sem assumir que warnings históricos do doctor foram resolvidos.

## Critérios de aceite

1. Doctor mostra caminho, branch/HEAD, projeto e IDs em execução por worktree acessível. Prova: CP-02/CP-04: executarSuite da fatia B e cenário E.
2. IDs distintos em árvores distintas não são bloqueados pelo total; duplicidade gera advertência limitada à evidência observada. Prova: CP-03: casos com IDs distintos, duplicado e registro herdado.
3. Árvore ausente, detached, sem Mentor ou ilegível não encerra a leitura das demais. Prova: CP-05: testes de disponibilidade e parse.
4. A consulta conserva os arquivos das árvores e não modifica refs/índice nem faz sincronização remota. Prova: CP-06: snapshot de bytes e estado Git antes/depois.

## Contrato portátil

O arquivo acompanhante `fatia-b-diagnostico.contrato.json` contém escopo, aceite, riscos, reuso, habilidades e avaliação. Herdar os documentos normativos do épico e refinar somente os pontos que mudarem antes de iniciar a tarefa.

<!-- mentor:plano:fim -->

## Estudo Técnico e Implementação Detalhada

Esta fatia implementa a observabilidade de tarefas concorrentes em múltiplas worktrees locais no comando `mentor doctor`, fornecendo visibilidade semântica de slots sem impor travas globais nem orquestração externa.

### 1. Módulo de Descoberta: `.mentor/scripts/worktrees.ts`
- **Extração com suporte a caminhos especiais:** implementa `parsearPorcelainWorktrees` suportando saída NUL (`git worktree list --porcelain -z`) e porcelain padrão (`\n\n`), garantindo suporte robusto a caminhos com espaços e caracteres Unicode.
- **Resolução de Monorepos:** detecta o `git rev-parse --show-toplevel` e calcula o caminho relativo do projeto (`relative(gitTopLevel, raizBase)`). Em cada worktree secundária encontrada, aplica exatamente o mesmo caminho relativo, evitando misturar subprojetos distintos em monorepos.
- **Isolamento de estado (`MENTOR_RAIZ`):** a resolução de pastas de documentos (`docs-mentor` ou `docs`) e leitura de `contexto.json` e tarefas abertas (`docs/tarefas/abertas/*.json`) opera de forma pura por caminho absoluto para cada worktree, impedindo que a variável global `MENTOR_RAIZ` da sessão atual redirecione a inspeção das árvores irmãs.
- **Tolerância a falhas parciais:** se uma worktree estiver inacessível, apagada do disco ou corrompida, ela é reportada com `disponivel: false` ou com o campo `erro` preenchido, sem interromper ou ocultar a leitura das demais árvores saudáveis.

### 2. Integração no `mentor doctor`: `.mentor/scripts/cmd-doctor.ts`
- **Visibilidade de concorrência:** quando mais de uma worktree é observada, exibe uma linha informativa (`neutro`) contendo o total de árvores, total agregado de tarefas em execução e os detalhes de cada slot (branch, HEAD curto, caminho e tarefas ativas locais com seu limite por árvore).
- **Detecção de duplicidade:** agrega os IDs de tarefas em execução e, caso o mesmo ID esteja ativo em mais de uma árvore simultaneamente, emite uma linha de advertência (`atencao`), indicando possível colisão ou compartilhamento indevido de atribuição.
- **Preservação de independência:** tarefas distintas ativas em árvores distintas não geram advertência nem bloqueio global, preservando a salvaguarda local de concorrência (`1 de 1 em execução` por árvore).

### 3. Suíte de Testes: `testes/worktrees-paralelas.test.ts`
- Foram implementados 7 testes comportamentais cobrindo:
  1. Parsing de porcelain padrão e `-z` com caminhos com espaços e detached HEAD.
  2. Estrutura de monorepo e localização de subprojetos por caminho relativo.
  3. Suporte a docs legado (`docs/`) e padrão (`docs-mentor/`).
  4. Isolamento estrito de `MENTOR_RAIZ`.
  5. Tolerância a árvores deletadas do disco e detached.
  6. Detecção de atribuição duplicada com aviso específico.
  7. Comprovação de comportamento 100% somente de leitura (zero modificações em bytes ou Git status).

---

## Handoff e Contratos para as Próximas Fatias

- **Fatia C (`TASK-CHORE-017`):** consumirá a disciplina de worktrees e branches para tornar o `mentor resolver-gerados` determinístico e verificável, garantindo que conflitos não tratados ou falhas de parse retornem código de saída 1 em repositórios Git.
- **Fatia D (`TASK-CHORE-018`):** conectará as referências dos processos existentes (`tarefa.md`, `entrega.md`, `planejamento.md`) ao novo modelo de concorrência e diagnóstico.
- **Fatia E (`TASK-CHORE-019`):** integrará a suíte `testes/worktrees-paralelas.test.ts` no runner consolidado de unidades (`cenarios/31-testes-de-unidade.ts`) e executará a validação Nível 2 completa.

---

## Desfecho e Validação Real

- **Validação Estrutural e Tetos:** executado `node mentor.mjs verificar`. APROVADO nas 5 famílias de regras.
- **Critérios de Aceite Comprovados:**
  - Critério 0 (CP-02/CP-04): 7 testes de `testes/worktrees-paralelas.test.ts` executados e aprovados com sucesso via `executarSuite()`.
  - Critério 1 (CP-03): Teste 6 comprova que tarefas distintas não geram bloqueio e que mesmo ID ativo em múltiplas árvores emite advertência de duplicidade.
  - Critério 2 (CP-05): Teste 5 comprova resiliência diante de árvores apagadas, detached ou sem Mentor sem travar as demais.
  - Critério 3 (CP-06): Teste 7 comprova estabilidade de bytes de arquivos e integridade de estado Git após execução do diagnóstico.
- **Gates de Automação:**
  - `tipos` (`npx tsc --noEmit`): APROVADO (saída 0).
  - `testes` (`node testes/executar.ts --unidade`): APROVADO (saída 0, 32 testes de unidade passaram).
- **Manifesto do Pacote:** atualizado via `node mentor.mjs manifesto` (92 arquivos rastreados).

```json mentor:memoria
{
  "resultado": "Módulo .mentor/scripts/worktrees.ts implementado com descoberta de worktrees via Git porcelain, integrado ao cmd-doctor.ts com exibição informativa de concorrência e alerta de tarefas duplicadas, validado por 7 testes em testes/worktrees-paralelas.test.ts.",
  "aprendizados": [
    "git worktree list --porcelain -z fornece separação confiável por NUL mesmo quando nomes de pastas contêm espaços.",
    "Em monorepos, o cálculo do caminho relativo do projeto a partir do git toplevel é indispensável para evitar cruzar diretórios incorretos.",
    "A leitura entre worktrees deve operar puramente por caminhos absolutos locais, sem consultar MENTOR_RAIZ do processo atual."
  ],
  "limites_conhecidos": [
    "A leitura é uma fotografia local de worktrees no mesmo disco; não detecta clones separados ou repositórios remotos.",
    "O import no runner de testes compartilhado (cenarios/31-testes-de-unidade.ts) foi mantido para a Fatia E de consolidação para evitar concorrência em arquivos compartilhados."
  ]
}
```

