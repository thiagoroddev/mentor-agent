# Melhorias a incorporar

Existe para **nao perder** o que os projetos anteriores ja' tinham e o `mentor-agent` ainda nao tem.
Nao e' backlog de tarefas: e' inventario do que falta decidir. Item sai daqui de dois jeitos, virando
parte da `ESPECIFICACAO.md` ou sendo descartado **com motivo escrito**.

| Estado | Significa |
| :-- | :-- |
| 🔵 a decidir | levantado, sem decisao do humano |
| 🟢 decidido | entra; a especificacao ja' reflete |
| ⚪ descartado | com motivo, para nao voltar a' discussao |

---

## 1 · Organizacao da fila 🟢 *(implementado 29/08, fases 1 e 2)*

**O problema, nas palavras do humano (29/08):** *"fica muita tarefa pendente parada muito tempo so'
pra lembrar que precisa ser feita, mas isso ja' tem dado nos requisitos pendentes, e' redundante"*.

### 1.1 A redundancia identificada, e a regra que ela produz

Tarefa que existe **so' para lembrar que um requisito falta** e' copia do requisito. O requisito ja'
e' o lembrete, e ja' aparece em `requisitos/pendentes.md`, que e' gerado.

> **Regra proposta:** requisito pendente nao vira tarefa ate' ser puxado para o ciclo. O requisito e'
> o lembrete; a tarefa e' o compromisso de fazer agora.

Isso elimina uma categoria inteira sem criar nada. Mas nem tudo que espera e' requisito: bug
conhecido, divida tecnica e manutencao tambem esperam, e precisam de casa.

### 1.2 O quarto estado: campo, nao pasta

A proposta do humano foi um quarto arquivo, `backlog`. Recomendo **campo**, pelo mesmo motivo que
matou o prefixo numerico no nome do arquivo: mover entre pastas renomeia, e renomear quebra
historico do git e qualquer link.

```
fila: "ciclo" | "reserva"
```

| Valor | O que e' | Entra no contexto? |
| :-- | :-- | :-- |
| `ciclo` | compromisso do ciclo atual | **sim**, e' o `backlog.md` |
| `reserva` | lembrete, sem compromisso | **nao**. So' pelo comando `mentor reserva` |

Vistas geradas: `tarefas/backlog.md` (ciclo) e `tarefas/reserva.md`. Uma fonte, duas vistas, como o
resto.

### 1.3 Os tres limites

O humano: *"tendo limite de tarefas pendentes que respeitem tokens, pq atualmente nao tem limite e eu
nunca pensei de fato que quando pedia pra organizar a ordem ela precisaria ver muita coisa"*.

| Estado | Limite | Fundamento |
| :-- | :-- | :-- |
| `em-execucao` | **1** | ES-50: trabalho parado pela metade e' o desperdicio mais invisivel |
| `ciclo` | **12 tarefas ou 2.400 caracteres** de `backlog.md` | teto de contexto: ordenar a fila nunca custa mais que isso |
| `reserva` | sem limite | nunca e' carregada |

Medido: uma linha do `backlog.md` gerado tem cerca de 180 caracteres, entao 2.400 comporta 12 linhas
mais o cabecalho. O teto entra em `.mentor/tetos.json` como qualquer outro.

**Ciclo cheio nao bloqueia registrar:** a tarefa nova nasce em `reserva`. O que fica proibido e'
inchar o ciclo.

### 1.4 Regra de passagem (ES-54)

Puxar da reserva para o ciclo exige, e o script confere:

- `origem` resolve (IDs existentes ou `titulo-autossuficiente`)
- esforco IA **nao** e' `XG` (XG se divide antes)
- dependencias estao no ciclo ou concluidas
- ha' vaga no ciclo

E' a "definicao de pronto-para-comecar" do guia, virada em checagem.

### 1.5 Comandos

```
mentor task puxar <ID>        reserva -> ciclo, conferindo a regra de passagem
mentor task guardar <ID>      ciclo -> reserva
mentor reserva                lista a reserva (nao entra no contexto)
```

---

## 2 · Entrega, versionamento e deploy 🟢 *(implementado 29/08, fase 5)*

**Levantado pelo humano (29/08):** *"processo de versionamento e deploy profissional e com seguranca
precisa ter, foi uma coisa que eu precisei pedir, mas esse agente tem que lembrar o usuario disso
quando for a hora"*.

### 2.1 A correcao de um erro meu

Em 28/08 usei o dependabot como exemplo de "e' de stack" e parei ali. O teste continua valendo (*se a
frase precisa nomear uma ferramenta, e' de stack*), mas eu subservi a **pratica**: branch, revisao
antes do merge, esteira que barra, release versionado, reversao testada e publicacao registrada sao
universais e nao nomeiam ferramenta nenhuma.

O guia ja' tem tudo isso (OPS-09 a OPS-30). **O que falta e' o gatilho e o registro:** nenhum processo
faz acontecer na hora certa, e o `contexto.json` nao guarda o que foi decidido.

### 2.2 O que falta, concreto

**a) `processos/entrega.md`** (teto 4.800), cobrindo: estrategia de ramos e o que a linha principal
exige (OPS-20) · quando abre revisao e o que ela barra (OPS-18) · o artefato unico promovido entre
ambientes (OPS-17) · versionamento e release · reversao **executada ao menos uma vez** antes do
primeiro deploy real (OPS-22) · migracao de estrutura de dados com caminho de volta (OPS-23) ·
publicacao registrada: o que subiu, versao, quem autorizou, quando (OPS-25).

