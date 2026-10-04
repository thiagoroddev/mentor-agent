---
carrega_quando: planejamento prévio, planejamento individual ou replanejamento
---

# Processo · Planejamento e Estruturação de Trabalho

`ENTENDER → DESCOBRIR → PLANEJAR → APROVAR (Portão 1) → EXECUTAR → REFINAR/APRENDER`

O planejamento no `mentor-agent` é um ato disciplinado de engenharia: ele existe para garantir mérito técnico, consistência com decisões arquiteturais (ADRs), reuso de capacidades existentes, escolha calibrada de modelos/effort e preservação durável do estudo humano sem auto-invalidação acidental.

---

## 1. Dois Níveis de Planejamento

O Mentor aplica o mesmo método de planejamento em duas escalas complementares:

### Nível 1: Planejamento Prévio (Épicos e Rascunhos)
- **Localização:** `docs-mentor/rascunhos/planejamentos/` (ou `docs/rascunhos/planejamentos/` dependendo da raiz administrativa resolvida).
- **Escopo:** problemas complexos, iniciativas de múltiplos passos ou mudanças arquiteturais.
- **Conteúdo:** problema de fundo, direção aprovada, evidências de investigações, alternativas profissionais consideradas, contratos comuns e lista preliminar de fatias candidatas com dependências.
- **Estrutura:** rascunhos pequenos cabem em um único arquivo; épicos maiores utilizam uma pasta dedicada com `README.md` de navegação, documentos normativos e subpasta `fatias/`.

### Nível 2: Planejamento Individual (Tarefas Avulsas e Fatias)
- **Localização:** `docs-mentor/tarefas/abertas/<ID>.json` e `<ID>.md` (com cópia integral ou vínculo ao plano registrado).
- **Escopo:** trabalho executável de uma única tarefa ou fatia no ciclo.
- **Conteúdo:** o que muda arquivo por arquivo (`plano.muda`), critérios de aceite verificáveis com comandos de teste (`plano.criterios_aceite`), impacto, riscos, decisões aplicáveis (`plano.decisoes_aplicaveis`), inventário de reuso (`plano.reuso`), seleção de habilidades (`plano.habilidades`) e avaliação multidimensional (`plano.avaliacao`).
- **Atalho:** tarefas pontuais ou localizadas podem ir diretamente ao planejamento individual sem a necessidade de criar rascunho prévio em arquivo separado.

---

## 2. Planejamento em Ondas (*Rolling Wave Planning*)

O Mentor adota a prática de **planejamento em ondas sucessivas**:
- **Trabalho Imediato:** detalhado com precisão cirúrgica antes de iniciar a execução (arquivos exatos, testes, contratos).
- **Trabalho Distante:** mantido em nível de resultado observável, fronteiras de responsabilidade, dependências lógicas e interfaces pretendidas.
- **Refinamento Contínuo:** antes de puxar a próxima fatia para o ciclo:
  1. Inspecione o código implementado e os aprendizados deixados pelas fatias concluídas.
  2. Carregue as decisões arquiteturais vigentes e as habilidades especializadas pertinentes.
  3. Atualize arquivos tocados, critérios de aceite, riscos e avaliação de modelo/effort.
  4. Apresente as mudanças materiais ao operador humano para autorização explícita no Portão 1.

---

## 3. Descoberta Obrigatória e Mérito Técnico

Antes de formalizar o plano, cumpra a rotina de descoberta:

1. **Problema Real vs Solução Sugerida:** formule o problema de fundo. A solução sugerida pelo operador é uma hipótese válida a comparar com alternativas consolidadas da indústria (RFCs, design docs, bibliotecas estabelecidas), nunca especificação final inquestionável.
2. **Contexto e Padrões de Stack:** inspecione `docs-mentor/contexto.json` e os padrões específicos em `docs-mentor/padroes-de-stack/<ferramenta>.md`. Se um padrão para a ferramenta tocada não existir, criá-lo é parte da tarefa.
3. **Consistência Arquitetural (ADRs):** inspecione a habilidade gerada `consistencia-do-projeto` (ou as ADRs na pasta resolvida pelo contexto). Registre em `plano.decisoes_aplicaveis` as diretrizes cumpridas ou o motivo formal de ausência.
4. **Inventário de Reuso:** antes de propor código ou componentes novos, liste em `plano.reuso.existentes` o que já existe no projeto e pode ser reutilizado. Para cada artefato novo em `plano.reuso.novos`, justifique a localização e a necessidade concreta.
5. **Habilidades Especializadas:** identifique quais competências devem ser acionadas durante a execução (`ui-design`, `test-design`, `data-modeling`, `contratos-de-api`, etc.) e registre-as em `plano.habilidades.execucao`.

