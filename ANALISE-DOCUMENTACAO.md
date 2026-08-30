# Documentação para IA: o que paga o próprio custo

Análise pedida em 30/08, a partir de três observações de campo: o agente passou a focar em orientar
e a documentação encolheu; o `roteirizarj` tem 7 arquivos de arquitetura que nenhum processo pediu;
e o tema do Tailwind foi parar em padrões de stack quando parece arquitetura.

Nada aqui está decidido. É análise, e o que virar regra você decide no fim.

---

## 1. A pergunta certa não é "o que documentar"

É **"o que o código não consegue dizer"**. Toda a diferença está aí, e ela divide o conhecimento de
um projeto em três classes com economias completamente diferentes.

| Classe | Exemplo | Custo de documentar | O que acontece com o tempo |
| :-- | :-- | :-- | :-- |
| **Derivável do código** | estrutura de pastas, quem importa quem, versão da dependência | alto e recorrente | envelhece e passa a **mentir** |
| **Não derivável** | invariante, decisão descartada, nome do domínio, requisito ainda não implementado | baixo e único | continua valendo |
| **Derivável, mas caro** | "quais dos 200 arquivos mexem em pagamento" | médio | envelhece, mas dá para **gerar** |

Documentação da primeira classe não é neutra, é **negativa**. Enquanto está certa, ela apenas
duplica o que um `grep` responde em dois segundos. Quando fica errada, ela é pior que a ausência,
porque uma IA confia nela e para de olhar o código. Você viveu isso: o `esquadro-agents` produziu 95
tarefas, das quais **40 CHORE e 35 DOC, e zero RF, RN ou RNF**. Três quartos do trabalho foi manter
descrição de coisa que o próprio repositório já dizia.

O pacote **já tem esse princípio escrito**, mas aplicado a um processo só. Está em
`processos/padroes-de-stack.md`:

> | Extrai lendo o código | Pergunta |
> |---|---|
> | versão, configuração, o que já é feito de um jeito só | o que foi decisão e o que foi acaso |
>
> Traga a leitura pronta. **Pergunte só o que o código não responde.**

Essa frase é a resposta à sua pergunta inteira. Ela só está presa dentro de um processo, quando
deveria ser lei geral do pacote.

---

## 2. A classificação aplicada, item por item

| O que | Classe | Veredito |
| :-- | :-- | :-- |
| Estrutura de pastas | derivável | **Nunca documentar.** `ls` é mais barato e sempre verdadeiro |
| Arquitetura atual (o que existe) | derivável | Não documentar como descrição |
| Arquitetura como **restrição** ("a camada de UI não fala com o banco") | **não derivável** | Documentar. É invariante, não descrição |
| Invariantes de domínio | **não derivável** | **O documento de maior valor que existe para IA** |
| Glossário do domínio | **não derivável** | Maior retorno por caractere de todos |
| ADR | **não derivável** | Manter. Alternativa descartada não existe no código |
| Dívida técnica | **não derivável** | Manter. É "isto está errado de propósito" |
| Requisito | **não derivável** | Manter. Descreve o que ainda não existe |
| Tema visual **implementado** | derivável | Está no `tailwind.config` e nos componentes |
| Tema visual **não implementado** | não derivável | É requisito, não descrição. Veja §7 |
| Mapa "onde fica o quê" | derivável mas caro | **Gerar**, nunca escrever |

---

## 3. Por que invariante é o documento de maior valor para uma IA

Código mostra **o que é**. Nunca mostra **o que precisa continuar sendo**.

Uma IA lendo seu projeto vê que nenhum componente de front calcula preço. Ela não tem como
distinguir duas situações que parecem idênticas no código e são opostas:

- ninguém calculou preço no front ainda, e fazer isso agora é normal;
- calcular preço no front é **proibido**, porque o servidor é a única autoridade sobre valor.

Essa distinção não está em lugar nenhum do repositório. Não está no código, não está nos tipos, não
está nos testes se ninguém escreveu um teste para uma coisa que nunca aconteceu. Ela só existe na
cabeça de quem decidiu, e é exatamente ela que a próxima sessão de IA vai violar com toda a
confiança do mundo, porque nada a contradiz.

