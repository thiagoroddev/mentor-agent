---
carrega_quando: revisar código, ou o humano pedir revisão geral
---

# Processo · Revisão

Revisão julga **a mudança e seus critérios**, nunca quem escreveu. Um parecer sem achados é legítimo quando declara o escopo examinado.

## Quando é obrigatória

Somente tarefa criada após a ativação e cuja política contextual classifique a mudança como exigindo REV, antes do portão 2. Protótipo pessoal dispensa REV rotineira; segurança, autorização, migração e persistência com dado pessoal atual continuam sensíveis. O rótulo Light não altera a avaliação de risco. Tarefas anteriores continuam no legado, sem transição ou revisão retroativa.

Melhoria exclusiva do próprio Mentor, limitada a `.mentor/` e seus registros não normativos em `docs-mentor/`, não entra nessa exigência. O fluxo REV serve para avaliar mudanças do produto; aplicar o mesmo rito ao mecanismo de auditoria cria recursão de processo. Mudança mista com código ou requisito normativo do produto segue a regra normal.

## Dimensões

Corretude (faz o que o critério de aceite diz) · legibilidade (quem mantém daqui a seis meses
entende) · testes (existem, e no nível certo) · segurança e dado pessoal · desempenho com impacto de
usuário · aderência às convenções do projeto, não às preferências do modelo.

## Três níveis de achado

| Nível | Significa | Efeito |
|---|---|---|
| **Bloqueante** | está errado, ou vai quebrar | corrige antes de fechar |
| **Recomendação** | funciona, dá para ficar melhor | vira tarefa ou fica registrado |
| **Observação** | fica anotado, não pede ação | só o registro |

Achado sem nível é ruído: quem lê não sabe se precisa parar.

## Veredito

`APROVADO` · `APROVADO COM RESSALVAS` · `REPROVADO`.

⚠️ **Veredito de revisão não é rótulo de gate.** `APROVADO COM RESSALVAS` julga o código;
`APROVADO com ressalva` julga um comando (`processos/tarefa.md`). As grafias são quase iguais e as
duas existem porque as duas foram medidas em uso. Não troque uma pela outra.

## O auditor: quem escreve não aprova

**Contexto compartilhado propaga viés.** A revisão ocorre em sessão nova. O revisor recebe o dossiê curto, examina critérios, delta final, contratos e evidências indicadas; pode pedir contexto adicional por caminho e pergunta. A sessão é declarada em `sessao_revisora`, sem tratar essa declaração como prova técnica de independência.

```
mentor auditar preparar --tarefa TASK-...   captura a mudança candidata e gera REV-NNN
mentor auditar contexto REV-NNN --arquivo caminho --motivo "pergunta"
mentor auditar registrar REV-NNN           valida parecer, partes e conteúdo ainda atual
mentor auditar resolver REV-NNN-B01 --destino ... --ref "..."
```

O pacote inicial (índice e primeira parte) tem até 30 mil caracteres. Partes excedentes são nomeadas e examinadas sob demanda; aprovação exige que todas as partes necessárias estejam marcadas como lidas. O revisor informa `APROVADO`, `APROVADO COM RESSALVAS` ou `REPROVADO`, com limitações e achados concretos. `APROVADO COM RESSALVAS` mantém a cobertura parcial; mudança corrigida precisa de novo `REV` que referencia o anterior.

O parecer vale para conteúdo, critérios e contratos registrados. Alteração posterior relevante vence a cobertura; `task finalizar` e o pre-push verificam novamente quando REV é exigida. Os gates continuam prova separada, não são executados pelo revisor. `auditar preparar` sem flags só mostra os modos; `--lote-legado` permanece disponível apenas por escolha explícita. Não há checkpoint automático nem migração das tarefas legadas.

**E o auditor não abre tarefa.** O `registrar` recusa achado que já venha com destino. Achado
`bloqueia` sem destino conta como bloqueio no `doctor` até você decidir, no `resolver`, se vira tarefa,
dívida técnica, risco aceito ou descarte com motivo.

## Os limites da auto-revisão

A IA revisando o próprio código **não encontra o que não pensou em fazer**. Ela confere execução, não
concepção. Por isso a auto-revisão nunca substitui revisão humana em: decisão de produto, modelagem
de domínio, escolha de dependência, qualquer coisa que envolva dinheiro, dado pessoal ou
irreversibilidade.

Peça revisão humana explícita quando: o critério de aceite admite mais de uma leitura · a mudança
atravessa módulos que você não leu inteiros · duas tentativas falharam · você não consegue nomear o
que testaria para provar que está errado.

## Revisão geral do projeto

Não é modo de tarefa. **Só nasce quando o humano pede** revisão completa, e vive em
`docs-mentor/arquitetura/revisoes-gerais/REV-NNN.md`. A IA pode sugerir uma; não cria por iniciativa
própria.

Cada achado recebe ID (`REV-NNN-Axx`) e, se virar trabalho, é citado na origem da tarefa. Achado sem
ID não é rastreável e some no arquivo.
