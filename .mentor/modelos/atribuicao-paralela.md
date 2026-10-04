# Modelo · Atribuição de Trabalho Paralelo por Slots

Este modelo padroniza a alocação de tarefas concorrentes e o handoff de sessões entre múltiplos agentes ou humanos utilizando Git Worktrees.

> **Regra de integridade:** este documento coordena a sessão e orienta os executores. O estado canônico e o progresso da tarefa residem exclusivamente nos arquivos JSON em `docs-mentor/tarefas/abertas/<ID>.json`. Este modelo **não** substitui os comandos do Mentor nem deve virar um catálogo paralelo de andamento.

---

## 1. Esqueleto Preenchível de Atribuição (por Slot / Sessão)

Copie este bloco para o rascunho de sessão, issue ou anotação operacional do lote:

```markdown
### Atribuição · [TASK-ID]

#### Metadados da Sessão
- **Tarefa e fonte do plano**: [ID emitido pelo Mentor, ex: TASK-CHORE-015 · caminho do plano: docs/rascunhos/planejamentos/.../fatia-a.md]
- **Sessão atual**: [Identificador do agente ou humano, ex: Agente-Alpha / Slot-A — opcional e substituível]
- **Slot / Diretório**: [Caminho do worktree exclusivo, ex: ../mentor-agent-slot-a]
- **Branch exclusiva**: [Nome do branch de trabalho, ex: codex/task-TASK-CHORE-015]
- **Base**: [Commit ou ref de partida atualizada, ex: origin/main @ 2938935]

#### Escopo e Contratos
- **Objetivo e aceite**: [Resultado observável e critérios de aceite com comandos de teste da fatia]
- **Escopo (`plano.muda`)**: [Lista disjunta de arquivos que esta sessão tem permissão para alterar]
- **Contratos compartilhados**: [Tipos, interfaces, esquemas ou rotas fornecidas/consumidas entre fatias]
- **Dependências de tarefas**: [IDs de tarefas que precisam ser integradas antes desta iniciar, ou "nenhuma"]
- **Recursos locais alocados**: [Portas de rede reservadas (ex: 3001), variáveis de ambiente locais, diretórios de log/saída]

#### Validação e Handoff
- **Validação local (Nível 1)**: [Comandos de testes unitários/fatia executados e status dos gates]
- **Evidências e logs**: [Caminhos de logs ou registros em docs/.evidencias/logs/]
- **Destino da integração**: [Ref ou branch de integração, ex: origin/main via merge serial na candidata]
- **Estado para handoff**: [Instruções claras para a próxima sessão se houver troca de operador: status do git, HEAD, pendências e recursos]
```

---

## 2. Exemplo Neutro Preenchido (Dois Slots em Paralelo)

O exemplo a seguir ilustra duas sessões paralelas trabalhando em fatias desacopladas de um mesmo épico:

### Slot A: Implementação de Backend

```markdown
### Atribuição · TASK-RF-042

#### Metadados da Sessão
- **Tarefa e fonte do plano**: TASK-RF-042 · docs/rascunhos/planejamentos/2026-10-04--servicos/fatias/fatia-backend.md
- **Sessão atual**: Sessão-Back-01 (operador: Claude Code / terminal 1)
- **Slot / Diretório**: ../meu-projeto-slot-a
- **Branch exclusiva**: codex/task-TASK-RF-042
- **Base**: origin/main @ 7f4a12c

#### Escopo e Contratos
- **Objetivo e aceite**: Expor endpoint `/api/metricas` com validação de payload e resposta JSON em conformidade com o contrato compartilhado.
- **Escopo (`plano.muda`)**:
  - `src/servicos/metricas.ts`
  - `src/rotas/metricas.ts`
  - `testes/servicos/metricas.test.ts`
- **Contratos compartilhados**: Esquema `MetricasResponse` definido em `docs/contratos/metricas.d.ts`.
- **Dependências de tarefas**: nenhuma (contrato de tipos já mergeado na main).
- **Recursos locais alocados**: Porta do serviço local `3001`, banco de testes local em memória SQLite `:memory:`.

#### Validação e Handoff
- **Validação local (Nível 1)**: `node mentor.mjs task gate TASK-RF-042 testes` (APROVADO: 14 testes de unidade).
- **Evidências e logs**: `docs/.evidencias/logs/TASK-RF-042-gate-testes-1728000000.log`.
- **Destino da integração**: `origin/main` via branch candidata serial.
- **Estado para handoff**: Árvore limpa, endpoint funcional com testes verdes; pronto para integração serial.
```

### Slot B: Implementação de Interface

```markdown
### Atribuição · TASK-RF-043

#### Metadados da Sessão
- **Tarefa e fonte do plano**: TASK-RF-043 · docs/rascunhos/planejamentos/2026-10-04--servicos/fatias/fatia-interface.md
- **Sessão atual**: Sessão-Front-02 (operador: Antigravity / terminal 2)
- **Slot / Diretório**: ../meu-projeto-slot-b
- **Branch exclusiva**: codex/task-TASK-RF-043
- **Base**: origin/main @ 7f4a12c

#### Escopo e Contratos
- **Objetivo e aceite**: Criar componente de visualização de métricas consumindo contrato de tipos com mock local.
- **Escopo (`plano.muda`)**:
  - `src/componentes/PainelMetricas.tsx`
  - `src/estilos/metricas.css`
  - `testes/componentes/PainelMetricas.test.tsx`
- **Contratos compartilhados**: Consome esquema `MetricasResponse` de `docs/contratos/metricas.d.ts`.
- **Dependências de tarefas**: nenhuma (mock local garante independência do backend em execução).
- **Recursos locais alocados**: Servidor de desenvolvimento UI na porta `3002`.

#### Validação e Handoff
- **Validação local (Nível 1)**: `node mentor.mjs task gate TASK-RF-043 testes` (APROVADO: 8 testes de componente).
- **Evidências e logs**: `docs/.evidencias/logs/TASK-RF-043-gate-testes-1728000050.log`.
- **Destino da integração**: `origin/main` após integração do Slot A (atualizar com `git merge origin/main && mentor resolver-gerados`).
- **Estado para handoff**: Se transferido para outra sessão: git status limpo, mock testado; aguardando conclusão do Slot A para atualizar base e integrar.
```

---

## 3. Protocolo de Transferência de Sessão (Handoff Seguro)

Quando uma sessão for interrompida ou transferida para outro agente ou humano:

1. **Parada sem perda**: a sessão que está saindo conclui a operação atual ou salva o trabalho em commit local no branch da tarefa. Não deixar a árvore em estado corrompido ou com conflitos não resolvidos.
2. **Atualização da ficha de atribuição**: preencher a seção `Estado para handoff` com o último commit, testes rodados e recursos ainda ativos (processos/portas).
3. **Reconhecimento pela nova sessão**: a nova sessão:
   - Lê `docs-mentor/tarefas/abertas/<ID>.json` e `<ID>.md` para carregar o plano integral e os gates já registrados.
   - Executa `git status` e confere que está no slot e branch corretos.
   - Retoma a implementação a partir do ponto exato onde a anterior parou, sem reiniciar a tarefa nem apagar evidências passadas.
