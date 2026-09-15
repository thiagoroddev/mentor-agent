# Plano das melhorias pendentes · revisão da v0.10.0

> Pedido: conferir as sete anotações de 12 a 14/09/2026, excluir o que já foi implementado e planejar o restante.
> Base conferida: `package.json` na versão **0.10.0**, commit **dd27e8b**, código e normas locais.
> Estado: **planejado, sem implementação**. Os incidentes são os relatados no anexo; esta revisão confere o pacote, sem reproduzir os incidentes no piloto.
> O rascunho preexistente [PLANO-v0.11.0.md](./PLANO-v0.11.0.md) foi preservado. Este documento consolida o escopo recomendado e explicita as correções ao rascunho na seção 5.
> O pacote mantém seu planejamento em Markdown; não criar tarefas do próprio mentor em `docs-mentor/` (ESPECIFICACAO.md, item 10b).

## 1. Resultado da triagem

**Nenhuma das sete anotações está totalmente resolvida.** Todas têm alguma base pronta; só os complementos abaixo entram no plano.

| Anotação | Já implementado — reaproveitar | Pendência confirmada |
| :-- | :-- | :-- |
| 12/09 · Restrição fundadora | Tipo opcional `plano.restricoes_reavaliadas`; regra textual de reavaliar e registrar ADR | O início não solicita o campo; não há validação específica nem contagem das reconfirmações |
| 12/09 · Composição do épico | `fatia_de`, épico no backlog, revisão após dois spikes inconclusivos | Falta plano do conjunto e revisão da direção mesmo quando as fatias são conclusivas |
| 13/09 02:47 · Meio de validação | Roteiro manual, critérios com teste, evidência por comando, detecção de tarefa sensível e laboratório | A tarefa não precisa construir um meio reproduzível nem ligar os casos dos testes aos casos apresentados ao humano |
| 13/09 03:30 · Atualizar o pacote | Aviso de árvore suja, detecção de retroativa, aviso de normas alteradas, classificação de atualização na auditoria | Falta sequência da tarefa antes da instalação; o README ainda começa por `npm i` |
| 13/09 03:49 · Evidência manual | Gate com `codigo_saida: null`, data e rastro Git; justificativa de dispensa sensível com 30 caracteres | `validar --aprovado` e `finalizar --validado-por-humano` exigem apenas 10 caracteres, sem separar execução e observação |
| 14/09 19:57 · Fatias por contrato e registro imediato | A norma já distingue `fatia_de` de `depende_de`; `task nova` aceita fatia independente; a skill de contratos já orienta pontas em paralelo | `task fatiar` encadeia todas as fatias; falta incorporar contrato ao plano e dizer que registro aprovado não espera merge |
| 14/09 21:02 · Destino do planejamento e worktrees | Uma tarefa por ramo, WIP remoto, proteção de main, IDs consultando refs Git, fusão de alguns registros | Falta destino do planejamento, procedimento com uma pasta por sessão e fusão segura de requisitos e suas vistas; a checagem de PR também precisa reconhecer planejamento |

### Evidências principais no código

- **Restrições:** `.mentor/scripts/tipos.ts:171–175,217`; `.mentor/scripts/cmd-tarefa.ts:247–308` gera o plano sem esse campo. A varredura genérica de marcadores no fechamento não substitui validação e contagem.
- **Épico e fatias:** `.mentor/scripts/cmd-fila.ts:201–246`, especialmente `depende_de: anterior ? [anterior] : []` na linha 222. A regra de spikes em `.mentor/scripts/cmd-tarefa.ts:196–217` examina os dois últimos registros SPIKE carregados e procura inconclusão textual; não agrupa por tema ou épico.
- **Validação:** `.mentor/scripts/cmd-tarefa.ts:618–625,659–703,1066–1109`; `.mentor/scripts/sensivel.ts`. A sensibilidade restringe a dispensa; a passagem automática para `pendente` depende de `contexto.gates.validacao_manual.existe` nas linhas 240–242 e 688–690.
- **Atualização:** `README.md:29–39`; `.mentor/scripts/cmd-tarefa.ts:239` fixa `commit_base = HEAD`; `.mentor/scripts/instalar.mjs` já avisa sobre normas alteradas.
- **Planejamento:** `.mentor/processos/tarefa.md:117–121`, `.mentor/processos/rascunho.md`, `.mentor/processos/entrega.md:11–28`; `.mentor/scripts/cmd-merge.ts:23–31` aceita apenas tarefa ou `(light)`.
- **Fusão:** `.mentor/scripts/cmd-resolver.ts:96–144,147–260`; `.mentor/scripts/vistas.ts:298–321` já gera `requisitos/pendentes.md` e `implementados.md`; `.mentor/scripts/instalar.mjs:220–226` não inclui essas vistas nos atributos de merge.

