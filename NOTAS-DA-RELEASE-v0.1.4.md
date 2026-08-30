# mentor-agent 0.1.4

Primeira versão instalável. Pacote de trabalho para agentes de IA: gerencia tarefas, orienta quem
não sabe o que precisa perguntar, e registra tudo de forma rastreável.

**Node ≥ 22.18. Nenhuma dependência de execução, nenhuma etapa de build.**

⚠️ **A v0.1.0 não deve ser usada.** A tag foi publicada apontando para um commit sem os pontos de
entrada de IA, então nenhuma ferramenta carregava o núcleo. Ela fica no histórico como registro
honesto do que era; instale a 0.1.4.

## Como instalar num projeto

Na raiz do projeto:

```bash
npm i -D github:thiagoroddev/mentor-agent#v0.1.4
npx mentor instalar        # copia .mentor/, mentor.mjs e os pontos de entrada
node mentor.mjs init       # cria docs/
```

⚠️ **`npm i` sozinho não muda nada no projeto**, por desenho: ele só põe o pacote em
`node_modules`. Quem copia os arquivos para dentro do repositório é o `npx mentor instalar`.

## Novo na 0.1.4

⚠️ **Se você instalou a `v0.1.3`, atualize.** Aquela tag foi publicada apontando para um commit
intermediário e ficou três correções atrás. **Não instale por ela.** Uma versão, um commit, para
sempre: correção vira versão nova, nunca tag repontada.

**O relatório de campo publicava a versão errada.** Lia `join(raizPacote(), "package.json")`, que
instalado resolve para o `package.json` do projeto: o relatório saía com a versão do app. Ancorar
achado numa versão é a única coisa que esse relatório existe para fazer. Agora lê o
`manifesto.json` e avisa quando o contexto declarar outra.

**A versão gravada acompanha a atualização.** Era escrita só pelo `init`, que recusa rodar em
projeto existente, então ficava congelada na versão da adoção para sempre.

**A parte B do relatório alcança a adoção.** Exigia ID de tarefa, mas todo o atrito de instalar e
inicializar acontece antes da primeira tarefa. Âncora passa a aceitar `adocao` e `fase:<fase>`.

**Amostra vazia deixou de virar estatística.** Com zero tarefas concluídas, o relatório anunciava
*"Funcionalidade: 0%, o pacote está consumindo o projeto"*.

**Reinstalar sobre projeto inicializado não pede `init` de novo.**

## Novo na 0.1.2

**Padrao do pacote deixou de contar como decisao sua.** O `contexto.md` de um projeto novo dizia
*"Decidido: 25 campos"* com zero decisao tomada: os 25 vinham prontos do esquema. Agora o cabecalho
separa `Respondido por voce`, `Padrao do pacote` e `Em aberto`, comparando com o esquema. Campo
pre-preenchido que se confunde com campo respondido some da pauta sem ninguem ter pensado nele.

Achado no primeiro uso real do pacote, que e exatamente para isso que ele serve.

## Novo na 0.1.1

**Pontos de entrada de IA.** O `instalar` cria `CLAUDE.md`, `AGENTS.md` e `GEMINI.md`, sem os quais
nenhuma ferramenta carrega o núcleo e o pacote não existe na prática. São ponteiros: 1.885
caracteres somados, nenhuma regra repetida. Arquivo que já exista **não é sobrescrito**.

**O auditor virou comando.** `mentor auditar preparar | registrar | resolver`.

**A instalação via npm funciona.** Na 0.1.0 ela morria: o Node se recusa a remover tipos dentro de
`node_modules`.

O pacote é copiado **para dentro** do repositório, não fica em `node_modules`: a IA lê `.mentor/`
como arquivo, e o projeto versiona as convenções dele ao lado. A versão fica gravada em
`docs/contexto.json`, para o relatório de campo saber a que versão atribuir cada achado.

## O que tem dentro

19 comandos. O núcleo com as leis (6.844 caracteres, sempre carregado), 8 processos carregados por
gatilho, e as 494 regras do guia divididas em 13 áreas, consultadas por lacuna e nunca inteiras.

Abrir uma tarefa custa **11.227 caracteres** de contexto contra 171.591 do pacote anterior.

## O que ele recusa, que é o ponto

- `APROVADO` escrito à mão: o rótulo sai do código de saída do processo, nunca de quem escreve
- fechar tarefa com marcador `PREENCHER:` sobrevivente, ou critério de aceite sem teste nomeado
- com TDD, fechar sem o gate ter sido visto **vermelho** antes do verde
- achado sem destino, risco aceito sem prazo, sem prova e sem caminho de saída
- auditoria que aprova com bloqueio pendente, ou que diz ter verificado tudo

## Auditoria: quem escreve não aprova

`mentor auditar preparar` monta um dossiê com o diff do lote, os registros e os requisitos citados —
e nada mais — para uma sessão de IA zerada. O escopo fechado não é promessa: é o único material que
ela recebe. Ela reporta; **quem decide o que vira trabalho é você.**

## Limite honesto desta versão

Os 12 cenários de teste provam **mecânica**: transições, recusas, integridade. Nenhum deles prova se
a orientação é boa, se a cerimônia é proporcional, ou quanto custa em tokens por tarefa. Isso só um
projeto real mede, e é o que a 0.2.0 vai corrigir.
