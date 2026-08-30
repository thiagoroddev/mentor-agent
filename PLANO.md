# Plano de implementacao

> **Se voce e' uma sessao nova, leia so' isto e siga.** Nao ha' contexto de conversa necessario.
> As decisoes estao em [`ESPECIFICACAO.md`](./ESPECIFICACAO.md) e [`MELHORIAS.md`](./MELHORIAS.md).
> Este arquivo diz **em que ordem** e **como conferir**.

Estado: `[ ]` nao feito · `[~]` em execucao · `[x]` feito. **Marque ao terminar cada passo**, e' assim
que a proxima sessao sabe onde parou.

---

## Regras de execucao deste plano

1. **Um passo por vez, na ordem.** As fases dependem uma da outra; dentro de uma fase, a ordem
   tambem importa.
2. **Ao fim de cada passo:** `npm run verify` verde · marcar `[x]` aqui · uma linha em
   "Registro de execucao" no fim deste arquivo. Comportamento novo entra com cenario de teste junto.
3. **Escopo fechado.** Se algo nao esta' na `ESPECIFICACAO.md` nem na `MELHORIAS.md`, **pare e
   pergunte**. Nao invente capacidade: foi isso que matou o antecessor.
4. **Tetos valem para o pacote tambem.** Os cenarios ja' rodam `verificar`; se algum teto estourar,
   eles reprovam.
5. **O pacote nao usa a si mesmo.** Nao rode `mentor init` na raiz do `mentor-agent`.

### Como testar

```bash
npm run verify     # tsc --noEmit + os cenarios
```

Cada cenario em `testes/cenarios/` constroi um mini-projeto real em `testes/exemplos/` e roda os
comandos de verdade pela linha de comando. Os projetos gerados sao **versionados**: uma mudanca no
gerador aparece como diff neles, e o defeito e' visto antes de chegar num projeto real.
Ao acrescentar comportamento, acrescente o cenario junto. Detalhes em `testes/README.md`.

---

## Estado atual (medido em 29/08/26)

| Parte | Arquivos | Caracteres |
| :-- | --: | --: |
| `nucleo.md` | 1 | 6.637 |
| `guia/` | 15 | 132.298 |
| `processos/` | 5 | 13.209 |
| `modelos/` | 3 | 16.434 |
| `esquemas/` | 3 | 10.189 |
| `scripts/` (TypeScript) | 10 | 44.715 |

Funciona hoje: `init` · `task nova/iniciar/gate/fila/finalizar` · `stack` · `verificar` (3 familias) ·
`auditar` · `gerar`. Testado ponta a ponta, `tsc --noEmit` limpo.

---

## Fase 1 · Modelo de dados

Tudo depende daqui. Nenhum comando novo antes desta fase fechar.

- [x] **1.1 · Campo `fila`** (`MELHORIAS` §1.2)
  `fila: "ciclo" | "reserva"` em `tipos.ts` e `esquemas/tarefa.json`. Nasce em `reserva`.
  Vistas: `backlog.md` so' do ciclo; novo `reserva.md`.
  *Confere:* tarefa nova nasce em reserva e nao aparece no `backlog.md`.

- [x] **1.2 · Limites da fila** (`MELHORIAS` §1.3)
  `em-execucao` = 1 · `ciclo` = 12 tarefas / 2.400 car em `tetos.json`. Ciclo cheio nao impede
  registrar: a tarefa nova vai para reserva.
  *Confere:* a 13a puxada e' recusada com a mensagem certa.

- [x] **1.3 · `achados` com destino obrigatorio** (`MELHORIAS` §5.5)
  Substitui `achados_encaminhados`. `{classe, descricao, destino, ref}`, destino em
  `tarefa | divida_tecnica | risco_aceito | descartado`, `ref` nunca vazio.
  *Confere:* `finalizar` recusa achado sem destino.

- [x] **1.4 · Campo `validacao`** (`MELHORIAS` §3)
  `pendente | aprovado | dispensado` + `validado_em`. E' o "smoke pendente" virando dado.
  *Confere:* aparece no `backlog.md` e nas contagens.

- [x] **1.5 · Esquemas `divida-tecnica.json` e `risco-aceito.json`** (`MELHORIAS` §4.3)
  DT exige **gatilho + dono**. RA exige **evidencia + aceito_por (pessoa) + tarefa_de_saida +
  data_revisao ≤ 90 dias**. RA vencido e' mais grave que o problema original.
  *Confere:* JSON valido; um RA sem `aceito_por` e' rejeitado.

- [x] **1.6 · Blocos novos no `contexto.json`** (`MELHORIAS` §2.2, §5.4)
  `versionamento` · `configuracoes_de_plataforma` · `revisao_geral` · `lembretes` (**gerado**) ·
  contagens: `divida_tecnica_aberta`, `requisitos_pendentes`, `riscos_aceitos_ativos`,
  `riscos_aceitos_vencidos`, `avisos{bloqueio,recomendacao,observacao}`,
  `tarefas_desde_revisao_geral`.
  *Confere:* `mentor init` gera o contexto completo e `gerar` recalcula as contagens.

---

## Fase 2 · Comandos do ciclo

- [x] **2.1 · `task puxar` / `task guardar` / `reserva`** (`MELHORIAS` §1.4, §1.5)
  Regra de passagem conferida por script: origem resolve · nao e' XG · dependencias no ciclo ou
  concluidas · ha' vaga.
  *Confere:* puxar uma XG e' recusado; puxar com dependencia aberta e' recusado.

- [x] **2.2 · `task cancelar` e `task absorver`** (`MELHORIAS` §3)
  `cancelar --motivo` (obrigatorio) · `absorver <id> --por <id>` grava `absorvida_por` e o numero
  nao volta a ser usado. Vista gerada substitui a secao "Numeros aposentados" escrita a mao.
  *Confere:* ID absorvido nao e' reaproveitado pelo gerador de ID.

- [x] **2.3 · `task fatiar <id> --em N`**
  Cria N fatias com `fatia_de`, encadeia dependencias, marca o pai como epico.
  *Confere:* o pai sai da fila e vira cabecalho, as fatias entram.

- [x] **2.4 · `task validar <id>`**
  `--aprovado` / `--dispensado --motivo`. Alimenta o campo de 1.4.