**Fora do novo trabalho:** refazer mérito técnico, laboratório, TDD, pausa/retomada, auditoria por tarefa, hash da árvore, reconhecimento de UI, alocação de IDs entre refs ou suporte de WIP remoto. São capacidades existentes.

## 2. Entrega proposta: v0.11.0 · operação, fatias e validação

Os números de versão são uma proposta de agrupamento. Cada frente deve produzir um resultado utilizável e seus próprios critérios de aceite.

### A. Planejamento visível e sessões isoladas

**Resultado:** requisito e tarefa aprovados são registrados imediatamente, sem ficar presos à entrega de outra tarefa.

1. Acrescentar a regra de destino em `processos/entrega.md`, com detalhes em `processos/trabalho-em-paralelo.md` se o teto exigir:
   - Código, registro, narrativa e achados da tarefa ficam no ramo dela. As `tarefas_geradas` pelo fechamento também ficam ali.
   - Planejamento independente — requisitos, reserva, rascunhos e anotações — vai a um ramo curto `plan/<data>-<tema>`, criado do principal atualizado, com PR próprio e integração rápida.
   - A pasta principal permanece no ramo principal como base. Para escrever planejamento com main protegida, usar o ramo `plan/` em pasta própria; a regra não autoriza alterações locais na main.
   - Uma sessão por pasta; execução em worktree por tarefa. Documentar instalação das dependências (`npm ci` quando houver lockfile npm), configuração local e dados do laboratório que não são versionados.
   - Atualizar `processos/rascunho.md` e a seção de fatias: o registro não espera merge. Falta de rede adia sincronização, não a anotação local durável.
2. Reconhecer PR de planejamento com marca explícita `(plano)`. Em `pronto-para-merge`, conferir o **diff e o conteúdo** contra a base do PR:
   - Permitir requisitos novos, tarefas novas em reserva, alterações de planejamento em tarefas ainda abertas e rascunhos/anotações.
   - Aceitar as vistas e os campos de contagem que `regenerarTudo()` efetivamente modifica em `contexto.json`; validar esses campos por regeneração ou comparação semântica, sem liberar o contexto inteiro.
   - Recusar código, alteração de gates/evidências, transição de tarefa para execução/conclusão e promoção manual de requisito a implementado. Nomear o arquivo e o campo.
   - Receber a base explicitamente na esteira; o modelo em `skills/github-ci` deve buscar as refs/histórico necessários. Sem base utilizável, informar como corrigir a configuração.
3. Avisar sobre planejamento criado em ramo com tarefa em execução, indicando o destino recomendado e sem impedir o registro. Reconhecer trabalho derivado pelos vínculos já presentes em `tarefas_geradas`, `achados[].ref` e `fatia_de`; quando ainda não houver vínculo, o aviso é orientativo e não acusa erro. Não introduzir a exceção `--origem TASK-...` do rascunho: o validador atual não reconhece essa família. `req nova` e `anotar` recebem a orientação contextual usando suas assinaturas próprias.
4. Documentar e testar worktrees antes de propor refatoração. `existe()` usa `existsSync`, que aceita o arquivo `.git` de uma worktree; os usos atuais não demonstram, sozinhos, falta de suporte.
5. O `doctor` pode listar pasta, ramo e tarefas em execução de worktrees locais, deduplicando IDs e indicando leituras indisponíveis. Manter isso informativo nesta entrega: o limite por equipe/sessão ainda não está definido, e somar cópias do mesmo registro não mede WIP real.

