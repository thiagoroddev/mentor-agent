# TASK-CHORE-015 · Protocolo e atribuicao por slots

Plano de referencia: docs/rascunhos/planejamentos/2026-10-04--trabalho-paralelo-por-slots/fatias/fatia-a-protocolo.md
<!-- mentor:plano:inicio sha256="1bd8ca0f60f7824a1d88ec25953d480908bad4bc49363433b0c4a6ccafb212e1" -->

# Fatia A: Protocolo e modelo de atribuição por slots

## Resultado e dependências

Primeira entrega do épico. Fornece o contrato operacional que B/C/D consomem; qualquer agente pode executá-la. Carga prevista M/M, cerimônia Standard. Não modifica comandos, esquemas ou estado de tarefas.

## Mudança arquivo por arquivo

- `.mentor/processos/trabalho-paralelo.md`: frontmatter de carregamento para sessões simultâneas, worktrees, divisão de tarefas e handoff. Incorporar o protocolo 02 com papéis temporários, invariantes e cobertura real do resolvedor. Apresentar slots reutilizáveis como opção de uso frequente, mantendo worktree por tarefa como alternativa.
- `.mentor/modelos/atribuicao-paralela.md`: modelo preenchível de lote/sessão com campos do contrato 02. Incluir exemplo neutro com tarefa, objetivo, slot, branch, base, arquivos, contratos, dependências, recursos e prova. Identificação do modelo é opcional; nenhum rótulo determina responsabilidade futura. Estado e progresso continuam nos JSONs.
- `docs/padroes-de-stack/git.md`: padrão deste repositório, consultado antes de propor trabalho com Git. Registrar branches por tarefa, prefixo vigente, regra de branch já em checkout, recursos compartilhados e convenções de validação. Política de PR/main ainda sem resposta no contexto permanece decisão em aberto, sem preenchimento automático.

Os links dos processos existentes serão feitos por D, preservando ownership exclusivo. Não criar skill nova para cada fase nem arquivo de configuração que duplica task/branch.

## Método e aceite

Reusar os processos existentes e os documentos 01/02. Revisar exemplos em sequência: preparar base, cadastrar IDs, atribuir dois/três slots, iniciar tarefas diferentes, trocar uma sessão e integrar um candidato. Verificar que nenhum passo exige um modelo específico, checkout de main em cada slot ou apagamento do trabalho anterior.

A prova é documental e operacional; não criar teste de busca de frases. B/E comprovam o comportamento Git/CLI. Registrar limites do exemplo e motivo de ausência de ADR vigente; se uma decisão nova justificar ADR formal, refiná-la antes de adicionar esse artefato ao escopo.

## Handoff para B/C/D

Entregar os três arquivos e informar o contrato estável: diagnóstico somente de leitura, limite local, cadastro inicial sequencial e integração de um candidato por vez. Mudança posterior desse contrato requer avaliar as fatias consumidoras. Conservar estudo integral e memória na tarefa vinculada.

## Critérios de aceite

1. Qualquer modelo pode ocupar qualquer slot e assumir planejamento, implementação ou integração por tarefa. Prova: CP-01: revisão do protocolo e exercício de atribuição/handoff.
2. O protocolo cobre cadastro sequencial, contrato comum, branches únicas, recursos locais e integração serial. Prova: CP-02/CP-13: inspeção dos exemplos e contrato de atribuição.
3. O modelo de atribuição referencia TASK-ID e estudo integral, sem se tornar catálogo paralelo de andamento. Prova: CP-01: exercício de transferência preservando ID, branch e evidências.
4. O padrão Git local usa convenções existentes e conserva decisões de contexto ainda não tomadas como pendentes. Prova: Revisão comparada com docs/contexto.json e processos vigentes.

## Contrato portátil

O arquivo acompanhante `fatia-a-protocolo.contrato.json` contém escopo, aceite, riscos, reuso, habilidades e avaliação. Herdar os documentos normativos do épico e refinar somente os pontos que mudarem antes de iniciar a tarefa.

<!-- mentor:plano:fim -->

## Estudo Técnico e Implementação Detalhada

Esta fatia entrega a base normativa e documental para o trabalho paralelo de múltiplos agentes de IA e operadores humanos utilizando Git Worktrees e resolução semântica no Mentor.

### 1. Processo Normativo: `.mentor/processos/trabalho-paralelo.md`
- **Carregamento condicional (`carrega_quando`):** configurado para disparar em `sessões simultâneas, worktrees, divisão de tarefas ou handoff`.
- **Neutralidade de modelos:** estabelece explicitamente que qualquer modelo de linguagem (Codex Astra, Claude Code, Antigravity, etc.) ou operador humano pode ocupar qualquer slot e exercer qualquer papel (planejamento, implementação, revisão ou integração). A divisão física em `slot-a`, `slot-b` e `slot-c` é de infraestrutura de diretórios, totalmente desacoplada das fatias lógicas A, B, C.
- **Topologia de Worktrees:** documenta o isolamento de HEAD, índice (stage) e árvore de trabalho proporcionado pelo Git Worktree, pontuando os recursos não isolados automaticamente (dependências `node_modules`, arquivos `.env` ignorados, portas de rede como 3000/3001 e bancos locais).
- **Integração Serial e Resolução Semântica:** especifica o fluxo first-to-merge serial, onde branches candidatas realizam merge da base atualizada (`origin/main`), resolvem divergências em artefatos de controle via `mentor resolver-gerados` e conferem compulsoriamente a ausência de conflitos (`git diff --name-only --diff-filter=U`) e o estado staged (`git diff --cached`).

