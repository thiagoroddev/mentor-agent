# Fase 10 · O que o campo achou

Plano aprovado e em execucao. Origem: `roteirizarj-limpo/docs/melhorias-do-pacote.md`,
8 achados de uso real em 30/08, mais duas decisões suas nesta conversa.

Duas versões, porque a natureza do trabalho é diferente:

- **0.1.3** conserta o que quebra uso hoje. Nenhuma mudança de estrutura.
- **0.2.0** muda estrutura e nasce da doutrina de adoção. Quebra projeto instalado, e por isso
  precisa de caminho de saída escrito antes de começar.

---

# 0.1.3 · O que quebra uso hoje

## Passo 1 · Risco aceito nasce vencido 🟢 *(feito, 0.1.3)*

**O defeito.** `ra nova` aceita `15/11/26 14:00`, data a 77 dias no futuro, e responde *"revisar até
15/11/26"*. O `doctor` na mesma hora reprova: *"1 risco aceito VENCIDO"*. Reproduzido.

**A causa.** Duas funções do mesmo pacote leem data em formatos diferentes:

```
arquivos.ts:149   diasDesde()     regex DD/MM/AA, parse à mão      correto
vistas.ts:30      riscoVencido()  new Date("15/11/26") = Invalid   errado
```

**A causa mais funda, e é ela que interessa.** `riscoVencido` faz
`Number.isNaN(revisao.getTime()) || revisao < hoje`. Isso funde **"não consegui ler"** com
**"venceu"**. É o mesmo defeito de classe que o contador do `contexto.md` tinha ao somar padrão do
pacote com decisão sua: tratar desconhecido como se fosse um estado conhecido. Desconhecido merece
nome próprio, sempre.

**Um segundo defeito na mesma função:** `hoje: Date = new Date()` ignora `MENTOR_AGORA`. O relógio
congelado não vale para risco, então esse caminho nunca foi reprodutível em teste.

**A mudança.**

1. `lerData(log): Date | null` em `arquivos.ts`, **fonte única de leitura de data**, extraída do
   `diasDesde` que já a implementa certo. `diasDesde` passa a usá-la.
2. `riscoVencido` usa `lerData` e `relogio()`, não `new Date()`.
3. Data ilegível deixa de virar "vencido". Vira estado próprio, `data_ilegivel`, reportado como
   defeito do registro, não como prazo estourado. Continua reprovando, mas dizendo a verdade.

**O teste, e por que o atual não pegou.** O cenário `08-lancamento` afirma que o lançamento é barrado
e que a saída contém `NÃO EXECUTADO`. **As duas coisas continuam verdadeiras com o bug**, porque
risco vencido também barra e a mensagem da reversão também aparece. Quarta asserção vazia desta
semana: ela media um sintoma que o defeito produz igual.

O teste novo afirma o que só é verdade sem o bug:

```
data futura   ->  `ra` diz "no prazo"  E  `doctor` NAO cita risco vencido
data passada  ->  `ra` diz VENCIDO     E  `doctor` cita risco vencido
data ilegivel ->  as duas dizem "data ilegivel", nunca "vencido"
```

E uma asserção que é a invariante de verdade: **`ra` e `doctor` nunca discordam sobre o mesmo
risco.** Foi a discordância entre eles que criou o defeito.

Conferido por mutação antes de dar por pronto.

**Risco da mudança:** baixo. Função isolada, sem mudança de formato de arquivo.

## Passo 2 · Instalar o pacote reprova o lint do projeto 🟢 *(feito, 0.1.3)*

**O defeito.** `eslint .` varre a raiz, encontra `.mentor/scripts/*.ts` e produz 1.975 erros, nenhum
em `src/`. Como o núcleo exige gate verde para fechar tarefa, **a instalação trava o ciclo que ela
veio abrir**. É o pior tipo de defeito de adoção: o projeto piora no minuto em que adota.

**A mudança.** O `instalar` não edita configuração de ninguém, porque não é dono dela. Ele:

1. detecta o analisador pela presença de config na raiz (`eslint.config.*`, `.eslintrc*`,
   `biome.json`, `.prettierrc*`);
