# TASK-CHORE-020 · Comando task desvincular para retirar ou mover fatia de epico

<!-- mentor:plano:inicio -->
## Contexto e Problema de Fundo
Atualmente, o Mentor suporta criação de fatias via `mentor task nova --fatia-de <ID>` e `mentor task fatiar <ID> --titulos "A|B|C"`. Contudo, caso uma fatia precise virar tarefa avulsa independente ou ser transferida para outro épico, o CLI não fornece um comando formal. A edição manual de `fatia_de` em disco arrisca deixar o épico sem rastro da retirada da fatia, mantém `ordem_motivo` obsoleto de fatiamento anterior e pode corromper o acompanhamento de fatias vivas.

## Proposta Técnica e Mudanças
1. Criar a função `desvincular(id: string, flags: Flags)` em `.mentor/scripts/cmd-fila.ts`:
   - Exigência estrita de `--motivo "<justificativa>"`.
   - Localização de tarefa ativa; se a tarefa estiver em `concluida` ou `cancelada`, recusa explicitando o estado da tarefa.
   - Validação se a tarefa possui `fatia_de !== null` (se já for avulsa, recusa amigavelmente).
   - Localização do épico pai de origem (`paiOrigem`).
   - Se `--mover-para <NOVO-PAI>` for fornecido:
     - Validação de destino vivo: recusa se o destino estiver em `concluida` ou `cancelada`.
     - Validação de épico: recusa se o destino não possuir `plano_do_epico` (orientando o uso de `mentor task fatiar`).
     - Validação de ciclos: recusa se o destino for a própria tarefa ou descendente dela na árvore hierárquica.
     - Atualização: define `tarefa.fatia_de = novoPai.id`.
     - Reinício de composição: se a tarefa já estiver iniciada (possui `plano.composicao`), recria a `composicao` com o esqueleto contendo `MARCADOR`, forçando o preenchimento coerente com o novo épico no `finalizar`.
     - Registro de rastro: adiciona entrada em `plano_do_epico.revisoes` no novo pai (`fatia <ID> recebida de <paiOrigem.id>: <motivo>`).
   - Se `--mover-para` não for fornecido (desvincular para avulsa):
     - Seta `tarefa.fatia_de = null`.
     - Por higiene, se `tarefa.plano?.composicao` existir, define como `null`.
   - Tratamento de dependências e ordenação:
     - Zera `tarefa.ordem_motivo = null`.
     - Inspeciona `tarefa.depende_de`: se houver dependências de ex-irmãs do épico de origem, emite aviso explicativo no terminal mantendo o array intacto (preservando dependências reais de código sem ocultá-las).
   - Rastro no épico de origem:
     - Adiciona entrada em `plano_do_epico.revisoes` do épico de origem registrando a saída da fatia.
     - Se a fatia retirada for a última fatia ativa/viva do épico, emite aviso explícito no terminal.
     - Salva o épico de origem (e destino, se aplicável).
   - Salva a tarefa e executa `regenerarTudo()` para recomputar as vistas derivadas (`backlog.md`, `reserva.md`, `0-indice.md`).
2. Roteamento em `.mentor/scripts/cli.ts`:
   - Subcomando `mentor task desvincular <ID> [--mover-para <NOVO-PAI>] --motivo "..."`.
   - Documentação de ajuda atualizada.
3. Documentação em `.mentor/processos/tarefa.md`.
4. Suíte de testes dedicada em `testes/desvincular-fatia.test.ts`, registrada em `testes/cenarios/31-testes-de-unidade.ts`.
5. Passos de release (v0.16.0): bump de versão em `package.json`, `package-lock.json`, atualização do `CHANGELOG.md`, `README.md`, regeneração de `.mentor/manifesto.json` e tag anotada `v0.16.0`.
<!-- mentor:plano:fim -->

## Decisoes tomadas
- Criação do subcomando dedicado `mentor task desvincular <ID> [--mover-para <NOVO-PAI>] --motivo "..."` em `.mentor/scripts/cmd-fila.ts` e exposto em `cli.ts`.
- Exigência mandatória de justificativa via `--motivo`, gravando entrada de auditoria em `plano_do_epico.revisoes` da origem e do destino.
- Ao desvincular para tarefa avulsa, `ordem_motivo` é zerado e `plano.composicao` é anulado por higiene.
- Ao mover para outro épico, `plano.composicao` é reiniciado com esqueleto e `MARCADOR` para cobrar alinhamento coerente ao encerrar.
- Validação estrita do destino: deve estar vivo, possuir `plano_do_epico` e não ser descendente da tarefa (prevenção de ciclos).
- Aviso no terminal caso a tarefa mantenha dependências de ex-irmãs ou caso seja a última fatia ativa do épico de origem.

## O que nao foi feito, e por que
- Não foram removidas dependências de ex-irmãs em `depende_de` automaticamente. O CLI preserva o array e emite aviso explícito para que o operador decida, evitando esconder dependências reais de código.

## Testes de descoberta
- A execução integrada do teste de narrativa comprovou que qualquer alteração nos scripts do Mentor exige a sincronização do hash em `.mentor/manifesto.json` para evitar que linters apontem divergência de pacote.

## Aprendizados
- A hierarquia de fatias no Mentor depende de `plano_do_epico` nos coordenadores. Operações de re-parenting precisam garantir que o destino já é um coordenador válido antes de atribuir fatias.

## Roteiro Sugerido de Validacao Manual (Usuario)
1. Crie um épico com fatias: `node mentor.mjs task fatiar <EPICO> --titulos "A|B"`.
2. Desvincule uma fatia: `node mentor.mjs task desvincular <FATIA> --motivo "promovida a avulsa"`.
3. Verifique que `docs/tarefas/backlog.md` mostra a fatia como avulsa (`-`) e que o épico pai contém o rastro no JSON.

## Desfecho e Validacao Real
Comando `mentor task desvincular` implementado, documentado e coberto por 8 testes unitários rigorosos em `testes/desvincular-fatia.test.ts`. Todos os testes de unidade e gates passaram com 100% de sucesso.
```json mentor:memoria
{
  "resultado": "Comando task desvincular implementado com suporte a desvinculação avulsa e transferência entre épicos, validação de ciclos, rastro em revisões e regeneração automática de vistas.",
  "aprendizados": [
    "Re-parenting de fatias deve sempre sanitizar ordem_motivo e reiniciar marcadores de composicao para garantir rigor no fechamento.",
    "Avisos de dependências de ex-irmãs previnem quebras silenciosas no código de produção."
  ],
  "limites_conhecidos": [
    "Tarefas já finalizadas (concluídas ou canceladas) não podem ser desvinculadas ou transferidas sem reabertura."
  ]
}
```
