# mentor-agent

Pacote de trabalho para agentes de IA. Gerencia tarefas, orienta quem nao sabe o que precisa
perguntar, e registra tudo de forma rastreavel.

## Como instalar num projeto

Na raiz do projeto que vai usar o pacote:

```bash
npm i -D github:thiagoroddev/mentor-agent#v0.7.0
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
dizer *"isto aconteceu com a 0.7.0"*.

### Atualizar uma instalacao existente

Para atualizar o pacote mantendo seus documentos preservados:

```bash
npm i -D github:thiagoroddev/mentor-agent#v0.7.0
npx mentor instalar --forcar
node mentor.mjs resolver-gerados # regenera markdowns derivados e alinha contexto
node mentor.mjs verificar
```

*(Se estiver migrando de uma instalacao legada 0.1.x que usava a pasta `docs/`, use `--forcar --migrar-docs`)*.

## Como rodar

No terminal, **dentro da pasta do projeto**. Requer **Node 22.18 ou maior**: confira com
`node --version`. Nao ha etapa de build nem dependencia de execucao.

### Ciclo de Requisitos e Tarefas

```bash
node mentor.mjs                               # ajuda: lista todos os comandos
node mentor.mjs init                          # cria docs-mentor/ neste projeto

# 1. Catalogo de Requisitos
node mentor.mjs req nova --tipo RF --titulo "Exportar relatorio em CSV"
node mentor.mjs req listar

# 2. Ciclo de Vida da Tarefa & Merito Tecnico (Portao 1)
node mentor.mjs task nova --tipo RF --titulo "Listar registros por data" --esforco M/G --requisitos RF-001
# (ou --sem-requisito --motivo "justificativa tecnica" para tarefas sem vinculo de produto)

# Puxar para o ciclo (bloqueia se dependencia anterior teve premissa refutada em spike/achado)
node mentor.mjs task puxar TASK-RF-001
# (se premissa foi reconfirmada: --premissa-reconfirmada --motivo "decisao de produto")

# Iniciar tarefa (preenche modelo com problema_canonico e discordancia obrigatorios)
node mentor.mjs task iniciar TASK-RF-001
# (spikes consecutivos inconclusivos exigem: --estrategia-revisada)

# Pausar para executar trabalho bloqueador urgente (auto-commit de WIP e libera slot)
node mentor.mjs task pausar TASK-RF-001 --motivo "aguarda ajuste de UI" --bloqueada-por TASK-RF-002 --commit

# Retomar apos conclusao das tarefas bloqueadoras
node mentor.mjs task retomar TASK-RF-001

# Gates automatizados (Tipos, Lint, Testes, Build) - grava hash da árvore e commit
node mentor.mjs task gate TASK-RF-001 testes
# (suporta --vermelho-dispensado --motivo "<mutacao>" no TDD com prova por mutacao)

# Evidenciar criterio de aceite com execucao de comando ou saida
node mentor.mjs task criterio TASK-RF-001 0 --comando "node teste.js"

# Validacao Manual Ativa (obrigatoria para UI, persistencia, esquemas, calculos e spikes)
node mentor.mjs task validar TASK-RF-001 --aprovado --evidencia "Teste manual no navegador confirmou renderizacao dos 50 itens"

# Conclusao com verificacao de merito tecnico e escopo (suporta globs e kebab-case em plano.muda)
node mentor.mjs task finalizar TASK-RF-001 --validado-por-humano "Evidencia do teste"
# (tarefas retroativas detectadas automaticamente exigem: --retroativa)

# Anexar evidencia externa (run de CI, link de PR) mesmo apos fechamento
node mentor.mjs task anexar TASK-RF-001 --url "https://github.com/org/repo/actions/runs/12345" --gate build
```

### Auditoria Inteligente, Validação Concreta e Rastreabilidade (v0.7.0)

A versão 0.7.0 aprofunda o rigor técnico com rastreabilidade criptográfica no Git e elimina atalhos burocráticos:

- **Hash da Árvore de Trabalho (`arvore_hash`)**: Todo gate grava o hash gerado via `git stash create` antes de qualquer commit, provando exatamente o estado testado dos arquivos.
- **Anexação Externa de Evidências (`task anexar`)**: Permite vincular URLs de runs de CI e PRs a gates de tarefas abertas ou já concluídas, atendendo ao fluxo de entrega contínua.
- **Evidência de Critérios de Aceite (`task criterio`)**: Permite executar comandos e gravar saídas verificáveis diretamente nos critérios de aceite do plano.
- **Validação Manual Concreta (`codigo_saida: null`)**: A validação manual não pode ser forjada como processo 0: grava `codigo_saida: null`, exige evidência substantiva (>= 10 caracteres) e dispensa em tarefas sensíveis exige justificativa detalhada (>= 30 caracteres).
- **Detecção de Tarefas Retroativas**: O `finalizar` detecta se o trabalho declarado já estava commitado antes do `commit_base`, exigindo a flag explícita `--retroativa`.
- **Exclusão Seletiva de Diff e Cadência Justa**: O cálculo de cadência e o dossiê de auditoria excluem arquivos de `.mentor/` idênticos ao `manifesto.json`, mas mantêm patches locais no diff, categorizando a quebra do diff (`código/testes`, `config`, `docs`).
- **Fusão Semântica 3-Way (`resolver-gerados`)**: Resolução de conflitos de merge usando base (`:1:`), ours (`:2:`) e theirs (`:3:`), mantendo integridade de dívidas, riscos e histórico.

- **O Dever de Contrariar (Portão 1)**: A IA parceira tem a obrigação de apontar soluções existentes na indústria, evitar a invenção da roda e questionar restrições dogmáticas.
- **Problema Canônico (`problema_canonico`)**: Todo plano deve identificar o nome formal do problema na ciência da computação/engenharia (ex.: TSP, CRDT, LR parsing), ou explicitar `"sem nome canonico"`.
- **Seção de Discordância (`discordancia`)**: Todo plano registra o que a IA faria diferente, o que preocupa e o que existe pronto resolvendo 80% do problema (aceita `"Nada a objetar"` quando alinhado).
- **Estado da Arte e Custo de Oportunidade**: Tarefas de porte `G` ou `XG` exigem comparação explícita com implementações consolidadas e cálculo do custo de construir do zero.
- **Disciplina de Spikes**:
  - Spikes de medição/otimização exigem 3 réguas: `piso` (baseline trivial), `teto` (ótimo teórico/benchmark) e `padrao` (biblioteca padrão/mercado).
  - Achados que refutam premissas bloqueiam automaticamente tarefas dependentes na esteira.
  - Dois spikes consecutivos inconclusivos disparam alerta no `doctor` e exigem revisão de estratégia antes do terceiro.

### Saude, Concorrencia e Integridade

```bash
node mentor.mjs verificar                     # integridade dos arquivos e do manifesto
node mentor.mjs doctor                        # diagnostico completo de saude do projeto

