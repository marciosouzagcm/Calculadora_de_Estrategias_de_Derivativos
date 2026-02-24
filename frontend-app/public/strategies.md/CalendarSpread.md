# Estratégias Quantitativas: Calendar Spread (Trava de Linha)

O **Calendar Spread**, conhecido no Brasil como **Trava de Linha**, é uma estratégia que utiliza o fator "tempo" como principal motor de lucro. Em vez de apostar na direção do preço, você aposta que a velocidade de desvalorização das opções será diferente entre os meses.



## 🟢 Quando utilizar?
* **Visão de Mercado:** Neutra.
* **Cenário Ideal:** Baixa volatilidade ou expectativa de que o ativo fique parado ao redor do strike escolhido até o primeiro vencimento.
* **Vantagem:** O risco é limitado ao valor pago, mas o potencial de ganho é maximizado pela aceleração do *Theta* (decaimento temporal) na opção curta.

## 🛠 Como é montada?
Utiliza duas opções de **mesmo strike** e **mesmo tipo** (Call ou Put):
1.  **Venda de uma Opção** para o vencimento próximo (Ex: Série E).
2.  **Compra de uma Opção** para o vencimento seguinte (Ex: Série F).

## 📈 Dinâmica de Lucro e Prejuízo
* **Lucro Máximo:** Ocorre se o ativo fechar exatamente no strike no dia do vencimento da opção curta. Nesse ponto, a opção vendida vira pó e a opção longa retém o máximo de valor extrínseco.
* **Prejuízo Máximo:** Limitado ao **Débito Pago** para montar a trava. Ocorre se o ativo subir ou cair demais, tirando ambas as opções do jogo.
* **Vega Positivo:** Um aumento na volatilidade implícita beneficia a estratégia, pois a opção longa (comprada) valoriza mais que a curta.

## 🧠 Comportamento das Gregas
* **Theta Positivo:** Esta é a "alma" da estratégia. Você ganha dinheiro com a passagem dos dias.
* **Vega Positivo:** Você quer que a volatilidade suba, especialmente a volatilidade do mês longo.
* **Gamma Neutro/Baixo:** A posição é menos sensível a pequenos movimentos do ativo do que travas verticais.

## ⚠️ Riscos e Observações
* **Rolagem:** Muitos investidores usam o lucro da curta para "rolar" a posição, vendendo o mês seguinte e mantendo a ponta longa, reduzindo o custo médio da operação sucessivamente.
* **Estimativa de Lucro:** Diferente de travas verticais, o lucro máximo de uma trava de linha não é exato, pois depende de quanto o mercado estará pagando pela opção longa no futuro. Nosso scanner utiliza uma estimativa conservadora baseada no prêmio pago.