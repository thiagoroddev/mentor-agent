# Exemplo da TASK-RF-082: tarefa avulsa com plano prévio

## Fontes verificadas

Projeto origem: `E:/repositorios/projetos-pessoais/pilotos/teste-mentor-comagenteantigo`.

- JSON: `docs-mentor/tarefas/concluidas/2026-10-03--14h20--TASK-RF-082.json`.
- Estudo humano: `docs-mentor/tarefas/concluidas/2026-10-03--14h20--TASK-RF-082--estudo-humano.md`, consultado por pedido explícito.
- Plano prévio: `docs-mentor/rascunhos/2026-09-22--agrupamento-formulas-laboratorio/fatias/j3-romaneio-de-teste.md`.

A tarefa criou romaneios de teste no laboratório e exportação XLSX como romaneio bruto. Tem RF-69, fatia_de null, esforço humano M/IA G, 15 arquivos e 10 critérios. O plano prévio diz fora do épico TASK-RF-059 por decisão do mantenedor. Não inventar vínculo com pai.

O JSON tem aproximadamente 18 KB; o estudo tem aproximadamente 21 KB. JSON não fica barato apenas por não ser Markdown; retirar repetição de logs requer adaptação dos consumidores e preservação das evidências.

## Como ficaria

Preservar os campos atuais do plano. Acrescentar os quatro campos estruturados, com o conteúdo ilustrativo abaixo. Este exemplo foi avaliado depois da conclusão: não afirma carregamento de habilidades nem autorização/classificação histórica. IDs específicos de diretrizes serão definidos na normalização das ADRs; referências aqui são às ADRs reais.

```json
{
  "plano": {
    "versao": 2,
    "decisoes_aplicaveis": [
      {"adr": "ADR-004", "aplicacao": "Reutilizar Button e Input; criar ScenarioCreatorCard como componente de dominio do laboratorio."},
      {"adr": "ADR-006", "aplicacao": "Preservar identidade/tokens vigentes, distinguindo marca da paleta funcional do mapa."},
      {"adr": "ADR-008", "aplicacao": "Consultar a paleta por tipo sem transferir automaticamente regras exclusivas do modo Original."}
    ],
    "reuso": {
      "existentes": [
        "src/components/ui/button.tsx",
        "src/components/ui/input.tsx",
        "src/utils/markers/markerColors.ts",
        "src/services/graphCache.ts: loadRoadGraph",
        "src/utils/routing/osm.ts: bboxFromPoints",
        "src/utils/routing/graph.ts: nearestNode",
        "src/utils/inferLocationType.ts",
        "storage.ts do laboratorio",
        "parser bruto existente e biblioteca xlsx instalada"
      ],
      "novos": [
        {"artefato": "ScenarioCreatorCard", "local": "browser/components do laboratorio", "motivo": "Interface especifica composta sobre primitivas existentes."},
        {"artefato": "exportSpreadsheet", "local": "browser do laboratorio", "motivo": "Serializacao reutilizavel de cenarios criados ou editados."}
      ]
    },
    "habilidades": {
      "planejamento": [
        {"nome": "planejamento", "motivo": "Escopo, contratos, divisao e capacidade."},
        {"nome": "consistencia-do-projeto", "motivo": "Decisoes vigentes de UI, identidade e mapa."},
        {"nome": "ui-design", "motivo": "Criacao, cancelamento, validacao, avisos e reuso."}
      ],
      "execucao": [
        {"nome": "ui-design", "motivo": "Composicao, estados e acessibilidade."},
        {"nome": "test-design", "motivo": "Exclusividade de cenario, integracao e round-trip."}
      ]
    },
    "avaliacao": {
      "planejamento": {
        "complexidade": "alta",
        "dimensao_dominante": "incerteza",
        "justificativa": "Definir alcance da validacao viaria, substituicao do cenario e compatibilidade.",
        "perfil_modelo": "avancado",
        "effort": "alto"
      },
      "execucao": {
        "complexidade": "alta",
        "dimensao_dominante": "acoplamento",
        "justificativa": "Mapa, React, consulta de malha, persistencia e exportacao/importacao.",
        "perfil_modelo": "geral",
        "effort": "alto"
      }
    }
  }
}
```

O tamanho do escopo de 15 arquivos sinaliza XG pela régua atual; no planejamento novo seria reconsiderada a divisão entre exportação XLSX e criação interativa com validação. Não reclassificar nem dividir retrospectivamente a tarefa encerrada.

O estudo humano manteria pedido, objetivos, mérito/alternativas, comportamento, tabela por arquivo, dez aceites, risco/proporcionalidade e roteiro manual completos. Acrescentaria consistência, reuso, habilidades/avaliação, revisões quando existirem e Desfecho e Validação Real. O CLI promove todo esse documento, sem resumi-lo a estes campos.

## Aprendizados operacionais que o novo processo deve preservar

1. Endereço e classificação residencial/comercial precisam sobreviver ao ciclo de exportação/importação.
2. A UI do laboratório também usa o sistema de componentes e tokens, respeitando a paleta funcional.
3. A checagem atual em LaboratoryPage usa proximidade de até 250 m de um nó; não prova sozinha conectividade de um percurso completo. Não documentar garantia mais forte do que o código.
4. Button disabled aplica opacidade e bloqueio de interação, não cinza automático.
5. O plano humano afirma 12 arquivos sem tocar src, mas lista 15 incluindo src/utils/inferLocationType.ts. Preservar o texto inicial como histórico e registrar ampliação/correção em revisão identificada; contrato operacional atualizado não deve manter afirmação contraditória.
6. Escrever comportamento observado e limitações no desfecho, distinguindo verificação automatizada, código inspecionado e teste manual realmente realizado.

Nenhum artefato original da tarefa foi modificado ou copiado para reconstruir autorização histórica.
