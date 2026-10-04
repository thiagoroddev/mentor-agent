# Instruções para o próximo modelo

## Ponto de retomada

O mantenedor pediu o planejamento detalhado do épico e seu salvamento para execução posterior. Os estudos e contratos já estão preparados; as implementações A–E ainda serão realizadas. A identidade do executor não muda escopo nem ordem. O texto histórico contém papéis de modelos que foram corrigidos nos documentos normativos desta pasta.

Leia o README e os documentos 01–03 completos. Em seguida leia `.mentor/nucleo.md`, `.mentor/processos/planejamento.md`, `.mentor/skills/planejamento/SKILL.md`, contexto vigente, ADRs resolvidas e padrões de stack relevantes. Inspecione código atual e git status: a referência de 04/10/2026 documenta a descoberta, não obriga voltar a um commit antigo.

Consultar o cadastro:

```bash
node mentor.mjs plano status PLAN-trabalho-paralelo-por-slots
node mentor.mjs doctor
git status --short
git worktree list --porcelain
```

A leitura de status não reserva trabalho. Conferir com a atribuição vigente se outra sessão já executa a mesma tarefa. Se o código mudou, refinar somente as fatias afetadas e conservar o estudo/histórico anterior. Alterar direção, contrato público ou adicionar dependência externa constitui diferença material; escolhas internas compatíveis seguem a autorização de execução já existente.

## Preparar o cadastro do épico

Quando o mantenedor solicitar executar este plano, essa solicitação autoriza o escopo indicado; não repetir a pergunta apenas porque mudou o modelo. Cumprir as regras vigentes dos atos de conclusão, commit e publicação.

Criar o pai e suas cinco fatias numa única sessão de cadastro, usando os comandos atuais. O pai não é implementado como uma tarefa em execução; `fatiar` o transforma no épico composto. Exemplo, substituir `<ID-PAI>` pelo resultado real do primeiro comando:

```bash
node mentor.mjs task nova --tipo CHORE --origem titulo-autossuficiente --titulo "Trabalho paralelo por slots no Mentor" --esforco G/G
node mentor.mjs task vincular-plano <ID-PAI> PLAN-trabalho-paralelo-por-slots
node mentor.mjs task fatiar <ID-PAI> --titulos "Protocolo e atribuicao por slots|Diagnostico de tarefas nas worktrees|Resolvedor com falhas verificaveis|Instrucoes coerentes de trabalho paralelo|Validacao integrada e consolidacao" --ordem "1>2,1>3,1>4,2>5,3>5,4>5" --motivo-ordem "A fornece o contrato operacional para B/C/D; E comprova e integra suas entregas"
```

Não usar o PLAN-ID como `--origem`: o resolvedor de origem atual não reconhece essa família como origem durável de tarefa. Usar `titulo-autossuficiente` e vincular o plano com o comando próprio.

Preencher no pai `plano_do_epico` com visão, hipótese, sinal de desvio e contrato compartilhado, usando os estudos completos. Conferir a estrutura corrente em `tipos.ts` e os registros emitidos pelo CLI. Associar os IDs emitidos às letras A–E; vincular cada fatia ao seu arquivo `fatias/fatia-*.md` usando `task vincular-plano <ID> --arquivo <caminho>`. O contrato acompanhante será carregado pelo ciclo existente.

Completar, nos campos atuais, problema canônico, alternativas, discordância, reuso, critérios, avaliação, validação e estado da arte/custo de oportunidade quando exigidos pelo porte. Registrar `contrato_esperado` e `contrato_entregue` conforme o esquema vigente. Contrato portátil não é um registro final de tarefa e não preenche toda narrativa automaticamente.

Publicar/disponibilizar o cadastro na base comum conforme as autorizações de integração. Não iniciar fatias de código a partir de uma base que ainda ignora as tarefas atribuídas.

## Execução por ondas

1. A primeiro: detalhar e entregar o protocolo, o modelo de atribuição e a convenção local. Usar [o estudo A](fatias/fatia-a-protocolo.md) e seu contrato.
2. B/C/D depois de A: revalidar os arquivos exclusivos. Distribuir as três entre slots disponíveis; qualquer modelo pode assumir qualquer frente. Com apenas uma sessão, executar essas fatias sequencialmente com a mesma ordem lógica.
3. E após integrar B/C/D: incorporar os testes nos runners, provar integração, atualizar changelog/manifesto e entregar o conjunto consistente.

Cada tarefa conserva sua própria branch, estado, evidências e estudo humano. O responsável temporário pela integração acompanha candidatos e incorpora uma branch por vez. Deixar arquivos compartilhados atribuídos à fatia E enquanto B/C/D estão em paralelo.

## Atenções técnicas já identificadas

- O `doctor` atual tem listagem de worktrees, mas não agrega tarefas por árvore. Não anunciar essa capacidade antes da entrega B.
- O resolvedor atual pode emitir aviso e continuar em certos erros. Durante C, preservar estágios de conflito e verificar status de escrita/stage; não confiar apenas na mensagem final atual.
- Catálogo de planos e narrativas não são fontes resolvidas automaticamente. Preservar hashes/referências ao resolvê-los, em vez de escolher um lado inteiro.
- A ajuda de `fatiar` ainda anuncia encadeamento por padrão; o código usa ordem explícita. D alinha o texto sem modificar o grafo.
- Refs/configuração/hooks são comuns às worktrees; não instalar/reconfigurar hooks em paralelo como se fossem privados de um slot.
- Uma árvore irmã pode estar em projeto dentro de subpasta. A leitura explícita não deve ser redirecionada pelo `MENTOR_RAIZ` da sessão atual.
- Testes `.test.ts` usam o harness local. Executar suites, não apenas importar arquivos.
- Gates após atualização precisam provar a árvore pertinente. Anexar CI a tarefas fechadas quando adequado; não inventar evidência nem reescrever uma conclusão passada.

## Artefatos a deixar em cada handoff

Informar TASK-ID, slot/branch, HEAD/base, contrato consumido, git status, arquivos alterados, testes executados com resultado e limitações, recursos locais ativos e próximo passo concreto. Preservar o plano integral e a memória operacional no registro da tarefa. O próximo modelo não deve reconstruir este estudo a partir de um resumo do chat.

O término da execução futura exige as evidências da matriz 03, revisão/validação conforme risco e políticas do projeto e ausência de conflitos restantes. Publicação de versão e aplicação ao piloto serão instruções posteriores do mantenedor.
