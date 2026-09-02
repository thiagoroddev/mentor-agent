# Plano · Fase 11: O Mentor Completo (Postura Ativa, Legados, Requisitos, Evidências, CI/CD e Skills)

> Documento de planejamento para a Fase 11 do `mentor-agent`.  
> Consolidado a partir das anotações de campo reais da adoção em projeto legado (`01/09/26` e `02/09/26`).  
> **Status:** 📋 Planejado e Detalhado (aguardando autorização de início).

---

## 1. Filosofia: O Papel Ativo do Mentor

O `mentor-agent` **não é um assistente passivo** que espera ordens ou fica calado com saudações genéricas. Ele é um **mentor sênior de engenharia de software** que:
1. **Não sofre de amnésia**: Conhece o ciclo de vida completo de um produto (da ideia à sustentação) e nunca esquece boas práticas de engenharia.
2. **Age proativamente desde a primeira mensagem**: Em todo início de conversa ou quando não há tarefa ativa, inspeciona o estado do projeto (`docs-mentor/contexto.json` e `doctor`), faz o diagnóstico e propõe os próximos passos com opções claras.
3. **Domina a Adoção em Projetos Legados (Brownfield)**: Lê o código e a documentação existente antes de perguntar; nunca faz perguntas do zero cujas respostas já estão em disco.
4. **Usa o Guia como radar proativo**: Monitora a fase do projeto e **lembra o usuário no momento oportuno**, sem depender de o usuário saber o que pedir.
5. **Governa as Skills sem competir com elas**: O Mentor dita o processo e as leis; as Skills fornecem o know-how técnico especializado de cada ferramenta.
6. **Executa Gates com Robustez e Timeout**: Nunca trava em loops infinitos de terminal e inspeciona a evidência antes de carimbar `APROVADO`.
7. **Garante sobrevivência a atualizações**: Tudo o que o usuário cria no projeto (`docs-mentor/`, customizações e skills locais) sobrevive a qualquer `npx mentor instalar --forcar`.

---

## 2. A Linha Divisória: Rascunhos vs. Estrutura Formal vs. Skills

```
PROJETO DO USUÁRIO (NUNCA É SOBRESCRITO EM ATUALIZAÇÕES DO PACOTE):

docs-mentor/
├── rascunhos/              ◄─── ZONA LIVRE (Exploração, Negócio, Brainstorms, Ideias)
│   ├── comercial/          │    - Liberdade total para IA e humano
│   ├── pesquisas/          │    - Sem regras ou esquemas rígidos
│   └── prototipos/         │    - O mentor lembra que o lugar de rascunhar é AQUI
│
├── requisitos/             ◄─── ZONA FORMAL (Compromisso e Rastreabilidade)
│   ├── requisitos.json     │    - RF (Funcionais), RN (Regras de Negócio), RNF (Não-Funcionais)
│   ├── implementados.md    │    - Criados via CLI (`mentor req nova`)
│   └── pendentes.md        │    - IDs determinísticos e coluna de tarefas vinculadas
│
├── arquitetura/            ◄─── ZONA ESTRUTURAL (Como o Sistema é e Deve Ser)
│   ├── ADR/                │    - Decisões arquiteturais irreversíveis
│   └── diagramas/          │    - Diagramas Mermaid oficiais (C4, ERD, Sequência)
│
├── design/                 ◄─── ZONA VISUAL (Planejamento de Frontend & UI)
│   ├── telas/              │    - Fichas de telas e fluxos de navegação
│   └── componentes/        │    - Wireframes e os 5 estados da tela
│
├── skills/ (ou locais)     ◄─── SKILLS TÉCNICAS DO PROJETO (Mermaid, GitHub-CI, UI)
│   ├── mermaid/SKILL.md    │    - Formato padrão carregável por Claude, Gemini, Codex, Copilot
│   └── github-ci/SKILL.md  │    - Sobrevivem no projeto do usuário
│
├── referencias.md          ◄─── Mapa gerado de links e documentos históricos do projeto
├── invariantes.json        ◄─── Leis do domínio que o código não expressa
└── glossario.md            ◄─── Termos canônicos (elimina ambiguidade de nomes)
```

---

