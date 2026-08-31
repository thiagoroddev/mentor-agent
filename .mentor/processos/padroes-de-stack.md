---
carrega_quando: tocar ferramenta que ainda não tem convenção escrita
---

# Processo · Padrões de stack

O pacote **não traz o padrão da sua ferramenta pronto: traz como escrever o seu.** Padrão embutido
envelhece com a ferramenta, impõe preferência que não é do projeto, e é pago por quem não usa
aquela ferramenta.

O padrão mora em `docs-mentor/padroes-de-stack/<ferramenta>.md`, dentro do projeto, e **sobrevive a toda
atualização do pacote**. Sair de uma ferramenta é apagar um arquivo; entrar em outra é criar um.

## Quando dispara

A tarefa toca uma ferramenta (framework, runtime, banco, serviço de deploy, analisador) e não existe
arquivo de convenção para ela. **Criá-lo é parte da tarefa**, não trabalho para depois.

## O que se extrai, o que se pergunta

| Extrai lendo o código | Pergunta |
|---|---|
| versão, configuração, o que já é feito de um jeito só | o que foi decisão e o que foi acaso |
| padrão repetido em três lugares ou mais | o que incomoda hoje e deve mudar |
| dependências já instaladas | o que foi descartado, e por quê |

Traga a leitura pronta. Pergunte só o que o código não responde.

## A entrevista

Curta: no máximo oito perguntas, uma por vez, cada uma com uma recomendação sua e o motivo. O humano
é estudante ou não conhece a ferramenta a fundo: pergunta sem recomendação transfere para ele uma
decisão que ele pediu ajuda para tomar.

Depois, apresente o arquivo inteiro e espere aprovação. Convenção não aprovada não vale.

## Forma fixa

```
# <ferramenta>          Papel no projeto · versão
## Decidido             uma linha por convenção
## Por quê              só onde a escolha não é óbvia
## Não usamos           o que foi descartado, para não voltar à discussão
## Exemplo curto
## Revisar quando
```

Teto 3.600 caracteres. `Não usamos` existe porque decisão descartada sem registro volta na tarefa
seguinte, com outra IA propondo exatamente o que já foi recusado.

## Não há gate sobre convenção

Convenção é preferência do dono do projeto, e preferência não se audita. A única checagem é
referencial e exata: **toda ferramenta declarada em `contexto.json → ferramentas` tem arquivo de
padrão, ou tem `dispensa_motivo`.**

## O padrão melhora com o uso

Decisão que se repete pela terceira vez vira linha em `## Decidido`. Antes da terceira, é caso
isolado e não vira regra: regra criada na primeira ocorrência é a forma mais rápida de encher o
projeto de lei que ninguém pediu.
