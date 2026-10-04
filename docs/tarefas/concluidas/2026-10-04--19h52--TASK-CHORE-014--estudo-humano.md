# TASK-CHORE-014 · Trabalho paralelo por slots no Mentor

Plano de referencia: docs/rascunhos/planejamentos/2026-10-04--trabalho-paralelo-por-slots
<!-- mentor:plano:inicio sha256="1dc77fb59348a06ea9dac3261019d81ef3366020d6c5559a1e67b40eaaf065dc" -->

# Épico: trabalho paralelo por slots no Mentor

Planejamento prévio solicitado pelo mantenedor em 04/10/2026 para execução posterior por outro modelo. O resultado pretendido é permitir que dois, três ou mais agentes autônomos trabalhem no mesmo projeto com worktrees separadas, tarefas rastreáveis e integração controlada.

**Nenhum modelo tem papel fixo.** Planejar, implementar, revisar e integrar são responsabilidades temporárias do trabalho. Codex, Antigravity e Claude podem aparecer em exemplos substituíveis; os mesmos modelos podem trocar de frente entre tarefas. Três slots são um exemplo de capacidade, não um limite do produto.

## Leitura do planejamento

1. [Problema, descoberta, alternativas e decisões](01-problema-e-decisoes.md).
2. [Protocolo operacional e contratos comuns](02-protocolo-e-contratos.md).
3. [Fatias, dependências e matriz de validação](03-fatias-e-validacao.md).
4. [Instruções para o próximo executor](04-instrucoes-para-execucao.md).
5. [Texto original e pedidos do mantenedor](referencias/00-texto-original-e-pedidos.md), preservados como histórico.

Cada fatia tem estudo técnico e contrato portátil de versão 2:

| Fatia | Entrega | Estudo |
|---|---|---|
| A | Protocolo e modelo de atribuição | [Fatia A](fatias/fatia-a-protocolo.md) |
| B | Visibilidade de tarefas nas worktrees pelo doctor | [Fatia B](fatias/fatia-b-diagnostico.md) |
| C | Resolução de gerados com falhas verificáveis | [Fatia C](fatias/fatia-c-resolvedor.md) |
| D | Alinhamento das instruções e exemplos existentes | [Fatia D](fatias/fatia-d-instrucoes.md) |
| E | Validação de concorrência e consolidação do pacote | [Fatia E](fatias/fatia-e-validacao.md) |

## Estado e autorização

O artefato entregue nesta etapa é o planejamento e seu cadastro em `docs/planos.json`. As letras A–E identificam fatias candidatas; os IDs TASK serão gerados pelo Mentor quando o mantenedor solicitar execução. Consultar tarefas vinculadas por `node mentor.mjs plano status PLAN-trabalho-paralelo-por-slots`.

O pedido atual autoriza salvar e registrar o estudo. A implementação, a criação das worktrees operacionais, a finalização de tarefas, commits, push e publicação pertencem à execução futura e às autorizações correspondentes. O próximo agente deve reconhecer qualquer autorização já dada pelo mantenedor, sem pedir novamente para executar o mesmo escopo autorizado.

## Fronteira e proporcionalidade

Este repositório usa `docs/` como raiz administrativa; projetos novos usam a raiz resolvida pelo Mentor, normalmente `docs-mentor/`. Este plano mantém a raiz existente.

O épico usa Git e o ciclo atual do Mentor: worktree, branch por tarefa, contratos de fatias, `doctor`, `resolver-gerados`, gates e `pronto-para-merge`. Propõe um protocolo reutilizável, uma consulta mais útil e correções de segurança do resolvedor. O tamanho é proporcional ao pedido porque fecha as lacunas concretas do fluxo simultâneo sem construir um orquestrador externo, cadastro obrigatório de modelos ou serviço de locks.

O pacote contém orientações genéricas. Caminhos absolutos, portas, bancos de desenvolvimento, política de PR e permissões dos agentes são configurações de cada projeto consumidor. Aplicar o protocolo ao Eu Roteirizo ou a outro piloto será trabalho de implantação posterior.

<!-- mentor:plano:fim -->

## 1. Estudo Humano e Fundamentação Técnica

