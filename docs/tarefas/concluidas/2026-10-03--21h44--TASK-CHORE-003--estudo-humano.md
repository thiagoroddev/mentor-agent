# TASK-CHORE-003 · Fatia A: Permitir configuracao da pasta de ADRs no contexto

Plano de referencia: `docs/rascunhos/planejamentos/2026-10-03--evolucao-do-planejamento-do-mentor/fatias/fatia-a-origem-configuravel-adrs.md`

## 1. Identificação e Metadados

* **Identificador**: `TASK-CHORE-003`
* **Título**: Permitir configuração da pasta de ADRs no `contexto.json` com fallback seguro
* **Tipo**: `CHORE`
* **Cerimônia**: `Standard`
* **Perfil**: `completo`
* **Esforço estimado**: Humano `M`, IA `M`

---

## 2. Contrato Operacional

### 2.1 Decisões Aplicáveis (`decisoes_aplicaveis`)
* **Origem única da verdade**: A pasta das ADRs deve ser resolvida uma única vez em `caminhos()` (`arquivos.ts`), garantindo que todos os consumidores (`c.adr`) utilizem o mesmo caminho canônico (contagem, doctor, restrições, auditoria, CLI e geradores).
* **Fallback transparente**: Se o campo não estiver declarado ou for `null`, manter o comportamento atual (`join(docs, 'arquitetura', 'ADR')`), sem quebrar projetos existentes.
* **Segurança e proteção de fronteira**: Caminhos declarados devem permanecer estritamente dentro da raiz do projeto. Caminhos absolutos externos ou tentativas de travessia (`../`) devem falhar imediatamente com erro claro e descritivo.

### 2.2 Reuso (`reuso`)
* **Existentes**:
  * `arquivos.ts`: função `caminhos()`, `raizProjeto()`, `pastaDeDocumentos()`.
  * `vistas.ts`: contagem `adrs: listar(c.adr, '.md').length`.
  * `restricoes.ts`: localização de ADRs vinculadas e diagnóstico de restrições fundadoras via `c.adr`.
  * `cmd-doctor.ts`: `relativo(c.adr)`.
  * `cmd-fila.ts` e `cmd-init.ts`: criação e listagem via `c.adr`.
* **Novos**:
  * Função utilitária interna em `arquivos.ts` para leitura e sanitização de `onde_ficam_as_adrs`.

### 2.3 Habilidades (`habilidades`)
* **Planejamento**: `planejamento` (avaliação de dependências e fronteiras).
* **Execução**: `test-design` (elaboração de cenários de teste cobrindo fallback, configuração explícita e rejeição de path traversal).

### 2.4 Avaliação (`avaliacao`)
* **Planejamento**:
  * Complexidade: `baixa`
  * Dimensão dominante: `incerteza` (definir nome exato do campo no esquema)
  * Risco: `baixo`
  * Perfil de modelo: `geral`
  * Effort: `baixo`
* **Execução**:
  * Complexidade: `moderada`
  * Dimensão dominante: `acoplamento` (garantir que `caminhos()` mantenha alta performance e resolva para todos os consumidores)
  * Risco: `baixo`
  * Perfil de modelo: `geral`
  * Effort: `médio`

---

## 3. Especificação Técnica Arquivo por Arquivo

### 1. `.mentor/scripts/arquivos.ts`
* Implementar a resolução de `c.adr`:
  * Ler `contexto.json` se existir na pasta de documentos do projeto (`docs`).
  * Consultar o campo configurado (adotando `arquitetura.onde_ficam_as_adrs`, com tolerância a `convencoes.onde_ficam_as_adrs` caso configurado ali).
  * Validar se o caminho resolvido não sai da raiz do projeto (`relative(r, abs)` não pode começar com `..` nem ser absoluto fora de `r`). Se sair, lançar erro explícito.
  * Se não declarado, nulo ou vazio, recair para o fallback padrão: `join(docs, 'arquitetura', 'ADR')`.

### 2. `.mentor/scripts/tipos.ts`
* Tipar o novo campo na interface `Contexto` (tanto em `arquitetura` quanto em `convencoes`, como `string | null | undefined`).

### 3. `.mentor/esquemas/contexto.json`
* Adicionar a chave `"onde_ficam_as_adrs": null` na seção `arquitetura` (e referenciar no esquema correspondente).

### 4. `testes/` (novo cenário ou em suite existente)
* Adicionar testes unitários/integrados cobrindo:
  1. *Fallback*: projeto sem configuração usa `docs-mentor/arquitetura/ADR` (ou `docs/arquitetura/ADR` se legado).
  2. *Configuração válida*: projeto com `onde_ficam_as_adrs: "docs/arquitetura/ADR"` faz `caminhos().adr` apontar com precisão para essa pasta, e `contagens.adrs` / `restricoes` leem os arquivos dessa pasta.
  3. *Tentativa de travessia (Path Traversal)*: configuração com `../../fora` lança erro descritivo e barra a operação.
  4. *Idempotência e performance*: chamadas consecutivas a `caminhos()` mantêm comportamento consistente.

---

## 4. Critérios de Aceite

1. `caminhos().adr` aponta para o diretório configurado em `contexto.json` quando especificado.
2. Na ausência de declaração, `caminhos().adr` aponta para o caminho padrão sem qualquer regressão.
3. Consumidores existentes (`vistas.ts`, `restricoes.ts`, `cmd-doctor.ts`, `cmd-fila.ts`) encontram as ADRs na nova localização declarada sem alterações individuais em seus códigos.
4. Tentativa de configurar caminho fora da raiz do projeto é rejeitada com erro de configuração explícito.
5. Os gates `node mentor.mjs tipos` e a bateria de testes passam sem regressões.

---

## 5. Desfecho e Validação Real

### Comportamento Observado
A resolução de `c.adr` foi centralizada na função `pastaDeAdrs(r, docs)` em `arquivos.ts`. A função lê o caminho configurado em `contexto.json` sob `arquitetura.onde_ficam_as_adrs` (com suporte alternativo a `convencoes.onde_ficam_as_adrs`), normaliza o caminho e assegura que ele resida estritamente dentro da raiz do projeto (`r`). Tentativas de path traversal lexical (`../`) ou por link simbólico apontando para fora da raiz lançam erro explícito. Quando não configurado ou em branco, recai transparentemente para `join(docs, 'arquitetura', 'ADR')`.

### Validação Realizada
- **Testes de unidade dedicados**: Criada a suíte `testes/adrs-configuraveis.test.ts` com 7 cenários automatizados cobrindo fallback padrão, fallback legado, configuração em `arquitetura`, configuração em `convencoes`, rejeição de path traversal relativo, rejeição de caminho absoluto externo e rejeição de symlink externo.
- **Integração na suíte de testes**: Integrado em `testes/cenarios/31-testes-de-unidade.ts`.
- **Gates**:
  - `tipos`: `npx tsc --noEmit` executado e aprovado (código 0).
  - `testes`: `node testes/executar.ts` executado e aprovado com sucesso.
- **Critérios de aceite**: Os 4 critérios foram evidenciados com código 0 e registrados no JSON da tarefa.
- **Integridade do pacote**: `node mentor.mjs manifesto` regenerou o manifesto de 84 arquivos; `node mentor.mjs verificar` aprovado nas 4 famílias de integridade; `node mentor.mjs doctor` operacional.

### Limites e Decisões
A alteração é estritamente no pacote do Mentor e não modifica arquivos dos projetos consumidores. A configuração das 10 ADRs do piloto em `docs/arquitetura/ADR` agora pode ser feita de forma nativa e segura no `contexto.json` do consumidor.

