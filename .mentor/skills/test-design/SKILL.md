---
name: test-design
description: Engenharia de testes, metodologia TDD prática, estrutura AAA e estratégias de mock sem acoplamento a detalhes internos.
---

# Habilidade · Engenharia de Testes e TDD

Esta habilidade orienta a criação de suítes de teste limpas, sustentáveis e determinísticas, aplicando TDD conforme exigido pelo `mentor-agent` (`processos/teste.md`).

---

## 1. O Ciclo TDD no Mentor

```
1. 🔴 Vermelho   ➔ Escrever o teste que falha e registrar com:
                   `mentor task gate <ID> testes --esperando-vermelho`
2. 🟢 Verde      ➔ Escrever o código mínimo para o teste passar e registrar:
                   `mentor task gate <ID> testes`
3. 🔵 Refatorar  ➔ Melhorar o design do código mantendo a suíte verde.
```

---

## 2. Estrutura AAA (Arrange, Act, Assert)

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

## 3. Estratégias de Dublês de Teste (Mocks, Stubs e Fakes)

| Tipo | Quando usar | Como implementar |
| :--- | :--- | :--- |
| **Fake (Em Memória)** | Repositórios e bancos em testes de integração rápidos | `InMemoryUserRepository` armazenando em `Map<string, User>`. |
| **Stub (Retorno Fixo)** | Serviços externos de consulta (ex: API de CEP, cotação) | Função que devolve objeto pré-definido sem chamar rede. |
| **Spy / Mock** | Verificação de efeitos colaterais indispensáveis (ex: disparo de email) | Inspecionar se `mailer.enviar()` foi chamado com parâmetros corretos. |

⚠️ **Regra inegociável**: Teste o **comportamento e as saídas públicas**, nunca os métodos privados ou a implementação interna. Testes acoplados a detalhes internos quebram em qualquer refatoração legítima.

---

## 4. Testes Determinísticos e Tempo Congelado

- **Zero dependência de rede externa**: Todas as chamadas HTTP devem usar adaptadores falsos ou mocks de rede (ex: MSW).
- **Relógio controlado**: Em testes que dependem de datas, congele o tempo (ex: `vi.useFakeTimers()`) para evitar falhas sazonais ou mudanças de fuso horário.
- **Isolamento hermético**: Cada teste deve limpar seu estado (`beforeEach` / `afterEach`), garantindo que a ordem de execução não altere o resultado.
