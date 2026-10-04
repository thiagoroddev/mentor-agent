---
name: test-design
description: Engenharia de testes, metodologia TDD prática, testes de caracterização antes de refatorar, estrutura AAA e validação discriminatória de contratos.
---

# Habilidade · Engenharia de Testes, TDD e Caracterização

Esta habilidade orienta a criação de suítes de teste limpas, sustentáveis e determinísticas, aplicando TDD e testes de caracterização conforme exigido pelo `mentor-agent` (`processos/teste.md`).

---

## 1. Escolher o Escopo Antes de Testar

Siga `processos/teste.md` e o contexto do projeto. Para correção pequena ou portabilidade já
comprovada, comece pela evidência de origem, confira a equivalência do patch e teste apenas o risco
ou a diferença de ambiente que ainda falta demonstrar. Reutilize testes; não repita suíte inteira,
fabrique vermelho desnecessário ou crie testes que apenas espelham texto para repetir prova existente.

Amplie a suíte por exigência explícita do projeto/CI, impacto compartilhado, contrato/dependência
alterado, falha ou indício de regressão. Registre o motivo em `plano.proporcionalidade` e
`plano.meio_de_validacao`. Verificação focada não aprova gate completo nem dispensa obrigação
do contexto.

---

## 2. Testes de Caracterização Antes de Refatorar

Ao refatorar ou modificar código legado, regras de cálculo ou componentes de interface que carecem de cobertura de testes:

1. **Nunca altere o código de produção antes de caracterizar:**
   - Crie testes de caracterização (*characterization tests*) para congelar e documentar o comportamento observável atual (entradas, saídas, erros emitidos e estados gerados).
2. **O teste deve passar com o código existente:**
   - O teste de caracterização passa no estado atual do sistema, servindo como rede de proteção objetiva.
3. **Refatore com segurança:**
   - Com a caracterização verde, execute a refatoração. Qualquer alteração indesejada de comportamento ou quebra de contrato será denunciada imediatamente pela suíte.

---

## 3. O Ciclo TDD no Mentor

Quando desenvolver nova funcionalidade ou correção dirigida por teste:

```
1. 🔴 Vermelho   ➔ Escrever o teste que falha e registrar com:
                   `mentor task gate <ID> testes --esperando-vermelho`
2. 🟢 Verde      ➔ Escrever o código mínimo para o teste passar e registrar:
                   `mentor task gate <ID> testes`
3. 🔵 Refatorar  ➔ Melhorar o design do código mantendo a suíte verde.
```

---

## 4. Estrutura AAA (Arrange, Act, Assert)

Todo teste deve ser legível como uma especificação em três blocos claros:

```typescript
import { describe, it, expect } from 'vitest'
import { CalculadoraDeDesconto } from './calculadora'

describe('CalculadoraDeDesconto', () => {
  it('aplica 10% de desconto para compras à vista via PIX', () => {
    // 1. Arrange (Preparação de dados e dependências)
    const calculadora = new CalculadoraDeDesconto()
    const valorOriginal = 100.00
    const formaPagamento = 'PIX'

    // 2. Act (Execução da ação sob teste)
    const valorFinal = calculadora.calcular(valorOriginal, formaPagamento)

    // 3. Assert (Verificação do resultado esperado)
    expect(valorFinal).toBe(90.00)
  })
})
```

---

## 5. Validação Discriminatória de Contratos

- **Teste Comportamento Público:** Teste invariantes, saídas e erros públicos da interface ou componente. Nunca teste métodos privados, variáveis internas ou detalhes efêmeros de implementação que engessam refatorações legítimas.
- **Teste Discriminatório (Sem Falsos Verdes):** Certifique-se de que o teste genuinamente falharia se a regra de negócio fosse alterada ou removida. Um teste que passa independentemente da correção da implementação não protege contra regressões.

---

## 6. Estratégias de Dublês de Teste (Mocks, Stubs e Fakes)

| Tipo | Quando usar | Como implementar |
| :--- | :--- | :--- |
| **Fake (Em Memória)** | Repositórios e bancos em testes de integração rápidos | `InMemoryUserRepository` armazenando em `Map<string, User>`. |
| **Stub (Retorno Fixo)** | Serviços externos de consulta (ex: API de CEP, cotação) | Função que devolve objeto pré-definido sem chamar rede. |
| **Spy / Mock** | Verificação de efeitos colaterais indispensáveis (ex: disparo de email) | Inspecionar se `mailer.enviar()` foi chamado com parâmetros corretos. |

---

## 7. Testes Determinísticos e Tempo Congelado

- **Zero dependência de rede externa**: Todas as chamadas HTTP devem usar adaptadores falsos ou mocks locais (ex: MSW).
- **Relógio controlado**: Em testes que dependem de datas ou expiração, congele o tempo (ex: `vi.useFakeTimers()`) para evitar falhas sazonais ou de fuso horário.
- **Isolamento hermético**: Cada teste deve limpar seu estado (`beforeEach` / `afterEach`), garantindo que a ordem de execução não altere o resultado.
