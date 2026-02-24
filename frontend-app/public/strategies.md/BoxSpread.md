# Estratégias Quantitativas: Box Spread (Arbitragem Sintética)

O **Box Spread** é uma estratégia avançada de quatro pontas que combina uma **Trava de Alta com Call** e uma **Trava de Baixa com Put**, ambas utilizando os mesmos strikes e o mesmo vencimento.



## 🟢 Quando utilizar?
* **Objetivo:** Arbitragem financeira ou captação/empréstimo de recursos.
* **Cenário Ideal:** Quando o custo total da montagem das quatro pernas é significativamente inferior à diferença entre os strikes (largura).
* **Visão de Mercado:** Neutra. O resultado final não depende de o ativo subir ou cair.

## 🛠 Como é montada?
A montagem exige 4 opções da mesma série:
1.  **Compra Call** K1 (Strike baixo).
2.  **Venda Call** K2 (Strike alto).
3.  **Compra Put** K2 (Strike alto).
4.  **Venda Put** K1 (Strike baixo).

## 📈 Dinâmica de Lucro e Prejuízo
* **Lucro Fixo:** Independente do preço do ativo no vencimento, o valor da operação no dia final será sempre a **Largura dos Strikes**. O lucro real é: `Largura - Custo Inicial`.
* **Risco:** Praticamente inexistente do ponto de vista direcional. O risco principal é a liquidez (dificuldade em montar/desmontar as 4 pernas simultaneamente) e o custo de corretagem superando o lucro da arbitragem.

## 🧠 Comportamento das Gregas
* **Delta Neutro:** A posição não sofre impacto com a variação do preço do ativo.
* **Theta/Vega Neutros:** Por ser uma estrutura fechada e sintética, as variações de tempo e volatilidade nas Calls tendem a ser anuladas pelas Puts.

## ⚠️ Riscos e Observações (Mercado Brasileiro)
* **Custo de Transação:** Como envolve 4 pernas, as taxas da B3 e corretagem podem consumir o lucro da arbitragem. O scanner já deve considerar taxas para uma análise real.
* **Exercício Antecipado:** Em opções de estilo Americano (comum em Calls na B3), existe um pequeno risco de exercício antecipado que pode desmembrar a estratégia. Prefira montar com opções de estilo Europeu quando disponível.
* **Equivalência à Renda Fixa:** Montar um Box Spread de débito é equivalente a aplicar dinheiro a uma taxa fixa. Montar um Box de crédito é equivalente a tomar um empréstimo.