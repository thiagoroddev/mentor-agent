---
area: "Qualidade e testes"
prefixo: "QS"
portao: "0"
---

> §10 de 13. Índice: [`00-indice.md`](./00-indice.md). Consultado por lacuna do `contexto.json`, nunca do começo ao fim.

# §10 · Qualidade e testes

*Qualidade não é fase final: é propriedade do processo inteiro. Corrigir na fase final custa ordens de grandeza mais que prevenir no início.*

## 10.1 Requisitos e verificação

**QS-01 · BLOQUEIA ·** Nenhum código antes do problema estar escrito e aceito.

**QS-02 · BLOQUEIA ·** Requisito só entra no backlog se passar nos doze critérios: correto, completo, claro, não ambíguo, conciso, consistente, viável, necessário, independente de implementação, verificável, rastreável, único.
→ Reescrever o pedido do usuário nesse formato e devolver para confirmação. **Nunca implementar a partir da frase solta.**

**QS-03 · BLOQUEIA ·** Todo requisito funcional tem critério de aceite em **Dado / Quando / Então** antes de implementar, incluindo o caminho infeliz.

**QS-04 · BLOQUEIA ·** **Requisitos implícitos são responsabilidade do agente**, não do usuário. Rodar o checklist de §10.3 e apresentar o que o produto precisa mas ninguém pediu.

**QS-05 · ACEITE ·** Rastreabilidade: cada requisito tem identificador; commits, PRs e testes o referenciam.

**QS-06 · BLOQUEIA ·** Mudança de escopo é registrada com impacto declarado.

**QS-13 · BLOQUEIA ·** Toda entrega passa por **verificação** ("construímos certo?" — conformidade com a especificação) e **validação** ("construímos a coisa certa?" — resolve o problema real). Não se substituem.

**QS-14 · ACEITE ·** Validação exige contato com usuário real. "Todos os testes passaram" **não** é validação.

**QS-15 · BLOQUEIA ·** Revisão antes do merge. Sem revisor disponível: checklist de auto-revisão + análise estática + intervalo antes do merge.

**QS-16 · ACEITE ·** Artefatos não-código também são revisados: requisitos, modelo de dados, arquitetura, contratos, telas.

## 10.2 Estratégia de testes

**QS-17 · BLOQUEIA ·** **Distribuição em pirâmide:** base larga de unitários, meio de integração, topo fino de ponta a ponta. Tudo testado pela interface é frágil, lento e caro.

**QS-18 · ACEITE ·** Cobrir os quatro quadrantes; quadrante ausente vira risco declarado:

| Quadrante | Pergunta |
| :-- | :-- |
| Técnico / apoio | O código está correto por dentro? |
| Negócio / apoio | Faz o que foi combinado? |
| Negócio / crítica | É bom de usar? |
| Técnico / crítica | Aguenta, é seguro, é acessível? |

**QS-19 · BLOQUEIA ·** Automatizar regressão, repetitivo, caminho crítico e cálculo. Reservar o humano para exploratório, usabilidade e casos novos.

**QS-20 · BLOQUEIA ·** **Todo defeito corrigido gera antes um teste que falha**, provando o defeito.

**QS-21 · ACEITE ·** Cobertura é indicador, não meta. Limiar mínimo em módulos de regra de negócio, com falha do pipeline abaixo dele. **Teste sem asserção significativa é fraude de métrica.**

**QS-22 · BLOQUEIA ·** Suíte roda a cada envio; build vermelho barra o merge. Teste instável vai para quarentena **com prazo e dono**, nunca é desativado em silêncio.

**QS-23 · ACEITE ·** Dependências externas simuladas, com ao menos um teste de contrato contra o serviço real por integração.

**ES-24 · BLOQUEIA ·** Caso de teste = **entrada + resultado esperado**. Entrada sem resultado esperado não prova nada.

**ES-25 · BLOQUEIA ·** Casos derivados por técnica:

| Técnica | Como gera casos |
| :-- | :-- |
| Classes de equivalência | Um representante válido e um de cada grupo inválido |
| **Valor-limite** | Nas bordas e um passo além. **É onde mora a maior parte dos defeitos** |
| Palpite de erro | Vazio, nulo, negativo, gigante, caractere especial, tipo errado, duplicado, concorrente |
| Cobertura de decisões | Cada condição testada como verdadeira e como falsa |