- [x] **2.5 · `finalizar` + indice de concluidas gerado**
  `finalizar` passa a recusar achado sem destino (1.3) e a gravar DT/RA criados no fechamento.
  Gera `concluidas/0-indice.md`.
  *Confere:* o indice bate com os arquivos em disco.

---

## Fase 3 · Verificacao

- [x] **3.1 · Integridade de links markdown** (`MELHORIAS` §4.4)
  Quarta checagem do `verificar`: link relativo que nao resolve · extensao dupla `.md.md` ·
  **comparacao sensivel a maiusculas de proposito** (Windows engana, Linux e GitHub quebram).
  *Confere:* criar `X.md` e linkar `x.md` reprova.

- [x] **3.2 · `.mentor/regras.json`** (`MELHORIAS` §8.3)
  `{id, onde, comando|null}` para cada regra do pacote. Script extrai os IDs do markdown por regex;
  a familia de integridade referencial confere que todo ID do markdown esta' no JSON e vice-versa.
  **`comando: null` = orientacao declarada, nao lei.**
  *Confere:* apagar uma regra do markdown reprova o `verificar`.

---

## Fase 4 · Auditoria e saude

- [x] **4.1 · `doctor` absorve o `auditar`** (`MELHORIAS` §4.13, §5.2)
  Formato SEGURANCA / QUALIDADE / PROCESSO, terminando em **veredito binario**. So' mede o que nao
  exige julgamento. Grava `lembretes` no contexto (gerado, nunca digitado).
  *Confere:* roda sem IA, sai em segundos, e o veredito muda quando um bloqueio aparece.

- [x] **4.2 · Cadencia da revisao geral** (`MELHORIAS` §5.3)
  Escala 20 / 30 / 40 tarefas. Em 40+, conta como bloqueio no veredito do doctor.
  *Confere:* simular 25 concluidas produz o aviso; 45 produz o bloqueio.

- [x] **4.3 · Auditor em `processos/revisao.md`** (`MELHORIAS` §4.12, §5.1)
  Escopo: **o diff da tarefa, o registro dela e os requisitos citados. Nunca o repositorio.**
  Tres niveis; bloqueia por classe de falsidade, nao por tema. Calibracao: declarar o que **nao**
  conseguiu verificar. **Nao abre tarefa.**
  *Confere:* teto de 4.800 do processo respeitado.

---

## Fase 5 · Entrega e versionamento

- [x] **5.1 · `processos/entrega.md`** (`MELHORIAS` §2.2a, §4.5)
  Condensar `docs/operacao.md` do `motocustorj` (218 linhas) em 4.800 caracteres: ramo protegido ·
  fluxo com `gh` · **nome do ramo derivado so' do ID** (`rf-014-shell-exec`), nunca da posicao da
  fatia, pelo mesmo motivo que matou o campo `posicao`: a posicao muda, o ID nao · **uma tarefa por branch, com o motivo do link de
  CI** · como julgar PR de dependencia e a ordem segura de merge · reversao testada · migracao com
  caminho de volta · publicacao registrada.

- [x] **5.2 · Versionamento cobrado na fase `construcao`** (`MELHORIAS` §2.2c)
  `EXIGIDOS['construcao']` ganha o bloco `versionamento`. E' o gatilho que faltava: hoje so'
  `pre-lancamento` cobra deploy, e ai' ja' e' tarde.

- [x] **5.3 · Hook de pre-push sem dependencia** (`MELHORIAS` §4.11)
  Arquivo versionado + `git config core.hooksPath` na inicializacao. **`pre-push`, nao
  `pre-commit`**, para commit continuar barato e ninguem aprender `--no-verify`.

- [x] **5.4 · `stack github` com rascunho pre-preenchido** (`MELHORIAS` §2.3)
  Escolhas usuais escritas, cada linha marcada `PREENCHER: confirmar ou trocar`. Rascunho para
  aprovar, nao padrao imposto.

---

## Fase 6 · Seguranca e lancamento

- [x] **6.1 · Registro de riscos aceitos** (`MELHORIAS` §4.3)
  `docs/seguranca/riscos-aceitos.md` gerado do JSON de 1.5 + leitor que valida prazo e campos.
  **Entrada vencida reprova mais alto que o problema original.** Encerrar move, nunca apaga.

- [x] **6.2 · Portao de lancamento** (`MELHORIAS` §4.2)
  `mentor lancamento` responde **uma** pergunta: pode ir a publico? Le' os gates declarados, o
  registro de riscos e as listas de fase. **`NÃO EXECUTADO` tambem reprova.**
  Os itens que dependem de ferramenta (Lighthouse, orcamento de bundle) sao **declarados pelo
  projeto**, nunca embutidos no pacote.

---

## Fase 7 · Campo

- [x] **7.1 · `mentor relatorio-de-campo`** (`MELHORIAS` §8)
  Parte A gerada (medicao, incluindo *recusas do `finalizar` por impedimento* e *ordem fixada a
  mao*), parte B com referencia obrigatoria a ID e data, parte C do que funcionou.
  **So' metadado de processo: nada de codigo, requisito, nome ou URL.**

---

## Fase 8 · Fechamento

- [x] **8.1 · Atualizar a `ESPECIFICACAO.md`**
  Trazer para la' tudo que saiu de 🔵 em `MELHORIAS.md`, com a medicao das 197 tarefas
  (`MELHORIAS` §4.9) na secao 1, e as cinco regras anti-loop (`MELHORIAS` §6.1).
  Mover os itens implementados de `MELHORIAS.md` para 🟢, com a data.

- [x] **8.2 · Teste ponta a ponta no sandbox**
  Ciclo completo: init · nova · puxar · iniciar · gate real · achado com destino · finalizar ·
  validar · doctor · verificar · relatorio-de-campo. Registrar as saidas aqui embaixo.

- [x] **8.3 · Conferir os tetos e o custo de contexto**
  Medir de novo: sempre carregado, custo de abrir uma tarefa, total do pacote. Comparar com a
  tabela da `ESPECIFICACAO.md` §13 e corrigir os numeros.

---

## Fase 9 · Validacao em hospedeiro

