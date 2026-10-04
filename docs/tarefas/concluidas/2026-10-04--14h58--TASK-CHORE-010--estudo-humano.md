# TASK-CHORE-010 · Herança, hashes e revisão incremental (Fatia E)

Plano de referencia: docs/rascunhos/planejamentos/2026-10-03--evolucao-do-planejamento-do-mentor/fatias/fatia-e-heranca-hashes-e-revisao.md
<!-- mentor:plano:inicio sha256="f343f9ab27fc184c9f7600147134728b55348721ad6be65e83ae2ff94315fb8b" -->

# Fatia E: Herança, hashes e revisão incremental

> **Épico**: `PLAN-2026-10-03--evolucao-do-planej` (Evolução do planejamento do Mentor)  
> **Fatia**: E  
> **Tipo**: `CHORE`  
> **Estimativa de Execução**: Esforço Humano P / IA G (Avançado/Alto)  
> **Dependência**: Fatia D1, Fatia D2 e Fatia D3 concluídas

---

## 1. Contexto e Motivação

Nas fatias anteriores, estruturamos:
1. Origem e vigência operacional das ADRs (Fatias A e B).
2. Gerador e validação de consistência arquitetural no `verificar` (Fatia C).
3. Novos contratos locais e portáteis versão 2 (Fatia D1).
4. Cópia integral do estudo humano e extração da memória operacional (Fatia D2).
5. Compacidade de evidências no JSON com persistência em arquivos de log dedicados (Fatia D3).

A **Fatia E** fecha a arquitetura de consistência e auditoria incremental estabelecida em `02-consistencia-e-contratos.md`:
- **Herança seletiva de documentos normativos**: Um plano ou fatia de épico declara quais documentos normativos herda (`documentos_herdados` em `ContratoPlano` / `Plano`). Ao vincular o plano, o CLI gera `plano_ref.manifesto` com os hashes exatos apenas desses arquivos selecionados (mais o documento principal). O épico inteiro **não** é selecionado por padrão.
- **Isolamento de invalidação**: Apenas alterações em documentos normativos herdados no manifesto invalidam a revisão de uma fatia. Mudanças em fatias irmãs, anotações de progresso ou documentos não herdados preservam a integridade da fatia.
- **Assinatura semântica completa**: `assinaturaSemanticaDaTarefa` em `revisao-incremental.ts` passa a contemplar os novos campos contratuais da versão 2 (`decisoes_aplicaveis`, `reuso`, `habilidades`, `avaliacao`) e a identidade de `plano_ref`, garantindo que mudanças nas diretrizes ou no reuso invalidem pareceres reaproveitados indevidamente.
- **Conteúdo normativo no dossiê de auditoria**: O dossiê de revisão incremental e a lista de `contratosDaRevisao` passam a incorporar os documentos herdados no manifesto e o texto normativo resolvido, permitindo ao auditor analisar diretamente o contrato sem truncamentos silenciosos.
- **Precedência do vínculo normativo em `cmd-auditar.ts`**: Rascunhos normativos expressamente declarados em `plano.muda` ou vinculados em `plano_ref` têm precedência sobre a regra geral de exclusão de rascunhos (`motivo = 'nota'`).

---

## 2. Escopo Arquitetural e Arquivos Impactados

1. **`.mentor/scripts/tipos.ts` e `.mentor/esquemas/tarefa.json`**:
   - Adicionar `documentos_herdados?: string[]` a `ContratoPlano` e `Plano`.
   - Garantir que `PlanoRef.manifesto` seja tipado e documentado no esquema.
   - Atualizar interface de `PlanoResolvido` com `documentos_herdados?: string[]`.

2. **`.mentor/scripts/cmd-plano.ts`**:
   - Em `vincularPlano`: quando o contrato portátil ou plano declarar `documentos_herdados`, gerar `t.plano_ref.manifesto` mapeando cada documento herdado para seu SHA-256 no disco, além do arquivo base do plano. Se nenhum for declarado, mapear apenas o documento base (evitando capturar a pasta toda do épico).
   - Em `resolverPlano`: validar `tarefa.plano_ref.manifesto`. Se algum arquivo do manifesto tiver divergência de hash, emitir diagnóstico de revisão inválida para aquele arquivo específico. Arquivos fora do manifesto são ignorados.
   - Em `resolverPlano`: propagar `documentos_herdados`.

3. **`.mentor/scripts/revisao-incremental.ts`**:
   - Em `assinaturaSemanticaDaTarefa`: incluir `decisoes_aplicaveis`, `reuso`, `habilidades`, `avaliacao` e `plano_ref` no payload semântico.
   - Em `contratosDaRevisao`: incluir os arquivos presentes em `tarefa.plano_ref.manifesto` no conjunto de contratos da revisão.
   - Em `prepararRevisaoIncremental`: incorporar seção estruturada no dossiê (`# Plano e Diretrizes Normativas`) com o conteúdo resolvido do plano e referências dos documentos herdados.

4. **`.mentor/scripts/cmd-auditar.ts`**:
   - Em `motivosDeExclusao`: não classificar como `'nota'` arquivos que constem em `declarados` (`plano.muda`) ou sejam o arquivo referenciado em `plano_ref.arquivo` / `plano_ref.manifesto`.

5. **`testes/heranca-hashes-e-revisao.test.ts` e `testes/cenarios/31-testes-de-unidade.ts`**:
   - Suíte abrangente cobrindo manifesto seletivo, isolamento de invalidação entre fatias, assinatura semântica com campos v2, contratos e dossiê na auditoria, e precedência de vínculo normativo sobre rascunho.

