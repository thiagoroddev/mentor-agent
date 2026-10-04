# TASK-CHORE-013 · Habilidades de UI-Design, Test-Design e Caracterização (Fatia H)

Plano de referencia: docs/rascunhos/planejamentos/2026-10-03--evolucao-do-planejamento-do-mentor/fatias/fatia-h-ui-e-test-design.md
<!-- mentor:plano:inicio sha256="aa190e7229c41e0f3094a6bb563dedfc3f9edc582477070764ad0d7469711cce" -->

# Fatia H: Habilidades de UI-Design, Test-Design e Caracterização

> **Épico**: `PLAN-2026-10-03--evolucao-do-planej` (Evolução do planejamento do Mentor)  
> **Fatia**: H  
> **Tipo**: `CHORE`  
> **Estimativa de Execução**: Esforço Humano P / IA M (Geral/Médio)  
> **Dependências**: Fatia F concluída

---

## 1. Contexto e Motivação

Conforme estabelecido em `04-fatias-e-validacao.md` (seções *Capacidades centrais*, *Aplicação ao piloto e UI* e *Habilidades adicionais*):
> "| H | ui-design e test-design; limites da referencia-para-react | UI existente, reuso e caracterização cobertos sem habilidades duplicadas | M, moderada, geral/médio |"  
> "Padrão de UI: primitivas existentes, componentes de domínio próximos da funcionalidade, critérios para primitiva nova, tokens/variantes/foco/disabled, estados pertinentes e acessibilidade. Não criar componentes para cada div nem usar abstração sem responsabilidade concreta."  
> "Adoção: inventário → avisos no legado → normalização ao alterar arquivos → erro nos arquivos normalizados → exceções técnicas específicas justificadas."

Com as instruções centrais de planejamento em ondas (Fatia F) e o inventário de reuso formalizado no contrato (`plano.reuso`), a **Fatia H** fecha o épico aprimorando as duas habilidades de execução mais solicitadas:
1. **`ui-design`**:
   - Estender além de layouts novos (Figma/Print): cobrir UI existente, inventário de componentes/reuso antes de propor código novo, critérios claros para quando criar uma nova primitiva de UI vs usar componentes existentes ou de domínio.
   - Preservação rigorosa de comportamento existente e acessibilidade ao refatorar telas.
   - Identificação de controles nativos que deveriam seguir o sistema de componentes do projeto (ex.: regras de lint como `react/forbid-elements`).
   - Fronteiras de responsabilidade com habilidades de tradução de referências (como `referencia-para-react`): `ui-design` é a autoridade sobre decomposição visual, reuso e padrões no projeto consumidor; referências externas não devem sobrescrever padrões locais.
2. **`test-design`**:
   - Incorporar a metodologia de **testes de caracterização** (*characterization tests*) antes de refatorar código legado ou UI existente que carece de testes automatizados, criando uma rede de proteção discriminatória.
   - Validação de contratos públicos e invariantes de interface sem acoplamento a detalhes internos de implementação.

---

## 2. Escopo Arquitetural e Arquivos Impactados

1. **`.mentor/skills/ui-design/SKILL.md`**:
   - Ampliação com seções dedicadas:
     - Inventário de UI existente e reuso (`plano.reuso`).
     - Primitivas existentes vs componentes de domínio (evitar abstrações prematuras ou componentes para cada div).
     - Critérios para adoção de primitivas novas.
     - Preservação de acessibilidade, estados nativos (foco, disabled) e conformidade (ex: `react/forbid-elements`).
     - Fronteira clara com referências externas (`referencia-para-react`).
2. **`.mentor/skills/test-design/SKILL.md`**:
   - Ampliação com seções dedicadas:
     - Testes de caracterização antes de refatoração: fixar comportamento observável atual antes de alterar código.
     - Validação discriminatória de contratos e limites de invariantes.
     - Proteção contra testes frágeis acoplados a detalhes internos.
3. **`testes/ui-e-test-design.test.ts` e `testes/cenarios/31-testes-de-unidade.ts`**:
   - Suíte de testes unitários validando a presença, integridade e conformidade das novas diretrizes nas duas habilidades.
4. **Documentação e Manifesto**:
   - Atualizar `CHANGELOG.md` e regenerar `.mentor/manifesto.json`.

---

## 3. Critérios de Aceite

1. `.mentor/skills/ui-design/SKILL.md` atualizado cobrindo UI existente, inventário de reuso, critérios para primitivas novas vs componentes de domínio, regras para controles nativos e fronteiras com referências externas.
2. `.mentor/skills/test-design/SKILL.md` atualizado cobrindo testes de caracterização antes de refatorações, validação de contratos e garantia de testes discriminatórios.
3. Suíte de testes unitários `testes/ui-e-test-design.test.ts` registrada em `31-testes-de-unidade.ts` passando com 100% de sucesso.
4. Gates de qualidade (`tipos`, `testes`) e `mentor verificar` aprovados.

<!-- mentor:plano:fim -->

## 5. Desfecho e Validação Real

A Fatia H expandiu e consolidou as habilidades `ui-design` e `test-design`:
1. `ui-design` atualizada cobrindo UI existente, inventário de reuso (`plano.reuso`), separação entre primitivas de design system e componentes de domínio, critérios claros para criação de novas primitivas, conformidade com controles nativos (`react/forbid-elements`), preservação de comportamento e acessibilidade, e fronteira clara com habilidades de referências externas (`referencia-para-react`).
2. `test-design` atualizada com metodologia de testes de caracterização antes de refatorar código legado/UI e validação discriminatória de contratos sem acoplamento a detalhes internos de implementação.
3. Suíte de testes unitários `testes/ui-e-test-design.test.ts` registrada em `31-testes-de-unidade.ts` passando com 100% de sucesso. Todos os gates e verificações do Mentor aprovados.

```json mentor:memoria
{
  "resultado": "Habilidades ui-design e test-design aprimoradas cobrindo inventário de reuso em UI existente, testes de caracterização pré-refatoração e validação discriminatória de contratos, validadas por testes unitários dedicados.",
  "aprendizados": [
    "A distinção explícita entre primitivas de design system e componentes de domínio impede a proliferação desnecessária de abstrações de UI e componentes para cada div.",
    "Testes de caracterização antes de refatorar garantem uma rede de proteção objetiva sem exigir que o desenvolvedor deduza de cabeça todos os casos de borda do legado."
  ],
  "limites_conhecidos": [
    "A aplicação específica de regras de lint como react/forbid-elements depende da configuração de linters pelo projeto consumidor."
  ]
}
```
