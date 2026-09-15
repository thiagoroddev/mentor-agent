# Plano · v0.11.0 e v0.12.0: trabalho em paralelo, validacao com meio e o todo do epico

> Proposto em 14/09/26 a partir das sete anotacoes que continuam em `melhorias-do-pacote.md` do piloto
> (12/09 a 14/09). Conferido no codigo da 0.10.0: nenhuma tem mecanismo (secao 1). Substitui C1 a C4 do
> `PLANO-v0.8.0.md`. Este repositorio nao aplica as proprias regras; o plano segue a frente H da 0.10.0
> (pedido, sugestao, alternativas) e **espera o Portao 1**: as decisoes da secao 4 sao do humano.

---

## 1. O que ja' existe e o que falta

| # | Anotacao | Ja' existe | Falta (conferido) |
| :-: | :-- | :-- | :-- |
| 1 | Restricao fundadora (12/09) | `Plano.restricoes_reavaliadas` (`tipos.ts:217`) e uma frase em `processos/tarefa.md` | `iniciar` nao escreve, `finalizar` nao confere, nada conta, nada vira ADR |
| 2 | Composicao de epico fatiado (12/09) | `fatia_de`, `task fatiar`, epico como cabecalho do backlog; M6 barra o 3o spike depois de 2 inconclusivos | plano no nivel do epico; ponto de revisao entre fatias. M6 e' global, nao por tema, e os spikes 001 a 003 nao fecharam inconclusivos: fecharam "certos" |
| 3 | Meio de teste manual (13/09 02:47) | roteiro em prosa; o dossie avisa dispensa em tarefa sensivel (`cmd-auditar.ts:477`) | campo, artefato, registro por caso; a dispensa aceita 30 caracteres sem apontar teste |
| 4 | Roteiro de atualizar o pacote (13/09 03:30) | aviso de arvore suja no `iniciar`, trava de retroativa, classe `atualizacao-do-pacote` | a ordem (tarefa antes do `npm i`) nao esta' escrita; `instalar --forcar` nao olha tarefa |
| 5 | Evidencia com 10 caracteres (13/09 03:49) | `ev.length < 10` em `validar` (`cmd-tarefa.ts:1070`) e no `finalizar --validado-por-humano` (`:661`) | forma: passos e resultado observado |
| 6 | Fatia por contrato (14/09 19:57) | `skills/contratos-de-api` ja' descreve contrato primeiro e pontas em paralelo | **`task fatiar` encadeia sempre** (`depende_de: anterior`, `cmd-fila.ts:222`): a ferramenta grava a ordem obrigatoria que o humano recusou. Nada sobre registrar na hora |
| 7 | Onde vive o planejamento (14/09 21:02) | "uma tarefa, um ramo", `wip/`, `resolver-gerados` para contexto, dividas, riscos e recusas | ramo de planejamento, worktree, sessao por pasta. `resolver-gerados` nao funde `requisitos.json`; `pronto-para-merge` reprova PR de planejamento (sem ID e sem `light`) |

## 2. Pedido, sugestao e alternativas (frente H aplicada)

As anotacoes trazem solucao sugerida. Cada uma foi comparada; a coluna "pegaria" e' sobre o caso de origem.

### Onde vive o trabalho (item 7)

**Sugestao:** `plan/<data>-<tema>` curto com PR proprio; worktree por tarefa; `resolver-gerados` funde requisitos.

| Pratica | Pegaria? | Custo |
| :-- | :-- | :-- |
| Ramo curto e merge no mesmo dia (trunk-based development; DORA) | **Sim**: RF-60..63 teriam entrado no principal antes do fim da RF-045 | P |
| Uma pasta por ramo (`git worktree`), ou um clone por sessao | **Sim** para as duas janelas trocando ramo; o clone faz o mesmo com mais disco | P |
| Planejamento fora do repositorio (issues, Jira) | Sim, mas desfaz o desenho do pacote (registro versionado junto do codigo) | G |
| Ramo de planejamento fixo | **Nao**: diverge do principal (OPS-15). Descartado na propria anotacao | 0, e piora |

**Escolha:** a sugestao inteira, mais duas coisas que ela nao cobre: **colisao de ID** entre ramos paralelos
(fundir por `id` juntaria dois requisitos diferentes, calado) e o **limite de WIP**, que hoje e' contado por
ramo e com worktrees deixa de valer.

