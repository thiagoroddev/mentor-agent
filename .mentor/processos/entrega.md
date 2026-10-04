---
carrega_quando: publicar, mexer em ramo, esteira, release ou reversão
---

# Processo · Entrega

O pacote diz o que precisa ser verdade; a ferramenta é convenção de stack
([`padroes-de-stack.md`](./padroes-de-stack.md)). Nada aqui nomeia GitHub, GitLab ou plataforma
alguma.

## Uma tarefa, um ramo

O ID da tarefa **já existe antes do trabalho**, então o ramo se chama por ele: `rf-014-exportar-csv`.
Nunca pela posição da fatia — a posição muda, o ID não.

**Padrão: uma tarefa por ramo.** O motivo é a regra de evidência, não estética: a conclusão de uma
tarefa é o link do run da esteira colado no registro dela. Se um ramo carrega três tarefas, o mesmo
link vai para três registros e prova *"as três juntas passaram"*, não *"esta passou"*.

**Exceção:** tarefas inseparáveis, quando uma mexe no código que a outra criou e separar produz um
ramo que não compila. Aí é um ramo só, com os dois IDs, e uma linha em cada registro dizendo que
foram entregues juntas.

### Épicos, fatias sequenciais e branches paralelas

- **Lote Sequencial Local:** Quando um mesmo operador executa um lote sequencial de fatias no mesmo ramo (`rf-014-epico`), faz commits atômicos por fatia (`task puxar` -> `iniciar` -> gate N1 -> `finalizar` -> `git commit`) e pode consolidar em um único `git push` ao término do lote, onde o pre-push valida o Nível 2.
- **Branches Paralelas e Integração Serial (CP-14):** Quando tarefas rodam em paralelo em slots distintos ([`processos/trabalho-paralelo.md`](./trabalho-paralelo.md)), cada branch de tarefa (`task/<ID>`) é uma unidade independente com seu próprio PR ou entrega. A integração na linha principal é **serial** (*First-to-Merge*): a primeira branch é incorporada diretamente; a segunda sincroniza com `git merge origin/main`, resolve conflitos administrativos e valida sua fatia antes de integrar.

## A linha principal

**Sempre publicável** (guia OPS-20). Quebrada, consertá-la vem antes de qualquer funcionalidade.

Quando `contexto.json` exige PR em `revisao_antes_do_merge`, o hook barra envio direto à linha principal, e a IA não propõe nem faz merge local de ramo de trabalho na principal: ela só avança por `git pull`, depois do merge no remoto, e o caminho de uma tarefa pronta é subir o ramo e abrir o PR. Quando o projeto dispensa PR, o fluxo local declarado em `estrategia_de_ramos` vale. A classificação do projeto e o risco da mudança determinam REV e gates obrigatórios; autorização de fechamento/push continua exigida. Não reative PR como efeito colateral da auditoria.

**O que o hook de pre-push faz,** olhando os refs enviados: confere marca de tarefa, cobertura incremental contra os blobs do ref (inclusive outro ramo/worktree), evidência dos gates para a árvore enviada e os gates locais quando aplicáveis; depois **mostra** o `verificar`, sem barrar por achados não relacionados. Mudança auditável depois do parecer exige nova `REV`. Envio só para `wip/` passa direto. Light sem mudança auditável segue as checagens mecânicas; a marca `(light)` sozinha não libera conteúdo funcional.

**Prova por Árvore em Squash Merge:**
Quando o projeto adota merge por *squash*, o Git perde ancestrais e `git branch -d` recusa a exclusão. A evidência de entrega é a árvore incorporada: sincronize o ramo com a principal (`git merge origin/main`) e verifique se `git diff origin/main <branch>` está vazio ou se todos os arquivos modificados pela tarefa estão idênticos na linha principal. Somente com a árvore confirmada, exclua o ramo local com `git branch -D <branch>`.

**Resolução Semântica de Conflitos em Gerados:**
Conflitos concorrentes em arquivos derivados (`contexto.md`, `backlog.md`, `reserva.md`, `0-indice.md`), no log `recusas.jsonl` ou no modelo `contexto.json` são resolvidos pelo comando:
```bash
mentor resolver-gerados
```
Ele realiza a fusão semântica 3-way de `contexto.json` (preservando decisões de ambos os ramos), une linhas de `recusas.jsonl` e regenera as vistas markdown a partir do estado consolidado.
⚠️ **Limites e Veredito Estrito:** o resolvedor trata exclusivamente os arquivos de ciclo gerenciados pelo Mentor; ele **não arbitra código-fonte de aplicação**, cuja disjunção deve ser assegurada no planejamento. Se houver falha de parse ou qualquer conflito não resolvido restante no índice Git (`git diff --name-only --diff-filter=U`), o comando encerra com código de saída 1 e preserva os marcadores para inspeção, retornando código 0 apenas com o índice 100% limpo.

**Integrar cedo e com frequência** (OPS-15). Ramo aberto há semanas é a forma mais invisível de
desperdício, porque parece progresso.

## Planejamento independente e sessões isoladas (Worktrees)

Para permitir que requisitos, ideias, tarefas na reserva e anotações sejam registrados imediatamente sem ficarem reféns do ciclo ou da entrega de uma tarefa de código em andamento:

1. **Destino do planejamento:**
   - O código, narrativa, achados e gates de uma tarefa pertencem exclusivamente ao ramo dela.
   - Planejamento independente vai para um ramo curto `plan/<data>-<tema>` criado a partir da `main` atualizada.
   - O PR de planejamento leva a marca `(plano)` na posição de escopo do título, como `(light)` (ex.: `docs(plano): novo fluxo de checkout`).

