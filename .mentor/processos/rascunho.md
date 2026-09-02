---
carrega_quando: ideia nova, planejamento inicial, ou anotar melhoria
---

# Processo · Rascunho e anotação

## Toda ideia nova começa em rascunho

`docs-mentor/rascunhos/`. **Rascunho não é tarefa**: não tem gate, não tem critério de aceite, não entra na
fila e não conta no ciclo. É onde a ideia pode estar errada sem custar nada.

IA e desenvolvedor têm **liberdade total** nesta pasta: nenhum documento aqui precisa de formato rígido.
Pode-se organizar livremente em arquivos ou subpastas por tema (ex: `comercial/`, `pesquisas/`, `prototipos/`, `analises/`).
Se uma discussão de ideias ou levantamento comercial acontecer no chat, o mentor deve lembrar ativamente:
*"Vou registrar essa análise em `docs-mentor/rascunhos/...` para mantermos o histórico preservado."*

Projeto novo tem muito rascunho, e isso é o estado saudável. Requisito que nasce direto como tarefa
é requisito que ninguém pensou.

**Um rascunho sai daqui de quatro jeitos, e só quatro:**

| Vira | Quando |
| :-- | :-- |
| requisito | a ideia é o que o produto faz |
| ADR | a ideia é uma decisão cara de reverter |
| tarefa | a ideia é trabalho, e o que ela precisava está resolvido |
| **descartado** | com uma linha dizendo por quê, e o arquivo fica |

⚠️ **Rascunho parado é pauta, não patrimônio.** O `doctor` conta os que passaram de 60 dias sem
destino. A resposta certa costuma ser descartar com uma linha.

## Fase inicial: o que rascunho cobre antes de existir requisito

Quando `contexto.estado.fase` é `ideia` ou `descoberta`, o rascunho é o lugar de:

- **fluxo do processo atual** (como funciona hoje, antes de propor o que muda)
- **atores e papéis**, e quem faz o quê
- **diagramas**: fluxo, estados, entidades e relacionamentos, telas e navegação
- **desenho de tela** antes de implementar: corrigir um desenho é ordens de grandeza mais barato que
  corrigir tela pronta (guia QS-38)

O agente **propõe isso sem esperar pedido**: fase inicial sem nenhum rascunho é sinal de que se
começou a construir antes de entender.

## Anotar melhoria: onde ela vai não é decisão de memória

Você vai ver algo que precisa mudar no meio do trabalho. **Não decida de cabeça onde aplicar.**

```
mentor anotar --sobre pacote  "texto"      -> docs-mentor/melhorias-do-pacote.md
mentor anotar --sobre projeto "texto"      -> docs-mentor/rascunhos/<data>-<slug>.md
```

A decisão entre os dois tem regra, e ela é curta:

| O que aconteceu | `--sobre` |
| :-- | :-- |
| A regra atrapalhou · faltou um lembrete · um comando recusou o que não devia | `pacote` |
| Preciso de algo **só deste projeto**: uma convenção, um gate a mais, um valor diferente | `projeto` |
| Estou bloqueado agora e o pacote está errado | `pacote`, **e edite `.mentor/` para destravar** |

O terceiro caso é legítimo. O que não pode é editar e esquecer: o `verificar` compara o `.mentor/`
instalado com as assinaturas da versão e nomeia o que divergiu.

⚠️ **Anotação sobre o pacote não vira tarefa deste projeto.** Ela vai para
`docs-mentor/melhorias-do-pacote.md`, entra no relatório de campo, e o trabalho acontece no repositório do
pacote. Sem essa separação, todo projeto vira aos poucos um projeto sobre o pacote.

**Não interrompa o projeto por incômodo.** Só pare se o pacote estiver bloqueando de verdade: cada
volta ao pacote custa uma sessão, e juntar dez anotações numa volta custa a mesma sessão.
