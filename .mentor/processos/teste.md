---
carrega_quando: escrever ou ajustar teste, e ao planejar qualquer tarefa com criterio de aceite
---

# Processo · Teste

O metodo e' do projeto (`contexto.qualidade.metodo_de_teste`), e o padrao e' **`tdd`**. Trocar por
`bdd`, `teste-depois` ou `nenhum` exige motivo escrito. O metodo diz **quando** o teste nasce; o
vinculo criterio→teste vale em todos eles.

**Planeje em prosa primeiro.** Teste antes nao substitui desenho. Com o plano na mao, para cada
criterio de aceite, tente escrever a asercao. O resultado nao e' opiniao:

| A asercao escreve sem o codigo existir? | O que fazer |
| :-- | :-- |
| **Sim** | teste antes. `task gate <id> testes --esperando-vermelho`, depois implemente ate o verde |
| **Nao, o criterio esta vago** | **conserte o criterio.** Se nao vira asercao, nao era criterio, era intencao |
| **Nao, a forma e desconhecida** | tarefa `SPIKE` declarada: responde uma pergunta, e' descartavel |

⚠️ **Nao existe quarta saida.** *"Julguei que nao precisava"* nao e' motivo: e' a decisao que sempre
cai para o lado de economizar trabalho, e por isso nao e' sua.

**Duas camadas de teste, e a segunda nao pode vir antes.** Os criterios de aceite vem do pedido, sao
poucos, e nascem antes. As **descobertas** (a borda que so apareceu ao implementar, o ramo que
ninguem sabia que existia, a regressao de um bug) nao existem antes do codigo: nascem depois, e vao
na secao propria da narrativa.

**Por que o vermelho e' obrigatorio, e nao a ordem de escrita:** teste que nunca falhou nao e'
evidencia. Asercao fraca, dublê que devolve o esperado, ramo que nem executa: tudo isso passa de
primeira. O `--esperando-vermelho` recusa quando o comando sai verde, porque ai o teste passa **sem
o codigo** e nao testa o que promete.


## Spike

Exploracao declarada, tipo `SPIKE`. Existe para a exploracao **nao se disfarcar de tarefa normal**,
que e' o que acontece quando o unico caminho disponivel e' a tarefa normal.

Um spike responde **uma** pergunta, nao tem criterio com teste, e a narrativa dele tem tres secoes
proprias: a resposta · o que foi descartado · a tarefa que isto destrava (ou "nenhuma: a resposta foi
nao"). O codigo do spike e' descartavel por definicao; o que sobrevive dele se declara.

## O que isto nao resolve

Escrevo o teste e o codigo com o mesmo modelo mental, na mesma sessao. **Se o modelo esta errado, os
dois estao errados e concordam entre si.** Nenhuma ordem de escrita conserta isso; o que conserta e'
contexto separado, que e' o papel da revisao ([`revisao.md`](./revisao.md)).
