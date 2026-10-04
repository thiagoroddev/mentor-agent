# TASK-CHORE-007 · Campos novos nos contratos locais e portáteis

Plano de referência: `docs/rascunhos/planejamentos/2026-10-03--evolucao-do-planejamento-do-mentor/fatias/fatia-d1-contratos-locais-e-portateis.md`

## 1. Identificação e Metadados

* **Identificador**: `TASK-CHORE-007`
* **Título**: Campos novos nos contratos locais e portáteis
* **Tipo**: `CHORE`
* **Cerimônia**: `Standard`
* **Perfil**: `completo`
* **Esforço estimado**: Humano `M`, IA `G`
* **Classificação de Modelo**: Perfil geral com maior capacidade / avançado, effort `alto`.
* **Dependências**: `TASK-CHORE-003` (Fatia A), `TASK-CHORE-005` (Fatia B) e `TASK-CHORE-006` (Fatia C) concluídas.

---

## 2. Contexto e Motivação

O planejamento de tarefas e épicos no Mentor opera sobre dois pilares: a narrativa rica em prosa para compreensão humana detalhada e o contrato estruturado em JSON para consumo eficiente por agentes autônomos.

Atualmente, tarefas e planos capturam campos essenciais (`muda`, `criterios_aceite`, `impacto`, `riscos`, etc.), mas carecem de campos operacionais estruturados para quatro dimensões críticas estabelecidas na evolução do planejamento:
1. **Decisões aplicáveis (`decisoes_aplicaveis`)**: explicita quais ADRs/diretrizes arquiteturais balizam o trabalho, como serão cumpridas ou justificar ausência/exceção.
2. **Reuso (`reuso`)**: cataloga artefatos existentes a reutilizar e artefatos novos a criar com local e justificativa, coibindo reinvenção de componentes e estilos.
3. **Habilidades requeridas (`habilidades`)**: mapeia as competências necessárias para planejamento e execução (ex: `planejamento`, `consistencia-do-projeto`, `ui-design`, etc.) com seus motivos e origens.
4. **Avaliação multidimensional (`avaliacao`)**: registra complexidade, dimensão dominante, risco e perfil de modelo/effort separadamente para planejamento e execução.

A **Fatia D1** introduz esses quatro campos no contrato de planos e tarefas, garantindo:
* **Versionamento explícito do contrato**: planos e tarefas versão 2 (`versao: 2`) adotam a nova estrutura; contratos legados (versão 1 ou sem campo) permanecem integralmente suportados sem bloqueios retroativos.
* **Correção da interface CLI de vínculo**: o comando `mentor task vincular-plano` passa a aceitar tanto o ID registrado do plano (`<PLANO-ID>`) quanto o caminho direto (`--arquivo <path>`), unificando a sintaxe documentada e a implementação.
* **Preservação e propagação integral**: nenhum campo é descartado nas operações de `vincular-plano`, `importarPlano`, `iniciar`, `resolverPlano` ou `finalizar`.
* **Validação de referências locais**: para contratos versão 2, checagem de existência de ADRs referenciadas e de habilidades locais sem origem declarada.

---

## 3. Especificação Técnica Arquivo por Arquivo

### 1. `.mentor/scripts/tipos.ts`
* Adicionar interfaces:
  * `DecisaoAplicavelItem`, `DecisoesAplicaveisObjeto`, `DecisoesAplicaveis`.
  * `ArtefatoReusoNovo`, `ReusoPlano`.
  * `HabilidadeItem`, `HabilidadesPlano`.
  * `ComplexidadeNivel`, `DimensaoDominante`, `PerfilModelo`, `EffortNivel`, `AvaliacaoFase`, `AvaliacaoPlano`.
* Atualizar `Plano`, `ContratoPlano` e `PlanoResolvido` com os novos campos.

### 2. `.mentor/esquemas/tarefa.json`
* Adicionar ao bloco `plano`:
  * `versao`, `decisoes_aplicaveis`, `reuso`, `habilidades`, `avaliacao`.

### 3. `.mentor/scripts/cmd-plano.ts`
* Atualizar `resolverPlano`:
  * Propagar novos campos de contratos acompanhantes e inline.
  * Em contratos `versao >= 2`, diagnosticar ADRs inexistentes em `c.adr` e habilidades sem origem ausentes do ambiente local.
* Atualizar `vincularPlano`:
  * Aceitar `<PLANO-ID>` posicional ou `--plano <PLANO-ID>`, além de `--arquivo <path>`.
  * Ao carregar contrato acompanhante, copiar todos os novos campos para `t.plano`.

