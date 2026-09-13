---
carrega_quando: tarefa Standard ou Strict
---

# Processo · Tarefa

`task nova` → **aberta** → `task iniciar` → **em execução** (↔ `task pausar` / `task retomar`) → `task finalizar` → **concluída**

| Quem | Escreve |
|---|---|
| Script | ID, datas, nome de arquivo, índice, vínculo com requisito, contagens, `backlog.md` |
| IA | título, plano, narrativa, achados |
| Humano | as três autorizações (núcleo §2) |

Nada que o script escreve é digitado ou conferido pela IA.

## Campos

`tipo` RF · RN · RNF · BG · REF · DOC · CHORE · TEST · SPIKE
`valor` crítico · importante · desejável
`urgencia` imediata · normal
`esforco` duplo, humano/IA, cada um P · M · G · XG

**Esforço para IA não se mede por tempo humano**, e sim por carga de contexto, risco e validação:

| | Critério |
|---|---|
| **P** | 1-2 arquivos, baixo contexto, sem mudança arquitetural |
| **M** | 2-5 arquivos, contexto moderado, impacto local |
| **G** | 5-12 arquivos, alto contexto, risco relevante, exige revisão |
| **XG** | 12+ arquivos, muitas decisões, risco de estourar contexto |

⚠️ **XG é sinal de divisão obrigatória.** Não avance: quebre antes de executar.

## Origem: o campo que não aceita vazio

Ou **IDs que resolvem** para documento existente (`RF` `RN` `RNF` `ADR` `DT` `REV`), ou o token
literal `titulo-autossuficiente`, que é uma **afirmação conferível**: quem escreve declara que o
título carrega a tarefa inteira. Renomear arquivo, subir versão de linter: o título basta.
*"Melhorar o fluxo de cadastro"* não basta.

Se nem uma coisa nem outra, **criar o registro durável é parte de criar a tarefa**, não trabalho de
quem for executá-la. O teste que falsifica: *alguém que não estava na conversa consegue planejar
esta tarefa?*

**Rastreabilidade de Funcionalidades:** para tarefas do tipo `RF`, `RN` ou `RNF`, o `mentor task nova` exige
obrigatoriamente `--requisitos <ID>` (ou `--sem-requisito --motivo "<justificativa>"` se for meramente técnica).
Funcionalidade e regra de negócio não entram no código sem estarem catalogadas no `requisitos.json`.

> **Medido:** quando o ponteiro não resolve, o texto vaza para dentro do backlog. Foram 57 linhas de
> detalhamento em três tarefas não iniciadas, cerca de 90% duplicando documento que já existia. A
> tarefa não tinha para onde apontar, então apontou para dentro de si mesma.

## Plano e Mérito Técnico (Portão 1)

O plano não é apenas um formulário de procedimento: ele é a **defesa de mérito técnico** da tarefa.
O `mentor-agent` recusa planos que constroem do zero sem pesquisar o estado da arte ou sem exercer o dever de contrariar.

### Campos Obrigatórios de Mérito no Plano

1. **`problema_canonico`**: Se o problema tem nome na literatura científica ou de engenharia (ex: TSP, VRP, CRDT, LR parser, rate limiting, sincronização offline), declare o nome canônico. Se genuinamente não tiver, declare explicitamente `"sem nome canonico"`. Nome canônico traz literatura, bibliotecas testadas e benchmarks conhecidos.
2. **`discordancia`**: Exercício ativo e obrigatório para combater a complacência da IA. Deve responder:
   - *O que eu faria diferente:* a abordagem alternativa que o mentor recomendaria.
   - *O que me preocupa neste plano:* riscos de arquitetura, limites de escala ou dívida técnica gerada.
   - *O que existe pronto que faz 80% disso:* bibliotecas, solvers ou ferramentas de mercado existentes.
   *(Valor `"Nada a objetar"` é aceito se não houver ressalvas, mas deve ser explicitamente digitado).*
3. **`estado_da_arte` e `custo_de_oportunidade`**:
   - Disparo: esforço IA `G` ou `XG`, ou quando a tarefa constrói motor, algoritmo, heurística, protocolo ou parser próprio.
   - Exige: 2 a 4 implementações consolidadas de mercado com licenças, motivo do descarte de cada uma, o que restaria construir caso uma delas fosse adotada, e estimativa de semanas de desenvolvimento economizadas.
4. **Spikes de Medição — As Três Réguas**:
   - Todo spike cujo critério cite "melhora", "ganho", "otimiza", "reduz" ou "taxa" exige:
     - **Piso**: o baseline trivial que o resultado tem obrigação mínima de superar.
     - **Teto**: o ótimo matemático calculado ou a melhor referência externa conhecida.
     - **Padrão**: o que uma solução padrão da indústria entrega na mesma instância.
   - Sem as três réguas, o spike é recusado. "Inconclusivo por falta de régua" é classificado como defeito de planejamento.
