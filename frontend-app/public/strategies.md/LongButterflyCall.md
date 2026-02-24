# Estratégias Quantitativas: Long Butterfly (Call)

A **Borboleta de Call** é uma estratégia de custo limitado e risco definido que busca lucrar com a baixa movimentação de um ativo. Ela é essencialmente a combinação de uma Trava de Alta com uma Trava de Baixa que compartilham o mesmo strike central.



## 🟢 Quando utilizar?
* **Visão de Mercado:** Neutra.
* **Cenário Ideal:** O investidor acredita que o ativo estará muito próximo de um preço alvo (Strike K2) na data do vencimento.
* **Vantagem:** O custo de montagem costuma ser muito baixo em relação ao lucro potencial (ROI elevado).

## 🛠 Como é montada?
1.  **Compra 1 Call** (Asa Inferior - K1)
2.  **Vende 2 Calls** (Miolo/Corpo - K2)
3.  **Compra 1 Call** (Asa Superior - K3)
*Onde a distância entre K1-K2 deve ser igual a K2-K3.*

## 📈 Dinâmica de Lucro e Prejuízo
* **Lucro Máximo:** (K2 - K1) - Custo Pago. Ocorre se o ativo expirar exatamente no preço do strike vendido (K2).
* **Prejuízo Máximo:** Limitado ao **Custo Líquido Pago** (Débito). Ocorre se o ativo estiver abaixo de K1 ou acima de K3.
* **Pontos de Equilíbrio (BE):** K1 + Custo e K3 - Custo.

## 🧠 Comportamento das Gregas
* **Delta Neutro:** Próximo ao miolo, a posição não sofre muito com pequenas variações de preço.
* **Theta Positivo:** A passagem do tempo favorece o investidor, especialmente quando o preço está perto do strike central.
* **Gamma Negativo:** Próximo ao miolo, grandes movimentos rápidos do ativo prejudicam a estratégia.

## ⚠️ Riscos e Observações
* **Pin Risk:** Se o ativo estiver muito perto do strike K2 no dia do vencimento, há o risco de você ser exercido em apenas uma parte da perna vendida, o que pode gerar uma posição direcional indesejada na abertura do dia seguinte.
* **Liquidez:** Como envolve três pernas, a execução pode ser mais difícil em ativos com pouco volume.