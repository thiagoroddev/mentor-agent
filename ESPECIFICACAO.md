# mentor-agent

> Pacote de trabalho para agentes de IA. Gerencia tarefas, orienta quem nao sabe o que precisa
> perguntar, e registra tudo de forma rastreavel.

**Este arquivo e' a fonte do desenho.** Ele existe porque a decisao inteira nasceu numa conversa, e
conversa se perde. Enquanto o projeto nao tiver codigo, este arquivo e' o projeto.

Data do desenho: 28/08/26 · Autor das decisoes: Thiago · Base normativa: `GUIA.md`
(`E:\ESTUDO\ESTUDO\ADS\_Guia-Agentes-IA\GUIA.md`, 2376 linhas, 495 regras)

---

## 1. O problema que este projeto existe para resolver

O antecessor (`esquadro-agents`) funciona e reprova o que deve reprovar. O defeito nao e' de
execucao, e' de proporcao. Medido no proprio repositorio:

| Medida | Valor |
| :-- | --: |
| Tarefas concluidas | 95 |
| Delas, CHORE + DOC | 75 (79%) |
| Delas, RF/RN/RNF (funcionalidade) | 0 |
| Bugs registrados | 7 |
| Deles, bugs do proprio aparato de verificacao | 7 (100%) |
| Instrucao de produto | 22.707 linhas em 35 arquivos |
| Carregado em toda interacao | 765 linhas |
| Carregado para abrir uma tarefa Standard | 3.042 linhas |
| Passos manuais para fechar uma tarefa | 9 |
| `docs/requisitos/funcionais.md` depois de 95 tarefas | vazio |

**Mecanismo do defeito:** o pacote transformou orientacao em lei. Lei exige mecanismo de
verificacao, mecanismo encontra violacao, violacao vira tarefa, tarefa gera regra nova. N regras
produzem ate N^2 interacoes a conferir. O resultado medido e' um projeto que so' produz manutencao
de si mesmo.

**A ultima linha da tabela e' a prova mais limpa:** o processo mais valioso do pacote e' o unico que
nunca foi executado, porque era manual.

---

## 2. Os sete principios de desenho

**P1 · Lei ou orientacao, nunca os dois.**
*Lei*: obrigacao verificavel, tem mecanismo, fica no contexto, e' curta.
*Orientacao*: conselho, sem mecanismo, e' consultada e fechada.
Nada entra como lei sem mecanismo. Lei sem mecanismo e' orientacao disfarcada, e foi assim que o
antecessor adoeceu.

**P2 · Se da' para gerar, gere. So' confira o que nao da' para gerar.**
Data, hora, ID, nome de arquivo, indice, contagem, visao de tabela: gerado. Nunca digitado, nunca
conferido.

**P3 · Evidencia, nao declaracao.**
Gate so' fica verde quando um executor registrou comando, resultado e horario. `APROVADO` honesto e
`APROVADO` inventado produzem texto identico; sem evidencia a palavra nao significa nada.

**P4 · Teto de texto, medido em caracteres, nao em linhas.**
Trinta regras em trinta linhas e' aceitavel. Uma regra em trinta linhas nao e'. O que se limita e'
o texto, porque texto e' o que consome atencao.
**Teto de linha nao e' teto de texto:** uma linha de 414 caracteres conta igual a uma de 12, e
qualquer teto de linhas se burla juntando paragrafos. Por isso a checagem conta caracteres.
**O teto nunca autoriza apagar conteudo.** Ele e' disciplina de escrita: obriga a escrever menos e a
escolher melhor as palavras. Se depois disso o conteudo nao couber, o tamanho e' custo necessario, e
o excedente se declara. Ambiguidade introduzida para caber e' pior que o excedente.

**P5 · Uma fonte, varias visoes geradas.**
Dado estruturado em JSON, narrativa em Markdown, e todo Markdown que espelha dado e' gerado. Duas
fontes que precisam concordar sao a classe de erro que este projeto existe para evitar.

**P6 · Auditoria reporta, nunca cria tarefa.**
A auditoria devolve perguntas ao humano. Ele escolhe quais viram tarefa. Auditoria que cria tarefa
sozinha reproduz o loop, so' que agendado.

