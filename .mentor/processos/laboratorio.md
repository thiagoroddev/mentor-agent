---
carrega_quando: SPIKE, experimento, ou código e saída de laboratório
---

# Processo · Laboratório

**Experimento não altera o produto fora do experimento.** Nem por código, nem por dado.

> **Medido:** um spike de roteirização não mudou uma linha do app. O laboratório exportou um JSON que o
> app importa, com um campo que no app queria dizer "o usuário escolheu". O roteiro importado ficou com
> o veículo a meio caminho da parada seguinte. O campo declarativo "isolamento", a primeira proposta,
> não teria pego: vazou **dado**, não código.

## O que o projeto declara

`contexto.laboratorio`:

| Campo | O que é | Quem confere |
| :-- | :-- | :-- |
| `caminhos` | onde o experimento vive (globs). `null` = não declarado; `[]` = sem laboratório | `task finalizar` de SPIKE |
| `saidas` | onde a saída cai. Fica fora do git: costuma levar dado real | `doctor` |
| `chaves` | todo comportamento de teste atrás de chave: `nome`, `onde`, `padrao: "desligada"`, `dono`, `remover_em`, `teste` | `verificar` e `doctor` |
| `artefatos_importaveis` | toda saída que o produto consegue ler, com `teste_de_contrato` | `verificar` |

`teste` e `teste_de_contrato` têm a forma dos critérios de aceite: `arquivo > nome do teste`.

## As travas

1. **Spike é descartável.** Com `caminhos` declarados, o `finalizar` de SPIKE recusa código mudado fora
   deles. Mudança no produto é outra tarefa, com teste e validação próprios. Se precisa ficar no spike:
   `task finalizar <ID> --produto-tocado "<motivo>"`, que fica gravado e aparece no dossiê.
2. **A saída do spike tem tipo.** `plano.saida_do_laboratorio.tipo` é `relatorio` (fica no laboratório)
   ou `importavel`. Importável exige teste de contrato que resolve **e** registrado em
   `artefatos_importaveis`: o spike acaba, o contrato continua sendo conferido.
3. **Chave nasce desligada, com dono e prazo.** O `verificar` reprova chave ligada por padrão, sem dono
   ou com teste que não existe. O `doctor` avisa chave com `remover_em` vencido: chave esquecida vira
   comportamento do produto.
4. **Saída fora do git.** O `doctor` avisa saída com arquivo rastreado ou sem `.gitignore`.

**Limite honesto:** "o teste resolve" é busca de texto. Prova que o teste existe, não que checa o que
promete. Quem confere é o Portão 1 e o auditor.

## O que fica no projeto, com a ferramenta dele

| Prática | Como |
| :-- | :-- |
| Regra de dependência | o produto não importa o laboratório: `no-restricted-imports`, dependency-cruiser, ArchUnit |
| Contrato na fronteira | o importador trata arquivo externo como não confiável; campo não ganha significado novo |
| Ambiente separado | artefato de experimento se confere em preview ou staging, com armazenamento próprio, nunca no dado real |
| Shadow mode / avaliação offline | motor novo roda ao lado do atual; a saída vai para relatório, não para o usuário |
| Teste de caracterização | um teste prende o comportamento padrão que o experimento não pode mudar |
