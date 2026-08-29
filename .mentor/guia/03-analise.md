---
area: "Análise e requisitos"
prefixo: "AN"
portao: "P"
---

> §3 de 13. Índice: [`00-indice.md`](./00-indice.md). Consultado por lacuna do `contexto.json`, nunca do começo ao fim.

# §3 · Análise e requisitos

*Entender o problema e representá-lo até não restar ambiguidade. O código pode funcionar perfeitamente e não resolver o problema — porque o erro estava na compreensão.*

## 3.1 Princípios

**AN-01 · BLOQUEIA ·** Da essência para a implementação: durante a análise, nenhuma decisão de tecnologia. Nomear uma ferramenta cedo fecha alternativas antes de o problema estar entendido.

**AN-02 · BLOQUEIA ·** Particionar: do macro ao detalhe. Ninguém valida um sistema inteiro de uma vez.

**AN-03 · ACEITE ·** Representar as três dimensões — **informação** (que dados entram, circulam, ficam, saem), **função** (o que se faz com eles), **comportamento** (como reage a cada evento, inclusive aos que dão errado).

**AN-04 · ACEITE ·** Modelo é meio, não produto. Modelar até esclarecer, não até ficar bonito.

## 3.2 Portão P — entender o problema

**AN-05 · BLOQUEIA ·** Viabilidade antes de escopo: técnica, financeira, de prazo e **operacional** (as pessoas vão conseguir usar e manter?). A operacional é a mais ignorada e a que mais mata sistema pronto.

**AN-06 · BLOQUEIA ·** **Mapear o processo atual antes de propor o novo.** Descrever como o trabalho é feito hoje — inclusive planilha, papel e combinado informal — e devolver ao usuário para confirmação.
→ *Sem isso, o sistema automatiza um processo imaginário.* É no processo atual que aparecem as exceções que ninguém verbaliza.
→ *Pergunte:* "Como isso é feito hoje, passo a passo? Quem faz? O que costuma dar errado? O que vocês fazem quando dá errado?"

**AN-07 · ACEITE ·** Toda mudança proposta precisa de propósito declarado: o que elimina, substitui, unifica, automatiza ou paraleliza — e por quê.

**AN-08 · BLOQUEIA ·** Fronteira do sistema declarada, incluindo **o que o software não fará**. Essa lista evita mais conflito que qualquer outra parte do documento.

**AN-09 · BLOQUEIA ·** Cobrir as três famílias de processo. O leigo descreve só a primeira:

| Família | O que é | O que falta |
| :-- | :-- | :-- |
| **Primário** | A razão de o negócio existir | Nada — é o único que o usuário descreve |
| **Suporte** | O que mantém o primário funcionando | Cadastro de catálogo, gestão de usuários e permissões, atendimento, **correção de dado errado**, importação e exportação |
| **Gerencial** | Controle e decisão | Relatórios, indicadores, conferência, auditoria, fechamento de período |

→ *Pergunte, para cada um:* "Quem cadastra isso? Quem corrige quando entra errado? Quem precisa ver o resumo do mês?"

## 3.3 Atores e papéis

**AN-10 · BLOQUEIA ·** Ator é papel, não pessoa. Uma pessoa exerce vários papéis; um papel é exercido por várias pessoas. É o que vira a matriz de autorização.

**AN-11 · BLOQUEIA ·** Quatro categorias — as três últimas são sempre esquecidas:

| Categoria | Vira |
| :-- | :-- |
| Pessoas | Papéis e permissões |
| Sistemas externos | Integrações e contratos |
| Dispositivos | Entradas não humanas |
| **Eventos externos** (agendamento, prazo vencido, aviso de terceiro) | **Rotinas automáticas** — o ator invisível |

**ES-15 · BLOQUEIA ·** **O agente elicita, não transcreve.** Técnica escolhida conforme o caso:

| Técnica | Quando usar |
| :-- | :-- |
| Entrevista | Ponto de partida sempre |
| Cenários | O usuário descreve melhor contando uma história do que listando funções |
| Casos de uso | Há vários perfis com permissões diferentes |
| **Observação do trabalho real** | O usuário diz que o processo é X, mas na prática faz Y — o mais valioso e o mais pulado |

**ES-17 · ACEITE ·** Especificar em linguagem natural **estruturada por template**, não em prosa livre. Prosa livre é onde a ambiguidade se esconde.

**AN-12 · ACEITE ·** Perguntas de identificação: quem usa? quais organizações? quais sistemas conversam com ele? quem precisa ser avisado? de onde vêm os dados? para onde vão?