### 4. `.mentor/scripts/cli.ts`
* Atualizar suporte ao argumento posicional `PLANO-ID` em `task vincular-plano`.

### 5. `.mentor/scripts/cmd-tarefa.ts`
* Em `iniciar`: incorporar novos campos do contrato resolvido.
* Em `finalizar`: validar consistência dos 4 campos quando `tarefa.plano.versao >= 2`, preservando compatibilidade para tarefas legadas.

### 6. `testes/contratos-planos-novos.test.ts`
* Criar suíte de testes unitários rápidos (< 1s):
  * Resolução de contrato versão 2 com novos campos a partir de `.contrato.json` e inline.
  * Vínculo de plano por ID (`PLAN-xxx`) e por caminho direto (`--arquivo`).
  * Validação referencial de ADR inexistente e habilidade sem origem em contratos versão 2.
  * Compatibilidade retroativa de tarefas sem novos campos e finalização normal.
  * Validação de impedimentos ao tentar finalizar tarefa versão 2 com campos incompletos.
* Integrar em `testes/cenarios/31-testes-de-unidade.ts`.

### 7. Documentação, Manifesto e Changelog
* Atualizar `CHANGELOG.md` em `## [Não publicado]`.
* Atualizar `.mentor/manifesto.json` via `node mentor.mjs manifesto`.

---

## 4. Critérios de Aceite

1. Tipos e esquema de tarefa atualizados com `versao`, `decisoes_aplicaveis`, `reuso`, `habilidades` e `avaliacao`.
2. `resolverPlano` preserva e propaga todos os 4 campos novos de contratos acompanhantes (`.contrato.json`) e tarefas inline.
3. `vincularPlano` aceita tanto `<PLANO-ID>` quanto `--arquivo <path>`, vinculando o plano e incorporando os novos campos contratuais à tarefa sem perdas.
4. Validação de referências acusa ADR inexistente e habilidade sem origem em contratos versão 2.
5. Tarefas e planos legados continuam 100% compatíveis e podem ser iniciados e finalizados sem erros.
6. A bateria de testes unitários (Nível 1) executa em menos de 5 segundos e passa com código 0.

---

## 5. Desfecho e Validação Real

A implementação da Fatia D1 foi concluída com sucesso e validada integralmente contra os requisitos de projeto, critérios de aceite e políticas de governança:

1. **Evolução dos Tipos e Esquema de Dados**:
   * Interfaces completas adicionadas em `.mentor/scripts/tipos.ts` para `DecisoesAplicaveis`, `ReusoPlano`, `HabilidadesPlano` e `AvaliacaoPlano`.
   * Campos opcionais `versao`, `decisoes_aplicaveis`, `reuso`, `habilidades` e `avaliacao` adicionados à interface `Plano` e ao esquema `.mentor/esquemas/tarefa.json`.

2. **Resolução, Vínculo e Preservação de Contratos**:
   * `resolverPlano()` em `.mentor/scripts/cmd-plano.ts` atualizado para propagar os 4 campos tanto de planos inline quanto de contratos acompanhantes (`.contrato.json` / `contrato.json`).
   * `vincularPlano()` atualizado para aceitar tanto a sintaxe documentada de ID posicional `mentor task vincular-plano <ID> <PLANO-ID>` quanto a forma com flags `--plano` ou `--arquivo`, copiando integralmente os novos campos para a tarefa.
   * `importarPlano()` preserva arquivos `.contrato.json` acompanhantes durante importações literais.

3. **Validação Referencial em Contratos Versão 2**:
   * Função `validarReferenciasDoContrato()` implementada em `cmd-plano.ts`.
   * Para planos e tarefas com `versao >= 2`, verifica a existência real de ADRs referenciadas na pasta configurada (`c.adr`) e exige declaração explícita de `origem` para habilidades que não existam localmente.

4. **Validação de Fechamento e Retrocompatibilidade Estrita**:
   * Validações no `finalizar()` em `.mentor/scripts/cmd-tarefa.ts` ativadas somente quando `tarefa.plano.versao >= 2`.
   * Tarefas e planos legados (versão ausente ou < 2) continuam executando e finalizando sem qualquer bloqueio retroativo.

5. **Critérios de Aceite e Gates Aprovados**:
   * Todos os 6 critérios de aceite foram evidenciados com código 0.
   * Gate `tipos` (`npx tsc --noEmit`): **APROVADO** (código 0, 2.1s).
   * Gate `testes` (`node testes/executar.ts --unidade`): **APROVADO** (código 0, 33.5s).
   * `mentor verificar` aprovado com código 0 (5 famílias auditadas).
   * `CHANGELOG.md` e `.mentor/manifesto.json` sincronizados.
