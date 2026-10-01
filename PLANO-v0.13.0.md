# Plano · v0.13.0: correções do piloto, tetos e melhorias simples

> Aprovado pelo mantenedor em 01/10/26 (Portão 1), junto com o `PLANO-v0.14.0.md`, depois de duas
> revisões independentes do plano. Este repositório não aplica as próprias regras: o plano segue o
> formato dos anteriores e é conferido por `npm run verify` e por clone do piloto.

## 1. Problema

1. **O pacote está atrás do piloto.** O piloto (Eu Roteirizo) tem 20 correções em 29 arquivos do
   `.mentor/` (22 alterados, 7 novos), todos registrados em `docs-mentor/patches-do-pacote.json`.
   Um clone em outra máquina instala `mentor-agent#v0.12.0`, e qualquer `instalar --forcar` desfaz
   as correções.
2. **Tetos abaixo do uso real.** Quatro alvos estouraram no piloto, e as exceções locais criadas
   para compensar chegaram a rebaixar o teto do núcleo abaixo do pacote corrigido.
3. **Cinco anotações simples** do relatório de campo esperam desde 15/09/26.

## 2. Por que separado da v0.14.0

A v0.13.0 resolve o problema original (outra máquina) sem mudar como as ferramentas carregam nada,
e é toda conferida por teste automático. A v0.14.0 (carregamento igual nas três ferramentas) depende
de teste manual no Codex, no Claude Code e no Antigravity. Juntas, a correção esperaria o teste
manual, e um defeito na sincronização obrigaria a reverter as correções. Cada versão reverte sozinha.

## 3. Fora do escopo

Continuam como anotação no piloto, sem implementação aqui. Cada uma exige plano próprio, com
arquivos, formato e critérios:

- classificação sensível por campo declarado (`plano.sensivel`): formato, comportamento quando
  ausente e compatibilidade com tarefas antigas ainda não definidos;
- critério de requisito com teste, e requisito sem critério;
- evidência de critério e de validação no dossiê da auditoria;
- trava no `task iniciar` com a `main` local à frente do remoto;
- campos derivados fora do `contexto.json`.

A anotação "verificar aceita como aviso divergência citada em Corrigidas aqui" foi superada pelo
registro de patches com digest (`cmd-patches.ts`, conferido em `cmd-verificar.ts`): aceitar pelo
caminho citado reconheceria alteração posterior não registrada.

## 4. Frente A · Portar as 20 correções

**Inventário:** `docs-mentor/patches-do-pacote.json` do piloto (29 patches), conferido de novo por
hash entre os dois `.mentor/`. Nada fica de fora sem justificativa escrita.

| Tipo | Arquivos |
| :-- | :-- |
| Novos (7) | `scripts/cmd-patches.ts`, `cmd-plano.ts`, `cobertura-incremental.ts`, `executor-gates.ts`, `fingerprint.ts`, `politica-rigor.ts`, `revisao-incremental.ts` |
| Scripts alterados (13) | `arquivos.ts`, `cli.ts`, `cmd-auditar.ts`, `cmd-doctor.ts`, `cmd-gates.ts`, `cmd-hooks.ts`, `cmd-merge.ts`, `cmd-pacote.ts`, `cmd-tarefa.ts`, `cmd-verificar.ts`, `sensivel.ts`, `tipos.ts`, `vistas.ts` |
| Leis e tetos (2) | `nucleo.md`, `tetos.json` |
| Esquemas (2) | `esquemas/contexto.json`, `esquemas/tarefa.json` |
| Guia (1) | `guia/00-indice.md` |
| Processos (4) | `entrega.md`, `inicializacao.md`, `revisao.md`, `tarefa.md` |

Correções levadas: coordenadora de épico fecha pelas fatias · pre-push segue a REV do ref enviado ·
`iniciar` preserva o plano aprovado · índices de requisitos · entradas locais alheias ao escopo ·
sugestões de validação manual em protótipo · hash semântico de contexto · Fatias 1 a 3 (auditoria
incremental, REV, política de rigor) · marca `(plano)` · maiúsculas no `verificar` · data no
contexto · `pronto-para-merge` · reestruturação V5 · `## Desfecho` · `EISDIR` · plano integral ·
timeout de gates · pre-push com worktree.

**O que muda:**

1. Copiar os 29 arquivos.
2. Despersonalizar: `nucleo.md` ("Exceção autorreferente autorizada em 23/09/26" vira regra sem
   data); comentários de `cmd-verificar.ts` e `vistas.ts` deixam de citar tarefas do piloto;
   exemplo de `cmd-patches.ts` usa ID genérico.
3. Revisar o `git diff` arquivo por arquivo; `grep` por nome do projeto, `TASK-` e datas `/26`.
4. Portar os testes do piloto (`docs-mentor/melhorias-do-pacote.test.ts`, Vitest) para `testes/`,
   adaptados ao `node testes/executar.ts`. **Equivalência:** cada teste portado falha com o arquivo
   da v0.12.0 e passa com o portado.
5. `npm run manifesto`.

## 5. Frente C · Tetos (+30%)

