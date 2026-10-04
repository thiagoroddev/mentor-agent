# Fatia D1: Campos novos nos contratos locais/portáteis

## 1. Identificação e Metadados

* **Identificador da Fatia**: `Fatia D1`
* **Título**: Campos novos nos contratos locais/portáteis
* **Épico**: `PLAN-2026-10-03--evolucao-do-planej` (Evolução do planejamento do Mentor)
* **Tipo**: `CHORE`
* **Cerimônia**: `Standard`
* **Perfil**: `completo`
* **Esforço estimado**: Humano `M`, IA `G`
* **Classificação de Modelo**:
  * **Complexidade**: Alta (contratos de dados centrais, integridade referencial, compatibilidade retroativa e comandos CLI).
  * **Dimensão dominante**: Acoplamento e Incerteza (interfaces compartilhadas por múltiplos comandos e consumidores).
  * **Perfil de modelo**: Geral de maior capacidade ou avançado.
  * **Effort**: Alto.
* **Dependências**:
  * Fatia A (`TASK-CHORE-003` - Origem configurável de ADRs) — Concluída.
  * Fatia B (`TASK-CHORE-005` - Formato operacional versionado e resolvedor de vigência) — Concluída.
  * Fatia C (`TASK-CHORE-006` - Gerador da habilidade de consistência e validação no verificar) — Concluída.

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
* Definir tipos e interfaces:
  * `DecisaoAplicavelItem`: `{ adr: string; diretriz?: string | null; aplicacao: string; excecoes?: string | null }`
  * `DecisoesAplicaveisObjeto`: `{ motivo_ausencia?: string | null; itens?: DecisaoAplicavelItem[] }`
  * `DecisoesAplicaveis`: `DecisaoAplicavelItem[] | DecisoesAplicaveisObjeto`
  * `ArtefatoReusoNovo`: `{ artefato: string; local: string; motivo: string }`
  * `ReusoPlano`: `{ existentes?: string[]; novos?: ArtefatoReusoNovo[]; motivo_sem_reuso?: string | null }`
  * `HabilidadeItem`: `{ nome: string; motivo: string; origem?: string | null }`
  * `HabilidadesPlano`: `{ planejamento?: HabilidadeItem[]; execucao?: HabilidadeItem[] }`
  * `ComplexidadeNivel`: `'baixa' | 'media' | 'alta' | 'muito_alta'`
  * `DimensaoDominante`: `'incerteza' | 'profundidade_raciocinio' | 'acoplamento' | 'validacao_discriminatoria'`
  * `PerfilModelo`: `'economico' | 'geral' | 'avancado'`
  * `EffortNivel`: `'baixo' | 'medio' | 'alto' | 'maximo'`
  * `AvaliacaoFase`: `{ complexidade?: ComplexidadeNivel | string | null; dimensao_dominante?: DimensaoDominante | string | null; justificativa?: string | null; perfil_modelo?: PerfilModelo | string | null; effort?: EffortNivel | string | null }`
  * `AvaliacaoPlano`: `{ planejamento?: AvaliacaoFase | null; execucao?: AvaliacaoFase | null }`
* Atualizar `Plano`:
  * Adicionar `versao?: number`
  * Adicionar `decisoes_aplicaveis?: DecisoesAplicaveis | null`
  * Adicionar `reuso?: ReusoPlano | null`
  * Adicionar `habilidades?: HabilidadesPlano | null`
  * Adicionar `avaliacao?: AvaliacaoPlano | null`
* Atualizar `ContratoPlano` e `PlanoResolvido`.

### 2. `.mentor/esquemas/tarefa.json`
* Adicionar ao bloco `plano`:
  * `versao`: `2` (número inteiro de versão do contrato de plano).
  * `decisoes_aplicaveis`: array ou objeto documentando diretrizes e decisões.
  * `reuso`: objeto com `existentes`, `novos` e `motivo_sem_reuso`.
  * `habilidades`: objeto com `planejamento` e `execucao`.
  * `avaliacao`: objeto com avaliações para planejamento e execução.

### 3. `.mentor/scripts/cmd-plano.ts`
* Atualizar `ContratoPlano` e `PlanoResolvido`:
  * Incluir campos `versao`, `decisoes_aplicaveis`, `reuso`, `habilidades`, `avaliacao`.
* Atualizar `resolverPlano(tarefa)`:
  * Propagar os quatro novos campos quando presentes na tarefa inline ou no contrato acompanhante (`.contrato.json` / `contrato.json`).
  * Em contratos com `versao >= 2`, executar checagem de referências:
    * Se houver ADR citada, verificar se o arquivo correspondente existe na pasta de ADRs configurada (`c.adr`). Se inexistente, adicionar diagnóstico.
    * Se houver habilidade citada sem `origem`, verificar se existe localmente em `.mentor/skills/<nome>` ou `docs-mentor/skills/<nome>`.
* Atualizar `vincularPlano(id, flags, planoOuArquivo?)`:
  * Permitir identificação do plano por ID registrado em `docs-mentor/planos.json` (ex: `PLAN-xxx`) passado no 2º argumento posicional ou `--plano`, resolvendo automaticamente arquivo e seção.
  * Preservar suporte a `--arquivo <path>`.
  * Ao vincular contrato acompanhante, copiar `versao`, `decisoes_aplicaveis`, `reuso`, `habilidades` e `avaliacao` para `tarefa.plano` sem sobrescrever campos já existentes preenchidos.
* Atualizar `importarPlano`:
  * Manter integridade de arquivos de contrato acompanhantes (`.contrato.json`).

### 4. `.mentor/scripts/cli.ts`
* Em `task vincular-plano`:
  * Passar `posicionais[2]` como segundo argumento / plano opcional para `vincularPlano(id, flags, posicionais[2])`.
  * Atualizar mensagem de ajuda com a sintaxe expandida: `task vincular-plano <ID> [<PLANO-ID> | --arquivo <path>] [--secao <id>]`.

### 5. `.mentor/scripts/cmd-tarefa.ts`
* Em `iniciar`:
  * Ao resolver `tarefa.plano_ref`, incorporar os novos campos contratuais resolvidos à tarefa.
* Em `finalizar`:
  * Se a tarefa possuir `tarefa.plano.versao >= 2`:
    * Validar preenchimento consistente de `decisoes_aplicaveis` (itens válidos ou motivo de ausência).
    * Validar preenchimento consistente de `reuso` (existentes, novos ou motivo_sem_reuso).
    * Validar preenchimento consistente de `habilidades` (planejamento e/ou execução).
    * Validar preenchimento consistente de `avaliacao` (planejamento e/ou execução com campos obrigatórios).
  * Tarefas legadas (sem `versao` ou `versao < 2`) não recebem impedimentos adicionais.

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
