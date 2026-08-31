# mentor-agent 0.1.6

Correcao de regressao da 0.1.5, sem mudanca de estrutura.

## Como atualizar

```bash
npm i -D github:thiagoroddev/mentor-agent#v0.1.6
npx mentor instalar --forcar
node mentor.mjs gerar
```

## Corrigido

A 0.1.5 separou a parte B escrita do relatorio gerado, mas o novo
`docs/atrito-de-campo.md` nascia com tres marcadores `PREENCHER:`. O `verificar` tratava esses
marcadores opcionais do relatorio como trabalho incompleto do projeto e reprovava imediatamente.

Agora `atrito-de-campo.md` recebe a mesma excecao de conteudo que `relatorio-de-campo.md`: seus
marcadores orientam as tres categorias opcionais da medicao e nao bloqueiam o ciclo do hospedeiro.
Marcadores de tarefas, requisitos e demais documentos continuam reprovando normalmente.

## Prova

- teste escrito primeiro e visto vermelho no cenario de campo;
- mutacao removendo a excecao derrubou exatamente a nova assercao;
- tipos aprovados;
- 12 de 12 cenarios verdes.

