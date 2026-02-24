# Estratégias Quantitativas: Long Call Diagonal (Diagonal de Alta)

A **Diagonal de Alta** é frequentemente chamada de "Lançamento Coberto de Pobre" (*Poor Man's Covered Call*). Em vez de comprar 100 ações para vender uma Call, você compra uma Call de longo prazo (LEAPS) para servir como garantia.



## 🟢 Quando utilizar?
* **Visão de Mercado:** Altista a longo prazo, mas Neutra/Estável a curto prazo.
* **Cenário Ideal:** O investidor quer rentabilizar um capital menor do que o necessário para comprar a ação cheia.
* **Vantagem:** O custo de capital é drasticamente menor, o que pode gerar ROIs percentuais muito mais altos que o lançamento coberto comum.

## 🛠 Como é montada?
1.  **Compra uma Call ITM ou ATM** com vencimento longo (Ex: 60 ou 90 dias+).
2.  **Venda uma Call OTM** com vencimento curto (Ex: 30 dias).
*A ideia é que a Call curta vire pó, enquanto a Call longa retém seu valor.*

## 📈 Dinâmica de Lucro e Prejuízo
* **Lucro Máximo:** Ocorre se o ativo fechar exatamente no strike da Call curta no seu vencimento. O lucro é a valorização da Call longa + o prêmio recebido da curta.
* **Prejuízo Máximo:** Limitado ao **Débito Pago** para montar a trava.
* **Ponto de Equilíbrio (BE):** Aproximadamente o `Strike da Longa + Débito Pago`.

## 🧠 Comportamento das Gregas
* **Theta Positivo:** Você ganha dinheiro com a passagem do tempo porque a Call de curto prazo (curta) desvaloriza mais rápido que a de longo prazo (longa).
* **Vega Positivo:** Um aumento na volatilidade geralmente ajuda a estratégia, pois a Call longa é mais sensível ao Vega.
* **Delta Positivo:** A posição ainda se beneficia da alta do ativo subjacente.

## ⚠️ Riscos e Observações
* **Rolagem:** A beleza desta estratégia é que, se a Call curta expirar sem valor, você pode vender outra Call para o mês seguinte contra a mesma Call longa, reduzindo seu custo até que ele chegue a zero.
* **Risco de Exercício:** Se o ativo disparar muito acima do strike curto, você pode ser obrigado a encerrar a posição. Certifique-se de que a largura dos strikes (K2 - K1) seja maior que o débito pago para evitar prejuízo em altas explosivas.