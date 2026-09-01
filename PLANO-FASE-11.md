# Plano · Fase 11: O Mentor Completo (Descoberta, Requisitos, Design e GitHub)

> Documento de planejamento para as próximas melhorias do `mentor-agent`.  
> **Status:** 📋 Planejado (aguardando testes práticos da v0.2.2 pelo usuário antes de implementar).

---

## 1. Filosofia: O Papel Ativo do Mentor

O `mentor-agent` não é um assistente passivo que apenas executa comandos. Ele é um **mentor de engenharia de software** que:
1. **Não sofre de amnésia**: Conhece o ciclo de vida completo de um produto (da ideia à sustentação) e não esquece boas práticas.
2. **Lembra e orienta proativamente**: Avisa o usuário sobre o que precisa ser pensado *antes* de codificar (viabilidade, regras de negócio, contratos, estados de tela).
3. **Oferece gavetas claras**: Sabe exatamente onde colocar cada tipo de informação (ideia livre vs. compromisso formal).

---

## 2. A Linha Divisória: Rascunhos vs. Estrutura Formal

Uma das maiores causas de atrito em projetos com IA é a confusão entre **exploração livre** e **estrutura obrigatória**. A Fase 11 estabelece essa separação com nitidez:

```
docs-mentor/
├── rascunhos/              ◄─── ZONA LIVRE (Exploração, Negócio, Brainstorms, Ideias)
│   ├── comercial/          │    - Liberdade total para IA e humano
│   ├── pesquisas/          │    - Sem regras ou esquemas rígidos
│   └── prototipos/         │    - O mentor lembra que o lugar de rascunhar é AQUI
│
├── requisitos/             ◄─── ZONA FORMAL (Compromisso e Rastreabilidade)
│   ├── requisitos.json     │    - RF (Funcionais), RN (Regras de Negócio), RNF (Não-Funcionais)
│   ├── implementados.md    │    - Criados via CLI (`mentor req nova`)
│   └── pendentes.md        │    - IDs determinísticos e imutáveis
│
├── arquitetura/            ◄─── ZONA ESTRUTURAL (Como o Sistema é e Deve Ser)
│   ├── ADR/                │    - Decisões arquiteturais irreversíveis
│   └── diagramas/          │    - Diagramas Mermaid oficiais (C4, ERD, Sequência)
│
├── design/                 ◄─── ZONA VISUAL (Planejamento de Frontend & UI)
│   ├── telas/              │    - Fichas de telas e fluxos de navegação
│   └── componentes/        │    - Wireframes em texto/Mermaid e os 5 estados da tela
│
├── invariantes.json        ◄─── Leis do domínio que o código não expressa
└── glossario.md            ◄─── Termos canônicos (elimina ambiguidade de nomes)
```

---

## 3. Os Quatro Pilares da Fase 11

### Pilar A · A Gaveta de Rascunhos (`docs-mentor/rascunhos/`)
- **Regra:** Liberdade absoluta para o humano e para a IA.
- **O que vive lá:**
  - Análises comerciais, precificação, estimativa de custos e lucros.
  - Levantamento de dados brutos e pesquisas de mercado.
  - Planejamento de funcionalidades futuras e ideias ainda não aprovadas.
  - Wireframes preliminares e rascunhos de diagramas.
- **Papel do Mentor:** Se o usuário ou a IA começarem a debater ideias soltas no chat, o mentor lembra: *"Vou registrar essa análise em `docs-mentor/rascunhos/comercial/viabilidade.md` para não perdermos o histórico."*
- **Saída:** Um rascunho amadurece e se transforma em **Requisito (RF/RN/RNF)**, **ADR**, **Tarefa** ou é descartado com uma linha explicativa.

---

### Pilar B · Gestão de Requisitos e Regras de Negócio via CLI (`mentor req`)
Elimina a necessidade de digitar JSON manualmente em `requisitos.json`.

