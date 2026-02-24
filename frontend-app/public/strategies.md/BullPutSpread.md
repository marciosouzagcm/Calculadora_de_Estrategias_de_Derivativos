# Estratégias Quantitativas: Trava de Alta com Put (Bull Put Spread)

O **Bull Put Spread** é uma estratégia de crédito vertical onde o investidor recebe um prêmio antecipado para assumir o compromisso de comprar uma ação em um determinado preço, mas protege esse compromisso com a compra de uma Put em um strike inferior.



## 🟢 Quando utilizar?
* **Visão de Mercado:** Altista ou Lateral (Neutro-Alta).
* **Cenário Ideal:** Quando você acredita que um ativo encontrou um "fundo" ou suporte e não cairá abaixo de um certo nível até o vencimento.
* **Vantagem:** Você lucra mesmo se o ativo ficar parado ou subir apenas um pouco. É uma operação com alta probabilidade de lucro.

## 🛠 Como é montada?
Utiliza duas Puts do **mesmo vencimento**:
1.  **Venda de uma Put** com strike mais alto (geralmente No Dinheiro - ATM).
2.  **Compra de uma Put** com strike mais baixo (Fora do Dinheiro - OTM) para limitar o risco máximo.

## 📈 Dinâmica de Lucro e Prejuízo
* **Lucro Máximo:** É o crédito líquido recebido na montagem. Ocorre se o ativo fechar acima do strike da Put vendida.
* **Prejuízo Máximo:** Diferença entre os strikes menos o crédito recebido. Ocorre se o ativo cair abaixo do strike da Put comprada.
* **Ponto de Equilíbrio (Break-even):** Strike da Put vendida menos o crédito recebido.

## 🧠 Comportamento das Gregas
* **Delta Positivo:** A posição ganha valor se o ativo subir (ou se afastar do strike vendido).
* **Theta Positivo:** O passar do tempo é o maior aliado desta estratégia. Se o ativo não se mover, você retém o prêmio recebido.
* **Vega Negativo:** Geralmente beneficia-se de uma queda na volatilidade implícita (pois você é um vendedor líquido de opções).

## ⚠️ Riscos e Observações
* **Margem Requerida:** A corretora exigirá uma margem de garantia (geralmente a diferença entre os strikes) para montar a operação.
* **Risco de Atribuição:** Se o ativo cair abaixo do strike vendido, você pode ser exercido e obrigado a comprar as ações. A trava (Put comprada) garante que você possa vender essas ações no strike inferior, limitando o prejuízo.