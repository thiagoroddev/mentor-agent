# Modelos

*Estruturas mínimas. Preencher é o que transforma a regra em artefato verificável.*

## Ficha de viabilidade *(portão V)*
```
Problema | De quem | Como resolvem hoje | Por que não serve
Diferencial | Por que alguém trocaria
Público real (2º número de NG-11) | Alcance no primeiro ano
Como se paga | Custo mensal estimado | Fôlego disponível
Regra de setor aplicável | Dado pessoal? (define o rigor)
Critério de sucesso, em número, com prazo
```

## Mapa de obrigações *(portão C)*
```
Jurisdição dos usuários | De operação | Lei aplicável e foro declarados
Relação: consumidor | entre empresas | ambas
Setor regulado? Qual norma, qual exigência, quem verifica
Menores possíveis? Medidas adotadas (CF-29)
Dado pessoal? Sensível? Fundamentos por finalidade
Conteúdo de terceiros? Processo de moderação
Cobrança: modelo | arrependimento | cancelamento
Decisão automatizada: onde | explicabilidade | contestação
Terceiros que recebem dados | Licenças verificadas | Revisar em:
```

## Plano de qualidade mínimo *(portão 0)*
```
Projeto | Nível de rigor N1|N2|N3 | Revisar em
Problema / usuário | Fora de escopo
Metas não-funcionais (tabela QS-24 preenchida)
Padrões de produto | Padrões de processo
Estratégia de testes: quadrantes cobertos + limiar de cobertura
Riscos de qualidade: risco | impacto | mitigação
Processos de apoio: 8 itens de QS-11, cobertos ou dispensados
Dispensas aceitas: regra | motivo | aceite de (nome/data)
```

## Ficha de processo *(portão P)*
```
Nome | Família: primário | suporte | gerencial
Evento que inicia | Condição que encerra
AS IS: passos, responsável, onde trava, o que dá errado e como resolvem
TO BE: passos propostos | o que muda e por quê
Esperas e prazos: o que expira, em quanto tempo, consequência, quem é avisado
Regras aplicáveis (IDs)
```

## Requisito funcional
```
ID | Nome (verbo + objeto) | Ator | Objetivo
Pré-condições | Pós-condições
Fluxo principal: passos numerados
Fluxos alternativos: gatilho → passos → onde retorna
Fluxos de exceção | Regras aplicáveis (IDs) | Mensagens (IDs)
Requisitos não funcionais associados (IDs)
```

## Regra de negócio
```
ID | Enunciado em uma frase
Números: valores, prazos, percentuais, arredondamento
Condição de aplicação | Exceções | Acumula com | Vigência
Onde é usada (IDs) | Como se testa
```

## Contexto de uso *(portão I)*
```
Perfil | O que já sabe | O que não sabe
Tarefa principal | Frequência | Duração típica
Ambiente | Dispositivo | Conexão | Atenção disponível
Interrupções prováveis | O que precisa sobreviver a elas
Contexto mais difícil em que precisa funcionar
Necessidades de acessibilidade conhecidas
```

## Ficha de tela
```
Tela | Objetivo em uma frase | Ação principal (uma)
Ações secundárias | De onde se chega | Para onde se vai
Cinco estados: vazio | carregando | erro | sucesso | sem permissão
Mensagens: o que aconteceu / por quê / o que fazer
Como se cancela ou desfaz | O que é irreversível
Requisitos de acessibilidade específicos
```

## Registro de decisão *(portão A)*
```
ID | Data | Status: proposta | aceita | substituída por <ID>
Contexto: o problema e as restrições
Alternativas: opção | prós | contras
Decisão | Consequências: o que fica mais fácil, mais difícil, irreversível
```

## Ficha de entidade e relacionamentos *(portão N)*
```
Entidade | O que representa (vocabulário do usuário)
Identificador: substituto | natural declarado como único
Atributos: nome | tipo | obrigatório? | domínio | padrão | derivado?
Unicidades exigidas pelo negócio
Ciclo de vida: nasce quando | removida ou inativada | retenção

Entidade A | Entidade B | Cardinalidade (mín,máx) nos dois sentidos
Vínculo obrigatório? | Tabela de ligação? | Atributos do vínculo
Ao remover A: restringir | cascata | anular → confirmado com o usuário? (data)
```

## Justificativa de paradigma *(quando não relacional)*
```
Dado / funcionalidade | Família escolhida
Frente que justifica: produtividade | desempenho de acesso
Medição que sustentou (cenário, volume, resultado)
Garantias abandonadas | Quem passa a garantir | Como se testa
Alternativa relacional considerada e por que foi descartada
```

## Modelo de ameaça *(portão S)*
```
Ativo protegido | Classe | Ameaça | Vulnerabilidade | Impacto
Tratamento: prevenir | reduzir | transferir | tolerar
Controle implementado | Como se testa | Dono | Revisar em

Matriz de autorização: Papel × Recurso × Operação (ver|criar|alterar|excluir|exportar)
Regra de posse: age sobre qualquer registro ou só sobre os próprios?
```

## Inventário de dado pessoal
```
Dado | Pessoal ou sensível | Finalidade | Fundamento | Origem
Onde reside (incluindo cópias, cache, terceiros) | Quem acessa
Retenção | Como se elimina | Terceiro que recebe
```

## Plano de resposta a incidente
```
Como se detecta | Quem é acionado | Quem decide
Contenção imediata (rotacionar, revogar, isolar, desligar)
Preservação de evidência | Comunicação: interna, usuários, autoridade, prazo
Recuperação | Causa-raiz | Correção de processo
```

## Registro de dívida técnica
```
ID | Tipo: código | arquitetura | teste | documentação | O que foi feito
Motivo | Custo futuro estimado | Gatilho de pagamento | Dono
```

## Registro de hipótese
```
ID | Hipótese ("acreditamos que ___ para ___ vai ___")
Menor teste que a verifica | Custo e prazo
Critério de decisão, definido ANTES | Resultado
Decisão: manter | ajustar | remover | Data
```

## Ficha do modelo *(§12)*
```
Problema | Tipo | Alternativa simples comparada | Desempenho de cada
Dados: origem | período | quem está representado | quem não está | o que falta
Distribuição das classes | Desempenho por classe | Por subgrupo
Separação treino/avaliação: método e por quê
Erro que custa mais | Justificativa | Métrica priorizada
Explicabilidade exigida? | Modelo escolhido e por quê
Monitoramento: o que | frequência | gatilho de retreinar ou desligar
Versão | Código gerador | Bibliotecas | Data | Responsável
```

## Registro de migração de estrutura
```
ID e ordem | O que muda | Compatível com a versão anterior?
Passos | Volume estimado | Tempo | Bloqueia escrita?
Caminho de volta (ou declaração de irreversibilidade)
Ensaiada sobre cópia realista em: | Cópia de segurança verificada em:
```

---
