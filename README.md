# mentor-agent

Pacote de trabalho para agentes de IA. Gerencia tarefas, orienta quem nao sabe o que precisa
perguntar, e registra tudo de forma rastreavel.

## Como rodar

No terminal, **dentro da pasta do projeto**. Requer **Node 22.18 ou maior**: confira com
`node --version`. Nao ha etapa de build nem dependencia de execucao.

```bash
node mentor.mjs                 # ajuda: lista todos os comandos
node mentor.mjs init            # cria docs/ neste projeto

node mentor.mjs task nova --tipo RF --titulo "Listar registros por data" --esforco M/G --origem RF-1
node mentor.mjs task iniciar TASK-RF-001
node mentor.mjs task gate TASK-RF-001 testes
node mentor.mjs task finalizar TASK-RF-001

node mentor.mjs verificar
node mentor.mjs auditar
```

Os que nao levam flag tambem tem atalho: `npm run init`, `npm run verificar`, `npm run auditar`,
`npm run gerar`, `npm run tipos`.

⚠️ **Com flags, use `node mentor.mjs`, nao `npm run`.** O npm engole `--tipo` e companhia como
opcao dele: `npm run mentor task nova --tipo RF` chega no script como `task nova RF`. Daria para
contornar com `npm run mentor -- task nova --tipo RF`, e esse `--` no meio e' exatamente o tipo de
detalhe que se esquece.

Titulo com espaco vai entre aspas, no PowerShell e no cmd igual: `--titulo "texto assim"`.

| Onde | O que e' |
| :-- | :-- |
| [`ESPECIFICACAO.md`](./ESPECIFICACAO.md) | o desenho inteiro, com os numeros que o justificam |
| `.mentor/nucleo.md` | as leis. Sempre carregado |
| `.mentor/processos/` | como conduzir o trabalho. Carregados por gatilho |
| `.mentor/guia/` | 13 areas de orientacao. Consultadas por lacuna, nunca inteiras |
| `.mentor/esquemas/` | a forma dos JSON, com os valores possiveis de cada campo |
| `.mentor/scripts/` | os comandos |
| `.mentor/manifesto.json` | o hash de cada arquivo do pacote, para saber se algum foi alterado depois de instalado |

**A ideia em uma frase:** o que da' para gerar, o script gera; o que exige julgamento, a pessoa
decide; e campo vazio no contexto e' a pergunta que a IA faz, em vez de silencio.
