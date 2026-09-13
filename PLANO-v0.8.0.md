# Plano · v0.8.0: auditoria por tarefa e travas que nao atrapalham

> Consolidado em 13/09/26 a partir da medicao no piloto `teste-mentor-comagenteantigo` (v0.7.0) e
> das notas de `docs-mentor/melhorias-do-pacote.md` de la. Este repositorio nao aplica as proprias
> regras ao seu desenvolvimento: o plano e' convencao de trabalho, nao tarefa rastreada.
> A v0.9.0 (processo) fica descrita no fim, sem implementacao.
>
> **Status:** frentes A e B implementadas; 27 cenarios verdes. Conferido contra o piloto (clone, so'
> leitura): o `doctor` passou de "vencida, 115.781 caracteres" para "em dia, 1 de 10 tarefas com
> codigo"; CHORE-017 e CHORE-019 sairam como atualizacao do pacote; o dossie da BG-021 ficou com
> 81 mil caracteres, a maior parte da fixture que o piloto ainda nao marcou como `linguist-generated`.

---

## 1. O problema, medido

O `doctor` do piloto acusou auditoria vencida com **3 tarefas e 115.781 caracteres** de diff.
Arquivo por arquivo, a partir de `auditoria.ultimo_commit`:

| Origem | Caracteres | % |
| :-- | --: | --: |
| `roteiro-classificacao.json`, fixture gerada por script | 49.857 | 43% |
| Registros do proprio mentor (`docs-mentor/tarefas/**`, `dividas.json`, `requisitos.json`) | 51.256 | 44% |
| Codigo, testes e `package*.json` | 14.669 | 13% |

Os defeitos por tras do numero:

1. **O registro da tarefa conta como diff**, e ele ja entra estruturado no dossie. Quanto mais
   evidencia a v0.7.0 grava (`commit_execucao`, `arvore_hash`, saidas), mais cedo a auditoria dispara.
2. **Fixture gerada conta**, a menos que o projeto a declare em `ignorar_diff`.
3. **A quebra do `doctor` omite `outros`.** Mostra 20.910 dos 115.781; a causa fica invisivel.
4. **Tres calculos da cadencia discordam.** `contexto.json` diz proxima na tarefa 30 (proximo
   multiplo de 10); a ultima foi na 25. `doctor` e `finalizar` fazem cada um a sua conta.
5. **O diff do lote e' "base ate a arvore de trabalho".** Entra trabalho de outra tarefa (WIP
   pausado, arquivo nao rastreado) e commit sem tarefa, e as regras de exclusao diferem entre
   arquivo rastreado (pathspec do git) e nao rastreado (`deveIgnorarArquivo`, por prefixo).
6. **`registrar` grava `ultima_na_tarefa` com todas as concluidas**, inclusive as que fecharam
   depois do `preparar` e ficaram fora do lote: essas nunca voltam a contar.

Efeito nas auditorias reais: a AUD-001 (22 tarefas) truncou num dossie de 228 mil caracteres, e foi
por isso que a cadencia por caracteres nasceu na v0.5.0. A AUD-002 (3 tarefas) teve 13 achados, 6
descartados pelo humano como "sem acao neste projeto", 4 deles sobre a atualizacao do pacote.

## 2. Decisoes

| # | Decisao | Por que |
| :-: | :-- | :-- |
| D1 | A cadencia conta **tarefas com diff auditavel**. Caracteres deixam de disparar | contagem e' previsivel; tamanho mede o empacotamento, nao o risco |
| D2 | Padrao continua **10** | sem registros e fixtures no diff, 10 tarefas do piloto cabem no teto |
| D3 | Tarefa de **atualizacao do pacote** entra no lote so' listada, sem diff e sem contar | o pacote se audita no repositorio dele (MELHORIAS 5.7) |
| D4 | `arvore_hash` divergente **recusa** o fechamento so' quando mudou arquivo rastreado ou declarado; artefato nao rastreado so' avisa | recusar por artefato de build regenerado criaria laco de reexecucao |
| D5 | v0.8.0 = auditoria + travas. Processo novo (v0.9.0) fica para depois do piloto | cada regra nova de processo merece campo antes de virar lei |

