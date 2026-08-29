---
carrega_quando: modo Strict, ou antes de decisão arquitetural
---

# Processo · Análise de impacto

Roda **antes** de executar, e existe para que a decisão apareça enquanto ainda é barata. Corrigir
desenho custa ordens de grandeza menos que corrigir implementação pronta.

## Quando é obrigatória

Decisão arquitetural · mudança que atravessa módulos · troca de tecnologia ou de dependência
estrutural · alteração em arquivo crítico · mudança de estrutura de dados.

Fora disso, uma mini-análise de cinco linhas dentro do plano basta.

## Quatro dimensões

| Dimensão | Pergunta |
|---|---|
| **Alcance** | que arquivos, módulos e testes mudam de comportamento |
| **Reversibilidade** | dá para voltar? com que custo? o que fica irreversível |
| **Decisões em aberto** | o que ainda não foi decidido e trava a execução |
| **Riscos não mitigáveis** | o que vai continuar errado depois de pronto |

## Alcance: como se descobre

Pelo código, não por memória. Onde o tipo é usado, quem chama a função, quem importa o arquivo,
quais testes tocam o módulo. Alcance estimado de cabeça erra sempre para menos, e é o erro que
transforma tarefa M em tarefa XG no meio da execução.

## Decisões em aberto

**A IA nunca fecha uma decisão em aberto sozinha.** Ela lista as opções com prós e contras,
recomenda uma com o motivo, e espera. Decisão arquitetural tomada em silêncio é a que ninguém
consegue reverter depois, porque ninguém soube que foi tomada.

Decisão fechada vira ADR, teto 1.800 caracteres: contexto e restrições · alternativas com prós e
contras · decisão · consequências, incluindo o que fica mais difícil e o que fica irreversível.

## Riscos não mitigáveis

O que não vai ser resolvido nesta tarefa vira **registro de dívida técnica**, com tipo, motivo,
custo futuro estimado, gatilho de pagamento e dono. Sem gatilho e sem dono, dívida técnica é só uma
lista de lamentos.

⚠️ **Análise que só encontra confirmação do plano não foi análise.** Se nada apareceu, diga o que
foi procurado e onde, para que a ausência seja verificável.