## 3. Os Seis Pilares da Fase 11 (Derivados do Campo)

### Pilar 0 · Postura Ativa e Roteiro de Adoção em Projetos Legados
- **Fim da Passividade no Início de Sessão:**
  - `nucleo.md` e pontos de entrada (`AGENTS.md`, `GEMINI.md`, `CLAUDE.md`) determinam:
    > *"Ao iniciar qualquer sessão, ao receber saudações ou quando não houver tarefa em execução, aja como Mentor: inspecione `docs-mentor/contexto.json` e o `doctor`, identifique a fase atual do projeto, analise quais portões/lacunas estão abertos e **apresente imediatamente o diagnóstico com os próximos passos recomendados em formato de opções numeradas**."*
- **Roteiro Canônico de Adoção em Projeto Legado:**
  - O `mentor instalar` e `mentor init` em projeto legado orientam a sequência:
    `1. Ler docs/ e código -> 2. Preencher contexto.json -> 3. Migrar pendências vivas -> 4. mentor gerar -> 5. mentor doctor`.
  - A fase `1 · Ler` proíbe expressamente a IA de fazer perguntas do zero se houver `docs/` ou código rico em disco: ela deve preencher um rascunho consolidado e perguntar apenas as lacunas não documentadas.
  - Regra de Migração de Pendências: Migrar somente requisitos e tarefas abertas (ignorando concluídas e blocos obsoletos); fatiar épicos com `fatia_de` (sem IDs decimais); atualizar `offsets_de_id`.

---

### Pilar A · A Gaveta de Rascunhos (`docs-mentor/rascunhos/`)
- **Regra:** Liberdade absoluta para o humano e para a IA.
- **O que vive lá:**
  - Análises comerciais, precificação, estimativa de custos e lucros.
  - Levantamento de dados brutos e pesquisas de mercado.
  - Planejamento de funcionalidades futuras e ideias ainda não aprovadas.
  - Wireframes preliminares e rascunhos de diagramas.
- **Papel do Mentor:** Se o usuário ou a IA começarem a debater ideias soltas no chat, o mentor lembra: *"Vou registrar essa análise em `docs-mentor/rascunhos/comercial/viabilidade.md` para não perdermos o histórico."*
- **Destino Canônico de Anotações do Pacote:** Padronizar `docs-mentor/melhorias-do-pacote.md` com suporte a `.mentor/melhorias-do-pacote.md` no `relatorio-de-campo`.

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
- **Rastreabilidade Bidirecional em `pendentes.md`:** A coluna de tarefas vinculadas lê `tarefa.requisitos` e lista os IDs das tarefas abertas/no ciclo que implementam aquele requisito.
- **Mapa de Documentos e Referências (`docs-mentor/referencias.md`):** Vista gerada contendo tabela com links de todos os documentos externos mapeados no projeto.

---

### Pilar C · Robustez de Gates, Timeout e Inspeção de Evidências
- **Proteção contra Travamento (Timeout Obrigatório):**
  - Adicionar `timeout: 180000` (3 minutos) padrão em todas as chamadas de `spawnSync` (`cmd-tarefa.ts:205`, `cmd-gates.ts:21` e `cmd-lancamento.ts:31`), configurável em `contexto.json -> gates.timeout_ms`.
  - Se o comando estourar o timeout, gravar automaticamente o rótulo **`NÃO EXECUTADO`** com o motivo: *"Timeout: comando não encerrou após X segundos"*.
- **Inspeção de Evidência e Rótulo `INVÁLIDO como gate`:**
  - Não carimbar `APROVADO` às cegas apenas com `r.status === 0`.
  - Se a saída capturada for totalmente vazia ou não contiver o resumo esperado de execução, registrar alerta ou rotular como **`INVÁLIDO como gate`** com a justificativa *"Saída vazia: o comando não produziu evidência verificável"*.
- **Protocolo de Saídas para Ambientes sem Terminal Integrado:**
  - Formalizar o processo de redirecionamento de saídas (`*> .mentor-saidas/gate.txt` no PowerShell).
  - Incluir `.mentor-saidas/` no `.gitignore` gerado no `init`.
  - Tratamento documentado para encoding UTF-16 gerado pelo PowerShell no Windows.
  - Suporte em `task gate` para ler evidência a partir de arquivo de saída capturado.

