# TASK-CHORE-019 · Validacao integrada e consolidacao

Plano de referencia: docs/rascunhos/planejamentos/2026-10-04--trabalho-paralelo-por-slots/fatias/fatia-e-validacao.md
<!-- mentor:plano:inicio sha256="da8a68b14ae70357ea4e1469c1ca1bbd39b027529f13217f14b37d84c5fc5ce8" -->

# Fatia E: Validação integrada e consolidação do pacote

## Resultado e dependências

Última fatia, após B/C/D integradas sobre A. Carga M/G. Centraliza arquivos compartilhados e prova o fluxo que as suítes isoladas não comprovam. Não assume papel de um modelo específico nem inclui publicação de release ou implantação em consumidor.

## Mudança arquivo por arquivo

- `testes/cenarios/33-trabalho-paralelo.ts`: repositório temporário, remoto bare local, cadastro sequencial de tarefas e duas/três linked worktrees de verdade. Iniciar tarefas diferentes, executar provas pertinentes e concluir conforme fixtures do ciclo atual. Integrar a primeira, atualizar a segunda e resolver conflito real de fonte coberta. Conferir preservação de ambos os registros/narrativas, índice, diagnósticos e evidência da árvore combinada. Exercitar conflito não coberto e sua preservação antes da resolução explícita.
- `testes/cenarios/31-testes-de-unidade.ts`: incorporar imports das suítes B/C depois de suas entregas, conferindo que casos realmente executam.
- `testes/executar.ts`: registrar o cenário novo na bateria ampla, mantendo flags rápidas e contagem dinâmica.
- `testes/README.md`: explicar prova focada, cenário temporário, limites e comando amplo; não prometer contagem fixa nem duração universal.
- `CHANGELOG.md`: registrar mudanças efetivas no diagnóstico, status do resolvedor e protocolo, sem inventar nova versão publicada.
- `.mentor/manifesto.json`: regenerar pelo comando existente depois das alterações estáveis do pacote, preservando a versão e assinaturas legítimas.

## Prova integrada e higiene

Reusar helpers e casos existentes; criar somente as lacunas da matriz 03. O cenário novo vive em diretório temporário e tem cleanup e timeout de subprocessos. Não usar a rede, worktrees do mantenedor ou portas/bancos do produto. Uma worktree descartada precisa ser removida corretamente pelo Git, com preservação de logs úteis na falha.

Conferir byte snapshots dos arquivos consultados pelo doctor e refs/índice antes/depois. Aceitar um diagnóstico parcial quando uma árvore não estiver disponível; não tratar o total observado como exclusão mútua. Conferir índice real no resolvedor; marcadores fabricados sem Git não substituem a prova de três vias.

Executar tipos, unidades, verificações e uma bateria ampla após estado estável pelo motivo compartilhado explicitado em 03. O runner existente pode gerar fixtures rastreadas: registrar status anterior e examinar alterações depois. Não apagar alterações preexistentes nem transformar mudança acidental de fixture em feature do épico.

## Entrega e memória

Registrar comandos, resultados, origem dos logs, árvore validada e limitações. Anexar evidências externas a tarefas encerradas quando necessário. Corrigir regressões relacionadas; achados históricos de contexto ficam reportados com sua origem. Finalizar pai/fatias e fazer commits somente conforme autorização vigente; push e publicação permanecem atos próprios. Deixar roteiro de implantação do protocolo no consumidor sem alterá-lo durante esta fatia.

## Critérios de aceite

1. Cenário real permite tarefas distintas em worktrees com limite local 1 e preserva cada registro e narrativa na integração serial. Prova: CP-02/CP-11: cenário 33 temporário com remoto bare local.
2. Doctor é somente leitura e mostra ambiguidades; resolvedor mantém conflitos externos e só aprova índice resolvido. Prova: CP-03/CP-06/CP-07/CP-09: cenário integrado e suítes B/C.
3. Os runners incorporam as provas B/C e o cenário novo, e o pacote mantém tipos e verificações sem regressões atribuíveis ao épico. Prova: npm run tipos; node testes/executar.ts --unidade; node testes/executar.ts; node mentor.mjs verificar.
4. Manifesto e changelog refletem somente as entregas efetivas, com evidências e limites preservados. Prova: node mentor.mjs manifesto; inspeção do diff final e memórias de A–E.

## Contrato portátil

O arquivo acompanhante `fatia-e-validacao.contrato.json` contém escopo, aceite, riscos, reuso, habilidades e avaliação. Herdar os documentos normativos do épico e refinar somente os pontos que mudarem antes de iniciar a tarefa.

<!-- mentor:plano:fim -->
