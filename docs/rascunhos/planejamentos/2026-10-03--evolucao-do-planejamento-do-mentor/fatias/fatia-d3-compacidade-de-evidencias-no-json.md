# Fatia D3: Compacidade de evidências no JSON e adaptação de consumidores

## 1. Identificação e Metadados

* **Identificador da Fatia**: `Fatia D3`
* **Título**: Compacidade de evidências no JSON e adaptação de consumidores
* **Épico**: `PLAN-2026-10-03--evolucao-do-planej` (Evolução do planejamento do Mentor)
* **Tipo**: `CHORE`
* **Cerimônia**: `Standard`
* **Perfil**: `completo`
* **Esforço estimado**: Humano `M`, IA `G`
* **Classificação de Modelo**:
  * **Complexidade**: Alta (estruturação de evidências de critérios e gates, geração padronizada de arquivos de log, ponteiros relativos e retrocompatibilidade com tarefas legadas).
  * **Dimensão dominante**: Acoplamento e Consistência (integração entre execução de critérios, execução de gates, tipos TypeScript, esquemas e consumidores de auditoria).
  * **Perfil de modelo**: Geral de maior capacidade ou avançado.
  * **Effort**: Alto.
* **Dependências**:
  * Fatia D1 (`TASK-CHORE-007` - Campos novos nos contratos locais/portáteis) — Concluída.
  * Fatia D2 (`TASK-CHORE-008` - Cópia integral do plano e memória operacional) — Concluída.

---

## 2. Contexto e Motivação

Conforme estabelecido nas diretrizes arquiteturais e no documento `03-artefatos-de-tarefa.md`:
1. O estudo técnico humano extenso permanece intacto na narrativa (`--estudo-humano.md`), enquanto o JSON da tarefa (`<ID>.json`) deve ser ultra-eficiente para consumo por agentes e LLMs.
2. Atualmente, a execução de critérios via `mentor task criterio <ID> <indice> --comando "..."` grava até 4.000 caracteres de stdout/stderr bruto diretamente dentro do campo `evidencia.saida` no JSON da tarefa, sem gerar arquivo de log externo nem registrar `log_ref`.
3. Em tarefas com múltiplos critérios, o JSON da tarefa fica desnecessariamente inflado com logs volumosos que prejudicam a janela de contexto de modelos de IA e poluem o diff do repositório.
4. Para gates, o `executor-gates.ts` já gera logs em `docs/.evidencias/logs/` e anota `log_ref`, mas os consumidores de evidência e a ferramenta `criterio` ainda não operam sob um padrão unificado de compacidade.

A **Fatia D3** resolve essa discrepância:
* **Compacidade em critérios de aceite**: Execução de critérios com `--comando` passa a persistir o log completo em `docs/.evidencias/logs/<ID>-criterio-<indice>-<timestamp>.log`, guardando no JSON apenas um resumo conciso (`saida`) e o ponteiro (`log_ref`).
* **Unificação do modelo de evidência**: `EvidenciaCriterio` em `tipos.ts` recebe suporte a `log_ref`, alinhando-se ao modelo de `RegistroGate`.
* **Função utilitária de resolução de log**: Introdução de helper transparente para recuperar o log completo de qualquer evidência (lendo do arquivo apontado por `log_ref` ou recuando para `saida` quando o arquivo não existir ou for registro legado).
* **Compatibilidade estrita com o legado**: Tarefas concluídas e abertas existentes sem `log_ref` permanecem 100% válidas, legíveis e funcionais.

---

## 3. Especificação Técnica Arquivo por Arquivo

### 1. `.mentor/scripts/tipos.ts`
* Atualizar interface `EvidenciaCriterio`:
  ```ts
  export interface EvidenciaCriterio {
    comando?: string | null
    codigo_saida?: number | null
    saida?: string | null
    executado_em?: string | null
    log_ref?: string | null
    resumo?: string | null
  }
  ```

### 2. `.mentor/esquemas/tarefa.json`
* Adicionar documentação e propriedades de `log_ref` e `resumo` no esquema de `criterios_aceite`.

### 3. `.mentor/scripts/cmd-tarefa.ts`
* Atualizar a função `criterio(id, indiceStr, flags)`:
  * Quando executado com `--comando`:
    * Persistir a saída bruta em `docs/.evidencias/logs/<ID>-criterio-<idx>-<timestamp>.log` garantindo `.gitignore` na pasta de logs.
    * Anotar o caminho relativo em `evidencia.log_ref`.
    * Gravar no campo `evidencia.saida` uma versão concisa (primeiras 3 linhas + sumário omitido + últimas 3 linhas, ou max 500 caracteres).
  * Quando informado com `--saida`:
    * Se exceder 500 caracteres, persistir em log e compactar em `saida`, anotando `log_ref`.
    * Se for curto, manter diretamente.
* Adicionar helper exportado `obterLogDeEvidencia(evidencia: { saida?: string | null; log_ref?: string | null }, raiz?: string): string`:
  * Lê do arquivo apontado por `log_ref` se existir; caso contrário, devolve `saida ?? ''`.

### 4. `.mentor/scripts/executor-gates.ts`
* Assegurar que `obterLogDeEvidencia` também possa ser utilizado por consumidores de gates.

### 5. `testes/compacidade-de-evidencias.test.ts` (Nova Suíte)
* Testar:
  * Registro de critério via comando com geração de log em `docs/.evidencias/logs/` e `log_ref` relativo.
  * Compacidade do campo `saida` no JSON (teto conciso sem perda do log em disco).
  * Resolução transparente via `obterLogDeEvidencia`.
  * Retrocompatibilidade com registros legados sem `log_ref`.
* Integrar em `testes/cenarios/31-testes-de-unidade.ts`.

### 6. Documentação, Manifesto e Changelog
* Atualizar `CHANGELOG.md` e regenerar `.mentor/manifesto.json`.

---

## 4. Critérios de Aceite

1. `mentor task criterio <ID> <indice> --comando "..."` grava o log completo em `docs/.evidencias/logs/` e registra o ponteiro `log_ref` na evidência do JSON da tarefa.
2. O campo `evidencia.saida` no JSON da tarefa contém apenas um resumo conciso da execução (não excedendo o limite compacto).
3. A função utilitária `obterLogDeEvidencia` recupera com fidelidade o log completo a partir de `log_ref`, e realiza fallback seguro para `saida` em tarefas legadas.
4. Tarefas e evidências históricas pré-existentes permanecem perfeitamente válidas nos esquemas e acessíveis pelos comandos do Mentor.
5. A bateria de testes unitários Nível 1 passa com código 0 e sem regressões.
