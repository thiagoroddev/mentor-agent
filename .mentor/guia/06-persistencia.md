---
area: "Persistência"
prefixo: "BD · NS"
portao: "N"
---

> §6 de 13. Índice: [`00-indice.md`](./00-indice.md). Consultado por lacuna do `contexto.json`, nunca do começo ao fim.

# §6 · Persistência

*O dado sobrevive ao código. Aplicação é reescrita, framework é trocado, time muda — o dado continua. **Erro de modelagem é o mais caro de corrigir**, porque quando aparece já existe dado real em cima dele.*

## 6.1 Portão N — escolha do paradigma

**NS-01 · BLOQUEIA ·** **O padrão é relacional.** Outro paradigma entra por ganho demonstrado em uma de duas frentes, e só essas contam:
- **Produtividade** — o dado não é uniforme, os campos variam por registro, forçá-lo em tabelas custa mais que resolve.
- **Desempenho de acesso** — volume, escala horizontal ou padrão de leitura tornam o relacional inviável naquele ponto.

**NS-02 · BLOQUEIA ·** A vantagem é testada, não presumida: cenários com dado e volume realistas — o caso comum, o mais sensível a desempenho, e o que parece se adaptar mal.

**NS-04 · BLOQUEIA ·** **O que o armazenamento não garante, a aplicação passa a garantir** — e isso é trabalho novo, não trabalho economizado. Ao abandonar restrições declarativas, transações amplas ou consistência imediata, enumerar explicitamente o que passou a ser responsabilidade do código.

**NS-05 · BLOQUEIA ·** Decidir por família, pelo problema:

| Família | Acesso característico | Serve para | Perde |
| :-- | :-- | :-- | :-- |
| Chave-valor | Só por chave, muito rápido | Cache, sessão, carrinho, contadores | Consulta por conteúdo |
| Documento | Por identificador e campos indexados | Catálogo variável, conteúdo, eventos | Junção ampla, transação entre muitos |
| Colunas | Por chave da linha, escala massiva | Séries temporais, registros, métricas | Consulta por qualquer campo |
| Grafos | Percurso entre vizinhos | Rede, recomendação, rota, fraude | Simplicidade |
| **Relacional** | Por qualquer combinação | Dinheiro, pedido, estoque, cadastro | Escala horizontal fácil |

**NS-06 · BLOQUEIA ·** Domínio com dinheiro, estoque, cobrança ou contrato permanece relacional, salvo justificativa forte e registrada.

**NS-07 · ACEITE ·** Antes de abandonar transações por escala, verificar se existe alternativa que mantenha as garantias com distribuição. Trocar consistência por escala é decisão, não fatalidade.

**NS-08 · BLOQUEIA ·** Escolha registrada: qual frente justifica, qual medição sustentou, o que deixou de ser garantido, quem passa a garantir.

**NS-30 · ACEITE ·** **Usar o armazenamento certo para cada problema é legítimo; começar assim, não.** Cada armazenamento adicional soma custo permanente: operação, cópia de segurança, monitoramento, credenciais, conhecimento, e um ponto de falha.
→ Adicionar o segundo quando houver **dor medida**. Ordem que se sustenta: relacional; depois cache, quando a leitura repetida pesar; depois especializado.
→ *Verifique antes:* muitos bancos relacionais atuais já guardam e consultam documentos nativamente — o que frequentemente elimina o segundo armazenamento e preserva transações.

**NS-31 · BLOQUEIA ·** Com mais de um armazenamento, declarar para cada dado **quem é a fonte da verdade** e como os demais se atualizam.

## 6.2 Integridade

**BD-01 · BLOQUEIA ·** **O banco é a última linha de defesa da integridade, não a primeira.** A aplicação valida para dar boa mensagem; o banco impede que o dado inválido exista — mesmo entrando por importação, correção manual, outro serviço ou defeito.
→ Toda regra estrutural existe **nos dois lugares**.

**BD-02 · BLOQUEIA ·** Distinguir segurança (acesso não autorizado; usuários, privilégios, cifragem) de integridade (dado inconsistente; chaves, restrições, domínios, transações).