Comeca **depois da fase 8**, nunca durante. Ambiente em mudanca gera estado que nenhum projeto real
visita, e defeito achado ali pode nao existir em lugar nenhum (decisao do humano, 29/08).

### 9.0 · Como o pacote chega no hospedeiro

**Nao se copia a mao.** Copia manual nao registra versao, e sem versao o relatorio de campo nao sabe
dizer *"isto aconteceu com a 0.1.0"*.

```
no hospedeiro:  npm i -D github:thiagoroddev/mentor-agent#v0.1.3
                npx mentor instalar         -> copia .mentor/ e mentor.mjs para a raiz
                node mentor.mjs init        -> cria docs/
```

🟢 **30/08: repositorio publico com tag e release** (decisao do humano). O `npm i` a partir da tag
clona e empacota sozinho, respeitando o `files` do `package.json`: chegam 60 arquivos, sem os testes
nem os exemplos. O `.tgz` anexado a' release serve para instalar sem rede ou congelar uma copia.

⚠️ **`npx mentor init` nao existe** — depois do `instalar`, os comandos rodam da raiz do projeto,
com `node mentor.mjs`. De dentro de `node_modules` so' o `instalar` funciona, e o motivo esta' abaixo.

⚠️ **30/08: este caminho estava quebrado, e so' se descobre executando.** O Node **se recusa** a
remover tipos de arquivo dentro de `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`),
entao `npx mentor instalar` morria antes da primeira linha. Corrigido: `mentor.mjs` detecta que esta'
em `node_modules` e faz a copia em **JavaScript puro** (`.mentor/scripts/instalar.mjs`, fonte unica
que o `cmd-pacote.ts` tambem usa), recusando qualquer outro comando dali com a instrucao certa.
Depois da copia, tudo roda da raiz do projeto, onde a remocao de tipos funciona.

Junto veio `.mentor/package.json` com `{"type":"module"}`: sem ele, **todo** comando imprimia um
aviso `MODULE_TYPELESS_PACKAGE_JSON`. Resolve dentro de `.mentor/`, sem obrigar o projeto do usuario
a mexer no `package.json` dele.

Sem GitHub e sem publicar nada, o tarball local ja' exercita o caminho real. O `files` do
`package.json` limita a 50 arquivos (105 kB): so' `.mentor/`, `mentor.mjs` e o README. Testes e
exemplos ficam de fora.

**O pacote e' copiado PARA DENTRO do repositorio, nao fica em `node_modules`.** Isso e' deliberado: a
IA le' `.mentor/` como arquivo, e o projeto versiona as convencoes dele ao lado.

### 9.1 · `mentor instalar` 🟢 *(implementado 29/08)*

O hospedeiro e' **repositorio zerado** (decisao do humano, 29/08), entao a fase 9 prova **instalacao
e primeiro uso**, nao migracao.

| Comando | O que faz |
| :-- | :-- |
| `instalar` | copia `.mentor/` e `mentor.mjs` para a raiz. Recusa se ja' existir, sem `--forcar` |

Exige gravar a versao do pacote em `contexto._meta.versao_do_pacote`, senao o relatorio de campo nao
consegue atribuir nada a uma versao.

**A sessao e meia que a migracao custou no antecessor nao e' evidencia sobre este pacote:** foi
`esquadro-agents` para `esquadro-agents`, com pacote e projeto misturados na mesma pasta. Aqui a
separacao `.mentor/` × `docs/` existe justamente para isso, e continua **nao provada**.

### 9.1b · `mentor atualizar` 🔵 depois, e o hospedeiro e' o sujeito do teste

So' faz sentido quando existir uma 0.2.0, e ela nasce do relatorio de campo do proprio hospedeiro.
Ou seja: **o hospedeiro roda a 0.1.0, gera o relatorio, o relatorio produz a 0.2.0, e ai' ele vira o
primeiro teste de atualizacao real** — de graca, porque ja' esta la'.

O que o `atualizar` fara':

⚠️ **`docs/` nunca e' sobrescrito.** Troca `.mentor/` inteiro; compara a versao de esquema de cada
JSON de `docs/`; **acrescenta os campos novos com `null`** e nao remove nada. Campo novo em `null` e'
pauta do mentor, que e' o comportamento certo: a migracao nao decide por voce.

### 9.1c · O auditor como comando 🟢 *(implementado 29/08)*

Era processo escrito, nao comando. Virou `mentor auditar preparar | registrar | resolver`.

**A decisao que define o desenho: cadencia, nao toda tarefa.** Auditar cada tarefa Standard/Strict
dobraria o custo de cada uma, e processo caro e' processo abandonado — que e' a razao nº 1 pela qual
processos morrem. A cada N tarefas (10 por padrao) o `finalizar` avisa e o `doctor` cobra.

**O escopo fechado deixou de ser promessa.** O `preparar` monta um dossie com o diff do lote, os
registros e os requisitos citados, e e' o unico material que a sessao nova recebe. As cinco regras e
os tres niveis vao escritos dentro dele, para nao existirem em duas versoes que divergem.

Duas correcoes que so' apareceram ao ver um dossie de verdade, e valem por si:

  (a) as **vistas geradas** (`contexto.json`, `contexto.md`, `backlog.md`, indices) saem do diff. Elas
      inundavam o dossie com a contabilidade do proprio pacote e afogavam o codigo — e ainda
      produziam um achado falso, "arquivo mudou sem constar no plano";
  (b) **arquivo criado e nunca commitado entra inteiro**, por `git diff --no-index`. `git diff` nao o
      mostra, e e' exatamente onde o erro novo mora. No teste isso e' um `login.ts` com senha no
      codigo, invisivel na primeira versao do comando.

**O que impede o loop, agora mecanicamente:** o `registrar` recusa achado que ja' venha com `destino`.
O auditor reporta; quem decide se vira tarefa, divida, risco aceito ou descarte e' o humano, no
`resolver`. E recusa `APROVADO` com achado que bloqueia, e `nao_verificado` vazio — auditoria que diz
ter verificado tudo esta' quebrada.

Cenario `12-auditoria`, fora do repositorio porque precisa de git de verdade. As duas asercoes novas
foram conferidas por mutacao: quebrei o comando e o cenario acusou.