5. **Restrições Fundadoras e Premissas Refutadas**:
   - Restrições herdadas de README ou arquivos antigos não são leis eternas. Se eliminam alternativas de mercado nesta tarefa, devem ser reavaliadas e reconfirmadas pelo mantenedor (reconfirmada 3 vezes vira ADR).
   - Se um achado de classe 3 ou 4 refuta a premissa de um spike ou tarefa anterior, as tarefas dependentes não podem ser puxadas para o ciclo sem reconfirmação explícita.
   - Dois spikes consecutivos que fecham como "inconclusivo" no mesmo tema bloqueiam novos spikes e exigem **Revisão de Estratégia**.

## Pausa e Retomada de Tarefas (`task pausar` e `task retomar`)

Durante o desenvolvimento ou execução de um spike, podem surgir dependências dinâmicas imprevistas — por exemplo, falta de suporte de UI para avaliar um teste manual, ou um bug bloqueador no próprio ambiente de testes.

O `mentor-agent` adota o fluxo de **Pausa com Rastreabilidade de Dependências**:

1. **Pausar e liberar o slot de WIP:**
   `mentor task pausar <ID> --motivo "<motivo>" [--bloqueada-por <IDs>] [--commit]`
   - Exige que o estado local do Git esteja limpo. Se houver alterações não commitadas, a flag `--commit` realiza o auto-commit de WIP: `wip(<ID>): pausada - <motivo>`.
   - **Apenas commit, nunca push:** o commit de WIP existe para limpar a árvore de trabalho e isolar o contexto da próxima tarefa. Dar push de WIP quebraria pipelines de CI ou acionaria deploys de código incompleto.
   - O slot de execução (`em_execucao`) é liberado para que as tarefas que desbloqueiam a atual possam ser puxadas, iniciadas e concluídas.

2. **Retomar após resolução:**
   `mentor task retomar <ID> [--forcar]`
   - Verifica se as tarefas declaradas em `--bloqueada-por` já foram concluídas ou canceladas.
   - Reassume o slot de execução (`em-execucao`).

3. **Isolamento de Escopo no Git:**
   - Ao finalizar uma tarefa que passou por pausas, o `mentor task finalizar` calcula o diff ativo excluindo os períodos em que esteve pausada (`[commit_pausa .. commit_retomada]`). As alterações de código realizadas pelas tarefas intermediárias não geram falso positivo de arquivos fora do `plano.muda`.

## Fatia

Sub-numeração decimal não existe. Fatia se declara no título: `[fatia de TASK-RF-005]`.
`depende_de` diz *"não posso começar antes daquela"*; a fatia diz *"sou pedaço daquela"*. São coisas
diferentes, e uma fatia pode não depender de nada.

## Teste

O metodo e' do projeto (`contexto.qualidade.metodo_de_teste`), padrao **`tdd`**. Quando o teste
nasce, o que fazer quando a asercao nao escreve, e por que o vermelho e' obrigatorio:
**[`processos/teste.md`](./teste.md)**.

Duas checagens caem no fechamento: todo criterio de aceite nomeia um teste, e com `tdd` ou `bdd` o
gate de testes precisa ter sido visto vermelho antes do verde.

**Reconciliação e Tarefa Retroativa:** quando o código já existe em produção ou já passa verde antes da tarefa,
o vermelho não pode ser visto por ordem cronológica. Nesses casos, registre com:
`mentor task gate <ID> testes --vermelho-dispensado --motivo "<evidencia de mutacao>"`
⚠️ **A dispensa exige prova por teste de mutação:** documente no motivo como uma alteração proposital na regra de negócio
faz o teste falhar. Sem teste de mutação, a dispensa vira passe-livre e a auditoria acusará teste sem exercício do código.

## Gates

Rodados por `task gate <ID> <gate>`, que executa o comando declarado no contexto e grava comando,
saída e horário. **Declaração escrita à mão não vale como evidência.**

Sete rótulos, e nenhum outro:

| Rótulo | Significa | Exige |
|---|---|---|
| `APROVADO` | rodou, verde | o comando exato |
| `APROVADO com ressalva` | verde, há problema conhecido que o verde não pega | a ressalva nomeada e onde ficou registrada |
| `FALHOU` | rodou, reprovou | o que reprovou. **Não sustenta conclusão** |
| `NÃO EXECUTADO` | o gate existe e não rodou | o motivo, e por que o fechamento se sustenta sem ele |
| `BLOQUEADO` | rodou, veredito depende de ato humano | qual ato, de quem. **Não sustenta conclusão** |
| `INVÁLIDO como gate` | verde que não significa o que parece | a prova de que não checou o que promete |
| `não se aplica` | o projeto declara que não existe | nada, a declaração já está no contexto |

**Evidência, em ordem:** URL do run da integração contínua · saída do comando colada · `NÃO
EXECUTADO` com motivo. Nunca `APROVADO` sem uma das duas primeiras.
Corolário com dentes: gate cujo run **já existe** e não tem o link é tratado como `NÃO EXECUTADO`.

Gate declarado tem linha própria. Os `não se aplica` podem dividir uma linha só. **Omitir é
proibido:** é ambíguo entre *"não temos"* e *"esquecemos de escrever"*.

