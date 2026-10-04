---
name: planejamento
description: Entender o problema, descobrir stack e padrões, selecionar decisões (ADRs), reuso e habilidades, avaliar complexidade/modelo/effort e estruturar entregas e fatias em ondas.
---

# Habilidade · Planejamento e Estruturação de Trabalho

Esta habilidade orienta o planejamento consistente de qualquer trabalho no `mentor-agent`, cobrindo tanto o **planejamento prévio** (épicos e rascunhos) quanto o **planejamento individual** (tarefas avulsas e fatias).

O procedimento detalhado e canônico vive em **`.mentor/processos/planejamento.md`**.

---

## 1. Descoberta Obrigatória Antes de Propor Soluções

Antes de desenhar arquivos, comandos ou fatias, execute a sequência de descoberta:

1. **Entenda o Problema Real (não apenas a solução sugerida):**
   - Identifique o problema de fundo e formule o problema canônico na literatura/engenharia se houver.
   - Trate soluções sugeridas pelo operador como hipóteses válidas a comparar, nunca como especificação rígida pré-aprovada.
2. **Consulte o Contexto e Padrões do Projeto:**
   - Inspecione `docs-mentor/contexto.json` (ou `docs/contexto.json`) para limitações de arquitetura, ferramentas e convenções ativas.
   - Consulte `docs-mentor/padroes-de-stack/` (ou `docs/padroes-de-stack/`) para os padrões vigentes das ferramentas tocadas.
3. **Consulte a Habilidade de Consistência e Decisões (ADRs):**
   - Inspecione a habilidade gerada `consistencia-do-projeto` (ou as ADRs originais sob a pasta resolvida) para identificar diretrizes normativas ativas aplicáveis ao escopo.
   - Preencha `plano.decisoes_aplicaveis` citando diretrizes pertinentes, como são cumpridas ou o motivo justificado de ausência.
4. **Inventarie Reuso Antes de Criar Novos Artefatos:**
   - Identifique componentes, funções, modelos, esquemas ou contratos já existentes que cobrem parte da necessidade.
   - Declare novos artefatos apenas quando indispensáveis, justificando localização e motivo em `plano.reuso`.
5. **Selecione Habilidades de Execução:**
   - Mapeie explicitamente quais habilidades especializadas (`ui-design`, `test-design`, `data-modeling`, `contratos-de-api`, etc.) devem ser carregadas e exercidas durante a execução, registrando-as em `plano.habilidades.execucao`.

---

## 2. Avaliação Separada: Planejamento vs Execução

Avalie separadamente a carga de trabalho do planejamento e a da execução nos seguintes eixos:

- **Tamanho/Carga:** `P`, `M`, `G` ou `XG` (esforço humano e esforço IA). *XG exige divisão obrigatória antes de executar.*
- **Complexidade:** determinada pela dimensão mais alta entre:
  1. *Incerteza:* desconhecimento do domínio, APIs externas não comprovadas ou premissas abertas.
  2. *Profundidade de raciocínio:* cadeias lógicas extensas, algoritmos não triviais ou invariantes rígidos.
  3. *Acoplamento:* múltiplos módulos, contratos compartilhados ou impacto entre subsistemas.
  4. *Validação discriminatória:* dificuldade de construir testes ou provas definitivas de funcionamento.
- **Perfil de Modelo Inicial:**
  - *Baixa complexidade:* modelo econômico, effort baixo.
  - *Moderada complexidade:* modelo geral, effort médio.
  - *Alta complexidade:* modelo geral de maior capacidade ou avançado, effort alto.
  - *Muito alta complexidade:* modelo avançado, effort alto/máximo.
- Registre a dimensão dominante e justificativa em `plano.avaliacao`.

---

## 3. Planejamento em Ondas (*Rolling Wave Planning*)

- **Próximo Trabalho:** detalhado em nível de arquivo por arquivo, critérios de aceite verificáveis, impacto, riscos e comandos de teste.
- **Trabalho Distante (fatias futuras):** mantido em nível de resultado observável, fronteiras de responsabilidade, dependências e contratos previstos.
- **Replanejamento:** ao aprender com a execução ou com novas evidências, atualize contratos e fatias mantendo o que permanece válido e solicitando autorização explícita para diferenças materiais (novo escopo, novo comportamento, nova dependência ou contrato alterado).

---

## 4. Trabalho Paralelo e Múltiplas Sessões

Quando um épico ou conjunto de tarefas envolver múltiplas sessões ou agentes simultâneos:
- Aplique o **Protocolo de Trabalho Paralelo** ([`.mentor/processos/trabalho-paralelo.md`](../../processos/trabalho-paralelo.md)) e o modelo de atribuição ([`.mentor/modelos/atribuicao-paralela.md`](../../modelos/atribuicao-paralela.md)).
- Pré-cadastre todas as tarefas do lote na reserva antes de iniciar a execução em worktrees separadas, evitando colisão de IDs.
- Garanta disjunção estrita dos arquivos em `plano.muda` entre tarefas paralelas.
- Distribua tarefas por independência e capacidade necessária, sem criar papéis fixos ou permanentes por modelo: agentes são substituíveis e o histórico é preservado na tarefa.

Para detalhes completos sobre formato de arquivos, ciclo em ondas e preservação de memória operacional, consulte **`.mentor/processos/planejamento.md`**.

