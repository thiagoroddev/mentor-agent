# Fatia D2: Cópia integral e idempotente do plano, revisões e memória operacional

## 1. Identificação e Metadados

* **Identificador da Fatia**: `Fatia D2`
* **Título**: Cópia integral e idempotente do plano, revisões e memória operacional
* **Épico**: `PLAN-2026-10-03--evolucao-do-planej` (Evolução do planejamento do Mentor)
* **Tipo**: `CHORE`
* **Cerimônia**: `Standard`
* **Perfil**: `completo`
* **Esforço estimado**: Humano `M`, IA `G`
* **Classificação de Modelo**:
  * **Complexidade**: Alta (manipulação determinística de Markdown rico, idempotência estrita, extração estruturada de memória e integridade de artefatos).
  * **Dimensão dominante**: Acoplamento e Incerteza (intersecção entre ciclo de vida da tarefa, narrativa humana e JSON operacional).
  * **Perfil de modelo**: Geral de maior capacidade ou avançado.
  * **Effort**: Alto.
* **Dependências**:
  * Fatia D1 (`TASK-CHORE-007` - Campos novos nos contratos locais/portáteis) — Concluída.

---

## 2. Contexto e Motivação

O mantenedor humano estabeleceu como invariante inegociável que o estudo técnico de engenharia detalhado deve ser preservado integralmente na narrativa da tarefa e no artefato final `--estudo-humano.md`. A IA não deve reescrever, abreviar ou resumir a prosa técnica em favor de simplificações no JSON.

Entretanto, no estado atual do Mentor:
1. `mentor task iniciar` com plano referenciado cria apenas um stub mínimo de 2 linhas (`Plano de referencia: <arquivo>`), exigindo que o usuário ou modelo copie manualmente o plano para a narrativa ou deixando a narrativa vazia até o encerramento.
2. Ao vincular planos ou iniciar tarefas repetidas vezes, não havia garantia mecânica de idempotência contra duplicação de seções ou destruição de seções posteriores como `## Desfecho e Validação Real`.
3. Ao concluir a tarefa, o JSON final não capturava uma síntese operacional curta e determinística do resultado (aprendizados e limites conhecidos) para guiar eficientemente tarefas subsequentes sem exigir releitura de dezenas de páginas de estudo humano.

A **Fatia D2** resolve esses três pontos:
* **Cópia integral e automatizada por arquivo**: `iniciar` e `vincular-plano` copiam deterministicamente o Markdown rico do plano para a narrativa da tarefa.
* **Idempotência estrita**: delimitadores discretos (`<!-- mentor:plano:inicio -->`) identificam o bloco copiado e seu hash, garantindo que reinvocações não dupliquem conteúdo nem afetem o desfecho.
* **Extração literal de Memória Operacional**: introdução do bloco ````json mentor:memoria```` dentro do Desfecho, que o CLI extrai mecanicamente para `tarefa.memoria_operacional` no JSON final no momento de `finalizar()`.

---

## 3. Especificação Técnica Arquivo por Arquivo

### 1. `.mentor/scripts/tipos.ts`
* Adicionar interface `MemoriaOperacional`:
  ```ts
  export interface MemoriaOperacional {
    resultado: string
    aprendizados: string[]
    limites_conhecidos: string[]
  }
  ```
* Adicionar campo opcional `memoria_operacional?: MemoriaOperacional | null` na interface `Tarefa`.

### 2. `.mentor/esquemas/tarefa.json`
* Adicionar campo `memoria_operacional`:
  * `"memoria_operacional": null`
  * `"memoria_operacional_nota": "Memoria operacional extraida literalmente do bloco mentor:memoria da narrativa no encerramento: { resultado, aprendizados: [...], limites_conhecidos: [...] }."`

### 3. `.mentor/scripts/narrativa.ts` (Novo Módulo)
* `incorporarPlanoNaNarrativa(conteudoAtual: string | null, tarefa: Tarefa, planoRes: PlanoResolvido): { conteudo: string; modificado: boolean }`:
  * Monta a narrativa incorporando o corpo integral de `planoRes.conteudo_md`.
  * Utiliza delimitadores `<!-- mentor:plano:inicio sha256="..." -->` e `<!-- mentor:plano:fim -->`.
  * Se o plano já estiver presente com o mesmo hash, retorna `modificado: false` sem alterar nada.
  * Se houver seções existentes (como `## Desfecho e Validação Real`), preserva-as estritamente intactas.
* `extrairMemoriaOperacional(conteudo: string): { memoria?: MemoriaOperacional; erro?: string }`:
  * Localiza o bloco ````json mentor:memoria ... ````.
  * Executa `JSON.parse` e valida as propriedades `resultado`, `aprendizados` e `limites_conhecidos`.
  * Emite diagnóstico amigável caso haja erro de sintaxe ou propriedades faltando.

### 4. `.mentor/scripts/cmd-plano.ts`
* Em `vincularPlano`:
  * Se a tarefa estiver em `abertas`, invocar `incorporarPlanoNaNarrativa` para atualizar a narrativa em disco caso ela ainda não contenha o plano completo.

### 5. `.mentor/scripts/cmd-tarefa.ts`
* Em `iniciar`:
  * Se houver `tarefa.plano_ref`, resolver o plano e invocar `incorporarPlanoNaNarrativa`, gravando a narrativa com o conteúdo integral do plano.
* Em `finalizar`:
  * Extrair a memória operacional da narrativa via `extrairMemoriaOperacional`.
  * Se a tarefa declara `versao >= 2`:
    * Se o bloco `mentor:memoria` estiver ausente, acusar impedimento: `tarefa versao 2 exige bloco "```json mentor:memoria" no Desfecho com resultado, aprendizados e limites_conhecidos`.
    * Se o bloco contiver erro de parsing/schema, acusar impedimento específico.
  * Se a tarefa for legada:
    * Se o bloco estiver presente e válido, extrair; se ausente, não bloquear.
* Em `concluir`:
  * Gravar `tarefa.memoria_operacional` no JSON final arquivado em `concluidas`.

### 6. `testes/narrativa-e-memoria.test.ts`
* Testes unitários rápidos cobrindo:
  1. Incorporação integral do Markdown do plano para a narrativa.
  2. Idempotência: repetição com mesmo hash não duplica texto nem destrói desfecho preexistente.
  3. Extração correta do bloco `mentor:memoria` com validação de schema.
  4. Validação de recusa para bloco de memória com JSON corrompido ou campos ausentes.
  5. Retrocompatibilidade: tarefas legadas concluem sem exigência de `mentor:memoria`.
* Integrar em `testes/cenarios/31-testes-de-unidade.ts`.

### 7. Documentação, Manifesto e Changelog
* Atualizar `CHANGELOG.md` em `## [Não publicado]`.
* Atualizar `.mentor/manifesto.json` via `node mentor.mjs manifesto`.

---

## 4. Critérios de Aceite

1. `incorporarPlanoNaNarrativa` copia o Markdown completo do plano para a narrativa da tarefa com delimitadores identificados e preservação de formatação.
2. A operação de cópia é 100% idempotente: repetições com o mesmo plano não duplicam texto nem alteram seções de desfecho existentes.
3. Bloco estruturado ````json mentor:memoria```` no Desfecho é extraído literalmente para `tarefa.memoria_operacional` no JSON sem intermediação de LLM.
4. Tarefas versão 2 exigem bloco de memória operacional válido no Desfecho para conclusão no `mentor task finalizar`.
5. Tarefas e narrativas legadas concluem normalmente sem exigência do bloco de memória.
6. A bateria de testes unitários (Nível 1) executa em menos de 5 segundos e passa com código 0.
