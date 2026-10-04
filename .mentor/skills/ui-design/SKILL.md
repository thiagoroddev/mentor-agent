---
name: ui-design
description: Decomposição de interfaces (novas ou existentes), inventário de reuso, primitivas vs componentes de domínio, especificação dos 4 estados de UI e preservação de comportamento e acessibilidade.
---

# Habilidade · UI Design: Da Descoberta aos Componentes

Esta habilidade orienta o desenho, decomposição e refatoração de interfaces no `mentor-agent`, cobrindo desde a criação a partir de prints/Figma até a evolução de telas legadas com inventário de reuso e preservação de comportamento.

---

## 1. Descoberta, Inventário de Reuso e UI Existente

Antes de propor código ou novos componentes (seja para tela nova ou alteração em tela existente):

1. **Audite a UI Existente (`plano.reuso`):**
   - Inspecione a árvore de componentes existente e liste em `plano.reuso.existentes` o que já está disponível no projeto.
   - Identifique padrões visuais consolidados, variantes e convenções de estilo já adotadas.
2. **Primitivas de Design System vs Componentes de Domínio:**
   - **Primitivas:** blocos fundamentais reutilizáveis (ex.: `Button`, `Input`, `Dialog`, `Table`, `Badge`, `Card`). Devem seguir a biblioteca ou design system oficial do projeto (ex.: shadcn/ui).
   - **Componentes de Domínio:** agregam primitivas para resolver uma funcionalidade de negócio específica (ex.: `FiltroRelatorio`, `PainelMotorista`). Devem ficar próximos da funcionalidade que atendem.
3. **Critérios para Criar Nova Primitiva:**
   - Crie uma nova primitiva somente se a biblioteca ou sistema de design do projeto genuinamente não contiver o equivalente.
   - *Nunca crie componentes para cada div nem introduza abstrações sem responsabilidade concreta.*
4. **Controles Nativos e Conformidade:**
   - Identifique elementos nativos (ex.: `<button>`, `<input>`, `<select>`) que deveriam utilizar os componentes padrão do projeto (conforme regras de lint como `react/forbid-elements`).
5. **Fronteira com Referências Externas:**
   - Habilidades de tradução de referências (como `referencia-para-react`) adaptam códigos ou layouts externos. No entanto, a autoridade canônica é a UI local do projeto: referências externas devem se conformar aos componentes existentes do projeto, sem sobrescrever pastas alheias nem duplicar primitivas.

---

## 2. O Roteiro de Desconstrução de Interface

Siga a sequência estruturada antes de codificar:

```
[Print / Figma / Legado] ➔ [Inventário & Rascunho] ➔ [4 Estados de UI] ➔ [Codificação TDD]
```

Ao inspecionar a interface, decomponha a tela em camadas:
```
Página / Rota
└── Layout Container
    ├── Organismo: Filtro de Relatório (Domínio)
    │   ├── Molécula: Campo de Data com Calendário
    │   ├── Molécula: Seletor de Formato (Radio/Dropdown)
    │   └── Átomo / Primitiva: Button Primário "Exportar"
    └── Organismo: Tabela de Resultados (Domínio)
        ├── Molécula: Cabeçalho com Ordenação
        ├── Molécula: Linha de Registro com Ações
        └── Molécula: Paginação
```

---

## 3. Especificação em Rascunho (`docs-mentor/rascunhos/`)

Documente a estrutura dos componentes mapeados antes de codificar:

```markdown
# Mapeamento de UI · Tela de Exportação de Relatórios

Fonte visual: `docs-mentor/rascunhos/prototipos/tela-exportar.png` (ou link Figma / código legado)

## 1. Reuso e Primitivas
- **Primitivas existentes:** `Button`, `Table`, `Badge`, `Select`.
- **Componentes novos de domínio:** `FiltroRelatorio`, `TabelaRelatorio`.

## 2. Componentes Identificados

### `FiltroRelatorio`
- **Props**: `onFiltrar: (params: ExportarRelatorioQuery) => void`, `carregando: boolean`
- **Estado interno**: `datas: DateRange`, `formato: 'csv' | 'xlsx'`
- **Eventos**: `onSubmit` aciona validação e repassa query.

### `TabelaRelatorio`
- **Props**: `itens: RelatorioItem[]`, `total: number`, `pagina: number`, `onMudarPagina: (p: number) => void`
```

---

## 4. Os 4 Estados Obrigatórios de Interface

Toda tela ou componente com carga de dados **precisa** prever e especificar como se comporta em 4 estados:

| Estado | O que renderizar | Boas práticas |
| :--- | :--- | :--- |
| **1. Vazio (Empty State)** | Ilustração ou ícone sutil, mensagem explicativa e botão de ação primária (ex: *"Nenhum dado encontrado no período. Tente ajustar os filtros."*). | Nunca deixar uma tabela ou tela em branco sem feedback. |
| **2. Carregando (Loading)** | *Skeleton screens* que respeitam as dimensões reais dos componentes, ou spinner com indicador de progresso. | Desabilitar botões para evitar duplo clique (*double submit*). |
| **3. Erro (Error State)** | Mensagem humana e clara sobre o que falhou + botão de ação para tentar novamente (*Retry*). | Exibir mensagem tratada do backend (RFC 7807), nunca stack traces ou erros técnicos crus. |
| **4. Sucesso / Dados** | Conteúdo carregado e interativo, badges de status, paginação habilitada e foco acessível. | Transições suaves entre loading e renderização dos dados. |

---

## 5. Tokens Visuais, Preservação e Acessibilidade

- **Preservação de Comportamento:** Ao refatorar componentes existentes, garanta que estados nativos (foco, desabilitado, interações de teclado) e eventos de formulário continuem operando de forma idêntica.
- **Espaçamentos e Tipografia:** Utilize sempre a escala de espaçamento do projeto (ex: 4px, 8px, 12px, 16px, 24px, 32px), evitando valores arbitrários (`top: 37px`).
- **Cores semânticas:** Mapeie os elementos para tokens funcionais (`primary`, `secondary`, `destructive`, `muted`, `accent`), garantindo suporte nativo a Dark Mode e contraste WCAG AA.
- **Acessibilidade:** Elementos interativos devem ser navegáveis por teclado (`Tab`, `Enter`, `Space`) com rótulos semânticos (`aria-label`, `aria-describedby`).
