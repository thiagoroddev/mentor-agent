---
area: "Aprendizado de máquina"
prefixo: "AM"
portao: "—"
---

> §12 de 13. Índice: [`00-indice.md`](./00-indice.md). Consultado por lacuna do `contexto.json`, nunca do começo ao fim.

# §12 · Aprendizado de máquina

> **Condicional:** só se aplica quando o produto embute um modelo que aprende de dados. Se não embute, ignore — nada aqui vale por analogia.

*Um modelo não é código que se lê para saber o que faz. É hipótese estatística com validade limitada — **as garantias vêm de como ele é avaliado, não de como é escrito**.*

**AM-01 · BLOQUEIA ·** **Aprendizado de máquina resolve o problema cuja regra ninguém consegue escrever.** Se a regra é conhecida e enunciável, escrevê-la é mais barato, testável, explicável e não degrada sozinha. Propor a regra explícita primeiro.

**AM-02 · BLOQUEIA ·** Declarar o tipo de problema antes da técnica: prever rótulo ou valor a partir de exemplos rotulados; encontrar agrupamentos sem rótulo; aprender por tentativa e retorno.

**AM-03 · BLOQUEIA ·** Definir, antes de treinar, o que seria bom o bastante — em número, comparado a uma alternativa simples (a regra manual atual, a resposta mais frequente, o acaso). Modelo sem linha de base é modelo que ninguém sabe se ajudou.

**AM-04 · BLOQUEIA ·** **O dado determina o resultado:** de onde vem, quem está representado, quem não está, o que falta, o que já vem enviesado da coleta. Modelo aprende o padrão que existe nos dados, inclusive quando é um erro histórico.

**AM-05 · BLOQUEIA ·** Medir a distribuição das classes e do público, e tratar desequilíbrio como **risco de dano**. Um conjunto com 90% de um grupo produz modelo que acerta a maioria e erra a minoria — e a média esconde isso.

**AM-06 · BLOQUEIA ·** Separar treino e avaliação sem sobreposição, conforme o uso real. Divisão aleatória não serve com dependência temporal nem quando a amostra não cobre a população de uso.

**AM-07 · BLOQUEIA ·** **Nunca avaliar com dados que o modelo usou para aprender.** É avaliar com as respostas à mão; o número não é evidência de nada.

**AM-08 · BLOQUEIA ·** **Acurácia isolada não é resultado.** Com 90% de uma classe, responder sempre essa classe acerta 90% e é inútil. Relatar desempenho **por classe**, quais classes o modelo troca entre si, e desempenho **por subgrupo** quando há pessoas.

**AM-09 · BLOQUEIA ·** Decidir antes qual erro custa mais — apontar o que não era, ou deixar passar o que era — e registrar com justificativa. Reduzir um aumenta o outro: é decisão de negócio.

**AM-10 · BLOQUEIA ·** **Quando a decisão afeta uma pessoa e precisa ser justificada, o modelo explicável vence o mais preciso.** Precisão que não se justifica não serve para negar crédito, recusar cadastro ou suspender conta.

**AM-11 · BLOQUEIA ·** **Modelo em produção tem validade que expira** — o ambiente muda, e o próprio produto o muda. Definir antes de implantar: o que é monitorado, com que frequência se reavalia, qual queda dispara retreinamento ou desligamento.

**AM-12 · BLOQUEIA ·** Modelo treinado é artefato versionado, guardado com o que o reproduz: dados (ou sua identificação exata), código gerador, versões, métricas, data.

**AM-13 · BLOQUEIA ·** **Modelo é código executável — não carregar de origem não confiável.** Formatos comuns de serialização executam código ao abrir.

---
