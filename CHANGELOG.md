# Changelog

Todas as mudanças notáveis no **mentor-agent** são documentadas neste arquivo.

O formato baseia-se em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [0.10.0] - 2026-09-14

Plano em `PLANO-v0.10.0.md`, a partir da TASK-RF-044 e da TASK-BG-022 do piloto.

### Adicionado
- **Sugestao do humano e' hipotese.** `task iniciar` escreve no plano `pedido_original`, `solucao_sugerida` e `alternativas_profissionais` (`{ pratica, pegaria_o_caso, custo }`). O `finalizar` recusa pedido vazio e sugestao com menos de duas alternativas completas. Plano iniciado antes da 0.10.0 nao e' cobrado. O dossie mostra pedido, sugestao e alternativas, e o "ja medido" aponta as tarefas com sugestao.
- **`contexto.laboratorio`** (`laboratorio.ts`): `caminhos`, `saidas`, `chaves` e `artefatos_importaveis`. Contexto antigo sem o bloco vale como nao declarado.
- **Escopo do SPIKE**: com `caminhos` declarados, o `finalizar` recusa codigo mudado fora deles; `--produto-tocado "<motivo>"` (30 caracteres) fecha e grava `produto_tocado_motivo` com os arquivos. Sem `caminhos`, `iniciar` e `finalizar` avisam.
- **`plano.saida_do_laboratorio`** em SPIKE: `relatorio` ou `importavel`; importavel exige teste de contrato que resolve e registrado em `artefatos_importaveis`.
- **`verificar`**: chave sem nome ou dono, com padrao diferente de `desligada`, com `remover_em` ilegivel ou teste que nao resolve; artefato importavel com teste que nao resolve.
- **`doctor`**: chave com `remover_em` vencido, saida do laboratorio rastreada ou fora do `.gitignore`, SPIKE viva sem `caminhos` declarados.
- `processos/laboratorio.md`, carregado pelo nucleo §9 em SPIKE e laboratorio. `processos/tarefa.md` ganha o passo "Entender: o problema, nao a solucao sugerida"; `processos/rascunho.md`, a mesma regra para ideia que chega como solucao. Nucleo §2: sugestao e' hipotese no Portao 1.
- Cenario `29-laboratorio-e-hipotese.ts`. Os cenarios 23 a 25 preenchem os campos novos do plano.

### Para atualizar
- Declare `contexto.laboratorio` antes de retomar um SPIKE: `caminhos: []` se o projeto nao tem laboratorio. Com `caminhos` declarados, spike pausado que mexeu no produto vai precisar de `--produto-tocado` ou de uma tarefa propria para essa parte.

---

## [0.9.0] - 2026-09-13

Plano em `PLANO-v0.9.0.md`. Substitui o item C6 do `PLANO-v0.8.0.md`.

### Mudado
- ⚠️ **WIP pode subir para o remoto.** A regra "apenas commit, nunca push" de `processos/tarefa.md` sai: envio so' para `refs/heads/wip/*` passa sem gates e sem checagem de ID. O proibido passa a ser o merge no ramo principal.
- **O pre-push le os ramos enviados** (entrada padrao do hook, protocolo do git) em vez de olhar o ramo atual: envio ao principal protegido e' barrado de qualquer ramo, e a checagem de ID confere os commits do ramo enviado. Commit que ja' esta' em algum ramo remoto nao e' conferido de novo. Sem entrada (rodado a mao), vale o comportamento anterior.
- **Os gates sairam do arquivo `.githooks/pre-push`** para o `hooks --pre-push`, que os pula no WIP. Hook antigo continua funcionando sem rodar os gates duas vezes, e avisa para reinstalar.
- **`task retomar` recusa quando o ramo principal tem commits que o ramo nao tem** (`--sem-merge` para seguir): merge antes do retomar, nunca rebase.