**b) Bloco `versionamento` no `contexto.json`:**

```
ramo_principal · estrategia_de_ramos · revisao_antes_do_merge · quem_aprova
protecao_do_ramo_principal · versionamento (esquema) · release_automatizado
esteira_barra[] · analise_de_dependencias{automatica, ferramenta, cadencia}
```

**c) O gatilho, que e' o pedido de verdade.** Hoje a auditoria cobra as listas de deploy so' em
`pre-lancamento`. Versionamento tem que ser cobrado em **`construcao`**, antes de existir o que
publicar. Proposta: `EXIGIDOS['construcao']` ganha o bloco `versionamento`, e `pre-lancamento` segue
disparando as listas de deploy.

### 2.3 GitHub: pratica no pacote, ferramenta na stack

| Afirmacao | Onde mora |
| :-- | :-- |
| Linha principal sempre publicavel; quebrada, consertar vem antes de funcionalidade (OPS-20) | pacote |
| Esteira barra construcao quebrada, teste falhando, analise reprovada, vulnerabilidade critica (OPS-18) | pacote |
| Reversao testada de verdade antes do primeiro deploy (OPS-22) | pacote |
| Analise de dependencias automatica a partir de N2 (OPS-27) | pacote |
| `.github/workflows/`, Dependabot semanal, protecao de ramo no GitHub, `gh` CLI | convencao de stack |

**Meio-termo proposto:** `mentor stack github` cria a convencao ja' com as escolhas usuais escritas,
cada linha marcada `PREENCHER: confirmar ou trocar`. Nao e' padrao imposto, e' rascunho para o humano
aprovar. Vale para qualquer ferramenta que 90% usa.

---

## 3 · Comandos propostos em 29/08 🟢 *(todos implementados, fases 2 e 7)*

| Comando | Substitui, no `pendentes.md` do roteirizador |
| :-- | :-- |
| `task absorver <id> --por <id>` | a secao "Numeros aposentados", mantida a mao |
| `task cancelar <id> --motivo` | os blocos riscados com `~~`, que ficam para sempre |
| `task fatiar <id> --em N` | as 5 fatias da RF-009, escritas uma a uma |
| campo `validacao` + `task validar <id>` | os ~10 **"smoke pendente"** espalhados em prosa |
| indice de concluidas gerado | `0-indice-concluidas.md` mantido a mao |

O `validacao` e' o mais util: **"smoke pendente" e' estado de primeira classe** no fluxo do humano e
hoje so' existe como frase solta. Virando campo, a auditoria passa a cobrar quais smokes estao
parados.

---

## 4 · Auditoria do `estima-moto` / `motocustorj` (29/08) 🔵

Repositorio `thiagoroddev/motocustorj`, 240 tarefas concluidas, 22 ADRs, 4 revisoes gerais.
E' o projeto **mais maduro em operacao** dos tres, e tem seis coisas que o `mentor-agent` nao tem.

### 4.1 As branches: nao e' erro de processo, e' configuracao faltando

15 branches no GitHub, conferido. A conta:

| Grupo | Quantas | Situacao |
| :-- | --: | :-- |
| `motocustorj` (padrao) | 1 | correta |
| Dependabot com PR aberto | 4 | **corretas.** O bot apaga ao mergear |
| Dependabot ja' mergeadas | 2 | sobra |
| De tarefa, ja' mergeadas | 4 | `bg-039-040-portao`, `docs-plataforma-conferida`, `docs-ra-001-corroboracao`, `thiagoroddev-patch-1` |
| Antigas, ja' mergeadas | 3 | `concessionaria`, `robust`, `teste-g` |
| `main` | 1 | padrao anterior, ja' mergeada |

**A causa:** `git branch -d` apaga so' a branch local. A remota fica ate' alguem mandar apagar.
O proprio `docs/operacao.md` do projeto ja' manda `gh pr merge --merge --delete-branch`, que apaga as
duas: as que sobraram foram mergeadas por outro caminho.

**A correcao definitiva nao e' codigo:** GitHub > Settings > General > Pull Requests >
*Automatically delete head branches*. Limpeza do passivo:

```
git push origin --delete bg-039-040-portao docs-plataforma-conferida docs-ra-001-corroboracao thiagoroddev-patch-1
git fetch --prune
```

`main`, `concessionaria`, `robust` e `teste-g` sao decisao sua: podem ser historico que voce quer.

> **A licao geral, e ela e' maior que as branches.** Existe uma classe de configuracao que **nao e'
> codigo e nenhum script alcanca**: protecao de branch, apagar branch automaticamente, alertas de
> vulnerabilidade, atualizacoes de seguranca. O proprio `dependabot.yml` do projeto ja' avisa disso:
> *"os itens 2 e 3 sao configuracao na web do GitHub, nao codigo. Sem eles, o aviso de CVE nao
> acontece."* O `contexto.json` precisa de `configuracoes_de_plataforma`, e a auditoria precisa
> cobrar, porque e' invisivel para qualquer verificacao automatica.

### 4.2 Portao de lancamento 🟢 *(fase 6)*

`scripts/gate-lancamento.mjs`, 462 linhas + `.github/workflows/lancamento.yml`. Responde **uma**
pergunta: *este projeto pode ir a publico?* Itens: verify, auditoria de producao, cabecalhos de
seguranca, orcamento de bundle, varredura de segredos, notas do Lighthouse.