### Validacao manual (itens 3 e 5)

**Sugestao:** a tarefa constroi o meio (tabela de casos que gera teste e roteiro, esperado ao lado do resultado).

| Pratica | Pegaria? | Custo |
| :-- | :-- | :-- |
| Tabela de casos unica para teste e roteiro (table-driven tests; approval/golden, ApprovalTests) | **Sim**: rodar a tabela expos "Edificio Central, sala 302" na hora | P |
| Teste combinatorio / pairwise (NIST ACTS) | **Sim** para palavra isolada vs combinacao | P a M, do projeto |
| Harness de estados de tela (Storybook, pagina de fixtures) | Sim para tela; nao para dado real | M, do projeto |
| Registro de sessao exploratoria (SBTM: charter, passos, observado) | **Em parte**: da' forma a evidencia, nao cria o meio | P |
| Subir o minimo de caracteres | **Nao**: "ok, testei tudo e funcionou perfeitamente" passa | 0, e engana |

**Escolha:** tabela de casos + registro por caso; sem tabela, a forma SBTM minima (passos + observado).
Pairwise e harness ficam como orientacao: a ferramenta e' do projeto.

### Fatias (item 6)

**Sugestao:** contrato de dados por fatia, fatias sem `depende_de`, registro que nao espera merge.

| Pratica | Pegaria? | Custo |
| :-- | :-- | :-- |
| Fatias independentes (INVEST, o "I"; Cohn, *Splitting User Stories*) | **Sim** | P |
| Contrato primeiro, pontas em leque (contract-first, OpenAPI, Pact) | **Sim** | P |
| UI entra antes do dado atras de chave, ou "exibe se existir" (Fowler, feature toggles; branch by abstraction) | **Sim**, e deixa as duas pontas mergearem cedo | 0, orientacao |
| Ordem 1 -> 2 -> 3 (o que a IA propos e o que `fatiar` grava) | **Nao**: frontend espera backend | e' o defeito |

**Dever de contrariar:** "fatias sem `depende_de`" so' vale inteira quando o contrato e' **forma** (campo
opcional, a UI exibe quando existir). Quando o contrato e' **codigo** (tipos, esquema, fixture), duas fatias que
o escrevem cada uma conflitam e divergem. A pratica ai' e' o contrato como fatia pequena que entra primeiro
(horas), e as outras em leque dependendo **so' dela**. O plano declara qual dos dois casos e'.

### O todo do epico (item 2)

**Sugestao (analise de 12/09):** nenhuma formalizada; o C4 da 0.8.0 pedia `composicao_do_epico` na 3a fatia.

| Pratica | Pegaria? | Custo |
| :-- | :-- | :-- |
| Hipotese do epico com sinal de desvio (SAFe Epic Hypothesis Statement; Lean UX) | **Sim**, se nome canonico e estado da arte forem do todo: "VRP" no epico traz o solver | P |
| Pivotar ou perseverar ao fim de cada fatia (Lean Startup; revisao de iteracao) | **Sim**: a 2a fatia ja' mostrava a direcao | P por fatia |
| Walking skeleton / tracer bullet (Cockburn; Hunt e Thomas) | **Em parte**: valida integracao cedo, nao a escolha do algoritmo | 0, orientacao |
| Revisao de estrategia depois de 2 inconclusivos (hoje) | **Nao**: os spikes fecharam conclusivos, na direcao errada | ja' existe |

**Escolha:** plano do epico antes da primeira fatia + composicao ao fim de **toda** fatia (nao so' da 3a: o
erro de origem era visivel na 2a, e a pergunta custa um campo).

### Restricao fundadora (item 1)

**Sugestao (M3):** campo no plano; tres reconfirmacoes viram ADR.

| Pratica | Pegaria? | Custo |
| :-- | :-- | :-- |
| Lista de restricoes do projeto, revisada (arc42 secao 2, "Constraints") | **Sim**, se consultada ao planejar | M: registro novo |
| Registro de premissas com data de validacao (RAID log) | Sim, igual a lista | M |
| ADR com gatilho de revisao (Nygard; MADR) | **Nao** ate' virar ADR: as tres primeiras passam | P |
| Campo no plano, so' presenca (hoje) | **Nao**: ninguem pede | 0 |

**Escolha:** a sugestao, com a lista **derivada** dos planos (sem registro novo): o `iniciar` pre-preenche as
restricoes ja' reconfirmadas, a contagem sai delas, e a 3a reconfirmacao exige ADR.

