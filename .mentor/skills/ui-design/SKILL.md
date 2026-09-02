---
name: ui-design
description: Decomposição de prints e telas do Figma em árvore de componentes, tokens e especificação dos 4 estados de UI antes da codificação.
---

# Habilidade · UI Design: Do Print/Figma aos Componentes

Esta habilidade orienta o processo de transformar um print, layout do Figma ou wireframe em uma especificação técnica de componentes em `docs-mentor/rascunhos/` antes de escrever qualquer linha de código no projeto.

---

## 1. O Roteiro de Desconstrução de Interface

Nunca comece a codificar direto a partir de um print. Siga a ordem:

```
[Print / Figma] ➔ [Mapeamento em Rascunho] ➔ [4 Estados de UI] ➔ [Codificação TDD]
```

---

## 2. Decomposição da Árvore de Componentes

Ao inspecionar o design, separe a tela em camadas:

```
Página / Rota
└── Layout Container
    ├── Organismo: Filtro de Relatório
    │   ├── Molécula: Campo de Data com Calendário
    │   ├── Molécula: Seletor de Formato (Radio/Dropdown)
    │   └── Átomo: Botão Primário "Exportar"
    └── Organismo: Tabela de Resultados
        ├── Molécula: Cabeçalho com Ordenação
        ├── Molécula: Linha de Registro com Ações
        └── Molécula: Paginação
```

---

## 3. Especificação em Rascunho (`docs-mentor/rascunhos/`)

Documente a estrutura dos componentes mapeados antes de codificar:

```markdown
# Mapeamento de UI · Tela de Exportação de Relatórios

Fonte visual: `docs-mentor/rascunhos/prototipos/tela-exportar.png` (ou link Figma)

## 1. Componentes Identificados

### `FiltroRelatorio`
- **Props**: `onFiltrar: (params: ExportarRelatorioQuery) => void`, `carregando: boolean`
- **Estado interno**: `datas: DateRange`, `formato: 'csv' | 'xlsx'`
- **Eventos**: `onSubmit` aciona validação e repassa query.

### `TabelaRelatorio`
- **Props**: `itens: RelatorioItem[]`, `total: number`, `pagina: number`, `onMudarPagina: (p: number) => void`
- **Primitivas**: Tabela (`Table`, `TableHeader`, `TableRow`, `TableCell`), `Badge`, `Button`.
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

## 5. Tokens Visuais e Acessibilidade

- **Espaçamentos**: Utilize sempre a escala de espaçamento do projeto (ex: 4px, 8px, 12px, 16px, 24px, 32px), evitando valores arbitrários (`top: 37px`).
- **Cores semânticas**: Mapeie os elementos para tokens funcionais (`primary`, `secondary`, `destructive`, `muted`, `accent`), garantindo suporte nativo a Dark Mode e contraste WCAG AA.
- **Acessibilidade**: Elementos interativos devem ser navegáveis por teclado (`Tab`, `Enter`, `Space`) com rótulos semânticos (`aria-label`, `aria-describedby`).
