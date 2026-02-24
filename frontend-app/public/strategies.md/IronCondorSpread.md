# Estratégias Quantitativas: Iron Condor

O **Iron Condor** é uma estratégia de crédito de quatro pernas que expressa uma visão de mercado neutra. Você ganha se o preço do ativo subjacente permanecer dentro de um intervalo específico até o vencimento.



## 🟢 Quando utilizar?
* **Visão de Mercado:** Neutra (Baixa volatilidade).
* **Cenário Ideal:** O mercado está "andando de lado" (consolidado) e você espera que ele continue assim.
* **Vantagem:** Você recebe um crédito imediato na montagem e tem risco limitado em ambos os lados.

## 🛠 Como é montada?
É a combinação de uma **Trava de Alta com Put** e uma **Trava de Baixa com Call**:
1.  **Compra Put** (Strike bem longe - K1)
2.  **Vende Put** (Strike mais próximo - K2)
3.  **Vende Call** (Strike mais próximo - K3)
4.  **Compra Call** (Strike bem longe - K4)
*Ordem: K1 < K2 < preço atual < K3 < K4*

## 📈 Dinâmica de Lucro e Prejuízo
* **Lucro Máximo:** É o crédito líquido recebido. Ocorre se o ativo fechar entre os strikes vendidos (K2 e K3).
* **Prejuízo Máximo:** (Largura da asa mais larga) - (Crédito recebido). Ocorre se o ativo disparar ou desabar além das asas compradas.
* **Ponto de Equilíbrio (BE):** São dois: `Strike Put Vendida - Crédito` e `Strike Call Vendida + Crédito`.

## 🧠 Comportamento das Gregas
* **Delta Neutro:** A estratégia é desenhada para ser insensível a pequenos movimentos de preço.
* **Theta Positivo:** O decaimento temporal é seu maior aliado. Você quer que as opções vendidas percam valor.
* **Vega Negativo:** Você se beneficia de uma queda na volatilidade implícita (vol crush).

## ⚠️ Riscos e Observações
* **Gerenciamento:** Se o ativo testar um dos seus breakevens, muitos traders "rolam" o lado que não foi testado para coletar mais crédito ou encerram a operação.
* **Margem:** A corretora exigirá margem para cobrir o risco de apenas uma das asas (já que o ativo não pode estar em dois lugares ao mesmo tempo).