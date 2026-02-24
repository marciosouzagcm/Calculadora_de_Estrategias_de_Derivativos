# Estratégias Quantitativas: Lançamento Coberto (Covered Call)

O **Lançamento Coberto** é uma das estratégias mais conservadoras e utilizadas para geração de renda recorrente. Nela, o investidor "aluga" suas ações para o mercado em troca de um prêmio em dinheiro.



## 🟢 Quando utilizar?
* **Visão de Mercado:** Neutra ou Levemente Altista.
* **Cenário Ideal:** Quando você possui uma ação e não acredita que ela terá uma alta explosiva no curto prazo.
* **Vantagem:** Reduz o seu preço médio de aquisição e oferece uma pequena proteção contra quedas (equivalente ao valor do prêmio recebido).

## 🛠 Como é montada?
1.  **Possuir ou Comprar o ativo** (100 ações, por exemplo).
2.  **Vender 1 Call** para cada 100 ações possuídas.

## 📈 Dinâmica de Lucro e Prejuízo
* **Lucro Máximo:** Se o strike for maior que o preço de compra: (Strike - Preço de Compra) + Prêmio. Se for ATM: apenas o Prêmio.
* **Prejuízo Máximo:** Ocorre se o ativo cair a zero. O prejuízo é o valor da ação menos o prêmio recebido.
* **Ponto de Equilíbrio (Break-even):** Preço pago na ação - Prêmio recebido pela Call.

## 🧠 Comportamento das Gregas
* **Delta Positivo (Reduzido):** Você ainda ganha com a alta da ação, mas menos do que se estivesse apenas com o papel (Delta ~0.50 em vez de 1.00).
* **Theta Positivo:** O tempo trabalha a seu favor. Cada dia que passa e o ativo não sobe, o valor da Call vendida diminui, o que é lucro para você.
* **Vega Negativo:** Você prefere que a volatilidade caia após montar a operação, para que a Call vendida perca valor mais rápido.

## ⚠️ Riscos e Observações
* **Obrigação de Venda:** Se a ação subir muito acima do strike, você será exercido e terá que vender suas ações pelo preço do strike, deixando de participar da alta excedente.
* **Proteção Limitada:** O prêmio recebido protege apenas uma pequena queda. Em quedas bruscas do mercado, o prejuízo na ação será maior que o lucro da opção.