## 3. O que muda

### Frente P · onde vive o trabalho (item 7)

| # | Mudanca | Onde |
| :-- | :-- | :-- |
| P1 | **Regra de destino.** Codigo e registro da tarefa: ramo dela. O que o fechamento gera (`achados_encaminhados`, `tarefas_geradas`): ramo dela. Requisito novo, tarefa nova, fatiamento, rascunho, anotacao: `plan/<aaaa-mm-dd>-<tema>` a partir do principal atualizado, PR proprio, merge no mesmo dia. Ramo de planejamento fixo nao existe | `processos/trabalho-em-paralelo.md` (novo) |
| P2 | `task nova`, `req nova`, `task fatiar` e `anotar` **avisam** quando o ramo atual nao e' o principal nem `plan/*` e ha' tarefa em execucao nele, com o comando `git worktree add ../<pasta>-plan -b plan/<data>-<tema> origin/<principal>`. Nao avisam com `--origem <ID em execucao>` | `cmd-tarefa.ts`, `cmd-requisito.ts`, `cmd-fila.ts`, `cmd-anotar.ts`, novo `ramos.ts` |
| P3 | `task finalizar` **avisa** tarefa criada desde o `commit_base` que nao esta' em `tarefas_geradas` nem e' fatia da propria, e requisito novo sem vinculo com a tarefa: planejamento preso no ramo | `cmd-tarefa.ts` |
| P4 | **Marca `(plano)`**: `<tipo>(plano): <descricao>`. `pronto-para-merge` passa quando todo arquivo que o ramo muda desde o merge-base com o principal e' registro de planejamento (`requisitos/`, `tarefas/abertas/*.json` em estado `aberta`, `rascunhos/`, `melhorias-do-pacote.md`, `referencias.json`, `invariantes.json`, vistas geradas); recusa nomeando o arquivo fora da lista ou a tarefa que mudou de estado. `--base` opcional, padrao `origin/<principal>` | `cmd-merge.ts`, `tipos.ts`, `skills/github-ci` (`fetch-depth: 0`) |
| P5 | `resolver-gerados` funde `requisitos.json`, `referencias.json` e `invariantes.json` por `id` (reusa `mesclarValores3Way`; os blocos repetidos de dividas e riscos viram um laco), poe `requisitos/pendentes.md` e `implementados.md` no `git add`; `instalar` acrescenta `merge=ours` para as duas vistas | `cmd-resolver.ts`, `instalar.mjs` |
| P6 | **Colisao de ID.** Os IDs vem das refs conhecidas (`ids.ts`); dois ramos sem `fetch` geram o mesmo `RF-64`. `resolver-gerados` recusa fundir item com mesmo `id` ausente na base e com enunciado ou titulo diferente nos dois lados, e lista os IDs para renumerar; idem para add/add em `tarefas/abertas/<ID>.json`. Norma: `git fetch` antes de registrar, push do `plan/` logo depois | `cmd-resolver.ts`, P1 |
| P7 | **Worktree.** Norma: uma sessao por pasta; tarefa em worktree propria, pasta principal no principal para planejar; na worktree, `npm ci`, e o que esta' fora do git (saidas do laboratorio, `.env`) nao vai junto. `task iniciar` no ramo principal avisa. `doctor` em worktree ligada lista as worktrees e seus ramos, avisa `node_modules` ausente e `contexto.laboratorio.saidas` que nao existe ali, e **soma as tarefas em execucao lendo o disco de cada worktree** contra `limites.em_execucao` | P1, `cmd-tarefa.ts`, `cmd-doctor.ts` |
| P8 | `ramos.ts` e' a fonte unica de ramo atual, principal e "dentro de repositorio". Hoje `existe(join(raiz, '.git'))` se repete em 7 lugares (`ids.ts` x3, `cmd-hooks.ts` x2, `cmd-init.ts`, `cmd-resolver.ts`) e o `doctor` ja' usa `rev-parse` pelo motivo certo | `ramos.ts` e os sete usos |
| P9 | Saem de `entrega.md` para `trabalho-em-paralelo.md`: prova por arvore em squash e resolucao de gerados (cerca de 1.200 caracteres). "Uma tarefa, um ramo" aponta para la' | `processos/entrega.md` |

### Frente A · atualizar o pacote (item 4)

