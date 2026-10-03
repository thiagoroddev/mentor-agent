# Direção e processo de planejamento

## Problema e evidências

A IA pode deixar de consultar decisões e componentes existentes, inclusive quando o plano já menciona reuso. O laboratório apresentou controles e estilos próprios fora dos padrões do projeto. A TASK-RF-082 só recebeu parte da harmonização após observações do mantenedor.

As ADRs detalhadas são necessárias para memória e justificativa, mas seu volume dificulta carregamento recorrente. O tamanho G não distingue volume de código de dificuldade de raciocínio. Planos prévios, investigações e estudos se misturam na raiz de rascunhos; o estado do épico pode ser repetido em vários documentos.

O épico TASK-RF-059 foi executado em 27 fatias, com contratos comuns, planos individuais e revisões durante o uso. A direção e as dependências evoluíram. A TASK-RF-082 foi deliberadamente criada fora desse épico, embora tenha plano prévio na mesma coleção.

## Alternativas e mérito técnico

| Alternativa | Avaliação | Custo |
|---|---|---|
| Acrescentar texto às instruções existentes | Continua dependendo de descoberta e memória; instrução já existente não impediu o desvio | Baixo, insuficiente |
| Habilidades curtas, diretrizes geradas, contrato verificável e lint proporcional | Orienta descoberta, exige evidência de aplicação e verifica parte do resultado | Médio; escolhida |
| Motor externo de workflow | Introduz infraestrutura para uma lacuna de consistência e contexto | Alto; desnecessário |

O nome consolidado para o refinamento progressivo é planejamento em ondas (rolling wave planning): detalhar o trabalho próximo e manter o distante em nível de resultado, fronteiras e dependências. Referência: [PMI](https://www.pmi.org/blog/optimize-your-project-life-cycle-using-agile).

Não introduzir dependência de runtime apenas para orquestrar o processo. Reaproveitar as capacidades e bibliotecas existentes; avaliar novas dependências na fatia em que houver necessidade concreta.

## Duas habilidades centrais

| Habilidade | Fonte | Papel |
|---|---|---|
| planejamento | `.mentor/skills/planejamento/SKILL.md` | Entender o problema; descobrir stack e padrões; selecionar decisões, reuso e habilidades; classificar; definir entrega e fatias |
| consistencia-do-projeto | `docs-mentor/skills/consistencia-do-projeto/SKILL.md`, ou raiz administrativa resolvida, gerada | Apresentar diretrizes vigentes, alcance e origem |

O núcleo ordenará carregar planejamento em planejamento prévio, individual e replanejamento, independentemente da seleção heurística de habilidades do modelo. Essa habilidade manda consultar contexto, habilidade de consistência e padrões de stack pertinentes.

O procedimento detalhado vive em `.mentor/processos/planejamento.md`. O SKILL.md deve ser curto e apontar para o processo; os processos de tarefa e rascunho apontam para a mesma fonte. Portões e autorizações continuam definidos pelo núcleo. O pacote não impõe React a outros projetos.

A IA seleciona as demais habilidades conforme o trabalho, registra motivos e carrega as fontes pertinentes na execução. Copiar uma diretriz para a narrativa não dispensa consultar habilidades nem conferir mudanças nas fontes. O CLI confere disponibilidade e referências, mas não prova leitura ou compreensão pelo modelo.

## Níveis, tarefas avulsas e épicos

Há dois níveis usando o mesmo método:

1. Planejamento prévio: problema, direção, evidências, alternativas, contratos comuns e tarefas candidatas.
2. Planejamento individual: implementação da tarefa, arquivo por arquivo, aceites, validação, impacto e riscos.

Uma tarefa localizada pode ir diretamente ao planejamento individual. Não exigir rascunho separado por rotina.

Tarefa avulsa e fatia usam os mesmos campos: decisões aplicáveis, reuso, habilidades e avaliação. A fatia acrescenta vínculo com pai, dependências técnicas, composição e herança explícita. A coordenadora usa os mesmos conceitos na escala do épico e mantém plano_do_epico; execução direta é não aplicável.

## Ciclo em ondas

Ideia → planejamento prévio → decisão de escopo → registro das tarefas autorizadas → planejamento individual → aprovação → execução/validação → aprendizado.

Preservar do laboratório: contratos comuns, entregas observáveis, aprofundamento das próximas fatias, dependências reais, revisões por aprendizado e handoff quando necessário. Corrigir duplicação manual de estado, revisões sem substituição explícita e classificação genérica G para tudo.

Antes de executar uma fatia: conferir código e entregas anteriores; carregar decisões/habilidades; atualizar arquivos, aceites, riscos e avaliação; apresentar mudanças materiais. O primeiro plano individual exige aprovação. Replanejamento preserva a autorização para o que continua válido e pede aprovação das diferenças materiais. Escopo novo, comportamento novo, dependência nova e contrato alterado são diferenças materiais.

Aprovar a direção não autoriza execução de fatias, fechamento, commit de código ou publicação. Registrar, importar, vincular ou iniciar não significa aprovar. Portões continuam por ato.

## Classificação para escolher modelo e effort

Preservar esforço humano/IA P/M/G/XG existente como carga estimada. Registrar complexidade separada, sem reclassificar automaticamente o histórico.

| Eixo | Pergunta |
|---|---|
| Tamanho/carga | Volume e contexto; precisa dividir? |
| Complexidade | Quanto raciocínio e investigação exige? |
| Risco | Qual a consequência de erro? Aplicar política existente |
| Perfil de modelo | Qual capacidade é indicada? |
| Effort | Quanto raciocínio configurar no modelo escolhido? |

Complexidade é o maior nível de quatro dimensões: incerteza; profundidade de raciocínio; acoplamento; dificuldade de obter validação discriminatória. Registrar a dimensão dominante e a justificativa.

| Complexidade | Perfil inicial | Effort |
|---|---|---|
| Baixa: solução localizada, conhecida e verificável | Econômico | Baixo |
| Moderada: integração local e estados conhecidos | Geral | Médio |
| Alta: contratos, migração, concorrência ou raciocínio especializado | Geral com maior capacidade ou avançado | Alto |
| Muito alta: hipóteses concorrentes e invariantes/arquitetura difíceis | Avançado | Alto; máximo se justificado |

Avaliar planejamento e execução separadamente. Investigação difícil pode produzir implementação simples. Spike resolve uma incerteza nomeada; não nasce automaticamente de complexidade alta. XG continua exigindo divisão antes de execução.

Nomes comerciais ficam fora do pacote. O projeto pode mapear perfis para modelos disponíveis, sem seleção automática ou esforço não suportado. Calibrar pelo uso real, sem transformar contagem de arquivos em medida de dificuldade.

## Organização de rascunhos

Planejamentos prévios ficam na raiz administrativa em `rascunhos/planejamentos/`, não na fila de tarefas. Pequenos cabem em um arquivo; maiores podem ter README de navegação, direção, contratos, fatias, revisões e insumos.

Categorias: planejamentos, investigacoes, interfaces e produto. Criar só com conteúdo. A raiz continua caixa de entrada do anotar. Estudos específicos ficam nos insumos do planejamento.

Revisões materiais declaram o que substituem. Não mover planos referenciados antigos; reorganização de material sem referência é trabalho posterior. Datas, IDs, nomes e índices são gerados pelo Mentor.
