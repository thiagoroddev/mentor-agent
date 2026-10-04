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