**BD-03 · BLOQUEIA ·** **Modelar antes de criar:** conceitual (que coisas existem — o usuário valida) → lógico (tabelas, chaves, restrições) → físico (tipos, índices, parâmetros).

**BD-11 · BLOQUEIA ·** Restrições aplicadas no armazenamento sempre que a regra for estrutural:

| Restrição | Sem ela |
| :-- | :-- |
| Chave primária | Duplicata indetectável |
| Chave estrangeira | Registro órfão apontando para o nada |
| Unicidade | Dois cadastros da mesma pessoa |
| Obrigatoriedade | Linha inutilizável |
| Domínio / verificação | Preço negativo, percentual acima de cem |
| Valor padrão | Nulo onde deveria haver zero |

**BD-12 · BLOQUEIA ·** **Unicidade que o negócio exige é unicidade declarada.** Verificar por consulta antes de inserir **falha sob concorrência**: duas requisições simultâneas passam pela verificação e ambas inserem.

**BD-13 · BLOQUEIA ·** **Comportamento referencial decidido por relacionamento**, nunca por padrão:

| Política | Quando |
| :-- | :-- |
| Restringir | Padrão seguro; o pai tem vida própria |
| Em cascata | Filho não existe sem o pai (itens de um pedido) |
| Anular a referência | Vínculo opcional |

→ Cascata é destruição silenciosa em profundidade. **Pergunte:** "se apagarmos um cliente, o histórico de pedidos dele deve sumir também?" A resposta quase sempre é não, e quase nunca é perguntada.

## 6.3 Modelagem

**BD-04 · BLOQUEIA ·** Todo atributo é classificado: obrigatório ou opcional; atômico ou composto; um valor ou vários (vários **nunca** cabem numa coluna); derivado?; qual o conjunto de valores válidos.

**BD-05 · BLOQUEIA ·** Tipo é decisão semântica. **Valor monetário e quantidade exata em tipo decimal exato, nunca em ponto flutuante** — o erro de arredondamento aparece na contabilidade, não nos testes. Data e hora: definir desde o início se o instante guarda fuso.

**BD-06 · ACEITE ·** Texto livre não é tipo: valor de conjunto conhecido vira domínio restrito ou tabela de referência.

**BD-07 · BLOQUEIA ·** Toda tabela tem chave primária.

**BD-08 · BLOQUEIA ·** **Chave primária é imutável e sem significado de negócio.** Documento, código, e-mail e telefone mudam, se digitam errado e são reaproveitados — viram restrição de unicidade, não identificador.

**BD-09 · ACEITE ·** Chave composta é legítima em tabela de ligação; avaliar o custo de toda referência carregar todas as colunas.

**BD-10 · ACEITE ·** Identificador sequencial exposto publicamente permite contar seus registros e adivinhar os vizinhos.

**BD-14 · BLOQUEIA ·** Cardinalidade **mínima e máxima** nos dois sentidos. A mínima define obrigatoriedade e quase nunca é perguntada.

**BD-15 · ACEITE ·** Relação de um para um merece justificativa — normalmente é a mesma entidade dividida.

**BD-16 · BLOQUEIA ·** **Muitos para muitos vira tabela de ligação, e ela quase sempre tem atributos próprios** — data, quantidade, preço no momento, papel, situação.
→ *O preço de um item de pedido pertence ao vínculo, não ao produto: o produto muda de preço, o pedido antigo não pode mudar junto.*

**BD-17 · ACEITE ·** Relacionamento da entidade com ela mesma exige duas decisões: profundidade máxima e o que impede ciclo.

## 6.4 Normalização e agregados

**BD-18 · BLOQUEIA ·** Normalizar até a terceira forma é o padrão:

| Forma | Regra | Sintoma da violação |
| :-- | :-- | :-- |
| 1ª | Cada campo guarda um único valor | Coluna com valores separados por vírgula |
| 2ª | Todo campo depende da chave inteira | Campo que só depende de metade da chave composta |
| 3ª | Nenhum campo depende de outro campo comum | Campo que muda sozinho quando outro muda |