O épico `PLAN-trabalho-paralelo-por-slots` foi planejado e executado para habilitar equipes de múltiplos agentes seniores autônomos de IA (como Codex Astra, Antigravity, Claude Code) e engenheiros humanos a atuarem simultaneamente no mesmo repositório com o ecossistema Mentor sem colisões, perda de contexto ou retrabalho:
- **Topologia de Slots Fixos:** Elimina o desperdício de reinstalação frequente de dependências e perda de ambientes ao reaproveitar slots duráveis vinculados a Git worktrees.
- **Modelos Intercambiáveis:** Assegura que ferramentas não tenham papéis engessados ou proprietários sobre partes do código, garantindo substituição fluida em handoffs sem perda do histórico do Portão 1.
- **Serialização First-to-Merge:** Conecta as branches paralelas de forma determinística na linha principal, onde `mentor resolver-gerados` arbitra 3-way metadados administrativos e encerra com código 1 caso haja conflitos não resolvidos em código de aplicação.
- **Isolamento e Visibilidade:** O `mentor doctor` fornece visão unificada de todas as worktrees ativas e tarefas em execução, sem riscos de efeitos colaterais.

## 2. Composição das Fatias do Épico

O épico foi dividido e entregue através de cinco fatias atômicas e encadeadas:
1. **`TASK-CHORE-015` (Fatia A - Protocolo e Atribuição por Slots):** Criou `.mentor/processos/trabalho-paralelo.md`, `.mentor/modelos/atribuicao-paralela.md` e `docs/padroes-de-stack/git.md`.
2. **`TASK-CHORE-016` (Fatia B - Diagnóstico de Worktrees no Doctor):** Desenvolveu `.mentor/scripts/worktrees.ts` com parsing porcelain `-z` de worktrees e integridade do `doctor`, com 7 testes unitários em `testes/worktrees-paralelas.test.ts`.
3. **`TASK-CHORE-017` (Fatia C - Resolvedor com Falhas Verificáveis):** Aprimorou `.mentor/scripts/cmd-resolver.ts` para checagem estrita de índice Git (`git diff --diff-filter=U`), staging exclusivo de sucessos e saída 1 para conflitos externos, validado com 4 testes unitários em `testes/resolvedor-paralelo.test.ts`.
4. **`TASK-CHORE-018` (Fatia D - Instruções Coerentes de Trabalho Paralelo):** Harmonizou `.mentor/processos/planejamento.md`, `tarefa.md`, `entrega.md`, `teste.md`, skill de planejamento, CLI e `README.md`.
5. **`TASK-CHORE-019` (Fatia E - Validação Integrada e Consolidação):** Entregou o cenário E2E `testes/cenarios/33-trabalho-paralelo.ts`, consolidou os runners em `31-testes-de-unidade.ts` e `executar.ts` (33 cenários verdes) e atualizou `CHANGELOG.md` e `manifesto.json`.

## 3. Desfecho e Validação Real

Todas as 5 fatias foram concluídas com sucesso e integradas à branch de trabalho. A suíte completa oficial de 33 cenários foi executada e aprovada com 100% de sucesso. O comando `node mentor.mjs verificar` aprovou todas as 5 famílias estruturais do Mentor (marcadores, tetos de texto, integridade referencial, carregamento e diretrizes arquiteturais).

```json mentor:memoria
{
  "resultado": "Épico concluído com sucesso: o Mentor agora suporta formalmente equipes simultâneas multi-agente por slots com isolamento via worktrees, modelo de atribuição, diagnóstico no doctor, resolução semântica com falhas verificáveis e validação completa em 33 cenários.",
  "aprendizados": [
    "A divisão do trabalho em fatias atômicas com contratos portáteis v2 permitiu avançar de ponta a ponta com verificação granular sem sobrecarga ou conflitos.",
    "O tratamento de worktrees do Git via porcelain -z elimina ambiguidades causadas por espaços ou formatações de plataforma em sistemas operacionais diversos."
  ],
  "limites_conhecidos": [
    "Portas de dev servers e variáveis locais de ambiente (.env.local) continuam sob responsabilidade de cada slot e projeto consumidor."
  ]
}
```

