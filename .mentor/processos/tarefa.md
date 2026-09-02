---
carrega_quando: tarefa Standard ou Strict
---

# Processo · Tarefa

`task nova` → **aberta** → `task iniciar` → **em execução** → `task finalizar` → **concluída**

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

> **Medido:** quando o ponteiro não resolve, o texto vaza para dentro do backlog. Foram 57 linhas de
> detalhamento em três tarefas não iniciadas, cerca de 90% duplicando documento que já existia. A
> tarefa não tinha para onde apontar, então apontou para dentro de si mesma.

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

## Fechamento

A narrativa é o único texto livre da tarefa, teto 2.400 caracteres: decisões tomadas · o que **não**
foi feito e por quê · aprendizados. O resto o script grava.

Duas listas separadas, e a separação é o que impede tarefa de gerar tarefa:

| Lista | O que entra | Custo |
|---|---|---|
| `achados_encaminhados` | pertence a uma tarefa que já existe. Nomeia a dona | Light, sem registro próprio |
| `tarefas_geradas` | trabalho novo | vira tarefa |

Nada encontrado é resposta legítima, e se escreve.
