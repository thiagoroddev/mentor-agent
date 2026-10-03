# ADRs, consistência e contratos verificáveis

## Descoberta e fonte única

Tornar o caminho das ADRs configurável no contexto, com o caminho atual como fallback. Resolver a raiz uma vez em caminhos(), preservando consumidores que usam c.adr: contagem, doctor, restrições fundadoras, consulta, gerador e verificar.

No piloto, as dez ADRs estão em `docs/arquitetura/ADR`, enquanto o pacote procura sob `docs-mentor/arquitetura/ADR`. Configurar a origem evita mover arquivos e quebrar links. Caminhos devem permanecer dentro das raízes permitidas do projeto; preservar a proteção contra travessia e symlinks externos.

ADRs continuam contendo contexto, alternativas, consequências e histórico. A seção Diretrizes operacionais é a fonte canônica estruturada do conteúdo que alimenta a habilidade. Não manter uma segunda versão manual das regras na habilidade.

## Formato e vigência

Definir formato versionado, com identificador estável por diretriz, estado de aceitação (proposta, aceita, revogada), regra, alcance, exceções e identificadores que substitui. A forma exata do bloco e o parser são definidos no planejamento individual da fatia B; não inferir o estado por linguagem livre.

Vigência é derivada das diretrizes aceitas e das substituições. Substituição é por diretriz, não pela ADR inteira. ADR-006 substitui parte da identidade da ADR-004, preservando shadcn/ui. Referenciar ADR-004 ainda pode ser correto.

A primeira extração do piloto é revisada pelo mantenedor, uma ADR por vez. Separar reprodução de decisão vigente de proposta nova. Histórico da ADR-006 não permite recuperar automaticamente o ciano antigo como regra atual. Código e decisão em conflito são apresentados para resolução, não convertidos silenciosamente em nova decisão.

## Geração e transição

mentor gerar produz a habilidade na fonte do projeto antes de sincronizar .agents/skills e .claude/skills. Gerar com ordem determinística, origem e identificação de versão. Evitar alteração parcial se houver erro. Preservar recusas existentes para fonte/cópia alheia, edição manual e conflito de nomes.

mentor verificar confere IDs únicos, referências existentes, substituições sem ciclos/ambiguidades, fontes/cópias atualizadas e propostas/revogações indevidamente vigentes. ADR sem diretriz exige justificativa explícita de ausência ou diagnóstico de extração pendente.

Sem ADRs: declarar essa condição. Legado sem normalização: manter consulta dos documentos originais e explicitar pendências; não produzir falsa declaração de ausência de decisões. O modo estruturado é ativado com as fontes e a habilidade funcionando.

A habilidade deve ter diretivas curtas com alcance/origem. Ler ADR completa quando houver dúvida, conflito ou arquitetura relacionada. A capacidade de geração não altera a hierarquia contexto → núcleo → processos → guias.

## Contrato operacional dos planos

Versionar e acrescentar a plano e ao contrato portátil:

| Campo | Conteúdo |
|---|---|
| decisoes_aplicaveis | Diretrizes pertinentes, forma de cumprimento e exceções autorizadas; ausência exige motivo |
| reuso | Componentes, serviços, contratos e padrões existentes; novos artefatos, justificativa e localização |
| habilidades | Habilidades de planejamento e execução, motivos e origem |
| avaliacao | Complexidade, dimensão dominante, risco, perfil e effort para planejamento/execução; carga mantém campo de esforço existente |

Preservar campos existentes: pedido, solução sugerida, mérito, alternativas, arquivos, aceites, impacto, riscos, dependências, proporcionalidade e validação. Mesmos campos para avulsa e fatia. Na coordenadora, execução direta recebe não aplicável com motivo.

Atualizar tipos, esquema/modelos, nova/iniciar, importação, vínculo e resolverPlano. Não perder campos ao vincular contrato. Corrigir a divergência entre interface documentada por PLAN-ID e comando atual que exige --arquivo, preservando a forma existente durante a transição.

Validar referências localmente disponíveis sem inventar habilidades inexistentes. Para habilidades externas à sincronização do pacote/projeto, identificar origem e limite da verificação automática. Existência de ADR não comprova cobertura semântica completa; a aplicação exige julgamento e justificativa.

Marcar planos novos com a versão do contrato. Histórico continua legível; adoção por tarefas abertas ocorre em replanejamento autorizado, sem bloqueio retroativo generalizado.

## Herança, hashes e revisão

O contrato portátil declara os documentos normativos herdados; o CLI gera o manifesto em plano_ref.manifesto. Não selecionar todo o épico por padrão.

Identidade efetiva inclui contrato individual, documentos comuns herdados, revisões aplicáveis e conteúdo operacional das diretrizes selecionadas. Hashes e IDs são produzidos pelo script, nunca digitados.

Não invalidar outra fatia por documento que ela não herda, por atualização de estado ou por alteração histórica que não muda uma diretriz pertinente. Manifesto e resolvedor devem usar a mesma seleção normativa.

Assinatura semântica da revisão inclui os novos campos contratuais e hashes pertinentes. Dossiê usa o mesmo resolvedor e recebe o texto normativo, não apenas o hash. Em cmd-auditar, vínculo normativo tem precedência sobre exclusão genérica de rascunho. Contexto grande é dividido explicitamente, sem truncar silenciosamente.

Mudança normativa diagnostica divergência; avaliar materialidade e obter aprovação quando necessária. Manter proteção de caminhos, binários e limites já existentes. Não religar REV como efeito colateral.

## Estado sem auto-invalidação

Adicionar mentor plano status como consulta derivada de planos.json e tarefas JSON, mostrando vínculos, estado, dependências e divergências. Não reescrever o README nem outro documento normativo para atualizar andamento.

Registro não implica aprovação. Não inferir autorização de tarefa em execução ou concluída. Registrar escopo/versão e evidência humana no portão aplicável, sem tratar declaração da IA como prova de autorização.