6. **Documentação e Manifesto**:
   - Atualizar `CHANGELOG.md` e regenerar manifesto (`node mentor.mjs manifesto`).

---

## 3. Critérios de Aceite

1. **Manifesto Seletivo por Herança**: Ao vincular tarefa a plano com `documentos_herdados`, `plano_ref.manifesto` contém apenas o arquivo principal e os documentos herdados declarados, calculados automaticamente pelo CLI (nunca digitados manualmente).
2. **Isolamento de Fatias**: Alterações em arquivos não herdados de um épico não invalidam a revisão de uma fatia cujo manifesto não os referencia. Alterações em arquivo herdado presente no manifesto geram diagnóstico de divergência.
3. **Assinatura Semântica de Revisão**: Alterações nos campos v2 (`decisoes_aplicaveis`, `reuso`, `habilidades`, `avaliacao`) ou nos documentos do manifesto modificam a `assinaturaSemanticaDaTarefa`.
4. **Dossiê com Conteúdo Normativo**: `contratosDaRevisao` inclui os caminhos herdados do manifesto, e o dossiê gerado por `prepararRevisaoIncremental` traz o conteúdo normativo aplicável.
5. **Precedência Normativa em Rascunhos**: Arquivos sob `docs/rascunhos/` que estejam em `plano.muda` ou no plano vinculado não são descartados como `'nota'` em `cmd-auditar.ts`.
6. **Compatibilidade Total**: Tarefas legadas sem `documentos_herdados` ou sem `manifesto` continuam sendo resolvidas e validadas sem regressões.

---

## 4. Avaliação e Riscos

- **Risco 1**: Teto de 30.000 caracteres no dossiê de revisão ao adicionar texto normativo longo.
  *Mitigação*: `dividirEmPartes` já divide o conteúdo de diff e instruções; a inclusão normativa no dossiê é enxuta e focada nas seções operacionais e contratuais, ou em parte separada se o volume exigir.
- **Risco 2**: Caminhos relativos de documentos herdados.
  *Mitigação*: Normalizar caminhos a partir da pasta do plano ou da raiz do projeto, rejeitando travessias externas (`..`).

<!-- mentor:plano:fim -->

## 5. Desfecho e Validação Real

### 1. Comportamento Real e Validação Observada
- Implementado sistema de herança normativa seletiva via `documentos_herdados` em `ContratoPlano` e `Plano`.
- Ao vincular tarefas (`mentor task vincular-plano`), o manifesto gerado em `plano_ref.manifesto` isola exclusivamente o arquivo base do plano, seu contrato acompanhante e os documentos normativos expressamente declarados, sem selecionar o diretório inteiro do épico.
- O resolvedor (`resolverPlano`) valida individualmente os hashes dos documentos presentes no manifesto. Mudanças em arquivos não herdados preservam a validade da revisão; mudanças em documentos herdados produzem diagnóstico de divergência.
- A assinatura semântica da auditoria incremental (`assinaturaSemanticaDaTarefa`) foi atualizada para cobrir os campos contratuais v2 (`decisoes_aplicaveis`, `reuso`, `habilidades`, `avaliacao`, `documentos_herdados`) e a identidade de `plano_ref`.
- Em `revisao-incremental.ts`, `contratosDaRevisao` e o dossiê (`prepararRevisaoIncremental`) passam a incorporar o conjunto normativo herdado e as diretrizes de decisões aplicáveis.
- Em `cmd-auditar.ts` (`motivosDeExclusao`), documentos de rascunho com vínculo normativo declarado têm precedência sobre a regra geral de exclusão (`motivo = 'nota'`).
- Suíte de testes `testes/heranca-hashes-e-revisao.test.ts` executada com 100% de aprovação.

### 2. Armadilhas Técnicas e Peculiaridades de Ambiente
- **Tratamento de Diretórios vs Arquivos em Manifestos (Prevenção de EISDIR)**:
  Quando um plano aponta para um diretório de épico, o cálculo de hash baseia-se no `README.md`. No manifesto gerado, a chave principal para o arquivo do diretório deve apontar explicitamente para `README.md`, e checagens de integridade no `resolverPlano` devem verificar `itemStat.isDirectory()` antes de chamar `readFileSync` para evitar erros de `EISDIR`.
- **Módulos ECMAScript em Testes de Unidade**:
  Em arquivos `.ts` sob Node/ESM, `require` não está definido no escopo de módulo. Imports devem ser estáticos (`import { createHash } from 'node:crypto'`).

### 3. Status Final dos Gates
- `tipos`: APROVADO (2.3s)
- `testes`: APROVADO (34.5s)
- `mentor verificar`: APROVADO (0 achados nas 5 famílias)

```json mentor:memoria
{
  "resultado": "Herança normativa seletiva, isolamento estrito de fatias e integração com revisão incremental concluídos com sucesso (Fatia E).",
  "aprendizados": [
    "Manifestos de herança seletiva eliminam o acoplamento espúrio e a auto-invalidação de fatias independentes dentro do mesmo épico.",
    "A inclusão de campos contratuais na assinatura semântica garante que qualquer divergência arquitetural em decisões ou reuso invalide o parecer anterior.",
    "Em estruturas de diretório de épico, o arquivo canônico do manifesto deve ser o README.md para evitar exceções EISDIR em leituras de disco."
  ],
  "limites_conhecidos": [
    "Documentos herdados devem residir dentro da árvore do projeto; travessias externas são bloqueadas por segurança."
  ]
}
```

