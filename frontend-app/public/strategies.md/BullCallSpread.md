# Estratégias Quantitativas: Trava de Alta com Call (Bull Call Spread)

A **Trava de Alta com Call** é uma estratégia vertical de débito que permite ao investidor lucrar com o movimento de subida de uma ação, limitando o valor máximo que pode ser perdido.



## 🟢 Quando utilizar?
* **Visão de Mercado:** Altista (Bullish).
* **Cenário Ideal:** Quando você acredita que o ativo vai subir, mas quer gastar menos do que gastaria comprando a ação ou uma Call isolada.
* **Volatilidade:** É uma estratégia relativamente protegida contra variações de volatilidade, pois você está comprado em uma opção e vendido em outra.

## 🛠 Como é montada?
Envolve a utilização de duas Calls do **mesmo vencimento**:
1.  **Compra de uma Call** com strike mais baixo (perto do preço atual ou já "dentro do dinheiro").
2.  **Venda de uma Call** com strike mais alto (fora do dinheiro), para financiar parte da compra.

## 📈 Dinâmica de Lucro e Prejuízo
* **Lucro Máximo:** Diferença entre os strikes menos o valor pago na montagem. Ocorre se o ativo fechar acima do strike da opção vendida.
* **Prejuízo Máximo:** Limitado ao **Custo Líquido** pago para montar a operação. Ocorre se o ativo fechar abaixo do strike da opção comprada.
* **Ponto de Equilíbrio (Break-even):** Strike da opção comprada + Custo pago.

## 🧠 Comportamento das Gregas
* **Delta Positivo:** A posição ganha valor conforme o ativo sobe.
* **Theta Negativo:** Como é uma operação de débito, o tempo joga contra, mas de forma mais suave do que em uma compra simples, pois a opção vendida também perde valor, ajudando a segurar o preço da trava.
* **Vega Positivo:** Geralmente beneficia-se de um leve aumento na volatilidade implícita.

## ⚠️ Riscos e Observações
* **Teto de Ganho:** Em troca de pagar menos pela operação, você aceita que seu lucro não aumentará mais se a ação subir além do strike da opção vendida.
* **Liquidez:** Verifique sempre se ambos os strikes possuem liquidez no mercado antes de montar a operação.