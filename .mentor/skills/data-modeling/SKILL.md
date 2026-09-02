---
name: data-modeling
description: Modelagem relacional e documental de dados, índices estratégicos, invariantes de banco e migrações seguras (Expand-Contract).
---

# Habilidade · Modelagem de Dados e Migrações Seguras

Esta habilidade orienta a tomada de decisão para desenho de esquemas de dados, integridade referencial e evolução de banco sem downtime.

---

## 1. Princípios de Modelagem de Banco

1. **Invariantes moram no banco**: Restrições fundamentais do domínio (`UNIQUE`, `NOT NULL`, `FOREIGN KEY`, `CHECK (valor > 0)`) devem ser garantidas pelo esquema do banco, não apenas por validações de aplicação.
2. **Índices conscientes**: Crie índices para colunas presentes em `WHERE`, `ORDER BY` e `JOIN`. Evite índices em excesso em tabelas de escrita massiva.
3. **Tipagem precisa**: Use tipos específicos (ex: `timestamptz` para datas com fuso, `numeric/decimal` para valores monetários, `uuid` para identificadores globais).

---

## 2. O Padrão Expand and Contract (Evolução sem Downtime)

Nunca renomeie ou remova uma coluna de banco em uma única migração com o sistema em produção. Siga os 3 passos:

```
Passo 1 (Expand)   ➔ Criar a nova coluna/tabela mantendo a antiga viva.
                      Código novo escreve em ambas e lê da nova.
Passo 2 (Migrate)  ➔ Backfill de dados legados em background.
Passo 3 (Contract) ➔ Remover a coluna/tabela antiga após toda a frota estar atualizada.
```

---

## 3. Checklist para Escrever Migrações Seguras

- [ ] A migração é idempotente ou possui script de reversão (`down`) testado?
- [ ] A criação de índices pesados usa modo concorrente (ex: `CREATE INDEX CONCURRENTLY` no PostgreSQL)?
- [ ] Novas colunas `NOT NULL` possuem valor `DEFAULT` definido para não travar tabelas grandes durante o lock?
- [ ] A operação foi validada localmente com volume representativo de dados?
