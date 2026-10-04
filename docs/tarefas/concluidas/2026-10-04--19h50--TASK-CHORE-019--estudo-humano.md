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

## 1. Estudo Humano e Fundamentação Técnica

A Fatia E consolida a validação final integrada do épico `PLAN-trabalho-paralelo-por-slots`. Ela prova que a colaboração paralela entre múltiplos agentes autônomos ou desenvolvedores seniores em slots de Git worktrees funciona de maneira robusta, determinística e sem atrito:
- **Cenário Real E2E com Worktrees e Remoto Bare (CP-02 e CP-11):** O novo cenário `33-trabalho-paralelo.ts` simula o ciclo completo em repositório temporário, com tarefas pré-cadastradas na linha principal, worktrees reais (`slot-a` e `slot-b`), isolamento estrito de 1 tarefa em execução por slot, e integração serial First-to-Merge com preservação durável de registros e narrativas.
- **Diagnóstico do Doctor e Resolução Estrita (CP-03, CP-06, CP-07, CP-09):** Comprova que o `mentor doctor` inspeciona as worktrees ativas de forma estritamente somente-leitura. Comprova que `mentor resolver-gerados` resolve a fusão 3-way de `contexto.json` e gerados retornando código 0 apenas se o índice estiver 100% limpo, e encerra com código 1 caso haja conflitos não resolvidos em arquivos de código de produção, preservando os marcadores.
- **Consolidação dos Runners e Verificação Global (CP-12):** As suítes de unidade de B (`worktrees-paralelas.test.ts`) e C (`resolvedor-paralelo.test.ts`) foram integradas ao runner de unidades `testes/cenarios/31-testes-de-unidade.ts`. A suíte completa oficial de 33 cenários passou com 100% de sucesso.
- **Transparência e Rastreabilidade do Pacote:** O manifesto foi devidamente atualizado (92 arquivos) e o `CHANGELOG.md` registra detalhadamente todas as entregas das fatias A, B, C, D e E.

## 2. Implementação Passo a Passo

1. **`testes/cenarios/31-testes-de-unidade.ts`:** Incorporados os imports das suítes de testes unitários `worktrees-paralelas.test.ts` e `resolvedor-paralelo.test.ts`.
2. **`testes/cenarios/33-trabalho-paralelo.ts`:** Criado cenário completo E2E com remoto bare local, duas linked worktrees reais, salvaguarda de 1 tarefa em execução por slot, doctor somente-leitura, First-to-Merge na main e validação de código 0 vs código 1 no resolvedor de gerados.
3. **`testes/executar.ts`:** Registrado o novo cenário 33 na lista global `CENARIOS`.
4. **`testes/README.md`:** Documentado o cenário 33 e os modos de execução rápida (Nível 1) e bateria ampla (Nível 2).
5. **`CHANGELOG.md`:** Adicionada seção completa detalhando as entregas das Fatias A–E sob `[Não publicado]`.
6. **`.mentor/manifesto.json`:** Regenerado com sucesso via `node mentor.mjs manifesto`.

## 3. Critérios de Aceite e Evidências

- **Critério 0 [APROVADO]:** Cenário real permite tarefas distintas em worktrees com limite local 1 e preserva cada registro e narrativa na integração serial (`CP-02`/`CP-11`).
- **Critério 1 [APROVADO]:** Doctor é somente-leitura e mostra diagnósticos de slots; resolvedor mantém conflitos externos e só aprova com índice limpo (`CP-03`/`CP-06`/`CP-07`/`CP-09`).
- **Critério 2 [APROVADO]:** Runners incorporam provas B/C e o cenário 33. Todos os 33 cenários passaram com sucesso (`node testes/executar.ts`) e `mentor verificar` aprovado em todas as 5 famílias.
- **Critério 3 [APROVADO]:** Manifesto (92 arquivos) e changelog refletem com precisão as entregas e correções implementadas.

## 4. Desfecho e Validação Real

Todas as 33 suítes de testes foram executadas e aprovadas com sucesso absoluto (saída 0). O `node mentor.mjs verificar` aprovou todas as 5 famílias estruturais.

```json mentor:memoria
{
  "resultado": "Validação integrada completa do ecossistema de trabalho paralelo por slots em 33 cenários, com cobertura de linked worktrees, First-to-Merge, integridade do doctor e resolução semântica com veredito estrito.",
  "aprendizados": [
    "A execução de comandos de gate exige saída substantiva (não vazia) para ser considerada evidência válida pelo Mentor.",
    "A validação rigorosa de `git diff --name-only --diff-filter=U` garante que arquivos externos em conflito nunca sejam mascarados como resolvidos por comandos administrativos."
  ],
  "limites_conhecidos": [
    "Worktrees do Git compartilham o repositório central mas requerem `git worktree remove --force` para limpeza adequada quando diretórios temporários são descartados."
  ]
}
```