2. imprime, ao fim da instalação, a linha exata a acrescentar, com o caminho do arquivo encontrado;
3. o `doctor` passa a checar: existe analisador configurado que **não** ignora `.mentor/`? Isso é
   aviso, com a linha pronta para colar.

**Por que não editar automaticamente:** configuração de lint é do projeto, e sobrescrever a do
usuário é a mesma classe de erro que sobrescrever o `CLAUDE.md` dele.

**Por que adequar o estilo do pacote não resolve** (pergunta do humano, 30/08, respondida com o
`eslint.config.js` real do `roteirizarj` em mãos). A regra que dispara é `"prettier/prettier": "error"`
sobre `**/*.{ts,tsx}`, e o que ela cobra não é estilo em abstrato: é **bater com a saída do prettier
configurado naquele projeto**. Lá o `printWidth` é 200; o padrão é 80. Código formatado para um
acusa erro no outro. Não existe formatação que satisfaça um projeto arbitrário, porque a resposta
certa depende de uma configuração que o pacote não pode conhecer.

⚠️ E há um motivo específico deste pacote que fecha a questão: se o projeto reformatasse `.mentor/`,
o `verificar` acusaria divergência em todos os arquivos. **O manifesto e o formatador brigariam**, e
o manifesto perderia toda a utilidade. `.mentor/` é dependência versionada junto, e dependência se
ignora, como `node_modules` e `dist`.

**Teste:** cenário com `eslint.config.js` na raiz, conferindo que o `instalar` nomeia o arquivo certo
e que o `doctor` avisa enquanto o ignore não existir.

## Passo 3 · Exceção de teto com glob 🟢 *(feito, 0.1.3)*

**O defeito.** `cmd-verificar.ts:49` compara exceção por igualdade (`e.caminho === rel`), enquanto as
regras usam `casa(padrao, rel)`. Migrar 10 ADRs exigiu 10 entradas literais idênticas no `tetos.json`.

**A mudança.** Exceção passa a usar a mesma `casa()`. Uma entrada com
`docs-mentor/arquitetura/ADR/ADR-0*.md` substitui as dez.

⚠️ **Só isso não basta**, e é o que o achado 4 mostra: a exceção mora dentro de `.mentor/`, que o
`instalar --forcar` sobrescreve. Exceção do projeto tem que sobreviver à atualização do pacote.
Proposta: `tetos.json` do pacote continua sendo o padrão, e um `tetos.json` **do projeto** (fora do
`.mentor/`) acrescenta e sobrepõe. Some do caminho da atualização.

**Teste:** um glob cobrindo três arquivos, e exceção de projeto sobrevivendo a `instalar --forcar`.

## Passo 4 · Tetos calibrados com dado real 🟢 *(feito, 0.1.3)*

| Arquivo | Teto hoje | Real medido | Proposta |
| :-- | --: | --: | --: |
| `contexto.md` | 2.400 | 7.626 com os oito portões respondidos | 8.000 |
| ADR nova | 1.800 | 1.800 serve para ADR escrita curta | mantém |
| ADR migrada | 1.800 | 3.979 a 13.548 | exceção de projeto, por glob |

O teto do `contexto.md` foi calibrado em projeto vazio, e o conteúdo é **gerado por script**, não
prosa que se possa enxugar. Teto sobre saída gerada é teto sobre o gerador, e o gerador está certo.

## Passo 4b · A versão gravada não acompanhava a atualização 🟢 *(feito, 0.1.3)*

**Achado 9, vindo do campo depois de instalar a 0.1.3.** O pacote foi para 0.1.3 e
`contexto._meta.versao_do_pacote` continuou dizendo 0.1.2.

**A causa.** Só o `init` escrevia esse campo, e o `init` recusa rodar em projeto que já existe. Nenhum
caminho de atualização o tocava, então ele ficava congelado na versão da adoção, para sempre.

**Por que é grave e não cosmético.** É o único campo que liga um achado de campo a uma versão. Os 8
furos do `roteirizarj` foram medidos na 0.1.2 e três já estavam corrigidos na 0.1.3; com o campo
mentindo, o relatório atribuiria defeito já resolvido à versão que o resolveu.