**AN-13 · ACEITE ·** Distinguir ator primário (usa para obter resultado) de ator de suporte (fornece serviço ao sistema). O segundo define integrações — e o que acontece quando elas caem.

## 3.4 Fluxos e comportamento

**AN-14 · BLOQUEIA ·** **Todo fluxo tem três camadas** — descrever só a primeira é a falha mais comum e mais cara:

| Camada | O que é |
| :-- | :-- |
| Principal | O caminho em que tudo dá certo |
| **Alternativo** | Mesmo objetivo, caminho diferente: dado inválido, duplicado, saldo insuficiente, pagamento recusado, sessão expirada, serviço externo fora do ar |
| De exceção | Ações disponíveis fora do caminho obrigatório: ver detalhes, alterar senha, consultar histórico, cancelar |

→ **Regra operacional:** para cada passo do fluxo principal, perguntar **"e se não?"** e registrar a resposta. Passo sem resposta é requisito faltando.

**AN-15 · BLOQUEIA ·** Todo processo tem início e fim declarados. Processo sem fim definido gera registro pendente para sempre.

**AN-16 · BLOQUEIA ·** **Eventos de tempo são requisitos.** Toda espera precisa de prazo, e todo prazo de consequência: o que expira, em quanto tempo, o que acontece, quem é avisado.
→ *Exemplos que ninguém pede:* cobrança que vence, convite não aceito, carrinho abandonado, sessão inativa, agendamento não confirmado, tarefa parada há tempo demais.

**AN-17 · BLOQUEIA ·** Cada atividade tem responsável: papel humano, o próprio sistema, ou serviço externo. Sem responsável, a funcionalidade sai duplicada ou esquecida.

**AN-18 · ACEITE ·** Distinguir atividade manual (fora do sistema), de usuário (pessoa operando) e automática. Automatizar o que na realidade é manual produz sistema que ninguém consegue usar.

## 3.5 Estados

**AN-19 · BLOQUEIA ·** Toda entidade com ciclo de vida tem máquina de estados explícita antes de ser implementada: estados possíveis, transições válidas, evento que dispara cada uma, quem pode dispará-la.
→ *Aplica-se a* pedido, pagamento, entrega, assinatura, chamado, cadastro em aprovação, documento em revisão. *Não se aplica* a consulta simples.

**AN-20 · BLOQUEIA ·** Transição não prevista é proibida por padrão. Listar também os estados finais e o que pode ser feito depois deles — cancelar o que já foi entregue, reabrir o que foi encerrado.

**AN-21 · ACEITE ·** A máquina de estados é fonte direta de casos de teste: cada transição válida é um caso, cada inválida também.

## 3.6 Dados

**AN-22 · BLOQUEIA ·** Mapear o domínio da informação antes de modelar armazenamento: o que entra, quem envia, o que é transformado, o que fica, o que sai e para quem.

**AN-23 · BLOQUEIA ·** **Dicionário de dados**: cada dado com nome único, significado, formato, obrigatoriedade, origem e quem pode vê-lo. É onde se descobre que "cliente" significa coisas diferentes para o comercial e para o financeiro — e é o vocabulário que o código deve espelhar.

**AN-24 · BLOQUEIA ·** **Multiplicidade declarada** para todo relacionamento.
→ *Pergunte em linguagem comum:* "Um cliente pode ter mais de um endereço? Um pedido, mais de um pagamento? Um usuário, mais de uma equipe?"
→ É a pergunta que a IA mais deixa de fazer e a que mais causa reescrita de modelo com o sistema já em uso.

**AN-25 · ACEITE ·** Armazenamento em análise é lógico, não físico.

**AN-26 · ACEITE ·** Cada responsabilidade na entidade certa. Ação alojada no lugar errado é o começo do que depois se chama dívida de arquitetura.

## 3.7 Requisitos

**AN-27 · BLOQUEIA ·** Separar **funcional** (o que faz; sempre um verbo; direciona a arquitetura da aplicação) de **não funcional** (qualidade e restrição; direciona a arquitetura técnica). O segundo é responsabilidade do agente levantar.

**AN-28 · BLOQUEIA ·** **Regras de negócio registradas à parte**, com identificador próprio, referenciadas pelos requisitos que as usam. Escrita em cada lugar, a mesma regra diverge.
→ *Toda regra precisa dos números:* qual valor, qual prazo, qual percentual, a partir de quando, com que arredondamento, acumula com o quê.

**AN-29 · BLOQUEIA ·** Conteúdo mínimo de um requisito funcional, qualquer que seja o formato:
`nome (verbo + objeto) · quem usa · pré-condições · fluxo principal · alternativos · exceções · regras aplicáveis · mensagens · resultado esperado`

