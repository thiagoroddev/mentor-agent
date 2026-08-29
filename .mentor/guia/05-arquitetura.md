---
area: "Arquitetura e design"
prefixo: "ES"
portao: "A"
---

> §5 de 13. Índice: [`00-indice.md`](./00-indice.md). Consultado por lacuna do `contexto.json`, nunca do começo ao fim.

# §5 · Arquitetura e design

## 5.1 Projeto e decisão

**ES-09 · BLOQUEIA ·** Separar o projeto **conceitual** (*o quê*, na linguagem do negócio — o que o usuário aprova) do **técnico** (*como*, na linguagem do desenvolvedor).
→ Nunca pedir aprovação do usuário sobre o projeto técnico: ele não tem como avaliar, e o "sim" dele não vale como aceite.

**ES-10 · BLOQUEIA ·** A arquitetura é escolhida entre padrões conhecidos, não emerge do acaso:

| Padrão | Quando serve | Custo |
| :-- | :-- | :-- |
| Em camadas | Regra isolada da interface e do armazenamento | Indireção |
| Cliente-servidor | Múltiplos consumidores, rede no meio | Latência, contratos |
| Centrada em dados | O dado é o centro | Acoplamento ao esquema |
| Duto e filtro | Transformação sequencial | Difícil interação |
| Separação apresentação/controle/modelo | Interface interativa | Convenção rígida |
| Orientada a componentes | Domínio com comportamento rico | Exige disciplina de modelagem |

**ES-11 · BLOQUEIA ·** Toda decisão de difícil reversão vira **registro de decisão**: contexto, alternativas, escolha, consequências. Sem isso, o mantenedor futuro reverte a decisão sem saber o que quebra.

**ES-12 · ACEITE ·** Nomes espelham o vocabulário do negócio. Termo ambíguo é resolvido com o usuário, não inventado.

**ES-13 · ACEITE ·** Fronteiras explícitas: quando o mesmo termo significa coisas diferentes em partes diferentes, separar os contextos.

**ES-14 · BLOQUEIA ·** Design não testável é design rejeitado. Se para testar é preciso subir o sistema inteiro, a regra de negócio está no lugar errado.

## 5.2 Forma do sistema

**ES-39 · BLOQUEIA ·** **Um bloco só, bem modularizado, é o padrão.** Separar em serviços implantáveis à parte exige atributo de qualidade que justifique, com custo declarado: rede, consistência distribuída, observabilidade própria, operação mais cara.

**ES-40 · BLOQUEIA ·** O estilo deriva dos atributos de qualidade priorizados, e registra **o que sacrifica**. Decisão sem sacrifício declarado é decisão não compreendida.

**ES-41 · BLOQUEIA ·** Camada só conversa com a imediatamente abaixo, por interface estável. Atalho — a interface falando direto com o armazenamento — destrói o ganho que motivou as camadas.

**ES-42 · ACEITE ·** Desacoplar por fila o que não precisa de resposta imediata: a indisponibilidade de quem consome vira acúmulo, não queda de quem produz.
→ *Contrapartida:* traz entrega repetida e fora de ordem — exige idempotência e interface que comunique processamento pendente.

**ES-43 · ACEITE (N3) ·** Descrever a arquitetura em visões separadas — o que faz, como o código se organiza, como as partes se comunicam, onde roda — e validar cada uma contra os casos de uso.

**ES-44 · BLOQUEIA ·** O documento de arquitetura muda na mesma alteração que muda a estrutura. Documento que descreve o sistema como ele **foi** engana com autoridade.

**ES-45 · ACEITE ·** Reutilizar antes de reescrever, com duas ressalvas: a confiabilidade herdada vale só **dentro do escopo em que aquele componente foi testado**, e todo reúso carrega condição de licença.

## 5.3 Design interno

*Valem para qualquer paradigma que organize o sistema em módulos com fronteira.*

**ES-58 · BLOQUEIA ·** **Usar o vínculo mais fraco que resolve.** Força crescente = mudança mais propagada:

```
conhece de passagem < guarda referência < contém, mas o outro vive sem ele
  < contém, e o outro não existe sem ele < cumpre um contrato < herda
```
→ Subir na escala exige justificativa. Herança é o vínculo mais forte que existe — muda a mãe, muda toda a descendência.

**ES-59 · BLOQUEIA ·** **Encapsular o que varia.** Isolar atrás de fronteira própria o que muda com frequência — regra de cálculo, formato de saída, política de preço, integração externa. O que varia junto fica junto; o que varia por motivos diferentes se separa.

**ES-60 · BLOQUEIA ·** Depender do contrato, não da implementação. É o que permite trocar implementação, simular a dependência no teste e substituir fornecedor sem reescrever quem consome.

**ES-61 · ACEITE ·** Compor antes de herdar. Herança amarra a estrutura e multiplica subclasses: três variações em dois eixos viram seis classes, e a próxima vira doze.

**ES-62 · BLOQUEIA ·** Cinco princípios, cada um com teste prático:

| Princípio | Teste |
| :-- | :-- |
| Um motivo para mudar | Consegue enunciar a responsabilidade em uma frase, sem "e"? |
| Estender sem modificar | Para adicionar um caso novo, altera código que já funciona? |
| Substituição válida | Onde o tipo geral funciona, o específico funciona igual, sem verificar qual é? |
| Contrato pequeno | Quem implementa cumpre partes que não usa? |
| Dependência invertida | O que decide depende do concreto, ou o concreto vem de fora? |

→ São critérios de revisão, não dogma. Aplicá-los a tudo é a sobre-engenharia com melhor reputação que existe.

**ES-63 · BLOQUEIA ·** Estado interno não é exposto. Acesso e alteração passam por caminho controlado, onde a validação vive. Estado público é convite a valor impossível, e o defeito aparece longe de quem o causou.

**ES-64 · BLOQUEIA ·** **Contrato publicado só cresce de forma compatível.** Adicionar exigência quebra de uma vez todos que o cumpriam. Resolve-se como qualquer mudança estrutural: adicionar antes de exigir, migrar, só então remover.

**ES-65 · ACEITE ·** **Padrão de projeto é vocabulário, não meta.** Entra quando o problema existe; aplicado sem o problema, é complexidade com nome bonito.

| Família | Sinal de que você precisa |
| :-- | :-- |
| Criação | A criação tem regra, variação ou custo que polui quem usa |
| Estrutura | Precisa adaptar, embrulhar, agrupar ou representar algo caro |
| Comportamento | O fluxo varia, se encadeia, avisa outros ou muda com o estado |

→ Ao usar, nomeie: "isto é uma estratégia" diz mais que qualquer comentário — desde que seja mesmo.

## 5.4 Custo computacional

**ES-46 · BLOQUEIA ·** Declarar como o custo cresce em todo trecho que percorre coleção sem tamanho fixo, **antes** de escrever. Blocos em sequência somam, aninhados multiplicam, laço com limite constante não conta.

**ES-47 · BLOQUEIA ·** Escolher a estrutura pelo padrão de acesso dominante — posição, inserção e remoção, busca por chave, ordem, percurso entre vizinhos — e registrar qual operação foi priorizada.

**ES-48 · BLOQUEIA ·** **Todo desempenho típico tem uma condição que o sustenta — nomeie-a e trate o caso em que ela deixa de valer.** Busca eficiente que exige ordenação; árvore que degenera quando os dados entram já ordenados; dispersão que colapsa com colisões; ordenação rápida com escolha ruim de referência.
→ *O pior caso não é aleatório: tem gatilho conhecido, e em produção esse gatilho costuma ser o padrão real dos dados.*

**ES-49 · BLOQUEIA ·** Não executar em memória, sobre coleção que cresce, operação de custo mais que proporcional. Empurrar para a camada com índice ou limitar a entrada.

---