→ Elimina as três anomalias: **de inclusão** (não consigo cadastrar A sem inventar B), **de alteração** (mudei em um lugar e o mesmo dado ficou velho em outros), **de exclusão** (apaguei uma coisa e perdi junto outra).

**BD-19 · ACEITE ·** **Não armazenar valor derivado** — total que é soma, idade que é diferença de datas.
→ *Exceção legítima:* valor congelado por regra de negócio não é derivado, é histórico. O total de um pedido fechado deve ser guardado, porque **não pode** mudar quando o preço do produto mudar. Distinguir os dois casos e registrar a decisão.

**BD-20 · ACEITE ·** Desnormalizar é decisão, não descuido: só depois de medir, com registro de qual redundância existe e o que a mantém sincronizada.

**NS-03 · BLOQUEIA ·** Em armazenamento não relacional, **modelar a partir do acesso**: a pergunta primária é *"como a aplicação vai ler isso?"*. Modelar pela estrutura e descobrir as consultas depois produz modelo que não atende a nenhuma.

**NS-09 · BLOQUEIA ·** **O agregado é a unidade de consistência** — desenhado em torno do que precisa mudar junto, não do que parece organizado. Se uma operação precisa alterar vários agregados de forma crítica, ou a modelagem está errada, ou o domínio é relacional.

**NS-10 · BLOQUEIA ·** Embutir ou referenciar pela pergunta: *quando eu leio isto, quase sempre preciso do outro junto?*

| | Embutir | Referenciar |
| :-- | :-- | :-- |
| Quando | Lidos juntos; o filho pertence ao pai | Reaproveitado; muda com frequência; muitos apontam |
| Paga | Duplicação, atualização espalhada | Mais consultas, montagem no código |

**NS-11 · BLOQUEIA ·** Nada que cresce sem limite é embutido. Embutir só o recente e limitado.

**NS-12 · ACEITE ·** Duplicação é aceita; desconhecimento dela não. Toda cópia registrada: onde está, o que a atualiza, com que atraso, o que fazer se divergir.

**NS-13 · ACEITE ·** Distinguir cópia de **valor histórico** — o nome do cliente gravado num pedido antigo não é duplicação a sincronizar.

## 6.5 O esquema que não desapareceu

**NS-14 · BLOQUEIA ·** **"Sem esquema" é falso.** O esquema existe — nos nomes dos campos, nas coleções, no formato das chaves, e sobretudo no código que lê. Deixou de ser verificado pelo armazenamento e virou suposição da aplicação.
→ *Sintoma:* o campo mudou de nome e nada acusou erro; o defeito aparece meses depois, numa tela que ninguém abria.

**NS-15 · BLOQUEIA ·** Validação por esquema declarado na aplicação, na escrita e na leitura, é obrigatória. Onde o produto permitir declarar validação do lado do armazenamento, declarar também.

**NS-16 · ACEITE ·** Todo registro carrega a versão do seu formato.

**NS-17 · ACEITE ·** Identificadores, unicidade e obrigatoriedade continuam existindo como regra de negócio mesmo sem serem impostos. Muda quem os aplica.

## 6.6 Transações, concorrência e distribuição

**BD-21 · BLOQUEIA ·** Operação que altera mais de um lugar é uma transação: ou tudo acontece, ou nada. Gravar o pedido e falhar ao baixar o estoque não pode deixar o pedido gravado.

**BD-22 · ACEITE ·** Quatro garantias: bloco indivisível; todas as regras válidas ao final; uma transação não enxerga a outra pela metade; confirmado é permanente.

**BD-23 · BLOQUEIA ·** **Transação é curta.** Nada de chamada externa, espera por usuário ou processamento longo com a transação aberta.

**BD-24 · BLOQUEIA ·** **Atualização concorrente precisa de estratégia declarada.** Dois usuários leem o mesmo registro, ambos alteram, e a segunda gravação apaga a primeira sem ninguém perceber — **perda de atualização** é o problema mais comum em sistema com formulário e o mais invisível.
→ *Saídas:* alterar por incremento em vez de reescrever o valor lido; ou controlar por versão do registro, avisando quem chegou depois.