**P7 · Campo vazio e' a pauta do mentor.**
O guia nao e' lido inteiro por ninguem. Ele e' endereçado por lacuna: o contexto tem um campo para
cada decisao que o guia exige, e campo `null` e' a pergunta que a IA faz.

---

## 3. Arquitetura em quatro camadas

```
1  NUCLEO        lei     ~120 linhas   sempre carregado
2  PROCESSOS     como    ~80 cada      por gatilho
3  GUIA          conselho 13 arquivos  consultado por lacuna, nunca inteiro
4  docs/         estado do projeto     gerado ou preenchido por entrevista
```

O que decide a camada de uma frase:

| Pergunta | Resposta | Camada |
| :-- | :-- | :-- |
| E' verificavel por script E caro de desfazer? | sim | nucleo |
| Descreve uma transicao de estado do trabalho? | sim | processo |
| E' conselho, criterio ou julgamento? | sim | guia |
| Precisa nomear uma ferramenta para ser escrita? | sim | `docs/padroes-de-stack/` do projeto |

---

## 4. Estrutura

```
mentor-agent/
  .mentor/
    nucleo.md                    sempre carregado
    processos/                   carregados por gatilho
      tarefa.md                  ciclo, campos, gates, fechamento
      inicializacao.md           entrevista pelos portoes, gera docs/
      padroes-de-stack.md        como escrever a convencao de uma ferramenta
      analise-de-impacto.md      antes de decisao arquitetural
      revisao.md                 revisao de codigo e revisao geral
    guia/                        13 arquivos de doutrina + indice
      00-indice.md               portao -> arquivo
      01-negocio.md .. 13-evolucao.md
      ORIGEM.md                  de onde cada regra veio
    modelos/                     o que se preenche ou se varre
      fichas.md                  estruturas minimas, uma por portao
      listas-por-fase.md         disparadas por mudanca de fase
      varredura.md               sinal observavel -> regra que corrige
    esquemas/                    forma dos JSON, com valores possiveis
      contexto.json              um campo por decisao que o guia exige
      tarefa.json                campos + os 7 rotulos de gate
      requisito.json             RF/RN/RNF, vinculo gravado por script
    tetos.json                   tetos em caracteres + excecoes com motivo
    scripts/                     TypeScript, rodado direto pelo Node, sem build
      tipos.ts                   vocabulario fechado: rotulos, escalas, fases
      arquivos.ts                caminhos, json, e o agora() que gera data e hora
      ids.ts                     proximo ID por prefixo, gaps nunca reaproveitados
      vistas.ts                  backlog.md, contexto.md, requisitos, contagens
      cmd-init.ts  cmd-tarefa.ts  cmd-stack.ts  cmd-verificar.ts  cmd-auditar.ts
      cli.ts                     despacho
  docs/                          NAO existe no pacote: e' o que o script cria
                                 dentro do projeto que usa o pacote, na
                                 inicializacao, a partir de esquemas/
    contexto.json                fonte
    contexto.md                  gerado, ~40 linhas, so' campos preenchidos
    README.md                    gerado, para humano
    requisitos/
      requisitos.json            fonte
      implementados.md           gerado
      pendentes.md               gerado
    tarefas/
      abertas/TASK-*.json        fonte
      concluidas/TASK-*.json     fonte
      concluidas/TASK-*.md       narrativa, escrita pela IA
      backlog.md                 gerado
    arquitetura/ADR/
    padroes-de-stack/            uma convencao por ferramenta, 60 linhas
```

---

## 5. Tetos de texto

Contados em **caracteres**, verificados por script. Tolerancia de **10%**; acima disso, bloqueia ate'
reescrever mais curto ou declarar a excecao com motivo. Nunca ate' cortar conteudo (P4).

**Fator de conversao: 60 caracteres por linha.** Nao e' chute: e' a densidade medida no proprio
pacote, 59,9 caracteres por linha em 155.369 caracteres e 2.592 linhas.

