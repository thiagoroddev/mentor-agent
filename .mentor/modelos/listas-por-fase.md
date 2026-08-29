# Listas de verificação

## Definição de pronto-para-começar
Problema claro · critério de aceite em Dado/Quando/Então · dependências identificadas · impacto não-funcional avaliado · entregável em um ciclo.

## Definição de pronto
Critérios de aceite verdes · testes automatizados no nível certo da pirâmide · revisado · análise estática limpa · **cinco estados de tela** · sem segredo exposto · documentação e registro de decisão atualizados · pipeline verde · reversível.

## Antes do primeiro deploy
```
[ ] Infraestrutura descrita como código e versionada
[ ] Configuração por ambiente, segredos fora do artefato
[ ] Esteira verde, com barreiras ativas
[ ] Registro, métrica e alerta funcionando
[ ] Verificação de saúde respondendo
[ ] Reversão executada com sucesso ao menos uma vez
[ ] Cópia de segurança configurada e restauração testada
[ ] Riscos de infraestrutura (OPS-30) verificados
[ ] Alvos de disponibilidade e desempenho declarados
[ ] Custo mensal estimado e teto acordado
[ ] Plano de incidente escrito e com dono
```

## Banco antes de produção
```
[ ] Modelo conceitual validado com o usuário
[ ] Toda tabela com chave primária imutável e sem significado
[ ] Chaves estrangeiras com política de remoção decidida caso a caso
[ ] Unicidades do negócio declaradas no banco
[ ] Obrigatoriedade e domínios declarados
[ ] Valor monetário em decimal exato; datas com fuso definido
[ ] Até 3ª forma normal, ou desnormalização com responsável pela sincronia
[ ] Operações multi-tabela em transação; nenhuma transação longa
[ ] Estratégia de atualização concorrente onde há disputa
[ ] Listagens paginadas; nenhuma consulta dentro de laço
[ ] Índices justificados por medição
[ ] Usuário da aplicação com privilégio mínimo, credenciais por ambiente
[ ] Migrações versionadas, ensaiadas, com caminho de volta declarado
```

## Obrigações antes do lançamento
```
[ ] Termos de uso publicados e aceitos no cadastro
[ ] Política de privacidade condizente com o que o sistema faz
[ ] Base legal definida para cada dado pessoal
[ ] Regra de setor verificada
[ ] Propriedade de código, marca e conteúdo definida
[ ] Licenças das dependências verificadas e compatíveis
[ ] Regras de conteúdo de usuário e canal de denúncia, se aplicável
[ ] Contratos com fornecedores e parceiros revisados
[ ] Canal de contato funcionando e monitorado
[ ] Fluxo de cancelamento e de exclusão de dados testado
```

---
