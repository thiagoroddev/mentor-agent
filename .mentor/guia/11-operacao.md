---
area: "Entrega e operação"
prefixo: "OPS"
portao: "O"
---

> §11 de 13. Índice: [`00-indice.md`](./00-indice.md). Consultado por lacuna do `contexto.json`, nunca do começo ao fim.

# §11 · Entrega e operação

*Software só gera valor em produção — e ferramenta sem mudança de cultura não resolve nada.*

## 11.1 Princípios

**OPS-01 · ACEITE ·** Cinco dimensões, nenhuma é ferramenta: **cultura** (responsabilidade compartilhada por construir *e* operar), **automação**, **fluxo enxuto**, **medição**, **compartilhamento**.

**OPS-02 · BLOQUEIA ·** **Lote pequeno e frequente reduz risco.** Entrega grande concentra risco: mais mudanças juntas, causa mais difícil de isolar, reversão mais dolorosa.

**OPS-03 · ACEITE ·** Retorno rápido em três direções: do teste para quem escreveu, da produção para o time, do usuário para o produto.

**OPS-04 · ACEITE ·** **Falha se analisa, não se culpa.** A pergunta é *o que no processo permitiu isso passar*. Cultura que pune erro produz gente que esconde erro.

**OPS-05 · ACEITE ·** **Quebrar o ciclo do medo:** mexer dá medo → evita-se automatizar → o sistema fica mais frágil → mais medo. A saída é sempre a mesma: escolher um pedaço pequeno, torná-lo reprodutível, provar que funciona, repetir.

## 11.2 Portão O — quanto automatizar

**OPS-06 · BLOQUEIA ·** **Automatizar a coisa certa antes de automatizar rápido.** Esteira industrial para um produto que será descontinuado é desperdício com aparência de competência.

**OPS-07 · BLOQUEIA ·** O grau de automação é decidido, não presumido:

| Situação | Recomendação |
| :-- | :-- |
| Protótipo, uso pessoal, vida curta (N1) | Versionamento + comando único de execução. Pipeline é exagero |
| Produto com usuários e evolução (N2) | Pipeline completo: verificação, empacotamento, publicação, reversão, observabilidade |
| Domínio regulado, dinheiro, dado sensível (N3) | Tudo acima + segregação de funções, aprovação registrada, trilha de auditoria |
| Equipe sem domínio de teste e automação | Introduzir em etapas, uma capacidade por vez |
| Legado que muda raramente | Priorizar reprodutibilidade e reversão |

→ Propor o mínimo que resolve e dizer o que ficou de fora e por quê. **Sobre-engenharia é falha, não zelo.**

**OPS-08 · BLOQUEIA ·** Três coisas nunca são opcionais: versionamento, comando único e reproduzível para subir o projeto, e caminho de volta para a versão anterior.

## 11.3 Ambientes e reprodutibilidade

**OPS-09 · BLOQUEIA ·** Infraestrutura descrita como código, versionada junto do projeto, revisada como código.

**OPS-10 · BLOQUEIA ·** **Nada de servidor floco de neve.** Ajuste manual não registrado cria ambiente que ninguém sabe recriar.
→ *Teste:* "se este ambiente sumir agora, eu consigo recriá-lo do zero?" Se não, ele é um floco de neve.

**OPS-11 · ACEITE ·** Repositório como fonte da verdade: o que está aprovado nele é o que deve estar rodando; o que não está não deveria existir.

**OPS-12 · ACEITE ·** Paridade entre ambientes no que importa: versões, forma de configurar, dados equivalentes em volume e formato (anonimizados).

**OPS-13 · ACEITE ·** Configuração fora do código, por ambiente. O mesmo artefato roda em qualquer ambiente mudando só a configuração.

**OPS-14 · ACEITE ·** Ambiente é substituído, não remendado. Ambiente descartável e recriável é o que torna a reversão confiável.

## 11.4 Esteira

**OPS-15 · BLOQUEIA ·** Integrar cedo e com frequência. Integração contínua não é a ferramenta — é o hábito de juntar o trabalho na linha principal, com verificação automática a cada junção.

**OPS-16 · BLOQUEIA ·** Etapas mínimas, disparadas automaticamente:

```
alteração → construção → verificação → empacotamento → teste → produção → observação
```

