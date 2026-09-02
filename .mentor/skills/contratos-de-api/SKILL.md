---
name: contratos-de-api
description: Metodologia de API Design-First, contratos tipados e desenvolvimento paralelo entre Frontend e Backend com mocks determinísticos.
---

# Habilidade · Contratos de API e Desenvolvimento Paralelo

Esta habilidade orienta como transformar requisitos em contratos de interface estritos (DTOs, Zod, TypeScript, OpenAPI), permitindo que equipes ou IAs desenvolvam o Frontend e o Backend **simultaneamente**, sem que uma camada bloqueie a outra.

---

## 1. O Princípio do Contrato Primeiro (API Design-First)

Quando um requisito funcional envolve interface e servidor, a primeira fatia de entrega deve ser o **Contrato Compartilhado**, nunca a implementação completa de uma das pontas.

```
                  ┌───────────────────────────────┐
                  │ Requisito Funcional (ex: RF-1)│
                  └───────────────┬───────────────┘
                                  ▼
                  ┌───────────────────────────────┐
                  │   Fatia 1: Contrato Tipado    │
                  │ (Schemas Zod / Types / DTOs)  │
                  └───────┬───────────────┬───────┘
                          │               │
            ┌─────────────┴─────┐   ┌─────┴─────────────┐
            ▼                   ▼   ▼                   ▼
    ┌───────────────┐   ┌────────────────┐      ┌───────────────┐
    │ Frontend      │   │ Mock Service / │      │ Backend       │
    │ (Telas/Hooks) │   │ Fake Adapter   │      │ (Rotas/Banco) │
    └───────────────┘   └────────────────┘      └───────────────┘
```

---

## 2. Estrutura do Contrato Compartilhado

Defina as entradas (Request), saídas (Response), parâmetros e erros em um módulo isolado compartilhado:

```typescript
// src/contratos/relatorios.ts (ou packages/contratos)
import { z } from 'zod'

// 1. Schema de Entrada (Request)
export const ExportarRelatorioQuerySchema = z.object({
  data_inicio: z.string().datetime(),
  data_fim: z.string().datetime(),
  formato: z.enum(['csv', 'xlsx', 'pdf']).default('csv'),
  incluir_cancelados: z.boolean().default(false),
})
export type ExportarRelatorioQuery = z.infer<typeof ExportarRelatorioQuerySchema>

// 2. Schema de Saida (Response de Sucesso)
export const RelatorioGeradoResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['processando', 'concluido', 'falhou']),
  url_download: z.string().url().nullable(),
  total_registros: z.number().int().nonnegative(),
  gerado_em: z.string().datetime(),
})
export type RelatorioGeradoResponse = z.infer<typeof RelatorioGeradoResponseSchema>
```

---

## 3. Padronização de Erros (RFC 7807 · Problem Details)

Toda API deve responder erros seguindo uma estrutura previsível, com tipos literais para que o Frontend possa tratar mensagens específicas sem inspecionar strings livres:

```typescript
export const ErroPadraoSchema = z.object({
  type: z.string().url().default('about:blank'),
  title: z.string(),
  status: z.number().int(),
  detail: z.string(),
  instance: z.string().optional(),
  code: z.string(), // ex: "USUARIO_NAO_ENCONTRADO", "SALDO_INSUFICIENTE"
  invalid_params: z.array(z.object({
    name: z.string(),
    reason: z.string(),
  })).optional(),
})
export type ErroPadrao = z.infer<typeof ErroPadraoSchema>
```

---

## 4. Desenvolvimento de Frontend com Mocks Determinísticos

O Frontend consome uma interface de cliente de API (`ApiClient`) que possui duas implementações:
1. `HttpApiClient`: chama os endpoints reais via fetch/axios.
2. `MockApiClient`: responde dados falsos determinísticos sem necessidade de backend rodando.

```typescript
// Exemplo de Mock Handler para testes e desenvolvimento do Frontend
export const mockRelatorioResponse: RelatorioGeradoResponse = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  status: 'concluido',
  url_download: 'https://storage.exemplo.com/relatorios/2026-09-02.csv',
  total_registros: 142,
  gerado_em: '2026-09-02T14:00:00Z',
}
```

---

## 5. Roteiro de Execução de Tarefas em Paralelo

1. **Fatia 1 (Contrato)**: Criar os schemas Zod/TypeScript e os mocks em `src/contratos/`.
2. **Fatia 2 (Frontend)**: Construir a tela e o hook integrados ao `MockApiClient`, cobrindo os 4 estados de UI.
3. **Fatia 3 (Backend)**: Construir o controller, validação com Zod e persistência real no banco de dados.
4. **Fatia 4 (Integração)**: Apontar o Frontend para o `HttpApiClient` e rodar testes de ponta a ponta (E2E/Smoke).
