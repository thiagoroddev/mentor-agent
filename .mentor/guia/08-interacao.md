---
area: "Interação e interface"
prefixo: "IX"
portao: "I"
---

> §8 de 13. Índice: [`00-indice.md`](./00-indice.md). Consultado por lacuna do `contexto.json`, nunca do começo ao fim.

# §8 · Interação e interface

*Interface não é a parte bonita, é a parte que funciona ou não funciona. Boa interação reduz o atrito entre o que a pessoa quer fazer e o que precisa entender para conseguir.*

## 8.1 Princípios

**IX-01 · BLOQUEIA ·** Três conceitos distintos: **usabilidade** (medida: consegue fazer, com que esforço, com que satisfação), **experiência** (tudo que afeta — contexto, espera, emoção, suporte, o que vem antes e depois), **interface** (o meio).
→ Quando o usuário disser "quero que fique bonito", traduzir: qual tarefa precisa ficar mais fácil, para quem, e como saberemos que melhorou.

**IX-02 · BLOQUEIA ·** **Usabilidade é medida, não julgada:**

| Dimensão | Vira métrica |
| :-- | :-- |
| Eficácia | Taxa de conclusão da tarefa |
| Eficiência | Tempo, passos, erros no caminho |
| Satisfação | Avaliação direta, desistência, reclamação |

→ "Ficou bom?" não é resposta. "Oito de dez concluíram o cadastro sem ajuda, em menos de dois minutos" é.

**IX-03 · BLOQUEIA ·** Hierarquia, sem pular degrau: **funcionalidade** (faz o que promete) → **usabilidade** (fácil, previsível) → **prazer** (agradável, desejável). Não se investe no degrau de cima com o de baixo instável.

**IX-04 · ACEITE ·** A experiência não começa nem termina na tela. Um fluxo perfeito que termina em silêncio é um fluxo quebrado.

## 8.2 Portão I — contexto de uso

**IX-05 · BLOQUEIA ·** Seis perguntas, nenhuma sobre tecnologia: **quem** (o que já sabe e o que não sabe), **o quê** (que problema resolve), **por quê**, **quando**, **onde** (ambiente, dispositivo, conexão), **como** (quanta atenção, quanto tempo, quantas mãos).

**IX-06 · BLOQUEIA ·** Contexto é requisito:

| Contexto | Consequência |
| :-- | :-- |
| Distração, uso em pé, poucos segundos | Fluxo curto, alvo grande, ação principal evidente |
| Conexão instável | Funciona com espera, tolera falha, não recomeça do zero |
| Uso prolongado e concentrado | Mais densidade, atalhos, controle fino |
| Pessoa treinada, uso diário | Eficiência acima de descoberta |
| Pessoa leiga, uso raro | Descoberta acima de eficiência |

→ **Projetar para o contexto mais difícil em que a tarefa precisa funcionar, não para a mesa do desenvolvedor.**

**IX-07 · ACEITE ·** A pessoa vê menos do que quem projetou imagina. Toda tela comunica seu propósito e sua ação principal em uma olhada.

**IX-08 · ACEITE ·** **Interrupção é rotina.** Formulário longo, processo em etapas e qualquer coisa acima de um minuto salvam progresso e permitem retomar. Perder o preenchido faz a pessoa desistir e não voltar.

## 8.3 Recursos do dispositivo

**IX-45 · BLOQUEIA ·** Verificar se o recurso existe antes de usá-lo e continuar funcionando quando não existir. Câmera, sensor, localização, notificação, biometria e conexão não são garantidos.

**IX-46 · BLOQUEIA ·** Liberar recursos contínuos quando a aplicação sai de vista. Captura, escuta e localização rodando fora de foco consomem bateria de quem não está usando — motivo comum de desinstalação.

**IX-47 · ACEITE ·** Não fixar limiar numérico calibrado em um único aparelho; derivar da faixa que o dispositivo informa.

## 8.4 Avaliação

**IX-09 · ACEITE ·** Sete critérios — não só o segundo:

| Critério | Costuma faltar |
| :-- | :-- |
| Útil | Quando a funcionalidade nasceu de suposição |
| Usável | — |
| **Encontrável** | Sempre. Existe e ninguém encontra |
| **Acessível** | Quase sempre |
| Confiável | Percebido tarde, pela desconfiança |
| Valioso (usuário **e** negócio) | Quando só um dos dois foi considerado |
| Desejável | — |

## 8.5 Os limites de quem usa

**IX-10 · BLOQUEIA ·** Não sobrecarregar. Interface que exige demais produz erro e abandono — a culpa é do projeto, nunca da pessoa.

**IX-11 · BLOQUEIA ·** **Uma ação principal por tela**, visualmente dominante. Duas com o mesmo peso obrigam a decidir antes de entender.

**IX-12 · BLOQUEIA ·** Agrupar em blocos de cinco a nove. Menu longo, formulário extenso e lista de opções são divididos em grupos nomeados.