### Adicionado
- **`mentor pronto-para-merge --titulo "<titulo do PR>"`** (`cmd-merge.ts`): sai 0 so' com toda tarefa do titulo concluida no ramo; PR Light passa; sem ID nem marca, falha. Modelo do job da esteira em `skills/github-ci`, com o titulo por variavel de ambiente (evita injecao de comando).
- `instalar --forcar` regrava o `.githooks/pre-push` gerado pelo mentor (`atualizarHookDoMentor`); hook escrito pelo projeto nao e' tocado.
- `task pausar` sugere `git push -u origin HEAD:wip/<id>`; `doctor` lista os ramos `wip/` do remoto.
- `processos/entrega.md`: secao "Trabalho pausado (WIP)", com o fluxo do WIP ao merge e o aviso de que ramo privado em repositorio publico nao existe.
- Cenario `28-wip-e-merge.ts`, com remoto bare e hook de verdade.

---

## [0.8.1] - 2026-09-13

### Corrigido
- ⚠️ **Checagem de ID do pre-push aceitava qualquer escopo**: `feat(ui): tela nova` subia sem tarefa, enquanto `fix: typo` sem escopo era barrado. Commit que toca codigo agora precisa de `TASK-X-NNN` no titulo ou da marca Light `<tipo>(light): <descricao>`. **Muda comportamento:** escopo livre (`feat(ui):`, `chore(deps):`) em commit de codigo passa a ser barrado; a mensagem de recusa mostra as duas marcas e como reescrever o titulo.

### Adicionado
- **Marca Light** (`ID_DE_TAREFA_NO_TITULO` e `MARCA_LIGHT_NO_TITULO` em `tipos.ts`, usadas pelo hook e pela auditoria). O nucleo §2 passa a nomear a marca, e `processos/entrega.md` descreve o hook.
- O dossie separa **commits marcados Light**, com as linhas que tocaram, dos commits sem ID e sem marca, para o auditor conferir se cabiam na lista fechada do nucleo §5.

---

## [0.8.0] - 2026-09-13

Plano e medicao de campo em `PLANO-v0.8.0.md`.

