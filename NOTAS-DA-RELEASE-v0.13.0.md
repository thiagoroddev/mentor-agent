# mentor-agent 0.13.0

As correcoes que o piloto fez como patch local entre 15/09 e 30/09/2026 viram versao oficial. Quem
clona o projeto em outra maquina e roda `npm install` passa a receber o mesmo `.mentor/` que o
piloto usa, e `instalar --forcar` deixa de desfazer as correcoes.

Detalhe completo no `CHANGELOG.md`; plano e criterios em `PLANO-v0.13.0.md`.

## Como atualizar da 0.12.x

```bash
npm i -D github:thiagoroddev/mentor-agent#v0.13.0
npx mentor instalar --forcar
node mentor.mjs gerar
node mentor.mjs verificar
```

Projeto com patch local registrado em `docs-mentor/patches-do-pacote.json`: confira antes se cada
patch ja' veio na versao. O `instalar --forcar` sobrescreve o `.mentor/`; o que nao veio volta pelo
`git log -p` do arquivo.

## O que muda no dia a dia

- **`## Desfecho` obrigatorio.** O `finalizar` recusa narrativa sem a secao preenchida. Tarefa
  aberta antes da atualizacao precisa dela antes de fechar.
- **O contexto e' insumo dos gates.** Mudar o `contexto.json` fora das contagens (um gate, o metodo
  de teste, um artefato do laboratorio) invalida a evidencia: rode o gate de novo. Contagens e
  lembretes nao contam.
- **Gate calado aprova, menos o de testes.** `tsc --noEmit` e eslint nao imprimem nada no
  sucesso, e isso e' `APROVADO`. Gate de testes que nao imprime nada ou nao coletou nenhum teste, e
  arquivo de evidencia vazio, sao `INVÁLIDO como gate`: runner calado precisa imprimir a evidencia.
- **Revisao por tarefa.** `auditar preparar` sem flags lista os modos. O lote antigo continua em
  `auditar preparar --lote-legado`.
- **`task nova` confere a origem.** Texto livre em `--origem` e' recusado na hora, com a mesma regra
  do `puxar`. Use IDs que resolvem ou `titulo-autossuficiente`.
- **O `doctor` so' le.** Nao grava mais lembretes nem perfil no `contexto.json`.

## Tetos

Subiram para o uso medido no piloto x 1,3: `nucleo.md` 15.100, `processos/tarefa.md` 27.200,
`contexto.md` 18.700, narrativas concluidas 56.300. Excecao do projeto vence a regra do pacote, e
vence tambem quando e' **menor**: depois de atualizar, tire de `docs-mentor/tetos.json` as excecoes
que o pacote agora cobre.

## Achados no porte

Ao rodar as regressoes do piloto contra a suite do pacote, seis defeitos que o piloto tinha e nao
via apareceram e foram corrigidos aqui: dispensa de vermelho que nao gravava, evidencia vazia e
gate de testes calado aprovados, hash dos insumos errado em monorepo, `contexto.json` contando
toda tarefa para a cadencia, logs de gate entrando no git e tres mensagens uteis que tinham sumido.
A lista esta' no `CHANGELOG.md`.
