# Estratégias Quantitativas: Trava de Baixa com Call (Bear Call Spread)

A **Trava de Baixa com Call** é uma estratégia de crédito onde o investidor aposta que o preço do ativo ficará abaixo de um determinado nível até o vencimento. É uma das formas mais eficientes de "vender tempo" com risco controlado.



## 🟢 Quando utilizar?
* **Visão de Mercado:** Baixista ou Neutra.
* **Cenário Ideal:** Quando você acredita que o ativo vai cair, ficar parado ou subir apenas um pouco (sem ultrapassar o ponto de equilíbrio).
* **Volatilidade:** Preferencialmente em momentos de volatilidade alta, para vender opções mais caras.

## 🛠 Como é montada?
A montagem envolve duas Calls do **mesmo vencimento**:
1.  **Venda de uma Call** com strike mais baixo (mais próxima do dinheiro ou dentro do dinheiro).
2.  **Compra de uma Call** com strike mais alto (mais fora do dinheiro), que serve como seguro/proteção.

## 📈 Dinâmica de Lucro e Prejuízo
* **Lucro Máximo:** É o crédito líquido recebido no momento da montagem. Ocorre se o ativo fechar abaixo do strike da opção vendida.
* **Prejuízo Máximo:** Limitado à diferença entre os strikes menos o crédito recebido. Ocorre se o ativo subir muito além do strike da opção comprada.
* **Ponto de Equilíbrio (Break-even):** Strike da opção vendida + Crédito recebido.

## 🧠 Comportamento das Gregas
* **Delta Negativo:** A posição ganha valor à medida que o ativo subjacente cai.
* **Theta Positivo:** A passagem do tempo favorece o investidor. A opção que você vendeu perde valor mais rápido do que a que você comprou como proteção.
* **Vega Negativo:** Geralmente beneficia-se da queda da volatilidade implícita.

## ⚠️ Riscos e Observações
* **Margem de Garantia:** Por ser uma operação de venda a descoberto "travada", a corretora exigirá uma margem de garantia proporcional à distância entre os strikes.
* **Risco de Exercício:** Caso o ativo suba, você pode ser exercido na sua venda. A trava (compra) existe justamente para que você tenha o direito de comprar o ativo e entregar para quem te exerceu, limitando sua perda.