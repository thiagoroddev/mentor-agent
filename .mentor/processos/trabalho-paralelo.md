---
carrega_quando: sessões simultâneas, worktrees, divisão de tarefas ou handoff
---

# Processo · Trabalho Paralelo e Concorrência por Slots

`PLANEJAR LOTE → CADASTRAR IDS → ATRIBUIR SLOTS → ISOLAR EXECUÇÃO → INTEGRAR SERIAL`

Trabalho paralelo com múltiplos agentes ou humanos acelera entregas em fatias independentes sem abrir mão do rigor técnico. Opera com contratos comuns, disjunção estrita e integração serial.

---

## 1. Responsabilidades Temporárias e Neutralidade

1. **Papéis por tarefa**: qualquer modelo ou humano pode planejar, codificar, revisar ou integrar. Nenhuma IA tem exclusividade de stack ou função.
2. **Revisão independente**: sessão autora nunca emite seu próprio parecer como independente.
3. **Nomenclatura neutra**: `slot-a`, `slot-b`, `slot-c` são recursos físicos; fatias A, B, C são partes do plano. Nomes são desacoplados.

---

## 2. Topologia de Worktrees e Isolamento

Usa-se árvore de integração/planejamento e slots reutilizáveis via Git Worktree:

```text
meu-projeto/              # checkout de integração e planejamento sequencial
meu-projeto-slot-a/       # slot de execução (branch e tarefa exclusivas)
meu-projeto-slot-b/       # slot de execução
meu-projeto-slot-c/       # slot de execução
```
Worktree efêmera por tarefa é alternativa permitida.

- **Isolado**: HEAD, índice (stage), working tree e alterações não rastreadas.
- **Compartilhado**: `.git/objects`, refs, histórico e hooks.
- **Não isolado automaticamente**: `node_modules`, arquivos ignorados (`.env`), portas de rede, sockets, bancos e processos.
- **Regras locais**: rodar `npm ci` na criação do slot ou na mudança de dependências; reservar portas distintas por slot (`EADDRINUSE`); nunca usar `--force` para roubar branch ativa em outra árvore.

---

## 3. Contrato de Atribuição e Handoff

Toda sessão preenche `.mentor/modelos/atribuicao-paralela.md`.

- **Referência canônica**: o modelo orienta operador e IA; o estado real reside exclusivamente nos JSONs em `docs-mentor/tarefas/abertas/<ID>.json`. O modelo não vira catálogo paralelo de andamento.
- **Passagem de sessão (handoff)**: para alternar executor, interrompe-se a escrita, preserva-se o branch com estado limpo/salvo e informa-se: ID da tarefa, HEAD, gates executados e recursos alocados. Nova sessão lê o estudo integral e retoma sem reiniciar nem fechar a tarefa.

---

## 4. Cadastro, Início e Execução

1. **Cadastro sequencial**: planejar lote e gerar tarefas pai e fatias sequencialmente numa árvore de planejamento; disponibilizar IDs na base antes de codificar.
2. **Disjunção de escopo**: fatias paralelas nunca tocam os mesmos arquivos em `plano.muda`.
3. **Branch por tarefa**: criar da base atualizada sem checkout da main no slot (`git switch -c <prefixo>/task-<ID> origin/main`).
4. **Ciclo Mentor**: executar `task puxar <ID>`, vincular plano e `task iniciar <ID>`. Limite de 1 tarefa em execução por árvore local.
5. **Gates locais**: cada sessão executa os gates da sua própria fatia (Nível 1).

---

## 5. Integração Serial e Resolução Semântica

1. **Uma por vez**: primeiro candidato pronto entra na base. Demais atualizam suas branches após cada integração.
2. **Merge na candidata**:
   ```bash
   git fetch origin && git merge origin/main
   # Conflito em gerados (contexto.json, backlog.md, recusas.jsonl):
   node mentor.mjs resolver-gerados
   git diff --name-only --diff-filter=U  # vazio obrigatório
   git diff --cached                    # conferir arquivos preparados
   ```
3. **Revalidação**: se o merge alterou código ou dependências, reexecutar gates antes de concluir. Nunca presumir sucesso sem conferir o índice staged.

---

## 6. Reciclagem, Pausa e Recuperação

- **Reciclagem limpa**: liberar slot chaveando para branch neutro (`slot-idle`) após entrega. Nunca usar `reset --hard` ou `clean -fdx` para apagar alterações desconhecidas; não apagar branch sem confirmação de integração.
- **Pausa formal**: pausar com `task pausar <ID> --motivo "..."`. Para retomar após avanço da main, merge antes de `task retomar`. Nunca fazer rebase em branches com histórico de pausas.
- **Doctor**: diagnóstico somente de leitura entre worktrees locais do mesmo projeto relativo; não altera arquivos nem poda árvores.
