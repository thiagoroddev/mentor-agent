---
name: github-ci
description: Esteira de CI (GitHub Actions) e matriz completa de seguranca e protecao de repositorio do GitHub.
---

# Habilidade · GitHub CI e Seguranca

Esta habilidade orienta a configuracao da esteira de integracao continua (CI) via GitHub Actions e a ativacao de todas as camadas da matriz de seguranca e governanca do GitHub.

---

## 1. Matriz de Seguranca do GitHub (Publico vs Privado)

| Ferramenta / Recurso | Protege contra | Repositorio Publico | Repositorio Privado |
| :--- | :--- | :--- | :--- |
| **Dependency graph** | (Base para analise de dependencias) | Gratis | Gratis |
| **Dependabot alerts / security updates** | Dependencias com vulnerabilidades conhecidas | Gratis (ligado por padrao) | Gratis (ativar em Settings) |
| **Dependabot version updates** | Divida tecnica de versoes desatualizadas | Gratis (`dependabot.yml`) | Gratis (`dependabot.yml`) |
| **Dependency review (no PR)** | Introduzir dependencia vulneravel no pull request | Gratis (via Action) | Pago / GitHub Advanced Security |
| **GitHub Advisory Database** | (Base canonica de consulta de CVEs) | Gratis | Gratis |
| **`SECURITY.md`** | Reporte desorganizado de falhas | Gratis | Gratis |
| **Private vulnerability reporting** | Vazar falha de seguranca antes da correcao | Gratis (Settings) | Gratis (Settings) |
| **Repository security advisories** | Divulgacao publica descoordenada | Gratis | Gratis |
| **Secret scanning + push protection** | Chaves e segredos vazados no git push | Gratis | Pago / GitHub Advanced Security |
| **Code scanning (CodeQL)** | Falhas de seguranca no codigo-fonte | Gratis (via Action) | Pago / GitHub Advanced Security |

---

## 2. Esteira de Qualidade (`.github/workflows/quality.yml`)

A esteira de CI deve rodar os mesmos gates declarados em `docs-mentor/contexto.json -> gates`.

```yaml
name: Quality

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    name: Gates de Qualidade
    runs-on: ubuntu-latest
    steps:
      - name: Checkout do codigo
        uses: actions/checkout@v4

      - name: Configurar Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Instalar dependencias
        run: npm ci

      - name: Tipos (Typecheck)
        run: npm run typecheck
        if: always()

      - name: Lint
        run: npm run lint
        if: always()

      - name: Testes automatizados
        run: npm test
        if: always()

      - name: Build de producao
        run: npm run build
        if: always()

      - name: Verificacao do Mentor
        run: node mentor.mjs verificar
        if: always()
```

---

## 3. Atualizacao de Dependencias (`.github/dependabot.yml`)

Configure o Dependabot para monitorar ecossistemas e manter dependencias atualizadas:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "06:00"
      timezone: "America/Sao_Paulo"
    open-pull-requests-limit: 5
    labels:
      - "dependencias"
      - "CHORE"
```

---

## 4. Analise de Dependencias em PRs (`actions/dependency-review-action`)

Bloqueia a introducao de novas vulnerabilidades ou licencas restritivas diretamente no Pull Request:

```yaml
name: Dependency Review
on: [pull_request]

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Review de Dependencias
        uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high
```

---

## 5. Politica de Seguranca (`SECURITY.md`)

Mantenha um `SECURITY.md` na raiz ou em `.github/SECURITY.md` definindo o canal seguro de reporte:

```markdown
# Politica de Seguranca

## Versoes Suportadas

| Versao | Suportada |
| :--- | :--- |
| 1.x | Sim |
| < 1.0 | Nao |

## Reportando uma Vulnerabilidade

Por favor, **nao abra issues publicas** para vulnerabilidades de seguranca.
Utilize a opcao **Private Vulnerability Reporting** na aba *Security -> Advisories -> Report a vulnerability* deste repositorio.

Nos comprometemos a responder em ate 48 horas uteis com uma avaliacao inicial e plano de mitigacao.
```

---

## 6. Analise Estatica de Codigo (CodeQL)

Para repositorios publicos (ou privados com GHAS), crie `.github/workflows/codeql.yml`:

```yaml
name: "CodeQL"

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 3 * * 1'

jobs:
  analyze:
    name: Analise CodeQL
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    strategy:
      fail-fast: false
      matrix:
        language: ['javascript-typescript']

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Inicializar CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}

      - name: Executar Analise CodeQL
        uses: github/codeql-action/analyze@v3
```
