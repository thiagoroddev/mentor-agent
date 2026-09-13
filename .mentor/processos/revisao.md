---
carrega_quando: revisar código, ou o humano pedir revisão geral
---

# Processo · Revisão

Revisão julga **o código**, nunca quem escreveu. E revisão que só aprova não é revisão: é assinatura.

## Quando é obrigatória

Toda tarefa Standard e Strict, antes do portão 2. Light não tem revisão formal.

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

**Contexto compartilhado propaga viés.** Quem decidiu usar um `useEffect` para derivar estado tem
exatamente o mesmo modelo mental na hora de revisar aquele `useEffect`. Por isso a auditoria roda em
**sessão nova**, por um agente com um único poder: **reprovar**.

**Cadência, não toda tarefa.** A cada N tarefas concluídas com diff auditável
(`contexto.auditoria.cadencia_em_tarefas`, 10 por padrão) o `finalizar` e o `doctor` avisam. Auditar
toda tarefa dobraria o custo de cada uma, e processo caro é processo abandonado. Com N = 1, vira
revisão por PR.

**A unidade é a tarefa.** Cada tarefa leva o próprio diff: os commits com o ID dela no título, ou,
antes do commit, os arquivos do `plano.muda` que mudaram desde o `commit_base`. Registro do mentor,
vista gerada, nota, pacote intacto e arquivo marcado `linguist-generated` no `.gitattributes` ficam
fora. Tarefa sem nada auditável, ou que só atualiza o pacote, entra no lote listada e não conta.

⚠️ **Tamanho não é cadência.** Até a 0.7.0 a cadência também contava caracteres de diff. Medido em
campo: 115 mil caracteres com 3 tarefas, 87% de fixture gerada e de registro do próprio mentor. Hoje o
tamanho só decide como o dossiê se divide: o `preparar` leva as tarefas que cabem no teto, e as outras
esperam o próximo.

```
mentor auditar preparar          monta o dossiê do lote
mentor auditar registrar AUD-001 valida e grava o veredito
mentor auditar resolver AUD-001-B01 --destino ... --ref "..."
```

**O `preparar` é o que fecha o escopo.** O dossiê traz o registro e o diff de cada tarefa e os
requisitos citados — **e nada mais**. Commit sem tarefa e trabalho não commitado de outra tarefa
aparecem como fato, só pelo nome. Não é promessa de comportamento: é o único material que a sessão
nova recebe. As cinco regras do auditor e os três níveis vêm escritos dentro do próprio dossiê, para
não existirem em duas versões que divergem.

⚠️ **Por que o escopo é fechado.** A calibração *"auditoria que aprova tudo está quebrada"* empurra a
achar alguma coisa. Solta no repositório inteiro, ela vira máquina de gerar trabalho — foi assim que o
pacote anterior morreu. Presa ao diff, ela acha o que importa.

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
