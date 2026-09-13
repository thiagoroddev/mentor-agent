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

  pronto-para-merge:
    name: Tarefa concluida no ramo
    # So no PR, e nao nos PRs do Dependabot, que nao tem tarefa.
    if: github.event_name == 'pull_request' && github.event.pull_request.user.login != 'dependabot[bot]'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      # O titulo e texto de quem abriu o PR: entra por variavel de ambiente, nunca interpolado no run.
      - name: Tarefa do titulo concluida
        env:
          TITULO: ${{ github.event.pull_request.title }}
        run: node mentor.mjs pronto-para-merge --titulo "$TITULO"
```

**Por que o job `pronto-para-merge`.** Ramo `wip/<id>` pode subir com trabalho pausado (`processos/entrega.md`); o que nao pode e' entrar no `main`. O pre-push nao alcanca o merge, que acontece no servidor. O job fica vermelho enquanto a tarefa citada no titulo nao estiver concluida no ramo. ⚠️ Sem protecao de ramo (plano gratuito com repositorio privado), vermelho avisa e nao impede: so' mergear com a esteira verde.

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

---

## 7. Operacoes e Troubleshooting de CI com GitHub CLI

### A. Latencia de Disparo do GitHub Actions
Apos o `git push`, o GitHub Actions pode levar alguns segundos para registrar a execucao. Consultar imediatamente com `gh run list --commit <hash>` pode retornar `"no runs found"`.
* **Como proceder:** Aguarde de 5 a 10 segundos antes da primeira consulta ou filtre pela branch ativa:
  ```bash
  gh run list --branch main --limit 3
  ```

### B. Diagnostico Isolado de Falhas
Nem toda quebra de CI significa erro no codigo implementado:
1. **Falha de Codigo (Lint, Typecheck, Testes, Build):** Quebra direta das invariantes do projeto; deve ser corrigida na tarefa.
2. **Falha de Auditoria de Seguranca (`npm audit` / Dependency Review):** Novos advisories no banco de dados do npm podem reprovar commits verdes anteriores. Trate como evento operacional: consulte o advisory reportado e, se for falso positivo ou sem patch disponivel imediato, registre em `docs-mentor/seguranca/riscos-aceitos.json` com prazo e responsavel.

### C. Acesso a Logs com Erro 403 / Permissao Restrita
Se a API do GitHub negar a leitura detalhada do log via API REST por token com escopo restrito, use a extracao direta da falha para arquivo local isolado:
```bash
gh run view <run-id> --log-failed > .mentor-saidas/ci-falha.log
```

### D. Fila de Dependabot sob Branch Protection
Apos proteger o ramo `main`, PRs automaticos do Dependabot que forem abertos em lote nao devem ser aprovados simultaneamente:
1. Ao mesclar o primeiro PR, o ramo `main` avanca e os demais PRs tornam-se desatualizados.
2. Atualize um PR por vez (comentando `@dependabot rebase` ou via botao de update branch).
3. Espere a esteira verde e faca o merge antes de avancar para o proximo.

### E. Roteiro Pratico de Branch Protection (Repo Solo no GitHub)
Em repositorios mantidos por uma pessoa, configure para garantir integridade sem burocracia de multiplas aprovacoes:
1. Acesse **Settings > Branches** (ou **Rulesets**) no GitHub.
2. Crie uma regra para o ramo `main`.
3. Ative **Require status checks to pass before merging** e selecione o job `check / Gates de Qualidade`.
4. Se exigir Pull Request, configure **Required approvals: 0** para permitir auto-merge do autor solo com esteira verde.
5. Marque **Block force pushes** e **Block deletions**.

