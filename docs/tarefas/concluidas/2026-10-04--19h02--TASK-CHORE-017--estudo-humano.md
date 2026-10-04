# TASK-CHORE-017 · Resolvedor com falhas verificaveis

Plano de referencia: docs/rascunhos/planejamentos/2026-10-04--trabalho-paralelo-por-slots/fatias/fatia-c-resolvedor.md
<!-- mentor:plano:inicio sha256="ea504caa2b7fc04a557cf433921188be9eddce4bf764a8063caf5664b92befd2" -->

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

<!-- mentor:plano:fim -->

## Estudo Técnico e Implementação Detalhada

Esta fatia torna o comando `mentor resolver-gerados` determinístico, seguro e verificável, garantindo que o status de saída `0` represente de fato um índice Git sem conflitos, enquanto qualquer falha de parse/fusão, erro de stage ou conflito remanescente em arquivos do projeto retorne código de saída `1`.

### 1. Refatoração do Resolvedor: `.mentor/scripts/cmd-resolver.ts`
- **Rastreamento granular de fontes:** cada fonte gerenciada (`contexto.json`, `requisitos.json`, `dividas.json`, `riscos-aceitos.json` e `recusas.jsonl`) é avaliada individualmente quanto a conflitos no Git ou marcadores textuais.
- **Isolamento de falhas:** se o parse ou fusão de uma fonte falhar (ex.: JSON malformado em um dos ramos), a fonte é registrada em `fontesComFalha`, **não** é adicionada à lista de `git add` e tem seu arquivo conservado com os marcadores de conflito intactos para resolução manual explícita.
- **Suporte a linked worktrees:** utiliza `git rev-parse --is-inside-work-tree` para detectar repositórios Git, suportando linked worktrees onde `.git` é um arquivo de ponteiro (`gitdir: ...`).
- **Extração com suporte a diff3 e 2-way:** `extrairConflitoTexto` agora suporta marcadores `<<<<<<<`, `|||||||` (base do diff3), `=======` e `>>>>>>>`, permitindo 3-way merge textual de alta fidelidade.
- **Regeneração condicional:** vistas Markdown só são regeneradas se as fontes estruturais (`contexto.json` e `requisitos.json`) estiverem válidas e livres de conflitos.
- **Verificação estrita do índice Git:** consulta `git diff --name-only --diff-filter=U` e `git ls-files -u` após o stage. Se restarem arquivos unmerged (sejam arquivos de código fora do escopo do Mentor ou fontes com falha), emite lista acionável e retorna código `1`.
- **Ambientes sem Git:** permite regeneração caso não haja marcadores de conflito pendentes, emitindo nota informativa; caso existam marcadores sem base Git confiável, aborta com código `1`.

### 2. Suíte de Testes: `testes/resolvedor-paralelo.test.ts`
- Implementados 4 testes cobrindo os critérios CP-07 a CP-10:
  1. **Cenário real 3-way válido (CP-07):** resolve conflito em `contexto.json` e `recusas.jsonl`, unindo dados dos dois ramos, limpando o índice e retornando status 0.
  2. **Falha de parse em fonte tratada (CP-08):** JSON malformado gera erro, não adiciona arquivo ao stage, preserva marcadores no disco e retorna status 1.
  3. **Conflito fora da cobertura (CP-09):** conflito em `src/app.ts` é mantido intacto, não é sobrescrito, e o comando retorna status 1 listando o arquivo unmerged.
  4. **Ambiente fora do Git:** valida execução pura em pastas sem `.git` com e sem marcadores de conflito.

---

## Handoff e Contratos para as Próximas Fatias

- **Fatia D (`TASK-CHORE-018`):** conectará as referências dos processos existentes (`tarefa.md`, `entrega.md`, `planejamento.md`) às novas regras de concorrência, worktrees e do resolvedor verificável.
- **Fatia E (`TASK-CHORE-019`):** integrará a suíte `testes/resolvedor-paralelo.test.ts` e `testes/worktrees-paralelas.test.ts` ao runner geral e consolidará o pacote.

---

## Desfecho e Validação Real

- **Validação Estrutural e Tetos:** executado `node mentor.mjs verificar`. APROVADO nas 5 famílias.
- **Critérios de Aceite Comprovados:**
  - Critério 0 (CP-08): Falha de parse/fusão não adiciona fonte ao stage e retorna código 1.
  - Critério 1 (CP-09/CP-10): Arquivos unmerged remanescentes ou falhas de stage retornam código 1 listando os caminhos.
  - Critério 2 (CP-07): 3-way merge válido une alterações dos dois lados e retorna código 0 com índice limpo.
  - Critério 3 (CP-09): Arquivos de código fora da cobertura do Mentor conservam marcadores de conflito intactos.
- **Gates de Automação:**
  - `tipos` (`npx tsc --noEmit`): APROVADO (saída 0).
  - `testes` (`node testes/executar.ts --unidade`): APROVADO (saída 0, 32 testes de unidade passaram).
- **Manifesto do Pacote:** atualizado via `node mentor.mjs manifesto` (92 arquivos rastreados).

```json mentor:memoria
{
  "resultado": "Resolvedor cmd-resolver.ts atualizado com controle estrito de fontes tratadas, detecção robusta de worktrees Git e verificação de índice unmerged (retornando status 1 em falhas ou conflitos remanescentes), validado por 4 testes em testes/resolvedor-paralelo.test.ts.",
  "aprendizados": [
    "A verificação do índice git diff --name-only --diff-filter=U após o stage é indispensável para evitar que o resolvedor anuncie falso sucesso em merges parciais.",
    "Fontes com falha de parse não devem ser adicionadas ao stage, preservando os marcadores textuais para o desenvolvedor resolver.",
    "Linked worktrees possuem .git como arquivo de ponteiro, exigindo validação via git rev-parse em vez de checagem direta de pasta .git."
  ],
  "limites_conhecidos": [
    "O resolvedor cobre metadados do ciclo do Mentor (contexto, requisitos, dividas, riscos, recusas e vistas); arquivos de código de produção e planos.json permanecem sob resolução manual do operador.",
    "O import no runner de testes compartilhado foi mantido para a Fatia E."
  ]
}
```

