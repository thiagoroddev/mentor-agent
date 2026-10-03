# TASK-CHORE-001 · Portar as correcoes locais de midia e stdin do pre-push

# Portabilidade das correções locais da TASK-CHORE-039

## Origem e diferença verificada

O piloto está na versão 0.14.0. O registro patches-do-pacote contém um patch de scripts/cmd-hooks.ts, originado na TASK-CHORE-039. O repositório do pacote está na 0.14.0 e ainda não contém esse patch. As correções anteriores registradas como incorporadas na 0.13.0 não devem ser reaplicadas.

Origem: `E:/repositorios/projetos-pessoais/pilotos/teste-mentor-comagenteantigo/.mentor/scripts/cmd-hooks.ts`.
Destino: `.mentor/scripts/cmd-hooks.ts` deste repositório.

## Comportamento que será portado

1. Impedir leitura síncrona de stdin em chamada manual/background sem protocolo Git, dados de arquivo prontos ou opt-in explícito. Manter leitura de refs nas chamadas do Git, nos redirecionamentos de arquivo e com --stdin/MENTOR_HOOKS_STDIN.
2. Classificar extensões estáticas de mídia/documentos como não código, preservando classificação de fontes, testes e configurações funcionais.
3. Preservar o ajuste acompanhante do mesmo patch no parser de git status --porcelain: não remover os espaços de status antes de extrair o caminho.

Portar a diferença revisada, sem copiar outros módulos nem substituir a versão inteira do pacote.

## Plano técnico individual da portabilidade

- .mentor/scripts/cmd-hooks.ts: incorporar import fstatSync, lista de extensões estáticas, guarda de leitura de stdin e preservação das colunas do porcelain.
- testes: acrescentar regressões no harness existente, com subprocesso explicitamente limitado por timeout; nenhum teste síncrono pode depender de timeout do runner para interromper spawnSync.
- Helpers que injetam stdin: declarar opt-in explícito para simular protocolo, preservando os testes existentes de refs diferentes do HEAD, WIP e main protegida.
- .mentor/manifesto.json: regenerar pelo comando do pacote após alteração da fonte; não digitar hashes.
- CHANGELOG.md: registrar correções pendentes de release, sem alterar versão/tag/publicação.
- Registro administrativo da tarefa de portabilidade: plano e desfecho com evidências reais, sem reabrir a CHORE-039 concluída do consumidor.

Sem novas dependências. Carga pequena, complexidade moderada pelo protocolo de hook, perfil geral/médio. Risco principal é ignorar os refs e validar HEAD indevidamente; preservar regressões positivas do protocolo.

## Aceites e provas

- Execução manual com pipe mantido aberto termina antes do timeout, sem aguardar EOF.
- Chamada com argumentos reais de remoto usa os refs enviados: exclusão e WIP não são confundidos com HEAD.
- Opt-in explícito aceita stdin de teste; arquivo redirecionado com dados também é lido.
- Mídia/documentos estáticos são não código; .ts/.tsx/.js e testes continuam código.
- Fonte suja continua bloqueada; mídia não introduz bloqueio falso.
- Suíte existente de hooks não perde cobertura de main protegida, outro ref e revisão por árvore.
- Checagem de tipos e regressões apropriadas passam; evidência de teste não é só Date.now após chamada potencialmente infinita.

## Autorizações e atualização do consumidor

Pedido atual autoriza salvar documentação e portar correções existentes. Autorização anterior de commit é expressamente de documentação. Commit/finalização de código e push seguem seus atos e autorização aplicável.

Não marcar a melhoria como publicada ou removê-la dos registros do piloto antes de uma versão do pacote efetivamente incorporá-la e o consumidor atualizar. Não executar instalar --forcar neste projeto de origem.


## Ajuste da simulacao de stdin descoberto durante a execucao

O cenario 27 simula o Git passando origin, mas o helper de testes deixava o pipe aberto sem refs nem EOF. A leitura do protocolo deve aguardar EOF nesse caso. O helper em testes/apoio.ts passa a entregar entrada vazia e encerrada nas chamadas de pre-push, com timeout de 30 segundos. A fonte portável do hook permanece igual ao patch do piloto; os testes que injetam refs continuam declarando opt-in. O teste específico de chamada manual conserva o pipe aberto de propósito.

## Desfecho e Validação Real

### Comportamento observado

