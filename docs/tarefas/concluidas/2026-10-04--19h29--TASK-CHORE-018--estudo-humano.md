# TASK-CHORE-018 · Instrucoes coerentes de trabalho paralelo

Plano de referencia: docs/rascunhos/planejamentos/2026-10-04--trabalho-paralelo-por-slots/fatias/fatia-d-instrucoes.md
<!-- mentor:plano:inicio sha256="18048f36b6443ae8ed69fca5b7fba4b699883ee58257f1085a009eca13b4e589" -->

# Fatia D: Instruções coerentes de trabalho paralelo

## Resultado e dependências

Depende de A; as interfaces públicas planejadas de B/C podem orientar o texto enquanto essas fatias avançam. Integração final E só publica documentação coerente com o código efetivamente entregue. Carga M/G, revisão por acoplamento de instruções; sem mudança no comportamento do grafo ou nos gates.

## Mudança arquivo por arquivo

- `.mentor/processos/planejamento.md`: acrescentar uso do protocolo paralelo e contratos de fronteira; divisão por objetivo/capacidade, com dependências reais.
- `.mentor/skills/planejamento/SKILL.md`: referenciar o protocolo quando a tarefa exigir múltiplas sessões, sem novo papel permanente por modelo.
- `.mentor/processos/tarefa.md`: orientar atribuição exclusiva, handoff de sessão e reserva/cadastro do lote antes da execução. Reusar estados existentes de pausa/retomada; não criar estado “modelo-trocado”.
- `.mentor/processos/entrega.md`: ajustar a seção de épicos para restringir push acumulado a lote sequencial deliberado. Branches paralelas têm candidatos/PRs próprios e integração serial. Corrigir exemplos que assumem ausência de conflito ou que exclusão pós-squash possa ser decidida por qualquer diff isolado. Linkar cobertura e retorno do resolvedor, sem prometer arbitrar qualquer fonte.
- `.mentor/processos/teste.md`: preservar níveis atuais e regras de evidência; explicar que risco Git/merge pode exigir prova focada de integração já no ciclo da tarefa. Validação combinada pertence à árvore integrada; quantidade de cenários é derivada.
- `.mentor/scripts/cli.ts`: alinhar somente a ajuda de `task fatiar` com paralelo por padrão e `--ordem` quando houver dependência. Não adicionar comando de orquestração.
- `README.md`: apresentar o protocolo, exemplo genérico de dois/três slots e referências aos comandos existentes. Não vincular um fornecedor a uma disciplina fixa.

## Validação

Conferir links, frontmatter, exemplos e coerência com código/contexto. Executar a ajuda real do CLI e verificar que não anuncia encadeamento automático. Não criar teste que apenas compara a frase escrita.

Por ter porte IA G, completar estado da arte e custo de oportunidade na tarefa usando a comparação de 01. Diferenças materiais do código de B/C são reconciliadas na integração E; se exigirem mudança de direção, registrar revisão do plano. Changelog, manifesto e runners pertencem a E.

## Critérios de aceite

1. Planejamento e sua skill orientam distribuir tarefas por independência e capacidade, com exemplo substituível de modelos. Prova: CP-01/CP-13: revisão conjunta de processo e modelo A.
2. Entrega distingue lote sequencial e branches paralelas, respeitando política de PR do consumidor e integração serial. Prova: CP-14: revisão dos dois fluxos e exemplos Git.
3. Teste conserva gates exigidos e exige prova da árvore combinada, permitindo prova Git focada por risco. Prova: CP-12: revisão comparada com contexto e fingerprint vigente.
4. README e ajuda do CLI descobrem o protocolo e descrevem fatiamento paralelo por padrão com --ordem explícita. Prova: Inspeção da saída de ajuda e comparação com cmd-fila.ts.

## Contrato portátil

O arquivo acompanhante `fatia-d-instrucoes.contrato.json` contém escopo, aceite, riscos, reuso, habilidades e avaliação. Herdar os documentos normativos do épico e refinar somente os pontos que mudarem antes de iniciar a tarefa.

<!-- mentor:plano:fim -->

## 1. Estudo Humano e Fundamentação Técnica