**A mudança.** O campo passa a ser gerado a cada regeneração, lido do `manifesto.json` do pacote
**instalado**. Não é lembrado por comando nenhum: qualquer coisa que regenere o contexto o corrige.
É o princípio P2 do pacote, "se dá para gerar, gere", aplicado onde faltava.

## Passo 4c · O relatório de campo media a si mesmo errado 🟢 *(feito, 0.1.3)*

**Achados 10 e 11, e os dois são sobre o instrumento de medição.** Foram achados exatamente por
alguém rodar o relatório em campo, que é a única forma de achar defeito num instrumento.

**10 · A versão publicada era a do projeto, não a do pacote.** `cmd-campo.ts` fazia
`join(raizPacote(), 'package.json')`. Instalado, `raizPacote()` é a raiz do projeto, então lia o
`package.json` do app: o relatório saiu dizendo *"mentor-agent 0.1.0"*, que era a versão do
`eu-roteirizo`. **Ancorar achado numa versão é a única coisa que este relatório existe para fazer.**

Corrigido para ler `.mentor/manifesto.json`, e ele agora confere contra
`_meta.versao_do_pacote`, avisando no cabeçalho quando divergirem.

⚠️ **Falha minha de método:** ao consertar o achado 9 (a versão congelada no contexto) eu não
procurei os outros lugares que liam versão. O 10 é irmão do 9 e estava a um `grep` de distância.
Consertar um sintoma sem varrer a classe é como o loop do antecessor começa.

**11 · A parte B não alcançava o atrito da adoção.** Ela exigia ID de tarefa por item, mas
instalar e inicializar acontece **antes de existir qualquer tarefa**. Todo o atrito medido na
sessão de adoção ficou fora de B, e sobreviveu só porque `mentor anotar` aceita texto solto e caiu
em A.10. Agora a âncora aceita três formas: `TASK-XXX-NNN`, `adocao`, ou `fase:<fase>`.

**Um terceiro, que eu achei lendo o relatório:** com zero tarefas concluídas, A.1 anunciava
*"Funcionalidade: 0%. Abaixo de 50% indica pacote consumindo o projeto."* Isso é afirmar sobre
amostra vazia, e é a mesma família de erro do dia: **tratar ausência de dado como um valor.** Agora
diz `sem dados`.

## Passo 4d · A fonte da Parte B nascia reprovada 🟢 *(feito, 0.1.6)*

**Achado 13, vindo do hospedeiro depois de instalar a 0.1.5.** A separação entre gerado e escrito
funcionou: `atrito-de-campo.md` sobreviveu byte a byte a duas regenerações e apareceu no relatório.
Mas o arquivo novo nascia com três marcadores `PREENCHER:`, e o `verificar` os tratava como trabalho
incompleto do projeto. Instalar a correção fazia o ciclo reprovar imediatamente.

As três categorias do atrito são opcionais. Seus marcadores são conteúdo de orientação do relatório,
não promessa de trabalho do projeto. `atrito-de-campo.md` passou a receber a mesma exceção já dada a
`relatorio-de-campo.md`; todo outro marcador continua reprovando.

**Teste:** logo após gerar o primeiro relatório, `verificar` precisa aprovar mesmo com o esqueleto de
atrito intacto. Visto vermelho antes da correção; remover a exceção por mutação derruba exatamente a
nova asserção.

---

# 0.2.0 · Adoção não é migração

Esta parte nasce de duas coisas que você disse, e elas mudam a doutrina, não só o código.

## A doutrina, em duas frases

**1. O pacote não é dono de `docs/`.** Um projeto pode ter `docs/` desde antes, para outra coisa. O
pacote reivindicar esse nome é colonizar pasta alheia. Passa a ser **`docs-mentor/`**.

**2. Agente anterior é sistema externo.** Estrutura diferente é sistema diferente, mesmo tendo saído
das suas mãos. O tratamento correto é o mesmo que se daria a Jira, Trello ou uma planilha: **não se
migra, se referencia.**

## A regra que decide o que converter

> **Converte-se só o que alimenta automação daqui para frente.** O resto fica onde está, somente
> leitura, e é alcançado por referência.

