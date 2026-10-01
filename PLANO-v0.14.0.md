# Plano · v0.14.0: o mesmo carregamento no Codex, no Claude Code e no Antigravity

> Aprovado pelo mantenedor em 01/10/26 (Portão 1), junto com o `PLANO-v0.13.0.md`. Executa depois da
> v0.13.0: depende do núcleo consolidado e dos scripts portados.

## 1. Problema

O mantenedor usa as três ferramentas, cada uma na própria IDE, e elas carregam coisas diferentes:

| O quê | Claude Code | Codex | Antigravity |
| :-- | :-- | :-- | :-- |
| Arquivo lido sozinho | `CLAUDE.md` | `AGENTS.md` | `AGENTS.md` e `GEMINI.md` |
| `nucleo.md` | mecânico (`@`) | só se o modelo abrir | só se o modelo abrir |
| Skills de `.mentor/skills/` | não descobre | não descobre | não descobre |

No piloto, o `CLAUDE.md` já existia antes do `instalar` e não importa o `AGENTS.md`, então o Claude
não via cinco regras do projeto. O `processos/revisao.md` não cita o guia; só a revisão incremental
do script carrega o guia por área, e nada manda carregar a revisão do mentor quando o pedido vem em
conversa. Resultado observado: cada ferramenta revisa de um jeito.

## 2. Objetivo, dito com precisão

**Mesmas regras e mesmos critérios de carregamento nas três ferramentas:**

- **sempre, mecanicamente:** o núcleo, dentro do `AGENTS.md`, e as regras do projeto;
- **sob demanda, pelas mesmas regras escritas no núcleo:** processos, guia e skills. As três
  descobrem o mesmo catálogo de skills; cada uma carrega nome e descrição e lê o conteúdo quando o
  pedido casa com a skill ou quando o núcleo manda.

**Não é objetivo** carregar tudo sempre: só o guia tem ~127 mil caracteres, e os limites das
ferramentas não comportam.

**Limites medidos na documentação oficial:** Codex soma os arquivos de instrução descobertos até
32 KiB; Antigravity trunca arquivo de regra acima de 24.000 bytes e dá 20 mil tokens às regras
sempre ativas. O mais apertado é o do Antigravity.

## 3. Frente B

**B1 · Núcleo dentro do `AGENTS.md`.** O `gerar` escreve o núcleo entre marcadores:

```
<!-- mentor:nucleo:inicio -->
<!-- Gerado por `node mentor.mjs gerar`. Não edite este bloco: altere .mentor/nucleo.md. -->
…
<!-- mentor:nucleo:fim -->
```

Fora dos marcadores é do projeto e nunca é tocado. O `instalar` insere o bloco num `AGENTS.md` que
já exista. O `verificar` reprova bloco diferente do `nucleo.md` e mede o `AGENTS.md` em **bytes
UTF-8**: aviso acima de 21.600 (90% de 24.000), reprovação acima de 24.000.

**B2 · Pontos de entrada.** `CLAUDE.md` vira `@AGENTS.md` (sai o `@.mentor/nucleo.md`, que
carregaria o núcleo duas vezes). `GEMINI.md` vira ponteiro curto para o `AGENTS.md`, sem import. O
`doctor` (`entrada.ts`, `pontosDeEntradaSemNucleo`) deixa de exigir a menção a `.mentor/nucleo.md`
em cada arquivo e passa a conferir: `AGENTS.md` com o bloco, `CLAUDE.md` com `@AGENTS.md`,
`GEMINI.md` apontando para o `AGENTS.md`.

**B3 · Skills por junção.**

- Implementado em JS puro em `instalar.mjs`. O `mentor.mjs` da raiz atende `skills ligar` antes de
  importar o `cli.ts`. Os dois caminhos de instalação chamam a mesma função: `mentor.mjs` →
  `instalar.mjs` dentro de `node_modules`, e `cmd-pacote.ts` → `instalar` na raiz.
- Fontes `.mentor/skills/*` e `docs-mentor/skills/*`; destinos `.agents/skills/<nome>` (Codex e
  Antigravity) e `.claude/skills/<nome>` (Claude Code). Windows: `fs.symlinkSync(alvo, destino,
  'junction')`, sem administrador; Linux e Mac: link de pasta.
- Idempotente. Recusa substituir pasta real e avisa. Remove junção só com `unlinkSync`/`rmdirSync`,
  nunca recursivo. Sem `.mentor/`, avisa e sai com 0: nunca quebra o `npm install`.