| # | Mudanca | Onde |
| :-- | :-- | :-- |
| A1 | Secao **Atualizar o pacote**, em ordem: principal atualizado (ou worktree) -> `task nova --tipo CHORE --titulo "atualizar mentor-agent para X.Y.Z"`, `puxar`, `iniciar` -> `npm i -D mentor-agent@X.Y.Z` e `npx mentor instalar --forcar` -> aviso de normas e "Para atualizar" do CHANGELOG -> `verificar`, `doctor`, gates -> `finalizar` e commit com o ID. O porque, medido: com a ordem trocada o `commit_base` ja' contem a mudanca e a tarefa fecha sem diff (CHORE-016 contra CHORE-019 e 020) | `processos/inicializacao.md` (ja' carrega em "atualizacao do pacote") |
| A2 | `instalar --forcar` em projeto com `docs-mentor/` e sem tarefa em execucao que cite `mentor-agent`, `.mentor` ou "pacote" no titulo ou no `plano.muda`: **recusa** com o roteiro. `--sem-tarefa "<motivo>"` (30 caracteres) segue. Primeira instalacao nao e' conferida | `instalar.mjs` |
| A3 | A recusa de retroativa, quando os arquivos declarados sao `.mentor/`, `package.json` ou lockfile, nomeia o roteiro em vez de so' oferecer `--retroativa` | `cmd-tarefa.ts` |

### Frente V · validacao manual com meio (itens 3 e 5)