**IX-13 · BLOQUEIA ·** **Reconhecer em vez de lembrar.** A pessoa não guarda informação de uma tela para usar em outra. *Falha clássica: pedir um código que só aparecia na tela anterior.*

**IX-14 · ACEITE ·** Só o que serve à tarefa. Antes de acrescentar: isto ajuda a concluir a tarefa desta tela, ou está aqui porque cabia?

**IX-15 · ACEITE ·** **O espaço é semântico, não decorativo.** A percepção agrupa antes de ler:

| Regra | Como se usa |
| :-- | :-- |
| Proximidade | Perto significa relacionado — rótulo colado no campo certo |
| Similaridade | Mesma aparência, mesma função — se é clicável, parece com o que é clicável |
| Continuidade | Alinhamento indica ordem de leitura e preenchimento |
| Segregação | Contraste destaca o que precisa ser notado |
| Fechamento | Borda e fundo delimitam um bloco sem moldura |

→ *Espaçamento inconsistente comunica agrupamento errado. É defeito, não questão de gosto.*

## 8.6 Modelos mentais e consistência

**IX-16 · BLOQUEIA ·** A pessoa chega com expectativas prontas. Contrariá-las sem motivo forte gera erro, não originalidade.

**IX-17 · BLOQUEIA ·** **Consistência interna é regra dura:** mesmo elemento, mesma posição, mesmo nome, mesmo comportamento, em todas as telas.

**IX-18 · ACEITE ·** **Ícone é palavra visual — se a pessoa não conhece a palavra, a comunicação falha.** Ícone com rótulo sempre que a ação for pouco frequente, ambígua ou irreversível.

**IX-19 · ACEITE ·** Inovar precisa resolver problema real. Novidade não é melhoria.

## 8.7 As dez heurísticas

**IX-20 · BLOQUEIA ·** Checklist de revisão de qualquer interface — em negrito, as que mais faltam:

| # | Heurística | Exige |
| :-- | :-- | :-- |
| 1 | **Visibilidade do estado** | Sempre saber onde está, o que acontece, se a ação foi recebida |
| 2 | Correspondência com o mundo real | Vocabulário do usuário; ordem natural |
| 3 | **Controle e liberdade** | Saída visível de todo lugar: cancelar, voltar, desfazer |
| 4 | Consistência e padrões | `IX-17` |
| 5 | **Prevenção de erros** | Impedir é melhor que avisar: campo que só aceita o válido, confirmação antes do irreversível, opção indisponível desabilitada com motivo |
| 6 | Reconhecimento | `IX-13` |
| 7 | Flexibilidade | Caminho curto para quem sabe, sem prejudicar quem não sabe |
| 8 | Minimalismo | `IX-14` |
| 9 | **Recuperar erros** | `IX-23` |
| 10 | Ajuda | Acessível de onde a dúvida aparece |

## 8.8 Estados, feedback e erro

**IX-21 · BLOQUEIA ·** **Toda tela implementa os cinco estados: vazio, carregando, erro, sucesso, sem permissão.** O leigo só descreve o feliz; entregar só ele é entregar um quinto do trabalho.
→ O estado vazio é oportunidade: explica o que aquilo é e oferece a primeira ação.

**IX-22 · BLOQUEIA ·** Todo componente interativo tem estados visíveis: normal, desabilitado, com foco, sob o ponteiro, pressionado, processando.
→ Sem o de foco, a interface deixa de funcionar por teclado. Sem o de processando, a pessoa clica de novo — e a operação acontece duas vezes (`NS-23`).

**IX-23 · BLOQUEIA ·** **Mensagem de erro responde três coisas:** o que aconteceu, por quê, o que fazer agora.
→ *Proibido:* código técnico, termo interno, "erro inesperado", e a mensagem que culpa a pessoa. O detalhe vai para o registro.
→ Junto do campo que causou o problema, não no topo de uma página longa.

**IX-24 · BLOQUEIA ·** Ação irreversível pede confirmação que **descreve a consequência** — não "tem certeza?", mas o que será perdido. Melhor: tornar reversível.

**IX-25 · BLOQUEIA ·** Nenhuma ação sem retorno. Espera sem indicação é indistinguível de falha.

**IX-26 · ACEITE ·** Desempenho é usabilidade: lentidão é percebida como defeito de interface.

## 8.9 Estrutura, sistema e acessibilidade

**IX-27 · BLOQUEIA ·** **Definir o sistema antes das telas** — escala de espaçamento, tipografia, paleta e grade primeiro:

| Elemento | Regra |
| :-- | :-- |
| Cor | Uma primária, uma secundária, variantes, neutros e os de estado |
| Espaçamento | Escala fixa e limitada; valor fora da escala é defeito |
| Tipografia | Poucos tamanhos, hierarquia clara |
| Grade | Colunas, espaço entre colunas e margens por faixa de tela |
| Medidas | Unidade independente da densidade da tela |

**IX-28 · BLOQUEIA ·** **Componente antes de página**, com todos os seus estados. Recriar o mesmo botão em cada tela é como duplicar regra de negócio: diverge, e ninguém percebe.

