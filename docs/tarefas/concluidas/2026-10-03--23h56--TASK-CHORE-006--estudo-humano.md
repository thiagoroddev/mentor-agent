# TASK-CHORE-006 · Gerador da habilidade de consistência e validação no verificar

Plano de referência: `docs/rascunhos/planejamentos/2026-10-03--evolucao-do-planejamento-do-mentor/fatias/fatia-c-gerador-e-verificar.md`

## 1. Identificação e Metadados

* **Identificador**: `TASK-CHORE-006`
* **Título**: Gerador da habilidade de consistência e validação no verificar
* **Tipo**: `CHORE`
* **Cerimônia**: `Standard`
* **Perfil**: `completo`
* **Esforço estimado**: Humano `M`, IA `G`
* **Classificação de Modelo**: Perfil geral com maior capacidade / avançado, effort `alto`.
* **Dependências**: `TASK-CHORE-003` (Fatia A) e `TASK-CHORE-005` (Fatia B) concluídas.

---

## 2. Contexto e Motivação

Com o esquema de diretrizes, o parser e o resolvedor determinístico de vigência consolidados na Fatia B (`.mentor/scripts/adrs.ts`), a **Fatia C** estabelece a ponte operacional entre as decisões arquiteturais e os agentes de IA:

1. **Geração da Habilidade `consistencia-do-projeto`**: Em vez de exigir que modelos leiam todas as ADRs completas a cada tarefa (o que desperdiça contexto e gera alucinações), `mentor gerar` sintetiza uma habilidade curta e focada na fonte do projeto (`docs-mentor/skills/consistencia-do-projeto/SKILL.md` ou `docs/skills/...`), contendo estritamente as diretrizes vigentes, seu alcance, regras e exceções.
2. **Sincronização Automática com Agentes**: O fluxo existente de sincronização em `entrada.ts` e `instalar.mjs` propaga essa habilidade para `.agents/skills/` (Antigravity/Codex) e `.claude/skills/` (Claude Code), calculando hashes e prevenindo edições manuais nas cópias.
3. **Auditoria no `mentor verificar`**: O comando `mentor verificar` ganha a família de checagens de ADRs, impedindo que o projeto avance se houver IDs duplicados, referências inexistentes, ciclos no grafo de substituição ou se as ADRs tiverem mudado sem que `mentor gerar` tenha sido executado (drift de consistência).
4. **Transparência com Legado e Ausência**: Projetos sem ADRs recebem declaração explícita de ausência no `SKILL.md`. ADRs legadas sem bloco estruturado são diagnosticadas como pendências de normalização, garantindo que o agente saiba que existem decisões em linguagem natural que ainda requerem leitura dos arquivos originais.

---

## 3. Especificação Técnica Arquivo por Arquivo

### 1. `.mentor/scripts/adrs.ts`
* Adicionar `gerarConteudoHabilidadeConsistencia(vigencia: ResultadoVigenciaDiretrizes): string`:
  * Gera o conteúdo Markdown de `consistencia-do-projeto/SKILL.md`.
  * Frontmatter YAML padronizado: `name: consistencia-do-projeto`, `description: Diretrizes operacionais e restrições arquiteturais vigentes do projeto derivadas das ADRs.`
  * Tabela ou blocos determinísticos ordenados por `id` das diretrizes vigentes (`vigencia.vigentes`), apresentando `id`, `alcance`, `regra`, `excecoes` e a ADR de origem (`ADR-xxx`).
  * Seção explícita de "Decisões Legadas em Linguagem Natural" quando `vigencia.legado_sem_diretrizes` contiver arquivos.
  * Nota de ausência quando não houver nenhuma diretriz nem ADR no projeto.
* Adicionar `gerarHabilidadeConsistencia(c: Caminhos): { ok: boolean; erro?: string; modificada: boolean }`:
  * Carrega as diretrizes do projeto e calcula a vigência.
  * Se houver `problemas` críticos (ciclos, duplicidades), aborta retornando o erro sem escrever arquivo corrompido.
  * Escreve no destino canônico do projeto (`join(c.docs, 'skills', 'consistencia-do-projeto', 'SKILL.md')`).
* Adicionar `verificarConsistenciaAdrs(c: Caminhos): Achado[]`:
  * Função exportada para uso no `cmd-verificar.ts`.
  * Valida integridade das ADRs (rejeição de ciclos, duplicatas, erros de parsing).
  * Compara o conteúdo em disco de `docs/skills/consistencia-do-projeto/SKILL.md` com a saída esperada de `gerarConteudoHabilidadeConsistencia()`, acusando `drift` caso estejam desatualizados.

