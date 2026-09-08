# Changelog

Todas as mudanças notáveis no **mentor-agent** são documentadas neste arquivo.

O formato baseia-se em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Não publicado]

### Adicionado
- **Evidência Externa em Gates**: Suporte à flag `--arquivo <caminho>` e opcional `--codigo-saida <n>` no comando `task gate <ID> <gate>`, permitindo registrar saídas de comandos executados fora do ambiente direto do agente.
- **Tolerância a UTF-16 e BOM**: Leitura resiliente em `lerTexto` para arquivos codificados em UTF-16LE com BOM (comuns em redirecionamentos do PowerShell `*>`), UTF-16BE e UTF-8 com BOM.
- **Guia Operacional de CI na Skill `github-ci`**: Seção 7 com troubleshooting prático para latência do GitHub Actions, isolamento de falhas de `npm audit`, contorno de erro 403 em logs e fila de PRs do Dependabot sob Branch Protection.
- **Cenário de Teste 20**: Cobertura ponta a ponta para evidências externas e leitura UTF-16 (`20-evidencia-externa-e-narrativa.ts`).

### Modificado
- **Teto da Narrativa de Conclusão Expandido (10.000 caracteres)**: O limite de `docs-mentor/tarefas/concluidas/*.md` foi elevado de 2.400 para 10.000 caracteres no `tetos.json` e em `processos/tarefa.md`. O markdown destina-se ao aprendizado humano e histórico técnico detalhado (armadilhas, bugs sutis, testes manuais); agentes de IA que precisarem apenas do resumo operacional consomem o `.json` estruturado da tarefa.
- **Narrativa Técnica de Tarefa**: Processo de fechamento em `processos/tarefa.md` agora exige expressamente armadilhas técnicas e aprendizados reais de testes manuais (cache, portas, persistência, UX), barrando resumos protocolares rasos.
- **Orientação em Requisitos Vazios**: O `doctor` agora orienta ações recuperáveis para projetos legados (`"nenhum requisito registrado: se migrou projeto legado, preencha docs-mentor/requisitos/requisitos.json..."`).
- **Rotas de Plataforma no `doctor`**: O diagnóstico de configurações de plataforma não declaradas agora indica as seções correspondentes no GitHub (*Settings > Branches / Code security; veja .mentor/skills/github-ci/*).

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
