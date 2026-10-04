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