Duas doutrinas para trazer inteiras:

> **`NÃO EXECUTADO` tambem reprova o portao.** Gate que nao rodou nao e' gate verde.

> **"Entre a criacao do `checklists/43-performance.md` e o primeiro Lighthouse do projeto, passaram
> 197 tarefas. Regra que nao vira comando nao acontece."**

A segunda e' a formulacao mais forte do principio P2 que existe nos tres projetos, e foi **medida**.
Entra na `ESPECIFICACAO.md`.

### 4.3 Registro de Riscos Aceitos (`RA-NNN`) 🟢 *(fase 6)*

`docs/seguranca/riscos-aceitos.md` + `scripts/riscos-aceitos.mjs`. Conceito que o `mentor-agent` nao
tem, e distinto de divida tecnica:

| | Divida Tecnica `DT` | Risco Aceito `RA` |
| :-- | :-- | :-- |
| Registra | solucao fragil que custa caro depois | vulnerabilidade **conhecida** nao corrigida agora |
| Efeito | prioriza refactor | **destrava um gate que esta' reprovando** |
| Prazo | gatilho, que pode nunca ocorrer | **data de revisao, que sempre chega** |

Regras que fazem funcionar, e todas sao verificaveis por script:
`aceito_por` e' **nome de pessoa** (a IA nao se concede as proprias excecoes) · `data_revisao`
obrigatoria e no maximo **90 dias** · `evidencia` obrigatoria, o comando que qualquer um roda para
conferir · `tarefa_de_saida` obrigatoria, porque aceitar sem saida e' desistir · **vencido reprova
mais alto que o advisory original**, porque significa que a revisao parou de funcionar · encerrar
**move para `## Encerrados`, nunca apaga**.

Isso implementa, com mecanismo, o que o guia so' tem como texto (*"Dispensas aceitas: regra | motivo |
aceite de (nome/data)"*). E' a peca que faltava para `ACEITE` ser lei de verdade.

### 4.4 Integridade de links em markdown 🟢 *(fase 3)*

`scripts/check-docs.mjs`. O `verificar` do `mentor-agent` confere integridade **referencial entre
JSON**, e nao confere link de markdown. Falta:

- link relativo que nao resolve para arquivo existente
- extensao dupla `.md.md`
- **comparacao sensivel a maiusculas, de proposito.** No Windows um link para `32-adr.md` apontando
  para `32-ADR.md` funciona; no GitHub e no Linux, quebra.

O terceiro item importa para voce especificamente: voce trabalha no Windows e publica no GitHub.
Origem medida: o `.github/agents/` tinha **33 arquivos `.md.md` e 504 links quebrados**.

### 4.5 `docs/operacao.md`: o `processos/entrega.md` que voce ja' tinha 🟢

