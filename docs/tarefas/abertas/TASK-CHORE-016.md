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