| Etapa | Falha quando pulada |
| :-- | :-- |
| Construção | "Compilava na minha máquina" |
| Verificação | Defeito descoberto pelo usuário |
| Empacotamento | Ninguém sabe o que está em produção |
| Publicação | Diferença entre o que foi testado e o que rodou |
| Observação | Incidente descoberto por reclamação |

**OPS-17 · BLOQUEIA ·** **Um artefato, promovido entre ambientes.** Reconstruir por ambiente invalida tudo que foi testado.

**OPS-18 · BLOQUEIA ·** **A esteira barra:** construção quebrada, teste falhando, análise estática reprovada, vulnerabilidade crítica, cobertura abaixo do limiar.
→ *Barreira que pode ser ignorada sem registro não é barreira.*

**OPS-19 · ACEITE ·** Retorno rápido ou ninguém usa. Verificação lenta é contornada.

**OPS-20 · BLOQUEIA ·** Linha principal sempre publicável. Se está quebrada, consertá-la é prioridade sobre qualquer funcionalidade.

**OPS-21 · ACEITE ·** Estar em produção não é o mesmo que estar visível. Publicar continuamente e liberar quando o negócio decidir permite lote pequeno sem expor trabalho incompleto.

## 11.5 Publicação e reversão

**OPS-22 · BLOQUEIA ·** **Reversão testada antes do primeiro deploy real.** Saber voltar é mais importante que publicar rápido. Reversão só existe se já foi executada de verdade.

**OPS-23 · BLOQUEIA ·** **Mudança de estrutura de dados exige atenção separada** — é a parte que a reversão de código não desfaz: passos compatíveis com a versão anterior, nunca destruir dado no mesmo passo que muda a estrutura, e caminho de volta.

**OPS-24 · ACEITE ·** Publicar gradualmente quando o risco justificar: uma fatia dos usuários, observação, depois o resto.

**OPS-25 · ACEITE ·** Publicação é operação registrada: o que subiu, qual versão, quem autorizou, quando, o que observar depois.

## 11.6 Segurança na esteira

**OPS-26 · BLOQUEIA ·** Segurança entra na esteira, não no fim. Revisão manual não acompanha entrega frequente.

**OPS-27 · ACEITE ·** Quatro verificações complementares:

| Verificação | Encontra |
| :-- | :-- |
| Análise estática do código | Padrão inseguro escrito por você |
| Análise de dependências | Vulnerabilidade conhecida em código de terceiro |
| Análise dinâmica | Falha explorável do lado de fora |
| Análise interativa | Falha que só aparece em execução, com contexto interno |

→ Mínimo em N2: as duas primeiras, automáticas.

**OPS-28 · BLOQUEIA ·** A descrição da infraestrutura é código sensível — e o **arquivo de estado pode conter segredo**: nunca em repositório público nem sem controle de acesso.

**OPS-29 · BLOQUEIA ·** Identidade e acesso na infraestrutura seguem as mesmas regras do sistema: menor privilégio para pessoas *e* automações, segundo fator, acesso registrado e revisado.
→ *Erro clássico:* dar permissão total à esteira porque "é mais fácil". **A esteira é a credencial mais valiosa do projeto.**

**OPS-30 · BLOQUEIA ·** Riscos verificados antes de qualquer publicação em produção:

```
[ ] Credencial exposta em código, histórico, imagem, log ou variável pública
[ ] Serviço acessível publicamente sem necessidade
[ ] Permissão mais ampla que o necessário
[ ] Ambiente divergente do declarado
[ ] Dado sensível sem cifragem em repouso ou trânsito
[ ] Atualização de segurança pendente
[ ] Dependência com vulnerabilidade conhecida
[ ] Ausência de cópia de segurança testada
```

## 11.7 Observabilidade e confiabilidade

**OPS-31 · BLOQUEIA ·** Quatro sinais, não apenas o primeiro:

| Sinal | Sem ele |
| :-- | :-- |
| **Registro** | Nenhum diagnóstico possível |
| **Métrica** | Nenhuma tendência, nenhuma comparação |
| **Rastro** | Caça ao culpado entre componentes |
| **Alerta** | Descoberta pelo usuário |