**BD-25 · ACEITE ·** Reconhecer os demais: leitura suja, leitura não repetível, leitura fantasma.

**BD-26 · ACEITE ·** Isolamento mais rígido custa concorrência: elevar só onde a regra exige (fechamento, saldo, reserva), manter o padrão no resto.

**NS-18 · ACEITE ·** **Sob falha de comunicação entre nós, escolhe-se consistência ou disponibilidade.** É decisão de produto, e muda por funcionalidade:

| Escolha | O usuário vê | Adequado para |
| :-- | :-- | :-- |
| Consistência | "Indisponível no momento" | Saldo, estoque, pagamento, reserva |
| Disponibilidade | Resposta possivelmente desatualizada | Publicação, comentário, contador, catálogo |

→ *Pergunte:* "Se der problema de comunicação, prefere que o sistema recuse a operação ou responda com informação de segundos atrás?"

**NS-19 · BLOQUEIA ·** **Consistência eventual é requisito de interface**, não detalhe interno. Quem acabou de gravar precisa ver o próprio resultado.
→ *Falha clássica:* gravar, redirecionar para a listagem, e o item ainda não estar lá — parecendo que a gravação falhou.

**NS-20 · ACEITE ·** A chave de distribuição define o desempenho: escolher pelo que distribui bem **e** atende à consulta principal.

**NS-21 · ACEITE ·** Conhecer a topologia: um nó recebe escritas (leitura escala, escrita é gargalo) ou todos escrevem (mais disponível, conflito inevitável).

**NS-22 · BLOQUEIA ·** **Conflito de escrita tem regra declarada:** manter a mais recente, mesclar, somar, ou apresentar as duas. "Não pensamos nisso" significa que uma é descartada em silêncio.

**NS-23 · BLOQUEIA ·** **Toda operação que pode ser repetida precisa ser idempotente.** Em ambiente distribuído, repetição é rotina: falha de rede, nova tentativa, entrega duplicada, usuário clicando de novo.
→ *Como:* identificador de operação enviado pelo cliente e registrado; a segunda chegada devolve o resultado da primeira.

**NS-24 · ACEITE ·** Controle de concorrência escolhido: bloquear antes de alterar, ou detectar conflito comparando a versão lida. Em distribuído, o segundo — bloqueio amplo derruba a disponibilidade que motivou a escolha.

**NS-25 · ACEITE ·** Preferir operação que **descreve a mudança**: somar um é seguro sob concorrência; gravar "o valor que li mais um" não é.

## 6.7 Desempenho e consultas

**BD-27 · ACEITE ·** Índice acelera leitura e **encarece toda escrita**.

| Vale indexar | Não vale |
| :-- | :-- |
| Coluna usada para filtrar, juntar ou ordenar | Tabela pequena |
| Muitos valores distintos | Dois ou três valores possíveis |
| Volume grande | Coluna raramente filtrada |

→ Índice novo se justifica com medição antes e depois.

**BD-28 · BLOQUEIA ·** **Não percorrer linha a linha o que uma consulta resolve de uma vez.** Consultar dentro do laço é a causa mais comum de lentidão — e é invisível no teste com dez registros.

**BD-29 · ACEITE ·** Trazer só as colunas necessárias, filtrar cedo, e **paginar toda listagem que pode crescer**.

**BD-30 · ACEITE ·** Carga analítica pesada não divide lugar com a operação.

**BD-31 · ACEITE ·** Consulta pronta e nomeada serve para simplificar recorte frequente e **restringir colunas sensíveis**.

## 6.8 Cache e dados efêmeros

**NS-26 · BLOQUEIA ·** **Cache não é fonte da verdade.** O sistema funciona, mais devagar, com o cache vazio ou indisponível.

**NS-27 · BLOQUEIA ·** Todo item efêmero nasce com prazo de expiração: sessão, cache, carrinho abandonado, código temporário, trava de operação.

**NS-28 · BLOQUEIA ·** **A invalidação se define junto com o cache**: o que apaga a entrada, quando, e o que acontece na janela entre a alteração e a invalidação. Cache sem invalidação serve dado errado com confiança — e o defeito é intermitente.