## Validação Manual Humana & Alerta Proativo da IA

A validação manual é o portão humano que impede que alucinações ou suposições da IA cheguem a produção.

### Quando precisa de validação manual? Em todas as tarefas?

**NÃO em todas.** A exigência segue uma taxonomia fechada:

| Caso | Validação Manual | Justificativa |
|---|:---:|---|
| **UI / Frontend / Telas** | **SIM (Obrigatória)** | Componentes visuais, CSS, formulários, responsividade e fluxos só o uso humano consegue atestar. |
| **Persistência / Esquema (Regra 4)** | **SIM (Obrigatória)** | Alterações de schema, migrations, `DB_VERSION`, IndexedDB e persistência exigem revisão humana no dossiê de auditoria. |
| **Cálculos / Algoritmos (Regra 4)** | **SIM (Obrigatória)** | Fórmulas, penalidades de rota, heurísticas de busca e totalizadores exigem conferência de resultado pelo usuário. |
| **Spikes** | **SIM (Obrigatória)** | O spike responde a uma pergunta de arquitetura ou produto que orienta decisões humanas. |
| **Refatoração Interna Pura (REF)** | **NÃO (Dispensada)** | Sem alteração de comportamento, coberta 100% por suíte automatizada verde. |
| **Tipagem pura (`.d.ts`, `types.ts`)** | **NÃO (Dispensada)** | Verificada pelo gate de tipos (`tsc`). |
| **Documentação pura (DOC)** | **NÃO (Dispensada)** | Sem impacto executável no produto. |
| **Chores de Build/CI** | **NÃO (Dispensada)** | Sem impacto funcional direto no usuário. |

### Postura Ativa da IA (Shift-Left)
A IA é **proibida** de tentar fechar a tarefa ou pedir autorização para `push` sem antes apresentar o roteiro de testes:
```markdown
### 🧪 Roteiro de Validação Manual (Obrigatório)
Esta tarefa altera [UI / Persistência / Algoritmo]. A validação humana é obrigatória antes da finalização.

**Passos para validação:**
1. Abra [...]
2. Execute [...]
3. Verifique se [...]

Por favor, valide e confirme com o resultado para registro do gate.
```
A IA **nunca** finaliza nem faz push antes de receber essa confirmação escrita.

### Travas no Fechamento
O CLI recusa o `mentor task finalizar` se:
1. A tarefa estiver com `validacao: "pendente"` sem validação aprovada ou dispensada.
2. O gate `validacao_manual` estiver `NÃO EXECUTADO` sem motivo.
3. Arquivos de código de produção tiverem sido modificados no Git sem constar no `plano.muda` (suporta kebab-case e globs `*`, `**` para subpastas).
4. Tarefa retroativa for detectada (arquivos de `plano.muda` já commitados antes de `commit_base` e diff ativo vazio), a menos que finalizada com a flag explícita `--retroativa`.
5. Em tarefas de cálculo, persistência/banco, algoritmos ou spikes, a dispensa de validação (`--dispensado`) exige justificativa detalhada (`--motivo`) com no mínimo 30 caracteres.

**Como registrar evidências e validação:**
- Humano aprovou: `mentor task validar <ID> --aprovado --evidencia "<resumo dos testes>"` (exige evidência substantiva, grava `codigo_saida: null`).
- Atalho na finalização: `mentor task finalizar <ID> --validado-por-humano "<evidencia>"`.
- Dispensa justificada: `mentor task validar <ID> --dispensado --motivo "<justificativa substantiva>"`.
- Evidenciar critério de aceite com comando: `mentor task criterio <ID> <indice> --comando "<cmd>"` ou `--saida "<texto>"`.
- Anexar link externo (CI / PR) a gate de tarefa aberta ou já concluída: `mentor task anexar <ID> --url "<url>" [--gate <nome>]`.

### Agilidade de Feedback & Fixtures Rápidas
Gates locais do mentor devem ser rápidos para não desencorajar a execução contínua. Para baterias pesadas (ex.: suítes E2E completas ou benchmarks lentos), utilize fixtures rápidas nos testes locais e anexe a prova completa da esteira remota via `mentor task anexar <ID> --url "<run do CI>"`.

## Fechamento

A narrativa é o texto livre da tarefa, voltada para aprendizado humano, com teto expandido de 10.000
caracteres (a IA consome o `.json` da tarefa concluída quando precisa apenas do resumo operacional):
decisões tomadas · o que **não** foi feito e por quê · **armadilhas técnicas e aprendizados reais de
testes manuais** (conflitos de porta/cache, persistência, peculiaridades de ambiente, falhas conceituais
de UX). Resumo protocolar breve que omite armadilhas e histórico útil não é aceito. O resto o script grava.

Duas listas separadas, e a separação é o que impede tarefa de gerar tarefa:

| Lista | O que entra | Custo |
|---|---|---|
| `achados_encaminhados` | pertence a uma tarefa que já existe. Nomeia a dona | Light, sem registro próprio |
| `tarefas_geradas` | trabalho novo | vira tarefa |

Nada encontrado é resposta legítima, e se escreve.
