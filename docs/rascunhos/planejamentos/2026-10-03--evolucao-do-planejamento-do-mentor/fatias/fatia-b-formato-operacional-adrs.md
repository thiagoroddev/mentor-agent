# Planejamento Individual: Fatia B — Formato operacional versionado e vigência das ADRs

Plano de referência do épico: `docs/rascunhos/planejamentos/2026-10-03--evolucao-do-planejamento-do-mentor/04-fatias-e-validacao.md`

## 1. Identificação e Metadados

* **Identificador preliminar**: `TASK-CHORE-005`
* **Título**: Formato operacional versionado, esquema e resolvedor de vigência para Diretrizes de ADRs
* **Tipo**: `CHORE`
* **Cerimônia**: `Standard`
* **Perfil**: `completo`
* **Esforço estimado**: Humano `M`, IA `M`

---

## 2. Contexto e Motivação

As ADRs (Architecture Decision Records) contêm contexto, histórico, alternativas e consequências em linguagem natural. Contudo, para que agentes de IA e humanos possam consultar decisões arquiteturais de forma confiável, consistente e verificável, é indispensável transformar as decisões vigentes em **diretrizes operacionais estruturadas**.

Conforme estabelecido em `02-consistencia-e-contratos.md`:
1. **Identificador estável e granular por diretriz**: A unidade de vigência e substituição é a diretriz (`DIR-xxx`), e não a ADR inteira.
2. **Substituição parcial**: Uma ADR recente pode substituir apenas uma parte de uma ADR anterior (por exemplo, a `ADR-006` substitui parte da identidade visual definida na `ADR-004`, enquanto as regras de shadcn/ui e componentes continuam plenamente vigentes na `ADR-004`).
3. **Vigência verificável**: O estado de vigência deve ser derivado algoritmicamente das diretrizes aceitas e das substituições, nunca inferido por interpretação livre de texto.
4. **Legado explícito**: ADRs antigas que ainda não possuem o bloco estruturado extraído devem ser diagnosticadas como pendência de extração/normalização humana, sem fingir que não existem decisões arquiteturais nem travar operações legítimas.

---

## 3. Contrato Operacional

