---
name: spike-e-investigacao
description: Roteiro estruturado para tarefas SPIKE, provas de conceito técnicas e diagnóstico sistemático de bugs com teste de reprodução mínimo.
---

# Habilidade · Spikes e Diagnóstico Sistemático

Esta habilidade orienta a condução de tarefas de pesquisa (`SPIKE`) e a depuração científica de bugs sem tentativa e erro cega.

---

## 1. O Ciclo de Vida de um SPIKE

Um `SPIKE` é uma tarefa de exploração com **tempo limitado (timebox)** para responder uma dúvida técnica específica antes de comprometer o ciclo.

```
[Dúvida Técnica / Risco]
       │
       ▼
[Hipótese Clara & Pergunta Fechada]
       │
       ▼
[Timebox Definido (ex: 2 a 4 horas)]
       │
       ▼
[Código Exploratório / Descartável]
       │
       ▼
[Registro do Aprendizado em ADR ou Rascunho]
       │
       ▼
[Criação das Tarefas de Produção (RF/CHORE)]
```

---

## 2. Regras de Ouro do SPIKE

1. **Pergunta binária ou fechada**: O spike deve responder algo concreto (ex: *"A biblioteca X suporta streaming de 10.000 linhas sem estourar memória no Node 20?"*).
2. **Código de spike é descartável**: O código escrito em spike **não vai para produção**. Ele serve para provar a viabilidade e medir.
3. **Resultado obrigatório**: O encerramento do spike gera ou uma decisão arquitetural (`ADR`), ou o descarte da abordagem, ou o fatiamento de tarefas formais.

---

## 3. Depuração Sistemática de Bugs (Scientific Debugging)

Diante de um bug intermitente ou complexo:

1. **Reprodução Determinística**: Antes de alterar o código de produção, escreva um teste unitário ou de integração mínimo que **reproduza a falha** (vermelho).
2. **Formulação de Hipótese**: Formule uma hipótese testável sobre a causa raiz.
3. **Isolamento de Variáveis**: Altere uma única variável por vez.
4. **Resolução**: Ajuste o código até o teste de reprodução ficar verde.
5. **Teste de Regressão**: Mantenha o teste de reprodução na suíte principal para impedir que o bug retorne.
