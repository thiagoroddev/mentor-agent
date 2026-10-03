# Planejamento prévio consolidado: evolução do planejamento do Mentor

A direção foi consolidada e aceita pelo mantenedor nesta conversa: planejamento consistente com o projeto, decisões operacionais derivadas das ADRs, avaliação de capacidade do modelo, organização de rascunhos e preservação integral do estudo humano. O mantenedor pediu salvar no repositório do mentor-agent, trazendo as correções locais do piloto. Este cadastro não concede aprovação automática para executar, finalizar ou publicar as futuras fatias.

## Leitura

1. [Direção, processo e classificação](01-direcao-e-processo.md).
2. [ADRs, habilidade gerada e contratos verificáveis](02-consistencia-e-contratos.md).
3. [Arquivos de tarefas, JSON e estudo humano integral](03-artefatos-de-tarefa.md).
4. [Fatias, dependências e validação](04-fatias-e-validacao.md).
5. [Aplicação ilustrativa à tarefa avulsa 082](05-exemplo-task-rf-082.md).
6. [Portabilidade das correções locais da CHORE-039](06-portabilidade-chore-039.md).

Os documentos juntos constituem o planejamento prévio completo. Cada fatia precisa de planejamento individual antes da execução, preservado integralmente na sua narrativa. Não reconstruir esse planejamento a partir de um resumo do JSON.

## Destino e fronteira

Este repositório ainda usa `docs/` como raiz administrativa, resolvida pelo próprio Mentor. Por isso este plano vive em `docs/rascunhos/planejamentos/`; a convenção geral para projetos novos continua `docs-mentor/rascunhos/planejamentos/`. Não migrar a raiz administrativa para salvar este plano.

As capacidades genéricas serão implementadas no pacote. A configuração do caminho das dez ADRs do Eu Roteirizo, sua extração inicial, seu padrão shadcn/ui e a normalização do laboratório pertencem à implantação do projeto consumidor. Esses trabalhos estão definidos aqui como aplicação futura; salvar no pacote não autoriza alterar silenciosamente o piloto.

O piloto de origem é `E:/repositorios/projetos-pessoais/pilotos/teste-mentor-comagenteantigo`. Os planos existentes do laboratório permanecem em seus caminhos e não são migrados retrospectivamente.

## Autorização e estado

- Direção: decisões consolidadas pelo mantenedor.
- Salvamento e commit de documentação: solicitados explicitamente.
- Correções já aplicadas no piloto: portar a CHORE-039 para o pacote, com verificação apropriada.
- Execução do processo novo: distinguir da portabilidade das correções; as fatias terão planejamento e autorizações próprios.
- Commit de documentação não implica autorização de push, release ou instalação da nova versão no piloto.
- O estado das tarefas é consultado nos JSONs. Não manter tabela manual de progresso neste README.

## Proporcionalidade

Foi pedido planejamento consistente, organização de planejamentos prévios e análise de habilidades. A solução usa duas habilidades centrais, um subcomando de estado e amplia os contratos e comandos já existentes. Preservação do plano e memória operacional são integradas ao ciclo atual. Não adota motor externo de workflow nem cria uma habilidade para cada etapa.