**AN-30 · ACEITE ·** História de usuário: *como \<papel\>, quero \<ação\>, para \<benefício\>*. O "para" é obrigatório — é ele que permite propor solução melhor que a pedida.

**AN-31 · ACEITE ·** Toda história passa no crivo: independente, negociável, valiosa, estimável, pequena, testável. Falhou em "pequena", quebrar; em "testável", faltam critérios de aceite; em "valiosa", perguntar por que existe.

**AN-32 · ACEITE ·** Tema grande é declarado como conjunto e quebrado em partes entregáveis.

**AN-33 · BLOQUEIA ·** Negociação explícita: quando não cabe tudo, apresentar o conflito e as opções com impacto. Nunca decidir sozinho o que cortar, nunca fingir que cabe.

**AN-34 · BLOQUEIA ·** **Validar antes de construir**: devolver o entendimento em linguagem que o usuário domine — fluxo descrito, tela rascunhada, cenário narrado — e obter confirmação. Nunca em modelo técnico.

**AN-44 · BLOQUEIA ·** **Backlog é ordenado, não é lista.** Cada item tem posição decorrente de critério declarado: valor, risco que remove, dependência que destrava, custo. *"Tudo é prioritário" significa que ninguém decidiu — e quem decide na prática passa a ser quem implementa.*

**AN-46 · ACEITE ·** A granularidade da informação segue o nível de quem decide: quem opera precisa do registro individual agora; quem coordena, do agregado comparável; quem decide rumo, da série longa com detalhe abrível.

## 3.8 Rastreabilidade e mudança

**AN-35 · BLOQUEIA ·** Cadeia mantida do início ao fim:
`necessidade → requisito → regra → caso de uso/história → dado → interface → teste`

**AN-36 · BLOQUEIA ·** Antes de aceitar mudança, responder **o que mais muda**: requisitos, regras, fluxos, dados, telas, integrações e testes atingidos. Mudança avaliada só no ponto pedido é a origem clássica do defeito colateral.

**AN-37 · ACEITE ·** Requisito mudado é versionado, não sobrescrito: o que era, o que passou a ser, por quê, quando, a pedido de quem.

**AN-45 · BLOQUEIA ·** **Antes de criar uma entidade, verificar se o dado já existe em outro sistema.** Se existe, consumir por integração. Se a réplica for inevitável, declarar qual sistema é a **fonte da verdade**, a direção da sincronização e o que fazer na divergência. *Dois sistemas gravando o mesmo campo é como uma organização acaba com três números diferentes para a mesma coisa.*

## 3.9 Nomenclatura e limite de modelagem

**AN-38 · ACEITE ·** Convenções que eliminam ambiguidade de graça:

| Elemento | Regra | Certo | Errado |
| :-- | :-- | :-- | :-- |
| Processo/função | verbo + objeto | Calcular desconto | Fidelidade |
| Caso de uso | verbo + objeto | Cadastrar cliente | Cliente |
| Conjunto de dados | plural | Pedidos | Pedido |
| Entidade externa | nome próprio | Sistema de Pagamento | Pagamento |
| Estado | adjetivo/particípio | Aguardando pagamento | Pagamento |

**AN-39 · ACEITE ·** Identificação sequencial e estável para referência cruzada; identificador aposentado nunca é reaproveitado.

**AN-40 · ACEITE ·** Numeração hierárquica ao detalhar, para que a parte aponte para o todo.

**AN-41 · BLOQUEIA ·** **Critério de parada:** detalhar até a equipe conseguir construir e testar sem dúvida relevante. Nem menos — sobra suposição; nem mais — sobra documento que ninguém lê.

**AN-42 · ACEITE ·** Escolher a representação pela dúvida a resolver:

| Dúvida | Represente |
| :-- | :-- |
| Como o negócio funciona hoje? | Fluxo do processo, com responsáveis |
| Quem usa e o que pode fazer? | Atores × funcionalidades, com a fronteira |
| Que dados circulam e onde ficam? | Fluxo de dados por níveis + dicionário |
| Que coisas existem e como se relacionam? | Entidades, atributos, multiplicidade |
| Como algo muda de situação? | Máquina de estados |
| Em que ordem acontece? | Fluxo de atividades, com decisões e paralelismo |
| Quem chama quem, em que ordem? | Sequência de interações |
| Como o sistema se organiza por dentro? | Componentes e camadas |

**AN-43 · ACEITE ·** Em N1 o mínimo continua obrigatório: fronteira, atores, fluxo principal **com alternativos**, entidades com multiplicidade, estados de quem tem ciclo de vida. Abaixo disso não é agilidade, é suposição.

---
