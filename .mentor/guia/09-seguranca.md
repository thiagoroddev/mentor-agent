---
area: "Segurança"
prefixo: "SEC"
portao: "S"
---

> §9 de 13. Índice: [`00-indice.md`](./00-indice.md). Consultado por lacuna do `contexto.json`, nunca do começo ao fim.

# §9 · Segurança

*Segurança não é produto, é processo — e a maior parte das vulnerabilidades está no software, não na infraestrutura. Estrutura: identificar, proteger, detectar, responder, recuperar. Quase todo projeto faz o segundo e ignora os outros quatro.*

## 9.1 Princípios inegociáveis

**SEC-01 · BLOQUEIA ·** **Seguro por padrão.** O sistema nasce fechado; o acesso é aberto por decisão explícita.

**SEC-02 · BLOQUEIA ·** **Menor privilégio.** Cada usuário, serviço, chave e credencial recebe o mínimo para sua função — inclusive o usuário que a aplicação usa no banco.

**SEC-03 · BLOQUEIA ·** **Defesa em profundidade.** Se a borda falhar, a validação no código sustenta; se essa falhar, a restrição no armazenamento sustenta.

**SEC-04 · BLOQUEIA ·** **Toda entrada externa é hostil** — inclusive a do próprio front-end, de integrações parceiras e de arquivos.

**SEC-05 · ACEITE ·** Segurança é contínua. Sem rotina de revisão não há segurança — há uma foto antiga.

## 9.2 Portão S — modelagem de ameaça

**SEC-06 · BLOQUEIA (N2+) ·** Antes da arquitetura, responder as quatro classes de ataque:

| Ataque | Quebra | Pergunta ao usuário |
| :-- | :-- | :-- |
| Interrupção | Disponibilidade | O que acontece se ficar fora do ar? |
| Interceptação | Confidencialidade | Que informação não pode ser lida por terceiros? |
| Modificação | Integridade | Que dado, alterado às escondidas, causaria prejuízo? |
| Fabricação | Autenticidade | Que ação alguém poderia forjar se passando por outro? |

**SEC-07 · ACEITE ·** Risco = ameaça × vulnerabilidade × impacto, não sensação.

**SEC-08 · BLOQUEIA ·** Todo risco recebe tratamento declarado: **prevenir**, **reduzir**, **transferir** ou **tolerar** — este último com registro e data de revisão.
→ *Tolerar é legítimo, sobretudo em produto novo. **Tolerar sem registrar é negligência**, e é o comportamento padrão de quem não sabe que o risco existe.*

**SEC-09 · BLOQUEIA ·** Considerar as quatro origens, não só a terceira: **humana não intencional** (a mais frequente: credencial em repositório, configuração errada, exclusão acidental, clique em fraude); **interna intencional** (maior prejuízo histórico); **externa intencional**; **não humana** (falha de hardware, indisponibilidade, desastre).

## 9.3 Identificar

**SEC-10 · BLOQUEIA ·** Inventário: sistemas, serviços externos, credenciais, dependências, onde cada dado reside. Não se protege o que não se sabe que existe.

**SEC-11 · BLOQUEIA ·** Classificar a informação e derivar o controle da classe:

| Classe | Controle mínimo |
| :-- | :-- |
| Pública | Integridade e disponibilidade |
| Interna | Autenticação |
| Confidencial | Autorização + registro de acesso |
| Secreta / sensível | Cifragem em repouso + registro + revisão periódica de acesso |

**SEC-12 · BLOQUEIA ·** Proteger o dado nas quatro fases — manuseio, armazenamento, transporte e **descarte**. A quarta é sistematicamente esquecida: marcado como inativo e mantido para sempre; cópias em backup, cache, exportações e ambientes de teste.

## 9.4 Proteger

**SEC-13 · BLOQUEIA ·** Três perguntas respondidas separadamente: **autenticação** (quem é você?), **autorização** (o que pode fazer?), **contabilização** (o que fez?).

**SEC-14 · BLOQUEIA ·** **Autorização verificada no servidor, a cada requisição, sobre o recurso específico.** Esconder o botão não é autorização. Presumir que quem chegou à rota tem direito ao registro é a falha de acesso mais comum e mais explorada.

**SEC-15 · ACEITE ·** Modelo de autorização registrado em **matriz papel × recurso × operação**. Sem a matriz, ninguém consegue testar autorização.

