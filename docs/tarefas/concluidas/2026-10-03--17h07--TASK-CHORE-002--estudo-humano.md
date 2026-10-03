# TASK-CHORE-002 · Validação proporcional para correções pequenas

## Pedido e problema

O mantenedor pediu corrigir em uma tarefa simples o excesso de validação observado na portabilidade da CHORE-039, e deixar tudo pronto no remoto para continuar em outro sistema. Um patch já validado no Eu Roteirizo foi seguido de 32 cenários e adaptação do harness, custo maior que o risco da mudança.

Problema canônico: seleção de testes orientada a risco e reutilização de evidência. A solução usa os processos e campos de plano existentes; não cria executor, dependência, habilidade ou schema.

## Plano técnico aprovado pelo pedido

- `.mentor/nucleo.md`: tornar visível no carregamento inicial a seleção local proporcional, com motivo verificável para ampliar a suíte, preservando gates obrigatórios e sua evidência verdadeira.
- `.mentor/processos/teste.md`: orientar reuso da prova existente, diferença de ambiente, menor verificação suficiente, gatilhos de ampliação e tratamento de falhas do harness sem ampliar silenciosamente o escopo.
- `.mentor/processos/tarefa.md`: apontar essa orientação ao planejar o meio de validação, sem novo formulário.
- `.mentor/skills/test-design/SKILL.md`: alinhar a habilidade existente para escolher escopo antes de aplicar TDD e registrar gates.
- `.mentor/manifesto.json`: regenerar pelo comando oficial após a mudança das instruções.
- `CHANGELOG.md`: registrar a orientação corrigida, pendente de release.
- `docs/rascunhos/planejamentos/2026-10-03--evolucao-do-planejamento-do-mentor/06-portabilidade-chore-039.md`: acrescentar a regra de validação decidida e o caminho de continuação, preservando o texto inicial.
- Registros administrativos: plano integral, critérios, desfecho e estado da tarefa pelos comandos existentes.

## Critérios de aceite

1. Correções pequenas e portabilidades já comprovadas partem de evidência existente e checagem focada dos riscos/diferenças de ambiente.
2. A suíte completa depende de exigência real do projeto/CI, risco identificado ou sinal novo de regressão. A justificativa fica nos campos existentes.
3. Teste focado não é declarado como gate de suíte aprovado; gates obrigatórios continuam regidos pelo contexto e executor existentes.
4. A habilidade e os processos não instruem repetir bateria ou fabricar testes/vermelho só para reproduzir algo já demonstrado.
5. Planejamento e tarefas concluídas ficam disponíveis no remoto para a próxima sessão.

## Validação proporcional

Mudança exclusivamente nas instruções, sem alteração do executor ou de código de produto. Conferir a coerência do diff, validar frontmatter da habilidade, regenerar manifesto, executar `node mentor.mjs verificar` e `git diff --check`. Não criar testes que apenas procuram frases; não repetir os 32 cenários para uma mudança de orientação. Os gates de produto ficam registrados como NÃO EXECUTADO com motivo, quando aplicável, sem inventar aprovação.

Pedida uma correção simples do processo, proponho alinhar núcleo, processos e habilidade que causariam decisões divergentes; a mudança é desse tamanho porque reutiliza os registros e mecanismos existentes, sem implementar as futuras fatias do planejamento maior.

Sem novas dependências. Risco: usar proporcionalidade como dispensa informal de gates obrigatórios; a ressalva é explícita nas três instruções. O estudo humano original da portabilidade permanece integral.

## Entrega e continuidade

O pedido de deixar tudo pronto no remoto autoriza finalizar, commitar e enviar esta correção e a portabilidade já preparada. Entregar em ramo próprio baseado na portabilidade, preservando commits separados. O planejamento maior permanece em `docs/rascunhos/planejamentos/2026-10-03--evolucao-do-planejamento-do-mentor/`: a próxima sessão deve começar pelas fatias/dependências descritas em `04-fatias-e-validacao.md`, planejando cada uma antes de executar.

## Desfecho e Validação Real

Núcleo, processo de testes, processo de tarefa e habilidade test-design passaram a instruir seleção de validação por risco. A evidência de origem e a equivalência do patch são o ponto de partida de portabilidades; a menor checagem suficiente cobre o que ainda falta provar. Suíte completa depende de obrigação explícita, risco compartilhado, contrato/dependência alterado ou sinal novo de regressão, com motivo nos campos de plano existentes.

Não foi alterado o executor de gates, seu schema, a política de bloqueio ou os comandos declarados. Teste focado continua distinto de gate completo. A ressalva sobre gates obrigatórios permanece explícita. O planejamento prévio recebeu complemento de proporcionalidade e continuação, preservando o plano inicial.

A verificação apropriada foi a inspeção de coerência do diff, comparação do frontmatter com a versão anterior (idêntico), regeneração oficial do manifesto e node mentor.mjs verificar: aprovado nas quatro famílias. git diff --check passou. Não foram criados testes para procurar frases e não foram repetidos os 32 cenários.

quick_validate.py não pôde executar: os Python locais disponíveis não incluem PyYAML. Não se instalou dependência para validar frontmatter que não mudou; a comparação integral desse trecho e o verificar do pacote deram a cobertura pertinente. O comando Python não é apresentado como aprovado. Gates tipos/testes registrados pelo CLI como NÃO EXECUTADO com os motivos, sem inferir aprovação.

Não houve testes manuais de produto nem comportamento de UI/persistência a validar. Nenhum novo achado das cinco classes do núcleo no escopo; o ponteiro legado observado na TASK-CHORE-001 já está registrado nessa tarefa.

O mantenedor autorizou finalizar, commitar e enviar ao remoto para continuidade em outro sistema. A entrega será feita nos ramos próprios, conservando os commits separados. O plano maior de ADRs, planejamento consistente e contratos JSON permanece para suas fatias futuras, detalhadas em 04-fatias-e-validacao.md. A versão segue 0.14.0, sem release nem reinstalação no Eu Roteirizo.
