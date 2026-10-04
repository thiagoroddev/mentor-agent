# TASK-CHORE-011 · Consulta derivada de status de planos sem auto-invalidação (Fatia G)

Plano de referencia: docs/rascunhos/planejamentos/2026-10-03--evolucao-do-planejamento-do-mentor/fatias/fatia-g-plano-status.md
<!-- mentor:plano:inicio sha256="d0f2a47051947f2b4311ce27205d7e8bd8f96ca1f6093d1099a509362663592b" -->

# Fatia G: `mentor plano status` — Consulta derivada sem auto-invalidação

> **Épico**: `PLAN-2026-10-03--evolucao-do-planej` (Evolução do planejamento do Mentor)  
> **Fatia**: G  
> **Tipo**: `CHORE`  
> **Estimativa de Execução**: Esforço Humano P / IA M (Geral/Médio)  
> **Dependência**: Fatia E concluída

---

## 1. Contexto e Motivação

Conforme estabelecido em `02-consistencia-e-contratos.md` (seção *Estado sem auto-invalidação*):
> "Adicionar mentor plano status como consulta derivada de planos.json e tarefas JSON, mostrando vínculos, estado, dependências e divergências. Não reescrever o README nem outro documento normativo para atualizar andamento.
> Registro não implica aprovação. Não inferir autorização de tarefa em execução ou concluída. Registrar escopo/versão e evidência humana no portão aplicável, sem tratar declaração da IA como prova de autorização."

Hoje, o Mentor possui `mentor planos` (ou `mentor plano listar`), que apenas lista títulos, caminhos e uma lista simplificada de IDs de tarefas vinculadas. Não há comando dedicado que inspecione a integridade dos planos, verifique divergências de hash em relação ao disco, apresente o progresso das fatias (concluídas, em execução, pendentes) e destaque dependências bloqueantes, sem alterar o conteúdo documental no disco.

A **Fatia G** entrega:
1. Comando `mentor plano status [<PLANO-ID> | --arquivo <caminho>] [--json]`:
   - Computa dinamicamente a situação de cada plano registrado (ou do plano especificado).
   - Aponta a integridade da revisão do plano (revisão vigente vs divergência de hash ou arquivo ausente).
   - Relaciona todas as fatias/tarefas vinculadas, seus estados (`aberta`, `em-execucao`, `concluida`), filas (`ciclo`, `reserva`), bloqueios (`depende_de`, `bloqueada_por`) e progresso de critérios de aceite e gates.
   - Diagnostica divergências individuais de manifesto em fatias associadas via `resolverPlano()`.
   - **Garantia de Não Escrita**: O comando é estritamente somente-leitura (read-only query). Nunca altera nem reescreve arquivos `.md` normativos, prevenindo a auto-invalidação de hashes por atualização de status.

---

## 2. Escopo Arquitetural e Arquivos Impactados

1. **`.mentor/scripts/cmd-plano.ts`**:
   - Implementar e exportar `statusPlano(idOuArquivo?: string, flags: Record<string, string | undefined> = {}): void`.
   - Suporte a filtro por identificador de plano (`PLAN-...`) ou caminho de arquivo.
   - Suporte a flag `--json` para emissão estruturada legível por ferramentas.
2. **`.mentor/scripts/cli.ts`**:
   - Adicionar subcomando `status` em `case 'plano':`.
   - Atualizar texto de ajuda de `mentor plano`.
3. **`testes/plano-status.test.ts` e `testes/cenarios/31-testes-de-unidade.ts`**:
   - Suíte de testes unitários validando:
     - Formatação e saída sem escrita em disco.
     - Diagnóstico correto de revisão íntegra vs divergente.
     - Mapeamento correto de tarefas vinculadas, dependências e estados.
     - Suporte ao formato `--json`.
4. **Documentação e Manifesto**:
   - Atualizar `CHANGELOG.md` e regenerar `.mentor/manifesto.json`.

---

## 3. Critérios de Aceite

1. `mentor plano status` lista planos registrados com status de integridade do arquivo fonte (vigente ou divergente com hashes comparados).
2. Se fornecido identificador ou `--arquivo`, detalha o plano específico com suas fatias, estados, dependências e critérios.
3. Se fornecido `--json`, emite JSON estruturado válido na saída padrão.
4. Nenhuma operação de escrita em disco ou modificação de arquivo normativo ocorre durante a consulta (preservação estrita de hashes).
5. Gates de qualidade (`tipos`, `testes`) e `mentor verificar` aprovados.

<!-- mentor:plano:fim -->

## 5. Desfecho e Validação Real

A Fatia G implementou a consulta derivada de status de planos através do comando `mentor plano status [<PLANO-ID>] [--json]`, permitindo inspecionar integridade de revisão, resumo de fatias vinculadas, estados, filas, bloqueios e critérios, mantendo garantia estrita de somente-leitura sem auto-invalidação documental.

```json mentor:memoria
{
  "resultado": "Comando mentor plano status implementado e integrado na CLI com suporte a saída textual e estruturada JSON, verificação de integridade de hashes e mapeamento de tarefas vinculadas sem efeitos colaterais de escrita.",
  "aprendizados": [
    "Consultas agregadas derivadas dispensam mutação em documentos normativos e evitam qualquer invalidade acidental de hashes SHA-256.",
    "A comparação entre o hash registrado e o hash atual do arquivo fonte permite detecção precoce de alterações externas não sincronizadas."
  ],
  "limites_conhecidos": [
    "Planos que referenciam diretórios assumem o README.md como raiz de hash para a revisão principal."
  ]
}
```
