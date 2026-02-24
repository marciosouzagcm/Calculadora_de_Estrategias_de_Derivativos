# Estratégias Quantitativas: Long Strangle

O **Long Strangle** é uma estratégia de volatilidade "custo-benefício". Assim como o Straddle, você ganha se o mercado se mover forte, mas paga menos para montar a posição ao escolher strikes fora do dinheiro.



## 🟢 Quando utilizar?
* **Visão de Mercado:** Explosão de Volatilidade.
* **Cenário Ideal:** O mercado está excessivamente calmo (baixa vol implícita) e você antecipa um evento que causará um movimento violento, mas não tem certeza da direção.
* **Vantagem:** Custo de montagem muito inferior ao Straddle, permitindo gerenciar melhor o capital em várias operações.

## 🛠 Como é montada?
1.  **Compra 1 Put OTM** (Strike abaixo do preço atual).
2.  **Compra 1 Call OTM** (Strike acima do preço atual).
*Ambas com o mesmo vencimento.*

## 📈 Dinâmica de Lucro e Prejuízo
* **Lucro Máximo:** Teoricamente ilimitado em ambas as direções (após romper os breakevens).
* **Prejuízo Máximo:** Limitado ao **Débito Pago**. Ocorre se o ativo expirar **entre** os dois strikes escolhidos.
* **Pontos de Equilíbrio (BE):** * `Strike da Call + Custo Total` (Lado da Alta)
    * `Strike da Put - Custo Total` (Lado da Baixa)

## 🧠 Comportamento das Gregas
* **Theta Negativo:** O tempo é corrosivo. Se o ativo não se mover logo, a perda de valor extrínseco destruirá o prêmio pago.
* **Vega Positivo:** Você se beneficia muito de um aumento na volatilidade. Às vezes, o lucro vem apenas do aumento do "medo" no mercado, mesmo sem o preço ter atingido os breakevens.
* **Gamma:** Menor que o do Straddle, o que significa que o lucro demora um pouco mais para acelerar conforme o preço se move.

## ⚠️ Riscos e Observações
* **A distância importa:** Quanto mais longe (OTM) forem os strikes, menor o custo, mas menor a probabilidade de lucro (POP).
* **Vencimento:** Recomenda-se montar com pelo menos 30-45 dias para o vencimento, evitando a aceleração do decaimento temporal final.