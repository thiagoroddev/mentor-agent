---
name: revisao
description: Revisão de código ou de mudança pelo processo do mentor-agent. Use sempre que pedirem para revisar, fazer review, code review, /review, /code-review, auditar um diff ou dar parecer sobre uma alteração, antes de usar a revisão nativa da ferramenta.
---

# Revisão pelo processo do mentor

O núcleo (§9) manda: todo pedido de revisão segue `.mentor/processos/revisao.md`. Esta skill existe
para o pedido cair aqui mesmo quando chega com outro nome. A revisão nativa da ferramenta não
substitui o processo; pode complementar, depois.

## Passos

1. **Delimite a mudança.** O diff, os arquivos e a tarefa (com critérios de aceite) que ela atende.
   Sem tarefa, diga isso no parecer.
2. **Identifique as áreas tocadas** pela tabela "Áreas e guia" de `.mentor/processos/revisao.md`.
   Carregue o guia de cada área: é ali que está o que a revisão confere sem ninguém pedir.
3. **Responda a pergunta de cada área** antes de qualquer outro comentário.
4. **Classifique cada achado** em Bloqueante, Recomendação ou Observação. Achado sem nível é ruído.
5. **Declare o escopo examinado** e o que não deu para verificar. Parecer sem achados é legítimo
   quando diz o que foi olhado.
6. **Dê o veredito:** `APROVADO`, `APROVADO COM RESSALVAS` ou `REPROVADO`.

## O que não fazer

- Não corrija durante a revisão: reportar não precisa de permissão; corrigir precisa.
- Não abra tarefa a partir de achado: quem decide o destino é o humano (`auditar resolver`).
- Não aprove o próprio código como se fosse revisão independente: em tarefa que exige `REV`, o
  parecer vem de sessão nova, pelo `auditar preparar --tarefa`.