| Arquivo | Linhas de referencia | Teto em caracteres |
| :-- | --: | --: |
| `nucleo.md` | 120 | 7.200 |
| indice do guia | 80 | 4.800 |
| cada arquivo do guia | 250 | 15.000 |
| cada processo | 80 | 4.800 |
| cada convencao de stack | 60 | 3.600 |
| narrativa de tarefa concluida | 40 | 2.400 |
| cada ADR | 30 | 1.800 |
| `contexto.md` gerado | 40 | 2.400 |

**Estado atual**, apos a divisao e as restauracoes (494 IDs no original, 494 nos arquivos):

```
 6.637  nucleo.md ................. 92% do teto
 4.485  guia/00-indice ............ 93%
 9.315  guia/01-negocio ........... 62%      13.623  guia/02-conformidade .... 91%
12.419  guia/03-analise ........... 83%       8.456  guia/04-processo ........ 56%
 7.098  guia/05-arquitetura ....... 47%      18.422  guia/06-persistencia ... 123%
 6.084  guia/07-codigo ............ 41%      12.958  guia/08-interacao ....... 86%
11.535  guia/09-seguranca ......... 77%       7.476  guia/10-qualidade ....... 50%
11.260  guia/11-operacao .......... 75%       3.302  guia/12-aprendizado ..... 22%
 1.375  guia/13-evolucao ........... 9%       4.490  guia/ORIGEM ............. 30%
 6.186  modelos/fichas ............ 41%       2.404  modelos/listas .......... 16%
 7.844  modelos/varredura ......... 52%
```

**Excecao declarada.** `06-persistencia.md` fica em 123%. Motivo: e' a unica secao que cobre dois
paradigmas de persistencia (relacional `BD` e nao-relacional `NS`), com dez subsecoes. Dividi-la
quebraria o mapeamento 1:1 entre secao do guia e portao, que o `contexto.json` usa para enderecar
lacuna. A excecao fica registrada aqui e o script a le'; nenhum outro arquivo herda a folga.

O `nucleo.md` tem 137 linhas contra as 120 de referencia, e **nao esta' acima do teto**: em
caracteres esta' em 92%. A contagem de linhas media errado, e era o defeito que P4 corrige.

Formato que faz caber: uma linha por regra.

```
**ID · SEVERIDADE ·** enunciado
```

Severidades: `BLOQUEIA` · `ACEITE` · `RECOMENDA`.

---

## 6. O nucleo

So' entra o que e' verificavel **e** caro de desfazer. Herdado do antecessor, ja' validado em uso:

1. Confirmacao antes de ato destrutivo (deletar, sobrescrever, reestruturar)
2. Os tres portoes de autorizacao: aprovar plano · finalizar e commitar · publicar (`push`)
3. Autorizacao vale por ato, nunca por sessao
4. Evidencia, nao declaracao (P3)
5. Codigo e' a verdade primaria: nao documentar o que contradiz o codigo
6. Avisar e' obrigatorio, agir exige aprovacao (lista fechada de 5 classes de risco)
7. Cerimonia proporcional ao risco: Light · Standard · Strict, com lista fechada do que e' Light
8. Linha de proporcionalidade obrigatoria em todo plano que cria artefato novo