**Regra:** novo teto = tamanho medido no piloto × 1,3, arredondado para a centena acima, em todo
alvo de `.mentor/tetos.json` que estourou. A base é o medido, não o teto antigo: 8.000 × 1,3 = 10.400
não cobriria os 14.348 do `contexto.md`.

| Alvo | Teto v0.12.0 | Medido no piloto | Novo teto |
| :-- | --: | --: | --: |
| `.mentor/nucleo.md` (exceção) | 9.200 | 11.591 | 15.100 |
| `.mentor/processos/tarefa.md` (exceção) | 17.500 | 20.910 | 27.200 |
| `docs-mentor/contexto.md` (regra) | 8.000 | 14.348 | 18.700 |
| `docs-mentor/tarefas/concluidas/*.md` (regra) | 10.000 | 43.286 (39 de 96 acima) | 56.300 |

**Exceções do piloto que deixam de ser necessárias.** Exceção do projeto vence a regra do pacote
(`cmd-verificar.ts`), então só sai a exceção cujo arquivo fica abaixo do novo teto efetivo:

| Exceção em `docs-mentor/tetos.json` | Teto local | Arquivo | Teto efetivo depois |
| :-- | --: | --: | --: |
| `.mentor/nucleo.md` | 11.000 | 11.591 | 15.100 |
| `.mentor/processos/tarefa.md` | 21.000 | 20.910 | 27.200 |
| `docs-mentor/contexto.md` | 16.000 | 14.348 | 18.700 |
| `concluidas/0-indice.md` | 25.000 | 20.303 | 56.300 |
| `*TASK-BG-030--estudo-humano.md` | 50.000 | 43.286 | 56.300 |
| `*TASK-BG-028--estudo-humano.md` | 36.000 | 32.117 | 56.300 |
| `*TASK-BG-029--estudo-humano.md` | 32.000 | 30.685 | 56.300 |
| `*TASK-RF-073--estudo-humano.md` | 28.000 | 24.779 | 56.300 |
| `*TASK-BG-032--estudo-humano.md` | 26.000 | 23.278 | 56.300 |
| `*--estudo-humano.md` (glob) | 20.000 | maior 43.286 | 56.300 |

Medir de novo antes de remover; depois, o `verificar` não pode ter achado de teto. Exceção cujo
arquivo passe do novo teto fica.

## 6. Frente D · Cinco melhorias simples

Cada uma com teste vermelho antes e verde depois.

| # | Melhoria | Onde |
| :-: | :-- | :-- |
| D1 | `task nova` valida `--origem` com a mesma regra do `task puxar` | `cmd-tarefa.ts` |
| D2 | O aviso de teto do dossiê mede o dossiê montado (texto fixo, planos, fatos, diffs), não só o diff | `cmd-auditar.ts` |
| D3 | Caminho conta como declarado em qualquer posição da linha do `plano.muda` | `arquivos.ts` |
| D4 | ADR procurada em `caminhos().adr`, ID como palavra inteira, texto citando a restrição; sai o atalho de `tarefa.adrs` não vazio | `restricoes.ts`, `cmd-doctor.ts` |
| D5 | Documento de planejamento não conta como persistência no classificador de risco | onde estiver `riscoDaMudanca` |

## 7. Critérios de aceite

1. `npm run verify` verde.
2. Os 29 arquivos do inventário no pacote; exclusão só com justificativa escrita.
3. `grep` sem nome do projeto, `TASK-` do piloto ou data `/26` no `.mentor/`.
4. Cada teste portado falha com o arquivo da v0.12.0 e passa com o portado.
5. Clone limpo do piloto + `#v0.13.0` + `instalar --forcar`: `.mentor/` igual ao do pacote e
   regressões do piloto verdes.
6. `verificar` do piloto sem achado de teto depois de removidas as exceções.
7. D1 a D5, cada uma com teste vermelho antes e verde depois.

## 8. Riscos

| Risco | Mitigação |
| :-- | :-- |
| Levar algo que só vale para o piloto | `git diff` arquivo por arquivo e critério 3 |
| Teste portado não cobrir o mesmo comportamento | equivalência por mutação (critério 4) |
| Perder o rastro das correções no piloto | seção "Incorporadas na v0.13.0" com o commit; testes do piloto só saem depois do critério 4 |

## 9. Proporcionalidade

Pediram levar as correções ao pacote e subir os tetos em 30%. Proponho isso e as cinco anotações
simples, já descritas com caso e cenário no relatório de campo. Nenhum artefato novo além dos testes.

## 10. Fechamento

1. `CHANGELOG`, `NOTAS-DA-RELEASE-v0.13.0.md`, versão 0.13.0.
2. Commit com autorização; tag e push com outra autorização.
3. Tarefa Standard no piloto: `#v0.13.0` e `instalar --forcar`; limpeza do `docs-mentor/tetos.json`
   pela tabela da seção 5; as 20 entradas de "Corrigidas aqui" viram "Incorporadas na v0.13.0", uma
   linha por correção (título, tarefa de origem, commit do pacote), e a regra 7 do topo do arquivo
   passa a dizer isso; testes do piloto só saem depois do critério 4; anotação da divergência
   marcada como superada.
