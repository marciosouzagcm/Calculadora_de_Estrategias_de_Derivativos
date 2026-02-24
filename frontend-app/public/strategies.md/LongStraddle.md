# Estratégias Quantitativas: Long Straddle

O **Long Straddle** é a estratégia definitiva para operar volatilidade. Em vez de apostar se o mercado vai subir ou cair, você aposta que o mercado vai **explodir** para algum dos lados, não importa qual.



## 🟢 Quando utilizar?
* **Visão de Mercado:** Altamente Volátil.
* **Cenário Ideal:** Antes de resultados trimestrais, decisões de juros ou eleições, quando se espera um grande movimento, mas a direção é incerta.
* **Vantagem:** Potencial de lucro ilimitado na alta e lucro massivo na baixa, com risco limitado ao capital investido.

## 🛠 Como é montada?
1.  **Compra 1 Call ATM** (No dinheiro).
2.  **Compra 1 Put ATM** (No dinheiro).
*Ambas com o mesmo strike e o mesmo vencimento.*

## 📈 Dinâmica de Lucro e Prejuízo
* **Lucro Máximo:** Teoricamente infinito (na alta) ou muito grande (na queda até zero).
* **Prejuízo Máximo:** Ocorre se o ativo fechar exatamente no strike das opções. O prejuízo é o **custo total pago** (as duas opções viram pó).
* **Pontos de Equilíbrio (BE):** * `Strike + Custo Total` (Breakeven Superior)
    * `Strike - Custo Total` (Breakeven Inferior)

## 🧠 Comportamento das Gregas
* **Delta Neutro:** Inicialmente, a posição não se move com oscilações mínimas, pois o ganho de uma perna anula a perda da outra.
* **Theta Negativo:** O tempo é seu maior inimigo. Se o mercado ficar parado, o decaimento diário (Time Decay) consome o valor das duas opções simultaneamente.
* **Vega Positivo:** Você ama o aumento da volatilidade implícita. Mesmo que o preço não se mova, se o mercado "ficar nervoso", o preço do seu Straddle sobe.

## ⚠️ Riscos e Observações
* **Custo Elevado:** Como você compra duas opções ATM (as mais caras), o movimento do ativo precisa ser maior que o prêmio pago para haver lucro.
* **Vol Crush:** Após o evento esperado (ex: anúncio de balanço), a volatilidade costuma desabar. Isso pode destruir o valor da operação mesmo que o ativo tenha se movido.