### 9.2 · O hospedeiro 🟡 decidido em forma, a definir em escopo

**Fictitio serve, com uma condicao: os objetivos precisam ser alcancados de fato, deploy incluido.**
O que mata o teste e' fictitio abandonado no meio, porque ele para de ser real exatamente no ponto
que mais importa: quando o processo incomoda.

Cinco criterios, e o menor projeto que os cobre e' o certo:

```
[ ] uma funcionalidade com login   -> autenticacao e dado pessoal, e dado pessoal promove a N2
                                      sozinho. Sem isso, metade das regras nunca dispara
[ ] um banco com uma migracao      -> unica forma de exercitar OPS-23, caminho de volta
[ ] uma esteira real               -> gate que falha por motivo obscuro, nao por `exit 1`
[ ] um deploy com reversao         -> OPS-22: reversao so' existe se foi executada
    executada uma vez
[ ] 8 a 12 tarefas                 -> menos nao cobre; mais vira outro projeto
```

**29/08: o humano definiu a forma.** Repositorio zerado, para exercitar: Docker · Bun ou outro runtime
no lugar do Node · banco de dados · login · pagamento · VPS · nuvem · TypeScript · Next ou Fastify ·
API · React.

⚠️ **O escopo nao se planeja aqui.** Ele nasce la', com o agente conduzindo pelo `processos/rascunho.md`
— que e' o teste mais honesto que existe do proprio processo: se o rascunho nao consegue transformar
essa lista de tecnologias num escopo de 8 a 12 tarefas, o defeito e' do pacote, e o hospedeiro achou
o primeiro antes da primeira linha de codigo.

Pagamento nao estava nos cinco criterios e muda o rigor: dinheiro promove a N3 e obriga revisao
humana em qualquer mudanca de calculo. E' o cenario mais duro que o pacote pode receber, e por isso
o melhor.

### 9.3 · O que so' o hospedeiro prova

Os cenarios de `testes/` sao teste de unidade e integracao **do pacote**: mecanica, transicoes,
recusas. Todos os gates neles sao falsos (`echo "3 passed"`). Eles nunca provam:

se a orientacao e' boa · se a cerimonia e' proporcional · se a IA aguenta requisito ambiguo e teste
que falha por motivo obscuro · se as 494 regras disparam na hora certa · **o custo em tokens por
tarefa**, que e' o numero que decide se o pacote e' usavel.

### 9.4 · Depois: adotar num projeto real

So' quando a 9.2 fechar. Nao por ser mais dificil, mas por **ordem de descoberta**: o hospedeiro acha
os defeitos grosseiros a custo baixo, e a migracao do projeto real chega com o pacote ja' calibrado.
O contrario e' pagar o custo mais caro para descobrir o mais barato.

---

## Decisoes ainda pendentes do humano

Nenhuma bloqueia as fases 1 a 4.

1. **Escopo do hospedeiro.** A forma esta' definida (9.2); o escopo sai do rascunho, la'.
2. **`main`, `concessionaria`, `robust`, `teste-g` do `motocustorj`**: apagar ou manter
   (`MELHORIAS` §4.1). Nao afeta este repositorio.

---

## Registro de execucao

Uma linha por passo concluido: `DD/MM/AA HH:MM · passo · o que mudou · o que ficou pendente`.

