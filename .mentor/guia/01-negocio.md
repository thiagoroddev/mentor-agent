---
area: "Viabilidade e modelo de negócio"
prefixo: "NG"
portao: "V"
---

> §1 de 13. Índice: [`00-indice.md`](./00-indice.md). Consultado por lacuna do `contexto.json`, nunca do começo ao fim.

# §1 · Viabilidade e modelo de negócio

*Antes de "como construir", responder "isto precisa existir?". A causa mais comum de morte de um produto não é defeito técnico — é construir bem algo que ninguém queria.*

## 1.1 Princípios

**NG-01 · BLOQUEIA ·** Construir é a parte cara. Antes dela, verificar se há problema real, pessoa real e disposição real de usar.

**NG-02 · BLOQUEIA ·** Toda funcionalidade é hipótese até a evidência dizer o contrário: `hipótese → menor teste que a verifica → evidência → decisão`. Decisão significa manter, ajustar ou **remover**. Funcionalidade que não provou valor e continua no produto é custo permanente disfarçado de patrimônio.

**NG-03 · BLOQUEIA ·** Não escalar antes de validar. Construir para volume e redundância antes de saber se alguém quer o produto amarra decisões difíceis de desfazer.

**NG-04 · ACEITE ·** Hipótese refutada é resultado, não fracasso. O erro é repetir o teste por não ter registrado o primeiro.

## 1.2 Portão V

**NG-05 · BLOQUEIA ·** Responder, em linguagem comum, antes de qualquer decisão técnica:

| # | Pergunta | Evita |
| :-- | :-- | :-- |
| 1 | Que problema é esse, e de quem é? | Produto sem dono do problema |
| 2 | Como resolvem isso **hoje**? | Ignorar o concorrente real |
| 3 | Por que a forma atual não serve? | Substituir algo que funcionava |
| 4 | Como saberemos, em números, que deu certo? | Sucesso indefinível |
| 5 | Quantas pessoas têm esse problema, realisticamente? | Dimensionar para mercado imaginário |
| 6 | Como isso se paga? | Produto que não se sustenta |
| 7 | Quanto custa manter por mês? | Descobrir o custo pela fatura |
| 8 | Quanto tempo e dinheiro até precisar dar resultado? | Planejar além do fôlego real |
| 9 | Existe regra do setor? | Descobrir a obrigação depois de lançar |

**NG-06 · BLOQUEIA ·** O concorrente real é a solução atual, não o produto parecido. Planilha, caderno e "a gente combina por telefone" são os concorrentes que mais vencem.

**NG-07 · ACEITE ·** Diferencial declarado: o que este produto faz melhor, para quem, e por que alguém trocaria. "Vai ser mais bonito" não é diferencial.

## 1.3 Fase e validação

**NG-08 · BLOQUEIA ·** Declarar a fase — ela determina o que faz sentido construir:

| Fase | Pergunta | Constrói | Erro característico |
| :-- | :-- | :-- | :-- |
| Ideação | O problema existe? | O mínimo para testar; às vezes nada de software | Construir tudo para descobrir isso |
| Validação | Quem valoriza esta solução? | Versão mínima que entrega valor real | Confundir lançar com validar |
| Tração | Como crescer o que funciona? | Automação, capacidade, retenção | Crescer sem saber por que funcionou |
| Escala | Como sustentar? | Robustez, operação, redundância | Ter chegado aqui sem base |

→ Propor sempre o menor artefato que responde à pergunta da fase atual.

**NG-09 · ACEITE ·** Versão mínima é mínima em **escopo**, não em qualidade. Faz menos coisas; as que faz funcionam, são seguras e não perdem dados.

**NG-10 · BLOQUEIA ·** Encaixe com o mercado é medido: as pessoas voltam sozinhas, continuam depois da novidade passar, recomendam sem serem pedidas, demonstram disposição de pagar. Muitos cadastros e nenhum retorno é o oposto de encaixe.

**NG-11 · ACEITE ·** Três números: quantas pessoas no mundo têm o problema; quantas este produto consegue atender; quantas dá para conquistar no primeiro ano. **O terceiro é o que entra nas decisões técnicas** — projetar para o primeiro é metade da sobre-engenharia que existe.

## 1.4 Modelo de negócio

**NG-12 · BLOQUEIA ·** Percorrer os nove blocos com o usuário. Cada um esconde requisito que ninguém pede:

| Bloco | Pergunta | Requisito esquecido |
| :-- | :-- | :-- |
| Segmentos | Para quem, exatamente? Há mais de um tipo? | Perfis com permissões e telas distintas |
| Proposta de valor | O que torna isso valioso? | A função central precisa ser a mais rápida e visível |
| Canais | Como chegam, compram e recebem? | Integrações, páginas públicas, origem rastreada |
| Relacionamento | Como conquista e mantém? | Suporte, notificações, histórico de atendimento |
| Receita | Como o cliente paga? | Tudo de §1.5 |
| Recursos-chave | Do que o negócio depende? | Dados, conteúdo, contas em terceiros |
| Atividades-chave | O que acontece todo dia? | Rotinas, importações, fechamentos |
| Parcerias | De quem se depende por fora? | Integrações e **o que fazer quando o parceiro cai** |
| Custos | Quanto custa manter? | Teto de custo, alerta de consumo |

