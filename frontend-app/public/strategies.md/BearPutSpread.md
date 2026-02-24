# Estratégias Quantitativas: Trava de Baixa com Put (Bear Put Spread)

A **Trava de Baixa com Put** é uma estratégia vertical de débito desenhada para lucrar com a queda do ativo subjacente, oferecendo um custo menor do que a compra simples de uma Put (Put a Seco).



## 🟢 Quando utilizar?
* **Visão de Mercado:** Baixista.
* **Cenário Ideal:** Quando você espera uma queda clara do ativo, mas deseja reduzir o custo da operação e mitigar o efeito da perda de valor no tempo (*Theta*).
* **Volatilidade:** Preferencialmente quando a volatilidade está baixa/moderada e você espera um aumento ou movimento forte de queda.

## 🛠 Como é montada?
A montagem utiliza duas Puts do **mesmo vencimento**:
1.  **Compra de uma Put** com strike mais alto (geralmente No Dinheiro - ATM ou Dentro do Dinheiro - ITM).
2.  **Venda de uma Put** com strike mais baixo (Fora do Dinheiro - OTM).

## 📈 Dinâmica de Lucro e Prejuízo
* **Lucro Máximo:** Diferença entre os strikes menos o débito pago. Ocorre se o ativo fechar no vencimento abaixo do strike da opção vendida.
* **Prejuízo Máximo:** Limitado ao **Débito Pago** (custo líquido da montagem). Ocorre se o ativo fechar acima do strike da opção comprada.
* **Ponto de Equilíbrio (Break-even):** Strike da opção comprada menos o débito pago.

## 🧠 Comportamento das Gregas
* **Delta Negativo:** A posição valoriza-se conforme o ativo cai.
* **Theta Negativo:** Sendo uma operação de débito, a passagem do tempo prejudica a posição, embora de forma mais lenta do que em uma compra a seco, pois a opção vendida compensa parte da perda.
* **Vega Positivo:** A estratégia beneficia-se de um aumento na volatilidade implícita.

## ⚠️ Riscos e Observações
* **Custo vs. Probabilidade:** Diferente da trava com Call (crédito), aqui você precisa que o ativo se mova para baixo do break-even para começar a lucrar.
* **Saída Antecipada:** Muitas vezes é vantajoso encerrar a operação antes do vencimento caso o ativo atinja o strike da opção vendida rapidamente.