```
29/08/26 · 1.1 · campo `fila` (ciclo|reserva); toda tarefa nasce na reserva; vista `reserva.md` gerada.
29/08/26 · 1.2 · `contexto.limites {em_execucao:1, ciclo_tarefas:12}`; `iniciar` recusa a 2a em
                 execucao e recusa tarefa que ainda esta na reserva; teto de 2.400 car no backlog.
29/08/26 · 1.3 · `achados[{classe,descricao,destino,ref}]` substitui `achados_encaminhados`;
                 `finalizar` recusa destino invalido e `ref` vazio. Testado nos dois casos.
29/08/26 · 1.4 · `validacao` + `validado_em` + `validacao_motivo`; vira `pendente` no fechamento
                 quando o projeto declara validacao manual; marca 🔍 no backlog. `task validar`
                 fica para 2.4 (a mensagem de fechamento ja aponta para ele).
29/08/26 · 1.5 · esquemas `divida-tecnica.json` (gatilho + dono) e `risco-aceito.json`
                 (evidencia + aceito_por nominal + tarefa_de_saida + revisao <= 90d);
                 `init` cria os dois arquivos vazios. Vistas e validador ficam para a fase 6.
29/08/26 · 1.6 · contexto ganha `versionamento`, `configuracoes_de_plataforma`, `limites`,
                 `revisao_geral` (20/30/40), `lembretes` (gerado) e 9 contagens novas.
                 Removidas duas chaves mortas (`tarefas_pendentes`, `linhas_do_pacote`).
29/08/26 · FASE 1 FECHADA · tsc limpo, verificar APROVADO, ciclo testado ponta a ponta.

29/08/26 · 2.1 · `task puxar` com a regra de passagem completa (origem resolvivel de verdade,
                 nao-XG, dependencia no ciclo ou concluida, vaga); `task guardar`; `reserva`.
                 Novo arquivo `cmd-fila.ts` para nao inchar o `cmd-tarefa.ts`.
29/08/26 · 2.2 · `task cancelar --motivo` (recusa sem motivo) e `task absorver --por`.
                 Substituem a secao "Numeros aposentados" mantida a mao. ID nunca reaproveitado.
29/08/26 · 2.3 · `task fatiar --titulos "a|b|c"`: fatias encadeadas, herdam valor/urgencia/cerimonia,
                 e o pai vira epico. Exige titulo proprio por fatia.
29/08/26 · 2.4 · `task validar --aprovado | --dispensado --motivo`.
29/08/26 · 2.5 · `concluidas/0-indice.md` gerado, com desfecho (concluida | cancelada: motivo |
                 absorvida por X) e a validacao. Cancelamento agora leva a narrativa junto.
29/08/26 · Dois defeitos meus, achados no teste e corrigidos:
             (a) epico na reserva com fatias no ciclo ficava invisivel no backlog;
             (b) o mesmo epico aparecia duplicado na listagem da reserva.
29/08/26 · FASE 2 FECHADA · tsc limpo, verificar APROVADO.
29/08/26 · 9.1 · `mentor instalar [--destino --forcar]` e `mentor manifesto`.
                 O manifesto guarda o hash de cada um dos 51 arquivos de `.mentor/`, e o `verificar`
                 compara. **Nao proibe editar para destravar; proibe esquecer que editou** — que foi
                 exatamente como o pacote chegou incompleto no roteirizador: copia manual nao tem
                 como saber que divergiu, entao nada avisava.
                 `contexto._meta.versao_do_pacote` gravado no `init`, sem o qual o relatorio de campo
                 nao consegue atribuir nada a uma versao.
                 Reinstalar por cima avisa quantos arquivos divergem antes de descartar.
29/08/26 · Tres defeitos meus em cadeia, todos achados pelo cenario `10-pacote`:
             (a) `caminhos().pacote` apontava para o pacote **em execucao**, nao para o que o
                 projeto usa. Instalado, `.mentor/` mora no repositorio do projeto, e e' esse que a
                 IA le'. Um conceito que eu tinha juntado num campo so;
             (b) o inventario de regras guardava caminho relativo a' raiz errada, e depois da
                 correcao (a) as 494 regras apareciam como "mudaram de arquivo";
             (c) a chamada de `divergenciaDoPacote()` nao entrou na lista de achados: o `replace`
                 casou a importacao e nao a chamada, e o `verificar` aprovava com a divergencia na
                 frente. Agora ha `assert` de que a funcao aparece duas vezes no arquivo.
29/08/26 · `npm run verify` passa a regenerar o manifesto antes dos testes: aqui o pacote e editado
             o tempo todo, e sem isso todo cenario acusaria divergencia do proprio repositorio.
29/08/26 · 8.1 · especificacao atualizada: a medicao das 197 tarefas do `motocustorj` entrou na
                 secao 1, as cinco regras anti-laco na secao 2, os 19 comandos reais na 10, e uma
                 secao 17 nova que liga cada capacidade ao cenario que a prova. No `MELHORIAS.md`,
                 nove blocos sairam de 🔵 para 🟢 com a fase que os entregou.
29/08/26 · 8.2 · ciclo completo num projeto de verdade, fora do repositorio: `init` · requisito ·
                 `nova` · `puxar` · `iniciar` · **vermelho antes do codigo existir** · escrever a
                 funcao · verde · `finalizar` · requisito vinculado pelo script · `verificar` ·
                 `lancamento` · `doctor`. Gate real (`node teste.mjs`), nao `echo`.
                 O registro guardou `vermelho_em` e `executado_em` no mesmo gate: a prova de que o
                 teste falhou antes de passar.
29/08/26 · 8.3 · tetos e custo de contexto remedidos, agora comparando com o antecessor **em
                 caracteres nos dois lados**, medido nos dois repositorios:
                   sempre carregado   42.137 -> 6.764    (6x menor)
                   abrir uma tarefa  171.591 -> 11.227   (15x menor)
                   pacote inteiro  1.027.929 -> 170.799  (6x menor)
                 A tabela anterior misturava linhas e caracteres, e estava errada.
29/08/26 · FASE 8 FECHADA · tsc limpo, 9 cenarios verdes, 26 de 26 passos.
29/08/26 · 7.1 · `mentor relatorio-de-campo`. Antes dele, o que faltava era o dado: acrescentado
                 `docs/tarefas/recusas.json`, **o unico registro do pacote que so cresce**, gravado
                 no momento em que `puxar` ou `finalizar` recusam. Apagar recusa seria apagar a
                 evidencia de onde o pacote atrapalha.
                 Parte A gerada com nove medicoes, entre elas as duas que nenhum projeto anterior
                 tinha: **onde o pacote recusou, agrupado por impedimento** (mede onde a IA falha,
                 sem ninguem opinar) e **quantas vezes a ordem da fila foi fixada a mao** (se for
                 frequente, quem muda e o pacote, nao quem usa).
                 Parte B nasce com marcador e exige ID e data. Parte C existe porque analise que so
                 lista defeito faz a leitura seguinte concluir que nada presta.
                 So metadado de processo: o cenario confere que nenhum titulo de tarefa vaza.
29/08/26 · Defeito achado rodando: o log de recusas guarda a frase do impedimento, e ela **cita o
             marcador**. O verificador acusou o registro do erro como se fosse o erro. Duas
             excecoes declaradas, com motivo no codigo: `recusas.json` e `relatorio-de-campo.md`.
29/08/26 · FASE 7 FECHADA · tsc limpo, 9 cenarios verdes.
29/08/26 · 6.1 · registro de riscos aceitos. `mentor ra [nova|encerrar]`, vista gerada com
                 Ativos e Encerrados, e as seis validacoes do `motocustorj`: sem evidencia, sem
                 tarefa de saida, sem responsavel nominal, sem justificativa, prazo acima de 90
                 dias, e data no passado (VENCIDO). **Nenhum campo e opcional, e e por isso que o
                 registro funciona.** Encerrar move para a secao propria, nunca apaga.
29/08/26 · 6.2 · `mentor lancamento` responde UMA pergunta, com seis itens: os gates rodados
                 **agora** (evidencia antiga nao vale, o portao mede o estado atual) · riscos
                 vencidos ou invalidos · perfil de qualidade · reversao executada · restauracao da
                 copia testada · validacao manual pendente.
                 `NÃO EXECUTADO` tambem reprova, e e' o comportamento que separa este portao de um
                 checklist: gate que nao rodou nao e gate verde.
29/08/26 · Dois defeitos meus, achados rodando: (a) usei 92 dias de prazo num teste do limite de
             90, e o registro foi recusado em silencio duas chamadas antes do erro aparecer;
             (b) o executor de testes morria inteiro quando um cenario lancava, escondendo os
             outros. Agora um cenario que quebra vira falha dele, e os demais continuam.
29/08/26 · FASE 6 FECHADA · tsc limpo, 8 cenarios verdes.
29/08/26 · 5.1 · `processos/entrega.md` (86% do teto), condensado do `docs/operacao.md` do
                 `motocustorj`. Nada nomeia plataforma. Traz inteiro o argumento certo para uma
                 tarefa por ramo: se um ramo carrega tres tarefas, o mesmo link de esteira vai para
                 tres registros e prova "as tres juntas passaram", nao "esta passou".
29/08/26 · 5.2 · o doctor cobra `versionamento` a partir da fase **construcao**, nao de
                 pre-lancamento. Era o gatilho que faltava e que o humano teve de pedir a mao:
                 quando ha o que publicar, o historico ja foi feito de outro jeito.
29/08/26 · 5.3 · `mentor hooks --instalar` escreve `.githooks/pre-push` e liga por
                 `core.hooksPath`. **Zero dependencia**, nada de husky. O hook chama
                 `mentor gates` (comando novo), que roda os comandos declarados PELO PROJETO em vez
                 de supor um `npm run`. Em pre-push e nao pre-commit, de proposito.
29/08/26 · 5.4 · `mentor stack github` nasce com 7 linhas rascunhadas, **cada uma marcada
                 `PREENCHER: confirmar ou trocar`**. Nao e padrao imposto: o pacote continua sem
                 opiniao sobre ferramenta, e o que ele economiza e digitacao.
29/08/26 · Cenario `07-entrega`. E o `06-doctor` quebrou com a mudanca de 5.2 e precisou declarar
             o versionamento: os exemplos versionados fizeram exatamente o que existem para fazer,
             mostrar mudanca de comportamento como falha antes de chegar num projeto real.
29/08/26 · FALHA MINHA, apontada pelo humano: construi cinco fases, escrevi o processo de entrega
             inteiro, e **nao notei que este repositorio nao tinha git**. Ninguem precisou lembrar
             ele; precisou lembrar a mim.
             A causa e estrutural e vale registrar: o `mentor-agent` e' o unico projeto **sem
             mentor**, porque a decisao 10 diz que ele nao usa a si mesmo. Nenhum doctor rodava
             sobre ele.
             Consertado na mesma tarefa, e virou checagem: o doctor cobra repositorio ausente
             (bloqueio), repositorio sem commit (bloqueio) e repositorio sem remoto (aviso).
             `git init` feito, 204 arquivos no primeiro commit.
29/08/26 · Hook testado de verdade, com remoto local: gate vermelho **barrou o push**, gate verde
             deixou passar, e `--no-verify` continua funcionando de proposito, porque a barreira
             avisa e nao aprisiona. Tres commits chegaram ao remoto.
29/08/26 · Dois defeitos meus achados pelos cenarios, em sequencia:
             (a) procurei a pasta `.git` em vez de perguntar ao git, entao projeto dentro de um
                 repositorio maior aparecia como nao versionado. Trocado por
                 `git rev-parse --is-inside-work-tree`, que tambem cobre worktree e submodulo;
             (b) a assercao seguinte assumia o contrario, e os exemplos versionados a derrubaram.
                 Nasceu o `abrirCenarioTemporario`, que roda fora do repositorio, para o unico caso
                 que precisa disso.
29/08/26 · FASE 5 FECHADA · tsc limpo, 7 cenarios verdes, repositorio versionado.
29/08/26 · 4.1 · `doctor` absorve o `auditar` (que virou alias com aviso). Secoes SEGURANCA,
                 QUALIDADE e PROCESSO, terminando em veredito binario. Grava `lembretes` e o
                 `perfil` no contexto, os dois como SAIDA: o doctor calcula e sobrescreve.
                 Acrescentado o **perfil ISO/IEC 25010**, que e' a tabela QS-24 do guia com nome
                 de norma. Cinco estados, e os dois primeiros existem porque a maioria dos sistemas
                 de nota os funde: `sem meta` nao e' `sem afericao`, e nenhum dos dois e' conforme.
                 **Nao ha nota unica**: media ponderada diluiria a caracteristica quebrada. A nota
                 sao duas fracoes contaveis: conformes sobre avaliadas, e avaliadas sobre oito.
29/08/26 · 4.2 · cadencia da revisao geral, escala 20 avisa / 30 atrasa / 40 bloqueia o veredito.
                 O doctor e' gratis e roda sempre, entao nao precisa de cadencia; quem precisa e' a
                 revisao geral, que custa uma sessao.
29/08/26 · 4.3 · auditor escrito em `processos/revisao.md` (84% do teto). Escopo fechado no diff,
                 cinco regras, bloqueio por classe de falsidade e nao por tema, e a calibracao que
                 exige declarar o que NAO foi verificado.
29/08/26 · Defeito meu, e do tipo que so' aparece conferindo: o primeiro `replace` do auditor nao
             casou por um acento na ancora e **falhou em silencio**, deixando o arquivo intacto.
             So' notei porque imprimi o tamanho depois de escrever. Refeito com `assert` na ancora.
29/08/26 · Cenario `06-doctor`: perfil com os cinco estados, os tres degraus da cadencia, e a
             gravacao de lembretes e perfil no contexto.
29/08/26 · FASE 4 FECHADA · tsc limpo, 6 cenarios verdes.
29/08/26 · 3.1 · integridade de link em markdown, dentro da familia 3 (todo ponteiro resolve),
                 e nao como familia nova: link e' ponteiro. Confere link relativo que nao resolve,
                 extensao dupla `.md.md`, e **grafia exata segmento por segmento** — a checagem que
                 pega `32-adr.md` apontando para `32-ADR.md`, que funciona no Windows e quebra no
                 GitHub. Bloco de codigo e trecho `inline` sao ignorados.
29/08/26 · 3.2 · `.mentor/regras.json`, 494 regras extraidas do guia por regex, com a coluna
                 `comando`. Comando `mentor regras [--sincronizar]`, que preserva os `comando`
                 preenchidos a mao. O `verificar` confere o espelho nos dois sentidos: regra do
                 guia fora do inventario, regra do inventario que sumiu do guia, e regra que mudou
                 de arquivo. Hoje: 0 de 494 viraram comando, e esse zero e' o numero que a tabela
                 do relatorio de campo (§8 de MELHORIAS) existe para mostrar.
29/08/26 · Cenario `05-verificacao`: prova que o verificador REPROVA. Um verificador testado so'
             no caso verde passaria igual estando quebrado — foi o defeito do autoteste do
             antecessor, ao contrario. Ele termina deixando o exemplo num estado que passa.
29/08/26 · FASE 3 FECHADA · tsc limpo, 5 cenarios verdes.
29/08/26 · DECISAO 4 FECHADA: metodo de teste. Padrao `tdd`, trocavel com motivo escrito, em
             `contexto.qualidade.metodo_de_teste`. Fora do nucleo, que continua em 93% do teto.
             Duas checagens no fechamento, nenhuma de julgamento:
               (a) todo criterio de aceite nomeia um teste, em qualquer metodo. Saida honesta:
                   "nao se aplica: <motivo>";
               (b) com `tdd` ou `bdd`, o gate de testes precisa de um registro VERMELHO antes do
                   verde. `--esperando-vermelho` recusa quando o comando sai verde, porque ai o
                   teste passa sem o codigo e nao testa o que promete.
             Novo tipo `SPIKE`: exploracao declarada, sem criterio com teste, narrativa propria
             (a resposta · o que foi descartado · a tarefa que destrava). Existe para a exploracao
             nao se disfarcar de tarefa normal.
             `processos/teste.md` criado: o `tarefa.md` estourou 19% do teto e o assunto tinha
             tamanho de processo proprio. Cenario `04-tdd` cobre os quatro casos.
29/08/26 · TESTES (pedido do humano, e falha minha: eu vinha testando em sandbox descartavel,
             fora do repositorio, sem repetibilidade). Criado `testes/` com tres cenarios que
             constroem mini-projetos reais em `testes/exemplos/`, versionados e legiveis.
             Duas correcoes de desenho que isso exigiu, e que valem por si:
               (a) raiz do PACOTE (por `import.meta.url`) separada da raiz do PROJETO
                   (`MENTOR_RAIZ`, ou o ancestral com `docs/contexto.json`). Sem isso, projeto
                   dentro do repositorio do pacote confundia os dois;
               (b) `MENTOR_AGORA` congela o relogio, senao cada rodada mudaria toda data e o diff
                   dos exemplos viraria ruido. Conferido: duas rodadas dao byte identico.
             `npm run verify` = tsc + cenarios. O cenario `03-recusas` e' o que mais importa:
             um pacote cujo proposito e' recusar nao se prova com caminho feliz.
29/08/26 · Revisao da decisao de ID, provocada pelo humano. A proibicao de decimal estava no
             `MELHORIAS.md` pela razao errada: a original morreu quando o script passou a gerar o
             ID. Mantida por outra razao, que sobrevive: ID e' imutavel, relacao pai-filho nao e'.
             `fatia N/M` passou a ser calculado na geracao da vista, nunca guardado, porque o
             denominador e' movel (observacao do humano). Testado: 2/3 virou 2/5 sem renomear nada.
29/08/26 · 9.1c · O auditor virou comando: `auditar preparar | registrar | resolver`. Cadencia,
             nao toda tarefa. O escopo fechado deixou de ser promessa e virou o unico material que a
             sessao nova recebe. Duas correcoes que so' apareceram ao ler um dossie real: as vistas
             geradas saem do diff (afogavam o codigo e produziam achado falso) e arquivo nunca
             commitado entra inteiro (`git diff` nao o mostra, e e' onde o erro novo mora).
             DEFEITO MEU, achado por mutacao: a asercao do arquivo nao commitado passava por outro
             caminho — eu criava o `login.ts` **antes** do `commit -A` do cenario, entao ele estava
             rastreado e entrava pelo diff normal. Passava sem provar nada. Corrigido movendo a
             criacao para depois do commit, e reconferido quebrando o comando de proposito.
             Licao repetida pela terceira vez neste projeto: **asercao verde nao e' asercao que
             bite.** So' vale depois de ver ela vermelha.
30/08/26 · 9.0 · DEFEITO ACHADO AO EXECUTAR O CAMINHO DOCUMENTADO, nao ao le-lo. O `npm pack` ->
             `npm i -D` -> `npx mentor instalar` da 9.0 **nunca funcionou**: o Node se recusa a
             remover tipos dentro de `node_modules`. O comando morria na primeira linha.
             Corrigido com `.mentor/scripts/instalar.mjs` em JS puro, fonte unica da copia, e um
             `mentor.mjs` que detecta node_modules e so' aceita `instalar` de la'.
             Junto: `.mentor/package.json` com type:module, senao todo comando imprime aviso.
             Cenario `10-pacote` ganhou o caminho de node_modules — sem ele, isto so' apareceria
             no primeiro projeto real, que e' o lugar mais caro possivel para descobrir.
             Licao de desenho: **caminho de entrega documentado e' promessa ate' ser executado.**
             Eu tinha escrito as quatro linhas do 9.0 com confianca e nao as tinha rodado uma vez.
30/08/26 · Remoto, tag v0.1.0 e notas da release preparados. O `push` fica com o humano: o shell
             que eu tenho na maquina dele nao alcanca as credenciais do GitHub. Repositorio
             PUBLICO (decisao do humano), entao a instalacao e' `npm i -D github:...#v0.1.0`.
             DEFEITO ACHADO POR ACIDENTE, e vale mais que o conserto: adicionar o remoto quebrou o
             cenario `07-entrega`, que afirmava "sem remoto" rodando num exemplo **dentro deste
             repositorio**. A asercao nao testava o pacote, testava o ambiente — e passava verde ha'
             dias por coincidencia. Movida para repositorio temporario proprio.
             Regra que sai daqui: **asercao sobre git roda em repositorio isolado, sempre.**
