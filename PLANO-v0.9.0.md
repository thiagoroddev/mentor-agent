# Plano · v0.9.0: WIP no remoto, merge barrado no main

> Decidido com o humano em 13/09/26, a partir da TASK-SPIKE-003 do piloto, que ficou dias so' no
> disco. Este repositorio nao aplica as proprias regras: o plano e' convencao de trabalho.
> Substitui o item C6 do `PLANO-v0.8.0.md`. C1 a C5 continuam la', sem implementacao.

---

## 1. O problema

`processos/tarefa.md` proibia push de WIP: "quebraria pipelines de CI ou acionaria deploys de codigo
incompleto". A justificativa nao se sustenta. Deploy sai do `main`, e esteira vermelha num ramo de
trabalho nao afeta ninguem. O efeito real da regra foi trabalho pausado existir so' num disco.

Tres fatos medidos no piloto:

1. O repositorio do projeto e' **privado**; WIP no remoto nao expoe nada.
2. O `main` **nao tem protecao no GitHub** (plano gratuito, repositorio privado): a unica barreira e' o hook local.
3. O hook confere o ramo **em que se esta**, nao o ramo **que vai**. `git push origin outro:main` a
   partir de outro ramo passava pela trava do `main`; e o push da spike seria barrado por um commit
   antigo sem ID e por gates de codigo incompleto.

## 2. Decisoes do humano

| # | Decisao |
| :-: | :-- |
| D1 | WIP pode subir num ramo temporario. O que se proibe e' o merge no `main` |
| D2 | Para trazer o `main` a um ramo de trabalho: **merge, nunca rebase** (rebase troca o `commit_pausa` gravado e exige push forcado) |
| D3 | "Deixar de ser WIP" = a tarefa concluida no ramo, nao o nome do ramo |
| D4 | Dado sensivel nao vai para o git; o backup e' do humano, fora do pacote |

**Ramo privado em repositorio publico nao existe no GitHub**: todo ramo e todo o historico de um
repositorio publico sao legiveis. Separacao de visibilidade e' por repositorio, nunca por ramo.

## 3. O que muda

| # | Mudanca | Onde |
| :-- | :-- | :-- |
| W1 | O hook le os ramos enviados (entrada padrao do `pre-push`, o protocolo do git) e decide por eles, nao pelo ramo atual. Sem entrada (rodado a mao), vale o comportamento antigo | `cmd-hooks.ts` |
| W2 | Envio so' para `refs/heads/wip/*` passa **sem gates e sem checagem de ID**, e diz que o que barra e' o merge. Apagar ramo remoto tambem passa direto | `cmd-hooks.ts` |
| W3 | Envio para o ramo principal protegido e' barrado venha de onde vier | `cmd-hooks.ts` |
| W4 | Os gates saem do arquivo do hook e vao para o `hooks --pre-push`, que os pula no WIP. Hook antigo (com a linha `gates`) continua funcionando: o `pre-push` detecta e nao roda de novo | `cmd-hooks.ts`, `instalar.mjs` |
| W5 | `instalar --forcar` regrava o `.githooks/pre-push` gerado pelo mentor com o modelo novo | `instalar.mjs`, `mentor.mjs`, `cmd-pacote.ts` |
| W6 | `mentor pronto-para-merge --titulo "<titulo do PR>"`: sai 0 so' se toda tarefa citada no titulo esta **concluida** no ramo; PR Light passa; sem ID nem marca, falha. E' o passo da esteira no PR | novo `cmd-merge.ts`, `cli.ts` |
| W7 | `task retomar` recusa quando o ramo principal tem commits que o ramo atual nao tem, e manda fazer o merge antes (`--sem-merge` para seguir). Merge depois do `retomar` faz tudo o que veio do `main` parecer mudanca da tarefa | `cmd-tarefa.ts` |
| W8 | `task pausar --commit` sugere o push para `wip/<id>` | `cmd-tarefa.ts` |
| W9 | `doctor` lista os ramos `wip/` do remoto, para pausa nao virar ramo esquecido | `cmd-doctor.ts` |
| W10 | Normas: a regra de WIP em `processos/tarefa.md`; o fluxo WIP -> merge em `processos/entrega.md`; o passo da esteira no `skills/github-ci` | `.mentor/` |

**Limite honesto (W6):** sem protecao de ramo no GitHub, a checagem vermelha avisa e nao impede o
merge. Impedir de fato exige GitHub Pro/Team ou repositorio publico. O que segura e' a pratica de so'
mergear com a esteira verde.

**Seguranca (W6):** o titulo do PR e' texto de quem abre o PR. Na esteira ele entra por variavel de
ambiente, nunca interpolado direto no `run:` (injecao de comando).

## 4. O fluxo, do WIP ao main

```text
pausar --commit                       -> git push -u origin HEAD:wip/<id>     (sem gates, sem ID)
... outras tarefas entram no main ...
git fetch && git checkout wip/<id>
git merge origin/main                 -> antes do retomar (W7 recusa na ordem errada)
task retomar <ID>
trabalho, gates, validacao, task finalizar (portao 2), commit
push (portao 3) + PR com o ID no titulo
esteira: pronto-para-merge verde so' com a tarefa concluida no ramo (W6)
squash merge -> 1 commit no main; os wip(...) somem com o ramo
```

## 5. Criterios de aceite (cenario 28, com remoto de verdade e hook de verdade)

1. `git push` para `wip/x` com commit sem ID e gate vermelho passa.
2. `git push` do mesmo ramo para um nome comum roda os gates uma vez e barra o commit sem ID.
3. `git push origin trabalho:main` barra, estando fora do `main`.
4. Apagar ramo remoto passa sem gates.
5. `pronto-para-merge` falha com a tarefa pausada, passa depois de concluida, passa com `(light)` e falha sem ID.
6. `retomar` recusa com o `main` a frente; depois do `git merge`, retoma, e o `finalizar` nao acusa os arquivos que vieram do `main`.
7. `doctor` lista o ramo `wip/` do remoto; `pausar --commit` sugere o push.
8. `instalar --forcar` troca o hook antigo pelo novo.

## 6. Riscos

- Ler a entrada padrao no Windows pelo `sh` do Git: coberto pelo cenario 28, que usa o hook de verdade.
- Projeto com hook antigo nao pula gates no WIP ate' rodar `instalar --forcar` ou `hooks --instalar`. O `pre-push` avisa.
- `retomar` recusando por commit do `main` que so' mexe em documentos: o merge e' barato, e `--sem-merge` existe.
