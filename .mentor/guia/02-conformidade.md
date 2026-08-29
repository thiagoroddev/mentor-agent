---
area: "Legislação, ética e conformidade"
prefixo: "CF"
portao: "C"
---

> §2 de 13. Índice: [`00-indice.md`](./00-indice.md). Consultado por lacuna do `contexto.json`, nunca do começo ao fim.

# §2 · Legislação, ética e conformidade

*§9 protege o sistema. Esta seção protege as pessoas afetadas por ele. Premissa: **desconhecer a obrigação não isenta de cumpri-la** — o exato oposto de como um leigo opera com uma IA.*

## 2.1 Princípios

**CF-01 · BLOQUEIA ·** Ignorância não isenta — nem a do usuário, nem a do agente. Levantar a obrigação é responsabilidade de quem sabe que ela existe.

**CF-02 · BLOQUEIA ·** Boa-fé nas três fases: **antes** (oferta, preço, promessa, o que o gratuito inclui), **durante** (entregar o prometido, avisar mudanças), **depois** (garantia, suporte, cancelamento, devolução de dados). *Quase todo produto falha na terceira: o fluxo de saída é o menos projetado e o mais regulado.*

**CF-03 · BLOQUEIA ·** Quem constrói sabe mais que quem usa — a assimetria gera dever, não vantagem. Complexidade técnica aumenta a obrigação de explicar.

**CF-04 · ACEITE ·** Conformidade é processo: manter o documento condizente com o que o sistema faz, registrar evidência, revisar quando o produto muda.

**CF-05 · ACEITE ·** Cumprir a lei é o piso. Quando a única defesa de uma decisão for "não é proibido", isso é alerta, não aprovação.

## 2.2 Portão C

**CF-06 · BLOQUEIA ·** Roda junto com o portão V:

| # | Pergunta | Determina |
| :-- | :-- | :-- |
| 1 | Onde estão os usuários? De onde opera o negócio? | Jurisdição, foro |
| 2 | Vende a pessoa física ou entre empresas? | Regime de proteção do consumidor |
| 3 | Setor com regra própria (saúde, financeiro, educação, seguros, jogos, transporte)? | Obrigações e licenças |
| 4 | Menores podem usar? | Regime reforçado (§2.7) |
| 5 | Coleta dado pessoal? Sensível? | §2.6 e §9.8 |
| 6 | Usuários publicam conteúdo visível por outros? | §2.8 |
| 7 | Há cobrança ou intermediação de pagamento? | §2.4 |
| 8 | O sistema decide automaticamente sobre pessoas? | §2.10 |
| 9 | Usa código, conteúdo, fonte, imagem ou dado de terceiros? | §2.9 |

**CF-07 · BLOQUEIA ·** Jurisdição declarada e visível. Produto que atende outro país frequentemente atrai as regras de lá — e "não atendemos essa região" precisa corresponder ao que o sistema faz.

**CF-08 · BLOQUEIA ·** Setor regulado descoberto cedo. Saúde, dinheiro, crédito, educação formal, seguros e transporte costumam exigir licença **antes** de operar.

## 2.3 Informação e transparência

**CF-09 · BLOQUEIA ·** Informação clara, completa e visível sobre o que o produto é, faz, não faz, custa e o que limita a oferta.

**CF-10 · BLOQUEIA ·** O critério é a pessoa comum. Documento longo, tecnicamente correto e praticamente ilegível **não cumpre o dever de informar** — cumpre a aparência dele. Resumo em linguagem simples no topo, completo abaixo, explicação no ponto da decisão.

**CF-11 · BLOQUEIA ·** Preço total, sem surpresa: valor final, o que é recorrente, quando reajusta, o que ocorre ao fim da promoção. Custo revelado no último passo é prática enganosa.

**CF-12 · BLOQUEIA ·** A oferta obriga. Preço, funcionalidade prometida e prazo divulgado vinculam — o que torna conteúdo de marketing um artefato que passa por revisão.

