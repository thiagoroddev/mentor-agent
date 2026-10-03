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
