# Anti-padrões

*Sinais observáveis e a regra que os corrige. Serve como varredura rápida de projeto existente.*

## Produto e negócio

| Sinal | Regra |
| :-- | :-- |
| Começa pela tecnologia, não pela dor | `NG-01` |
| Arquitetura para milhões antes do primeiro usuário | `NG-03` |
| "Está no ar, logo funcionou" | `NG-10` |
| Ninguém perguntou como se resolve hoje | `NG-06` |
| Dimensionado pelo número maior | `NG-11` |
| Assinatura sem cancelamento nem falha de pagamento | `NG-15` |
| Cadastro pronto, primeiro valor inexistente | `NG-17` |
| Ninguém sabe onde as pessoas somem | `NG-18` |
| Nenhuma estimativa de custo mensal | `NG-23` `OPS-40` |
| Cada cliente novo exige mais gente | `NG-25` |
| Ninguém usa, ninguém remove | `NG-02` |

## Conformidade e ética

| Sinal | Regra |
| :-- | :-- |
| Política genérica que não descreve o sistema | `CF-25` |
| Termo longo, denso, incompreensível | `CF-10` |
| Um clique para assinar, cinco passos para sair | `CF-16` |
| "Aceito tudo" sem alternativa granular | `CF-24` |
| Valor final só no último passo | `CF-11` |
| Teste que vira cobrança sem aviso | `CF-19` |
| "Confirmo ter 18 anos" como única barreira | `CF-29` |
| Usuários publicam, ninguém responde por nada | `CF-31` |
| Canal de denúncia que ninguém lê | `CF-34` |
| Dependência adotada sem verificar licença | `CF-40` |
| Licença obrigatória descoberta após lançar | `CF-08` |
| Fraude tratada como problema de quem sofreu | `CF-44` |
| Atendimento automatizado sem saída para humano | `CF-46` |
| "O sistema recusou" e ninguém sabe por quê | `CF-49` |
| Única defesa é "não é proibido" | `CF-05` |

## Análise

| Sinal | Regra |
| :-- | :-- |
| Propor o processo ideal sem saber o atual | `AN-06` |
| Nenhum fluxo alternativo documentado | `AN-14` |
| Ferramenta citada antes de o problema estar claro | `AN-01` |
| Ninguém sabe dizer o que está fora do escopo | `AN-08` |
| Modelar pessoas em vez de papéis | `AN-10` |
| "Um cliente tem um endereço" nunca foi perguntado | `AN-24` |
| A mesma regra em quatro lugares, com números diferentes | `AN-28` |
| Registro fica pendente indefinidamente | `AN-15` `AN-16` |
| Usuário aprovou o que não entende | `AN-34` `ES-09` |
| Documento completo que ninguém lê | `AN-04` `AN-41` |
| Alterado só onde foi pedido | `AN-36` |
| "Tudo é prioritário" | `AN-44` |

## Processo e arquitetura

| Sinal | Regra |
| :-- | :-- |
| "Não precisa documentar nem planejar, é ágil" | `ES-57` |
| O descartável virou produção | `ES-05` |
| Sprints existem, mas o usuário só vê no fim | `ES-04` |
| Ninguém sabe dizer qual padrão arquitetural é | `ES-10` |
| Integração adiada por semanas | `ES-19` `OPS-15` |
| Manual contradiz o sistema | `ES-31` `ES-44` |
| Não há capacidade reservada para manutenção | `ES-32` |
| Distribuir "para já nascer preparado" | `ES-39` |
| Interface falando direto com o armazenamento | `ES-41` |
| Hierarquia de herança que cresce a cada variação | `ES-61` |
| Padrão aplicado sem o problema existir | `ES-65` |
| Ramo aberto há semanas | `ES-50` |
| Prazo comunicado como número único | `ES-56` |

## Código

| Sinal | Regra |
| :-- | :-- |
| Estilo do modelo sobreposto ao estilo do arquivo | `CD-01` |
| `data`, `result`, `processData` como nome final | `CD-03` |
| Função cuja descrição precisa de "e" | `CD-04` |
| `if (status === 3)` | `CD-06` |
| Erro de domínio tratado como defeito | `CD-07` |
| Captura vazia ou genérica; causa original perdida | `CD-08` |
| Segue com valor padrão silencioso | `CD-09` |
| "erro ao processar" sem contexto | `CD-10` |
| Função que promete calcular e também grava | `CD-11` |
| Comentário que descreve a linha seguinte | `CD-13` |
| Versão antiga comentada "por segurança" | `CD-14` |
| Abstração extraída na segunda ocorrência de forma | `CD-15` |

## Persistência

