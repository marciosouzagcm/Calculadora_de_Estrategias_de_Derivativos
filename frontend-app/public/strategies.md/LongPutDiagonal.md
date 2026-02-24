# Estratégias Quantitativas: Long Put Diagonal (Diagonal de Baixa)

A **Diagonal de Baixa com Puts** é uma estratégia que permite apostar na desvalorização de um ativo enquanto se beneficia do decaimento temporal acelerado das opções de curto prazo.



## 🟢 Quando utilizar?
* **Visão de Mercado:** Baixista a longo prazo ou Neutra-Baixista.
* **Cenário Ideal:** Você espera que o ativo caia gradualmente ou fique estável, mas quer gastar menos do que custaria uma Put longa "seca".
* **Vantagem:** O custo de carregar a posição é reduzido (ou até revertido em lucro temporal) pela venda da Put curta.

## 🛠 Como é montada?
1.  **Compra uma Put ITM** com vencimento longo (Back Month).
2.  **Venda uma Put OTM** com vencimento curto (Front Month).
*Diferença crucial para Call: Aqui o strike da comprada (K1) é MAIOR que o strike da vendida (K2).*

## 📈 Dinâmica de Lucro e Prejuízo
* **Lucro Máximo:** Atingido se o ativo fechar exatamente no strike da Put vendida (K2) no vencimento curto. Você lucra com a valorização da Put ITM e o colapso do valor da Put OTM.
* **Prejuízo Máximo:** Limitado ao **Débito Líquido Pago** na montagem.
* **Ponto de Equilíbrio (BE):** Aproximadamente o `Strike da Longa - Débito Pago`.

## 🧠 Comportamento das Gregas
* **Theta Positivo:** Assim como na diagonal de alta, você ganha com o tempo, pois a opção vendida (perto do vencimento) perde valor mais rápido que a comprada.
* **Delta Negativo:** A posição ganha valor conforme o preço do ativo subjacente cai.
* **Vega Positivo:** Um aumento na volatilidade costuma favorecer a estratégia, pois a Put longa é mais sensível a mudanças na volatilidade implícita.

## ⚠️ Riscos e Observações
* **Risco de Atribuição:** Se o ativo cair demais rapidamente, você pode ser exercido na Put vendida. Nesse caso, você "compra" o ativo pelo strike K2. Geralmente resolve-se exercendo sua própria Put longa (K1) para garantir o lucro da diferença de strikes.
* **Curva de Lucro:** Diferente de uma trava de baixa comum, o lucro não é estático, ele depende da volatilidade no momento do vencimento da perna curta.