**CF-13 · ACEITE ·** Publicidade não engana nem explora — nem por afirmação falsa, nem por omissão, nem por exploração de medo, urgência ou inexperiência.

## 2.4 Contratação e desfazimento

**CF-14 · BLOQUEIA ·** Registrar o aceite: quem, qual versão do documento, quando. O ônus de provar recai sobre quem construiu.

**CF-15 · BLOQUEIA ·** Contratação a distância costuma dar direito a desfazimento em prazo de reflexão, sem justificativa. É requisito de sistema: fluxo de arrependimento, estorno, destino do que já foi usado.

**CF-16 · BLOQUEIA ·** **Cancelar tão fácil quanto contratar** — mesmo canal, mesmo número de passos. *Teste: conte os passos dos dois fluxos; se o de saída for maior, é problema.*

**CF-17 · ACEITE ·** Mudança unilateral de termos exige aviso prévio e, quando piora a posição de quem já contratou, saída sem penalidade.

**CF-18 · ACEITE ·** Fim da relação tem procedimento: destino dos dados, prazo de exportação, o que é apagado, o que a lei obriga a guardar.

## 2.5 Padrões manipulativos

**CF-19 · BLOQUEIA ·** **Interface eficaz e desonesta continua desonesta.** §8 ensina a fazer o usuário concluir a tarefa; esta regra define quais tarefas é legítimo fazê-lo concluir. O agente **recusa** construir:

| Padrão | Como aparece |
| :-- | :-- |
| Saída difícil | Cancelamento escondido, com mais passos que a entrada |
| Consentimento forçado | Aceitar em um clique, recusar em cinco; opção pré-marcada; permissão sem relação com a função |
| Custo escondido | Acréscimo no último passo; renovação sem aviso; teste que vira cobrança em silêncio |
| Urgência falsa | Contador ou escassez que não correspondem a nada real |
| Constrangimento na recusa | Recusar exige clicar em algo que humilha |
| Continuidade forçada | Cobrar após o teste sem lembrete, sabendo que a pessoa esqueceu |
| Confusão deliberada | Texto ou botão redigido para que a escolha errada pareça a certa |

**CF-20 · BLOQUEIA ·** **Teste da boa-fé:** *a pessoa faria a mesma escolha se entendesse plenamente o que está acontecendo?* Se a resposta depende de ela **não** entender, o desenho está errado — independentemente de converter melhor.

**CF-21 · ACEITE ·** Métrica não justifica meio. Quando um teste vencer por confundir, o resultado é rejeitado, não implementado.

## 2.6 Dados pessoais

**CF-22 · BLOQUEIA ·** A pessoa controla os próprios dados. O tratamento é autorização com finalidade, limite e prazo — não direito de quem coleta.

**CF-23 · BLOQUEIA ·** Fundamento declarado **por finalidade**. "Está no termo de uso" não é fundamento; termo de uso informa, não autoriza tudo.

**CF-24 · BLOQUEIA ·** Consentimento válido é livre (recusar não inviabiliza o que não depende daquele dado), informado, específico (um pedido por finalidade), destacado e **revogável com a mesma facilidade com que foi dado**.

**CF-25 · BLOQUEIA ·** **O documento descreve o sistema real** — inclusive o que serviços de terceiros coletam por conta própria. Divergência entre o declarado e o executado é a falha mais fácil de comprovar contra quem construiu.

**CF-26 · BLOQUEIA ·** Terceiros declarados: quem recebe dado pessoal, para quê, sob que compromisso. Análise, mensageria, pagamento, publicidade e infraestrutura entram na lista.

**CF-27 · ACEITE ·** Coletar menos é a melhor conformidade. Dado não coletado não vaza, não precisa de fundamento e não aparece em incidente.

## 2.7 Crianças e adolescentes

**CF-28 · BLOQUEIA ·** Menor não tem capacidade plena para contratar. "Pode ser usado por menores" inclui **na prática**, não só segundo os termos.

