# Estratégias Quantitativas: Butterfly (Borboleta) com Calls

A **Borboleta** é uma estratégia neutra de risco limitado e custo muito baixo. Ela é excelente para cenários onde você acredita que uma ação ficará "parada" em torno de um preço específico até o vencimento.



## 🟢 Quando utilizar?
* **Visão de Mercado:** Neutra.
* **Cenário Ideal:** Baixa volatilidade. Você espera que o ativo consolide em um preço alvo (o strike central).
* **Vantagem:** Possui uma das melhores relações risco-retorno do mercado. Você arrisca pouco para ganhar potencialmente muito.

## 🛠 Como é montada?
Utiliza 3 strikes diferentes (K1, K2, K3) com a mesma distância entre eles:
1.  **Compra 1 Call** no strike inferior (K1).
2.  **Vende 2 Calls** no strike central (K2).
3.  **Compra 1 Call** no strike superior (K3).

## 📈 Dinâmica de Lucro e Prejuízo
* **Lucro Máximo:** (K2 - K1) - Custo Pago. Ocorre se o ativo expirar exatamente em K2.
* **Prejuízo Máximo:** Limitado ao **Custo Pago** na montagem. Ocorre se o ativo estiver abaixo de K1 ou acima de K3.
* **Pontos de Equilíbrio (Break-evens):** Existem dois: K1 + Custo e K3 - Custo.

## 🧠 Comportamento das Gregas
* **Delta Neutro:** No início, a posição não se move com pequenas variações do ativo.
* **Theta Positivo:** O passar do tempo é o melhor amigo da Borboleta, desde que o preço esteja perto do miolo (K2).
* **Vega Negativo:** A estratégia se beneficia da queda da volatilidade implícita.

## ⚠️ Riscos e Observações
* **Probabilidade:** Embora o retorno seja alto, a chance de o ativo parar exatamente no miolo é pequena. É comum encerrar a operação quando ela atinge 50% ou 80% do lucro máximo.
* **Custos Operacionais:** Envolve 4 opções (1+2+1), portanto as taxas de execução devem ser monitoradas de perto pelo scanner.