| # | Mudanca | Onde |
| :-- | :-- | :-- |
| V1 | `plano.meio_de_validacao` em tarefa sensivel (`categoriasSensiveis`) ou com validacao manual ativa, com marcador: `o_teste_cobre` (`arquivo > nome` do teste que prende as combinacoes, ou `null`), `por_que_nao_basta` (tela, dado real, servico ao vivo, combinacao; `null` se o teste cobre), `meio` (`tabela-de-casos` \| `fixture` \| `prototipo` \| `harness` \| `passos`), `artefato` (o que a tarefa constroi, ou `null` com `passos`), `casos` (tabela compartilhada com os testes, ou `null`) | `cmd-tarefa.ts`, `tipos.ts`, `esquemas/tarefa.json` |
| V2 | `finalizar` confere: `artefato` e `casos` existem; `o_teste_cobre` resolve como criterio de aceite. Plano sem o campo (iniciado antes) nao e' cobrado | `cmd-tarefa.ts` |
| V3 | **Dispensa em tarefa sensivel aponta o teste**: alem dos 30 caracteres, exige `o_teste_cobre` que resolve. E' o caso BG-017 (dispensa com 9 palavras isoladas testadas) | `cmd-tarefa.ts` (`exigirMotivoDeDispensa`) |
| V4 | **Validacao por casos**: `task validar <ID> --aprovado --casos <arquivo>` le JSON `[{ caso, esperado, observado }]`, CSV ou tabela Markdown com essas colunas. Recusa caso sem `observado`; recusa `observado` diferente de `esperado`, listando (divergencia e' defeito, nao aprovacao). Grava `{ arquivo, total, conferem }` no gate. Com `meio: tabela-de-casos`, `--casos` e' obrigatorio | `cmd-tarefa.ts`, novo `casos.ts` |
| V5 | ⚠️ **Evidencia com forma**: sem `--casos`, `validar --aprovado` e `finalizar --validado-por-humano` exigem `--passos "a\|b"` (dois ou mais) e `--observado` (30 caracteres). `--evidencia` vira nome antigo de `--observado` e continua exigindo `--passos`. Tarefa ja' validada nao e' conferida de novo | `cmd-tarefa.ts`, `cli.ts` |
| V6 | Dossie: meio, casos (total e conferem), passos; o fato de dispensa em tarefa sensivel cita o teste apontado | `cmd-auditar.ts` |
| V7 | `processos/validacao.md` (novo) recebe a secao de validacao manual de `tarefa.md` (cerca de 4.200 caracteres) e a regra: **o teste em codigo da' a garantia; se o que existe nao basta, a tarefa constroi o meio.** "Valide no app" sem meio e' proibido. O modelo de roteiro ganha "casos: arquivo" e "esperado \| observado" | `processos/validacao.md`, `processos/tarefa.md` |

### Frente F · fatias por contrato (item 6)

| # | Mudanca | Onde |
| :-- | :-- | :-- |
| F1 | ⚠️ `task fatiar` **deixa de encadear**: fatias nascem sem `depende_de`. `--ordem "1>2,1>3"` declara dependencia real e exige `--motivo-ordem` (o arquivo ou simbolo que uma usa e so' a outra cria), gravado em `ordem_motivo`. `task nova --fatia-de X --depende <irma>` pede o mesmo motivo | `cmd-fila.ts`, `cmd-tarefa.ts`, `tipos.ts` |
| F2 | `plano_do_epico.contrato_entre_fatias`: `forma` (tipos, campos opcionais, fixtures; `null` se as fatias nao trocam dado), `tipo` (`forma` \| `codigo`), `onde_vive`, `fatia_que_cria`. `iniciar` de fatia mostra o contrato; `finalizar` da fatia que cria confere que `onde_vive` existe | `cmd-tarefa.ts` |
| F3 | Norma: registro de requisito e tarefa **nao espera** merge nem ramo. Pendencia aprovada se registra na hora, no `plan/` (P1); conflito se resolve com `resolver-gerados` (P5) | `processos/rascunho.md`, `processos/tarefa.md` |

### Frente E · o todo do epico (item 2)

| # | Mudanca | Onde |
| :-- | :-- | :-- |
| E1 | `task fatiar` escreve no pai `plano_do_epico` com marcador: `objetivo` (onde a soma chega), `problema_canonico`, `estado_da_arte` (o que resolve o todo, e por que nao), `hipotese`, `sinal_de_desvio`, `contrato_entre_fatias` (F2), `restricoes_reavaliadas` (R1). `iniciar` da primeira fatia recusa com marcador. Epico sem o campo: `iniciar` de fatia escreve o esqueleto; recusa se nenhuma fatia foi concluida, so' avisa se ja' houve | `cmd-fila.ts`, `cmd-tarefa.ts`, `tipos.ts` |
| E2 | Toda fatia ganha `plano.composicao`: `o_que_esta_fatia_ensinou_sobre_o_epico`, `a_direcao_se_mantem` (booleano), `porque`. `finalizar` recusa marcador. Com `false`, o `iniciar` das irmas recusa ate' `--estrategia-revisada --motivo`, que grava a revisao em `plano_do_epico.revisoes[]` (reusa a flag do M6) | `cmd-tarefa.ts` |
| E3 | `iniciar` de SPIKE com `depende_de` outro SPIKE e sem `fatia_de` avisa: cadeia de spikes e' epico sem plano. E' o caso de origem, que nao tinha `fatia_de` | `cmd-tarefa.ts` |
| E4 | Dossie: epico com fatia no lote mostra o plano do epico e a composicao de **todas** as fatias; "ja' medido" aponta direcao caida | `cmd-auditar.ts` |

### Frente R · restricao fundadora (item 1)

| # | Mudanca | Onde |
| :-- | :-- | :-- |
| R1 | `iniciar` escreve `restricoes_reavaliadas` em SPIKE e G/XG (gatilho do `estado_da_arte`) e no plano do epico: `[{ restricao, onde_foi_escrita, o_que_elimina_nesta_tarefa, reconfirmada }]`, **pre-preenchido** com as restricoes ja' reconfirmadas, texto identico, com marcador no resto. `[]` e' resposta legitima | `cmd-tarefa.ts`, novo `restricoes.ts` |
| R2 | `finalizar` recusa: marcador; entrada sem onde ou sem o que elimina; `reconfirmada` nao booleano; `reconfirmada: false` sem ADR em `adrs` (restricao que cai e' decisao cara de reverter, e o README que a escreveu continua dizendo o contrario) | `cmd-tarefa.ts` |
| R3 | `restricoes.ts` agrupa reconfirmacoes das concluidas pelo texto normalizado, ou pelo ID quando cita `ADR-`/`INV-`. `finalizar` recusa a **3a reconfirmacao** sem ADR, nomeando as anteriores. `doctor` lista as que tem 2 ("a proxima vira ADR") | `restricoes.ts`, `cmd-tarefa.ts`, `cmd-doctor.ts` |
| R4 | Dossie: restricoes do lote com contagem; fato quando `estado_da_arte.motivo_descarte`, `alternativas_profissionais` ou `discordancia` citam restricao ("sem backend", "restricao", "nao pode", "README", "package.json") e `restricoes_reavaliadas` esta' vazia. Aviso ao auditor, nao recusa | `cmd-auditar.ts` |

### Normas e tetos

| # | Mudanca |
| :-- | :-- |
| N1 | `processos/tarefa.md` (15.437 de 15.500): perde a validacao manual (V7), ganha "Epico e fatia" (E1, E2, F1, F2) e o mecanismo da restricao (R), e fica abaixo do teto atual |
| N2 | `processos/entrega.md` (7.598 de 8.000): perde P9, ganha um ponteiro |
| N3 | `nucleo.md` (9.149 de 9.200): §2 ganha a marca `(plano)` e "com o meio que a tarefa constroi" no item de validacao; §9 ganha duas linhas (validacao manual; planejar com tarefa aberta, worktree, conflito em gerado). Excecao sobe para 9.600, com motivo |
| N4 | `processos/rascunho.md` (F3), `processos/inicializacao.md` (A1), `skills/github-ci` (P4) |
| N5 | Os cenarios 23 a 25 e 29 reaproveitam o esqueleto do `iniciar` e passam a preencher os campos novos |

**Proporcionalidade.** Sete anotacoes, quatro incidentes medidos (BG-017, CHORE-016/019, RF-045..048,
SPIKE-001..003) e dois defeitos de ferramenta (`fatiar` encadeia, `resolver-gerados` ignora requisitos).
Proponho quatro campos de plano e um de tarefa, uma marca de titulo, flags novas em quatro comandos que
ja' existem, tres modulos pequenos (`ramos.ts` junta sete copias; `casos.ts` le a tabela; `restricoes.ts`
conta) e dois processos novos que nascem **de texto que sai de arquivos no teto**. Nenhum comando novo.
E' grande para uma versao; por isso a secao 4 propoe duas.

## 4. Decisoes para o humano

| # | Decisao | Recomendo | Por que |
| :-: | :-- | :-- | :-- |
| D1 | Uma versao ou duas | **Duas.** 0.11.0 = P, A, V e F3 (operacao, incidentes de 13 e 14/09, risco de perder trabalho); 0.12.0 = F1, F2, E, R (o que o Portao 1 pede) | tres mudancas de comportamento de cada lado; o piloto absorve uma leva por vez |
| D2 | `instalar --forcar` sem tarefa: recusar ou avisar | **Recusar**, com `--sem-tarefa` | o aviso de arvore suja ja' existe e nao segurou a CHORE-016. O C2 da 0.8.0 propunha aviso |
| D3 | Evidencia com forma em toda validacao aprovada ou so' em tarefa sensivel | **Toda** | "ok, testei" e' vazio em qualquer tarefa; o custo e' uma flag |
| D4 | Planejamento: marca nova `(plano)` ou ampliar a lista fechada do Light | **`(plano)`** | Light e' "sem registro"; planejamento **cria** registro, e a checagem de arquivos do P4 so' faz sentido com marca propria |
| D5 | `fatiar` sem encadear por padrao | **Sim** | depende_de so' para dependencia real e' a regra; padrao encadeado e' a ferramenta decidindo por quem fatia |

## 5. Criterios de aceite

**Cenario 30 · trabalho em paralelo e atualizacao** (remoto bare e worktree de verdade)

1. Em ramo de tarefa com tarefa em execucao, `task nova` e `req nova` avisam e nomeiam `plan/`; com `--origem <ID em execucao>` e em `plan/x`, nao avisam.
2. `finalizar` avisa tarefa criada no ramo fora de `tarefas_geradas`.
3. `pronto-para-merge --titulo "docs(plano): ..."` passa com so' requisito e tarefa aberta nova; recusa com `src/app.ts` no diff, nomeando; recusa tarefa que mudou para concluida.
4. `resolver-gerados` funde `RF-10` de um ramo e `RF-11` do outro e regenera `pendentes.md`; recusa `RF-10` criado nos dois com enunciados diferentes, listando o ID.
5. Numa worktree: `task nova`, `iniciar`, `gate`, `finalizar`, `hooks --pre-push` e `resolver-gerados` funcionam; `doctor` lista as worktrees, avisa saida do laboratorio ausente e soma as tarefas em execucao das duas pastas.
6. `task iniciar` no ramo principal avisa.
7. `instalar --forcar` sem tarefa recusa com o roteiro; com "atualizar mentor-agent" em execucao, instala; com `--sem-tarefa` e motivo, instala.
8. Retroativa com `.mentor/` declarado cita o roteiro.

**Cenario 31 · validacao com meio**

1. `iniciar` de tarefa sensivel escreve `meio_de_validacao` com marcador; tarefa nao sensivel sem validacao ativa, nao.
2. `validar --aprovado --evidencia "ok, testei"` recusa; com `--passos "a|b" --observado "<30+>"` aprova e grava os passos.
3. `--casos` com caso sem `observado` recusa; com divergencia recusa listando; tudo conferindo aprova e grava total e conferem, nos tres formatos.
4. `meio: tabela-de-casos` sem `--casos` recusa.
5. Dispensa em tarefa sensivel sem `o_teste_cobre` que resolve recusa; com teste que resolve, aceita.
6. `finalizar` recusa `artefato` inexistente; tarefa sem o campo (anterior) finaliza.
7. Dossie mostra meio, casos e o teste apontado na dispensa.

**Cenario 32 · epico, fatias e restricoes**

1. `fatiar` sem `--ordem` cria fatias sem `depende_de`; `--ordem "1>2"` sem motivo recusa; com motivo, grava.
2. `fatiar` escreve `plano_do_epico`; `iniciar` da primeira fatia recusa ate' preenchido; epico antigo com fatia concluida so' avisa.
3. `finalizar` de fatia recusa `composicao` com marcador; `a_direcao_se_mantem: false` faz o `iniciar` da irma recusar; `--estrategia-revisada --motivo` libera e grava a revisao.
4. `finalizar` da fatia que cria o contrato recusa `onde_vive` inexistente.
5. SPIKE com `depende_de` SPIKE e sem `fatia_de` avisa.
6. SPIKE e G escrevem `restricoes_reavaliadas` pre-preenchida com as reconfirmadas antes.
7. `reconfirmada: false` sem ADR recusa; 3a reconfirmacao sem ADR recusa nomeando as anteriores; citando `ADR-0001`, aceita.
8. Dossie mostra o plano do epico com as composicoes e o fato de descarte por restricao sem reavaliacao.

## 6. Riscos

- **Aviso de ramo vira ruido** em projeto que nao usa `plan/`. So' avisa com tarefa em execucao no ramo; se medir ruido no piloto, vira opcao do contexto.
- **`pronto-para-merge` com `(plano)` precisa de historico na esteira**: sem `fetch-depth: 0` nao ha' merge-base. A recusa diz isso, e o modelo do `skills/github-ci` muda junto.
- **Colisao de ID continua possivel.** O resolver so' impede a fusao calada; renumerar e' a mao.
- **Worktree**: dado fora do git nao vai junto, `node_modules` por pasta ocupa disco, `core.hooksPath` e' compartilhado. O cenario 30 prova o caminho feliz no Windows.
- **Forma nao e' verdade.** Passos genericos e observado inventado continuam possiveis; a forma so' torna a mentira mais cara e visivel. A tabela de casos e' o que muda de patamar, e so' onde o meio for tabela.
- **`instalar --forcar` recusando** atrasa correcao urgente do pacote: `--sem-tarefa` existe, e o motivo so' aparece na tela (nao ha' tarefa onde gravar).
- **Contagem por texto normalizado**: reescrever a frase zera a contagem. O pre-preenchimento reduz; o auditor confere pela R4.
- **Composicao protocolar** ("sim, mantem" em toda fatia): mesmo limite da `discordancia`. O dossie mostra a soma, e o sinal de desvio escrito antes da primeira fatia e' o que da' contra o que comparar.
- **`fatiar` sem encadear** muda o backlog de quem fatiar depois da 0.12.0. Epicos existentes nao mudam.
- Projeto que so' carrega `tarefa.md` deixa de ver a validacao manual: ponteiro no lugar e linha no §9 do nucleo.

## 7. Fica fora

- C5 do `PLANO-v0.8.0.md` (Portao 2 sem mecanismo): nao esta' entre as anotacoes pendentes.
- Renumerar ID colidido por comando.
- O mentor criar a worktree (`task iniciar --worktree`): o git ja' faz, e a pasta e' decisao do humano.
- Converter por comando uma cadeia de spikes ja' existente em epico.
- Trava contra duas sessoes na mesma pasta: nao ha' mecanismo confiavel; norma e worktree resolvem.
- Pairwise e harness de tela: ferramenta do projeto, citadas em `processos/validacao.md`.