### 3.1 Decisões Aplicáveis (`decisoes_aplicaveis`)
* **Fonte canônica**: As diretrizes vivem na seção `## Diretrizes operacionais` da própria ADR em `caminhos().adr`, em um bloco fenced JSON estruturado com marcador (` ```json mentor:diretrizes `).
* **Campos da diretriz**:
  * `id`: identificador único e estável (ex: `DIR-ADR-004-01`).
  * `estado`: `proposta` | `aceita` | `revogada`.
  * `regra`: texto normativo direto com a prescrição técnica.
  * `alcance`: escopo ou camada de aplicação (ex: `ui/componentes`, `persistencia`, `arquitetura`, `mapa`).
  * `excecoes`: array de exceções explícitas permitidas.
  * `substitui`: array de IDs de diretrizes anteriores substituídas por esta.
* **Cálculo determinístico de vigência**:
  * Uma diretriz é **vigente** se seu estado é `aceita` e ela **não** consta no campo `substitui` de nenhuma outra diretriz aceita.
  * Ciclos de substituição (ex: A substitui B, B substitui A) são proibidos e diagnosticados como erro impeditivo.
  * Referências a diretrizes inexistentes em `substitui` são acusadas.
* **Transição segura para o legado**:
  * ADRs sem bloco estruturado retornam status `legado_sem_diretrizes: true` e preservam o fluxo, viabilizando a extração gradual revisada pelo mantenedor.

### 3.2 Reuso (`reuso`)
* **Existentes**:
  * `arquivos.ts`: `caminhos().adr` (padronizado na Fatia A), `lerTexto`, `existe`, `listar`.
  * `.mentor/esquemas/`: convenções de schemas JSON Draft-07.
* **Novos**:
  * `.mentor/esquemas/diretrizes-adr.json`: esquema JSON das diretrizes operacionais.
  * `.mentor/scripts/adrs.ts`: parser de Markdown para extração das diretrizes e resolvedor de vigência e grafo de substituição.

### 3.3 Habilidades (`habilidades`)
* **Planejamento**: `planejamento` (definição de invariantes, modelo de dados e dependências).
* **Execução**: `test-design` (elaboração de testes exaustivos para cálculo de vigência, substituição parcial, ciclos e legado).

### 3.4 Avaliação (`avaliacao`)
* **Planejamento**:
  * Complexidade: `moderada`
  * Dimensão dominante: `incerteza` (formato exato e granularidade dos campos)
  * Risco: `médio`
  * Perfil de modelo: `avançado`
  * Effort: `médio`
* **Execução**:
  * Complexidade: `moderada`
  * Dimensão dominante: `acoplamento` (fornecer API limpa para a Fatia C que consumirá este módulo)
  * Risco: `baixo`
  * Perfil de modelo: `geral`
  * Effort: `médio`

---

## 4. Especificação Técnica Arquivo por Arquivo

### 1. `.mentor/esquemas/diretrizes-adr.json`
* Esquema JSON formal para o bloco estruturado de diretrizes:
  * Tipo: `array` de objetos.
  * Propriedades obrigatórias por item: `id`, `estado`, `regra`, `alcance`, `excecoes`, `substitui`.
  * `estado` restrito a `["proposta", "aceita", "revogada"]`.
  * `id` correspondente ao padrão `/^DIR-[A-Z0-9_-]+$/`.

### 2. `.mentor/scripts/tipos.ts`
* Adicionar os tipos TypeScript para as diretrizes e resolução de vigência:
  ```ts
  export type EstadoDiretriz = 'proposta' | 'aceita' | 'revogada'

  export interface DiretrizAdr {
    id: string
    adr: string // nome do arquivo ou ID da ADR de origem
    estado: EstadoDiretriz
    regra: string
    alcance: string
    excecoes: string[]
    substitui: string[]
  }

  export interface ResultadoVigenciaDiretrizes {
    todas: DiretrizAdr[]
    vigentes: DiretrizAdr[]
    revogadas: DiretrizAdr[]
    substituidas: Array<{ diretriz: DiretrizAdr; substituida_por: string }>
    legado_sem_diretrizes: string[] // arquivos de ADR sem bloco estruturado
    problemas: string[] // ciclos, duplicatas de ID, refs inexistentes
  }
  ```

### 3. `.mentor/scripts/adrs.ts`
* Módulo com as funções:
  * `extrairDiretrizesDeTexto(conteudo: string, nomeArquivo: string): { diretrizes: DiretrizAdr[]; legado: boolean; erro?: string }`
  * `carregarDiretrizesDoProjeto(c: Caminhos): { diretrizes: DiretrizAdr[]; legados: string[]; erros: string[] }`
  * `calcularVigenciaDiretrizes(diretrizes: DiretrizAdr[], legados?: string[]): ResultadoVigenciaDiretrizes`
    * Verifica unicidade dos IDs.
    * Valida que todo ID em `substitui` existe no universo de diretrizes.
    * Constrói grafo dirigido de substituição e roda detecção de ciclos (DFS com detecção de retorno).
    * Filtra vigentes: `d.estado === 'aceita' && !substituidaPorOutraAceita`.

### 4. `testes/adrs-formato-e-vigencia.test.ts` (ou integrado na suíte de unidade)
* Testes unitários focados (Nível 1, < 200ms):
  1. Extração correta de bloco JSON fenced com ` ```json mentor:diretrizes `.
  2. Substituição parcial: ADR-006 substitui apenas `DIR-ADR-004-02`, mantendo `DIR-ADR-004-01` ativa e vigente.
  3. Detecção e acusação de ciclo de substituição (A substitui B e B substitui A).
  4. Detecção e acusação de ID duplicado.
  5. Acusação de referência em `substitui` para ID inexistente.
  6. Classificação correta de ADRs legadas sem bloco estruturado como `legado_sem_diretrizes`.
  7. Diretriz com estado `proposta` ou `revogada` não entra no conjunto de `vigentes`.

### 5. `.mentor/processos/`
* Documentar em `.mentor/processos/` a convenção de escrita de ADRs estruturadas com bloco `mentor:diretrizes`.

---

## 5. Critérios de Aceite

1. O esquema `.mentor/esquemas/diretrizes-adr.json` valida rigorosamente o formato de diretrizes.
2. O parser `adrs.ts` extrai blocos de diretrizes operacionais de arquivos Markdown de ADRs com precisão determinística.
3. O algoritmo de vigência calcula corretamente as diretrizes vigentes, aceitando substituição parcial de diretrizes individuais sem revogar a ADR inteira.
4. Ciclos de substituição, duplicidades de ID e referências a diretrizes inexistentes são detectados e retornados em `problemas`.
5. ADRs que não possuem o bloco estruturado são classificadas em `legado_sem_diretrizes` sem interromper a análise das demais.
6. Todos os testes passam na suíte de Nível 1 (`node testes/executar.ts --unidade`) e no `mentor verificar`.
