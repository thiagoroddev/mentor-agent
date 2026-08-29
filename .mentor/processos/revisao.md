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
exatamente o mesmo modelo mental na hora de revisar aquele `useEffect`. Por isso a revisão roda em
**contexto novo**, por um agente com um único poder: **reprovar**.

**O escopo é fechado, e é ele que impede o ciclo infinito.** O auditor vê o **diff da tarefa**, o
registro dela e os requisitos citados. **Nunca o repositório.** A calibração abaixo empurra para
achar alguma coisa; solta no repositório inteiro, ela vira máquina de gerar trabalho.

**E o auditor não abre tarefa.** Escreve o veredito no registro; quem decide o que vira trabalho é o
humano, no portão 2.

### Cinco regras

1. **Não confie no que a tarefa afirma ter feito. Verifique no diff.**
2. Gate sem evidência é `NÃO EXECUTADO`, nunca `APROVADO`.
3. Critério de aceite sem teste ou verificação reproduzível é critério **não verificado**.
   *"Validado visualmente"* sem passos não conta.
4. Mudança em cálculo, persistência ou migração de esquema **exige revisão humana**.
5. **Calibração:** uma auditoria que aprova tudo está quebrada. Se não achou nada, declare **o que
   verificou e o que não conseguiu verificar** — a lista de não-verificado é a parte mais útil do
   relatório.

### Bloqueio é por classe de falsidade, não por tema

Erro de estilo em código de segurança não bloqueia; critério de aceite contradito num botão bloqueia.

| Nível | O que é |
| :-- | :-- |
| 🔴 **Bloqueia** | o diff contradiz um critério declarado · gate sem evidência · uma das cinco classes de risco do núcleo §6 · toca cálculo, persistência ou migração sem revisão humana |
| 🟡 Recomendação | funciona, dá para ficar melhor. Vira achado com destino, ou nada |
| 🟢 Observação | fica anotado |

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
`docs/arquitetura/revisoes-gerais/REV-NNN.md`. A IA pode sugerir uma; não cria por iniciativa
própria.

Cada achado recebe ID (`REV-NNN-Axx`) e, se virar trabalho, é citado na origem da tarefa. Achado sem
ID não é rastreável e some no arquivo.