---

### Pilar D · Guia Prático de CI/CD, Dependabot e Plataforma GitHub
- **Guia de Configuração de Branch Protection / Rulesets para Repositórios Solo:**
  - Passo a passo de cliques na web do GitHub: `main` protegida, Pull Request obrigatório, status check obrigatório (`Quality`), 0 aprovações necessárias para dono do repo, bloqueio de force push e deletion.
  - Transição de fluxo após a proteção: lembrar que push direto na `main` é bloqueado e o fluxo passa a ser `branch + PR`.
- **Diagnóstico Granular de Falhas de CI:**
  - Separar falhas de código (typecheck/lint/test/build) de falhas de segurança de dependências (`npm audit`).
  - Tratamento para latência de disparo do GitHub Actions (`gh run list` pós-push com retry).
  - Rotina de atualização de PRs do Dependabot pós-proteção de branch (rebase e merge individual).

---

### Pilar E · Skills Especializadas no Formato Nativo dos Modelos (Claude, Gemini, Codex, Copilot)
Em vez de manuais soltos, o pacote disponibiliza **Skills Nativas** em formato aberto `SKILL.md`:

1. **Skill Mermaid (`docs-mentor/skills/mermaid/SKILL.md`):**
   - Regras de legibilidade, sintaxe segura e modelos prontos:
     - Fluxos de Processo (`flowchart TD / LR`)
     - Contratos e Sequência de APIs (`sequenceDiagram`)
     - Banco de Dados e Entidades (`erDiagram`)
     - Estados da Interface (`stateDiagram-v2`)
2. **Skill GitHub CI/CD & Dependabot (`docs-mentor/skills/github-ci/SKILL.md`):**
   - Configuração de workflows com barreiras mecânicas, `.github/dependabot.yml` e gestão de vulnerabilidades.
3. **Skill UI Design & 5 Estados (`docs-mentor/skills/ui-design/SKILL.md`):**
   - Mapeamento de telas cobrindo obrigatoriamente os 5 estados (*Vazio, Carregando, Sucesso, Erro, Sem Permissão*) e hierarquia de componentes.

---

### Pilar F · Correções Cirúrgicas de Consistência e CLI
1. **Inclusão de `SPIKE` em `processos/tarefa.md`**: Adicionar explicitamente `SPIKE` na lista de tipos válidos de tarefa ao lado de `RF, RN, RNF, BG, REF, DOC, CHORE, TEST`.
2. **Alinhamento do comando `task gate`**: Corrigir em `nucleo.md` §7 e `processos/tarefa.md` a menção ao comando real `mentor task gate <ID> <gate>` (eliminando a referência obsoleta a `task registrar-gate`).
3. **Diferenciação de `task absorver`**: `mentor task absorver <ID> --por <ID>` passa a gerar o sufixo canônico `--ABSORVIDA.json` e estado `absorvida` (para não parecer cancelada/abandonada no disco).

---

## 4. Ordem Proposta de Implementação (Fase 11)

```
Passo 0 · Postura Ativa do Mentor nos Pontos de Entrada e Roteiro de Legados
         Diagnóstico automático no início de sessão e guia explícito da fase 1 · Ler.

Passo 1 · Gaveta de Rascunhos (`docs-mentor/rascunhos/`) e Padronização de Anotações
         Criação estruturada no init e suporte unificado a melhorias-do-pacote.

Passo 2 · CLI de Requisitos (`mentor req [nova|listar]`) e Mapa de Referências
         Criação determinística de RF, RN, RNF, link bidirecional em pendentes.md e referencias.md.

Passo 3 · Robustez de Gates (Timeout, Inspeção de Evidência, `task gate`, `SPIKE`, `--ABSORVIDA`)
         Proteção contra loops, validação de saída, correções de CLI e convenção .mentor-saidas/.

Passo 4 · Skills Nativas de Apoio (Mermaid, UI Design e GitHub CI)
         Modelos SKILL.md no padrão aberto compatível com Claude, Gemini, Codex e Copilot.

Passo 5 · Validação Completa em Hospedeiro e Publicação v0.3.0
```
