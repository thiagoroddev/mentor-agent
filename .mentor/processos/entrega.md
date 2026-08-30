---
carrega_quando: publicar, mexer em ramo, esteira, release ou reversão
---

# Processo · Entrega

O pacote diz o que precisa ser verdade; a ferramenta é convenção de stack
([`padroes-de-stack.md`](./padroes-de-stack.md)). Nada aqui nomeia GitHub, GitLab ou plataforma
alguma.

## Uma tarefa, um ramo

O ID da tarefa **já existe antes do trabalho**, então o ramo se chama por ele: `rf-014-exportar-csv`.
Nunca pela posição da fatia — a posição muda, o ID não.

**Padrão: uma tarefa por ramo.** O motivo é a regra de evidência, não estética: a conclusão de uma
tarefa é o link do run da esteira colado no registro dela. Se um ramo carrega três tarefas, o mesmo
link vai para três registros e prova *"as três juntas passaram"*, não *"esta passou"*.

**Exceção:** tarefas inseparáveis, quando uma mexe no código que a outra criou e separar produz um
ramo que não compila. Aí é um ramo só, com os dois IDs, e uma linha em cada registro dizendo que
foram entregues juntas.

## A linha principal

**Sempre publicável** (guia OPS-20). Quebrada, consertá-la vem antes de qualquer funcionalidade.

**Protegida:** não aceita envio direto. Toda mudança entra por revisão com a esteira verde. Isso é
configuração de plataforma, não código — ver a seção final.

**Integrar cedo e com frequência** (OPS-15). Ramo aberto há semanas é a forma mais invisível de
desperdício, porque parece progresso.

## O que a esteira barra

Construção quebrada · teste falhando · análise estática reprovada · vulnerabilidade crítica ·
cobertura abaixo do limiar declarado (OPS-18).

⚠️ **Barreira que pode ser ignorada sem registro não é barreira.** Ignorar exige risco aceito, com
prazo e responsável nominal.

**Um artefato, promovido entre ambientes** (OPS-17). Reconstruir por ambiente invalida tudo que foi
testado.

## Antes de existir o que publicar

O bloco `versionamento` do `contexto.json` se responde na fase **construção**, não em pré-lançamento.
Quando há o que publicar, já é tarde: o histórico foi feito de outro jeito.

```
ramo_principal · estrategia_de_ramos · revisao_antes_do_merge · quem_aprova
protecao_do_ramo_principal · esquema_de_versao · release_automatizado
esteira_barra[] · uma_tarefa_por_ramo · apaga_ramo_no_merge
```

## Publicar

**Reversão testada antes do primeiro deploy real** (OPS-22). Saber voltar é mais importante que
publicar rápido, e reversão só existe se já foi executada de verdade — não se declara, se exercita.

**Mudança de estrutura de dados exige atenção separada** (OPS-23): é a parte que a reversão de código
não desfaz. Passos compatíveis com a versão anterior, nunca destruir dado no mesmo passo que muda a
estrutura, e caminho de volta declarado.

**Publicação é operação registrada** (OPS-25): o que subiu, qual versão, quem autorizou, quando, e o
que observar depois.

**Estar em produção não é estar visível** (OPS-21). Publicar continuamente e liberar quando o negócio
decidir permite lote pequeno sem expor trabalho incompleto.

## Atualização de dependência

Chega em lote e a tentação é aprovar tudo junto. Julgue uma a uma: o que a versão nova muda · é
correção de segurança ou mudança de comportamento · a esteira ficou verde · é dependência de produção
ou de desenvolvimento.

**Ordem segura:** primeiro as de desenvolvimento, depois as de produção sem mudança de contrato, por
último as de mudança maior — essas sozinhas, uma por ramo.

## O que não é código, e por isso é esquecido

Existe uma classe de configuração que **nenhum script alcança**, porque vive na web da plataforma:

```
protecao do ramo principal · apagar ramo apos o merge · alertas de vulnerabilidade
atualizacoes automaticas de seguranca · segredos do ambiente de esteira
```

Ela mora em `contexto.configuracoes_de_plataforma`, e o `doctor` cobra. Sem isso, o aviso de
vulnerabilidade — que é a razão de existir do bot de dependências — simplesmente não acontece, e
ninguém percebe, porque nada falha.

## Depois do envio

Conferir o resultado da esteira daquele commit. **É o único passo posterior ao portão 3 do núcleo,**
porque acontece depois de todos eles. Não é autorização e não reprova nada: o poder dele é avisar.

## Versão: um nome, um commit, para sempre

**Tag não se reaponta**, nem antes de publicar: daqui não dá para saber quem já puxou. Correção
vira versão nova.

**Publicou, instale do remoto uma vez, num diretório vazio, como um estranho faria.** Copiar de uma
pasta vizinha exercita um caminho que ninguém mais percorre, e pula justamente o que falha: a tag no
remoto, o `files` do pacote, o que o gerenciador empacota.

⚠️ Os dois foram medidos aqui, no mesmo dia. Uma tag reapontada por quem a julgava rascunho já
estava publicada, e o `package-lock` de um projeto fixa o commit, não o nome: `npm i` serviu código
antigo em silêncio, e a reinstalação copiou fielmente o pacote velho. Instalar e não instalar ao
mesmo tempo, sem erro na tela. E a instalação por gerenciador nunca funcionou enquanto só se rodava
da pasta local, apesar de documentada como se funcionasse.

