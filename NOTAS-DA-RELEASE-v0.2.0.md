# mentor-agent 0.2.0

Mudanca estrutural: o estado administrado pelo mentor passa de `docs/` para `docs-mentor/`.

## Como atualizar da 0.1.x

```bash
npm i -D github:thiagoroddev/mentor-agent#v0.2.0
npx mentor instalar --forcar --migrar-docs
node mentor.mjs gerar
```

`--forcar` autoriza substituir o pacote; `--migrar-docs` autoriza, separadamente, renomear a pasta
administrativa antiga. Sem a segunda flag, uma instalacao 0.1.x e recusada com instrucao clara.

## Seguranca da migracao

- so considera legado quando existe `docs/contexto.json`;
- nunca toca em uma `docs/` comum do aplicativo;
- recusa quando `docs-mentor/` ja existe e nao move nenhuma das duas pastas;
- se a copia do pacote falhar depois do rename, devolve a pasta ao nome antigo;
- projeto novo cria apenas `docs-mentor/`.

## Prova

- tipos aprovados;
- os 12 cenarios usam o nome novo;
- o cenario de pacote cobre criacao, recusa, migracao, conflito e instalacao via `node_modules`.
