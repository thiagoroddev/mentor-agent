# Problema, descoberta e decisões do épico

## Pedido e problema real

O mantenedor quer uma divisão pré-pronta para trabalhar com vários agentes ao mesmo tempo. Cada agente assume uma tarefa de ponta a ponta; a frente pode mudar na atribuição seguinte. O planejamento precisa sobreviver ao chat e permitir que outro modelo retome a execução.

O problema de engenharia é a coordenação de trabalho concorrente sobre um repositório compartilhado: isolamento de estado mutável, atribuição de trabalho, contratos entre mudanças e serialização da integração. Git worktrees isolam arquivos rastreados, HEAD e índice; a correção semântica do conjunto depende de contratos e evidências.

Resultados observáveis: tarefas diferentes podem avançar simultaneamente; trocar de modelo preserva o trabalho; finalizar uma tarefa mantém os registros da outra; um diagnóstico identifica situações ambíguas; integrar nunca transforma conflito ou falha de resolução em sucesso silencioso.

## Descoberta em 04/10/2026

Referência de código: commit `2938935a08bcf5c8a7ed05645079106ee96a925e`, versão declarada `0.14.0`. As observações abaixo resultam de leitura de código e documentação; não constituem execução dos cenários neste planejamento.

| Capacidade ou lacuna | Evidência local | Consequência |
|---|---|---|
| Uma tarefa por ramo e isolamento por worktree já são orientados | `.mentor/processos/entrega.md` | Reusar essas regras e explicar slots reutilizáveis |
| `task iniciar` verifica as tarefas lidas da árvore local | `.mentor/scripts/cmd-tarefa.ts` | O limite de execução continua local; não somar worktrees e bloquear por esse total |
| `doctor` lista caminho e branch das worktrees | `.mentor/scripts/cmd-doctor.ts` | Acrescentar tarefas ativas por árvore e advertências, sem prometer conhecimento global |
| IDs consideram registros locais e histórico/refs Git | `.mentor/scripts/ids.ts` | Ajuda após commits/sincronização; duas criações ainda não commitadas podem concorrer pelo mesmo número |
| `fatiar` permite fatias sem dependência e ordem explícita | `.mentor/scripts/cmd-fila.ts` | Reusar o grafo existente; a ajuda em `cli.ts` ainda diz “encadeadas” e precisa alinhamento |
| Resolvedor funde contexto, requisitos, dívidas, riscos e recusas e regenera vistas | `.mentor/scripts/cmd-resolver.ts` | Preservar as políticas existentes; documentar cobertura real |
| Falhas em contexto/dívidas/riscos podem apenas emitir aviso; status de `git add` não é conferido | `.mentor/scripts/cmd-resolver.ts` | Corrigir retorno e impedir stage de arquivo cujo tratamento falhou |
| Catálogo `planos.json`, narrativas e código não têm resolução genérica nesse comando | `.mentor/scripts/cmd-resolver.ts` | Resolver conscientemente fontes fora da cobertura; nunca aceitar tudo por `ours` |
| Push acumulado do épico é descrito como regra geral | `.mentor/processos/entrega.md` | Distinguir lote sequencial de branches independentes com entregas próprias |
| Gates locais e suíte ampla já estão separados | `.mentor/processos/teste.md`, `testes/executar.ts` | Preservar a pirâmide e os gates exigidos; comprovar a árvore integrada |
| Suíte “unidade” também inclui testes com Git/subprocessos | `testes/cenarios/31-testes-de-unidade.ts` | Não prometer duração fixa nem classificar todo teste de Git como inviável no ciclo local |

O contexto tem `limites.em_execucao: 1`, tipos via `npx tsc --noEmit` e testes via `node testes/executar.ts --unidade`. Estratégia de ramos e revisão antes do merge estão sem decisão no contexto. Não preencher esses valores por dedução ao salvar este plano.

Não foi encontrada pasta de ADRs nem habilidade gerada de consistência neste repositório. As decisões deste estudo são propostas de planejamento; não recebem IDs fictícios de ADR. Na execução, consultar novamente a pasta de ADRs resolvida. Se a decisão exigir registro arquitetural formal conforme o rigor vigente, produzi-lo na fatia responsável.

