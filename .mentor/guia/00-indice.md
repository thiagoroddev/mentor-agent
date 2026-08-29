# Guia · índice

Regras que o agente aplica **por conta própria**, sem depender de o usuário saber pedir.

> **Por que existe.** Quem pede um sistema raramente conhece o que ele precisa ter. Pede a funcionalidade; não pede backup testado, política de cancelamento, estado de erro, base legal do dado, plano de reversão. A omissão de quem pede é responsabilidade de quem sabe — este guia converte esse saber em obrigação verificável.

> **Regra de ouro.** Silêncio do usuário nunca equivale a dispensa. Requisito não verbalizado que
> este guia prevê é responsabilidade do agente levantar. Toda dispensa é explícita e datada.

> **Como se consulta.** Nunca do começo ao fim. Campo `null` no `docs/contexto.json` nomeia o portão,
> o portão nomeia o arquivo. Fora disso, o guia fica fechado.

## Severidade

| Tag | Significado |
| :-- | :-- |
| `BLOQUEIA` | O agente não avança. Se o usuário insistir, registra a recusa e o motivo |
| `ACEITE` | Dispensável, mas só após apresentar o risco e registrar aceite explícito |
| `RECOMENDA` | Sugere uma vez; se recusado, segue |

## Nível de rigor

| Nível | Contexto | Vale |
| :-- | :-- | :-- |
| **N1** protótipo | Descartável, sem usuário externo, sem dado real | `BLOQUEIA` |
| **N2** produto | Usuários reais, dados reais, precisa evoluir | `BLOQUEIA` + `ACEITE` |
| **N3** crítico | Dinheiro, saúde, dado pessoal em escala, obrigação legal | Tudo; `RECOMENDA` vira `ACEITE` |

**Promoção automática:** dado pessoal, cobrança, uso por terceiros ou decisão automatizada sobre
pessoa levam a **N2 no mínimo**, mesmo que o usuário chame o projeto de teste.

**Segundo eixo, tamanho.** Criticidade define *o que* é obrigatório; o número de pessoas define
*quanto precisa estar escrito*. Uma pessoa coordena por memória; a partir de um punhado, o que
não está registrado deixa de ser compartilhado.

## Os nove portões

Rodam em sequência. Cada um produz um artefato curto que o próximo consome.

```
V  negócio ....... isto precisa existir, para quem, e como se paga?
C  obrigações .... que lei, setor e público se aplicam?
0  rigor ......... qual o nível, e o que ele torna obrigatório?
P  problema ...... como funciona hoje e o que exatamente vamos mudar?
I  uso ........... quem usa, onde, com quanta atenção?
A  arquitetura ... que processo, que forma, que decisões irreversíveis?
N  persistência .. onde o dado mora e sob que garantias?
S  ameaças ....... o que pode dar errado e quem se prejudica?
O  automação ..... quanto disto vale automatizar?
```

| Portão | Bloco do contexto | Arquivo | Pergunta que ninguém faz e muda tudo |
| :-: | :-- | :-- | :-- |
| **V** | `negocio` | [§1](./01-negocio.md) | Como resolvem isso hoje, e por que não serve? |
| **C** | `conformidade` | [§2](./02-conformidade.md) | Existe regra do setor? Menores podem usar? |
| **0** | `qualidade` | [§10](./10-qualidade.md) | Coleta dado pessoal? E se ficar um dia fora do ar? |
| **P** | `problema` | [§3](./03-analise.md) | Quem corrige quando o dado entra errado? |
| **I** | `uso` | [§8](./08-interacao.md) | Qual o contexto mais difícil em que precisa funcionar? |
| **A** | `arquitetura` | [§4](./04-processo.md) · [§5](./05-arquitetura.md) | Os requisitos são estáveis ou mudam toda semana? |
| **N** | `persistencia` | [§6](./06-persistencia.md) | Um cliente pode ter mais de um endereço? |
| **S** | `seguranca` | [§9](./09-seguranca.md) | Se apagarmos um cliente, o histórico some junto? |
| **O** | `operacao` | [§11](./11-operacao.md) | Quanto pode custar por mês? E se dobrar? |

**Prefixos por área:** §1 `NG` · §2 `CF` · §3 `AN` · §4 e §5 `ES` · §6 `BD` `NS` · §7 `CD` ·
§8 `IX` · §9 `SEC` · §10 `QS` · §11 `OPS` · §12 `AM` · §13 sem prefixo.

Sem portão: [§7 código](./07-codigo.md) `CD` · [§12 aprendizado de máquina](./12-aprendizado-de-maquina.md) `AM` *(condicional)* · [§13 evolução](./13-evolucao.md).

## Fora do guia, mesmo conteúdo

| Onde | O quê |
| :-- | :-- |
| [`modelos/fichas.md`](../modelos/fichas.md) | Estruturas mínimas para preencher, uma por portão |
| [`modelos/listas-por-fase.md`](../modelos/listas-por-fase.md) | Disparadas por mudança de fase, não por calendário |
| [`modelos/varredura.md`](../modelos/varredura.md) | Sinal observável e a regra que corrige. Para projeto existente |
| [`ORIGEM.md`](./ORIGEM.md) | De onde cada regra veio e o que é extensão declarada |

⚠️ **§2 é mapa de temas a levantar, não orientação jurídica.** Garante que o assunto apareça; nunca afirma que algo "está em conformidade".
