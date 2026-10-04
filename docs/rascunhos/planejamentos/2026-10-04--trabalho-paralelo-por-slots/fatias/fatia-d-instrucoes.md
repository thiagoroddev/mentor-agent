# Fatia D: Instruções coerentes de trabalho paralelo

## Resultado e dependências

Depende de A; as interfaces públicas planejadas de B/C podem orientar o texto enquanto essas fatias avançam. Integração final E só publica documentação coerente com o código efetivamente entregue. Carga M/G, revisão por acoplamento de instruções; sem mudança no comportamento do grafo ou nos gates.

## Mudança arquivo por arquivo

- `.mentor/processos/planejamento.md`: acrescentar uso do protocolo paralelo e contratos de fronteira; divisão por objetivo/capacidade, com dependências reais.
- `.mentor/skills/planejamento/SKILL.md`: referenciar o protocolo quando a tarefa exigir múltiplas sessões, sem novo papel permanente por modelo.
- `.mentor/processos/tarefa.md`: orientar atribuição exclusiva, handoff de sessão e reserva/cadastro do lote antes da execução. Reusar estados existentes de pausa/retomada; não criar estado “modelo-trocado”.
- `.mentor/processos/entrega.md`: ajustar a seção de épicos para restringir push acumulado a lote sequencial deliberado. Branches paralelas têm candidatos/PRs próprios e integração serial. Corrigir exemplos que assumem ausência de conflito ou que exclusão pós-squash possa ser decidida por qualquer diff isolado. Linkar cobertura e retorno do resolvedor, sem prometer arbitrar qualquer fonte.
- `.mentor/processos/teste.md`: preservar níveis atuais e regras de evidência; explicar que risco Git/merge pode exigir prova focada de integração já no ciclo da tarefa. Validação combinada pertence à árvore integrada; quantidade de cenários é derivada.
- `.mentor/scripts/cli.ts`: alinhar somente a ajuda de `task fatiar` com paralelo por padrão e `--ordem` quando houver dependência. Não adicionar comando de orquestração.
- `README.md`: apresentar o protocolo, exemplo genérico de dois/três slots e referências aos comandos existentes. Não vincular um fornecedor a uma disciplina fixa.

## Validação

Conferir links, frontmatter, exemplos e coerência com código/contexto. Executar a ajuda real do CLI e verificar que não anuncia encadeamento automático. Não criar teste que apenas compara a frase escrita.

Por ter porte IA G, completar estado da arte e custo de oportunidade na tarefa usando a comparação de 01. Diferenças materiais do código de B/C são reconciliadas na integração E; se exigirem mudança de direção, registrar revisão do plano. Changelog, manifesto e runners pertencem a E.

## Critérios de aceite

1. Planejamento e sua skill orientam distribuir tarefas por independência e capacidade, com exemplo substituível de modelos. Prova: CP-01/CP-13: revisão conjunta de processo e modelo A.
2. Entrega distingue lote sequencial e branches paralelas, respeitando política de PR do consumidor e integração serial. Prova: CP-14: revisão dos dois fluxos e exemplos Git.
3. Teste conserva gates exigidos e exige prova da árvore combinada, permitindo prova Git focada por risco. Prova: CP-12: revisão comparada com contexto e fingerprint vigente.
4. README e ajuda do CLI descobrem o protocolo e descrevem fatiamento paralelo por padrão com --ordem explícita. Prova: Inspeção da saída de ajuda e comparação com cmd-fila.ts.

## Contrato portátil

O arquivo acompanhante `fatia-d-instrucoes.contrato.json` contém escopo, aceite, riscos, reuso, habilidades e avaliação. Herdar os documentos normativos do épico e refinar somente os pontos que mudarem antes de iniciar a tarefa.