### 2. Modelo de Atribuição e Handoff: `.mentor/modelos/atribuicao-paralela.md`
- **Esqueleto preenchível:** padroniza os campos essenciais de uma sessão paralela (`Tarefa e fonte do plano`, `Sessão atual`, `Slot / Diretório`, `Branch exclusiva`, `Base`, `Objetivo e aceite`, `Escopo plano.muda`, `Contratos compartilhados`, `Dependências`, `Recursos locais`, `Validação Nível 1`, `Evidências` e `Estado para handoff`).
- **Exemplo neutro preenchido:** demonstra duas fatias concorrentes (Backend em Slot A e Frontend em Slot B) com contratos de tipos compartilhados, portas distintas (3001 e 3002) e independência operacional.
- **Princípio de verdade única:** o modelo funciona como guia efêmero de coordenação entre operadores; o estado formal da tarefa reside exclusivamente nos arquivos JSON em `docs/tarefas/abertas/<ID>.json`.

### 3. Padrão de Stack Git Local: `docs/padroes-de-stack/git.md`
- **Convenções acordadas:** branches exclusivas por tarefa (`<prefixo>/task-<ID>`), prefixo vigente de ambiente (`codex/`), uso de slots reutilizáveis de worktree, proibição de checkout forçado (`--force`) em branches ativas, resolução automática de gerados e obediência inegociável ao Portão 3 (autorização humana explícita antes de push remoto).
- **Decisões em aberto preservadas:** mantém explicitamente as decisões de estratégia de ramos, política de PR e revisores como pendentes, respeitando os campos nulos de `docs/contexto.json → versionamento` sem suposições arbitrárias.

---

## Handoff e Contratos para as Próximas Fatias (B, C, D)

- **Fatia B (`TASK-CHORE-016`):** consumirá a topologia de worktrees para implementar no `mentor doctor` o diagnóstico somente de leitura de tarefas ativas entre slots locais, alertando sobre possíveis atribuições duplicadas.
- **Fatia C (`TASK-CHORE-017`):** consumirá o fluxo de integração e staging para tornar o `mentor resolver-gerados` estrito em repositórios Git (retornando status 1 se restarem conflitos ou falhas de parse).
- **Fatia D (`TASK-CHORE-018`):** vinculará o novo processo e modelo às referências dos processos existentes (`tarefa.md`, `entrega.md`, `planejamento.md`), mantendo consistência e tetos de texto.

---

## Desfecho e Validação Real

- **Validação Estrutural e Tetos:** executado `node mentor.mjs verificar`. Todos os arquivos respeitam seus limites de caracteres (`trabalho-paralelo.md` com 4.231 caracteres vs teto 4.800; `git.md` com 3.481 caracteres vs teto 3.600; `atribuicao-paralela.md` com 6.270 caracteres vs teto 15.000). Veredito: APROVADO nas 5 famílias.
- **Critérios de Aceite Comprovados:**
  - Critério 0 (CP-01): Revisão do protocolo e modelo de handoff demonstrando neutralidade de modelos e papéis por tarefa.
  - Critério 1 (CP-02/CP-13): Cobertura completa de cadastro sequencial, contratos comuns, branches únicas, portas locais e integração serial.
  - Critério 2 (CP-01): Exercício de transferência de sessão preservando referências ao TASK-ID e evidências sem catálogo paralelo.
  - Critério 3: Alinhamento das convenções Git com processos vigentes e preservação dos campos pendentes em `contexto.json`.
- **Gates de Automação:**
  - `tipos` (`npx tsc --noEmit`): APROVADO (saída 0).
  - `testes` (`node testes/executar.ts --unidade`): APROVADO (saída 0, 32 testes de unidade passaram).
- **Manifesto do Pacote:** atualizado via `node mentor.mjs manifesto` (91 arquivos rastreados).

```json mentor:memoria
{
  "resultado": "Entrega do protocolo normativo de trabalho paralelo (.mentor/processos/trabalho-paralelo.md), modelo de atribuição por slots (.mentor/modelos/atribuicao-paralela.md) e padrão de stack Git local (docs/padroes-de-stack/git.md), fornecendo base estável para as fatias de diagnóstico, resolvedor e instrução.",
  "aprendizados": [
    "Worktrees isolam o índice e working tree mas compartilham hooks e objetos Git, exigindo disciplina com dependências e portas de rede.",
    "O modelo de atribuição deve ser puramente documental e voltado para coordenação humana/IA, preservando a verdade única nos JSONs do Mentor.",
    "Manter campos de versionamento abertos (null) no contexto evita que agentes imponham políticas de repositório não acordadas."
  ],
  "limites_conhecidos": [
    "O protocolo cobre o padrão de slots e handoff local; diagnósticos cruzados entre worktrees e resolvedor estrito de gerados serão entregues nas Fatias B e C."
  ]
}
```