**É o único tipo de documento que a IA não consegue substituir por leitura.** Todo o resto ela
descobre olhando; isto ela só sabe se alguém contar.

E é barato: uma invariante bem escrita cabe em uma linha.

```
INV-3  O preço final nunca é calculado no cliente. O servidor é a única
       autoridade sobre valor.
```

---

## 4. Seu atalho (documento, linha, data): o que acerta e o que erra

A intuição está certa: **ponteiro em vez de cópia**, para não ter duas verdades. É o mesmo raciocínio
que matou o `AGENTS.md` de 22 KB hoje. Mas duas partes precisam de ajuste.

**Linha envelhece mais rápido que texto.** Uma inserção de duas linhas acima invalida o ponteiro sem
mudar nada de relevante, e ninguém percebe. Ancore em identificador estável (`INV-3`), nunca em
número de linha.

**A data importa, mas não pela razão que parece.** Ela não diz "está atualizado". Ela diz **quando
aquilo foi verdade pela última vez que alguém olhou**, o que é uma informação diferente e mais
honesta. Data velha não significa errado; significa não conferido.

Mas o ponto central é outro, e é o que fecha com tudo o que aconteceu hoje: **uma invariante sem
mecanismo é só um desejo escrito.** Se ela vale de verdade, alguma coisa a verifica: um teste, um
tipo, uma regra de lint, uma checagem de CI. Se nada verifica, ela vai ser violada, e você vai
descobrir em produção.

Então a forma certa não é um documento em prosa nem um ponteiro para uma linha. É um **registro**,
com o mesmo desenho de `riscos-aceitos.json` e `dividas.json`, que já existem no pacote:

```json
{
  "id": "INV-3",
  "enunciado": "O preço final nunca é calculado no cliente",
  "porque": "o servidor é a única autoridade sobre valor; front pode ser adulterado",
  "mecanismo": "testes/preco.test.ts > servidor recalcula e recusa divergência",
  "declarada_em": "30/08/26",
  "conferida_em": "30/08/26"
}
```

Com `mecanismo: null` sendo permitido, **e contado pelo doctor**. Aí você enxerga quantas das suas
invariantes são lei e quantas são torcida. É o princípio P1 do pacote aplicado ao lugar onde ele
mais faz falta.

---

## 5. Glossário: o maior retorno por caractere

O erro mais comum de IA em projeto grande não é lógica, é **nome**. Ela chama de `order` o que o
resto do sistema chama de `pedido`, de `client` o que você chama de `cliente`, e cria `Usuario` ao
lado de `User`. Cada divergência dessas é uma inconsistência permanente, porque o código seguinte é
escrito olhando o código anterior.

Vinte termos com uma linha cada custam menos de 1 KB e eliminam uma classe inteira de erro.

O valor extra, que quase ninguém nota: **escrever o glossário revela ambiguidade do domínio**.
Quando você tenta definir "pedido" e descobre que ele significa duas coisas diferentes em dois
lugares, achou um defeito de modelagem antes de escrever uma linha de código.

Isso é literalmente o portão **P** (problema) e o **N** (persistência) do guia produzindo artefato.

---

## 6. Os 7 arquivos de arquitetura, e a liberdade que importa

Aqui tem uma distinção que muda a resposta, e vale separar com cuidado.

**Sua liberdade de criar documento é absoluta e não deve ser tocada.** O pacote não é dono do seu
`docs/`. Ele nunca deve recusar um arquivo que você quis escrever, nem exigir que ele siga formato.

**A liberdade da IA de criar documento é o que precisa de freio.** O antecessor não morreu porque
você escreveu demais. Morreu porque a IA gerou 35 tarefas de DOC contra zero de requisito, cada uma
descrevendo coisa que o código já dizia. Era a IA se dando trabalho.

Então a regra não é sobre quantidade, é sobre **quem pediu**:

> Documento que a pessoa quis, existe e ninguém questiona.
> Documento que a IA propôs, precisa dizer que pergunta ele responde que o código não responde.

