# Planejamento: Padronização de Níveis de Teste (Nível 1 e 2) e Fluxo de Épicos no Mentor

## 1. Identificação e Metadados
- **Identificador**: `TASK-CHORE-004`
- **Título**: Padronizar níveis de teste (Nível 1: Unidade e Nível 2: Integração/E2E) no Mentor e fluxo de entrega para Épicos
- **Tipo**: `CHORE`
- **Cerimônia**: `Standard`
- **Perfil**: `completo`
- **Esforço estimado**: Humano `M`, IA `M`

---

## 2. Contexto e Motivação
Na execução da Fatia A (`TASK-CHORE-003`), a implementação da lógica e os 7 testes dedicados levaram cerca de 12 minutos, enquanto a validação com a bateria de 32 cenários E2E (com criação de múltiplos repositórios Git temporários em disco e checagens estritas de fingerprint) consumiu mais de 50 minutos de atrito operacional.

Para que o desenvolvimento de fatias e épicos seja sustentável, veloz e mantenha o rigor do Mentor, é indispensável estabelecer a pirâmide de testes no processo e nas convenções:
1. **Nível 1 (Unidade / Ciclo de Tarefa)**: Rápido (~segundos), determinístico, focado em lógica pura, componentes e contratos. Executado a cada tarefa individual via `mentor task gate testes`.
2. **Nível 2 (Integração / E2E / Consolidação)**: Amplo (~minutos), testa ecossistema completo, simulação de múltiplos comandos Git e integridade global. Executado no hook de `pre-push`, em releases ou no fechamento consolidado de épicos.
3. **Fluxo de Épicos**: Cada fatia é executada com gates de Nível 1, fechada com `task finalizar` e recebe um commit atômico local. Não se faz push a cada fatia; o `git push` ocorre na entrega do conjunto/épico, quando o Nível 2 valida a integridade global uma única vez no hook de envio.

---

## 3. Especificação Técnica Arquivo por Arquivo

### 1. `.mentor/processos/teste.md`
- Documentar formalmente os dois níveis de teste:
  - **Nível 1 (Unidade / Tarefa)**: Prova focada, milissegundos, isolada. Deve ser o alvo do comando declarado em `gates.testes` no `contexto.json` para tarefas rotineiras.
  - **Nível 2 (Integração / E2E / Pre-push)**: Prova global do ecossistema e subprocessos. Deve ser acionada em pré-envio (`pre-push`), marcos de integração ou esteiras de CI.

### 2. `.mentor/processos/entrega.md`
- Documentar a cadência e o fluxo de trabalho em Épicos de múltiplas fatias:
  - Cada fatia tem seu ciclo completo (`iniciar` -> código/teste Nível 1 -> `finalizar` -> `commit` local).
  - O envio remoto (`git push`) é acumulado para o encerramento do épico ou lote estável.
  - O hook de `pre-push` roda os testes de Nível 2 garantindo a segurança de todos os commits antes de enviar ao servidor remoto.

### 3. `testes/executar.ts`
- Adicionar suporte à flag `--unidade` (ou `--rapido`) para executar exclusivamente a camada de testes de unidade (`31-testes-de-unidade.ts`), executando em ~1 segundo.
- Preservar a execução integral dos 32 cenários quando invocado sem flags.

### 4. `docs/contexto.json` (Dogfooding no repositório)
- Atualizar `gates.testes.comando` para `node testes/executar.ts --unidade`, reduzindo o ciclo de teste de cada tarefa de 135s para < 2s.

### 5. `CHANGELOG.md`
- Registrar a padronização dos níveis de teste e da disciplina de épicos na versão não publicada.

---

## 4. Critérios de Aceite
1. `.mentor/processos/teste.md` formaliza a pirâmide de testes e a separação entre Nível 1 (Ciclo de Tarefa / Unidade) e Nível 2 (Integração / E2E / Pre-push).
2. `.mentor/processos/entrega.md` define a disciplina de entrega de Épicos (commits atômicos locais por fatia e validação Nível 2 / push consolidado ao final).
3. `testes/executar.ts --unidade` executa exclusivamente a suíte de unidades em menos de 5 segundos com saída estruturada.
4. `testes/executar.ts` sem flags preserva a execução integral de todos os cenários E2E.
5. `docs/contexto.json` do `mentor-agent` adota o gate Nível 1 para o ciclo de tarefas.
6. Todos os gates (`tipos`, `testes`), `node mentor.mjs verificar` e `node mentor.mjs doctor` passam sem pendências.
