---
carrega_quando: escrever ou ajustar teste, e ao planejar qualquer tarefa com criterio de aceite
---

# Processo · Teste

## Escolha proporcional da validação

Antes de executar testes, use `plano.meio_de_validacao` e `plano.proporcionalidade` para
declarar o risco, a prova já disponível e a menor checagem que ainda falta. Não crie campos novos.

- **Correção pequena ou portabilidade já validada:** confira a equivalência do patch e a evidência
  de origem. Verifique apenas diferenças relevantes de ambiente, integração ou contrato público;
  reutilize testes existentes. Não repita uma bateria nem crie teste que espelha a implementação
  somente para demonstrar outra vez o mesmo comportamento.
- **Instrução ou documentação:** confira coerência, links, frontmatter e integridade com os comandos
  existentes. Não crie teste que só procura a frase adicionada.
- **Ampliar a suíte:** faça quando o projeto/CI a exige, houver impacto compartilhado relevante,
  dependência/contrato alterado, falha ou indício novo de regressão. Nomeie esse motivo no plano;
  o tamanho da suíte disponível, por si só, não exige executá-la.

Distinga verificação focada de gate completo. Se o contexto exige um gate, rode seu comando declarado
ou registre a dispensa permitida pela política com motivo; não apresente teste pontual como
`APROVADO` para a suíte inteira. Evidência reutilizada conserva origem, comando e limite de cobertura.
Mudança nos insumos relevantes exige nova prova; outros arquivos de documentação não são motivo
automático para repetir testes.

### Níveis de teste na pirâmide de automação

Para manter o ciclo de desenvolvimento rápido sem comprometer a robustez, os testes automatizados são organizados em dois níveis:

- **Nível 1 (Unidade / Ciclo de Tarefa):** Prova rápida (~segundos), determinística e focada na lógica alterada (funções puras, componentes isolados, contratos de módulo, regras de negócio). Deve ser o comando declarado no gate rotineiro `gates.testes` no `contexto.json`. Cada tarefa individual fecha e afere seus critérios contra o Nível 1 sem overhead de subprocessos pesados de Git ou simulações demoradas de infraestrutura.
  - *Prova focada por risco de integração:* Quando a tarefa específica tocar mecânicas de Git, worktrees, concorrência ou resolução de conflitos, ela pode e deve incluir testes focados dessa integração em seu ciclo local, sem transformar o gate rotineiro na bateria global.
- **Nível 2 (Integração / E2E / Pre-push / Release):** Prova abrangente (~minutos) do ecossistema completo, múltiplos módulos integrados, simulação de fluxos reais e subambientes. Acionado antes do envio remoto (`pre-push`), no fechamento consolidado de épicos, em releases/pacote ou em pipelines de CI.
  - *Validação na árvore integrada (CP-12):* A prova combinada de múltiplas fatias e branches paralelas pertence à árvore integrada final, nunca a ramos isolados antes do merge. Mudança em insumos relevantes de código invalida evidências anteriores e requer nova aferição; atualizações administrativas em arquivos derivados sem impacto funcional preservam o fingerprint vigente.

Falha ou bloqueio do harness pede diagnóstico do harness, não reconstrução da correção já comprovada.
Registre o achado e seu efeito na cobertura; adapte apenas o necessário ou proponha o trabalho adicional
quando sair do escopo. Subprocesso potencialmente bloqueante precisa de timeout próprio.

A seleção de escopo não altera o método exigido pelo projeto nem as condições de TDD/reconciliação abaixo.

O metodo e' do projeto (`contexto.qualidade.metodo_de_teste`), e o padrao e' **`tdd`**. Trocar por
`bdd`, `teste-depois` ou `nenhum` exige motivo escrito. O metodo diz **quando** o teste nasce; o
vinculo criterio→teste vale em todos eles.

**Planeje em prosa primeiro.** Teste antes nao substitui desenho. Com o plano na mao, para cada
criterio de aceite, tente escrever a asercao. O resultado nao e' opiniao:

| A asercao escreve sem o codigo existir? | O que fazer |
| :-- | :-- |
| **Sim** | teste antes. `task gate <id> testes --esperando-vermelho`, depois implemente ate o verde |
| **Nao, o criterio esta vago** | **conserte o criterio.** Se nao vira asercao, nao era criterio, era intencao |
| **Nao, a forma e desconhecida** | tarefa `SPIKE` declarada: responde uma pergunta, e' descartavel |

⚠️ **Nao existe quarta saida.** *"Julguei que nao precisava"* nao e' motivo: e' a decisao que sempre
cai para o lado de economizar trabalho, e por isso nao e' sua.

**Duas camadas de teste, e a segunda nao pode vir antes.** Os criterios de aceite vem do pedido, sao
poucos, e nascem antes. As **descobertas** (a borda que so apareceu ao implementar, o ramo que
ninguem sabia que existia, a regressao de um bug) nao existem antes do codigo: nascem depois, e vao
na secao propria da narrativa.

**Por que o vermelho e' obrigatorio, e nao a ordem de escrita:** teste que nunca falhou nao e'
evidencia. Asercao fraca, dublê que devolve o esperado, ramo que nem executa: tudo isso passa de
primeira. O `--esperando-vermelho` recusa quando o comando sai verde, porque ai o teste passa **sem
o codigo** e nao testa o que promete.


## Spike

Exploracao declarada, tipo `SPIKE`. Existe para a exploracao **nao se disfarcar de tarefa normal**,
que e' o que acontece quando o unico caminho disponivel e' a tarefa normal.

Um spike responde **uma** pergunta, nao tem criterio com teste, e a narrativa dele tem tres secoes
proprias: a resposta · o que foi descartado · a tarefa que isto destrava (ou "nenhuma: a resposta foi
nao"). O codigo do spike e' descartavel por definicao; o que sobrevive dele se declara.

## O que isto nao resolve

Escrevo o teste e o codigo com o mesmo modelo mental, na mesma sessao. **Se o modelo esta errado, os
dois estao errados e concordam entre si.** Nenhuma ordem de escrita conserta isso; o que conserta e'
contexto separado, que e' o papel da revisao ([`revisao.md`](./revisao.md)).