| O que | Alimenta automação? | Destino |
| :-- | :-- | :-- |
| Tarefas pendentes | sim: fila, limite de WIP, IDs | **converte** |
| Requisitos pendentes | sim: vínculo requisito ↔ tarefa | **converte** |
| Dívidas abertas | sim: o doctor conta | **converte** |
| Riscos aceitos ativos | sim: portão de lançamento | **converte** |
| Tarefas concluídas | não | fica, referenciada |
| Requisitos implementados | não, **mas precisam ser citáveis** | fica, referenciada |
| ADRs | não, **mas precisam ser citáveis** | fica, referenciada |
| Documento histórico | não | fica, referenciada |

## Passo 5 · `docs/` passa a `docs-mentor/` 🟢 *(feito, 0.2.0)*

Muda `caminhos()`, os 12 cenários, os exemplos versionados, os textos dos pontos de entrada, o README
e a ESPECIFICACAO. É mecânico e grande.

**Caminho de saída para quem já instalou:** `instalar --forcar --migrar-docs` reconhece somente uma
`docs/` com `contexto.json` e a renomeia. Sem a flag, recusa e explica. Se `docs-mentor/` também
existir, recusa o conflito e não move nada. Uma `docs/` alheia ao pacote fica intacta.

**Prova:** os 12 cenários usam `docs-mentor/`; o cenário de pacote cobre projeto novo com `docs/`
preexistente, recusa sem autorização, migração autorizada, conflito sem movimento e o caminho real
de instalação por `node_modules`.

## Passo 6 · Referência a sistema externo

É aqui que o **achado 6** deixa de ser problema de migração e vira o que sempre foi: um problema de
**resolubilidade**. Uma tarefa precisa citar `RF-12` na origem e o `verificar` precisa resolver esse
ID. Não é preciso importar o requisito. É preciso saber que ele existe e onde.

```json
{
  "id": "RF-12",
  "onde": "arquivo-historico/docs/requisitos/requisitos.json",
  "sistema": "esquadro-agents",
  "registrado_em": "30/08/26"
}
```

⚠️ **Isto é exatamente o atalho que você propôs para invariantes**, duas mensagens atrás: apontar
documento e data em vez de copiar conteúdo. O mesmo mecanismo resolve migração e invariante, e essa
convergência é o argumento mais forte de que a ideia está certa.

O `verificar` passa a resolver ID por três caminhos, nessa ordem: registro nativo, referência
externa, ou falha. Hoje ele só conhece o primeiro, e é por isso que requisito implementado não tem
como ser citado.

## Passo 7 · Lugar para documento que não é ADR

**Achado 7**, e ele confirma por outro caminho a §7 da `ANALISE-DOCUMENTACAO.md`, escrita antes de eu
ver o campo. Lá ficaram sem destino `visao-geral.md`, `rotas.md`, `componentes-ui.md` e
`setup-inicial.md`; na análise, o tema do Tailwind.

Este passo depende da decisão que ainda está aberta na análise, e **não deve ser planejado em detalhe
antes dela**. As opções estão lá: registro de invariantes, glossário, lugar para especificação do que
ainda não existe. Fica marcado como dependente, de propósito.

## Passo 8 · IDs que não colidem

**Achado 5.** O contador reinicia em 001 e cria `TASK-BG-001` homônimo de um antigo com escopo
diferente. Proposta: a inicialização de projeto que já teve agente pergunta o **maior ID por prefixo
já usado**, e o contador começa acima dele. Sem migrar nada: só não reusar número queimado.

---

## Ordem, e por quê

```
0.1.3   passo 1 (risco vencido)      quebra uso hoje, e voce ja aprovou
        passo 2 (lint)               trava o ciclo em qualquer projeto com lint na raiz
        passo 3 (glob nos tetos)     barato, e limpa as 10 entradas literais
        passo 4 (tetos calibrados)   depende do 3

0.2.0   passo 5 (docs-mentor)        mecanico e grande, melhor sozinho
        passo 6 (referencia externa) resolve os achados 6 e parte do 7
        passo 8 (IDs)                pequeno, depende do 6 estar de pe
        passo 7 (documento)          BLOQUEADO ate voce decidir a analise
```

**Cada passo entra com cenário de teste junto, conferido por mutação.** Quatro asserções vazias
apareceram esta semana, todas verdes, todas provando nada. Verde só conta depois de ter sido visto
vermelho.