As duas correções da CHORE-039 foram portadas para a fonte do pacote: mídia/documentos estáticos deixam de exigir tratamento de código e a chamada manual do pre-push termina mesmo com stdin aberto. Foram conservadas a leitura de refs do Git, as entradas por arquivo, os opt-ins --stdin e MENTOR_HOOKS_STDIN=1 e o ajuste acompanhante das colunas do git status --porcelain. A fonte corresponde exatamente ao patch registrado no piloto; o manifesto foi regenerado pelo CLI.

Os seis testes pontuais reproduziram dois defeitos antes da portabilidade (mídia classificada como código e processo manual bloqueado); depois passaram os seis. O teste que reproduz stdin aberto tem timeout próprio do subprocesso: o timeout nominal do harness síncrono não interromperia spawnSync.

### Armadilhas do harness e ambiente

A primeira execução completa atingiu o limite padrão de 300 segundos, após 26 cenários aprovados. O harness simulava chamada Git passando origin e deixando stdin aberto sem refs nem EOF. Ajustado testes/apoio.ts para entregar entrada vazia encerrada nas simulações do pre-push e limitar esse subprocesso a 30 segundos. Os helpers que injetam refs declaram opt-in e timeout de 10 segundos. O subprocesso antigo foi encerrado e sua ausência confirmada antes da repetição.

A rodada completa seguinte usou MENTOR_GATE_TIMEOUT_MS=600000, apenas nessa execução, e terminou aprovada em 574 segundos. Não se alterou o timeout padrão do pacote. As mensagens de REV desatualizada no fim do log são saídas esperadas dos testes que comprovam invalidação de revisão; a suíte terminou com código zero e os 32 cenários verdes.

Os sete JSONs versionados dos exemplos receberam apenas metadados variáveis (commits, fingerprints, cache e logs). Foi comparado seu conteúdo sem esses campos e restaurada exclusivamente essa diferença produzida pela suíte. Nenhum comportamento de exemplo foi alterado.

### Evidências e limites

- Seis regressões pontuais aprovadas.
- Gate testes: node testes/executar.ts, código 0, 32 cenários aprovados. Log: `docs/.evidencias/logs/TASK-CHORE-001-testes-1791056830596.log`.
- Gate tipos da versão final: npx tsc --noEmit, código 0. Log: `docs/.evidencias/logs/TASK-CHORE-001-tipos-1791056920728.log`.
- node mentor.mjs verificar: aprovado nas quatro famílias.
- git diff --check: sem erros.
- Não houve validação manual de produto: a mudança está na ferramenta, comprovada por subprocessos e pelo harness do pacote.
- O piloto permaneceu sem alterações. Versão do pacote permanece 0.14.0; não houve publicação nem instalação no consumidor.

### Varredura do núcleo §6

No escopo inspecionado, nenhum novo achado de segurança, dado pessoal exposto ou performance com impacto de usuário. Nenhum gate vazio foi apresentado como aprovado.

Foi observado fora do escopo um ponteiro documental legado: o gerador de contexto em .mentor/scripts/vistas.ts escreve docs-mentor/contexto.json em docs/contexto.md, enquanto este repositório resolve sua raiz administrativa como docs/. O verificar atual aprovou a documentação mesmo com esse texto. O achado está registrado aqui para decisão posterior; a portabilidade não altera o gerador de contexto.

### Estado administrativo

Execução da portabilidade pronta para apresentação ao mantenedor. A tarefa permanece aberta em em-execucao, aguardando autorização específica de finalização e commit de código. Este desfecho registra provas observadas e não declara o Portão 2 aprovado. O plano inicial acima foi preservado integralmente.

O processo novo de planejamento, ADRs, contratos JSON e organização de rascunhos está consolidado no planejamento prévio registrado; suas fatias ainda não foram executadas.

## Preparacao da entrega autorizada

O mantenedor autorizou concluir e enviar o trabalho ao remoto para continuacao em outro sistema. Corrigida a estimativa inicial superdimensionada M/G para P/M: um modulo portado sem novo desenho e pequenas adaptacoes no harness; os registros gerados nao acrescentam decisoes de engenharia.

A limpeza anterior dos sete JSONs de exemplo fez o CLI detectar diferenca em artefatos rastreados apos o gate. Para conservar a evidencia verdadeira sem repetir testes, os sete arquivos foram recuperados diretamente da arvore Git capturada pela execucao aprovada, apos verificar novamente que diferiam apenas nos campos de metadados. Esses artefatos gerados passam a constar no plano. O resultado da suite permanece o da execucao original, com comando, log e arvore originais; nenhuma evidencia foi inventada ou reatribuida a outro codigo.