2. **Worktrees do Git (uma pasta por sessão):**
   - Para rodar sessões paralelas ou registrar planejamento com a `main` protegida, use `git worktree add ../<pasta-da-sessao> <branch>`.
   - Cada pasta de worktree possui `HEAD` e índice próprios.
   - **Cuidados na worktree:** execute `npm ci` para instalar dependências quando houver `package-lock.json`; arquivos não rastreados de laboratório ou `.env` locais não são compartilhados automaticamente pelo Git e devem ser configurados conforme o projeto.

3. **Validação na Esteira de PRs `(plano)`:**
   - O comando `node mentor.mjs pronto-para-merge --titulo "$TITULO"` reconhece PRs de planejamento.
   - **Permitido:** novos requisitos, novas tarefas em reserva, atualizações de plano em tarefas abertas, rascunhos em `docs-mentor/` e regeneração de visões derivadas (`contexto.md`, `pendentes.md`, etc.).
   - **Bloqueado:** arquivos de código de produção/testes, alterações de gates/evidências, transições de tarefa para `em-execucao` ou `concluida`, e promoção manual de requisitos para `implementado`.


## Trabalho pausado (WIP)

Pausa só no disco se perde com o disco. `task pausar --commit` e `git push -u origin HEAD:wip/<id>`:
o envio para `wip/` não passa por gates nem checagem de ID. **O proibido é o merge**, e para voltar:

1. `git merge origin/main` no ramo WIP, **antes** do `task retomar` (ele recusa na ordem errada). Merge, nunca rebase: o rebase troca o `commit_pausa` gravado.
2. `task retomar`, trabalho, gates, `task finalizar`, PR com o ID no título.
3. A esteira roda `node mentor.mjs pronto-para-merge --titulo "$TITULO"`: verde só com a tarefa concluída no ramo. Squash merge; os `wip(...)` somem com o ramo.

Ramo privado em repositório público não existe: todo ramo e todo o histórico ficam legíveis. Dado sensível vai para outro repositório privado ou para fora do git, nunca para um ramo.

## O que a esteira barra

Construção quebrada · teste falhando · análise estática reprovada · vulnerabilidade crítica ·
cobertura abaixo do limiar declarado (OPS-18).

⚠️ **Barreira que pode ser ignorada sem registro não é barreira.** Ignorar exige risco aceito, com
prazo e responsável nominal.

**Um artefato, promovido entre ambientes** (OPS-17). Reconstruir por ambiente invalida tudo que foi
testado.

## Antes de existir o que publicar

O bloco `versionamento` do `contexto.json` se responde na fase **construção**, não em pré-lançamento.
Quando há o que publicar, já é tarde: o histórico foi feito de outro jeito.

```
ramo_principal · estrategia_de_ramos · revisao_antes_do_merge · quem_aprova
protecao_do_ramo_principal · esquema_de_versao · release_automatizado
esteira_barra[] · uma_tarefa_por_ramo · apaga_ramo_no_merge
```

## Publicar

**Reversão testada antes do primeiro deploy real** (OPS-22). Saber voltar é mais importante que
publicar rápido, e reversão só existe se já foi executada de verdade — não se declara, se exercita.

**Mudança de estrutura de dados exige atenção separada** (OPS-23): é a parte que a reversão de código
não desfaz. Passos compatíveis com a versão anterior, nunca destruir dado no mesmo passo que muda a
estrutura, e caminho de volta declarado.

**Publicação é operação registrada** (OPS-25): o que subiu, qual versão, quem autorizou, quando, e o
que observar depois.

**Estar em produção não é estar visível** (OPS-21). Publicar continuamente e liberar quando o negócio
decidir permite lote pequeno sem expor trabalho incompleto.

## Atualização de dependência

Chega em lote e a tentação é aprovar tudo junto. Julgue uma a uma: o que a versão nova muda · é
correção de segurança ou mudança de comportamento · a esteira ficou verde · é dependência de produção
ou de desenvolvimento.

**Ordem segura:** primeiro as de desenvolvimento, depois as de produção sem mudança de contrato, por
último as de mudança maior — essas sozinhas, uma por ramo.

## O que não é código, e por isso é esquecido

Existe uma classe de configuração que **nenhum script alcança**, porque vive na web da plataforma:

```
protecao do ramo principal · apagar ramo apos o merge · alertas de vulnerabilidade
atualizacoes automaticas de seguranca · segredos do ambiente de esteira
```

Ela mora em `contexto.configuracoes_de_plataforma`, e o `doctor` cobra. Sem isso, o aviso de
vulnerabilidade — que é a razão de existir do bot de dependências — simplesmente não acontece, e
ninguém percebe, porque nada falha.

## Depois do envio

Conferir o resultado da esteira daquele commit. **É o único passo posterior ao portão 3 do núcleo,**
porque acontece depois de todos eles. Não é autorização e não reprova nada: o poder dele é avisar.

## Versão: um nome, um commit, para sempre

**Tag não se reaponta**, nem antes de publicar: daqui não dá para saber quem já puxou. Correção
vira versão nova.

**Publicou, instale do remoto uma vez, num diretório vazio, como um estranho faria.** Copiar de uma
pasta vizinha exercita um caminho que ninguém mais percorre, e pula justamente o que falha: a tag no
remoto, o `files` do pacote, o que o gerenciador empacota.

⚠️ Medido aqui, no mesmo dia. Uma tag foi reapontada três vezes por quem a julgava rascunho, e ela
já estava publicada. O remoto não se moveu, porque git recusa sobrescrever tag existente sem
`--force`, mas o nome passou a significar **uma coisa aqui e outra lá**, e quem publicou não sabia.
Bastaria um `--force` para o estrago sair de local e virar público, sem erro na tela. E a instalação
por gerenciador nunca funcionou enquanto só se rodava da pasta local, apesar de documentada como se
funcionasse.
