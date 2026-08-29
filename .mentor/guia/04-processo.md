---
area: "Processo, planejamento e fluxo"
prefixo: "ES"
portao: "A"
---

> §4 de 13. Índice: [`00-indice.md`](./00-indice.md). Consultado por lacuna do `contexto.json`, nunca do começo ao fim.

# §4 · Processo, planejamento e fluxo

*O trabalho não termina no deploy. Software não é entregue, é evoluído — e a qualidade decai sozinha se ninguém agir.*

## 4.1 Ciclo de vida

**ES-01 · BLOQUEIA ·** Quatro atividades, nenhuma opcional — varia o peso:

| Atividade | Erro típico da IA |
| :-- | :-- |
| Especificação | Pular direto para código |
| Desenvolvimento | Tratar como a única atividade |
| Validação | Confundir com "os testes passaram" |
| **Evolução** | Ignorar por completo |

**ES-02 · BLOQUEIA ·** Antes de declarar entregue, existe plano de evolução: quem mantém, como se atualiza dependência, como se recebe reporte de defeito, com que frequência se revisa.

## 4.2 Portão A — escolha do processo

**ES-03 · BLOQUEIA ·** O agente **escolhe e justifica** o modelo de processo. Nunca assume "ágil" por padrão:

| Situação | Modelo | Consequência |
| :-- | :-- | :-- |
| Requisitos estáveis, obrigação contratual | Sequencial / verificação por fase | Especificação revisada antes de codificar |
| Requisito instável, usuário disponível | Incremental e iterativo | Entregas curtas, backlog vivo |
| Risco técnico alto | Orientado a risco | Miniprojeto ataca o risco **antes** do compromisso |
| Requisito que o usuário não verbaliza | Prototipação | Protótipo primeiro, código depois |
| Testabilidade é central | Orientado a teste | Requisito e design só aceitos se testáveis |

**ES-04 · BLOQUEIA ·** Declarar a estratégia de entrega: **incremental** (fatias completas, uma por vez) ou **iterativo** (o todo rudimentar, refinado a cada volta). Misturar sem declarar produz o "quase pronto" permanente.

**ES-05 · BLOQUEIA ·** **Todo protótipo é rotulado ao nascer:** *descartável* (existe para aprender; é jogado fora) ou *evolutivo* (nasce como base e já obedece aos padrões).
→ Protótipo descartável promovido a produção sem reescrita é a origem mais comum de dívida impagável.

## 4.3 Risco

**ES-06 · BLOQUEIA (N2+) ·** Antes de comprometer arquitetura, listar riscos e atacar os maiores enquanto corrigir é barato. *Pergunte:* "Qual a parte que, se não funcionar, inviabiliza tudo?"

**ES-07 · ACEITE ·** Risco técnico se resolve por experimento delimitado — prazo fixo, objetivo único, código descartável — não por debate nem por fé na documentação da ferramenta.

**ES-08 · ACEITE ·** Registro de riscos vivo, revisado a cada marco.

## 4.4 Padrões e configuração

**QS-08 · BLOQUEIA ·** Padrões de **produto** (estilo, formatação, nomenclatura, estrutura de pastas) e de **processo** (convenção de commit, política de ramo, o que barra o merge) definidos e **automatizados** antes da primeira funcionalidade. Padrão que depende de disciplina humana não é padrão.

**QS-09 · BLOQUEIA ·** Controle de versão desde o commit zero, em qualquer nível.

**QS-10 · BLOQUEIA ·** Definição de pronto-para-começar e de pronto escritas e visíveis. Nada começa sem a primeira, nada é declarado pronto sem a segunda.

**QS-11 · ACEITE ·** Processos de apoio cobertos **ou explicitamente dispensados**: documentação, configuração, garantia da qualidade, verificação, validação, revisão conjunta, auditoria, resolução de problemas.

**ES-18 · BLOQUEIA ·** Quatro frentes desde o dia um: **controle de versão** de tudo que é fonte; **construção** por comando único e reproduzível; **gerência de mudança** com origem rastreável; **gerência de release** com versão marcada e registro de mudanças.

**ES-19 · BLOQUEIA ·** Trabalho isolado em ramo; integração na linha principal só após revisão e verificação verde. Ramo de longa duração é dívida.

**ES-20 · ACEITE ·** Mensagem de commit padronizada, referenciando o identificador do requisito ou defeito. O histórico é o único documento que nunca fica desatualizado.

**ES-21 · ACEITE ·** Versionamento explícito: o número comunica se a mudança quebra compatibilidade. Toda release tem marcação e registro de mudanças.

**ES-22 · BLOQUEIA ·** Ambiente reproduzível: qualquer pessoa sobe o projeto do zero seguindo o documento. "Na minha máquina funciona" é defeito de configuração.