## Alternativas profissionais e custo de oportunidade

| Alternativa | O que resolve | Custo e limite | Decisão |
|---|---|---|---|
| Worktree criada por tarefa | Isolamento explícito e descarte fácil | Dependências e configuração podem exigir preparo repetido | Suportada; boa para tarefas ocasionais e ambientes gerenciados |
| Slots de worktree reutilizados | Preserva diretório, instalações e IDE aberta | Exige reciclagem consciente e reinstalação quando lockfile/runtime mudam | Exemplo operacional principal para uso simultâneo frequente |
| Clone independente por agente | Separa Git comum e configuração | Mais disco, refs divergentes e sincronização entre clones | Alternativa quando há necessidade real de isolamento maior |

Git já resolve a separação física. O Mentor já resolve tarefas, evidências e parte dos metadados. Criar uma fila distribuída, scheduler, serviço de reserva de IDs ou diretório de perfis permanentes de modelos adicionaria outro sistema de estado e recuperação. O benefício deste épico vem de usar o que existe, serializar o cadastro inicial e tornar conflitos e ambiguidades visíveis.

Um contrato estável permite paralelismo: uma interface e uma API podem ser implementadas ao mesmo tempo quando ambas conhecem payloads, erros e comportamento esperado. Se uma decisão de contrato ainda está aberta, a tarefa que a resolve precede as dependentes. Caminhos diferentes no `plano.muda` ajudam, mas não comprovam independência lógica.

## Decisões propostas

1. Nomear capacidade como `slot-a`, `slot-b`, `slot-c`; permitir qualquer número de slots conforme recursos. Nenhum nome de fornecedor/modelo define ownership permanente.
2. Atribuir tarefa, branch e recursos a uma sessão por vez. A sessão pode ser transferida quando houver handoff explícito; uma segunda sessão não continua escrevendo durante a transferência.
3. Manter branches únicas por tarefa. A branch principal tem um único local de checkout; as outras árvores partem de uma referência atualizada sem tentar assumir o mesmo checkout.
4. Cadastrar o lote e seus IDs numa operação sequencial antes de distribuir. Fetch melhora a informação disponível, mas não oferece exclusão mútua para criações simultâneas ainda invisíveis ao Git.
5. Trabalhar em paralelo e integrar um candidato por vez sobre a base mais recente. A primeira tarefa pronta só tem prioridade se suas dependências e validações permitem entrega.
6. Recomendar PRs para integração de equipes paralelas. Respeitar a política já escolhida por cada projeto; quando integração local for permitida, um responsável temporário faz a integração numa árvore própria.
7. Consultar worktrees como fotografia local. O `doctor` não altera outra árvore, não executa fetch, não reserva tarefas e não impõe limite global.
8. Tratar retorno zero do resolvedor como prova de conclusão mecânica da resolução, sem conflito restante no índice. Validação de comportamento ainda pertence aos gates e à revisão.
9. Revalidar quando código/configuração relevante ou contrato muda. Evidência de uma branch não comprova automaticamente o estado combinado com outra.

## Avaliação e limites

Planejamento: carga humana M, IA G; complexidade alta, dimensão dominante acoplamento. Perfil recomendado geral de maior capacidade ou avançado, effort alto. Execução total: carga G, dividida em cinco tarefas; B e C concentram raciocínio e validação de concorrência. A avaliação por fatia está nos contratos e usa capacidade/effort, sem associar capacidades a marcas de modelos.

Riscos principais: informações de árvores irmãs podem estar incompletas ou mudar durante a leitura; fontes administrativas podem conflitar; testes podem modificar fixtures rastreadas; hooks compartilhados podem afetar todas as worktrees; conflito de contrato pode existir sem conflito textual. O protocolo e a matriz de aceite tratam cada risco.

## Referências

O manual de [Git worktree](https://git-scm.com/docs/git-worktree) documenta múltiplas árvores, branches já em checkout e refs compartilhadas. O manual de [Git merge](https://git-scm.com/docs/git-merge) documenta o índice de conflito e a conclusão do merge. Essas fontes sustentam o isolamento e a integração Git; as políticas do Mentor são derivadas do código local e das decisões deste estudo.