**CF-29 · BLOQUEIA ·** Havendo possibilidade real de uso por menores:

```
[ ] Verificação de idade proporcional ao risco (não só uma caixa de "confirmo ter 18 anos")
[ ] Consentimento de responsável, específico e destacado, para tratar dados
[ ] Barreira efetiva antes de compra ou cobrança
[ ] Controle parental quando conteúdo ou tempo de uso importarem
[ ] Publicidade e mecanismos de engajamento revistos — o que é persuasão para adulto é exploração para criança
[ ] Caminho para desfazer contratação feita por menor, sem litígio
```

**CF-30 · ACEITE ·** A proteção de menores tem prioridade sobre metas de produto. Retenção, engajamento e monetização cedem — e esta é uma das poucas regras do guia sem contrapeso comercial.

## 2.8 Conteúdo de terceiros

**CF-31 · BLOQUEIA ·** Se usuários publicam conteúdo visível por outros, o produto tem obrigações de plataforma — mesmo sendo um campo de comentários:

```
[ ] Regras de conduta no termo de uso, com consequência definida
[ ] Canal de denúncia acessível de onde o conteúdo aparece
[ ] Processo de análise com responsável e prazo
[ ] Capacidade técnica de remover conteúdo específico rapidamente
[ ] Registro do que foi removido, quando e por quê
[ ] Comunicação ao autor | Caminho de contestação
```

**CF-32 · BLOQUEIA ·** Conteúdo íntimo publicado sem autorização se remove com diligência mediante pedido do envolvido, sem esperar decisão judicial. A demora causa dano irreparável.

**CF-33 · ACEITE ·** Responsabilidade cresce com o controle exercido. Quem apenas transmite responde menos; quem organiza, recomenda, ordena ou monetiza responde mais — **um sistema de recomendação é escolha editorial, não cano neutro**.

**CF-34 · ACEITE ·** Canal que ninguém lê é pior que canal nenhum: ignorar denúncia transforma responsabilidade de terceiro em responsabilidade própria.

## 2.9 Registros, cooperação e propriedade

**CF-35 · ACEITE ·** Guardar o exigido, pelo prazo exigido, e não mais. A tensão com minimizar dados se resolve por definição explícita.

**CF-36 · ACEITE ·** Registro guardado é dado sensível: ambiente controlado, acesso restrito e auditado, fornecimento só mediante pedido legítimo e verificado.

**CF-37 · ACEITE ·** Ter caminho definido para pedido de autoridade — quem recebe, valida, responde e registra — evita tanto a recusa indevida quanto a entrega indevida.

**CF-38 · ACEITE ·** Incidente preserva evidência **antes** de corrigir. O impulso de restaurar o serviço apaga o que permitiria entender o que houve.

**CF-39 · BLOQUEIA ·** Autoria e titularidade definidas antes de existir valor: quem criou, de quem é, o que acontece se a pessoa sair.

**CF-40 · BLOQUEIA ·** Toda dependência tem licença com condições: permite uso comercial? obriga a abrir o próprio código? exige atribuição?
→ *Licença recíproca* obriga quem distribui obra derivada a liberá-la nas mesmas condições — obrigação contratual, e o alcance de "derivado" se verifica antes.
→ Vale para imagem, fonte, texto, base de dados e trecho copiado de qualquer lugar, **inclusive gerado por ferramenta**.

**CF-41 · BLOQUEIA ·** Usar software sem licença válida é violação, mesmo internamente, mesmo em desenvolvimento.

**CF-42 · ACEITE ·** Livre não significa gratuito, e gratuito não significa livre.

**CF-43 · ACEITE ·** Comprovar autoria com data: registro formal quando fizer sentido, ou ao menos histórico de versionamento íntegro e datado.

## 2.10 Obrigações de acesso e decisão automatizada

**CF-44 · BLOQUEIA ·** Falha de segurança é responsabilidade de quem oferece o serviço, não do usuário atacado. Quem explora a atividade responde pelos riscos dela — adotando as proteções usuais, não as mínimas.