**SEC-16 · ACEITE ·** Segundo fator para contas administrativas e operações irreversíveis. A força vem de combinar categorias diferentes: o que se sabe, o que se tem, o que se é.

**SEC-17 · BLOQUEIA (N3) ·** Segregação de funções: quem desenvolve não aprova nem publica sozinho.

**SEC-18 · BLOQUEIA ·** Nunca criar algoritmo próprio nem improvisar composição de primitivas.

**SEC-19 · BLOQUEIA ·** A ferramenta certa para cada problema:

| Objetivo | Mecanismo | Erro clássico |
| :-- | :-- | :-- |
| Guardar senha | Derivação lenta com sal (irreversível de propósito) | Guardar cifrada — ou legível |
| Verificar integridade | Resumo criptográfico atual | Algoritmo já quebrado |
| Proteger dado que precisa voltar | Cifragem simétrica forte | Chave junto do dado |
| Partes sem segredo comum | Cifragem assimétrica | Usá-la para grande volume |
| Provar autoria | Assinatura digital | Confundir com cifragem |

**SEC-20 · BLOQUEIA ·** Algoritmo ou protocolo obsoleto é proibido, mesmo que ainda funcione e ainda esteja em tutoriais.

**SEC-21 · BLOQUEIA ·** Todo transporte cifrado, sem exceção para ambiente interno; certificado válido, renovação automatizada.

**SEC-22 · BLOQUEIA ·** **Segredos nunca no código, no repositório, no histórico de commits, no front-end nem em log.** Ficam em cofre, são rotacionáveis, e vazamento implica rotação imediata.

**SEC-23 · BLOQUEIA ·** Validar toda entrada por **esquema declarado no servidor**: tipo, formato, faixa, tamanho máximo. Validação no cliente é conveniência de interface, nunca controle de segurança.

**SEC-24 · BLOQUEIA ·** Dado nunca concatenado dentro de comando interpretado — consulta, comando de sistema, marcação de página, modelo de documento. Sempre parametrização ou escape do próprio mecanismo.

**SEC-25 · BLOQUEIA ·** **Controlar também a saída:** a resposta devolve apenas os campos previstos. Retornar o registro inteiro é o vazamento mais silencioso que existe.

**SEC-26 · ACEITE ·** Limitar taxa em autenticação, recuperação de senha, envio de mensagens e operações caras.

**SEC-27 · ACEITE ·** Arquivo enviado por usuário é código até prova em contrário: validar tipo real, limitar tamanho, renomear, armazenar fora do diretório servido, nunca executar.

**SEC-28 · BLOQUEIA ·** Mensagem de erro ao usuário não revela estrutura interna, versão, caminho nem consulta. O detalhe vai para o log.

**SEC-29 · BLOQUEIA ·** Só é exposto ao público o que precisa atender o público. Banco, filas, painéis administrativos e serviços internos ficam em rede privada.

**SEC-55 · BLOQUEIA ·** **A rede nasce privada; a exposição é exceção declarada** — muitas configurações padrão fazem o oposto. Componente interno sem endereço público; saída para a internet por caminho unidirecional; acesso a serviços gerenciados por conexão privada.
→ Ao escolher o componente de borda, confirmar que suporta os controles exigidos — limite por cliente, validação, cache, filtragem. A variante mais simples frequentemente não suporta.

**SEC-30 · BLOQUEIA ·** Ambientes separados, com credenciais distintas. Credencial de produção não existe fora de produção.

**SEC-31 · BLOQUEIA ·** Ambiente de teste usa dado fictício ou anonimizado. Cópia de produção fora de produção é vazamento com data marcada — e, havendo dado pessoal, é ilegal.

**SEC-32 · BLOQUEIA ·** Dependências de fonte oficial, versão fixada, verificação automática de vulnerabilidades no pipeline. Antes de adicionar: quem mantém, com que frequência, qual histórico.

**SEC-33 · ACEITE ·** O elo mais fraco é humano: segundo fator nas contas de desenvolvimento e publicação, revisão obrigatória, e **nenhuma solicitação urgente por mensagem substitui o procedimento**. A fraude por persuasão não ataca o código, ataca a pressa.

## 9.5 Detectar

**SEC-34 · BLOQUEIA ·** Registro estruturado do que importa — autenticação (sucesso e falha), mudança de permissão, acesso a dado confidencial, operação irreversível, erro de servidor — respondendo **quem, o quê, quando, de onde**.