# Git multi-branch e protecao operacional
node mentor.mjs hooks --instalar              # instala .githooks/pre-push protegendo main e commits
node mentor.mjs resolver-gerados              # fusao semantica pos-merge de branches irmas
```

### Auditoria de Lote (Contexto Isolado)

```bash
node mentor.mjs auditar preparar              # cadencia por tarefas ou diff em caracteres (evita truncamento)
node mentor.mjs auditar registrar AUD-001     # veredito independente produzido por uma sessao NOVA de IA
node mentor.mjs auditar resolver AUD-001      # transforma recomendacoes em plano de acao
```

**Sobre o `auditar`.** Quem escreve nao aprova: contexto compartilhado propaga vies. O `preparar`
monta um dossie com o diff do lote, os registros, as justificativas e os requisitos citados — **e nada mais** — e voce
o entrega a uma sessao de IA zerada. O escopo fechado nao e' promessa: e' o unico material que ela
recebe. Ela reporta achados; **quem decide o que vira trabalho e voce**, no `auditar resolver`.

A cadencia de auditoria e' hibrida: alerta por quantidade de tarefas concluidas ou pelo volume acumulado
de diff (`cadencia_em_caracteres`, padrao 80.000), garantindo que grandes refatoracoes nao excedam a
janela de contexto nem gerem truncamento de codigo.

### Dicas de Linha de Comando

Os que nao levam flag tambem tem atalho: `npm run init`, `npm run verificar`, `npm run auditar`,
`npm run gerar`, `npm run tipos`.

⚠️ **Com flags, use `node mentor.mjs`, nao `npm run`.** O npm engole `--tipo` e companhia como
opcao dele: `npm run mentor task nova --tipo RF` chega no script como `task nova RF`. Daria para
contornar com `npm run mentor -- task nova --tipo RF`, e esse `--` no meio e' exatamente o tipo de
detalhe que se esquece.

Titulo com espaco vai entre aspas, no PowerShell e no cmd igual: `--titulo "texto assim"`.

## Estrutura de Arquivos

| Onde | O que e' |
| :-- | :-- |
| [`ESPECIFICACAO.md`](./ESPECIFICACAO.md) | o desenho inteiro, com os numeros que o justificam |
| [`CHANGELOG.md`](./CHANGELOG.md) | historico de mudancas e notas de cada versao |
| `docs-mentor/tarefas/` | ciclo de vida das tarefas (`abertas/`, `concluidas/`) |
| `docs-mentor/requisitos/` | catalogo rastreavel de requisitos (`RF`, `RN`, `RNF`) |
| `docs-mentor/auditorias/` | um dossie e um veredito por auditoria, no seu projeto |
| `docs-mentor/rascunhos/` | gaveta livre para prototipos, pesquisas e anotacoes |
| `.mentor/nucleo.md` | as leis do mentor. Sempre carregado pelas ferramentas de IA |
| `.mentor/skills/` | catalogo de 7 habilidades nativas de apoio (`github-ci`, `ui-design`, etc.) |
| `.mentor/processos/` | como conduzir o trabalho (`tarefa.md`, `entrega.md`). Carregados por gatilho |
| `.mentor/guia/` | 13 areas de orientacao. Consultadas por lacuna, nunca inteiras |
| `.mentor/esquemas/` | a forma dos JSON, com os valores possiveis de cada campo |
| `.mentor/scripts/` | os comandos CLI em TypeScript |
| `.mentor/manifesto.json` | hash sha256 de cada arquivo do pacote, para detectar alteracoes indevidas |

**A ideia em uma frase:** o que da' para gerar, o script gera; o que exige julgamento, a pessoa
decide; e campo vazio no contexto e' a pergunta que a IA faz, em vez de silencio.
