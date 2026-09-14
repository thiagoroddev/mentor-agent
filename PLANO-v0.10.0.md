# Plano · v0.10.0: laboratorio isolado e sugestao tratada como hipotese

> Decidido com o humano em 13/09/26, a partir da validacao da TASK-RF-044 e da TASK-BG-022 do piloto.
> Este repositorio nao aplica as proprias regras: o plano e' convencao de trabalho. Ainda assim ele
> segue a regra nova da frente H (secao 2), porque e' exatamente onde ela faltou.

---

## 1. O que aconteceu no piloto

1. **Vazamento de experimento.** A TASK-SPIKE-003 (auto-roteirizacao) vive em
   `__utilidades-back-office__/`. O codigo do app nao mudou, mas o laboratorio exportou JSON que o app
   importa, com `vehicleStopIsDefault: false` em toda parada. No app, esse campo quer dizer "o usuario
   moveu o carro". O roteiro importado ficou com o veiculo estacionado a meio caminho da parada seguinte,
   e a regra padrao nunca mais foi aplicada. Corrigido no projeto pela TASK-BG-022 (INV-001).
2. **Sugestao leiga virou especificacao.** O humano sugeriu, em termos leigos, "deixar as chaves do
   algoritmo de teste desligadas" e "um processo explicito". A IA propos exatamente isso: um campo
   declarativo `isolamento` no plano de SPIKE, conferido so' por presenca. A pratica profissional so'
   apareceu quando o humano perguntou se aquilo era o que os devs fazem. A comparacao mostrou que o
   campo nao teria pego o caso, porque o vazamento foi por **dado exportado**, nao por codigo.

Por que o pacote nao pegou nenhum dos dois:

- `problema_canonico` e `discordancia` existem, mas foram preenchidos sobre **como implementar a
  sugestao**, nao sobre o problema. Nada no plano separa o pedido da solucao sugerida.
- SPIKE e' "descartavel" so' no texto (`tipos_nota`). Nenhum comando sabe onde o laboratorio fica, o
  que dele pode chegar ao produto, ou se a saida dele esta fora do git.

## 2. Pedido, sugestao e alternativas (a frente H aplicada a este plano)

**Pedido original** (13/09/26): *"Todo algoritmo de teste nao deve alterar o padrao fora do teste. Qual
processo tem que deixar explicito pra isso nao ocorrer? Era se deixar as chaves do algoritmo de teste
desligado."* E depois: *"eu pedi algo com conhecimento leigo, vc fez exatamente o que eu pedi (...) ja era
pra ter feito [a analise profissional] quando eu fiz o primeiro pedido, esse e o papel do agente mentor."*

**Solucao sugerida:** chave de teste desligada por padrao + um processo explicito. A primeira resposta
da IA (campo `isolamento` declarativo) e' a sugestao formalizada, e fica registrada como tal.

### Alternativas profissionais para o laboratorio (frente L)

| Pratica | Pegaria o caso? | O que o pacote consegue verificar | Custo |
| :-- | :-- | :-- | :-- |
| Chave de experimento desligada por padrao, com inventario, dono e validade (Fowler, "Feature Toggles"; OpenFeature, Unleash) | **Em parte**: a chave existia so' na cabeca | inventario no contexto, padrao desligado, teste resolvido, validade vencida | P |
| Contrato na fronteira de importacao (validacao de esquema, contract testing tipo Pact) | **Sim**: o teste de contrato da exportacao prende o padrao | que todo artefato importavel declarado tem teste que existe | P |
| Ambientes separados (preview/staging com armazenamento proprio) | **Sim**, para o dado real | nada no pacote; vira orientacao | 0 |
| Spike descartavel (XP): o codigo do spike nao entra no produto; o que sobrevive e' reescrito com teste | **Nao** (o codigo do app nao mudou), mas previne a outra metade do risco | diff do SPIKE fora dos caminhos do laboratorio | P |
| Regra de dependencia verificada (lint `no-restricted-imports`, dependency-cruiser, ArchUnit) | **Nao**: vazou dado, nao import | nada: e' do projeto, com a ferramenta dele | P no projeto |
| Shadow mode / avaliacao offline com saida em relatorio | **Nao** diretamente; e' o jeito certo de comparar motor | pergunta obrigatoria "a saida e' relatorio ou importavel?" | 0 |
| Campo declarativo `isolamento` (a primeira proposta) | **Nao**: declaracao sem verificacao | so' presenca | P, e engana |

