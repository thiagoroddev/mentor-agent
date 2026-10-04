# TASK-CHORE-005 · Formato operacional versionado e vigencia das ADRs

Plano de referencia: `docs/rascunhos/planejamentos/2026-10-03--evolucao-do-planejamento-do-mentor/fatias/fatia-b-formato-operacional-adrs.md`

## 1. Identificação e Metadados

* **Identificador**: `TASK-CHORE-005`
* **Título**: Formato operacional versionado, esquema e resolvedor de vigência para Diretrizes de ADRs
* **Tipo**: `CHORE`
* **Cerimônia**: `Standard`
* **Perfil**: `completo`
* **Esforço estimado**: Humano `M`, IA `M`

---

## 2. Contexto e Motivação

As ADRs (Architecture Decision Records) contêm contexto, histórico, alternativas e consequências em linguagem natural. Para que agentes de IA e humanos possam consultar decisões arquiteturais de forma confiável e verificável, é indispensável transformar as decisões vigentes em **diretrizes operacionais estruturadas**:
1. **Identificador estável e granular por diretriz**: A unidade de vigência e substituição é a diretriz (`DIR-xxx`), e não a ADR inteira.
2. **Substituição parcial**: Uma ADR recente pode substituir apenas uma diretriz de uma ADR anterior (por exemplo, a `ADR-006` substitui a identidade visual da `ADR-004`, enquanto as regras de shadcn/ui e componentes continuam plenamente vigentes na `ADR-004`).
3. **Vigência verificável**: O estado de vigência é derivado formalmente das diretrizes aceitas e das substituições, nunca por interpretação livre.
4. **Legado explícito**: ADRs sem o bloco estruturado são diagnosticadas como pendência de extração/normalização humana, sem fingir que não existem decisões nem travar o fluxo.

---

## 3. Especificação Técnica Arquivo por Arquivo

### 1. `.mentor/esquemas/diretrizes-adr.json`
* Criação do esquema JSON Draft-07 validando:
  * Array de diretrizes.
  * Propriedades por diretriz: `id`, `estado`, `regra`, `alcance`, `excecoes`, `substitui`.
  * `estado` restrito a `["proposta", "aceita", "revogada"]`.
  * `id` no padrão `/^DIR-[A-Z0-9_-]+$/`.

### 2. `.mentor/scripts/tipos.ts`
* Adição das tipagens `EstadoDiretriz`, `DiretrizAdr`, `ResultadoVigenciaDiretrizes`.

### 3. `.mentor/scripts/adrs.ts`
* Módulo contendo:
  * `extrairDiretrizesDeTexto`: extrai blocos fenced `json mentor:diretrizes` da seção `## Diretrizes operacionais`.
  * `carregarDiretrizesDoProjeto`: varre os `.md` em `caminhos().adr`.
  * `calcularVigenciaDiretrizes`:
    * Unicidade de IDs.
    * Validação de referências em `substitui`.
    * Detecção de ciclos no grafo dirigido de substituição.
    * Filtro determinístico de diretrizes vigentes.
    * Mapeamento de legados sem diretrizes estruturadas.

### 4. `testes/adrs-formato-e-vigencia.test.ts`
* Suíte focada de testes unitários (Nível 1, < 100ms):
  * Extração do bloco estruturado.
  * Substituição parcial entre ADRs distintas.
  * Detecção de ciclos em substituições.
  * IDs duplicados e referências inválidas.
  * Classificação de ADRs legadas sem bloco.
  * Registro no runner `testes/cenarios/31-testes-de-unidade.ts`.

### 5. `.mentor/processos/padroes-de-stack.md` (ou processo pertinente)
* Documentação da convenção de escrita de diretrizes operacionais.

---

## 4. Critérios de Aceite

1. O esquema `.mentor/esquemas/diretrizes-adr.json` valida id, estado, regra, alcance, excecoes e substitui.
2. O parser em `.mentor/scripts/adrs.ts` extrai bloco fenced json `mentor:diretrizes` de arquivos Markdown de ADRs.
3. O resolvedor calcula vigência correta com suporte a substituição parcial por diretriz.
4. Ciclos de substituição e IDs duplicados ou inexistentes em `substitui` são detectados e reportados como problemas impeditivos.
5. ADRs legadas sem bloco estruturado são classificadas como `legado_sem_diretrizes` sem interromper consumidores.
6. A suíte de testes de unidade (Nível 1) executa em menos de 5 segundos e passa com código 0.

---

## 5. Desfecho e Validação Real

A implementação da **Fatia B** do épico de evolução do planejamento do Mentor foi concluída com sucesso:

1. **Esquema de Diretrizes Operacionais**: Criado `.mentor/esquemas/diretrizes-adr.json` (Draft-07), validando lista de diretrizes com `id` no padrão `DIR-[A-Z0-9_-]+`, `estado` (`aceita` | `proposta` | `revogada`), `regra`, `alcance`, `excecoes` e lista de substituições granulares (`substitui`).
2. **Tipos e Modelagem**: Atualizado `.mentor/scripts/tipos.ts` com as interfaces TypeScript `EstadoDiretriz`, `DiretrizAdr`, `SubstituicaoDiretriz` e `ResultadoVigenciaDiretrizes`.
3. **Módulo de Parsing e Resolução**: Criado `.mentor/scripts/adrs.ts` contendo:
   - `extrairDiretrizesDeTexto`: extrai deterministicamente o bloco fenced ```` ```json mentor:diretrizes ```` sob o cabeçalho `## Diretrizes operacionais`, validando formato e esquema JSON.
   - `carregarDiretrizesDoProjeto`: varre os documentos em `caminhos().adr`, extrai as diretrizes e mapeia arquivos legados sem bloco estruturado.
   - `calcularVigenciaDiretrizes`: avalia diretrizes ativas, suporta substituição parcial direta entre diretrizes (preservando outras diretrizes da mesma ADR), previne ciclos dirigidos em `substitui`, diagnostica IDs duplicados ou referências inexistentes, e separa diretrizes revogadas/propostas.
4. **Bateria de Testes Unitários de Nível 1**: Suíte dedicada `testes/adrs-formato-e-vigencia.test.ts` cobrindo extração, substituição granular, ciclo de substituição, identificadores duplicados, ADRs legadas e carregamento em diretório temporário, integrada ao cenário `testes/cenarios/31-testes-de-unidade.ts`.
5. **Processo e Manifesto**: Documentada a convenção em `.mentor/processos/analise-de-impacto.md`, atualizado `CHANGELOG.md` e regenerado `.mentor/manifesto.json` (86 arquivos).
6. **Portões e Evidências**:
   - `npx tsc --noEmit` (gate `tipos`): código 0, sem erros de tipagem.
   - `node testes/executar.ts --unidade` (gate `testes`): todos os testes verdes em ~15-20s, código 0.
   - Todos os 6 critérios de aceite devidamente evidenciados via CLI `mentor task criterio`.