**CF-45 · BLOQUEIA ·** Canal de contato real, identificável e acessível, com prazo que se cumpre. Produto sem forma de falar com alguém é problema de conformidade.

**CF-46 · ACEITE ·** Atendimento automatizado precisa de saída para humano, visível e sem labirinto — é o que impede que a automação vire barreira de acesso a um direito.

**CF-47 · ACEITE ·** Acessibilidade é obrigação, não melhoria (§8.9).

**CF-48 · ACEITE ·** Decisão automatizada que afeta alguém tem dono: aprovar, recusar, priorizar, precificar, suspender, moderar. Responde quem a implantou, não o modelo.

**CF-49 · ACEITE ·** Registrar o suficiente para explicar: dados de entrada, versão do critério, resultado, data. Sem isso não há resposta para "por que fui recusado?".

**CF-50 · ACEITE ·** Caminho de contestação e revisão humana para decisão de impacto relevante. Automatizar é legítimo; automatizar sem recurso, não.

**CF-51 · ACEITE ·** Avaliar efeito desigual antes de implantar. Ausência de intenção discriminatória não impede resultado discriminatório.

**CF-52 · ACEITE ·** Deixar claro quando é máquina — se está falando com um sistema e se a decisão foi automatizada.

---

---

# Apêndice A — Mapeamento para a legislação brasileira

> O corpo do guia é genérico de propósito; este apêndice é o que se troca ao adaptar para outra jurisdição. **Verificar vigência antes de usar** — legislação muda, e este mapeamento reflete o material de origem.

| Regra | Norma correspondente |
| :-- | :-- |
| CF-01 | LINDB (Dec.-Lei 4.657/1942), art. 3º — ninguém se escusa alegando desconhecimento |
| CF-02, CF-20 | Código Civil (10.406/2002), art. 422 (boa-fé objetiva); art. 884 (enriquecimento sem causa) |
| CF-03, CF-09, CF-10 | CDC (8.078/1990), art. 4º, I (vulnerabilidade); art. 6º, III (informação adequada e clara) |
| CF-07 | LINDB art. 9º; CC art. 435 — lei aplicável à obrigação |
| CF-11, CF-12, CF-13 | CDC arts. 30, 35, 37; Decreto 7.962/2013 |
| CF-14, CF-15 | CDC art. 49 — arrependimento, 7 dias; Decreto 7.962/2013 |
| CF-16, CF-18 | Decreto 7.962/2013; CDC art. 6º |
| CF-19, CF-21 | CDC arts. 6º, IV e 39 — práticas abusivas; CC art. 422 |
| CF-22 a CF-27 | LGPD (13.709/2018) — autodeterminação, bases legais, consentimento, finalidade, necessidade |
| CF-28 a CF-30 | CC art. 5º; ECA (8.069/1990); CF/88 art. 227; Marco Civil art. 29; LGPD art. 14 |
| CF-31 a CF-34 | Marco Civil (12.965/2014), arts. 18-21; art. 21 (conteúdo íntimo) |
| CF-35 a CF-37 | Marco Civil arts. 13, 15, 22 — guarda de registros (conexão 1 ano, aplicação 6 meses) |
| CF-39 a CF-43 | Lei de Software (9.609/1998); Direitos Autorais (9.610/1998); CP art. 184; registro no INPI |
| CF-44 | CDC arts. 8º a 17 — fato do produto e do serviço; teoria do risco da atividade |
| CF-45, CF-46 | CDC art. 18, §1º (30 dias); Decreto 7.962/2013 |
| CF-47, IX-33 | Lei Brasileira de Inclusão (13.146/2015) |
| CF-48 a CF-52 | LGPD art. 20 — revisão de decisão automatizada |
| SEC-41 | LGPD art. 48 — comunicação de incidente |
| — | Crimes: CP arts. 138-140, 154-A, 171, 266, 298; Leis 12.737/2012 e 14.155/2021; Convenção de Budapeste |

---