**Nome do problema:** amostragem e cadencia de revisao de codigo; metrica de tamanho de mudanca
(*code churn*). **Estado da arte:** a industria revisa por mudanca (PR) e em lote pequeno (Google,
*small CLs*; SmartBear/Cisco: a eficacia cai acima de ~400 linhas por sessao). Revisores com IA de
mercado (CodeRabbit, Copilot review) revisam por PR, mas sem os criterios de aceite e os gates que o
dossie traz. Por isso a unidade muda para a tarefa (que neste processo e' um PR) e o auditor fica.

**Discordancia registrada:** contar tarefas faz uma de 3 linhas pesar igual a uma de 3 mil. O
empacotamento por tamanho (A3) e a validacao humana obrigatoria das tarefas sensiveis compensam.
Com `cadencia_em_tarefas: 1` a auditoria vira revisao por PR, sem codigo novo.

## 3. Frente A · Auditoria por tarefa

### A1. O diff de cada tarefa, isolado

`diffDaTarefa(t)` em `cmd-auditar.ts`:

- **Commits da tarefa:** `git log --no-merges --fixed-strings --grep=<ID>` a partir do HEAD, filtrado
  pelo ID com fronteira no titulo (`TASK-RF-001` nao casa `TASK-RF-0010`). Pega o squash
  `fix(TASK-BG-018): ... (#32)` e os `wip(<ID>)` da pausa.
- **Sem commit ainda** (tarefa fechada e nao commitada): aproximacao. Arquivos mudados desde o
  `commit_base`, inclusive nao rastreados, filtrados pelo `plano.muda` da propria tarefa. O dossie
  diz que e' aproximacao.
- **Classe:** `codigo` (tem arquivo auditavel), `sem-diff` (so' registros, notas, vistas) ou
  `atualizacao-do-pacote` (tocou `.mentor/manifesto.json` e, fora das exclusoes, so' `package*.json`,
  lockfiles, `mentor.mjs`, pontos de entrada, `.gitattributes`, `.gitignore`).
- Tamanho por arquivo em **linhas** (`--numstat`): e' a medida de revisao, e sai sem baixar o patch.

### A2. Uma regra de exclusao so'

`motivoDeExclusao(caminho)` devolve o motivo ou `null`, para rastreado e nao rastreado igual:

| Motivo | O que sai |
| :-- | :-- |
| `registro` | `<docs>/tarefas/**` (ja vai estruturado no dossie) |
| `vista gerada` | `contexto.json`, `contexto.md`, vistas de requisitos, `auditorias/**` |
| `nota` | `<docs>/rascunhos/**`, `melhorias-do-pacote.md` |
| `pacote` | `.mentor/**` com hash igual ao manifesto; `manifesto.json`; tudo, se nao houver manifesto |
| `gerado` | atributo `linguist-generated` no `.gitattributes` (padrao do git, via `git check-attr`) |
| `ignorar_diff` | padroes do contexto, com o mesmo casamento de glob do `plano.muda` |

Requisitos, ADRs, invariantes, dividas e riscos ficam: sao decisao, nao contabilidade.

### A3. Cadencia e empacotamento

- `estadoDaCadencia()` e' a fonte unica, usada por `doctor`, `finalizar` e `auditar preparar`.
  Conta as concluidas fora de qualquer lote com classe `codigo`. Atencao em N, bloqueio em 2N.
- `preparar` percorre as nao auditadas em ordem de conclusao e poe no lote enquanto o patch cabe no
  teto de 120 mil caracteres. As que sobram ficam para o proximo `preparar`, e o comando diz isso.
  Truncar so' acontece quando uma tarefa sozinha passa do teto (corte na fronteira de arquivo, codigo
  primeiro, como hoje).
- `registrar` grava `ultima_na_tarefa` = concluidas que ja estao em algum lote (corrige o defeito 6);
  `vistas` grava `proxima_em_tarefa` = `ultima_na_tarefa + N` (estimativa: tarefa sem diff auditavel
  empurra a proxima).
- `cadencia_em_caracteres` sai do esquema. Projeto que ainda o tem recebe uma linha neutra no `doctor`.

### A4. O dossie

- Por tarefa: origem do diff (commits com hash e titulo, ou aproximacao), arquivos com linhas,
  excluidos com o motivo, e o patch.
- Fato mecanico "arquivo fora do `plano.muda`" passa a ser por tarefa, nao do lote inteiro.
- Secao **Fora das tarefas do lote**, so' fatos: commits sem ID de tarefa que tocam codigo desde a
  ultima auditoria (hash, titulo, arquivos) e arquivos nunca commitados que nenhuma tarefa do lote
  declarou (nome e tamanho, sem conteudo: e' trabalho de outra tarefa).
  ⚠️ Muda o cenario 12: `login.ts` nao declarado deixa de entrar inteiro. Arquivo nao commitado
  **declarado** por tarefa do lote continua entrando inteiro (cenario 26).
- Secao **Tarefas sem diff auditavel**: ID, titulo, classe. Entram no lote para nao ficarem penduradas.

### A5. `doctor`

Linha de cadencia por tarefas, com as tarefas que contam, as que nao contam e os 3 maiores arquivos
em linhas. A quebra por categoria sai: o tamanho agora e' informativo, por arquivo.

**Arquivos:** `cmd-auditar.ts` · `cmd-doctor.ts` · `cmd-tarefa.ts` (fim do `finalizar`) · `vistas.ts` ·
`tipos.ts` · `esquemas/contexto.json` · `processos/revisao.md` · README · cenarios 12, 22 e **26** (novo).

**Criterios de aceite (cenario 26):**
1. Fixture `linguist-generated` e registros grandes nao entram no diff nem na conta.
2. Tarefa so' de documentacao do mentor e tarefa de atualizacao do pacote nao contam, e entram no lote listadas.
3. N tarefas com codigo disparam o aviso no `finalizar` e no `doctor`.
4. O commit com o ID entra no diff da tarefa; commit sem ID aparece como fato; arquivo nao
   commitado de outra tarefa aparece so' pelo nome.
5. Lote acima do teto divide: o `preparar` leva as primeiras, o seguinte leva o resto.
6. `ultima_na_tarefa` e `proxima_em_tarefa` batem depois do `registrar`.

## 4. Frente B · Travas que pegam toda tarefa

| # | Defeito | Correcao | Onde |
| :-- | :-- | :-- | :-- |
| B1 | A trava de retroativa usa `commit_base..HEAD` (so' o commitado): no fluxo do mentor o `finalizar` roda antes do commit, e tarefa legitima cai como retroativa | diff ativo = o mesmo conjunto da trava de escopo (arvore de trabalho, nao rastreados e intervalos de pausa) | `cmd-tarefa.ts` |
| B2 | `arvore_hash` e' gravado e nunca conferido, e inclui `docs-mentor/`, que muda a cada gate | hash da arvore **sem a pasta de documentos e com os nao rastreados** (indice temporario copiado do real + `write-tree`). No `finalizar`, gates `testes` e `build`: arquivo rastreado ou declarado que mudou depois do gate **recusa**; artefato nao rastreado so' avisa (D4) | `cmd-tarefa.ts`, `tipos.ts` |
| B3 | "Tarefa sensivel" definida em 3 lugares, diferentes (o dossie ignora SPIKE) e nenhum reconhece UI | `tarefaSensivel(t)` unica, com UI (`.tsx`, `.jsx`, `.vue`, `.svelte`, `.css`, `.scss`, `.html`, tela, componente, layout) | novo `sensivel.ts`; `cmd-tarefa.ts`; `cmd-auditar.ts` |
| B4 | `verificar` reprovado chega ao main: nenhum hook o roda; e acusa `PREENCHER:` em `melhorias-do-pacote.md`, que cita tokens por natureza | pre-push roda o `verificar` e **mostra** os achados, sem barrar: tarefa em execucao e rascunho de stack tem marcador legitimo, e barrar o envio por eles criaria o laco que D4 evita. Quem barra continua sendo a esteira. `melhorias-do-pacote.md` entra na lista de conteudo e marcador entre crases e' ignorado | `cmd-hooks.ts`, `cmd-verificar.ts` |
| B5 | `.mentor/` tratado de tres jeitos: hook (nunca e' codigo), `finalizar` (exige declarar), auditoria (manifesto) | uma regra: intacto pelo manifesto nao e' mudanca do projeto; patch local e' | `cmd-pacote.ts`, `cmd-hooks.ts`, `cmd-tarefa.ts` |
| B6 | O aviso de normas alteradas nao sai pelo `npx mentor instalar --forcar` (o caminho de `node_modules` nao passa por `cmd-pacote.ts`) e so' lista nomes | `normasQueMudam()` em `instalar.mjs`, chamada pelos dois caminhos antes de copiar, com `+N −M linhas` por arquivo e o comando `git diff` para ler | `instalar.mjs`, `mentor.mjs`, `cmd-pacote.ts` |
| B7 | A ajuda diz `task criterio <ID> <n> [--cmd]`; o codigo le `--comando` e o indice comeca em 0 | aceita os dois nomes; a ajuda diz o indice | `cli.ts`, `cmd-tarefa.ts` |
| B8 | **Novo.** Os gates rodam duas vezes em todo push desde a v0.4.0: o arquivo do hook chama `gates` e o `hooks --pre-push` chama de novo | `prePush()` deixa de rodar gates (o arquivo do hook ja roda, inclusive nos projetos instalados) | `cmd-hooks.ts` |
**Criterios de aceite (cenario 27):** um caso por linha da tabela. Cenarios 21, 22 e 25 continuam verdes.

**Achado sem correcao nesta versao (nucleo §6, classe 5, gate que nao checa o que diz):** a checagem
de ID do hook aceita qualquer escopo convencional, entao `feat(ui): tela` passa sem tarefa, enquanto
`fix: typo` sem escopo e' barrado. Apertar para exigir `TASK-X-NNN` barraria o Light em codigo (typo,
formatacao), que o nucleo permite sem registro. E' decisao de processo: foi para C7, e o humano
escolheu a marca explicita, entregue na 0.8.1.

## 5. Ordem de execucao

1. A2 e A1 (exclusao unica e diff por tarefa), com o cenario 26 crescendo junto.
2. A3, A4, A5; ajustar cenarios 12 e 22.
3. B1 a B8, com o cenario 27.
4. `processos/` (revisao, tarefa, entrega), README, CHANGELOG, versao 0.8.0.
5. `npm run verify` inteiro.
6. Conferir contra o piloto, so' leitura: `estadoDaCadencia()` com `MENTOR_RAIZ` apontando para ele.
   Esperado: BG-021 conta; CHORE-017 e CHORE-019 saem como atualizacao do pacote.

## 6. Riscos

- Commit fora do padrao, sem o ID no titulo, cai na aproximacao do A1. O dossie diz.
- "Arquivo de `.mentor/` intacto" compara com o manifesto **atual**: um patch antigo que uma
  atualizacao posterior sobrescreveu passa a contar como pacote. Aceito: o patch ja nao existe.
- B2 pode recusar fechamento legitimo quando alguem formata codigo depois dos gates. E' a intencao; a
  mensagem diz qual arquivo e o comando para rodar o gate de novo.
- Projeto instalado com `cadencia_em_caracteres` calibrado perde esse ajuste. A linha do `doctor` avisa.

## 7. Fora desta versao: v0.9.0 (processo)

| # | Item | Mecanismo proposto | Origem |
| :-- | :-- | :-- | :-- |
| C1 | Meio de validacao humana | tarefa sensivel declara `plano.validacao.meio` (script, fixture, roteiro); `validar` grava; `finalizar` avisa se falta | nota 13/09 02:47, BG-017 e BG-021 |
| C2 | Roteiro de atualizacao do pacote | sequencia em `processos/entrega.md`; `instalar` avisa quando nao ha tarefa em execucao | nota 13/09 03:30 |
| C3 | Restricao fundadora (M3) | SPIKE e G/XG exigem `restricoes_reavaliadas`; na 3a reconfirmacao da mesma restricao o `doctor` pede ADR | nota 12/09 |
| C4 | Composicao de epico fatiado | ao puxar a 3a fatia do mesmo epico, o plano exige `composicao_do_epico` | nota 12/09 |
| C5 | Portao 2 sem mecanismo | `finalizar --autorizacao "<frase do humano>"`, mostrada no dossie. Fraco: a IA pode digitar; so' torna a violacao visivel | CHORE-019 fechada sem portao 2 |
| C6 | Tarefa pausada so' no disco | **feito na 0.9.0, redesenhado com o humano:** WIP sobe para `wip/`, o merge e' que e' barrado (`PLANO-v0.9.0.md`) | SPIKE-003 so' em ramo local |
| C7 | Light em codigo e a checagem de ID do hook | **decidido e feito na 0.8.1:** marca explicita `<tipo>(light): ...`, aceita pelo hook e listada no dossie com as linhas tocadas | achado da v0.8.0, secao 4 |