**ES-26 · BLOQUEIA ·** Todo campo com faixa, tamanho ou formato recebe teste de valor-limite dos dois lados. Erro de um a mais é o defeito mais comum da profissão.

**ES-27 · ACEITE ·** Monitorar complexidade: caminhos demais tornam o teste inviável. Referência: até ~10 aceitável; acima, justificar; muito acima, refatorar antes de continuar.

**ES-28 · RECOMENDA (N3) ·** Avaliar a suíte injetando defeitos artificiais e verificando se algum teste falha. Teste que não quebra com o código quebrado é decorativo — e explica cobertura alta com produção instável.

## 10.3 Como o teste é escrito

**QS-46 · BLOQUEIA ·** Três blocos visíveis: preparar o cenário, executar a ação, verificar o resultado.

**QS-47 · BLOQUEIA ·** Quatro qualidades, todas obrigatórias:

| Qualidade | Falha típica |
| :-- | :-- |
| **Legível** | Variáveis sem nome; montagem de dez linhas sem separação |
| **Isolado** | Precisa de banco no ar e falha por motivo alheio |
| **Minucioso** | Só o caso feliz, com um valor bonito |
| **Explícito** | `teste1`, `deveFuncionar`; mensagem de falha ilegível |

→ **O nome descreve o comportamento esperado, não o método chamado.** Quem lê o relatório de falha precisa entender o que o sistema deixou de fazer sem abrir o código.

**QS-48 · ACEITE ·** Teste é documentação executável — a única que não fica desatualizada, porque quebra quando o código muda. Só se sustenta se `QS-46` e `QS-47` forem respeitados.

**QS-45 · ACEITE ·** **Teste de interface se ancora em papel e significado, não em posição ou aparência.** Teste preso à aparência quebra a cada mudança de estilo e vira o principal motivo de a suíte ser abandonada.

## 10.4 Atributos não-funcionais

**QS-24 · BLOQUEIA ·** Cada característica recebe **meta mensurável** ou aceite explícito de "não se aplica". É aqui que o agente cobre o que o leigo não sabe pedir:

| Característica | Pergunta em linguagem comum | Vira meta como |
| :-- | :-- | :-- |
| Adequação funcional | Faz tudo o que foi combinado, e certo? | Cenários de aceite aprovados |
| Desempenho | Quanto tempo o usuário tolera esperar? | Tempo de resposta, simultâneos |
| Compatibilidade | Precisa conversar com o quê? Rodar onde? | Versões, navegadores, contratos |
| Usabilidade | Alguém sem treinamento consegue usar? | Taxa de conclusão da tarefa |
| Confiabilidade | O que acontece se cair? Quanto tempo fora é tolerável? | Disponibilidade, tempo de recuperação |
| Segurança | Quem pode ver e fazer o quê? | Matriz de papéis e permissões |
| Manutenibilidade | Outra pessoa mexe nisso em 6 meses? | Modularidade, testabilidade, documentação |
| Portabilidade | Precisa mudar de servidor, banco ou nuvem? | Dependências isoláveis |

## 10.5 Planejamento e métricas de qualidade

**QS-07 · BLOQUEIA ·** Plano de qualidade mínimo antes da primeira funcionalidade.

**QS-12 · BLOQUEIA ·** Nível de rigor declarado no início e revisado a cada marco.

**QS-33 · ACEITE ·** Medir as três dimensões juntas — **velocidade, qualidade, satisfação**. Otimizar uma isolada degrada as outras.

**QS-34 · ACEITE ·** Conjunto mínimo: tempo de fila, tempo de execução, vazão, trabalho em progresso, defeitos escapados, cobertura em módulos críticos.

**QS-35 · BLOQUEIA ·** **Todo atalho é registrado no momento em que é tomado:** o que foi feito, por quê, qual o custo futuro, qual o gatilho para pagar.
→ *Dívida consciente é decisão de negócio legítima; dívida não registrada é defeito.* O agente que sugerir um atalho abre o registro junto com o código.

**QS-36 · RECOMENDA ·** Reservar 15–20% da capacidade de cada ciclo para pagar dívida.

**QS-37 · RECOMENDA ·** Limitar trabalho em progresso. Terminar antes de começar.

---