Sobre os 7 do `roteirizarj`, a pergunta útil não é "podiam existir". É: **algum deles descreve o que
o código já diz?** Se sim, ele vai envelhecer, e no dia em que envelhecer vai desinformar uma IA que
confiou nele. Se descrevem restrição, intenção ou decisão, valem e deveriam virar ADR ou invariante,
que é a forma que o pacote sabe cobrar.

Um teste rápido para cada um: **apague mentalmente o arquivo. O que se perde?** Se a resposta é
"nada, dá para descobrir lendo o código", ele é custo. Se é "ninguém mais vai saber por que", é
patrimônio.

---

## 7. O tema do Tailwind: você está certo, e a regra que separa

Padrão de stack e arquitetura se confundem porque os dois falam de "como as coisas são feitas". A
linha que os separa é **portabilidade**:

| | Padrão de stack | Arquitetura / design do produto |
| :-- | :-- | :-- |
| Responde | como **nós usamos a ferramenta X** | como **este sistema** deve ser |
| Vale em outro projeto seu que use a mesma ferramenta? | sim | não |
| Morre quando | você sai da ferramenta | o produto muda |

"Classe utilitária antes de CSS custom", "ordem das classes", "quando extrair componente": isso é
Tailwind, vale em qualquer projeto seu com Tailwind, e é **padrão de stack**.

Sua paleta, sua escala de espaçamento, seus tokens semânticos: isso é **este produto**. Não viaja
para outro projeto. Não é stack, mesmo morando em `tailwind.config`.

E o seu segundo ponto é o mais fino de todos: **tema ainda não implementado não é descrição de nada,
é requisito.** "Os botões primários usam a cor de marca" antes de existir botão é uma afirmação
sobre o futuro, e o lugar dela é junto dos requisitos, não em padrões de stack nem em arquitetura.

Isso generaliza: **documento que descreve o que o sistema deve ser, antes de ser, é requisito.**
Requisito não funcional, se preferir, mas requisito. Hoje o pacote só tem `RF`, `RN` e `RNF` para
enunciado curto, e não tem lugar para um documento de especificação de aparência ou comportamento.
É um buraco real, e explica por que o tema foi parar no lugar errado: não havia lugar certo.

---

## 8. Arquitetura atual: só código basta?

Para **descrição**, sim. Para **restrição**, não, e a diferença é a mesma da §3.

"O projeto tem uma camada de serviços em `src/services`" é descrição. Um `ls` responde melhor,
sempre atualizado, custo zero.

"Nenhum componente de UI importa de `src/db`" é restrição. O código de hoje é compatível com ela e
também compatível com a ausência dela. Uma IA não consegue distinguir, e é a que ela vai quebrar.

Sobre o README: concordo com você, e vale explicitar o critério. **README é para humano que chega**,
e o que ele precisa é orientação de entrada, não completude. A IA não precisa de README, precisa de
restrições e de nome. São públicos diferentes e documentos diferentes, e tentar servir os dois no
mesmo arquivo é como o `AGENTS.md` de 22 KB acabou nascendo.

---

## 9. O que eu mudaria no pacote

Em ordem de retorno pelo custo.

**1. Registro de invariantes** (`docs/invariantes.json`), com o desenho de `riscos-aceitos.json`:
enunciado, porquê, mecanismo, data. Mecanismo `null` permitido e contado pelo doctor. É o item de
maior valor da lista e o mais alinhado ao que o pacote já é.

**2. Glossário do domínio** (`docs/glossario.md`), com teto de texto baixo, gerado como pauta pelo
portão P. Maior retorno por caractere.

**3. Lei geral "pergunte só o que o código não responde"**, promovida de `padroes-de-stack.md` para
o núcleo. Hoje ela existe presa em um processo e vale para todos.

**4. Lugar para documento de especificação** que diga como o sistema deve ser antes de existir,
ligado a requisito. É o buraco que mandou o tema para o lugar errado.

**5. Regra sobre documento proposto pela IA**: precisa declarar que pergunta responde que o código
não responde. Sua liberdade de criar continua intocada.

Custo somado: um JSON novo, um arquivo de processo, e algumas linhas no núcleo. Nenhum comando novo
obrigatório.
