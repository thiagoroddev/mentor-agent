# Plano · v0.14.0: o mesmo carregamento no Codex, no Claude Code e no Antigravity

> Aprovado pelo mantenedor em 01/10/26 (Portão 1), na versão revisada abaixo: skills por **cópia
> gerada**, e não por junção, depois da pesquisa e de uma revisão independente do plano. Executa
> depois da v0.13.0, sobre o núcleo consolidado e os scripts portados.

## 1. Problema

O mantenedor usa as três ferramentas, cada uma na própria IDE, e elas carregam coisas diferentes:

| O quê | Claude Code | Codex | Antigravity |
| :-- | :-- | :-- | :-- |
| Arquivo lido sozinho | `CLAUDE.md` | `AGENTS.md` | `AGENTS.md` e `GEMINI.md` |
| `nucleo.md` | mecânico (`@`) | só se o modelo abrir | só se o modelo abrir |
| Skills de `.mentor/skills/` | não descobre | não descobre | não descobre |

No piloto, o `CLAUDE.md` já existia antes do `instalar` e não importa o `AGENTS.md`, então o Claude
não via cinco regras do projeto. O `processos/revisao.md` não cita o guia, e nada manda carregar a
revisão do mentor quando o pedido vem em conversa. Resultado observado: cada ferramenta revisa de um
jeito.

## 2. Objetivo, dito com precisão

**Mesmas regras e mesmos critérios de carregamento nas três ferramentas:**

- **sempre, mecanicamente:** o núcleo, dentro do `AGENTS.md`, e as regras do projeto;
- **sob demanda, pelas regras escritas no núcleo:** processos, guia e skills. As três descobrem o
  mesmo catálogo; cada uma carrega nome e descrição e lê o conteúdo quando o pedido casa com a skill
  ou quando o núcleo manda.

**Não é objetivo** carregar tudo sempre: só o guia tem ~127 mil caracteres.

**Limites (documentação oficial):** o Codex soma os `AGENTS.md` até 32 KiB; o Antigravity trunca
arquivo de regra acima de 24.000 bytes. O mais apertado é o do Antigravity. O Claude Code lê o
`AGENTS.md` sozinho só quando não há `CLAUDE.md`; com `CLAUDE.md` = `@AGENTS.md`, carrega uma vez.

## 3. Por que cópia gerada e não junção

Link por pasta de skill é documentado no Codex, funciona sem documentação no Claude Code e não tem
registro no Antigravity; junção do Windows não aparece em nenhuma das três. Além disso, junção não
vai para o git: o clone em outra máquina dependeria de `postinstall`, que falha calado com
`--ignore-scripts`. Cópia versionada funciona no clone na hora, em qualquer sistema, e o `verificar`
confere que ela continua igual à fonte. Custo: ~43 KB de skills duas vezes.

## 4. Frente B

**B1 · Núcleo dentro do `AGENTS.md`.** `sincronizarAgentes(destino)`, em `instalar.mjs` (JS puro: roda
também de dentro de `node_modules`), insere no topo do `AGENTS.md` ou atualiza:

```
<!-- mentor:nucleo:inicio -->
<!-- Gerado por `node mentor.mjs gerar` a partir de .mentor/nucleo.md. Não edite este bloco. -->
Caminhos `processos/`, `guia/`, `skills/` e `esquemas/` citados abaixo são relativos a `.mentor/`.
…
<!-- mentor:nucleo:fim -->
```

Fora dos marcadores é do projeto e nunca é tocado. Marcador incompleto, duplicado ou fora de ordem:
recusa sem alterar nada. O `verificar` reprova bloco diferente do que seria gerado e mede o
`AGENTS.md` em bytes UTF-8: aviso acima de 21.600, reprovação acima de 24.000.

**B2 · Pontos de entrada.** Projeto novo: `CLAUDE.md` = `@AGENTS.md`; `GEMINI.md` = ponteiro curto
para o `AGENTS.md`. Instalação antiga: `node mentor.mjs entrada migrar`, explícito e idempotente:
no `CLAUDE.md` garante `@AGENTS.md` e tira `@.mentor/nucleo.md`; no `GEMINI.md`, se não citar o
`AGENTS.md`, acrescenta a linha no topo; no `AGENTS.md`, insere o bloco. Linhas próprias do projeto
ficam; o comando mostra o que mudou e aponta o que repete o núcleo. O `instalar` não edita
`CLAUDE.md` nem `GEMINI.md` existentes: cria os que faltam e indica o `entrada migrar`. O `doctor`
(`entrada.ts`) confere o bloco no `AGENTS.md`, `@AGENTS.md` no `CLAUDE.md` e a menção no `GEMINI.md`.
Os dois caminhos de instalação (`mentor.mjs` em `node_modules` e `cmd-pacote.ts`) chamam uma função
só, `concluirInstalacao(destino)`.

**B3 · Skills por cópia gerada.** `sincronizarSkills(destino)`, em `instalar.mjs`:

- fontes: pastas com `SKILL.md` em `.mentor/skills/` e `docs-mentor/skills/`; destinos:
  `.agents/skills/` (Codex e Antigravity) e `.claude/skills/` (Claude Code);
- cada destino guarda `.mentor-skills.json` com as cópias do mentor; o hash de cada cópia cobre
  caminho e conteúdo de todos os arquivos da pasta;
