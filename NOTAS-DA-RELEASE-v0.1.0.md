# mentor-agent 0.1.0

Primeira versão instalável. Pacote de trabalho para agentes de IA: gerencia tarefas, orienta quem
não sabe o que precisa perguntar, e registra tudo de forma rastreável.

**Node ≥ 22.18. Nenhuma dependência de execução, nenhuma etapa de build.**

## Como instalar num projeto

Baixe `mentor-agent-0.1.0.tgz` abaixo e, na raiz do projeto:

```bash
npm i -D ./mentor-agent-0.1.0.tgz
npx mentor instalar        # copia .mentor/ e mentor.mjs para a raiz do projeto
node mentor.mjs init       # cria docs/
```

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