**SEC-35 · BLOQUEIA ·** Log nunca contém senha, token, dado pessoal completo ou número de cartão. Mascarar na origem.

**SEC-36 · ACEITE ·** Definir os alertas que geram ação: pico de falhas de autenticação, erro fora do padrão, acesso a dado confidencial fora de hora, mudança de permissão não prevista.

**SEC-37 · ACEITE ·** Distinguir **detectar** (observa e alerta) de **bloquear** (age na hora, com risco de barrar tráfego legítimo). Em produto novo, começar detectando.

**SEC-38 · RECOMENDA (N3) ·** Verificação ativa periódica: varredura da aplicação em execução e teste de intrusão por terceiro antes de marcos relevantes.

## 9.6 Responder e recuperar

**SEC-39 · BLOQUEIA (N2+) ·** **Plano de incidente escrito antes do incidente:** como se detecta, quem decide, como se contém, como se comunica, como se apura a causa. Improvisar durante o incidente multiplica o dano.

**SEC-40 · BLOQUEIA ·** Credencial exposta é considerada comprometida: rotacionar primeiro, investigar depois. Remover do histórico não desfaz a exposição.

**SEC-41 · BLOQUEIA (dado pessoal) ·** Vazamento tem obrigação legal de comunicação ao titular e à autoridade, em prazo. O agente informa isso no portão S, não no dia do incidente.

**SEC-42 · ACEITE ·** Todo incidente gera análise de causa-raiz e correção **do processo** que o permitiu.

**SEC-43 · BLOQUEIA (N2+) ·** Cópia de segurança **3-2-1**: três cópias, dois meios, uma fora do ambiente principal. Ao menos uma **imutável** — que nem o administrador apaga dentro de um prazo. É a única defesa real contra sequestro de dados e exclusão acidental.

**SEC-44 · BLOQUEIA (N2+) ·** **Restauração testada** com periodicidade definida. *Cópia nunca restaurada não é cópia de segurança, é esperança.*

**SEC-45 · ACEITE ·** Declarar com o usuário, em linguagem comum: quanto tempo podemos ficar fora do ar e quanto de dado podemos perder. Esses dois números definem a arquitetura de recuperação e o custo.

## 9.7 Privacidade

**SEC-46 · BLOQUEIA (dado pessoal) ·** Mapear cada dado: o quê, para quê, com que fundamento, quem acessa, onde fica, por quanto tempo, como se apaga.

**SEC-47 · BLOQUEIA ·** Distinguir **dado pessoal** (identifica alguém) de **sensível** (pode gerar discriminação). O segundo exige proteção reforçada e fundamento mais estrito.

**SEC-48 · BLOQUEIA ·** **Minimização.** Todo campo de formulário justifica sua existência. "Pode ser útil depois" não é justificativa — é passivo.

**SEC-49 · BLOQUEIA ·** Direitos do titular são funcionalidade: acessar, corrigir, portar, revogar consentimento e **excluir de verdade** — inclusive de cópias de trabalho, cache, exportações, ferramentas de terceiros e comunicações.

**SEC-50 · ACEITE ·** Papéis declarados: quem decide o uso, quem apenas processa, quem responde pelo canal com titulares. Todo serviço terceiro que recebe dado pessoal é um processador e precisa estar listado.

**SEC-51 · ACEITE ·** Prazo de retenção por tipo de dado, com eliminação automatizada. Guardar indefinidamente é decisão — quase sempre tomada por omissão.

## 9.8 Nuvem e terceiros

**SEC-52 · BLOQUEIA ·** **Responsabilidade compartilhada:** o provedor responde pela segurança *da* plataforma; você, pela segurança *na* plataforma — configuração, permissões, chaves, exposição, quem acessa o painel. Quanto mais gerenciado, menos superfície sobra — mas a configuração **nunca** deixa de ser sua.

**SEC-53 · ACEITE ·** Antes de adotar serviço externo: que dado recebe, onde armazena, quem acessa, o que acontece se encerrar, e como se sai dele.

**SEC-54 · ACEITE ·** Acesso ao painel com segundo fator, menor privilégio e revisão periódica. Ex-colaborador com acesso ativo é a falha mais barata de evitar e a mais comum de encontrar.

---