**OPS-32 · BLOQUEIA ·** **Alerta gera ação.** Alerta que ninguém atende treina o time a ignorar alerta. Cada um define: o que significa, quem age, o que fazer.

**OPS-33 · ACEITE ·** O objetivo é preventivo: detectar antes do usuário. Sistema que só se descobre quebrado pela reclamação não tem observabilidade — tem suporte.

**OPS-34 · ACEITE ·** Declarar o alvo em número — disponibilidade pretendida, tempo de resposta aceitável — e medir contra ele.

## 11.8 Continuidade, escala e custo

**OPS-35 · BLOQUEIA (N2+) ·** Quatro capacidades, todas **já exercitadas**: reversão, cópia e restauração, recriação do ambiente pelo código, plano de incidente.

**OPS-36 · ACEITE ·** Após cada incidente: registro, linha do tempo, causa-raiz, correção do processo, item que impede a repetição — com dono e prazo. Sem culpado.

**OPS-37 · ACEITE ·** O tempo médio de recuperação importa mais que o tempo entre falhas. Falha vai acontecer; a diferença entre susto e desastre é a velocidade da volta.

**OPS-38 · ACEITE ·** Distinguir escala **vertical** (máquina maior; simples, com teto e ponto único de falha) de **horizontal** (mais instâncias; exige que a aplicação **não guarde estado local**).
→ Se há chance de crescer horizontalmente, isso se decide na arquitetura, não no dia do pico.

**OPS-39 · ACEITE ·** Escala automática exige teste de carga antes. Sem saber demanda média, pico e qual métrica reage primeiro, a política é chute — e chute custa dinheiro nas duas direções.

**OPS-47 · ACEITE ·** Pico previsível se prepara antes. Escala automática é complemento para o imprevisto, não o plano — ela reage depois que a degradação começou.

**OPS-40 · ACEITE ·** **Custo é requisito não funcional.** Levantar no portão 0: quanto pode custar por mês, o que acontece se dobrar. Verificar recurso ocioso, superdimensionado, ambiente de teste esquecido ligado, armazenamento que só cresce.
→ *A conta inesperada de infraestrutura é a forma mais comum de um produto novo morrer por engenharia, e o leigo nunca pergunta.*

**OPS-41 · ACEITE ·** Modelo sem servidor dedicado tem vantagens e limitações reais: atraso na primeira execução, tempo máximo, estado obrigatoriamente externo, acoplamento ao provedor. Escolher pela carga, nunca por moda.

**OPS-44 · ACEITE ·** Classificar cada conjunto de dados pelo **tempo de recuperação tolerado** antes de escolher onde ele fica. Armazenamento barato cobra em espera e costuma impor permanência mínima. *Cópia que leva doze horas para voltar não atende um plano de duas horas.*

**OPS-45 · ACEITE ·** Mover e expirar dados por política automática, não por decisão manual recorrente.

**OPS-46 · BLOQUEIA (N2+) ·** **A localização física dos dados é decisão dupla:** latência para quem usa **e** jurisdição a que os dados se submetem. Dentro dela, distribuir por zonas de falha independentes — redundância dentro do mesmo ponto de falha não é redundância.

**OPS-48 · ACEITE ·** Fila com prioridade precisa de garantia contra inanição, ou o item de baixa prioridade nunca é atendido.

**OPS-49 · ACEITE ·** Declarar a versão mínima de plataforma suportada como decisão entre alcance e recursos, e revisá-la.

## 11.9 Métricas de entrega

**OPS-42 · ACEITE ·** Conjunto mínimo, lido em conjunto:

| Métrica | Sintoma ruim |
| :-- | :-- |
| Frequência de publicação | Cai quando o medo aumenta |
| Tempo do commit até produção | Cresce quando há etapa manual |
| Taxa de falha de publicação | Alta = barreiras fracas |
| Tempo de recuperação | Alto = reversão não testada |
| Defeitos escapados | Alto = esteira decorativa |
| Tempo de execução da verificação | Alto = as pessoas vão contorná-la |
| Custo por período | Cresce sem relação com uso |

**OPS-43 · BLOQUEIA ·** Nenhuma métrica é meta isolada. Frequência sem taxa de falha produz velocidade destrutiva; métrica usada para avaliar pessoa deixa de medir o sistema.

---
