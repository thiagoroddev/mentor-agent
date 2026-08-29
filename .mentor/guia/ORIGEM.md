# Apêndice B — Origem e fidelidade

## Disciplinas destiladas

| Disciplina | Contribuição principal | Seções |
| :-- | :-- | :-- |
| Qualidade de Software | Verificação e validação, pirâmide e quadrantes de teste, atributos não-funcionais, dívida técnica, vocabulário de defeito | §10, §13 |
| Engenharia de Software | Modelos de processo, arquitetura, gerência de configuração, técnicas de caso de teste, leis de evolução | §4, §5, §10.2 |
| Análise de Sistemas | Processo atual, atores, fluxos, estados, dicionário de dados, requisitos, rastreabilidade | §3 |
| Segurança em Sistemas de Informação | Tríade e atributos, ciclo de vida da informação, controle de acesso, criptografia, LGPD, resposta a incidente | §9 |
| DevOps | Cultura e fluxo, esteira, infraestrutura como código, observabilidade, continuidade, métricas de entrega | §11 |
| Banco de Dados Relacional | Modelagem conceitual/lógica/física, integridade, normalização, transações, concorrência, migrações | §6 |
| NoSQL | Escolha de paradigma, modelagem por agregado, consistência eventual, distribuição, cache | §6 |
| Design de Interação | Usabilidade mensurável, cognição e Gestalt, heurísticas, estados, sistema de design, acessibilidade | §8 |
| Gestão de Startup | Fases e validação, modelo de negócio, receita, funil, custo | §1 |
| Legislação, Ética e Conformidade | Boa-fé, transparência, contratação, dados pessoais, menores, conteúdo de terceiros, propriedade intelectual | §2 |
| Machine Learning | Avaliação de modelo, desequilíbrio, explicabilidade, validade em produção | §12, §2.10 |
| Métodos Ágeis | Desperdício, calibragem por tamanho de equipe, qualidades do teste, planejamento em camadas, priorização | §4, §10.3 |
| Computação em Nuvem | Classes de armazenamento, região e zonas, escala proativa, rede privada | §11.8, §9.4 |
| Fundamentos de Design de Sistemas | Forma do sistema, visões, arquitetura da informação, modelo versus página | §5, §8.9 |
| Fundamentos de Sistemas de Informação | Fonte da verdade do dado, etapas do pagamento, granularidade por nível de decisão | §3, §1.5 |
| Estrutura de Dados | Custo assintótico, escolha de estrutura, condições que sustentam o desempenho | §5.4 |
| POO e Padrões de Projeto | Escala de acoplamento, encapsular o que varia, composição, cinco princípios, padrão como vocabulário | §5.3 |
| Desenvolvimento Web, Mobile, Org. de Computadores, Fund. de Desenv. de Software | Contribuições pontuais: teste por papel semântico, recursos do dispositivo, inanição em fila, reúso | §10.3, §8.3, §11.8, §5.2 |

## Extensões declaradas

Duas partes **não** derivam das disciplinas. Estão marcadas por honestidade intelectual:

1. **§7 (Código) inteira.** Nenhuma matéria da grade trata de qualidade de escrita de código. Foi incluída porque o guia é lido por uma IA, e as regras corrigem comportamentos padrão observáveis — não recitam princípios que o modelo já enuncia.
2. `CF-48` **e** `CF-52`. Derivam dos princípios de transparência e autodeterminação. `CF-49`, `CF-50` e `CF-51` têm lastro na disciplina de Machine Learning (§12).

## Identificadores absorvidos

Regras dos arquivos-fonte que **não** aparecem com o identificador original porque foram substituídas por versão mais completa em outra área — nenhum conteúdo foi perdido:

| Origem | Absorvida por |
| :-- | :-- |
| `QS-25` a `QS-32` (segurança mínima) | §9 inteira |
| `NG-27` a `NG-30` (obrigações do produto) | §2 inteira |
| `ES-16` (funcional × não funcional) | `AN-27` |
| `NS-34` (migração versionada) | `BD-37` |
| `AN-05` (viabilidade) | mantida, ampliada por `NG-05` |
| `OPS-40` (custo) | mantida, ampliada por `NG-23`, `NG-24` |

## Ressalvas de fidelidade

- O material de Estrutura de Dados classifica a notação assintótica como "limite inferior"; é limite **superior** (pior caso). Não reproduzido.
- O Apêndice A reflete a legislação como apresentada na disciplina. **Verificar vigência.**
- Conteúdo deliberadamente fora de escopo, por não gerar regra de construção: captação de investimento, participação societária e avaliação de empresa; relações de trabalho e monitoramento de colaborador; controles de rede corporativa; catálogo de padrões de projeto; história das disciplinas.

## O que este guia não é

Não é convenção de stack. Linguagem, biblioteca, fornecedor, limites numéricos de código e ferramenta são decisões posteriores, de documento próprio — e são a parte que envelhece primeiro. Aqui ficam as regras que sobrevivem à troca de stack.

---

*Fim do guia.*