- mesmo nome no pacote e no projeto: recusa e nomeia os dois caminhos;
- pasta no destino fora do registro e com nome de fonte: conflito, recusa;
- cópia do registro com hash diferente do gravado: editada; preserva, avisa, e o `verificar`
  reprova pedindo para levar a mudança à fonte;
- registro ausente ou corrompido: nenhuma pasta é do mentor; nada é sobrescrito nem removido;
- fonte removida: remove a cópia intacta; preserva a editada, com aviso.

Rodam no `instalar` e no `gerar`. O `verificar` reprova cópia ausente, editada ou divergente.

**B4 · Revisão igual nas três.** `AREAS_DE_REVISAO` em `revisao-incremental.ts` (área, sinais,
pergunta, guias) substitui as perguntas espalhadas e o `GUIAS_DA_REGRA`. A tabela entra num bloco
gerado em `processos/revisao.md` (arquivo do pacote: gerado no repositório do pacote, antes do
manifesto). Núcleo §9: qualquer pedido de revisão (revisar, review, `/review`, `/code-review`)
carrega `processos/revisao.md` e o guia da área; a revisão nativa da ferramenta não substitui. Skill
`.mentor/skills/revisao/` como complemento. Catálogo do pacote: 8 skills.

**B5 · Regras soltas do `AGENTS.md` do piloto.** Desfecho, plano integral e sugestões de validação já
estão no núcleo. Entram: no §9, não carregar `*--estudo-humano.md` por padrão; em
`processos/entrega.md`, sem merge local na principal quando o PR é exigido.

**B6 · Testes.** Cenário 32 (projeto instalado de verdade): bloco gerado e regenerado sem duplicar;
edição à mão reprova; marcador incompleto e duplicado recusam; limite de bytes; `entrada migrar`
preserva linhas próprias e é idempotente; skills nos dois destinos; conflito de nome; pasta alheia;
cópia editada preservada; registro corrompido; fonte removida; **clone sem `gerar` nem script**:
skills, bloco e `verificar` certos. Ajustes nos cenários 06, 10, 16 e 19. Prova por mutação em cada
checagem nova.

**B7 · Validação com o mantenedor.** `sandbox-mentor` (git novo, 0.14.0 instalada e commitada),
validada num **clone** dela. Roteiro `VALIDACAO.md`, uma tabela por ferramenta, em sessão nova:
versão da IDE; fontes que a ferramenta mostra como carregadas; catálogo (as 8 do mentor presentes;
globais extras anotadas); pergunta sobre trecho do bloco do núcleo, conferindo no histórico que
nenhum arquivo foi lido; "revise esta mudança" sobre alteração preparada, seguindo
`processos/revisao.md` e citando o guia da área.

**B8 · Tetos.** O núcleo muda; é medido de novo. Passando de 15.100, a mesma regra (+30% sobre o
medido), desde que o `AGENTS.md` fique abaixo de 21.600 bytes.

## 5. Critérios de aceite

1. `npm run verify` verde.
2. Bloco igual ao gerado; edição à mão reprova; marcador inválido recusa sem alterar; `AGENTS.md`
   abaixo de 21.600 bytes.
3. Instalação: projeto novo cria pontos de entrada, bloco e cópias; `--forcar` preserva o texto
   fora dos marcadores e as linhas próprias; execução repetida não duplica nada.
4. Clone sem `gerar` nem script: 8 skills nos dois destinos, bloco presente, `verificar` aprova.
5. Conflitos e edições locais nunca sobrescritos nem removidos; sempre nomeados.
6. Nas três ferramentas, em sessão nova sobre o clone do sandbox: as 8 skills aparecem; o núcleo
   está carregado sem leitura de arquivo; "revise esta mudança" segue o processo e cita o guia.
7. O `doctor` aceita os pontos de entrada novos e acusa `CLAUDE.md` sem `@AGENTS.md`.

## 6. Riscos

| Risco | Mitigação |
| :-- | :-- |
| Editar a cópia em vez da fonte | cópia editada é preservada e o `verificar` reprova apontando a fonte |
| Apagar pasta alheia | só cópia registrada e intacta é removida; registro inválido não autoriza nada |
| Núcleo em dobro no Claude | `entrada migrar` tira `@.mentor/nucleo.md`; `doctor` acusa |
| `AGENTS.md` acima do limite do Antigravity | medição em bytes, aviso a 21.600, reprovação a 24.000 |
| Marcadores corrompidos | recusa sem alterar, com o que foi achado |

## 7. Proporcionalidade

Pediram que as três ferramentas carreguem o mesmo. Três funções em `instalar.mjs`, o comando
`entrada migrar`, uma skill, um cenário e checagens no `verificar`. A cópia gerada tirou do plano
anterior o comando de junção, o `postinstall` e o bloco no `.gitignore`.

## 8. Fechamento

1. `CHANGELOG`, notas, versão 0.14.0, `npm run verify`.
2. B7 com o mantenedor.
3. Commit com autorização; tag e push com outra autorização.
4. No piloto, depois da TASK-RF-084: tarefa única de 0.12.x para 0.14.0 — dependência e
   `instalar --forcar`; `git mv .agents/skills/referencia-para-react docs-mentor/skills/` e `gerar`;
   `entrada migrar`; `AGENTS.md` só com o que é do projeto; `docs-mentor/tetos.json` sem as exceções
   que o pacote cobre; "Incorporadas" no `melhorias-do-pacote.md`; saída do arquivo de regressões;
   B7 repetido no piloto (9 skills: as 8 do pacote e `referencia-para-react`).