**Escolha:** chave com inventario + contrato na fronteira + escopo do spike checado no diff + saida do
laboratorio fora do git. Ambiente separado e regra de dependencia ficam como orientacao no processo,
porque so' o projeto tem a ferramenta.

### Alternativas profissionais para a sugestao virar hipotese (frente H)

| Pratica | Pegaria o caso? | Custo |
| :-- | :-- | :-- |
| "Alternativas consideradas" obrigatorias no documento de decisao (design doc; RFC do Rust, "Rationale and alternatives"; MADR, "Considered Options") | **Sim**, se ligada a sugestao: obriga a comparar antes de aprovar | P |
| Separar enunciado do problema da solucao (problema XY; "5 porques") | **Sim**: o plano teria dito "artefato de teste chegando ao produto", nao "campo isolamento" | P |
| ADR para toda sugestao | Sim, mas e' cerimonia Strict para decisao pequena | M, e vira processo abandonado |
| So' uma frase no processo ("compare com o mercado") | **Nao**: ja existia no principio 8 e nao segurou | 0 |

**Escolha:** o plano registra o pedido original, a solucao sugerida e pelo menos duas alternativas
profissionais comparadas, e o `finalizar` recusa sugestao sem comparacao. **Limite honesto:** o script
so' garante que a comparacao existe; a qualidade dela fica com o humano, no Portao 1, e com o auditor.

## 3. O que muda

### Frente H · sugestao do humano e' hipotese

| # | Mudanca | Onde |
| :-- | :-- | :-- |
| H1 | `task iniciar` escreve no plano `pedido_original`, `solucao_sugerida` (ou `null`) e `alternativas_profissionais` (`[{ pratica, pegaria_o_caso, custo }]`, ou `[]` sem sugestao), com marcador | `cmd-tarefa.ts`, `tipos.ts`, `esquemas/tarefa.json` |
| H2 | `task finalizar` recusa: `pedido_original` vazio; `solucao_sugerida` preenchida com menos de duas alternativas completas. Plano sem os campos (tarefa iniciada antes da 0.10.0) nao e' cobrado | `cmd-tarefa.ts` |
| H3 | Dossie da auditoria mostra pedido, sugestao e alternativas de cada tarefa, e o "ja medido" aponta as tarefas com sugestao para o auditor conferir se a escolha resolve o caso | `cmd-auditar.ts` |
| H4 | Nucleo, Portao 1: sugestao do humano e' hipotese a comparar, nao especificacao | `nucleo.md`, `tetos.json` |
| H5 | `processos/tarefa.md`: passo ENTENDER reformula o problema, nunca a solucao; nome canonico (problema XY) e o limite honesto | `processos/tarefa.md`, `tetos.json` |
| H6 | `processos/rascunho.md`: ideia que chega como solucao registra o problema e as alternativas antes de virar tarefa | `processos/rascunho.md` |

### Frente L · laboratorio isolado