**NG-13 · ACEITE ·** Dependência externa é decisão de negócio: o que acontece se cair, mudar de preço, mudar as regras ou encerrar. Produto cuja proposta de valor depende inteiramente de um terceiro tem o risco declarado.

## 1.5 Como o produto se paga

**NG-14 · BLOQUEIA ·** Modelo de negócio (como se cria valor) e modelo de receita (como vira dinheiro) são coisas distintas. Definir os dois.

**NG-15 · BLOQUEIA ·** **A forma de cobrança determina metade do sistema.** É aqui que "quero um SaaS" vira escopo real:

| Forma | Obriga a existir |
| :-- | :-- |
| **Assinatura** | Ciclo de cobrança, planos e limites, teste e seu fim, mudança de plano com valor proporcional, falha de pagamento e nova tentativa, suspensão, cancelamento imediato e ao fim do período, reembolso, nota fiscal, destino dos dados de quem cancelou |
| **Comissão** | Fluxo entre terceiros, repasse, conciliação, estorno, disputa, retenção, relatório para os dois lados |
| **Por uso** | Medição confiável, limite, aviso de aproximação, o que ocorre ao ultrapassar, contestação |
| **Anúncios** | Coleta e segmentação de audiência — logo, base legal e consentimento (§2.6) |
| **Margem** | Preço, custo, promoção, imposto, frete, devolução |
| **Por serviço** | Orçamento, aprovação, registro de execução, faturamento |

→ Cancelamento, falha de pagamento e mudança de plano geram o maior volume de atendimento e são os que mais ficam de fora.

**NG-15.1 · BLOQUEIA (se houver pagamento) ·** **Autorizar não é receber.** Iniciar, autenticar e liquidar são etapas distintas; a resposta da tela não prova que o dinheiro entrou. Exige: situação do pagamento como máquina de estados própria, separada da do pedido; confirmação assíncrona de quem liquida; operação idempotente; caminho previsto para falha em cada etapa.

**NG-16 · ACEITE ·** Gratuito é modelo, não ausência de modelo: o que é gratuito, o limite, o que motiva a conversão, e quem paga a conta de quem não paga.

## 1.6 O funil como fonte de requisitos

**NG-17 · BLOQUEIA ·** Cada etapa exige funcionalidade que o usuário leigo nunca pede:

| Etapa | Funcionalidade exigida | Medida |
| :-- | :-- | :-- |
| Aquisição | Registro de origem, página pública, convite | Quantos chegam, por onde, a que custo |
| **Ativação** | Primeiro uso guiado, estado vazio útil, caminho curto até o primeiro resultado | Quantos concluem a primeira tarefa |
| Receita | Tudo de §1.5 | Quantos convertem, quanto pagam |
| Retenção | Motivo de saída registrado, comunicação de retorno | Quantos voltam, quantos saem e por quê |
| Indicação | Compartilhamento, convite, indicação | Quantos chegam por indicação |

→ **Onde quase todo produto falha: ativação.** Cadastro concluído não é valor percebido. O caminho entre entrar e obter o primeiro resultado útil é a parte mais decisiva e a menos projetada.

**NG-18 · BLOQUEIA ·** Medir cada etapa desde o primeiro dia, com o mínimo de dados necessário. Sem isso não se sabe onde o funil vaza.

**NG-19 · ACEITE ·** Motivo de cancelamento é dado de produto: perguntar na saída, curto e opcional.

## 1.7 Crescimento, custo e sustentação

**NG-20 · ACEITE ·** Crescimento se projeta: poucos canais por vez, hipótese declarada, custo limitado, critério de decisão definido **antes** do teste.

**NG-21 · ACEITE ·** Comparação entre versões exige hipótese e critério antes. "Vamos testar e ver o que acontece" produz número sem conclusão.

**NG-22 · ACEITE ·** Retenção antes de acelerar aquisição. Muitos usuários que não voltam custam dinheiro e escondem a falta de encaixe.

**NG-23 · BLOQUEIA ·** Conhecer o intervalo entre gastar e faturar: quanto custa por mês, por quanto tempo há fôlego, o que precisa acontecer antes de acabar.

**NG-24 · BLOQUEIA ·** Custo por usuário conhecido. Se cada novo usuário custa mais do que traz, crescer piora a situação.

**NG-25 · ACEITE ·** Distinguir crescimento linear de escalável. Se atender o dobro exige o dobro de trabalho humano, é um serviço com apoio de software — legítimo, mas muda preço, prazo e o que vale automatizar.

**NG-26 · ACEITE ·** Automatizar o que dói e se repete, não tudo. Processo manual deliberado é frequentemente certo em fase inicial — desde que declarado temporário, com gatilho de automação definido.

## 1.8 Consequências do produto

**NG-31 · ACEITE ·** Antes de lançar, levantar: quem pode ser prejudicado, excluído ou exposto; quem não consegue usar; se o produto induz comportamento que faz mal a quem usa; consumo e custo ambiental; quem decide o quê e o que fica registrado.

**NG-32 · RECOMENDA ·** Efeito positivo pretendido, quando existir, é declarado e medido como qualquer outro objetivo.

---