218 linhas, e e' **exatamente** o processo que voce disse ter precisado pedir a mao. Ja' cobre: branch
protegida sem push direto · fluxo de 6 passos com `gh` · convencao de nome de branch derivada do ID
da tarefa · **uma tarefa por branch**, com o motivo certo (*"se um PR carrega tres tarefas, o mesmo
link de CI vai para tres arquivos e prova 'as tres juntas passaram', nao 'esta passou'"*) · o que
fazer quando comitou na branca errada · **como julgar os PRs do Dependabot e a ordem segura de
merge** · o que fica fora do repositorio.

Nao ha' o que inventar: `processos/entrega.md` nasce daqui, condensado no teto de 4.800.

### 4.6 `verificacao.yml`: autoridade externa 🟢 corrobora o desenho

> *"Antes disto, `typecheck`/`lint`/`test`/`build` eram declarados pelo proprio agente no mesmo
> markdown que ele escrevia. Em 197 tarefas concluidas nao havia como um terceiro conferir. O status
> deste workflow nao e' controlado por ninguem dentro do repositorio."*

E' a justificativa independente do `task registrar-gate` e da ordem de preferencia da evidencia
(URL do run primeiro). Confirma o desenho; vira citacao na especificacao.

### 4.7 `docs/uso-de-ia.md` 🔵 avaliar

112 linhas: divisao de responsabilidade humano/IA, como o trabalho foi governado, **como auditar
isso**, onde a IA **nao** foi usada, ferramentas, postura. E' documento de governanca voltado para
fora, e o `mentor-agent` vai ser publico. Candidato a template opcional.

### 4.9 A medicao que vale mais que a argumentacao 🟢 trazer

`docs/analise-melhorias-agente.md` §1, sobre as 197 tarefas concluidas daquele projeto:

| Gate | Onde estava escrito | Virou comando? | Vezes executado |
| :-- | :-- | :-: | --: |
| Testes | `20-ciclo-tarefa` §5.2 | sim | **182** |
| Typecheck | `20-ciclo-tarefa` §5.2 | sim | **141** |
| Lint | nucleo §10 | sim | frequente |
| `npm audit` | `41-seguranca` §6 e `18` §12.1 | **nao, so' prosa** | **0** |
| Lighthouse | `43-performance` inteiro | **nao, so' prosa** | **0** |
| Acessibilidade | `42-acessibilidade` inteiro | **nao, so' prosa** | 0 sistematico |
| Cabecalhos de seguranca | `18` §7, secao inteira | **nao, so' prosa** | **0** |

> **Os 314 itens do `41-seguranca.md` produziram zero verificacoes. Os 3 comandos do `package.json`
> produziram 323 verificacoes registradas.**

E o custo real: 10 vulnerabilidades, 1 critica e 7 altas, numa dependencia **de producao** publicada,
todas com correcao disponivel. Nenhuma detectada, porque o comando que as detecta nunca rodou, embora
estivesse documentado em dois modulos desde a versao 1.0.0 do pacote.

Essa tabela e' a evidencia mais forte do principio P2 e entra na `ESPECIFICACAO.md` §1, ao lado das
medicoes do `esquadro-agents`.

### 4.10 A Norma do Gate Mecanico, em 8 pontos 🔵 avaliar

§10 do documento. Comparando com os sete principios da `ESPECIFICACAO.md`:

| # | Ponto da Norma | Estado no `mentor-agent` |
| :-: | :-- | :-- |
| 1 | Regra sem comando nao existe; sem comando, marque como recomendacao | ✅ P1 (Lei vs Orientacao) e P2 |
| 2 | O veredito mora fora do agente. CI e' a autoridade; o markdown e' o relato | ✅ P3 e `task registrar-gate` |
| 3 | **Quem escreve nao aprova.** Revisao em contexto novo, por agente cujo unico poder e' reprovar | ❌ **faltando** |
| 4 | Sem evidencia, e' `NÃO EXECUTADO`, nunca `APROVADO` | ✅ nucleo, 4a excecao |
| 5 | **Publicar e' consequencia de gate verde, nao ato de vontade** | ❌ faltando (portao de lancamento, 4.2) |
| 6 | **Desligar um gate custa mais que corrigi-lo**; excecao vive no registro de riscos aceitos | ❌ faltando (4.3) |
| 7 | **O projeto informa o que falta, voce nao pergunta** | 🟡 parcial: o `auditar` reporta, mas sob demanda |
| 8 | **Gate padrao vem ligado.** Seguranca, dependencias, orcamento e acessibilidade sao o commit zero | 🟡 tensao com N1, ver abaixo |

**Sobre o ponto 8.** Ele tensiona com o nivel N1 do guia (prototipo descartavel, vale so' `BLOQUEIA` de
N1). A conciliacao honesta: N1 vale para o que e' de fato descartavel, e a promocao automatica ja'
cobre o resto. Mas os gates que custam **quase nada** (auditoria de dependencia, varredura de segredo)
devem nascer ligados em qualquer nivel, porque o custo de liga-los depois e' maior que o de mante-los.

### 4.11 As 4 camadas de gate 🟢 *(camadas 1, 3 e 4 na fase 5 e 6; a 2 e do projeto)*

```
1  npm run verify        segundos  o agente roda a cada tarefa
2  CI                    minutos   autoridade externa, o agente NAO controla
3  hook de pre-push      segundos  impede o erro de chegar ao remoto
4  gate:lancamento                 decide se pode ir a publico
```

O `mentor-agent` tem a 1 (`task registrar-gate`) e apoia a 2 (evidencia por URL do run). **Faltam a 3
e a 4.**

Detalhe do desenho da camada 3, que vale copiar: o hook fica em **`pre-push`, nao em `pre-commit`,
deliberadamente**, para que commit continue barato e ninguem aprenda a usar `--no-verify`.

🟢 **Decidido (29/08): sem dependencia.** O hook e' versionado numa pasta do projeto e ligado com
`git config core.hooksPath`, uma linha na inicializacao. Nada de `husky`.

### 4.12 Agente Auditor: quem escreve nao aprova 🔵 avaliar

§4. O diagnostico e' preciso: *"contexto compartilhado propaga vies. O agente que decidiu usar
`useEffect` para derivar estado tem exatamente o mesmo modelo mental na hora de revisar aquele
`useEffect`."*

Regras do auditor que valem trazer para `processos/revisao.md`:

1. **Nao confie no que a tarefa afirma ter feito. Verifique no diff.**
2. Gate sem evidencia e' `NÃO EXECUTADO`, nunca `APROVADO`.
3. Criterio de aceite sem teste ou verificacao reproduzivel = criterio nao verificado.
   *"Validado visualmente" sem passos nao conta.*
4. Mudanca em calculo, persistencia ou migracao de schema **exige revisao humana**.
5. **Calibracao:** *"uma auditoria que aprova tudo esta' quebrada. Se voce nao achou nada, declare o
   que verificou e o que nao conseguiu verificar: a lista de nao-verificado e' a parte mais util do
   relatorio."*

⚠️ **A ressalva que decide se isso ajuda ou repete o loop:** o auditor audita **o diff da tarefa**,
nunca o repositorio. A regra 5 empurra para achar alguma coisa, e um auditor solto no repositorio
inteiro com essa calibracao e' precisamente a maquina de tarefa-gera-tarefa que matou o
`esquadro-agents`. Escopo fechado no diff e' o que separa as duas coisas.

### 4.13 `doctor`: o relatorio de saude 🟢 *(fase 4)*

§6, e e' a **funcao de mentor que voce descreveu**, so' que melhor do que o `auditar` que eu escrevi.
Sai uma folha por push, com secoes de SEGURANCA, QUALIDADE e PROCESSO, e termina em veredito binario:

```
PRONTO PARA PUBLICO?  NAO — 5 bloqueios (rode: npm run gate:lancamento)
```

Tres propriedades que o autor nomeia, e as tres estao certas:

1. **E' gerado, nao lembrado.** Nao depende de a IA ter carregado o modulo certo.
2. **E' comparavel no tempo.** Commitado a cada release, mostra se o projeto melhora ou apodrece.
3. **Termina em veredito binario.** *"Pronto para publico? NAO" e' acionavel; um checklist de 314
   itens nao e'.*

Uma linha do exemplo mostra o alcance: `⚠ 1 tarefa Critico+IMEDIATA aberta ha 42 dias`. Isso e' o
ES-50 do guia (trabalho parado pela metade) virando numero sem ninguem escrever nada.

**Proposta:** o `mentor auditar` passa a emitir neste formato e termina em veredito. Ganha o `doctor`
sem virar comando novo.

### 4.14 O que o autor recomendou NAO mudar 🟢 registrar

§9. Vale porque confirma decisoes que ja' tomamos, por caminho independente:

- o ciclo `pendentes → em-andamento → concluidas`, *"melhor que a maioria dos projetos profissionais"*
- a separacao pacote (comportamento) × `docs/` (projeto)
- os modos Light/Standard/Strict: *"cerimonia proporcional ao risco evita que o processo seja
  abandonado por peso, a razao nº 1 pela qual processos morrem"*
- **o esforco duplo H/IA**, chamado de *"insight genuinamente original: poucos frameworks reconhecem
  que carga para IA ≠ tempo humano"*
- `docs/uso-de-ia.md`
- `npm run verify`, *"o unico gate mecanico existente e, nao por acaso, o unico cumprido"*

### 4.8 Menores

`npm run verify` agrega os gates num comando so' · o portao tem **orcamento de bundle**, que e' a
mesma mecanica dos tetos de texto aplicada a bytes · `docs/analise-melhorias-agente.md` tem 1.027
linhas e e' o equivalente da `ESPECIFICACAO.md` daquele projeto: a §3 "Norma: gate mecanico em 4
camadas" e a §4 "Agente Auditor: separar quem escreve de quem aprova" ainda merecem leitura dedicada.

---

## 5 · Escopo de cada auditoria, e o que impede o loop 🟢

Decidido em 29/08. **Tres auditorias, tres escopos, tres custos.** Confundi-las e' o que produziu o
loop no antecessor.

| | Auditor | Doctor | Revisao geral |
| :-- | :-- | :-- | :-- |
| **Ve'** | o diff da tarefa, o registro dela e os requisitos citados | o projeto inteiro, so' o que e' mensuravel | o projeto inteiro, com julgamento |
| **Quando** | toda tarefa Standard/Strict | a cada push e no `task finalizar` | sob demanda do humano, com cadencia lembrada |
| **Custo** | uma sessao curta de IA | **zero token**, e' script | sessao longa de IA |
| **Sai** | veredito + achados por nivel | folha de saude + veredito binario | `REV-NNN` |
| **Cria tarefa?** | nao | nao | nao |

### 5.1 Auditor: o que bloqueia e o que nao

Bloqueio nao e' por **tema**, e' por **classe de falsidade**. Um erro de estilo em codigo de seguranca
nao bloqueia; um criterio de aceite contradito num botao bloqueia.

| Nivel | O que e' | Efeito |
| :-- | :-- | :-- |
| 🔴 **Bloqueia** | o diff contradiz um criterio de aceite declarado · gate declarado sem evidencia · uma das cinco classes de risco do nucleo §6 · toca calculo, persistencia ou migracao de schema sem revisao humana | corrige antes de fechar |
| 🟡 Recomendacao | funciona, da' para ficar melhor | vira `achados_encaminhados` ou nada |
| 🟢 Observacao | fica anotado | so' o registro |

**Dois limites duros, e sao eles que impedem o loop:**

1. **O auditor nao ve' o repositorio.** So' o diff, o registro da tarefa e os requisitos citados. A
   calibracao *"auditoria que aprova tudo esta' quebrada"* empurra para achar alguma coisa, e solta no
   repositorio inteiro ela vira maquina de gerar trabalho. Presa ao diff, ela acha o que importa.
2. **O auditor nao abre tarefa.** Escreve o veredito no registro. 🔴 se corrige agora; 🟡 e 🟢 o humano
   decide.

### 5.2 Doctor: mensuravel, nunca julgamento

O limite do doctor nao e' cota, e' natureza: **ele so' verifica o que consegue medir sem julgar.** Se
precisa de julgamento, nao e' doctor, e' revisao geral. Esse limite se aplica sozinho e nao envelhece.

Secoes: SEGURANCA · QUALIDADE · PROCESSO, terminando em veredito binario.

### 5.3 Revisao geral: a unica com lembrete

O doctor e' gratis e roda sempre, entao nao precisa de cadencia. Quem precisa e' a revisao geral, que
custa uma sessao inteira.

| Tarefas concluidas desde a ultima | O doctor diz |
| --: | :-- |
| < 20 | nada |
| 20 a 29 | ⚠ revisao geral pendente ha N tarefas |
| 30 a 39 | ⚠ atrasada |
| 40+ | ✗ conta como bloqueio no veredito |

**Por que 20:** no `esquadro-agents`, 95 tarefas produziram 7 defeitos do proprio aparato sem ninguem
notar; no `motocustorj`, 197 tarefas passaram sem nenhuma auditoria de seguranca. 20 e' curto o
bastante para o delta ainda ser auditavel e longo o bastante para nao virar cerimonia.

### 5.4 Onde moram os lembretes

**No `contexto.json`**, como o humano propos, e o motivo e' o principio P5. No arquivo da tarefa
concluida eles se perderiam, porque o registro e' imutavel; no `backlog.md` eles apodreceriam, que foi
exatamente o que aconteceu com os ~10 "smoke pendente" do roteirizador.

```
contexto.revisao_geral       ultima_em · ultima_na_tarefa · cadencia_em_tarefas · atraso
contexto.lembretes[]         GERADO pelo doctor, nunca digitado
contexto.contagens           divida_tecnica_aberta · requisitos_pendentes ·
                             riscos_aceitos_ativos · riscos_aceitos_vencidos ·
                             avisos{bloqueio, recomendacao, observacao} ·
                             tarefas_desde_revisao_geral
```

⚠️ **`lembretes` e' saida, nao entrada.** Se for campo livre onde a IA escreve, ele acumula prosa como
qualquer outro. O que se digita e' a **configuracao** (cadencias e limiares); os lembretes o doctor
calcula a cada execucao e sobrescreve.

### 5.5 Achado, divida tecnica e risco aceito: nao sao redundantes, sao **estagios**

**A distincao nao e' por assunto** (projeto vs pacote). E' pelo **estado da decisao**.

Uma observacao feita durante uma tarefa tem exatamente quatro destinos, e **nenhum deles e' "fica
anotado esperando"**:

| Destino | Quando | O que exige |
| :-- | :-- | :-- |
| **Tarefa** | vai ser feito | nasce na reserva ou no ciclo |
| **Divida tecnica** `DT` | nao agora, e sabemos o custo | **gatilho de pagamento + dono** |
| **Risco aceito** `RA` | vulnerabilidade conhecida nao corrigida | evidencia + responsavel nominal + tarefa de saida + prazo ≤ 90 dias |
| **Descartado** | nao e' problema | **uma linha dizendo por que**, e acabou |

**`achados_encaminhados` era o quinto destino, e o quinto nao existe.** Ele era o limbo: observado,
ninguem decidiu, fica. Foi assim que *"toda tarefa tinha problema"* virou pilha que da' vontade de
ignorar, e a IA, esperando resposta que nao vinha, improvisava. Esse limbo e' um pedaco do ciclo
infinito e sai do modelo.

**A correcao mecanica: achado nao sobrevive ao fechamento da tarefa.** O `task finalizar` recusa
achado sem destino, do mesmo jeito que recusa marcador nao preenchido.

```
achados: [{ classe, descricao, destino, ref }]
destino: "tarefa" | "divida_tecnica" | "risco_aceito" | "descartado"
ref:     o ID criado, ou o motivo do descarte
```

**E o gatilho da triagem e' uma autorizacao que ja' existe.** A IA propoe o destino de cada achado; a
autorizacao de finalizacao (portao 2 do nucleo) aprova junto. **Zero interrupcao nova.** O humano so'
fala se quiser mudar algum destino. Isso nao viola a regra de ouro do guia: o silencio nao dispensa
nada, ele aprova uma proposta escrita e visivel.

### 5.6 Achado e' sobre codigo, nunca sobre prosa

Observacao do humano em 29/08: *"isso e' util em codigo do projeto, em documentacao extensa nao, pq
ela esquece coisas"*. Esta' certo, e o mecanismo que garante isso ja' existe: a **lista fechada de
cinco classes** do nucleo §6.

```
1 seguranca, inclusive dependencia com vulnerabilidade conhecida
2 dado pessoal exposto
3 performance com impacto de usuario
4 requisito ausente ou contradito pelo codigo
5 gate que existe e nao checa nada
```

**As cinco sao verificaveis, e nenhuma e' sobre texto.** *"Este paragrafo podia ser mais claro"* nao e'
achado, nao entra, e nao vira nada. Texto sempre pode ser reescrito, entao achado sobre texto e'
infinito por construcao, e foi essa infinitude que produziu 35 tarefas DOC no `esquadro-agents`.

Achado fora das cinco classes nao e' proibido de mencionar no chat. E' proibido de virar registro.

### 5.7 O pacote nao se conserta de dentro do projeto do usuario 🟢

A hipotese do humano (*"achados sao melhorias do proprio pacote"*) descreve exatamente a maquina que
produziu **40 CHORE + 35 DOC e zero funcionalidade** no antecessor.

> **Regra:** melhoria do `mentor-agent` e' tarefa **no repositorio do `mentor-agent`**, nunca tarefa no
> projeto que o usa. Se o pacote atrapalhou durante uma tarefa, isso vira uma linha na narrativa dela e
> o humano leva para o outro repositorio quando quiser.

Sem essa separacao, todo projeto vira, aos poucos, um projeto sobre o pacote.

---

---

## 6 · Os limites da IA, e o mecanismo que ataca cada um 🟢

Pedido do humano em 29/08: *"temos que saber o limite das IAs, pensar em formas de diminuir esses
erros"*. Sete limites reais, e o que no pacote responde a cada um.

| Limite | Como aparece | Mecanismo |
| :-- | :-- | :-- |
| **Nao tem memoria entre sessoes** | esquece decisao tomada ontem | `contexto.json` e' a memoria: o que nao esta' em arquivo nao existe |
| **A atencao decai com o volume** | ignora a instrucao especifica quando ha' muito texto | teto em caracteres · carregamento por gatilho · nucleo de 6.637 |
| **Nao sabe o que nao verificou** | confunde *"nao achei"* com *"nao procurei"* | o auditor declara **o que nao conseguiu verificar**; `NÃO EXECUTADO` exige motivo |
| **Complacencia** | concorda com quem revisa junto | auditor em **contexto limpo**, com o unico poder de reprovar |
| **Producao compulsiva** | escrever mais e criar artefato parecem ajudar | linha de proporcionalidade · tetos · CD-15 (nao abstrair antes da terceira ocorrencia) |
| **Fluencia parece verdade** | `APROVADO` honesto e inventado tem texto identico | o rotulo sai do **codigo de saida do processo**, nunca de quem escreve |
| **Erra ao contar e ordenar** | conta tarefa errado, pula ID, desordena fila | **todo numero e' gerado**: ID, datas, contagens, ordem da fila |
| **Regride ao padrao do treino** | usa o estilo mais comum do treino, nao o do projeto | convencao de stack escrita **no projeto**, e CD-01: siga o estilo do arquivo |

### 6.1 As cinco regras que impedem o loop de voltar

1. **Auditoria reporta, nunca cria tarefa.** (P6)
2. **Escopo fechado por tipo:** auditor ve' o diff; doctor mede sem julgar; revisao geral julga, mas
   sob demanda.
3. **Achado sem mecanismo nao vira lei.** Erro que se repete e para o qual nao da' para escrever um
   comando que o pegue vira **orientacao no guia**, nunca regra nova no nucleo. Essa regra sozinha
   teria evitado os 7 defeitos de aparato do `esquadro-agents`.
4. **O pacote nao se conserta de dentro do projeto do usuario** (§5.7).
5. **O doctor so' cresce em coisa mensuravel.** Checagem que precisa de julgamento nao entra nele, e
   por isso ele nao inflaciona como o pacote inflacionou.

> **O padrao comum aos cinco:** nenhum deles pede que a IA lembre, se esforce ou tenha cuidado. Todos
> mudam **o que ela e' capaz de fazer**. Foi a tentativa de resolver limite de capacidade com mais
> texto que produziu 22.707 linhas e zero funcionalidade.

---

## 8 · Relatorio de campo: como a melhoria volta ao pacote 🟢 *(fase 7)*

A regra §5.7 fecha a porta certa (o pacote nao se conserta de dentro do projeto), mas melhoria precisa
de evidencia de uso real. O canal e' **um arquivo que sai do projeto e entra no repositorio do
pacote**, nunca uma tarefa.

O humano ja' fez isso duas vezes a mao, pedindo a' IA para ler os registros e escrever um `.md`. Um
deles, o `analise-melhorias-agente.md`, tem 1.027 linhas, e a secao que decidiu tudo foi a §1: uma
tabela de sete linhas. **O relatorio nao precisa ser grande, precisa ser medido.**

### 8.1 Duas partes, e a primeira vale mais

| Parte | Quem escreve | Custo |
| :-- | :-- | :-- |
| **A · Medicao** | script, zero julgamento | zero token |
| **B · Atrito** | IA, lendo os registros | uma sessao |

A parte A e' o que convenceu voce em todos os casos ate' agora. A parte B so' entra com **referencia
obrigatoria**: item sem ID de tarefa e data nao entra, porque sem isso vira opiniao generica.

### 8.2 O que a parte A mede

Tudo sai dos `TASK-*.json` e do `contexto.json`, sem ninguem digitar:

```
Tarefas concluidas, por tipo e percentual        <- pega o vicio CHORE+DOC
Tarefas por cerimonia
Regras do pacote x virou comando? x vezes executado   <- A TABELA
Quantas vezes o `finalizar` foi recusado, por impedimento  <- onde a IA erra
Rotulos de gate: APROVADO / FALHOU / NAO EXECUTADO / BLOQUEADO
Achados por classe, e o destino de cada um
Dividas tecnicas abertas x pagas x com gatilho vencido
Riscos aceitos ativos x vencidos
Tarefas nascidas XG (a fila mandou dividir e alguem dividiu?)
Quantas vezes a ordem da fila foi fixada a mao   <- mede se o calculo esta' errado
Tempo entre criada e iniciada; entre iniciada e concluida
Tetos de texto estourados ao longo do tempo
```

Duas dessas nao existiam em nenhum projeto anterior e sao as mais uteis:
**"quantas vezes o `finalizar` foi recusado, e por qual impedimento"** mede exatamente onde a IA
falha, sem ninguem opinar. E **"quantas vezes a fila foi fixada a mao"** mede se os criterios de
ordenacao estao errados.

### 8.3 O que a parte A exige do pacote: um inventario das proprias regras

A tabela decisiva so' e' geravel se cada regra do pacote souber dizer **se virou comando**. Precisa de
`.mentor/regras.json`:

```json
{ "id": "OPS-27", "onde": "guia/11-operacao.md", "comando": "npm run audit:prod" }
{ "id": "SEC-14", "onde": "guia/09-seguranca.md", "comando": null }
```

Custo baixo e auto-conferivel: os IDs ja' existem no markdown, o script os extrai por regex, e a
**terceira familia do `verificar`** (integridade referencial) confere que todo ID do markdown esta' no
JSON e vice-versa. Regra com `comando: null` e' declaradamente orientacao, nao lei, o que ja' e' o
principio P1 virando dado.

### 8.4 O que NAO entra, e por que isso importa

Codigo do projeto · conteudo de requisito · nome de pessoa · URL interna · qualquer texto do dominio.

**So' metadado de processo.** Isso e' o que torna o relatorio colavel em qualquer lugar sem revisar
linha por linha, inclusive vindo de outra pessoa que use o pacote.

### 8.5 Cadencia e destino

Sob demanda, e sugerido a cada **50 tarefas concluidas** ou no encerramento de um projeto. Baixa
frequencia de proposito: relatorio de campo frequente e' outra forma de tarefa gerando tarefa.

```
mentor relatorio-de-campo    ->  docs/relatorio-de-campo.md
                             ->  o humano copia para   mentor-agent/campo/<projeto>-<data>.md
                             ->  vira entrada aqui, no MELHORIAS.md
```

⚠️ **O relatorio nao cria tarefa em lugar nenhum**, nem no projeto nem no pacote. E' evidencia. A
admissao continua sendo a mesma: achado sem mecanismo vira orientacao no guia, nunca lei nova.

### 8.6 Template

```markdown
# Relatorio de campo · <projeto> · <data>

Pacote: mentor-agent <versao>   ·   Periodo: <primeira tarefa> a <ultima>
Gerado por `mentor relatorio-de-campo`. Partes A e C sao geradas; B e' escrita.

## A · Medicao

### A.1 Tarefas concluidas
| Tipo | Qtd | % |
> Sinal: RF+RN+RNF abaixo de 50% indica pacote consumindo o projeto.

### A.2 Regras do pacote: escrita x execucao
| Regra | Onde | Virou comando? | Vezes executada |
> A linha que importa e' a de `comando: null` com uso zero.

### A.3 Onde o fechamento foi recusado
| Impedimento | Vezes |
> Mede onde a IA falha, sem ninguem opinar.

### A.4 Gates
| Rotulo | Vezes |

### A.5 Achados
| Classe | Qtd | tarefa | DT | RA | descartado |

### A.6 Divida tecnica e risco aceito
Abertas · pagas · gatilho vencido · RA ativos · RA vencidos

### A.7 Fila
Nascidas XG e divididas · ordem fixada a mao · dias parada antes de iniciar

### A.8 Tetos
Estouros, e quais arquivos

## B · Atrito (escrita, com referencia obrigatoria)

### B.1 Regras que atrapalharam
- <regra> · TASK-XXX-NNN · <data> · o que aconteceu · o que teria funcionado

### B.2 O que o pacote deixou de lembrar
- <assunto> · TASK-XXX-NNN · <data> · quando isso deveria ter aparecido

### B.3 O que a IA teve que improvisar
- <processo ausente> · TASK-XXX-NNN · <data>

> Item sem ID de tarefa e data **nao entra**.

## C · O que funcionou (gerado)
As regras com comando e uso alto. Serve para nao remover por engano o que esta' sustentando o resto.
```

A parte C existe por causa do §9 do `analise-melhorias-agente.md`: *"analise honesta reconhece o que
funciona, senao vira reescrita gratuita"*. Sem ela, todo relatorio vira lista de defeitos, e a leitura
seguinte conclui que nada presta.

---

## 7 · Descartados ⚪

| O que | Motivo |
| :-- | :-- |
| Prefixo numerico de ordem no **nome do arquivo** | reordenar viraria renomear: quebra historico do git e links; dois arquivos podem colidir no mesmo prefixo; e vira segunda fonte de verdade que pode discordar do `valor` do proprio arquivo. Substituido pelo campo `ordem` + `task fila` |
| Sub-numeracao decimal no ID (`TASK-RF-005.2`) | **justificativa corrigida em 29/08.** A razao herdada do nucleo do antecessor (*"maior mais um nao tem resultado definido entre `005.3` e `006`"*) **morreu quando o script passou a gerar o ID**: a IA nao calcula mais nada. O que sobra, e decide: **um ID e' imutavel e a relacao pai-filho nao e'.** O ID vai para commit, ramo, historico e registro fechado; o pai muda (no `estima-moto`, o escopo "configuravel" da `RF-006.12` foi absorvido pela `RF-007`). Codificar fato mutavel em identificador imutavel obriga a renomear ou a mentir. Secundario: com ponteiro, profundidade e' de graca; com decimal, cada nivel cobra ordenacao natural e uma regra de proximo numero. **Dado de campo:** o `estima-moto` usou 141 IDs planos, 56 de dois niveis e 15 de tres, com 48 filhos diretos num unico epico, entao a legibilidade perdida e' real |
| Campo `posicao` guardado na tarefa (`fatia 2 de 3`) | descartado no mesmo dia em que foi proposto, por observacao do humano: o denominador e' movel. A sexta fatia obrigaria a reescrever as cinco anteriores, e qualquer nome de arquivo que o carregasse passaria a mentir. **Substituido por calculo na geracao da vista:** `2/3` vira `2/5` sozinho, e o nome do arquivo continua carregando so' data e ID |
| Quarto **arquivo** para o backlog | mesmo motivo: mover entre pastas renomeia. Substituido pelo campo `fila` |
| Autoteste por mutacao | so' faz sentido com dezenas de checagens; no antecessor o autoteste falhando virou bug proprio (BG-002) |
| Processo de Figma | e' de stack |
| Padroes de React e de Node embutidos no pacote | contradizem a agnosticidade declarada; nascem por projeto via `processos/padroes-de-stack.md` |
| `docs/uso-de-ia.md` como artefato do pacote | decisao do humano em 29/08. Documento de governanca e' escolha de cada projeto, nao parte do processo |
| Coluna "Por que agora" na tabela de ordem | e' julgamento e envelhece: no `pendentes.md` do roteirizador, **11 das 11 linhas** estavam concluidas |
