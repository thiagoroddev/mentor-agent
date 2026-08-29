---
carrega_quando: projeto novo, projeto legado, ou atualização do pacote
---

# Processo · Inicialização

Produz `docs/contexto.json` e a estrutura de `docs/`. Roda uma vez por projeto, e de novo quando o
pacote é atualizado.

## Princípio

**Código é a verdade primária.** O que está no repositório se extrai lendo; só se pergunta o que o
código não pode responder. Perguntar o que dá para ler é gastar a paciência do humano no lugar
errado, e ele deixa de responder o que só ele sabe.

| Extrai do código | Pergunta ao humano |
|---|---|
| stack, versões, estrutura de pastas, rotas | o problema, o público, como se paga |
| convenções em uso, gates que existem | jurisdição, dado pessoal, menores |
| entidades, migrações | o que o produto **não** faz por decisão |

## Quatro fases

**1 · Ler.** Repositório vazio pula esta fase. Existindo código, leia antes de perguntar qualquer
coisa, e traga o que leu para a entrevista já preenchido, para o humano confirmar em vez de ditar.

**2 · Entrevistar pelos portões, nesta ordem.** `V` → `C` → `0` primeiro, sempre, porque os três
juntos decidem o nível de rigor, e o rigor decide o que é obrigatório em todos os outros. Os demais
(`P` `I` `A` `N` `S` `O`) entram conforme a fase do projeto.

Uma pergunta por vez. A pergunta de cada portão está em `guia/00-indice.md`; a ficha que ela
preenche está em `modelos/fichas.md`.

**3 · Gerar.** O script cria `contexto.json`, `requisitos.json`, `tarefas/`, e as visões em
Markdown. Nenhum desses arquivos é escrito à mão.

**4 · Declarar os gates e as ferramentas.** Cada gate recebe o comando real do projeto, rodado uma
vez para confirmar que funciona. Cada ferramenta ganha convenção por `processos/padroes-de-stack.md`.

## Campo vazio é legítimo

`null` significa *"ninguém decidiu ainda"*, e é assim que o mentor sabe o que lembrar depois. O que
**não** é legítimo é preencher por dedução: valor inventado apaga a pergunta sem respondê-la.

Dispensar um portão exige `dispensa_motivo` escrito. Sem isso, *"não se aplica"* vira a saída fácil
para tudo.

⚠️ **Rigor se promove sozinho.** Dado pessoal, cobrança, uso por terceiros ou decisão automatizada
sobre pessoa levam a N2 no mínimo, mesmo que o humano chame o projeto de teste. Isso é cálculo do
script, não julgamento da IA.

⚠️ **Nunca invente comando de gate para preencher a tabela.** Gate não declarado é lacuna honesta;
gate com comando inventado é verde que não checou nada.