### Mudado
- **Cadencia de auditoria por tarefas**: `estadoDaCadencia()` e' a fonte unica para `doctor`, `finalizar` e `auditar preparar`. Conta as concluidas fora de lote com diff auditavel; atencao em N, bloqueio em 2N. `cadencia_em_caracteres` sai do esquema e passa a ser ignorado, com aviso no `doctor`.
- **Diff por tarefa**: `diffDaTarefa()` usa os commits com o ID no titulo (squash de PR incluido) ou, sem commit, os arquivos do `plano.muda` alterados desde o `commit_base`. Classifica a tarefa como `codigo`, `sem-diff` ou `atualizacao-do-pacote`.
- **Dossie por tarefa**: cada tarefa traz registro, tabela de arquivos (com o motivo de exclusao) e patch. O `preparar` empacota pelo teto de 120 mil caracteres e deixa o resto para o proximo (`ficaram_para_depois`); so' trunca tarefa que sozinha passa do teto. Commit sem ID de tarefa e trabalho nao commitado fora do lote viram fato, sem conteudo. Fato novo: tarefa que declara codigo e nao tem diff auditavel.
- **Exclusao unica** (`motivosDeExclusao`): registro do mentor, vista gerada, nota, pacote intacto, `linguist-generated` do `.gitattributes` e `ignorar_diff`, igual para arquivo rastreado e nao rastreado.
- **`registrar`** grava `ultima_na_tarefa` com as concluidas que ja' estao em lote; `proxima_em_tarefa` passa a ser `ultima_na_tarefa + cadencia` (era o proximo multiplo).
- **`arvore_hash`**: arvore do codigo sem a pasta de documentos e com nao rastreados (indice temporario + `write-tree`), marcada com `arvore_sem_documentos`. O `finalizar` recusa gate `testes` ou `build` que rodou antes de mudar arquivo rastreado ou declarado.
- **Pre-push**: deixa de rodar os gates (o arquivo do hook ja' roda; rodavam duas vezes), mostra os achados do `verificar` sem barrar, e trata `.mentor/` pelo manifesto.

### Corrigido
- Trava de retroativa acusava tarefa legitima fechada antes do commit: o diff ativo passa a ser o da trava de escopo (arvore de trabalho, nao rastreados, pausas).
- Hook, `finalizar` e auditoria tratavam `.mentor/` de tres jeitos: `arquivoIntactoDoPacote()` e' a regra unica.
- "Tarefa sensivel" definida em tres lugares e sem UI: `sensivel.ts` unifica e reconhece `.tsx`, `.jsx`, `.vue`, `.svelte`, `.css`, `.html`, tela, componente e layout.
- `verificar` acusava `PREENCHER:` citado em `melhorias-do-pacote.md` e entre crases.
- Aviso de normas alteradas nao aparecia pelo `npx mentor instalar --forcar`: `normasQueMudam()` em `instalar.mjs`, chamada pelos dois caminhos, com linhas por arquivo.
- Ajuda de `task criterio` anunciava `--cmd`; os dois nomes valem, e a ajuda diz que o indice comeca em 0.

### Adicionado
- Cenarios `26-auditoria-por-tarefa.ts` e `27-travas-de-fechamento-e-entrega.ts`.

---

## [0.7.0] - 2026-09-13

### Adicionado
- **Hash da Árvore de Trabalho (`arvore_hash`) nos Gates**:
  - Todo registro de gate grava o hash gerado via `git stash create`, fixando criptograficamente o estado exato dos arquivos testados na árvore de trabalho no momento da execução do gate, sem alterar o índice ou o working tree.
- **Anexação de Evidências Externas (`mentor task anexar`)**:
  - Novo comando `mentor task anexar <ID> --url "<url>" [--gate <nome>]` para vincular URLs de runs de CI e PRs de entrega a gates de tarefas, funcionando para tarefas abertas ou já concluídas (atendendo ao processo de entrega contínua).
- **Evidenciação de Critérios de Aceite (`mentor task criterio`)**:
  - Novo comando `mentor task criterio <ID> <indice> [--comando "<cmd>"] [--saida "<texto>"]` para registrar comandos executados e suas saídas verificáveis diretamente nos critérios de aceite do plano da tarefa (`evidencia: { comando, codigo_saida, saida, executado_em }`).
- **Validação Manual Concreta e Travas de Evidência**:
  - A validação manual aprovada registra `codigo_saida: null` para distinguir julgamento humano de código de saída de processo.
  - Exige `--evidencia` substantiva (mínimo de 10 caracteres) descrevendo passos executados e resultado observado tanto em `task validar --aprovado` quanto no atalho `task finalizar --validado-por-humano`.
  - Em tarefas sensíveis (cálculo, algoritmos, persistência, banco ou spikes), dispensar validação (`--dispensado`) exige justificativa substantiva de no mínimo 30 caracteres.
- **Detecção Mecânica de Tarefas Retroativas**:
  - `mentor task finalizar` verifica se os arquivos declarados em `plano.muda` já haviam sido commitados antes do `commit_base` e o diff ativo da tarefa está vazio, bloqueando o fechamento silencioso e exigindo a flag explícita `--retroativa`.
- **Extração Robusta e Agnóstica de Caminhos em `plano.muda`**:
  - Suporte completo a caminhos com kebab-case (sem quebrar no hífen do nome do arquivo), múltiplos caminhos por linha e padrões glob (`*`, `**`), eliminando falsos positivos de arquivos fora de escopo.
- **Exclusão Seletiva de Diff do Pacote e Cadência Justa**:
  - Arquivos de `.mentor/` cujo hash SHA-256 for idêntico ao registrado em `manifesto.json` são excluídos da contagem de cadência (`medirDiffAcumulado`) e do dossiê de auditoria (`dossie`), enquanto arquivos modificados (patches locais) permanecem no diff.
  - O `mentor doctor` apresenta a quebra do diff acumulado por categoria (`código/testes`, `config`, `docs`) nas mensagens de cadência de auditoria.
  - O dossiê de auditoria prioriza arquivos de código e testes antes de configurações e documentações, truncando apenas na fronteira de arquivos com relatório explícito de omissão.
- **Fusão Semântica 3-Way em `resolver-gerados`**:
  - Resolução de conflitos de merge de três vias com base (`:1:`), ours (`:2:`) e theirs (`:3:`) para `contexto.json`, `dividas.json` e `riscos-aceitos.json`, preservando histórico mais recente e resetando lembretes transitórios.
- **Cenário de Teste 25 (`25-auditoria-inteligente-e-validacao-concreta.ts`)**:
  - Cobertura ponta a ponta das 9 regras e comandos introduzidos na v0.7.0.

---

## [0.6.0] - 2026-09-12

### Adicionado
- **Mérito Técnico e Postura Ativa: O Dever de Contrariar**:
  - Novo Princípio 8 em `.mentor/nucleo.md`: a IA parceira tem o dever de contrariar tecnicamente durante o planejamento (Portão 1), apontando problemas de arquitetura, custo de oportunidade e alternativas consolidadas, sem tratar restrições fundadoras como dogmas eternos.
  - Atualização do checklist do Portão 1 no núcleo e no texto de boas-vindas do `mentor instalar` (`AGENTS.md`): o mentor não aprova planos sem mérito técnico, sem nome canônico e sem alternativas avaliadas.
  - Seção 9 em `MELHORIAS.md` formalizando a evolução de auditor de forma procedimental para conselheiro de mérito técnico.
- **Problema Canônico Obrigatório (M2)**:
  - Todo plano de tarefa exige o campo `problema_canonico` preenchido com o nome canônico do problema na literatura de ciência da computação ou engenharia (ex: TSP, VRP, CRDT, LR/GLR parsing), ou expressamente `"sem nome canonico"`. Planos sem o campo ou com marcadores são recusados no fechamento.
- **Seção de Discordância Obrigatória no Plano (M7)**:
  - Todo plano de tarefa agora possui a seção `discordancia` contendo:
    - `o_que_faria_diferente`: alternativas de desenho ou arquitetura consideradas pela IA.
    - `o_que_preocupa`: riscos operacionais, manutenibilidade ou gargalos do plano.
    - `o_que_existe_pronto_80_porcento`: bibliotecas ou ferramentas consolidadas que resolveriam 80% do problema.
    - Aceita formalmente `"Nada a objetar"` / `"Nenhuma conhecida"` quando a IA honestamente concordar com o plano.
- **Estado da Arte e Custo de Oportunidade para Tarefas G/XG (M1 e M8)**:
  - Tarefas com esforço de IA `G` ou `XG` (ou motores proprietários do zero) passam a exigir no plano:
    - `estado_da_arte`: implementações consolidadas de mercado avaliadas, motivo técnico do descarte e o que resta construir caso fossem adotadas.
    - `custo_de_oportunidade`: o que existe pronto (software livre ou serviço), custo estimado, dependências introduzidas e tempo humano/IA substituído pela construção manual.
    - Bloqueio mecânico em `mentor task finalizar` se as seções estiverem ausentes ou incompletas.
- **Três Réguas Obrigatórias para Spikes de Medição (M4)**:
  - Spikes com critérios de aceite de medição/otimização (melhora, ganho, otimização, redução, desempenho, latência) exigem `reguas_de_medicao` contendo: `piso` (baseline trivial a superar), `teto` (ótimo teórico calculado ou benchmark externo) e `padrao` (solução consolidada da indústria ou biblioteca padrão).
- **Bloqueio por Premissa Refutada (M5)**:
  - Se um spike ou tarefa anterior registrar achado de classe 3 ou 4 refutando premissa, `mentor task puxar` bloqueia tarefas dependentes no ciclo, impedindo que a esteira continue construindo sobre hipóteses invalidadas.
  - Desbloqueio explícito com `mentor task puxar <ID> --premissa-reconfirmada --motivo "<justificativa>"`.
- **Prevenção de Reincidência de Spikes Inconclusivos (M6)**:
  - Alerta no `mentor doctor` e bloqueio automático em `mentor task iniciar` ao tentar abrir um terceiro spike consecutivo quando os últimos dois fecharam inconclusivos sem validar premissa.
  - Desbloqueio explícito via `mentor task iniciar <ID> --estrategia-revisada`.
- **Pausa e Retomada de Tarefas com Rastreabilidade de Dependências (`task pausar` e `task retomar`)**:
  - Novo estado de tarefa `'pausada'`, permitindo suspender uma tarefa em execução para liberar o slot de WIP (`em_execucao`) e executar tarefas que surgiram como pré-requisitos urgentes (ex: recursos de UI para avaliação de spike ou correção de bugs de teste).
  - Comando `mentor task pausar <ID> --motivo "..." [--bloqueada-por <IDs>] [--commit]`:
    - Exige working tree limpo no Git (ou realiza auto-commit de WIP com a flag `--commit`, isolando o código).
    - Não exige nem realiza `push`, evitando falhas na esteira de CI/CD com código em progresso.
    - Grava histórico completo em `pausas` (`commit_pausa`, `commit_retomada`, `motivo`, `bloqueada_por`).
  - Comando `mentor task retomar <ID> [--forcar]`:
    - Valida que as tarefas bloqueadoras já foram concluídas ou canceladas antes de reabrir o slot ativo de execução.
  - **Isolamento de Escopo no Git**: o cálculo do diff em `mentor task finalizar` exclui automaticamente os intervalos em que a tarefa esteve pausada, evitando que arquivos modificados pelas tarefas intermediárias gerem falsos positivos de arquivos fora de escopo (`AUD-001-B05`).
  - Diagnóstico inteligente no `mentor doctor` alertando quando todas as tarefas bloqueadoras de uma tarefa pausada foram concluídas, orientando a retomada.
  - Exibição de indicador `[PAUSADA]` e bloqueadores no `backlog.md`.
- **Cenário de Teste 23 (`23-merito-tecnico-e-discordancia.ts`)**: Cobertura ponta a ponta de todas as regras de mérito técnico, réguas de spike, estado da arte, bloqueio por refutação e reincidência de spikes inconclusivos.
- **Cenário de Teste 24 (`24-pausa-e-retomada-de-tarefas.ts`)**: Cobertura ponta a ponta de pausa com auto-commit, liberação de WIP, execução de tarefas intermediárias, isolamento de diff e retomada.

---

## [0.5.0] - 2026-09-12

### Adicionado
- **Cadência Híbrida de Auditoria por Volume de Diff (`cadencia_em_caracteres`)**:
  - Novo parâmetro de auditoria em `contexto.json` (padrão: 80.000 caracteres) que monitora o acúmulo real de alterações git somando arquivos rastreados e não rastreados (`git ls-files --others`).
  - O `cmd-tarefa.ts` ao finalizar uma tarefa e o `cmd-doctor.ts` agora disparam alerta de auditoria necessária quando o número de tarefas OU o volume de diff acumulado atinge o limite configurado (com bloqueio severo no doctor a 1.5x o teto).
  - Prevenção ativa de truncamento em dossiês de auditoria (evita o cenário crítico de truncamento de 91% do diff detectado em auditorias reais como `AUD-001`).
- **Disciplina Ativa de Validação Manual**:
  - Taxonomia clara em `processos/tarefa.md` dividindo o que é estritamente obrigatório de validação manual humana (UI/Visual/UX, Persistência e Esquemas de dados, Fórmulas/Cálculos algorítmicos e spikes) versus o que é dispensável (refatores internos, tipos puros, correções de documentação e chores).
  - Postura ativa obrigatória da IA antes do Gate 2 e Gate 3: a IA deve formular um roteiro conciso de teste manual com passos, dados e resultado esperado antes de submeter a tarefa para encerramento ou solicitar autorização de push.
  - Trava mecânica na CLI (`mentor task finalizar`): bloqueia a finalização com erro explícito se houver validação manual pendente (`validacao === 'pendente'`) ou gate `validacao_manual` marcado como `NÃO EXECUTADO` sem justificativa.
  - Suporte às flags `--validado-por-humano` e `--validacao-dispensada --motivo "<justificativa>"` diretamente no comando `mentor task finalizar`, além de `--evidencia "<texto>"` no comando `mentor task validar`.
- **Prevenção Mecânica de Arquivos Fantasma (Disciplina de Escopo)**:
  - `mentor task finalizar` inspeciona arquivos alterados e novos arquivos criados (`git diff` + `git ls-files --others`) comparando-os contra os caminhos declarados em `plano.muda`. Bloqueia o fechamento da tarefa se arquivos de código forem tocados fora do escopo planejado (bloqueando desvios como `AUD-001-B05`).
- **Defesa no Dossiê de Auditoria e Resolução da Regra 4**:
  - O `cmd-auditar.ts` agora expõe a saída/evidência registrada no gate `validacao_manual` na tabela de gates do dossiê.
  - Verificação mecânica da Regra 4 (persistência/esquema e cálculos) no dossiê de auditoria reconhece explicitamente aprovação humana documentada em tarefas marcadas como `validado_por_humano` ou com evidência registrada.
- **Cenário de Teste 22**: Cobertura ponta a ponta em `testes/cenarios/22-cadencia-diff-e-validacao-manual.ts` validando cadência por diff em caracteres, trava de arquivos fantasma, bloqueio de validação manual pendente e aprovação com evidência.

---

## [0.4.0] - 2026-09-11

### Adicionado
- **Disciplina de Escopo Determinística**: `task nova --tipo RF|RN|RNF` exige obrigatoriamente `--requisitos <ID>` (ou inferido via `--origem`) ou `--sem-requisito --motivo "<justificativa>"`, impedindo que funcionalidades e regras de negócio sejam implementadas sem vínculo ao catálogo de requisitos.
- **Dispensa de Vermelho com Prova por Mutação**: Suporte a `--vermelho-dispensado --motivo "<mutacao>"` no gate `testes`, permitindo fechar tarefas em TDD sem teste vermelho prévio desde que haja prova por mutação registrada.
- **Dossiê de Auditoria com Defesa Preservada**: `cmd-auditar.ts` exibe a dispensa de vermelho e sua justificativa técnica na tabela de gates do dossiê, e inclui alerta nos fatos mecânicos para que o auditor verifique a prova por mutação.
- **Alocação de IDs Multi-Branch no Git**: `proximoIdDeTarefa` e `proximoIdDeRequisito` consultam todo o histórico e todas as refs Git (`refs/heads/*`, `refs/remotes/*`), garantindo IDs monotônicos crescentes mesmo com desenvolvimento paralelo em múltiplas branches.
- **Doctor Concorrência**: O `doctor` agora detecta e alerta sobre tarefas concluídas existentes em branches irmãs mas ainda não integradas na branch principal ou HEAD.
- **Pre-Push Hook com Proteções Operacionais**: Hook em `.githooks/pre-push` verifica se o projeto exige PR e bloqueia push direto no ramo principal, além de barrar commits em arquivos de código de produção que não contenham `<tipo>(<ID>): <descrição>`.
- **Fusão Semântica e Concorrência de Arquivos Gerados**: Comando `mentor resolver-gerados` para mesclagem semântica de `contexto.json` (preservando respostas humanas em portões V/C/0 e metas ISO 25010), regeneração limpa de markdowns derivados e união determinística de `recusas.jsonl`.
- **Migração de `recusas.jsonl` com `merge=union`**: Transição do arquivo de recusas para JSON Lines com configuração automática de `.gitattributes` para evitar conflitos de merge.
- **Cenário de Teste 21**: Cobertura integrada para concorrência Git, branches irmãs, dispensas e hooks (`21-concorrencia-git-e-dispensas.ts`).

---

## [0.3.1] - 2026-09-08

### Adicionado
- **Evidência Externa em Gates**: Suporte à flag `--arquivo <caminho>` e opcional `--codigo-saida <n>` no comando `task gate <ID> <gate>`, permitindo registrar saídas de comandos executados fora do ambiente direto do agente.
- **Tolerância a UTF-16 e BOM**: Leitura resiliente em `lerTexto` para arquivos codificados em UTF-16LE com BOM (comuns em redirecionamentos do PowerShell `*>`), UTF-16BE e UTF-8 com BOM.
- **Guia Operacional de CI na Skill `github-ci`**: Seção 7 com troubleshooting prático para latência do GitHub Actions, isolamento de falhas de `npm audit`, contorno de erro 403 em logs e fila de PRs do Dependabot sob Branch Protection.
- **Cenário de Teste 20**: Cobertura ponta a ponta para evidências externas e leitura UTF-16 (`20-evidencia-externa-e-narrativa.ts`).

### Modificado
- **Teto da Narrativa de Conclusão Expandido (10.000 caracteres)**: O limite de `docs-mentor/tarefas/concluidas/*.md` foi elevado de 2.400 para 10.000 caracteres no `tetos.json` e em `processos/tarefa.md`. O markdown destina-se ao aprendizado humano e histórico técnico detalhado (armadilhas, bugs sutis, testes manuais); agentes de IA que precisarem apenas do resumo operacional consomem o `.json` estruturado da tarefa.
- **Narrativa Técnica de Tarefa**: Processo de fechamento em `processos/tarefa.md` agora exige expressamente armadilhas técnicas e aprendizados reais de testes manuais (cache, portas, persistência, UX), barrando resumos protocolares rasos.
- **Orientação em Requisitos Vazios**: O `doctor` agora orienta ações recuperáveis para projetos legados (`"nenhum requisito registrado: se migrou projeto legado, preencha docs-mentor/requisitos/requisitos.json..."`).
- **Rotas de Plataforma no `doctor`**: O diagnóstico de configurações de plataforma não declaradas agora indica as seções correspondentes no GitHub (*Settings > Branches / Code security; veja .mentor/skills/github-ci/*).

---

## [0.3.0] - 2026-09-02

### Adicionado
- **Postura Ativa da IA**: Em inícios de sessão ("olá" ou sem tarefa ativa), o mentor diagnostica o estado do projeto e sugere os próximos passos operacionais numerados (`AGENTS.md`, `GEMINI.md`, `CLAUDE.md`, `nucleo.md`).
- **Roteiro Canônico para Legados**: Proibição expressa de entrevistas do zero quando houver código e documentação pré-existente (`inicializacao.md`).
- **Gaveta de Rascunhos**: Criação estruturada de `docs-mentor/rascunhos/` no `init` com liberdade total de subpastas (`comercial/`, `pesquisas/`, `prototipos/`) e `LEIA-ME.md`.
- **CLI de Requisitos**: Comandos determinísticos `mentor req nova` e `mentor req listar` para Requisitos Funcionais (`RF`), Regras de Negócio (`RN`) e Requisitos Não-Funcionais (`RNF`).
- **Rastreabilidade Bidirecional**: Cruzamento automático entre tarefas abertas e requisitos em `pendentes.md`.
- **Mapa de Referências**: Geração automática de `docs-mentor/referencias.md` como central de links para documentos e protótipos do projeto.
- **Catálogo de 7 Skills Nativas de Apoio (`.mentor/skills/`)**:
  - `github-ci`: Esteira de CI via GitHub Actions (`quality.yml`), Dependabot (`dependabot.yml`), Dependency Review em PRs, `SECURITY.md`, Private Vulnerability Reporting, Secret Scanning + Push Protection e CodeQL (`codeql.yml`), com matriz comparativa público vs privado.
  - `contratos-de-api`: API Design-First com schemas tipados (Zod/TypeScript) e mocks determinísticos para desenvolvimento paralelo de Frontend e Backend.
  - `ui-design`: Decomposição de designs e prints do Figma em árvore de componentes e especificação obrigatória dos 4 estados de UI (*Vazio, Carregando, Erro, Sucesso*).
  - `mermaid`: Padrões sintáticos seguros para diagramas em rascunhos (Flowchart, Sequence, State, ERD, C4).
  - `test-design`: Engenharia de testes, TDD na prática com estrutura AAA e estratégias de dublês de teste desacoplados de implementação interna.
  - `data-modeling`: Modelagem relacional e NoSQL, indexação estratégica e padrão *Expand and Contract* para migrações sem downtime.
  - `spike-e-investigacao`: Roteiro estruturado para tarefas `SPIKE` com timebox e depuração científica com testes de reprodução determinísticos.
- **Extensibilidade de Skills**: Gaveta `docs-mentor/skills/` criada no `init` para habilidades customizadas do projeto que sobrevivem a atualizações.
- **Tipo de Tarefa `SPIKE`**: Adicionado à lista de tipos válidos em `tarefa.md`.

### Modificado
- **Robustez de Gates**: Timeout de 120 segundos para todas as execuções de comandos externos (`cmd-tarefa.ts`, `cmd-gates.ts`, `cmd-lancamento.ts`).
- **Validação de Evidência**: Comandos de gate que retornam código 0 sem saída de texto são automaticamente rotulados como `INVÁLIDO como gate`.
- **Identificação de Absorção**: Tarefas absorvidas são gravadas com o sufixo `<data>--<ID>--ABSORVIDA.json`.
- **Isolamento de Logs**: Diretório `.mentor-saidas/` adicionado automaticamente ao `.gitignore` no `init` e `instalar`.
- **Anotações sobre o Pacote**: Destino canônico unificado em `docs-mentor/melhorias-do-pacote.md`, mantendo compatibilidade de leitura com anotações legadas em `.mentor/`.

---

## [0.2.2] - 2026-09-01

### Adicionado
- Comando `mentor anotar --sobre [projeto|pacote]` para anotações rápidas durante conversas.
- Testes de cenário para rascunhos, offsets de ID e integridade referencial.

### Modificado
- Validação estrita de tetos em caracteres (tolerância de 10% com suporte a exceções por glob no `tetos.json`).
- Resolução de caminhos no relatório de campo para evitar confusão entre versão do aplicativo e versão do mentor.

---

## [0.2.0] - 2026-08-30

### Adicionado
- Migração automática da pasta de administração de `docs/` para `docs-mentor/` via `mentor instalar --forcar --migrar-docs`.
- Manifesto de integridade (`manifesto.json`) com hash sha256 de todos os arquivos do pacote `.mentor/`.
- Proteção automática para analisadores de código (`.eslintignore`, `biome.json`, etc.) ignorando `.mentor/`.

---

## [0.1.0] - 2026-08-25

### Adicionado
- Primeira versão estável com ciclo de vida de tarefas (`abertas/`, `concluidas/`).
- Gates de qualidade declarados em `contexto.json` (Tipos, Lint, Testes, Build).
- Comandos CLI essenciais: `init`, `task`, `verificar`, `doctor`, `auditar`, `regras` e `relatorio-de-campo`.