| # | Mudanca | Onde |
| :-- | :-- | :-- |
| L1 | `contexto.laboratorio`: `caminhos` (onde o experimento vive; `null` = nao declarado, `[]` = projeto sem laboratorio), `saidas` (onde a saida cai), `chaves` (`[{ nome, onde, padrao, dono, remover_em, teste }]`) e `artefatos_importaveis` (`[{ artefato, teste_de_contrato }]`) | `esquemas/contexto.json`, `tipos.ts` |
| L2 | `task finalizar` de SPIKE com `caminhos` declarados recusa arquivo de codigo mudado fora deles, nomeando os arquivos. Mudanca no produto e' outra tarefa; a saida explicita e' `--produto-tocado "<motivo>"`, gravado na tarefa e mostrado no dossie. Sem `caminhos` declarados, so' avisa | `cmd-tarefa.ts`, novo `laboratorio.ts` |
| L3 | Plano de SPIKE ganha `saida_do_laboratorio: { tipo: "relatorio" \| "importavel", artefato, teste_de_contrato }`. `importavel` exige teste de contrato que resolve (arquivo existe e contem o nome do teste) **e** registrado em `artefatos_importaveis`, para a checagem sobreviver ao spike | `cmd-tarefa.ts`, `laboratorio.ts` |
| L4 | `verificar` (integridade referencial): chave sem nome/dono, com padrao diferente de `desligada`, ou com teste que nao resolve; artefato importavel com teste que nao resolve | `cmd-verificar.ts` |
| L5 | `doctor`: chave com `remover_em` vencido; saida do laboratorio que o git nao ignora; SPIKE viva com `caminhos` nao declarados | `cmd-doctor.ts` |
| L6 | `task iniciar` de SPIKE sem `caminhos` declarados avisa | `cmd-tarefa.ts` |
| L7 | `processos/laboratorio.md` (novo): as regras, as praticas da tabela acima e o que fica no projeto (lint de dependencia, importador desconfiado, preview). Nucleo §9 carrega em SPIKE e laboratorio | `processos/laboratorio.md`, `nucleo.md` |

**Proporcionalidade.** Pediram que teste nao altere o padrao fora do teste e que o mentor compare a
sugestao com a pratica profissional. Proponho dois campos de contexto e cinco de plano, quatro checagens
em comandos que ja existem, um modulo pequeno (`laboratorio.ts`, que evita espalhar a mesma leitura em
tres comandos) e um processo novo (`laboratorio.md`, porque `tarefa.md` ja esta no teto). Nenhum
comando novo. E' do tamanho dos dois incidentes.

## 4. Criterios de aceite (cenario 29)

1. `iniciar` escreve `pedido_original`, `solucao_sugerida` e `alternativas_profissionais` com marcador; em SPIKE, tambem `saida_do_laboratorio`.
2. `finalizar` recusa sugestao com uma alternativa; aceita sugestao com duas; aceita `solucao_sugerida: null` com `[]`.
3. SPIKE com `caminhos` declarados: recusa `src/app.ts` mudado, nomeando o arquivo; aceita mudanca so' no laboratorio; aceita com `--produto-tocado` e grava o motivo.
4. SPIKE sem `caminhos` declarados, com codigo mudado: finaliza, com aviso.
5. `saida_do_laboratorio` importavel: recusa teste que nao resolve; recusa teste que resolve e nao esta em `artefatos_importaveis`; aceita quando esta.
6. `verificar` reprova chave ligada por padrao, chave com teste inexistente e artefato com teste inexistente.
7. `doctor` avisa chave vencida, saida versionada e SPIKE viva sem laboratorio declarado.
8. O dossie mostra pedido, sugestao, alternativas e o motivo de `--produto-tocado`.

Os cenarios 23, 24 e 25 reaproveitam o esqueleto do `iniciar` e passam a preencher os campos novos.

## 5. Riscos

- **O piloto retoma a SPIKE-003 depois da 0.10.0.** Se ela mexeu em `src/`, o `finalizar` recusa: separar
  em tarefa propria ou `--produto-tocado` com motivo. E' a trava funcionando, mas custa na retomada.
- **Projeto sem `contexto.laboratorio`** (todo projeto existente) nao ganha a trava ate' declarar. O `doctor`
  so' cobra quando ha SPIKE viva, para nao virar ruido em projeto sem experimento.
- **"Teste resolve" e' busca de texto**: arquivo existe e contem o nome. Nao prova que o teste roda nem
  que checa o que promete. Mesmo limite dos criterios de aceite de hoje.
- **O campo de sugestao depende de a IA registrar a sugestao.** Nao ha como o script saber que houve uma.
  O marcador obriga a pergunta; o Portao 1 e o auditor conferem.

## 6. Fica fora

Continuam em `melhorias-do-pacote.md` do piloto, sem implementacao: `restricoes_reavaliadas` sem
mecanismo; composicao de epico fatiado; meio de teste manual construido pela tarefa; roteiro de
atualizar o pacote; evidencia de validacao manual com 10 caracteres.
