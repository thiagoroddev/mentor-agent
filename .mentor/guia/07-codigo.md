---
area: "Código"
prefixo: "CD"
portao: "—"
---

> §7 de 13. Índice: [`00-indice.md`](./00-indice.md). Consultado por lacuna do `contexto.json`, nunca do começo ao fim.

# §7 · Código

> **Nota de origem:** esta seção é **extensão**, não extração — nenhuma disciplina da grade a sustenta. Existe porque o guia é lido por uma IA, e conhecimento latente não é comportamento ativado: o modelo sabe enunciar estes princípios e mesmo assim não os aplica quando o pedido é "faça funcionar". As regras abaixo corrigem comportamentos padrão errados ou impõem limites verificáveis — não recitam código limpo.
>
> **Limites numéricos** ficam no documento de convenções da stack, onde variam por linguagem. Aqui fica o princípio e o *tipo* de limite.

## 7.1 Consistência

**CD-01 · BLOQUEIA ·** **Ao editar código existente, seguir o padrão do arquivo — não o padrão preferido do modelo.** Nomenclatura, formato, estrutura, forma de tratar erro e organizar importações vêm do que já está lá.
→ *Por que é a primeira regra:* uma IA que "melhora" o estilo de cada trecho que toca cria três dialetos no mesmo projeto. Divergência de padrão custa mais que o padrão inferior.
→ Se o padrão existente for de fato ruim, isso vira proposta separada e explícita — nunca mudança silenciosa embutida em outra alteração.

**CD-02 · BLOQUEIA ·** Antes de criar utilitário, tipo, constante ou função auxiliar, **verificar se já existe** no projeto. Duplicata criada por desconhecimento é a forma mais comum de duplicação em base grande.

## 7.2 Nomes e tamanho

**CD-03 · BLOQUEIA ·** **Nome revela intenção.** Diz o que a coisa é ou faz, no vocabulário do negócio (`AN-23`).
→ Proibidos como nome final: `data`, `info`, `item`, `obj`, `temp`, `aux`, `res`, `valor1`, `handleClick`, `doSomething`, `processData`.
→ *Teste:* o nome permite entender o trecho sem ler a implementação? Se precisa de comentário para explicar o que é, o nome está errado.
→ Comprimento proporcional ao escopo: índice de laço curto pode ser `i`; campo público de módulo, não.

**CD-04 · BLOQUEIA ·** **Uma unidade, uma responsabilidade** (`ES-62`). Quando a descrição do que a função faz precisa de "e", ela faz duas coisas.
→ *Gatilhos de refatoração, com limite declarado no projeto:* número de linhas, quantidade de parâmetros, profundidade de aninhamento, número de caminhos lógicos (`ES-27`).
→ Sem número declarado não há gatilho de parada — e uma IA não se autolimita.

**CD-05 · ACEITE ·** **Aninhamento raso.** Tratar o caso excepcional primeiro e sair cedo, em vez de encaixar o caminho feliz dentro de várias condições. Profundidade é o melhor indicador isolado de trecho difícil de manter.

**CD-06 · BLOQUEIA ·** **Sem valor mágico.** Número, texto, prazo, limite e código de estado que carregam significado viram constante nomeada, próxima de onde pertencem. `if (status === 3)` não é legível nem pesquisável.

## 7.3 Erro

*A maior lacuna de comportamento de uma IA gerando código, e o defeito mais caro de diagnosticar depois.*

**CD-07 · BLOQUEIA ·** **Distinguir erro esperado de defeito.** São coisas diferentes e recebem tratamento diferente:

| | Erro esperado | Defeito |
| :-- | :-- | :-- |
| O que é | Parte do domínio: saldo insuficiente, cadastro duplicado, prazo vencido, arquivo inválido | Condição que não deveria acontecer: referência nula, estado impossível, invariante violada |
| Quem trata | O fluxo, explicitamente — é caminho alternativo (`AN-14`) | Ninguém "trata": registra, alerta e falha |
| Como aparece | Resultado previsto da operação | Interrupção com contexto para diagnóstico |

→ Tratar os dois com o mesmo mecanismo genérico é como um sistema passa a esconder defeito atrás de mensagem amigável.

**CD-08 · BLOQUEIA ·** **Nunca engolir erro.** Captura vazia, captura que só registra e segue como se nada tivesse acontecido, e captura genérica que abrange tudo são proibidas.
→ Ao relançar, **preservar a causa original**: erro que perde a origem transforma diagnóstico de minutos em investigação de horas.
→ Capturar apenas o que se sabe tratar. O que não se sabe tratar sobe.

**CD-09 · BLOQUEIA ·** **Falhar cedo e alto.** Validar na fronteira de entrada (`SEC-23`) e interromper no ponto em que a condição inválida é detectada — não seguir com valor provisório, nulo ou padrão silencioso, que faz o defeito aparecer longe da causa.

**CD-10 · BLOQUEIA ·** **Erro carrega contexto.** O registro diz o que se tentava fazer, com quais identificadores e em que ponto — nunca só "erro ao processar". Sem dado sensível (`SEC-35`). A mensagem exibida ao usuário é outra coisa, e obedece a `IX-23`.

## 7.4 Efeito, estado e resto

**CD-11 · ACEITE ·** **Efeito colateral declarado no nome.** Função que promete calcular não grava, não envia, não altera o que recebeu. Efeito escondido é a causa de defeito que só aparece quando alguém reutiliza a função em outro contexto.

**CD-12 · ACEITE ·** **Estado compartilhado mutável é minimizado** e, onde existir, tem dono único e ponto único de alteração. Estado global alterável de qualquer lugar torna o comportamento dependente da ordem de execução — e o teste, não confiável.

**CD-13 · ACEITE ·** **Comentário explica o porquê, não o quê.** Justifica decisão não óbvia, alerta para armadilha, registra o motivo de um contorno. O que o código faz, o código diz — e comentário redundante envelhece e passa a mentir.
→ Comentário que descreve a linha seguinte é ruído. Se o código precisa de comentário para ser entendido, o problema é o código.

**CD-14 · BLOQUEIA ·** **Código morto não fica.** Trecho comentado "por segurança", função não referenciada, variável não usada, ramo inalcançável — tudo sai. O histórico de versão existe exatamente para isso (`ES-18`).

**CD-15 · ACEITE ·** **Não abstrair antes da terceira ocorrência.** Repetição é mais barata que abstração errada: extrair cedo demais acopla partes que só pareciam iguais, e desfazer isso é mais caro que a duplicação que se queria evitar. Duplicação de *conhecimento* (a mesma regra em dois lugares) é defeito desde a segunda vez; duplicação de *forma* pode esperar.

---
