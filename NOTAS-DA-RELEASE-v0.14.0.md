# mentor-agent 0.14.0

Codex, Claude Code e Antigravity passam a carregar o mesmo. Ate' a 0.13.0 so' o Claude Code carregava
o nucleo sozinho; nas outras duas, a leitura dependia de o modelo decidir abrir o arquivo, e as skills
do mentor nao estavam em nenhuma das pastas que as ferramentas procuram. Resultado medido: cada
ferramenta seguia um processo diferente, inclusive na revisao.

Detalhe no `CHANGELOG.md`; plano e criterios em `PLANO-v0.14.0.md`.

## Como atualizar

```bash
npm i -D github:thiagoroddev/mentor-agent#v0.14.0
npx mentor instalar --forcar
node mentor.mjs entrada migrar
node mentor.mjs gerar
node mentor.mjs verificar
```

Confira o diff do `CLAUDE.md`, do `GEMINI.md` e do `AGENTS.md` antes de commitar. Nenhuma linha do
projeto e' apagada; o `entrada migrar` aponta os trechos do modelo antigo que o nucleo ja' cobre, para
voce enxugar a mao.

## O que cada ferramenta carrega agora

| | Claude Code | Codex | Antigravity |
| :-- | :-- | :-- | :-- |
| Arquivo que le sozinha | `CLAUDE.md` → `@AGENTS.md` | `AGENTS.md` | `AGENTS.md` e `GEMINI.md` |
| Nucleo | dentro do `AGENTS.md` | dentro do `AGENTS.md` | dentro do `AGENTS.md` |
| Skills do mentor | `.claude/skills/` | `.agents/skills/` | `.agents/skills/` |
| Revisao | `processos/revisao.md` + guia da area | idem | idem |

Processos, guia e skills continuam sob demanda: so' o nucleo e' carregado sempre. Carregar tudo nao
caberia nos limites das ferramentas (so' o guia tem ~127 mil caracteres).

## Skills: copia, nao link

As skills sao **copiadas** do pacote (`.mentor/skills/`) e do projeto (`docs-mentor/skills/`) para as
pastas das ferramentas, e as copias vao para o git. Assim o clone em outra maquina ja' chega com elas,
sem script de instalacao. Edite sempre a **fonte** e rode `gerar`: copia editada e' preservada, mas o
`verificar` reprova ate' a mudanca ir para a fonte.

O mentor so' mexe no que ele mesmo copiou (registro `.mentor-skills.json` em cada pasta). Pasta com
o nome de uma skill que ele nao criou, nome repetido entre pacote e projeto e registro corrompido sao
recusados com o motivo, nunca sobrescritos.

## Limite de tamanho

O Antigravity corta arquivo de regra acima de 24.000 bytes. Com o nucleo dentro, o `AGENTS.md` novo
tem ~13 KB; o `verificar` avisa a partir de 21.600 e reprova acima de 24.000. Regras do projeto que
crescerem demais pedem enxugamento, nao corte do nucleo.