- `.gitignore`: bloco gerado entre marcadores, uma linha por skill ligada. O git atravessa junção e
  versionaria cópia (medido em 01/10/26, git 2.54 no Windows).
- `postinstall`: o `instalar` acrescenta `node mentor.mjs skills ligar` se não houver `postinstall`;
  se houver, mostra o que acrescentar. O `instalar` também liga, então a primeira instalação não
  depende do `postinstall`.
- `doctor` acusa junção ausente ou quebrada (cobre `npm install --ignore-scripts`).
- **Plano B:** ferramenta que não seguir junção recebe cópia gerada pelo `gerar`, conferida pelo
  `verificar`, e a decisão vai às notas da versão.

**B4 · Revisão igual nas três.**

- **Regra no núcleo (§9):** pedido de revisão em qualquer forma (revisar, review, `/review`,
  `/code-review`) carrega `processos/revisao.md` e as seções do guia da área antes de responder; a
  revisão nativa da ferramenta não substitui. Fica no núcleo porque o núcleo é o que está sempre
  carregado; a skill só é lida quando o modelo a seleciona.
- **Skill `revisao`** (`.mentor/skills/revisao/SKILL.md`) como complemento: descrição que dispara
  pelos mesmos termos e corpo que repete a ordem do núcleo.
- **Mapa área → guia:** sai de `revisao-incremental.ts` como exportação; o `gerar` escreve num bloco
  com marcadores em `processos/revisao.md`, e o `verificar` confere. Uma fonte só.
- Catálogo: 9 skills (7 do pacote, `revisao` e as do projeto).

**B5 · Tetos.** O núcleo muda; é medido de novo. Passando de 15.100, aplica-se a mesma regra (+30%
sobre o medido), desde que o `AGENTS.md` continue abaixo de 21.600 bytes.

## 4. Critérios de aceite

1. `npm run verify` verde.
2. Bloco do `AGENTS.md` igual ao `nucleo.md`; edição à mão no bloco reprova o `verificar`;
   `AGENTS.md` abaixo de 21.600 bytes.
3. Matriz de instalação, em clone temporário: (a) projeto novo com `npx mentor instalar` cria
   junções, `postinstall` e bloco; (b) `--forcar` preserva o texto fora dos marcadores; (c) execução
   repetida não duplica nada; (d) `npm ci` num clone liga as skills pelo `postinstall`; (e)
   `postinstall` existente não é sobrescrito; (f) `npm install --ignore-scripts` faz o `doctor`
   acusar; (g) `git clean -fdx` deixa a fonte intacta.
4. `git status` não mostra nada das skills ligadas.
5. Nas três ferramentas, numa sessão nova, as skills aparecem. Se alguma não aparecer, plano B para
   ela, registrado.
6. Nas três ferramentas, "revise esta mudança" segue o `processos/revisao.md` e cita a seção do guia
   da área.
7. O `doctor` aceita os novos `CLAUDE.md`/`GEMINI.md` e acusa `CLAUDE.md` sem `@AGENTS.md`.

## 5. Riscos

| Risco | Mitigação |
| :-- | :-- |
| Ferramenta não segue junção | plano B, decidido no critério 5 |
| Pasta real com nome de skill | `ligar` recusa e avisa, nunca apaga |
| `postinstall` quebra `npm install` ou CI | sai com 0 sem `.mentor/`; só cria junções |
| Núcleo em dobro no Claude | B2 e aviso do `doctor` |
| `AGENTS.md` acima do limite do Antigravity | medição em bytes, aviso a 21.600, reprovação a 24.000 |

## 6. Proporcionalidade

Pediram que as três ferramentas carreguem o mesmo. Três artefatos novos: `skills ligar`, o bloco
gerado no `AGENTS.md` e a skill `revisao`. Cada um é o mínimo para tirar do modelo a decisão de
carregar; o resto continua sob demanda, como hoje.

## 7. Fechamento

1. `CHANGELOG`, notas, versão 0.14.0.
2. Commit com autorização; tag e push com outra autorização.
3. Tarefa Standard no piloto: `#v0.14.0` e `instalar --forcar`; novos `CLAUDE.md`/`GEMINI.md`;
   `AGENTS.md` só com o que é do projeto (as cinco regras soltas conferidas contra núcleo e
   processos: o que já está lá sai, o que falta vai ao pacote); `referencia-para-react` de
   `.agents/skills/` para `docs-mentor/skills/`; `npm install`; critérios 5 e 6 conferidos com o
   mantenedor nas três ferramentas.
