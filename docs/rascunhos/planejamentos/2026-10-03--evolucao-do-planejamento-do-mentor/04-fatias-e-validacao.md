# Fatias candidatas, dependências e validação

## Separação pacote e consumidor

O plano completo permanece neste repositório. As capacidades genéricas pertencem ao pacote; configurações e decisões de um consumidor pertencem ao consumidor. Não copiar regras de React/shadcn ou dados do Eu Roteirizo como obrigação de todo projeto.

As estimativas são prévias. Antes da execução, cada fatia define plano por arquivo, critérios, risco, dependências e avaliação separada de planejamento/execução. XG se divide antes de executar. Não registrar todas as tarefas distantes com detalhe inventado.

## Capacidades centrais

| Fatia | Entrega e arquivos principais | Aceite | Estimativa execução |
|---|---|---|---|
| A | Origem configurável de ADRs; arquivos.ts, tipos/contexto e consumidores de c.adr | Mesmo caminho usado por contagem, restrições e consulta; fallback preservado; erro de configuração explícito | M, moderada, geral/médio |
| B | Formato operacional versionado e estratégia de adoção das ADRs; documentação/esquemas pertinentes | Substituição parcial representada; revisão humana da extração; legado explícito | M, alta, avançado/alto |
| C | Gerador e verificar, integração com entrada.ts/instalar.mjs | Saída determinística, sincronização segura, IDs/substituições validados | G, alta, geral de maior capacidade/alto |
| D1 | Campos novos nos contratos locais/portáteis; tipos.ts, tarefa.json, cmd-plano.ts, cmd-tarefa.ts | Todos os campos preservados, referências conferidas, legado compatível | G, alta, geral de maior capacidade/alto |
| D2 | Cópia integral e idempotente do plano, revisões e memória operacional | Markdown rico intacto, promoção sem reescrita, extração literal de memória | G, alta, geral de maior capacidade/alto |
| D3 | Compacidade de evidências no JSON e adaptação de consumidores | Logs completos acessíveis, referências/status íntegros, registros antigos legíveis | M, alta, geral de maior capacidade/alto |
| E | Herança, hashes e revisão; resolver, revisao-incremental.ts, cmd-auditar.ts | Só fontes normativas pertinentes invalidam; dossiê recebe conteúdo | G, alta, avançado/alto |
| G | plano status; cmd-plano.ts/cli.ts | Consulta derivada sem alterar hash ou inferir aprovação | M, moderada, geral/médio |
| F | planejamento/SKILL.md, processo, núcleo e referências em tarefa/rascunho | Carregamento explícito; campos e ferramentas disponíveis antes de ativar | G, moderada, geral/médio |
| H | ui-design e test-design; limites da referencia-para-react | UI existente, reuso e caracterização cobertos sem habilidades duplicadas | M, moderada, geral/médio |

Planejamento de B, C, D e E exige maior capacidade por interpretar decisões ou definir invariantes de validade. Nas demais, perfil geral/médio é ponto de partida. Confirmar antes de cada fatia.

Dependências técnicas: A+B → C; D1 → E; E → G; D1 → D2/D3 quando a interface depender do novo contrato; C+D1+D2+E+G → ativação F. D3 pode vir após adoção funcional se não comprometer preservação/compatibilidade. H pode ser preparado independentemente.

## Aplicação ao piloto e UI

A implantação do consumidor contempla configurar o caminho das dez ADRs, revisar sua extração, criar padrão shadcn-ui e inventariar o legado do app/laboratório. Esses registros podem apontar para este plano sem duplicar todo seu conteúdo.

Padrão de UI: primitivas existentes, componentes de domínio próximos da funcionalidade, critérios para primitiva nova, tokens/variantes/foco/disabled, estados pertinentes e acessibilidade. Não criar componentes para cada div nem usar abstração sem responsabilidade concreta.

Nota Button: disabled atual aplica pointer-events-none e opacity-50; não gera automaticamente cinza. Paleta funcional de mapa é distinta da marca.

Usar react/forbid-elements para identificar controles nativos que deveriam seguir o sistema de componentes, sem alegar prova de tokens/semântica. [Documentação oficial](https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/forbid-elements.md).

Adoção: inventário → avisos no legado → normalização ao alterar arquivos → erro nos arquivos normalizados → exceções técnicas específicas justificadas. Mesma política para código novo/alterado no app e laboratório; nenhuma dispensa permanente do laboratório.

Normalização completa da UI é trabalho posterior, planejado com base no inventário. Não pressupor baixa complexidade/econômico para tudo.

## Habilidades adicionais

| Habilidade | Ação e prioridade |
|---|---|
| ui-design | Ampliar para UI existente, inventário/reuso e preservação de comportamento nesta implantação |
| test-design | Caracterização antes de refatorar e validação de contratos nesta implantação |
| referencia-para-react | Preservar tradução de referências; inspecionar fonte canônica e fronteira com ui-design; não sobrescrever pasta alheia |
| spike-e-investigacao | Comparação controlada, proveniência, reprodução e conclusão na próxima investigação pertinente |
| data-modeling | IndexedDB, versões de formatos e recuperação na próxima tarefa de persistência |
| geoprocessamento-e-roteirizacao | Candidata do projeto: coordenadas/unidades, grafos dirigidos, acesso e validação espacial |
| execucao-assincrona | Condicional: Worker, cancelamento, respostas obsoletas, paridade; criar se recorrência justificar |

Escolher modelo, classificar e fatiar permanece em planejamento. Não criar três habilidades para isso.

## Verificação e riscos

Testes devem demonstrar invariantes, não apenas headings ou texto de instrução. Casos: ADR parcial; substituição inválida/ciclo; nenhuma ADR; legado não normalizado; cópia editada; campos perdidos no vínculo; status sem alteração de hash; mudança herdada invalidando; mudança não herdada preservando; plano completo conservado; memória extraída; registros antigos legíveis.

Riscos: gerar regra errada de histórico textual; ativar habilidade antes de existir; invalidar todas as fatias por status; declarar aprovação por cadastro; perder conteúdo em JSON/Markdown; impor modelo/perfil por volume; bloquear legado inteiro com lint; expandir esforço sem justificativa.

Mitigação: revisão inicial humana, formato explícito, ativação conjunta, fontes normativas selecionadas, portões preservados, testes de conservação e transição prospectiva.

As correções do Mentor recebem provas pontuais e registro. Gates de produto e validação manual seguem política do contexto quando houver mudança de produto. Não religar REV. Documentação isolada não exige testes que espelham implementação.

## Adoção e frentes separadas

Considerar adotado após um planejamento real demonstrar decisões/reuso/habilidades/avaliação, uma tarefa avulsa e uma fatia preservarem plano integral e um handoff consumir contrato operacional sem carregar o estudo humano concluído.

Reorganização de rascunhos antigos sem referência e normalização completa de UI ficam fora do caminho crítico. Portabilidade CHORE-039 é uma entrega pequena separada, descrita em 06. Não reabrir a tarefa concluída do piloto apenas para reforçar evidência no pacote.

Mudanças de package.json/versão, tag, publicação e instalação no piloto têm ato próprio; não são consequência de salvar o plano.