Worktrees permitem ramos diferentes em pastas distintas, com `HEAD` e índice próprios e partes do repositório compartilhadas. Isso fundamenta a separação das sessões; não fornece isolamento completo de configuração. [Documentação oficial do Git](https://git-scm.com/docs/git-worktree).

**Aceite:** dois ramos de tarefa e um de planejamento em pastas diferentes; registrar e integrar planejamento sem mudar o ramo das sessões de execução; `(plano)` aceita o diff real gerado pelos comandos e recusa mudanças de produto/estado; ID já visível nas refs não é reutilizado; gates, hooks e resolução funcionam na worktree. Incluir caminho Windows com espaços.

### B. Fusão de requisitos sem perda de decisões

**Resultado:** PRs paralelos de planejamento e execução preservam os requisitos e regeneram as duas vistas.

1. Incluir `requisitos.json` na resolução por ID, usando **base, lado atual e lado recebido**. O Git mantém essas versões nos estágios 1, 2 e 3 do índice durante conflito. [Documentação oficial do Git](https://git-scm.com/docs/git-merge).
2. Não aplicar o resolvedor genérico sem adaptar sua política: atualmente, um conflito escalar termina escolhendo o lado atual e uma exclusão pode ser desfeita pelo outro lado.
3. Política para requisitos:
   - IDs distintos: preservar ambos. Mesmo ID com alteração em só um lado: incorporar a alteração.
   - Mesmo ID preexistente, campos independentes: combinar; campos de decisão alterados de formas incompatíveis: deixar conflito explícito.
   - Mesmo ID criado nos dois lados e conteúdo diferente: apontar colisão, sem fabricar um requisito híbrido. Registros iguais podem ser deduplicados.
   - Exclusão contra registro inalterado: preservar exclusão; exclusão contra edição: pedir resolução do conflito, sem ressuscitar silenciosamente o registro.
   - Vínculos com tarefas, status e validação devem permanecer coerentes; não inferir implementação pela simples existência de uma tarefa vinculada.
4. Validar todos os modelos envolvidos antes de sobrescrever/stagear arquivos resolvidos. Conflito sem solução, JSON inválido ou falha de regeneração deve produzir saída não zero e não declarar sucesso.
5. Regenerar `pendentes.md` e `implementados.md`, incluí-los no stage do resolvedor e configurar os atributos das vistas no instalador e em `cmd-init.ts`, que também escreve essas regras. Acrescentar entradas ausentes em instalações existentes mesmo quando o bloco antigo já estiver presente. JSON de requisitos continua sendo fonte de decisão, sem `merge=ours`.
6. Orientar `fetch` antes de reservar IDs e sincronização rápida do planejamento. Isso reduz colisões; não elimina a corrida entre clones desconectados ou registros ainda não commitados em worktrees. As refs compartilhadas só tornam o registro visível após commit. Se houver colisão de tarefa, nomear o ID e os vínculos a conferir na renumeração manual.

**Aceite:** inclusões com IDs diferentes; edição unilateral; edição de campos distintos; conflito no mesmo campo; colisão add/add; exclusão unilateral e exclusão contra edição; erro sem stage indevido; regeneração repetida preserva decisões e vistas, admitindo atualização de `_meta.atualizado_em`; nenhuma vista ou vínculo perdido após integrar planejamento e conclusão de tarefa; init e atualização completam atributos antigos.

**Escopo:** requisitos e suas vistas. Estender a política a referências e invariantes pode ser trabalho posterior; não é pré-requisito para corrigir o incidente relatado.

### C. Fatias independentes com contrato explícito

**Resultado:** UI pode começar contra um contrato aprovado; dependência representa código necessário, e não a ordem em que alguém escreveu os títulos.

1. `task fatiar` deixa de criar dependência automática entre irmãs. A ajuda, a mensagem final e o cenário `02-epico-fatiado` mudam junto.
2. Guardar o contrato no JSON do pai, em `plano_do_epico.contrato_entre_fatias`, introduzido nesta frente: produtor/consumidor, formato dos dados, campos opcionais, fixtures, comportamento quando o dado não existe e onde vive o contrato. A frente F ampliará esse mesmo objeto; C não depende dos campos de estratégia futuros.
3. Distinguir dois casos:
   - **Contrato descritivo:** UI e serviço podem ser desenvolvidos e integrados independentemente, respeitando os campos opcionais e o estado sem dados.
   - **Contrato como código compartilhado:** uma fatia pequena entrega tipos/esquema/fixtures comuns; as consumidoras dependem somente dela. Não duplicar a definição em cada ponta.
4. Dependências explícitas podem ser fornecidas por uma opção como `--ordem "1>2,1>3"`, com motivo por ligação. Validar índices, autorreferência, ciclos e dependências externas do pai antes de gravar as fatias; não perder pré-requisitos reais ao remover o encadeamento.
5. `task nova --fatia-de` deve usar as mesmas regras. Preservar o plano de contrato ao iniciar a tarefa: hoje `iniciar` substitui o objeto `plano`.
6. Para dependências declaradas como obrigatórias, conferir a disponibilidade antes de executar: hoje `puxar` aceita a dependência no ciclo, e `iniciar` não exige sua conclusão. Planejar juntas continua permitido; começar o consumidor exige a entrega necessária integrada na sua base.

**Aceite:** UI inicia e tem testes com fixture antes do serviço; dado ausente tem comportamento esperado; integração funciona quando o dado chega; grafo em leque funciona; ciclo/índice inválido não cria tarefas parciais; dependência externa não desaparece; contrato compartilhado evita definições divergentes.

**Compatibilidade:** épicos existentes mantêm suas dependências. Revisá-las por escolha explícita, sem apagar ligações durante atualização do pacote.

### D. Validação com meio reproduzível e evidência estruturada

**Resultado:** antes de pedir validação, a tarefa entrega uma forma rápida de exercitar os casos, com o esperado ao lado do observado.

1. Ampliar o plano com `meio_de_validacao`: limite dos testes atuais, critérios cobertos, testes referenciados, meio escolhido, artefato/comando de uso e catálogo de casos quando aplicável.
2. Se a lacuna for combinação de entradas, a tarefa cria uma **tabela única** consumida pelos testes e pelo gerador do roteiro/fixture. O exemplo de aceite precisa incluir `Edificio Central, sala 302`, além das palavras isoladas e controles negativos.
3. Para tela, dados reais ou serviço ao vivo, usar o meio adequado: fixture importável, página de estados, protótipo ou roteiro com dados e preparação prontos. O pacote valida a presença e a coerência do registro; a tarefa constrói a ferramenta específica do projeto.
4. Corrigir o gatilho: uma tarefa reconhecida como sensível deve solicitar a avaliação da validação mesmo quando o contexto omite o gate manual. Reavaliar a sensibilidade após o plano ganhar caminhos reais. A dispensa permanece possível com justificativa e evidência adequada ao motivo.
5. Compartilhar um único validador de evidência entre `task validar` e o atalho de `task finalizar`:
   - Sem catálogo, exigir passos concretos, dado/cenário, esperado e observado; um único passo pode ser suficiente. `ok, testei` sozinho deixa de passar.
   - Com catálogo, receber primeiro **JSON** com IDs de caso e registros `{ id, esperado, observado, resultado }`; resultado explícito `aprovado`, `reprovado` ou `nao_executado`.
   - Conferir todos os IDs previstos, recusando omissões, duplicações e aprovação do conjunto com caso reprovado/não executado. Uma exclusão de caso exige revisão explícita do catálogo.
   - Guardar resumo dos resultados, referência/hash do artefato e os rastros de execução já existentes. O relatório gerado fica em formato fácil de ler, com esperado e observado lado a lado.
   - `--evidencia` pode continuar como nome antigo do observado, acompanhado dos outros campos; documentar a mudança na ajuda e no README.
6. O CLI **não compara literalmente prosa de esperado e observado**. Para valores determinísticos, o script do projeto calcula o resultado com a asserção/tolerância do domínio; para avaliação visual, registra-se o julgamento confirmado pelo humano. Gerar um roteiro ou rodar um teste não registra, por si só, aprovação humana.
7. Dispensa por cobertura automatizada deve apontar testes resolvíveis e explicar como cobrem os critérios e combinações. Existir um teste com certo nome não comprova sua suficiência; essa limitação fica visível no dossiê.
8. Conferir também os caminhos genéricos de `task gate` e `task anexar`: anexar CI ou executar comando não deve criar aprovação manual sem os dados e a confirmação necessários. Reusar a regra comum onde esses caminhos escrevem o gate manual.
9. Extrair a orientação de validação para `processos/validacao.md` se necessário, preservando ponteiros em `tarefa.md` e no carregamento do núcleo. O dossiê mostra meio, cobertura, execução e dispensa.

**Aceite:** o caso combinado falha antes da correção e passa depois; testes e roteiro usam os mesmos casos; artefato ausente impede declarar o meio pronto; caso omitido/reprovado impede aprovação; descrições equivalentes não falham por diferença de texto; UI sem gate no contexto é reconhecida; ambos os atalhos têm a mesma exigência; teste/CI não vira aprovação humana; dispensa com teste inexistente é recusada.

**Limite:** nenhum campo prova que a observação é verdadeira. A mudança torna a validação executável e rastreável; qualidade de cobertura e confirmação humana continuam essenciais.

### E. Atualização do pacote começa pela tarefa

**Resultado:** a atualização tem registro e base anteriores à mudança.

1. Acrescentar o roteiro em `processos/inicializacao.md` e corrigir **também o README**, na seção de atualização:
   1. Preparar ramo/worktree da atualização e sincronizar a base.
   2. Criar a tarefa CHORE, puxar, iniciar e preencher o plano.
   3. Só então instalar a versão desejada e executar `instalar --forcar`.
   4. Conferir normas alteradas e notas de migração; resolver gerados, verificar integridade, executar os gates e concluir a tarefa com evidência.
2. Usar a forma de instalação adotada neste repositório, hoje `github:thiagoroddev/mentor-agent#vX.Y.Z`; não presumir distribuição pelo registro npm.
3. No instalador, acrescentar aviso contextual de atualização sem tarefa identificada, com ligação para o roteiro. A primeira instalação segue seu fluxo atual. Considerar os dois caminhos: comando local e `npx` de dentro de `node_modules`, inclusive `--destino`.
4. Quando a retroativa envolver o pacote, a mensagem aponta o roteiro. Explicar corretamente a base: `commit_base` é `HEAD`; a mudança já estará na base se foi **commitada** antes de iniciar. `npm i` anterior sem commit ainda pode aparecer no diff, mas viola a ordem de planejamento recomendada.

**Aceite:** caminho tarefa → instalação captura o diff da atualização; atualização já commitada antes da tarefa tem diagnóstico explicativo; alteração local anterior gera aviso sem diagnóstico falso; instalação inicial e recuperação de instalação continuam possíveis; README e norma mostram a mesma sequência.

## 3. Entrega proposta: v0.12.0 · direção do épico e restrições

### F. Revisar o todo, inclusive quando as fatias deram certo

1. Dar ao épico um plano próprio: objetivo final, problema canônico, alternativas para resolver o conjunto, hipótese, sinal observável de desvio, contrato entre fatias e restrições relevantes. Reusar os conceitos de mérito técnico existentes.
2. Exigir esse plano antes de iniciar a primeira fatia de um épico novo. O pai é contêiner de planejamento; impedir executá-lo como tarefa comum apenas porque seu esforço não é XG.
3. Cada fatia registra no fechamento o que ensinou sobre o épico, se a direção se mantém e a evidência/motivo. A revisão inclui integração e valor do conjunto, não apenas o critério local da fatia.
4. Se a direção caiu, exigir revisão registrada da estratégia antes de iniciar/retomar novas fatias ou concluir irmãs que já estejam em execução. Mostrar as irmãs afetadas; não alterar automaticamente suas pastas ou estados.
5. A revisão associa motivo, data, versão do plano e os desvios/fatias que resolveu. Uma flag booleana isolada não encerra a pendência. Novo desvio pede nova revisão; um desvio já resolvido não bloqueia eternamente. Continuar/replanejar é uma decisão humana registrada.
6. Guardar a contribuição no registro de cada fatia e derivar a visão consolidada. Atualizar o plano do pai no ramo de planejamento quando a estratégia mudar, evitando que todo fechamento concorrente edite o mesmo arquivo do épico.
7. O dossiê inclui o plano do épico e a composição das irmãs relevantes, inclusive fora do lote. Reusar o limite e o fracionamento de dossiês; não duplicar patches completos para mostrar contexto.
8. Cadeia de spikes sem `fatia_de` recebe aviso de possível épico sem plano. Não converter automaticamente nem deduzir parentesco apenas de título parecido.
9. Acrescentar fatias a um épico existente preserva plano e revisões. Recusar o início por plano incompleto não altera estado nem `commit_base` da filha.

**Aceite:** duas fatias conclusivas, individualmente corretas, conseguem acionar revisão por direção errada; a primeira exige plano; iniciar/retomar e concluir irmã em andamento observam revisão pendente; novo desvio exige nova decisão; épico independente continua livre; épico pai não executa; acrescentar fatias preserva o plano; contribuição de fatias paralelas não se perde; dossiê apresenta o conjunto sem estourar sua política de tamanho.

### G. Reavaliação de restrições e ADR na reincidência

1. Reusar `RestricaoReavaliada` e os nomes existentes: `restricao`, `onde_foi_escrita`, `o_que_elimina_nesta_tarefa`, `reconfirmada`. Incluir o modelo no esquema JSON, no início de SPIKE/G e no plano do épico.
2. Apresentar restrições já registradas como candidatas à revisão, sem marcar reconfirmação automaticamente. `[]` continua legítimo quando nenhuma se aplica, com explicação no plano quando houve alternativas descartadas por restrição.
3. No fechamento, validar preenchimento, fonte e booleano. Relacionar cada reconfirmação ao que ela eliminou naquela decisão.
4. Definir identidade estável: referência `INV-*` quando existir; caso contrário, chave explícita preservada entre planos. Para registros legados, texto/fonte normalizados servem de sugestão de correspondência, sem fundir restrições diferentes por heurística.
5. Contar **tarefas distintas concluídas**, uma reconfirmação por restrição por tarefa. Reexecutar fechamento, carregar duas cópias da mesma tarefa ou repetir a restrição no pai não aumenta a contagem. Não retropreencher reconfirmações que o histórico não registrou.
6. Na segunda reconfirmação, o `doctor` informa o próximo gatilho. Na terceira, o fechamento exige ADR existente e vinculada **àquela restrição** por referência explícita, com ID completo; qualquer ADR da tarefa não serve. A decisão e a condição de revisão devem estar documentadas. O comando confere a referência; a pertinência do conteúdo permanece sujeita à revisão humana.
7. Uma restrição retirada exige registrar a decisão e atualizar/referenciar a fonte antiga. ADR é obrigatória quando a mudança constitui decisão arquitetural duradoura; não transformar toda correção de premissa em ADR automaticamente.
8. O dossiê mostra restrição, decisões que excluiu, tarefas que contam e ADR vinculada. Após merges paralelos, o `doctor` refaz a conta e aponta terceiro registro sem ADR: o fechamento isolado de cada ramo não tem visão de alterações ainda não integradas.

**Aceite:** plano de SPIKE solicita a revisão; campo incompleto falha; lista vazia pertinente é válida; duas reconfirmações avisam; terceira sem ADR vinculada falha; ADR inexistente ou de outro assunto não libera; ID repetido não duplica contagem; registros legados não ganham reconfirmações inventadas; convergência de ramos revela limiar cruzado.

## 4. Execução, compatibilidade e validação da implementação futura

| Frente | Prioridade | Dependência real | Verificação principal |
| :-- | :-- | :-- | :-- |
| A · Planejamento e pastas | Alta | Nenhuma para norma e isolamento; fluxo completo de merge usa B | Repositório temporário, remoto bare, worktrees e PR de planejamento |
| B · Requisitos | Alta | Nenhuma | Matriz de conflitos em Git real, preservação de decisões e vistas |
| C · Fatias por contrato | Alta | Contrato do modelo definido; não depende do merge de A/B/D/E | Independência da UI, grafo explícito e integração do contrato |
| D · Validação | Alta | Nenhuma das frentes operacionais | Tabela compartilhada e todos os caminhos de aprovação |
| E · Atualização | Alta, pequena | Nenhuma | Sequência documentada e diagnóstico nos dois instaladores |
| F · Composição do épico | Seguinte | Reusa contrato de C; confere integração concorrente das fatias e revisões do pai | Fatias conclusivas com direção errada e trabalho paralelo |
| G · Restrições | Seguinte | Modelo comum acordado com F; implementação básica pode avançar em paralelo | Identidade, contagem e vínculo real com ADR |

**Ordem recomendada:** registrar este escopo; definir os contratos de dados/flags; executar E e as frentes A/B/C/D em paralelo quando os arquivos permitirem; integrar e validar a v0.11.0; então integrar F/G para a v0.12.0. Sobreposição em `cmd-tarefa.ts` exige coordenação de edição e revisão, não dependência fictícia entre entregas.

**Migração:**

- Não reabrir tarefas concluídas nem reescrever evidências históricas. Identificar claramente o que é legado no dossiê.
- Aplicar campos obrigatórios aos planos novos e aos que aderirem ao protocolo novo. Registrar a versão do protocolo no início para diferenciar legado de campo removido; planos em execução recebem orientação de migração, sem exigir testes históricos inexistentes.
- Preservar conteúdo já preenchido, especialmente contrato e restrições, ao gerar novos esqueletos. Conferir também `retomar` e criação por `fatiar`.
- Épico legado adere antes de uma nova decisão de execução, reaproveitando as fatias já concluídas como contexto; não gerar revisões fictícias delas.
- Manter formas antigas de CLI como aliases quando representarem o mesmo dado; mensagens orientam os novos campos exigidos. CSV/Markdown de entrada para casos fica para depois de medir necessidade.

**Entrega de cada comportamento:** tipos, esquema-modelo, comandos, ajuda, processo e cenário correspondente devem mudar juntos. Reaproveitar cenários 02, 21, 22, 23, 25, 27, 28 e 29 e acrescentar cenários focados para conflitos, meio de validação e composição/restrições. Definir nomes/números na implementação, sem colidir com trabalho em paralelo.

**Verificação final de cada versão:** `npm run verify`, revisão dos exemplos gerados, README/CHANGELOG e manifesto; ensaio em cópia descartável do piloto. Manter os tetos atuais de documentação sempre que possível, extraindo conteúdo com ponteiros completos antes de propor aumento.

## 5. Ajustes ao rascunho preexistente e limites de escopo

| Proposta do rascunho | Ajuste recomendado |
| :-- | :-- |
| “Nenhuma tem mecanismo” | Há mecanismos parciais. Reutilizar a base e implementar as lacunas específicas da seção 1 |
| Corrigir `fatiar` apenas na 0.12 | Entregar o defeito concreto na 0.11; o plano completo de composição pode vir depois |
| Bloquear `instalar --forcar` por palavras no título | Roteiro e aviso contextual. A heurística erra o alvo e chega depois do `npm i`; bloqueio global não foi pedido |
| `esperado === observado` e dois passos obrigatórios | Resultado por caso, asserção do domínio e evidência estruturada; aceitar teste legítimo de um passo |
| Chamar diretamente a fusão genérica para requisitos | Acrescentar política de conflito/exclusão e impedir sucesso/stage após erro |
| Refatorar sete verificações de `.git` para suportar worktree | Primeiro provar falha. `existsSync` aceita arquivo e diretório; não há essa incompatibilidade demonstrada |
| Somar WIP como novo limite global | Diagnóstico deduplicado primeiro. Política de capacidade da equipe é decisão separada |
| Plano somente com lista de caminhos permitidos | Inspecionar também transições/decisões no JSON e mudanças geradas no contexto |
| Cada fechamento atualiza o mesmo pai-épico | Contribuição por fatia; consolidação derivada; revisão do pai apenas quando muda a estratégia |
| ADR genérica ou contagem por frase | Identidade estável, deduplicação por tarefa e ADR vinculada à restrição |
| Aumentar o teto do núcleo antecipadamente | Extrair texto e medir a redação final primeiro |

**Não faz parte deste pedido:** criar worktrees automaticamente pelo mentor, publicar versões, alterar o piloto, gerir tarefas do pacote pelo próprio pacote, renumerar IDs automaticamente, mudar a política global de WIP ou implementar um editor/harness universal de testes.

**Validação desta revisão:** leitura do anexo, código, esquemas, normas e planos existentes, com revisão separada de paralelismo, validação e épicos/restrições. Os critérios acima são testes previstos para a implementação; não são resultados de testes executados nesta revisão documental.