**Sai do nucleo** (estava la' no antecessor, e nao passa no teste de P1):
tabela de nomenclatura (vai para convencoes de stack geradas), proibicao de travessao (preferencia
de escrita, vai para o guia), numeracao de IDs (vira script), tabela de anti-padroes (guia),
convencoes de codigo (guia + stack).

---

## 7. O contexto

`docs/contexto.json`, gerado pelo script na inicializacao. Template completo em
`_rascunho/contexto.template.json` (197 linhas, JSON valido).

Blocos, um por portao do guia:

```
_meta · projeto · estado(fase + 9 portoes) · rigor · negocio · conformidade ·
qualidade · problema · uso · arquitetura · persistencia · seguranca ·
operacao · ferramentas[] · gates · convencoes · contagens · auditoria
```

**Mecanica do mentor.** Cada campo carrega a referencia da secao do guia que o exige. Campo `null`
nao e' erro: e' decisao que ninguem tomou. A IA le' o contexto, ve' `conformidade.menores_possiveis:
null`, e sabe onde ler. O guia deixa de ser texto que se espera que alguem leia e vira indice
endereçado por lacuna.

**Portoes** tem tres estados: `aberto` · `respondido` · `dispensado`. Dispensa exige motivo escrito,
porque sem isso "nao se aplica" vira a saida facil para tudo.

**Rigor se autopromove.** `dado_pessoal`, `cobranca_ou_dinheiro`, `uso_por_terceiros` ou
`decisao_automatizada_sobre_pessoa` em `true` forca N2 no minimo. Script, nao julgamento.

**Contagens sao geradas**, inclusive `campos_nulos_do_contexto` e `linhas_do_pacote`.

**Custo de contexto.** 197 linhas em toda interacao seria caro. O script gera `contexto.md` com
apenas os campos preenchidos mais a contagem de pendencias, teto de 40 linhas. Esse entra no
contexto; o JSON completo e' consultado sob demanda.

---

## 8. Requisitos

Fonte unica `requisitos.json`, duas visoes geradas: `implementados.md` e `pendentes.md`. Nunca duas
pastas mantidas a mao.

Campos: `id · tipo(RF|RN|RNF) · enunciado · prioridade · status · tarefas[] · adr`.

**O vinculo e' gravado pelo `task finalizar`, nao pela IA.** A tarefa declara na criacao qual
requisito atende; ao fechar, o script grava dos dois lados. Rastreabilidade vira consequencia de
fechar tarefa, e nao um nono passo que se esquece. Foi o nono passo manual que deixou o arquivo de
requisitos do antecessor vazio depois de 95 tarefas.

---

## 9. Tarefas

**Um modelo, dois niveis de preenchimento.** Nao sao dois formatos, sao dois estados do mesmo
registro. O script faz a transicao, entao nunca existe "copiar do template curto para o longo", que
era onde a IA improvisava.

| Momento | Campos |
| :-- | :-- |
| Nascimento (anotar para nao esquecer) | `id · tipo · titulo · valor · urgencia · tamanho · esforco · depende_de · origem · requisitos[] · criada_em` |
| Execucao | `+ plano · criterios_aceite · iniciada_em` |
| Fechamento | `+ concluida_em · gates{} com evidencia · aprendizados` |

`tamanho` e `esforco` mantidos, como pedido. As tres datas sao geradas, nunca digitadas.
`id` gerado por `max(prefixo)+1`: a IA nunca ve' nem conta IDs.

A narrativa (o que se aprendeu, o que nao foi feito e por que) fica em Markdown ao lado, teto de 40
linhas. No antecessor a media era 319.

---

## 10. Comandos

**Escritos.** TypeScript em `.mentor/scripts/`, executado direto pelo Node (>= 22.18) por remocao de
tipos: **nenhuma etapa de build, nenhuma dependencia de execucao**. TypeScript entra so' como
ferramenta de desenvolvimento, para `tsc --noEmit`. `tsconfig` em `strict`, com
`noUncheckedIndexedAccess` e `erasableSyntaxOnly`.

| Comando | O que faz |
| :-- | :-- |
| `mentor init` | cria `docs/` a partir de `.mentor/esquemas/`. Nao preenche nada |
| `mentor task nova` | gera ID e data, valida os enums, grava o registro minimo |
| `mentor task iniciar <id>` | move para execucao, escreve o esqueleto do plano e da narrativa com marcadores |
| `mentor task gate <id> <gate>` | **executa** o comando declarado e grava comando, saida, codigo e horario |
| `mentor task finalizar <id>` | confere os impedimentos, fecha, vincula requisito, regenera as vistas |
| `mentor stack <ferramenta>` | cria a convencao com esqueleto e registra no contexto |
| `mentor verificar` | tres familias de checagem |
| `mentor auditar` | reporta o que falta. Nunca cria tarefa |
| `mentor gerar` | regenera as vistas em Markdown |

**O que o `gate` recusa, e e' o ponto do comando.** `APROVADO`, `APROVADO com ressalva` e `FALHOU`
so' nascem de execucao: pedi-los por `--rotulo` e' recusado com *"declaracao escrita a mao nao vale
como evidencia"*. O rotulo sai do codigo de saida do processo, nunca de quem escreve o registro.

**O que o `finalizar` recusa:** marcador nao preenchido no plano ou na narrativa · gate declarado
pelo projeto e ausente do registro · gate `FALHOU` ou `BLOQUEADO` · gate `NÃO EXECUTADO` ou
`INVÁLIDO como gate` sem motivo escrito · narrativa ausente.

Tres familias em `verificar`, todas exatas e sem julgamento:
1. nenhum marcador `PREENCHER:` sobrevivente
2. nenhum teto de texto estourado, em caracteres, com as excecoes de `.mentor/tetos.json`
3. integridade referencial: ferramenta com padrao que existe em disco, dependencia que aponta para
   tarefa existente, requisito citado que existe, tarefa concluida com narrativa em disco,
   requisito implementado com ao menos uma tarefa

Sem autoteste por mutacao. Ele so' faz sentido com dezenas de checagens, e no antecessor o autoteste
falhando virou bug proprio.

---

## 11. Auditoria periodica

Tres gatilhos, todos automaticos:

1. **A cada 10 tarefas concluidas.** O `task finalizar` conta e avisa.
2. **Mudanca de fase.** Entrar em `pre-lancamento` dispara as listas do guia: "Antes do primeiro
   deploy", "Banco antes de producao", "Obrigacoes antes do lancamento".
3. **Promocao de rigor.** N1 para N2 reabre portoes que estavam dispensados.

O que olha, e nada alem disso:
campos `null` de portao que a fase atual ja' exige · requisito sem tarefa e tarefa sem requisito ·
ferramenta sem arquivo de padrao · tetos estourados · itens de lista de fase nao marcados.

**Reporta, nao cria tarefa** (P6).

---

## 12. Convencoes de stack

Toda regra ou preferencia que nomeie ferramenta mora em `docs/padroes-de-stack/<ferramenta>.md`,
teto de 60 linhas, forma fixa:

```
# <ferramenta>
Papel no projeto · versao
## Decidido        uma linha por convencao
## Por que'        so' onde a escolha nao e' obvia
## Nao usamos      o que foi descartado, para nao voltar a' discussao
## Exemplo curto
## Revisar quando
```

Vinculo com o contexto por campo: `ferramentas[].padrao` aponta o caminho. Checagem: toda ferramenta
declarada tem arquivo de padrao ou `dispensa_motivo`. **Nenhum gate sobre o conteudo da convencao**,
que e' preferencia do dono e nao se audita.

Exemplos de divisao ja' resolvidos:

| Afirmacao | Onde mora |
| :-- | :-- |
| Esteira analisa dependencias automaticamente a partir de N2 (OPS-27) | guia |
| Dependabot, `.github/dependabot.yml`, semanal | convencao de stack |
| Reversao testada antes do primeiro deploy real (OPS-22) | guia |
| Deploy e' Vercel, producao so' da main | convencao de stack |
| Reutilizar componente antes de criar | convencao de stack (React) |

---

## 13. O que foi cortado do antecessor, e por que

| Origem | Linhas | Destino |
| :-- | --: | :-- |
| `22-refatoracao` | 656 | guia (julgamento puro) |
| `23-modelagem-dominio` | 916 | guia |
| `24-figma-para-codigo` | 809 | **cortado**: e' de stack |
| `11-arquitetura-e-pastas` | 490 | guia + convencao de stack |
| `16-performance-acessibilidade` | 768 | guia |
| `14-formularios-e-validacao` | 715 | **cortado**: React, contradiz a agnosticidade declarada |
| `17-backend-node` | 580 | **cortado**: Node, idem |
| `34-readme-projeto` | 544 | **cortado**: nao e' trabalho do pacote |
| `53-changelog` | 3.094 | gerado do git, teto de linhas visiveis |
| `50-anti-padroes` · `52-glossario` | 1.306 | guia |
| checklists `41` `42` `43` | 1.116 | guia (duplicavam `16` e `18`) |
| checklist `44` + metade de `templates/30` e `31` | 1.170 | **vira script** |
| `27-revisao-geral` | 251 | funde em `revisao.md` |

Resultado esperado:

| | esquadro-agents | mentor-agent |
| :-- | --: | --: |
| Sempre carregado | 765 | ~160 |
| Abrir tarefa | 3.042 | ~300 |
| Pacote normativo | 22.707 | ~1.850 |
| Guia consultavel | 0 | 2.376 |

Nada foi apagado. Mudou onde mora e quando e' pago.

---

## 14. O guia aplicado a este projeto

**Portao 0.** Uso por terceiros forca **N2**. Consequencia: analise estatica e de dependencias
automaticas na esteira (OPS-27).

**QS-44 (vocabulario de defeito).** Os 7 bugs do antecessor sao *enganos*, nao *defeitos*: a causa
esta' na decisao de criar a checagem, nao no codigo dela. Corrigir o codigo de cada um tratava
sintoma, e por isso consertar um gerava outro.

**CD-15, nao abstraia antes da terceira ocorrencia.** Nao criar processo, checagem ou template antes
do terceiro caso real. Cinco dos nove processos do antecessor nasceram de uma ocorrencia.

**Secao 13 do guia (QS-42, ES-37).** A auditoria periodica e' o ciclo planejar-fazer-verificar-agir
com dono e prazo.

**Secao 10 do guia.** Estrategia de testes por quadrantes, limiar de cobertura, atributos
nao-funcionais e metricas ja' tem campo no bloco `qualidade` do contexto. Sem preencher, o gate de
testes existe mas ninguem sabe o que deveria estar cobrindo.

---

## 15. Decisoes tomadas

| # | Decisao | Valor |
| :-: | :-- | :-- |
| 1 | Figma | cortado, e' de stack |
| 2 | Guia dentro do pacote | sim, 13 arquivos com indice |
| 3 | Limite | teto de texto por arquivo, nao teto de regras |
| 4 | TDD | **padrao `tdd`**, trocavel por `bdd`/`teste-depois`/`nenhum` com motivo escrito. Fora do nucleo: e' campo do contexto, com duas checagens no fechamento |
| 5 | Formato de dado | JSON fonte, Markdown gerado |
| 6 | Contexto | JSON com campo por decisao do guia, `null` = pauta |
| 7 | Requisitos | fonte unica, duas visoes geradas |
| 8 | Modelo de tarefa | um so', dois niveis de preenchimento |
| 9 | Auditoria | a cada 10 tarefas, por fase, por promocao de rigor |
| 10 | Primeiro adotante | projeto novo a definir, nunca o proprio pacote |

## 16. Decisoes pendentes

**Autorizar a correcao de uma palavra no `GUIA.md`?** O titulo da secao diz "Os oito portoes" e
lista **nove** (V C 0 P I A N S O). Os arquivos do `mentor-agent` ja' dizem nove. O arquivo de
origem fica em `E:\ESTUDO\ESTUDO\ADS\_Guia-Agentes-IA\GUIA.md`, linha 41, e nao e' deste projeto.

**Primeiro projeto real adotante.** Calibrar o pacote contra ele mesmo foi o que produziu 79% de
CHORE e DOC no antecessor.

---

## 17. O que trazer do esquadro-agents

Lista fechada. Fora disto, nao consultar.

| Trazer | Onde esta' | Por que |
| :-- | :-- | :-- |
| `scripts/agora.mjs` | 42 linhas | gera data e hora. Justificado por medicao: 19 de 37 registros tinham timestamp fora do intervalo declarado |
| `scripts/fatos.mjs` | 87 linhas | doutrina: numero sobre o estado corrente nao se digita, se gera |
| `scripts/baseline.json` | 73 linhas | catraca de qualidade. Adaptar de contagem de violacoes para contagem de linhas |
| Os tres portoes de autorizacao | `01-nucleo.md` §2.2 | validado em uso |
| Lista fechada do Modo Light | `01-nucleo.md` §4.1 | validado em uso, inclusive a nota sobre registrar achado |
| Linha de proporcionalidade | `01-nucleo.md` §3.2 | unica regra que vigia inflacao de escopo |
| `28-padroes-de-stack.md` | 206 linhas | vira `processos/padroes-de-stack.md` |
| Vocabulario de gate | `20-ciclo-tarefa` §5.2.1 | os sete rotulos |

**Nao trazer:** `verificar-pacote.mjs` (3.362 linhas, existe para parsear Markdown que virou JSON),
os 25 ADRs, o backlog de 16 tarefas, o diagnostico de 43 achados.