---

## 4. Classificação Multidimensional e Calibração

O plano separa a avaliação da carga de trabalho em cinco eixos, distinguindo explicitamente o esforço de planejamento do esforço de execução:

| Eixo | O que define | Opções / Valores |
|---|---|---|
| **Tamanho / Carga** | Volume de arquivos e contexto; indicador de necessidade de divisão | `P` (1-2 arquivos), `M` (2-5 arquivos), `G` (5-12 arquivos), `XG` (12+ arquivos — **divisão obrigatória**) |
| **Complexidade** | Maior nível entre as 4 dimensões abaixo | `Baixa`, `Moderada`, `Alta`, `Muito alta` |
| **Dimensão Dominante** | Onde reside a principal dificuldade técnica | `incerteza`, `profundidade_raciocinio`, `acoplamento`, `validacao_discriminatoria` |
| **Perfil de Modelo** | Capacidade analítica recomendada | `economico`, `geral`, `avancado` |
| **Effort** | Nível de raciocínio / deliberação a configurar | `baixo`, `medio`, `alto`, `maximo` |

### As Quatro Dimensões de Complexidade
1. **Incerteza:** lacunas no domínio, comportamento não documentado de dependências ou requisitos fluidos.
2. **Profundidade de Raciocínio:** algoritmos com invariantes estritas, concorrência, grafos, parsers ou deduções lógicas de vários passos.
3. **Acoplamento:** dependências cruzadas entre subsistemas, esquemas compartilhados, migração de dados ou contratos públicos.
4. **Validação Discriminatória:** dificuldade em produzir testes determinísticos, testes dependentes de tempo, rede ou renderização visual.

### Mapeamento Sugerido de Modelo e Effort
- **Baixa Complexidade:** perfil *econômico*, effort *baixo*.
- **Moderada Complexidade:** perfil *geral*, effort *médio*.
- **Alta Complexidade:** perfil *geral de alta capacidade* ou *avançado*, effort *alto*.
- **Muito Alta Complexidade:** perfil *avançado*, effort *alto* (ou *máximo* quando formalmente justificado).

---

## 5. Preservação do Estudo Humano e Memória Operacional

1. **Cópia Integral e Idempotente:** o estudo detalhado de engenharia do Portão 1 deve ser copiado integralmente para a narrativa (`abertas/<ID>.md`) delimitado por `<!-- mentor:plano:inicio -->` e `<!-- mentor:plano:fim -->`. Repetições da importação ou vínculo preservam o documento sem duplicar texto.
2. **Memória Operacional Estruturada:** antes da finalização, na seção `## 5. Desfecho e Validação Real`, inclua o bloco estruturado de memória:
   ```json mentor:memoria
   {
     "resultado": "Resumo objetivo da entrega e comportamento observado",
     "aprendizados": [
       "Lições técnicas ou armadilhas de ambiente descobertas durante a execução"
     ],
     "limites_conhecidos": [
       "Restrições conhecidas ou casos de borda intencionalmente fora do escopo"
     ]
   }
   ```
   O CLI extrai literalmente esse bloco para o JSON final no fechamento da tarefa, alimentando o contexto de tarefas futuras sem sobrecarregar a leitura de estudos humanos concluídos.

---

## 6. Replanejamento e Diferenças Materiais

- **Quando Replanejar:** ao constatar durante a execução que as premissas originais foram refutadas, surgiram dependências dinâmicas bloqueadoras ou a solução proposta viola invariantes do projeto.
- **Autorização Preservada vs Nova Autorização:**
  - O que continua válido permanece coberto pela autorização anterior.
  - **Diferenças materiais exigem nova aprovação no Portão 1:** novo escopo, novo comportamento de usuário/API, nova dependência externa ou alteração de contratos existentes.
- **Preservação Histórica:** nunca reescreva o histórico passado de um plano como se o imprevisto tivesse sido antecipado desde o início. Registre explicitamente as seções de revisão identificando o que mudou, o motivo e a substituição acordada.

---

## 7. Não Auto-Invalidação e Integridade

- **Leitura Somente-Leitura:** consultas de andamento (`mentor plano status`, `mentor planos`, `mentor verificar`) são estritamente somente-leitura e nunca alteram arquivos normativos em disco.
- **Registro não é Autorização:** cadastrar, importar ou vincular um plano ou tarefa não constitui autorização tácita para executá-lo. Cada portão requer ato humano consciente.
