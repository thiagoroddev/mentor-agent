# Artefatos das tarefas: JSON operacional e estudo humano integral

## Invariante confirmada pelo mantenedor

O humano quer continuar lendo o planejamento inicial detalhado, mesmo extenso. O estudo humano deve preservar esse texto integralmente, acrescido de revisões e do desfecho. Não gerar um estudo resumido a partir dos novos campos. O JSON pode evoluir para ficar eficiente para IA.

Esse requisito vale igualmente para tarefa avulsa e fatia de épico.

## Ciclo dos arquivos

| Momento | JSON | Markdown |
|---|---|---|
| task nova | Identificação, origem, estado e estrutura do plano; nasce aberta/reserva | Preparado durante planejamento/início |
| Portão 1 | Contrato operacional com campos existentes e novos | Plano de engenharia completo e aprovado |
| Execução | Estado, evidências e contrato vigente | Plano original preservado; revisões materiais acrescentadas |
| Finalização | Registro final com referência ao estudo | Mesmo documento completo + desfecho, promovido para --estudo-humano.md |

No piloto, pendente é estado/fila; pasta real é tarefas/abertas. Na raiz administrativa resolvida, tarefa aberta usa `tarefas/abertas/<ID>.json` e `<ID>.md`; concluída usa nomes gerados com data/hora e ID, e o Markdown ganha `--estudo-humano.md`.

O concluir() atual grava o JSON final, renomeia o Markdown existente e remove o JSON aberto. Não reconstrói a narrativa. Preservar esse comportamento e o consumo de IAs por JSON/comandos, nunca pela leitura padrão de estudos humanos concluídos.

## Preservação sem reescrita por IA

O caminho de importação/vínculo precisa incorporar o plano detalhado por leitura/cópia de arquivo. Hoje task iniciar com plano_ref pode criar só uma narrativa com ponteiro. Corrigir para assegurar texto completo antes do Portão 1, sem exigir nova redação do plano.

Se o plano já estiver na narrativa, não duplicar nem sobrescrever. Se houver fonte externa/local, incorporar o texto completo aprovado e os contratos aplicáveis da fatia. Normalizar links de arquivo conforme regras do Mentor, sem resumir o conteúdo.

A operação de cópia deve ser determinística e idempotente. Ao repetir com a mesma fonte não duplicar texto. Ao mudar a fonte, preservar a revisão anterior e exigir tratamento da mudança, sem sobrescrita silenciosa.

O Markdown conterá problema, objetivos, alternativas, arquitetura, comportamento, arquivos, aceites, riscos e roteiro manual integrais. Acrescentar consistência, reuso, habilidades e avaliação. JSON estruturado e trecho humano desses quatro campos devem permanecer sincronizados sem redação dupla; o CLI pode renderizar bloco suplementar identificado, preservando toda prosa original fora dele.

## Replanejamento e conclusão

Não reescrever o planejamento inicial para fazê-lo parecer previsto desde o começo. Acrescentar revisões aprovadas identificando o que mudou e o escopo vigente. O contrato do JSON representa a versão operacional aplicável, com rastreabilidade para a versão aprovada.

Antes do Portão 2, a IA escreve Desfecho e Validação Real: comportamento observado, validação realmente realizada, armadilhas, limites, evidências e resultado. Sugestões de validação não são apresentadas como teste humano executado.

Finalizar continua sendo promoção de arquivo pelo CLI. O corpo anterior ao desfecho não será resumido, substituído pelo JSON ou reescrito pelo modelo no fechamento.

## JSON para leitura eficiente

Preservar dados que guiam outra tarefa: contrato, referências, aceites, evidências, novos campos e aprendizados aplicáveis. Não copiar o corpo extenso do estudo humano para o JSON.

Evitar duplicação de logs: stdout completo fica nos arquivos de evidência já referenciados por log_ref. Evoluir o JSON para guardar status, comando, código de saída, horário, hashes, referência e diagnóstico conciso. Adaptar consumidores antes de remover conteúdo que hoje usam; manter leitura dos registros antigos.

Acrescentar memória operacional curta do desfecho. A IA escreve uma vez um bloco estruturado dentro do Desfecho humano, e o CLI extrai literalmente para o JSON. Não usar modelo para sintetizar novamente nem deduzir conclusões de texto livre. O restante do desfecho continua livre e detalhado.

Nome/formato exato desse bloco e campo é fixado no planejamento individual. Aceites: extração sem perda, repetição idempotente, erro explícito em formato inválido e fonte única. A memória contempla resultado, aprendizados úteis e limites conhecidos; não duplica todo o diário.

## Compatibilidade

Tarefas existentes não são migradas nem recebem autorização histórica inventada. Campos novos obrigatórios apenas conforme ativação prospectiva. Compacidade nunca significa apagar pedido, contrato ou evidência necessários. Light sem tarefa continua a lista fechada do núcleo; não criar artefatos de tarefa para uma anotação isolada.

## Provas necessárias

1. Fonte detalhada copiada integralmente para narrativa por operação de arquivo.
2. Repetição não duplica plano nem destrói desfecho existente.
3. Revisão preserva plano original e identifica o novo contrato.
4. Finalizar conserva o conteúdo, acrescentando apenas o já registrado e metadados previstos.
5. Novos campos sobrevivem a nova/iniciar/vínculo/importação/resolução/conclusão.
6. Memória operacional é extraída literalmente, sem segunda síntese.
7. JSON antigo permanece legível e suas evidências acessíveis.
8. Tarefa avulsa tem o mesmo contrato de consistência de uma fatia.