**IX-29 · ACEITE ·** Alvo de interação dimensionado para o dedo, com separação suficiente entre vizinhos.

**IX-30 · ACEITE ·** **Começar pela restrição.** Projetar primeiro para a tela menor obriga a decidir o essencial; expandir depois é fácil. O caminho inverso resulta em versão pequena e amputada.

**IX-31 · ACEITE ·** Escolher entre adaptação contínua (um layout que se molda; manutenção simples, nenhum tamanho perfeito) e layouts fixos por faixa (otimizado por dispositivo; mais trabalho).

**IX-32 · ACEITE ·** **O texto da interface é design.** Rótulo diz o que vai acontecer ("Enviar pedido", não "OK"); instrução vem antes do campo, não depois do erro.

**IX-48 · BLOQUEIA ·** **Organização, rotulação, navegação e busca são artefato, não consequência.** Definir antes das telas como o conteúdo se agrupa, com que nome aparece, como se navega e como se procura.
→ O nome é o do usuário, não o interno da empresa. O mesmo conceito tem um nome só, em todo o sistema.

**IX-49 · BLOQUEIA ·** Toda tela de entrada responde, sem rolagem: **o que é isto, o que existe aqui, o que posso fazer, por que aqui e não em outro lugar.**

**IX-50 · ACEITE ·** Separar o esqueleto do conteúdo, e **validar todo modelo com conteúdo verdadeiro** — nome longo, texto vazio, valor negativo, lista com um item e com quinhentos. Layout aprovado com texto de preenchimento esconde os casos que quebram.

**IX-51 · ACEITE ·** Antes de desenhar a tela de um fluxo que depende de gente ou processo interno, **mapear os bastidores**: quem executa cada etapa fora da vista, com que sistema, em quanto tempo. É aí que aparecem a informação pedida duas vezes e a etapa obrigatória não prevista.

**IX-52 · ACEITE ·** Separar estrutura, apresentação e comportamento.

**IX-33 · BLOQUEIA ·** **Acessibilidade é requisito, não versão especial** — e é o critério que nenhum usuário leigo pede:

```
[ ] Contraste medido por ferramenta, nunca julgado a olho
[ ] Toda a interface operável por teclado, com foco visível
[ ] Ordem de foco seguindo a ordem visual
[ ] Todo campo com rótulo associado — sugestão dentro do campo não é rótulo
[ ] Imagem com função tem descrição; decorativa é ignorada por leitor de tela
[ ] Informação nunca só por cor
[ ] Erro anunciado de forma perceptível por leitor de tela
[ ] Alvos com tamanho e separação confortáveis
[ ] Texto redimensionável sem quebrar o layout
```

**IX-34 · ACEITE ·** Verificação automática cobre parte. Navegar a tarefa principal só com teclado encontra o que a ferramenta não vê.

## 8.10 Processo e validação

**IX-35 · BLOQUEIA ·** Do barato para o caro:

| Fase | Responde | Custo de mudar |
| :-- | :-- | :-- |
| Esboço | O fluxo faz sentido? | Segundos |
| Wireframe | Onde fica cada coisa e o que tem mais peso? | Minutos |
| Mockup | Como fica visualmente? | Horas |
| Protótipo | A pessoa consegue usar? | Horas |
| Código | — | Dias, e com dado real em cima |

→ Nunca pular direto para o código em fluxo novo ou disputado.

**IX-36 · ACEITE ·** Baixa fidelidade é vantagem: não é confundida com pronto, mantém a discussão na estrutura, e as pessoas criticam com mais honestidade o que parece descartável.

**IX-37 · BLOQUEIA ·** Aprovação por fase, em linguagem que o usuário domina — nunca o modelo técnico, nunca só o resultado final.

**IX-38 · ACEITE ·** O processo é iterativo: entender → gerar alternativas → tornar tangível → validar → voltar.

**IX-39 · ACEITE ·** Gerar mais de uma alternativa para a tela central antes de escolher, com o critério declarado.

**IX-40 · ACEITE ·** Escolher o tipo de interação adequado à tarefa, não o mais moderno: comando (rápido, exige saber pedir), diálogo (natural, lento e ambíguo), manipulação direta (intuitiva, exige espaço), exploração (boa para descoberta, ruim para tarefa objetiva).

**IX-41 · BLOQUEIA ·** **Testar com gente que não participou da construção.** Quem construiu não consegue mais enxergar a interface como quem chega nela.

**IX-42 · ACEITE ·** **Observar a tarefa, não pedir opinião.** Entregar um objetivo real e observar em silêncio onde a pessoa hesita, erra, volta ou desiste. *"O que você achou?" produz gentileza, não informação.*

**IX-43 · ACEITE ·** Hesitação é dado: onde a pessoa parou para pensar, há decisão que a interface deveria ter tornado óbvia.

**IX-44 · ACEITE ·** Métricas de `IX-02` acompanhadas ao longo do tempo, não só no lançamento.

---
