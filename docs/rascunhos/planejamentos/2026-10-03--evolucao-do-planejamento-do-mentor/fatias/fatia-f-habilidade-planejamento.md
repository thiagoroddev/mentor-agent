# Fatia F: Instruções do núcleo, habilidade de planejamento e processos

> **Épico**: `PLAN-2026-10-03--evolucao-do-planej` (Evolução do planejamento do Mentor)  
> **Fatia**: F  
> **Tipo**: `CHORE`  
> **Estimativa de Execução**: Esforço Humano P / IA M (Geral/Médio)  
> **Dependências**: Fatias C, D1, D2, E e G concluídas

---

## 1. Contexto e Motivação

Conforme estabelecido em `01-direcao-e-processo.md` (seção *Duas habilidades centrais* e *Ciclo em ondas*):
> "O núcleo ordenará carregar planejamento em planejamento prévio, individual e replanejamento, independentemente da seleção heurística de habilidades do modelo. Essa habilidade manda consultar contexto, habilidade de consistência e padrões de stack pertinentes.  
> O procedimento detalhado vive em `.mentor/processos/planejamento.md`. O SKILL.md deve ser curto e apontar para o processo; os processos de tarefa e rascunho apontam para a mesma fonte. Portões e autorizações continuam definidos pelo núcleo. O pacote não impõe React a outros projetos."

Após a consolidação dos contratos v2 (Fatia D1), preservação da narrativa integral (Fatia D2), compacidade de logs (Fatia D3), herança seletiva de diretrizes (Fatia E) e consulta derivada de status de planos sem auto-invalidação (Fatia G), a **Fatia F** ativa as instruções centrais do método:
1. Criar a habilidade canônica `.mentor/skills/planejamento/SKILL.md`.
2. Criar o processo metodológico completo `.mentor/processos/planejamento.md`.
3. Atualizar `.mentor/nucleo.md` (especialmente §§ 4 e 9) para ordenar explicitamente o carregamento da habilidade `planejamento` e do processo em planejamento prévio, individual e replanejamento.
4. Atualizar `.mentor/processos/tarefa.md` e `.mentor/processos/rascunho.md` para alinhamento e referência cruzada.
5. Garantir que as ferramentas de geração, manifesto e verificação reconheçam a nova habilidade sem atritos.

---

## 2. Escopo Arquitetural e Arquivos Impactados

1. **`.mentor/skills/planejamento/SKILL.md`**:
   - Frontmatter com `name: planejamento` e descrição canônica.
   - Diretrizes curtas e operacionais de descoberta de contexto, consulta a `consistencia-do-projeto`, reuso, seleção de habilidades de execução, avaliação multidimensional de complexidade/modelo/effort e fatiamento em ondas.
   - Referência expressa para `.mentor/processos/planejamento.md`.
2. **`.mentor/processos/planejamento.md`**:
   - Processo metodológico formal de planejamento no Mentor.
   - Dois níveis de aplicação: planejamento prévio (rascunhos de épicos em `rascunhos/planejamentos/`) e planejamento individual (tarefas avulsas ou fatias).
   - Metodologia de ondas sucessivas (*rolling wave planning*).
   - Definição formal das 4 dimensões de complexidade (incerteza, profundidade de raciocínio, acoplamento, validação discriminatória) e calibragem de perfil de modelo e effort.
   - Regras de preservação do estudo técnico, sincronização dos campos v2 (`decisoes_aplicaveis`, `reuso`, `habilidades`, `avaliacao`, `documentos_herdados`) e protocolo de replanejamento.
3. **`.mentor/nucleo.md`**:
   - Atualização do § 4 (Processo) mencionando a avaliação e novos campos do contrato.
   - Atualização do § 9 (Carregamento) ordenando expressamente o carregamento da habilidade `planejamento` e de `processos/planejamento.md` em planejamento prévio, individual e replanejamento.
4. **`.mentor/processos/tarefa.md` e `.mentor/processos/rascunho.md`**:
   - Apontamentos alinhados para a habilidade e processo de planejamento.
5. **`testes/planejamento-skill-e-processo.test.ts` e `testes/cenarios/31-testes-de-unidade.ts`**:
   - Testes unitários validando a presença, integridade de frontmatter, regras de carregamento e conformidade de `nucleo.md`, `tarefa.md` e `rascunho.md`.
6. **Manifesto e Changelog**:
   - Atualizar `CHANGELOG.md` e `.mentor/manifesto.json`.

---

## 3. Critérios de Aceite

1. `.mentor/skills/planejamento/SKILL.md` existe com metadados frontmatter válidos (`name: planejamento`), instruindo a consulta a contexto, consistência, reuso, habilidades de execução, avaliação e fatiamento.
2. `.mentor/processos/planejamento.md` detalha o ciclo em ondas, os 2 níveis de planejamento, os 5 eixos de classificação e as regras de replanejamento.
3. `.mentor/nucleo.md` estabelece a obrigatoriedade de carregar a habilidade `planejamento` e `processos/planejamento.md` em planejamento prévio, individual e replanejamento.
4. `.mentor/processos/tarefa.md` e `.mentor/processos/rascunho.md` referenciam adequadamente o processo de planejamento.
5. Suíte de testes unitários dedicada em `testes/planejamento-skill-e-processo.test.ts` passa com 100% de sucesso registrada em `testes/cenarios/31-testes-de-unidade.ts`.
6. Gates de qualidade (`tipos`, `testes`) e `mentor verificar` aprovados.