**ES-23 · BLOQUEIA ·** Ambientes separados; nunca usar dado real de produção fora de produção sem anonimização.

## 4.5 Fluxo e desperdício

**ES-50 · ACEITE ·** Reconhecer e atacar as formas de desperdício:

| Desperdício | Como aparece |
| :-- | :-- |
| **Trabalho parado pela metade** | Ramo aberto há semanas, funcionalidade pronta e não publicada |
| Funcionalidade excedente | Construído porque "pode ser útil"; ninguém usa e todos mantêm |
| Retrabalho | Refazer o que foi feito por engano de entendimento |
| Espera | Aguardando revisão, aprovação, ambiente, decisão |
| Repasse entre pessoas | Cada troca de mãos perde contexto e adiciona fila |
| Defeito | Consome duas vezes: para criar e para corrigir |

→ *Trabalho parado pela metade é o desperdício mais invisível, porque parece progresso.*

**ES-51 · ACEITE ·** Decidir o mais tarde possível — mas não depois do necessário. Vale sobretudo para o que é caro reverter; o que é barato reverter se decide rápido.

**ES-54 · ACEITE ·** Regras de passagem explícitas: o que precisa estar pronto para o item avançar de etapa. Sem isso, "concluído" significa coisas diferentes para cada pessoa.

**ES-52 · BLOQUEIA ·** **Construir o que é necessário agora.** O sistema cresce por incrementos pequenos, cada um testado e integrado; a arquitetura se expande com a necessidade, em vez de ser decidida por inteiro no início. Estrutura criada para um requisito que talvez apareça é custo certo por benefício incerto.
→ *Não confunda com improvisar:* o incremento de hoje é feito bem, com o teste e a estrutura que ele exige — só não carrega o peso do que ainda não existe.

**ES-53 · ACEITE ·** Ninguém é dono de uma parte do código. O que torna isso seguro é o resto do guia: padrão automatizado, teste que protege, revisão antes do merge.

## 4.6 Planejamento

**ES-55 · ACEITE ·** Planejar em camadas, cada uma com seu horizonte: objetivo do produto, versões previstas, ciclo atual, o dia. O detalhe cresce conforme o horizonte encurta.

**ES-56 · BLOQUEIA ·** **Estimativa é intervalo, não número.** Número único apresentado a quem decide vira compromisso, e o compromisso vira pressão sobre a única coisa que ainda cede: a qualidade.

**ES-57 · BLOQUEIA ·** Processo adaptativo não dispensa rastreabilidade nem previsibilidade. As duas fraquezas conhecidas de ciclos curtos — documentação insuficiente e prazo imprevisível — são compensadas, não ignoradas.

## 4.7 Entrega e evolução

**ES-29 · BLOQUEIA ·** Demonstração é com **software funcionando**. Slide, imagem, protótipo e "está quase" não são entrega.

**ES-30 · BLOQUEIA ·** Nenhuma release sai sem as quatro respostas positivas:

| Critério | Risco se ignorado |
| :-- | :-- |
| O usuário viu funcionando e aprovou? | Entregar o que ninguém pediu |
| Houve comportamento inesperado no aceite? | Defeito crítico em produção |
| A versão nova quebrou o que funcionava? | Perda silenciosa de função |
| O que está escrito corresponde ao sistema? | Suporte sobrecarregado |

**ES-31 · ACEITE ·** Documentação viva: o que se mantém junto do código (contratos gerados, tipos, testes descritivos, exemplos executáveis) vale mais que manual paralelo. Manter à mão apenas: instalação, decisões, operação e reversão.

**ES-32 · BLOQUEIA (N2+) ·** Planejar os três tipos de manutenção — **corretiva**, **adaptativa** (ambiente e dependências), **evolutiva** — desde o início. Consomem a maior parte do custo total.

**ES-33 · ACEITE ·** Atualização de dependências é rotina agendada, não emergência. Dependência congelada por anos vira migração impossível.

**ES-34 · ACEITE ·** A complexidade cresce e a qualidade cai por inércia; só refatoração deliberada reverte. Reservar capacidade e **medir** a tendência.

**ES-35 · ACEITE ·** Preservar a familiaridade: sistema que ninguém entende para de evoluir. Onboarding, registros de decisão e código legível são requisitos de sobrevivência.

**ES-36 · RECOMENDA ·** Crescimento contínuo é esperado; ausência de mudança é sinal de obsolescência, não de estabilidade.

**ES-38 · ACEITE ·** Projeto tem fim declarado: documentação consolidada, decisões registradas, lições escritas, manutenção transferida e critério de sucesso **verificado contra a realidade**.

---
