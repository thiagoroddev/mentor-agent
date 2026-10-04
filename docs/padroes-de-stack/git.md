# Git                   Versionamento e trabalho concorrente · 2.x

## Decidido
- Branch exclusiva por tarefa: cada tarefa possui seu próprio branch nomeado como `<prefixo>/task-<ID>` (ou branch dedicada de épico).
- Prefixo ativo: o ambiente utiliza o prefixo configurado (ex.: `codex/`), puramente identificador e utilizável por qualquer modelo ou operador.
- Concorrência por Git Worktrees: slots reutilizáveis (`slot-a`, `slot-b`, `slot-c`) como opção de uso frequente; worktree efêmera por tarefa como alternativa válida.
- Checkout único: nunca usar `--force` para criar ou fazer checkout de branch que já esteja ativo em outro worktree.
- Isolamento de recursos locais: variáveis de ambiente ignoradas, portas locais e caches de build não são compartilhados mutavelmente entre slots ativos.
- Integração serial de candidatos: integrar uma branch candidata por vez, atualizando-a com a base antes da fusão.
- Resolução de conflitos em gerados: executar `mentor resolver-gerados` durante merges com conflitos em arquivos de metadados do Mentor.
- Conferência obrigatória pós-merge: validar ausência de conflitos não resolvidos (`git diff --name-only --diff-filter=U`) e arquivos preparados (`git diff --cached`).
- Revalidação pós-integração: se a atualização da base alterou código ou dependências na candidata, reexecutar os gates da tarefa antes de concluir.
- Nunca rebase em branches com pausas ou compartilhadas: integrações utilizam merge para preservar referências de commit (`commit_base` e `commit_pausa`).
- Portão 3 inegociável: nenhum push remoto é executado sem autorização humana explícita prévia.
- Decisões em aberto no contexto: política de PR vs merge direto na main, branch principal protegida e esteiras remotas permanecem campos em aberto (`contexto.json → versionamento`), sem suposição ou preenchimento automático.

## Por quê
- Worktrees mantêm índice e HEAD limpos para cada agente simultâneo sem overhead de clonagem completa.
- Branches exclusivas por tarefa garantem rastreabilidade 1:1 com os IDs gerenciados pelo Mentor.
- `mentor resolver-gerados` realiza a fusão 3-way semântica de metadados sem corrupção acidental de JSONs ou contagens.
- Preservar decisões de versionamento como nulas no contexto impede que automações adotem políticas de repositório não acordadas com o operador humano.

## Não usamos
- Não usamos rebase em ramos com histórico de pausas/retomadas do Mentor (invalida hashes gravados na tarefa).
- Não usamos checkout da mesma branch em múltiplos slots concorrentes.
- Não usamos `git clean -fdx` ou reset destrutivo para reciclar slot sem conferir alterações locais salvas.
- Não usamos papéis fixos de modelos vinculados a branches ou ferramentas.
- Não usamos push remoto sem autorização explícita do operador humano (Portão 3).

## Exemplo curto
```bash
# Preparar slot e criar branch de tarefa da base atualizada
git fetch origin
git switch -c codex/task-TASK-CHORE-015 origin/main

# Validar implementação local (Nível 1)
node mentor.mjs task gate TASK-CHORE-015 testes

# Integrar branch candidata com a base
git fetch origin
git merge origin/main
node mentor.mjs resolver-gerados
git diff --name-only --diff-filter=U
git diff --cached
```

## Revisar quando
- Quando o operador humano definir no `contexto.json` a estratégia de ramos (`versionamento.estrategia_de_ramos`) e política de PR/aprovações.
- Se o projeto adotar esteira remota com requisitos adicionais de proteção de branches ou assinatura de commits.