### 2. `.mentor/scripts/entrada.ts`
* Em `gerarCarregamento()`:
  * Invocar `gerarHabilidadeConsistencia(c)` antes de `sincronizarSkills(l)`.
  * Se a geração acusar erro crítico, registrar mensagem de erro no console e retornar código 1 sem alterar parcialmente os destinos.

### 3. `.mentor/scripts/cmd-verificar.ts`
* Integrar `verificarConsistenciaAdrs(c)` na função `coletarAchados()` sob a família `adrs`.
* Atualizar mensagem de resumo aprovado no `verificar()`.

### 4. `testes/adrs-gerador-e-verificar.test.ts`
* Criar suíte de testes unitários rápidos (Nível 1, < 200ms):
  * Geração correta da habilidade com diretrizes vigentes e substituição parcial.
  * Projeto sem ADRs: aviso claro de ausência gerado no `SKILL.md`.
  * Projeto com ADRs legadas: diagnóstico gerado no `SKILL.md`.
  * Bloqueio da geração em caso de ciclo ou ID duplicado.
  * `verificarConsistenciaAdrs` acusando drift quando o `SKILL.md` estiver desatualizado ou divergente.
* Integrar em `testes/cenarios/31-testes-de-unidade.ts`.

### 5. Documentação, Manifesto e Changelog
* Atualizar `CHANGELOG.md` em `## [Não publicado]`.
* Atualizar `.mentor/manifesto.json` via `node mentor.mjs manifesto`.

---

## 4. Critérios de Aceite

1. `gerarHabilidadeConsistencia` produz `docs-mentor/skills/consistencia-do-projeto/SKILL.md` com frontmatter e listagem determinística de diretrizes ativas ordenadas por ID.
2. Projeto sem ADRs gera `SKILL.md` com declaração explícita de ausência, sem falhar silenciosamente nem simular regras inexistentes.
3. ADRs legadas sem bloco estruturado são listadas no `SKILL.md` como pendências de extração sem quebrar a geração.
4. `gerarCarregamento` invoca a geração da habilidade de consistência e propaga a sincronização para `.agents/skills` e `.claude/skills`.
5. `mentor verificar` valida a integridade das ADRs (rejeitando ciclos, IDs duplicados e referências inválidas) e acusa drift quando a habilidade gerada está desatualizada em relação às ADRs.
6. A bateria de testes unitários (Nível 1) executa em menos de 5 segundos e passa com código 0.

---

## 5. Desfecho e Validação Real

A implementação da Fatia C foi concluída com sucesso e validada integralmente contra os requisitos de projeto e critérios de aceite:

1. **Geração Determinística da Habilidade de Consistência**:
   * Implementada em `.mentor/scripts/adrs.ts` (`gerarConteudoHabilidadeConsistencia` e `gerarHabilidadeConsistencia`).
   * Gera o arquivo padronizado `SKILL.md` em `docs-mentor/skills/consistencia-do-projeto/` com frontmatter YAML, seções claras de Status, Diretrizes Arquiteturais Vigentes ordenadas estritamente por ID alfanumérico, Decisões Legadas (quando houver) e histórico de substituições.
   * Tratamento robusto para projetos sem ADRs (emissão de declaração explícita de ausência sem falhas ou alucinações).

2. **Validação e Detecção de Drift no `mentor verificar`**:
   * Implementada a função `verificarConsistenciaAdrs` integrada em `coletarAchados()` (`.mentor/scripts/cmd-verificar.ts`) sob a família `adrs`.
   * Rejeita e acusa achados impeditivos para ciclos de substituição, identificadores duplicados, referências inexistentes e drift (quando o `SKILL.md` gerado diverge das ADRs em disco).

3. **Integração no Ciclo de Vida do Mentor**:
   * Integrado em `gerarCarregamento()` (`.mentor/scripts/entrada.ts`) antes da sincronização de skills, garantindo que qualquer invocação de carregamento gere a habilidade de consistência e propague para `.agents/skills` e `.claude/skills`.

4. **Cobertura de Testes de Unidade (Nível 1)**:
   * Suíte dedicada criada em `testes/adrs-gerador-e-verificar.test.ts` e plugada no runner principal `testes/cenarios/31-testes-de-unidade.ts`.
   * Valida todos os cenários: ausência, legados, vigência com substituição, bloqueio de ciclos/duplicatas e detecção de drift.

5. **Critérios de Aceite e Gates Aprovados**:
   * Todos os 6 critérios de aceite foram evidenciados com código 0.
   * Gate `tipos` (`npx tsc --noEmit`): **APROVADO** (código 0).
   * Gate `testes` (`node testes/executar.ts --unidade`): **APROVADO** (código 0).
   * `CHANGELOG.md` e `.mentor/manifesto.json` sincronizados.
