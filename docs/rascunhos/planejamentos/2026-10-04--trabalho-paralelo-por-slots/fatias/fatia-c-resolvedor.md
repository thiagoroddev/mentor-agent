# Fatia C: Resolvedor de gerados com falhas verificáveis

## Resultado e dependências

Depende de A; pode avançar junto de B/D. Carga M/M e complexidade alta pela integridade do índice e efeitos de erro. O trabalho torna o retorno do comando confiável; políticas semânticas existentes continuam vigentes.

## Mudança arquivo por arquivo

- `.mentor/scripts/cmd-resolver.ts`: acompanhar quais fontes foram tratadas com sucesso, quais falharam e quais vistas podem ser regeneradas. Conferir parse/fusão/escrita e o status de `git add`. Consultar o índice com timeout, listar entradas não resolvidas e retornar 1 enquanto persistirem. Mostrar conclusão bem-sucedida apenas quando as condições públicas do documento 02 forem cumpridas.
- `testes/resolvedor-paralelo.test.ts`: casos com fontes tratadas válidas, JSON inválido, falha controlada de stage/escrita e conflito externo à cobertura. Usar o harness atual, reusando casos existentes quando já comprovam a política de fusão.

Inspecionar o índice com caminhos corretos em worktree e subpasta. `.git` pode ser um arquivo; não tratar uma linked worktree como projeto sem Git. Ambiente não Git permite regeneração somente quando não há conflito textual a resolver; informar ausência de índice. Marcadores de conflito sem base confiável não recebem declaração de merge completo.

## Sequência e invariantes

Descobrir fontes em conflito; ler versões base/ours/theirs; preparar fusões e validar antes de marcar fontes como resolvidas. Se fonte falhar, conservar evidência e retornar erro, sem incluí-la na lista automática de stage. Se fontes necessárias às vistas não estiverem consistentes, não anunciar regeneração válida dessas vistas.

As fontes já resolvidas podem permanecer como progresso parcial: não se exige transação de todo o filesystem ou rollback automático do Git. Em erro, explicitar o que foi aplicado e o que falta. O índice final define o sucesso mecânico. Conflito de produção não é escolhido por `ours/theirs`, nem é substituído por gerados.

Não acrescentar fusão genérica de planos, referências, invariantes, narrativas ou qualquer JSON. Não introduzir locks distribuídos nem alterar adjudicação de valores humanos conflitantes sob pretexto de melhorar retorno.

## Validação e entrega

CP-07 a CP-10 são as provas principais; CP-12 reusa o fingerprint vigente. Criar conflito real quando a asserção exige estágios Git, em pasta temporária e com timeout. A receita focada está no documento 03. E centraliza import no runner e integra o cenário comum. Deixar notas sobre mudança de código de saída para D/E e conservar logs relevantes, sem anunciar execução da suíte inteira pelo subset.

## Critérios de aceite

1. Falha de parse/fusão/gravação de fonte tratada retorna 1 e não adiciona essa fonte ao stage como resolvida. Prova: CP-08: falhas em contexto, requisitos, dívidas e riscos com índice real.
2. Stage malsucedido ou conflito restante retorna 1 com caminhos acionáveis. Prova: CP-09/CP-10: conflito fora da cobertura e falha controlada de git add.
3. Merge válido preserva políticas semânticas existentes, dados de ambos os lados e vistas regeneradas. Prova: CP-07: cenário real de três vias, conteúdo e ausência de unmerged entries.
4. Fontes fora da cobertura conservam conteúdo e evidência de conflito para resolução explícita. Prova: CP-09: código, narrativa e planos.json não sobrescritos.

## Contrato portátil

O arquivo acompanhante `fatia-c-resolvedor.contrato.json` contém escopo, aceite, riscos, reuso, habilidades e avaliação. Herdar os documentos normativos do épico e refinar somente os pontos que mudarem antes de iniciar a tarefa.
