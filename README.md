# mentor-agent

Pacote de trabalho para agentes de IA. Gerencia tarefas, orienta quem nao sabe o que precisa
perguntar, e registra tudo de forma rastreavel.

## Como instalar num projeto

Na raiz do projeto que vai usar o pacote:

```bash
npm i -D github:thiagoroddev/mentor-agent#v0.3.0
npx mentor instalar        # copia .mentor/ e mentor.mjs para a raiz
node mentor.mjs init       # cria docs-mentor/, sem tocar na docs/ do aplicativo
```

O `instalar` cria tambem os pontos de entrada das ferramentas de IA (`CLAUDE.md`, `AGENTS.md`,
`GEMINI.md`), **sem os quais nada carrega o nucleo e o pacote nao existe na pratica**. Sao ponteiros
de menos de 2 KB somados: dizem onde as leis estao, nunca as repetem. Se o projeto ja' tiver um
desses arquivos, ele **nao e' sobrescrito**: o comando imprime a linha para voce colar.

⚠️ **O pacote e' copiado PARA DENTRO do repositorio, e nao fica em `node_modules`.** E' deliberado:
a IA le' `.mentor/` como arquivo, e o projeto versiona as convencoes dele ao lado. De dentro de
`node_modules` so' o `instalar` roda — o Node se recusa a remover tipos ali, e o `mentor.mjs` avisa
isso em vez de estourar.

A versao instalada fica gravada em `docs-mentor/contexto.json`, senao o relatorio de campo nao consegue
dizer *"isto aconteceu com a 0.3.0"*.

### Atualizar uma instalacao 0.1.x

A versao 0.1.x guardava o estado do mentor em `docs/`. A versao atual nao renomeia essa pasta sem uma
autorizacao especifica: `--forcar` permite substituir `.mentor/`, mas nao permite mover documentos.

```bash
npm i -D github:thiagoroddev/mentor-agent#v0.3.0
npx mentor instalar --forcar --migrar-docs
node mentor.mjs gerar
```

O instalador so reconhece uma instalacao antiga quando existe `docs/contexto.json`. Se
`docs-mentor/` tambem existir, ele recusa o conflito e nao move nada. Uma `docs/` comum, sem o
contexto do mentor, pertence ao aplicativo e permanece intocada.

## Como rodar

No terminal, **dentro da pasta do projeto**. Requer **Node 22.18 ou maior**: confira com
`node --version`. Nao ha etapa de build nem dependencia de execucao.

```bash
node mentor.mjs                 # ajuda: lista todos os comandos
node mentor.mjs init            # cria docs-mentor/ neste projeto

node mentor.mjs task nova --tipo RF --titulo "Listar registros por data" --esforco M/G --origem RF-1
node mentor.mjs task iniciar TASK-RF-001
node mentor.mjs task gate TASK-RF-001 testes
node mentor.mjs task finalizar TASK-RF-001

node mentor.mjs verificar
node mentor.mjs doctor          # folha de saude do projeto, com veredito binario

node mentor.mjs auditar preparar            # a cada N tarefas: monta o dossie do lote
node mentor.mjs auditar registrar AUD-001   # veredito, escrito por uma sessao NOVA de IA
```

**Sobre o `auditar`.** Quem escreve nao aprova: contexto compartilhado propaga vies. O `preparar`
monta um dossie com o diff do lote, os registros e os requisitos citados — **e nada mais** — e voce
o entrega a uma sessao de IA zerada. O escopo fechado nao e' promessa: e' o unico material que ela
recebe. Ela reporta achados; **quem decide o que vira trabalho e voce**, no `auditar resolver`.

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
| [`CHANGELOG.md`](./CHANGELOG.md) | historico de mudancas e notas de cada versao |
| `docs-mentor/auditorias/` | um dossie e um veredito por auditoria, no seu projeto |
| `.mentor/nucleo.md` | as leis. Sempre carregado |
| `.mentor/skills/` | catalogo de 7 habilidades nativas de apoio |
| `.mentor/processos/` | como conduzir o trabalho. Carregados por gatilho |
| `.mentor/guia/` | 13 areas de orientacao. Consultadas por lacuna, nunca inteiras |
| `.mentor/esquemas/` | a forma dos JSON, com os valores possiveis de cada campo |
| `.mentor/scripts/` | os comandos |
| `.mentor/manifesto.json` | o hash de cada arquivo do pacote, para saber se algum foi alterado depois de instalado |

**A ideia em uma frase:** o que da' para gerar, o script gera; o que exige julgamento, a pessoa
decide; e campo vazio no contexto e' a pergunta que a IA faz, em vez de silencio.