| Sinal | Regra |
| :-- | :-- |
| Banco aceita qualquer coisa | `BD-01` |
| Tabela sem chave primária | `BD-07` |
| Documento ou e-mail como identificador | `BD-08` |
| Coluna com valores separados por vírgula | `BD-18` |
| Total armazenado que diverge | `BD-19` |
| Apagar o pai leva o histórico junto | `BD-13` |
| Tabela de ligação só com as duas chaves | `BD-16` |
| Duplicata aparece sob acesso simultâneo | `BD-12` |
| Centavos que não fecham | `BD-05` |
| Consulta dentro do laço | `BD-28` |
| Listagem sem limite | `BD-29` |
| Muitos índices, escrita lenta, nenhuma medição | `BD-27` |
| Chamada externa dentro da transação | `BD-23` |
| Dois usuários editam, um perde sem aviso | `BD-24` |
| "Só rodei um comando rápido em produção" | `BD-37` |
| Aplicação conectada como administrador | `BD-34` |
| Escolha de paradigma sem vantagem demonstrada | `NS-01` |
| Nenhuma validação declarada porque "é sem esquema" | `NS-14` |
| Documento que cresce a cada evento | `NS-11` |
| Gravou, listou, não apareceu | `NS-19` |
| Cobrança em duplicidade após nova tentativa | `NS-23` |
| Sistema não funciona sem o cache | `NS-26` |
| Item efêmero sem prazo | `NS-27` |
| Quatro armazenamentos antes do primeiro usuário | `NS-30` |
| Mesmo dado alterável em dois lugares | `NS-31` `AN-45` |

## Interface

| Sinal | Regra |
| :-- | :-- |
| Investimento visual com fluxo ainda quebrado | `IX-03` |
| Estados vazio, erro e sem permissão não existem | `IX-21` |
| Código técnico exibido ao usuário | `IX-23` |
| Clique sem sinal de que foi recebido | `IX-25` |
| Dado de uma tela exigido na seguinte | `IX-13` |
| Nada domina visualmente | `IX-11` |
| Ação crítica representada só por ícone | `IX-18` |
| Mesmo botão em lugares e nomes diferentes | `IX-17` |
| Cada tela com suas medidas | `IX-15` `IX-27` |
| Componentes recriados a cada página | `IX-28` |
| Contraste nunca medido | `IX-33` |
| Fluxo novo direto em implementação | `IX-35` |
| Só quem construiu testou | `IX-41` |
| "O que você achou?" como validação | `IX-42` |
| Formulário longo que zera ao interromper | `IX-08` |

## Segurança e operação

| Sinal | Regra |
| :-- | :-- |
| "Depois a gente coloca autenticação" | `SEC-06` |
| Rota administrativa "secreta" sem verificação | `SEC-14` |
| Validação e permissão só na interface | `SEC-14` `SEC-23` |
| "Tem firewall na frente, está protegido" | `SEC-03` |
| Algoritmo inventado | `SEC-18` |
| Base de produção em ambiente de teste | `SEC-31` |
| Rotina de cópia existe, teste nunca houve | `SEC-44` |
| Marcado como inativo e chamado de exclusão | `SEC-49` |
| Campos coletados "para o futuro" | `SEC-48` |
| Chave criada uma vez, nunca rotacionada | `SEC-22` |
| Dado pessoal e token no registro | `SEC-35` |
| "O provedor cuida da segurança" | `SEC-52` |
| Esteira montada, ninguém olha o resultado | `OPS-01` |
| Barreiras existem, todo mundo ignora | `OPS-18` |
| "Só nesse servidor tem um ajuste" | `OPS-10` |
| Artefato diferente em cada etapa | `OPS-17` |
| Reversão nunca executada | `OPS-22` |
| Meses de esteira para produto que vai morrer | `OPS-06` |
| Orquestração pesada para serviço com dez usuários | `OPS-07` |
| Automação com permissão de administrador | `OPS-29` |
| Notificação que todo mundo silencia | `OPS-32` |
| Política de escala definida sem teste de carga | `OPS-39` |
| "Vamos juntar tudo e lançar de uma vez" | `OPS-02` |

## Qualidade e modelos

| Sinal | Regra |
| :-- | :-- |
| Quase tudo testado pela interface | `QS-17` |
| Testes escritos para subir o número | `QS-21` |
| Rituais existem, decisões não mudam | `ES-57` |
| Entrega depende de correria de uma pessoa | `OPS-05` |
| "Depois a gente testa" | `QS-13` |
| Atalhos sem registro | `QS-35` |
| Implementar a partir de uma frase solta | `QS-02` `QS-03` |
| Teste preso à aparência da tela | `QS-45` |
| `teste1`, `deveFuncionar` | `QS-47` |
| Modelo onde bastava uma regra | `AM-01` |
| "O modelo acerta 87%" — comparado a quê? | `AM-03` |
| Uma métrica só, classes desequilibradas | `AM-08` |
| Treinado uma vez, nunca reavaliado | `AM-11` |

---