30/08/26 · O DEFEITO MAIS GRAVE ATE AGORA, e quem achou foi o humano instalando num projeto real:
             o pacote nao criava ponto de entrada nenhum, entao **nenhuma ferramenta de IA carregava
             o nucleo**. `carregamento: sempre` estava escrito no cabecalho de um arquivo que nada
             no mundo abria. Regra sem mecanismo pela terceira vez no mesmo dia, e a mais cara: sem
             o nucleo, as 494 regras nao existem.
             `instalar` passa a criar CLAUDE.md, AGENTS.md e GEMINI.md (escolha do humano).
             Ponteiro, nunca espelho: 1.885 caracteres somados contra 26.440 do antecessor, e
             nenhuma regra repetida. So' o CLAUDE.md e' mecanico (`@arquivo` entra no contexto);
             nos outros e' instrucao, que e' o teto do que existe hoje.
             Nunca sobrescreve arquivo existente: imprime a linha para colar. O doctor bloqueia
             quando nao ha entrada nenhuma, ou quando a que existe nao cita o nucleo.
             O cenario `06-doctor` quebrou junto e estava certo em quebrar: ele afirmava veredito
             limpo num projeto que ninguem carregava.
30/08/26 · 0.1.1. A tag v0.1.0 foi publicada apontando para o commit ERRADO: eu a recriei local
             depois que o humano ja' tinha empurrado, e a atualizacao nao foi junto. Quem instalou
             pela tag recebeu a versao sem pontos de entrada. Falha minha, e da especie que o pacote
             existe para impedir: **mexer numa tag depois de ela existir e' divergencia silenciosa.**
             Decisao (humano): nao mover a tag. Publicar 0.1.1 e deixar a 0.1.0 como registro do que
             ela era de fato. Versao e' promessa sobre conteudo.
             Junto: `postinstall` que imprime o passo que falta. `npm i` sozinho nao muda nada no
             projeto por desenho, e sem esse aviso o usuario ve zero diferenca e conclui que quebrou.
             Foi exatamente o que aconteceu com o humano hoje.
