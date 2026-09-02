# Changelog

Todas as mudanças notáveis no **mentor-agent** são documentadas neste arquivo.

O formato baseia-se em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [0.3.0] - 2026-09-02

### Adicionado
- **Postura Ativa da IA**: Em inícios de sessão ("olá" ou sem tarefa ativa), o mentor diagnostica o estado do projeto e sugere os próximos passos operacionais numerados (`AGENTS.md`, `GEMINI.md`, `CLAUDE.md`, `nucleo.md`).
- **Roteiro Canônico para Legados**: Proibição expressa de entrevistas do zero quando houver código e documentação pré-existente (`inicializacao.md`).
- **Gaveta de Rascunhos**: Criação estruturada de `docs-mentor/rascunhos/` no `init` com liberdade total de subpastas (`comercial/`, `pesquisas/`, `prototipos/`) e `LEIA-ME.md`.
- **CLI de Requisitos**: Comandos determinísticos `mentor req nova` e `mentor req listar` para Requisitos Funcionais (`RF`), Regras de Negócio (`RN`) e Requisitos Não-Funcionais (`RNF`).
- **Rastreabilidade Bidirecional**: Cruzamento automático entre tarefas abertas e requisitos em `pendentes.md`.
- **Mapa de Referências**: Geração automática de `docs-mentor/referencias.md` como central de links para documentos e protótipos do projeto.
- **Catálogo de 7 Skills Nativas de Apoio (`.mentor/skills/`)**:
  - `github-ci`: Esteira de CI via GitHub Actions (`quality.yml`), Dependabot (`dependabot.yml`), Dependency Review em PRs, `SECURITY.md`, Private Vulnerability Reporting, Secret Scanning + Push Protection e CodeQL (`codeql.yml`), com matriz comparativa público vs privado.
  - `contratos-de-api`: API Design-First com schemas tipados (Zod/TypeScript) e mocks determinísticos para desenvolvimento paralelo de Frontend e Backend.
  - `ui-design`: Decomposição de designs e prints do Figma em árvore de componentes e especificação obrigatória dos 4 estados de UI (*Vazio, Carregando, Erro, Sucesso*).
  - `mermaid`: Padrões sintáticos seguros para diagramas em rascunhos (Flowchart, Sequence, State, ERD, C4).
  - `test-design`: Engenharia de testes, TDD na prática com estrutura AAA e estratégias de dublês de teste desacoplados de implementação interna.
  - `data-modeling`: Modelagem relacional e NoSQL, indexação estratégica e padrão *Expand and Contract* para migrações sem downtime.
  - `spike-e-investigacao`: Roteiro estruturado para tarefas `SPIKE` com timebox e depuração científica com testes de reprodução determinísticos.
- **Extensibilidade de Skills**: Gaveta `docs-mentor/skills/` criada no `init` para habilidades customizadas do projeto que sobrevivem a atualizações.
- **Tipo de Tarefa `SPIKE`**: Adicionado à lista de tipos válidos em `tarefa.md`.

### Modificado
- **Robustez de Gates**: Timeout de 120 segundos para todas as execuções de comandos externos (`cmd-tarefa.ts`, `cmd-gates.ts`, `cmd-lancamento.ts`).
- **Validação de Evidência**: Comandos de gate que retornam código 0 sem saída de texto são automaticamente rotulados como `INVÁLIDO como gate`.
- **Identificação de Absorção**: Tarefas absorvidas são gravadas com o sufixo `<data>--<ID>--ABSORVIDA.json`.
- **Isolamento de Logs**: Diretório `.mentor-saidas/` adicionado automaticamente ao `.gitignore` no `init` e `instalar`.
- **Anotações sobre o Pacote**: Destino canônico unificado em `docs-mentor/melhorias-do-pacote.md`, mantendo compatibilidade de leitura com anotações legadas em `.mentor/`.

---

## [0.2.2] - 2026-09-01

### Adicionado
- Comando `mentor anotar --sobre [projeto|pacote]` para anotações rápidas durante conversas.
- Testes de cenário para rascunhos, offsets de ID e integridade referencial.

### Modificado
- Validação estrita de tetos em caracteres (tolerância de 10% com suporte a exceções por glob no `tetos.json`).
- Resolução de caminhos no relatório de campo para evitar confusão entre versão do aplicativo e versão do mentor.

---

## [0.2.0] - 2026-08-30

### Adicionado
- Migração automática da pasta de administração de `docs/` para `docs-mentor/` via `mentor instalar --forcar --migrar-docs`.
- Manifesto de integridade (`manifesto.json`) com hash sha256 de todos os arquivos do pacote `.mentor/`.
- Proteção automática para analisadores de código (`.eslintignore`, `biome.json`, etc.) ignorando `.mentor/`.

---

## [0.1.0] - 2026-08-25

### Adicionado
- Primeira versão estável com ciclo de vida de tarefas (`abertas/`, `concluidas/`).
- Gates de qualidade declarados em `contexto.json` (Tipos, Lint, Testes, Build).
- Comandos CLI essenciais: `init`, `task`, `verificar`, `doctor`, `auditar`, `regras` e `relatorio-de-campo`.