- **Comandos:**
  ```bash
  # Criar Requisito Funcional (O que o usuário/sistema faz)
  mentor req nova --tipo RF --titulo "Importação de planilha de rotas" --criterios "Suporta .xlsx e .csv | Limite de 10MB"

  # Criar Regra de Negócio (Lógica, limites, taxas e condições da empresa)
  mentor req nova --tipo RN --titulo "Cancelamento gratuito em até 7 dias" --criterios "Após 7 dias aplica taxa de 5%"

  # Criar Requisito Não Funcional (Critérios de qualidade técnica)
  mentor req nova --tipo RNF --titulo "Cálculo de rota responde em menos de 2s" --criterios "Aferido em rede 3G"

  # Listar requisitos organizados por tipo e status
  mentor req listar
  ```
- **IDs Determinísticos:** Gera `RF-001`, `RN-001`, `RNF-001` sequencialmente.
- **Vistas Automáticas:** Regenera `docs-mentor/requisitos/pendentes.md` e `implementados.md`.

---

### Pilar C · Planejamento de Frontend e Diagramas Mermaid

#### 1. Pasta de Design de UI (`docs-mentor/design/telas/`)
Antes de codificar componentes de interface, a IA ou o usuário mapeiam:
- **Rota e Objetivo da Tela**
- **Os 5 Estados Obrigatórios da Tela:**
  1. *Vazio* (sem dados)
  2. *Carregando* (skeletons / spinners)
  3. *Sucesso* (dados carregados)
  4. *Erro* (falha de rede / validação)
  5. *Sem Permissão* (não autenticado / sem acesso)
- **Hierarquia de Componentes** e tokens visuais.

#### 2. Padrão Oficial de Diagramas Mermaid (`padroes-de-stack/mermaid.md`)
Mermaid é o padrão oficial por ser texto puro em Markdown, versionável no Git e legível nativamente no VSCode e GitHub.
Modelos prontos incluídos:
- **Fluxos de Processo:** `flowchart TD / LR`
- **Contratos e Sequência de APIs:** `sequenceDiagram`
- **Banco de Dados e Entidades:** `erDiagram`
- **Estados da Interface:** `stateDiagram-v2`

---

### Pilar D · Práticas de Segurança e CI/CD com GitHub (`padroes-de-stack/github.md`)

Transforma as boas práticas do GitHub em convenção e processo do pacote:
1. **Dependabot & Segurança de Dependências:**
   - Configuração de `.github/dependabot.yml` para atualizações automáticas semanais.
   - Detecção de vulnerabilidades com alertas ativos.
2. **Proteção de Branch (`main` protegida):**
   - Nenhum commit direto na `main`.
   - Exigência de Pull Request (PR) com revisão obrigatória.
   - Status checks obrigatórios (CI precisa passar antes do merge).
3. **Esteira de CI/CD (GitHub Actions):**
   - Workflow com barreiras mecânicas automáticas a cada PR:
     - `typecheck` (`tsc --noEmit`)
     - `lint` (ESLint)
     - `test` (testes automatizados)
     - `build` (compilação de produção)
   - Deploy automático em produção somente após aprovação do pipeline.

---

## 4. Ordem Proposta de Implementação (Fase 11)

Quando você concluir os testes da `v0.2.2` e autorizar o início:

```
Passo 1 · Gaveta de Rascunhos (`docs-mentor/rascunhos/`)
         Criação estruturada no init e diretrizes de ciclo de vida.

Passo 2 · CLI de Requisitos (`mentor req [nova|listar]`)
         Criação determinística de RF, RN e RNF com geração de IDs.

Passo 3 · Design de Frontend & Diagramas Mermaid
         Gaveta `docs-mentor/design/`, fichas de tela (5 estados) e convenção Mermaid.

Passo 4 · Padrão de Stack GitHub & CI/CD
         Convenção `padroes-de-stack/github.md` cobrindo Dependabot, PRs, proteção e CI/CD.

Passo 5 · Validação em Hospedeiro e Publicação v0.3.0
```