30/08/26 · MESMO DEFEITO, SEGUNDA VEZ, e so' apareceu porque testei com o tarball de verdade em
             vez de rodar do repositorio: os pontos de entrada moravam em `entrada.ts`, e o caminho
             de node_modules nao carrega `.ts`. O `instalar` copiava o pacote e **nao criava entrada
             nenhuma** — instalava um pacote que nada carregava, que e' o defeito que ele tinha
             acabado de consertar. Movidos para `instalar.mjs`, em JS puro, com o resto.
             `postinstall` removido: o npm engole a saida de script de dependencia, entao ele nao
             imprimia nada. Aviso que nao aparece e' pior que aviso nenhum, porque da' a impressao
             de que existe.
             Regra que sai daqui: **todo caminho que passa por node_modules e' JS puro, e o cenario
             `10-pacote` prova isso arquivo a arquivo.** Duas vezes nao pode virar tres.
30/08/26 · 0.1.2 · PRIMEIRO ACHADO DE CAMPO, e veio do humano lendo a saida num projeto real.
             O `contexto.md` dizia "Decidido: 25 campos" com **zero** decisao tomada: os 25 saem
             prontos do esquema. Campo pre-preenchido ficava indistinguivel de campo respondido, e
             sumia da pauta sem ninguem ter pensado nele. Fura o principio P7 do pacote inteiro
             (campo vazio e' a pauta do mentor) e ainda da' ao projeto aparencia de maturidade que
             ele nao tem, para a pessoa e para a IA que le' isso toda sessao.
             Corrigido comparando com `.mentor/esquemas/contexto.json`, sem campo nem comando novo.
             O teto de 2.400 do `contexto.md` reprovou a primeira versao, que listava os 25. Estava
             certo: e' vista sempre carregada, e listar valor que ninguem escolheu custa caractere
             para nao dizer nada. Agora sao contados, nunca listados.
             Junto: o cabecalho das vistas dizia "Gerado por `npm run mentor`", comando que nao gera
             nada e que o proprio README manda nao usar porque o npm engole as flags.
             ⚠️ v0.1.1 ja' estava publicada e NAO foi movida. Licao de horas atras, aplicada.

VALIDACAO 9.3 · O pacote carregou num projeto real pela primeira vez (roteirizarj-limpo, 30/08).
             Claude, Codex e Gemini leram o nucleo pelos pontos de entrada; as demais ferramentas
             reconheceram a instrucao de ler. E' o unico teste que nenhum dos 12 cenarios faz.
30/08/26 · REGRA VINDA DO HUMANO, e ela corrige um erro meu de metodo: **entrega se prova pelo
             remoto, nunca pela copia local.** Eu tinha orientado a copiar de uma pasta para a
             outra para destravar rapido, e o atalho pula justamente as etapas que falham. Se ele
             tivesse seguido, teria instalado, funcionado, e a tag continuaria faltando no remoto
             sem ninguem saber. Duas provas no mesmo dia: a tag errada, e a instalacao por npm que
             nunca funcionou enquanto eu so' rodava do repositorio.
             Registrado em `processos/entrega.md` como secao propria.
30/08/26 · 0.1.3 · Fase 10, passo 1. Achado 2 do campo: **todo risco aceito nascia vencido.**
             `ra nova` aceitava prazo de 77 dias e o `doctor` reprovava no mesmo minuto, porque
             existiam DUAS contas de "vencido" no pacote e so' uma estava certa. Efeito perverso:
             usar o comando de registrar excecao PIORAVA a saude do projeto.
             Causa funda, e ela repete um padrao do dia: `Number.isNaN(...) || revisao < hoje`
             fundia **"nao consegui ler"** com **"venceu"**. Desconhecido tratado como estado
             conhecido, igual ao contador que somava padrao do pacote com decisao do humano.
             Correcao: `lerData()` como fonte unica de leitura de data, `estadoDoPrazo()` como
             fonte unica do veredito, e `ilegivel` como quarto estado com nome proprio.
             `relogioDoPacote()` faz `MENTOR_AGORA` valer tambem para prazo, que nao valia.
             TDD de verdade: teste escrito primeiro, visto VERMELHO nas tres asercoes, depois o
             conserto. Mutacao confirmou que mordem.
             DOIS ERROS MEUS NO CAMINHO, os dois uteis:
               (a) meu regex `/risco.*vencido/i` casava com a mensagem NEGATIVA "nenhum risco
                   aceito vencido", e reprovava o codigo certo. Teste errado, nao codigo errado;
               (b) ao separar `ilegivel` de `vencido`, o estado novo ficou INVISIVEL no doctor.
                   Separar sem dar destino a metade nova esconde o defeito melhor que antes.
             LIMITE HONESTO: a correcao do relogio congelado nao tem teste que falhe sem ela. As
             datas do cenario dao o mesmo veredito com relogio real ou congelado, entao ela esta'
             certa por leitura, nao por prova. Registrado para nao passar por provado.
```