**NS-29 · BLOQUEIA ·** Dado pessoal em armazenamento efêmero segue as mesmas regras: classificação, retenção, prazo como política e não conveniência.

**NS-36 · ACEITE ·** Casos de teste que não existem no mundo relacional e aqui são obrigatórios:

```
[ ] Ler imediatamente após gravar — o usuário vê o próprio resultado?
[ ] Operar com o cache vazio e com o cache indisponível
[ ] Item expira quando deve, e o sistema se comporta bem depois
[ ] A mesma operação enviada duas vezes produz um único efeito
[ ] Duas alterações concorrentes — a regra de conflito se aplica?
[ ] Registro no formato antigo continua sendo lido durante a migração
[ ] Formato inesperado é rejeitado pela validação, não gravado
[ ] Volume realista — o padrão de acesso se sustenta fora do exemplo de dez registros
```

**NS-37 · ACEITE ·** Contrato de dados entre quem grava e quem lê verificado automaticamente. Sem esquema imposto pelo armazenamento, é o único lugar onde a incompatibilidade aparece antes do usuário.

## 6.9 Lógica no banco, acesso e evolução

**BD-32 · ACEITE ·** Lógica executada pelo banco resolve problemas reais mas cria **lógica invisível para quem lê só a aplicação**. Serve para: auditoria automática, integridade que a restrição não expressa, manutenção de dado derivado assumido. Evitar para: regra central do produto, cálculo que a aplicação já faz.
→ Se existir, é versionada e documentada. Lógica que só existe no banco de produção é o floco de neve da camada de dados.

**BD-33 · ACEITE ·** Trilha de auditoria para dado sensível ou disputado: o que mudou, valor anterior, novo, quem, quando.

**BD-34 · BLOQUEIA ·** A aplicação não se conecta como administrador. Rotina que só lê, conecta com credencial que só lê.

**BD-35 · BLOQUEIA ·** Credenciais distintas por ambiente, nunca compartilhadas, sempre rotacionáveis.

**BD-36 · ACEITE ·** Privilégio concedido "temporariamente" é permanente até alguém olhar.

**BD-37 · BLOQUEIA ·** **Toda mudança de estrutura é script versionado**, aplicado pelo mesmo caminho em todos os ambientes. Alterar estrutura manualmente em produção é proibido, mesmo "só dessa vez".

**BD-38 · BLOQUEIA ·** **Mudança em passos compatíveis:** adicionar antes de usar, migrar o dado, só então remover o antigo — em publicações separadas.

**BD-39 · BLOQUEIA ·** Migração destrutiva é ensaiada sobre cópia com volume realista, com cópia de segurança verificada imediatamente antes.

**BD-40 · ACEITE ·** Toda migração declara o caminho de volta — ou, quando não houver, isso é dito ao usuário antes de aplicar.

**BD-41 · ACEITE ·** Massa de desenvolvimento é gerada, não copiada de produção, e cobre os extremos: acentuação, nomes longos, zero, negativo, registro sem vínculo opcional, volume que expõe consulta lenta.

**NS-32 · BLOQUEIA ·** Ausência de esquema não elimina migração — apenas remove o aviso.

**NS-33 · BLOQUEIA ·** Migração incremental em quatro passos: ler tolerando os dois formatos → gravar no novo → converter o restante → remover a leitura do antigo.

**NS-35 · ACEITE ·** Ao migrar de relacional para outro paradigma, partir das **consultas**, não das tabelas.

## 6.10 Operações destrutivas

**BD-42 · BLOQUEIA ·** Remoção e alteração em massa exigem filtro explícito e conferência prévia: rodar a condição como consulta e verificar quantas linhas seriam atingidas. Nunca filtrar por campo não único esperando atingir uma linha.

**BD-43 · BLOQUEIA ·** Comando que esvazia a tabela inteira ignora regras que a remoção linha a linha respeita. Não é a versão rápida; é operação diferente.

**BD-44 · BLOQUEIA ·** Em produção, sem cópia de segurança verificada, nenhuma operação destrutiva.

---