Esta fatia consolida a governança do trabalho simultâneo de múltiplos agentes autônomos ou desenvolvedores seniores atuando no mesmo repositório com o ecossistema do Mentor:
- **Alocação por Capacidade e Modelos Intercambiáveis (CP-01):** Assegura que nenhum agente ou fornecedor de IA tenha papel engessado ou permanente por componente. Modelos são alocados de acordo com complexidade e aptidão, preservando o histórico integral do Portão 1 e o ID da tarefa em eventuais trocas de sessão.
- **Pré-cadastro Centralizado do Lote (CP-13):** Assegura que todas as tarefas e seus IDs nasçam na linha principal ou em branch de planejamento antes da distribuição às worktrees paralelas, prevenindo colisões ou divergências de escopo em árvores separadas.
- **Lote Sequencial vs Branches Paralelas (CP-14):** Formaliza os dois fluxos de entrega no Git. O lote sequencial local no mesmo ramo consolida commits locais atômicos com push único ao término do lote. Em contrapartida, branches paralelas executadas em slots de worktree separados representam unidades de entrega com integração serial via *First-to-Merge*, onde conflitos administrativos são resolvidos deterministicamente por `mentor resolver-gerados`.
- **Validação na Árvore Integrada (CP-12):** Preserva a pirâmide de testes Nível 1 (unidade/ciclo local de tarefa) e Nível 2 (integração consolidada), permitindo testes focados de integração no ciclo local quando a tarefa tocar mecânicas de Git ou concorrência, enquanto a prova combinada pertence à árvore consolidada.

## 2. Implementação Passo a Passo

1. **`.mentor/processos/planejamento.md`:** Acrescentada subseção de distribuição de épicos e trabalho paralelo por slots, enfatizando disjunção de `plano.muda`, pré-cadastro de IDs e alocação por capacidade com modelos intercambiáveis.
2. **`.mentor/skills/planejamento/SKILL.md`:** Adicionada orientação para trabalho paralelo e múltiplas sessões, apontando para o protocolo e modelo de atribuição.
3. **`.mentor/processos/tarefa.md`:** Normatizado o fluxo de atribuição exclusiva por slot e handoff de sessão reusando os comandos `task pausar` e `task retomar`, sem criação de novos estados sintéticos.
4. **`.mentor/processos/entrega.md`:** Distinguidos os fluxos de lote sequencial e branches paralelas com integração serial (*First-to-Merge*), além de detalhados os limites estritos e o retorno com código 1 do `mentor resolver-gerados` em caso de conflitos não resolvidos.
5. **`.mentor/processos/teste.md`:** Esclarecido que testes locais de integração focados cobrem riscos específicos de Git/concorrência, enquanto a prova combinada completa pertence à árvore integrada final (Nível 2).
6. **`.mentor/scripts/cli.ts`:** Atualizada a ajuda do subcomando `task fatiar` para refletir fatias paralelas por padrão e `--ordem` explícita com `--motivo-ordem`.
7. **`README.md`:** Incluída a seção de trabalho paralelo por slots fixos em Git worktrees, destacando o diagnóstico no `doctor`, o resolvedor semântico e a interoperabilidade de modelos.

## 3. Critérios de Aceite e Evidências

- **Critério 0 [APROVADO]:** Revisão conjunta de `.mentor/processos/planejamento.md` e `.mentor/skills/planejamento/SKILL.md` orientando distribuição de épicos por independência (`plano.muda` disjunto) e alocação por capacidade com modelos intercambiáveis (`CP-01` e `CP-13`).
- **Critério 1 [APROVADO]:** Revisão de `.mentor/processos/entrega.md` distinguindo lote sequencial local de branches paralelas com integração serial (*First-to-Merge*) e documentando limites estritos do `mentor resolver-gerados` (`CP-14`).
- **Critério 2 [APROVADO]:** Revisão de `.mentor/processos/teste.md` mantendo pirâmide N1 vs N2, admitindo prova focada por risco de integração no ciclo local e exigindo prova combinada na árvore integrada (`CP-12`).
- **Critério 3 [APROVADO]:** Inspeção de `README.md` e ajuda do CLI (`node mentor.mjs`) apresentando fatiamento paralelo por padrão e `--ordem` explícita compatível com `cmd-fila.ts`.

## 4. Desfecho e Validação Real

Todas as 5 famílias de verificação do Mentor foram aprovadas com sucesso (`node mentor.mjs verificar` -> APROVADO), sem estouros de tetos de texto ou quebras referenciais. Gates `tipos` e `testes` passaram com código de saída 0.

```json mentor:memoria
{
  "resultado": "Instruções normativas, modelos de atribuição, ajuda de CLI e README harmonizados com o protocolo de trabalho paralelo por slots, modelos intercambiáveis e First-to-Merge.",
  "aprendizados": [
    "A distinção entre lote sequencial consolidado e branches paralelas com entrega serial (First-to-Merge) elimina a ambiguidade de quando consolidar commits em um único push vs abrir PRs por tarefa.",
    "O alinhamento estrito do texto de ajuda do CLI com a implementação real de `cmd-fila.ts` reforça a convenção de fatias paralelas por padrão com `--ordem` explícita."
  ],
  "limites_conhecidos": [
    "O comando `mentor resolver-gerados` é especializado em arquivos de ciclo do Mentor e não arbitra código de produção; conflitos em código de produto devem ser evitados via planejamento com `plano.muda` disjunto."
  ]
}
```

