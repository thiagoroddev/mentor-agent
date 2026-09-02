---
name: mermaid
description: Padrões e sintaxe robusta para diagramas Mermaid (fluxos, sequência, estados, ERD, C4) em rascunhos e documentação.
---

# Habilidade · Diagramação com Mermaid

Esta habilidade padroniza a criação de diagramas técnicos usando Mermaid em arquivos de rascunho (`docs-mentor/rascunhos/`) e arquitetura (`docs-mentor/arquitetura/ADR/`).

---

## 1. Regras de Ouro para Evitar Quebras de Sintaxe

IAs frequentemente quebram renderizadores Mermaid ao usar caracteres especiais. Siga rigorosamente:

1. **Sempre use aspas duplas em rótulos de nós**:
   - ❌ Errado: `A[Criar Conta (PF ou PJ)] --> B`
   - ✅ Correto: `A["Criar Conta (PF ou PJ)"] --> B`
2. **Nunca use tags HTML dentro de rótulos**:
   - ❌ Errado: `A["Nome <br/> Descrição"]`
   - ✅ Correto: `A["Nome - Descrição"]`
3. **Identificadores simples sem espaço**:
   - Use IDs como `nodeA`, `dbPostgres`, `apiGateway` e coloque o texto descritivo entre colchetes/aspas.

---

## 2. Modelos de Referência

### A. Fluxograma de Processo de Negócio (`flowchart TD` ou `LR`)

```mermaid
flowchart TD
    startNode(["Início do Processo"]) --> checkValido{"Dados válidos?"}
    checkValido -- "Sim" --> salvarBanco[("Gravar no Banco")]
    checkValido -- "Não" --> showErro["Exibir Erro ao Usuário"]
    salvarBanco --> dispararEvento["Publicar Evento de Domínio"]
    dispararEvento --> endNode(["Fim"])
```

### B. Diagrama de Sequência (`sequenceDiagram`)

```mermaid
sequenceDiagram
    autonumber
    actor Usuario as "Usuário"
    participant App as "Frontend (SPA)"
    participant API as "API Gateway"
    participant DB as "Banco de Dados"

    Usuario->>App: "Clica em Exportar Relatório"
    App->>API: "POST /api/v1/relatorios (payload)"
    API->>DB: "Consulta registros no período"
    DB-->>API: "Retorna linhas"
    API->>API: "Gera arquivo CSV"
    API-->>App: "201 Created (JSON com URL de download)"
    App-->>Usuario: "Inicia download e exibe toast de sucesso"
```

### C. Diagrama de Estados (`stateDiagram-v2`)

```mermaid
stateDiagram-v2
    [*] --> Rascunho: "Criado"
    Rascunho --> EmRevisao: "Submetido"
    EmRevisao --> Aprovado: "Aprovado pelo Gestor"
    EmRevisao --> Rejeitado: "Reprovado com motivo"
    Rejeitado --> Rascunho: "Ajustado"
    Aprovado --> EmExecucao: "Puxado para o Ciclo"
    EmExecucao --> Concluido: "Todos os gates verdes"
    Concluido --> [*]
```

### D. Modelo de Entidade-Relacionamento (`erDiagram`)

```mermaid
erDiagram
    CLIENTE ||--o{ PEDIDO : "realiza"
    PEDIDO ||--|{ ITEM_PEDIDO : "contém"
    PRODUTO ||--o{ ITEM_PEDIDO : "incluído em"

    CLIENTE {
        uuid id PK
        string nome
        string email UK
        datetime criado_em
    }

    PEDIDO {
        uuid id PK
        uuid cliente_id FK
        string status
        decimal valor_total
        datetime criado_em
    }
```
