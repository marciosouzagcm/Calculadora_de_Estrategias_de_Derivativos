# Estratégias Quantitativas: Bear Calendar Spread

O **Bear Calendar Spread** (também conhecido como Calendário de Puts) é uma estratégia profissional de derivativos que utiliza a diferença na velocidade de desvalorização temporal (*Time Decay*) entre dois vencimentos distintos.

## 🟢 Quando utilizar?
Esta estratégia é ideal quando você possui uma visão **Moderadamente Baixista** ou **Neutra-Baixista** para o ativo. O objetivo é que o preço do ativo caia até o strike escolhido e permaneça lá até o vencimento da primeira opção.

## 🛠 Como é montada?
A montagem consiste em duas pontas (pernas) com o **mesmo strike**:
1.  **Compra de uma Put** com vencimento mais distante (Longa).
2.  **Venda de uma Put** com vencimento mais próximo (Curta).

## 📈 Dinâmica de Lucro e Prejuízo
* **Lucro Máximo:** Ocorre se o ativo estiver exatamente no preço do Strike na data de vencimento da opção curta. Nesse ponto, a opção vendida vira pó (0,00) e a opção comprada ainda retém um alto valor extrínseco.
* **Prejuízo Máximo:** Limitado ao **Débito Pago** inicialmente na montagem.
* **Ponto de Equilíbrio (Break-even):** Como envolve vencimentos diferentes, os pontos de equilíbrio são estimados baseados na volatilidade implícita.

## 🧠 Comportamento das Gregas
* **Theta Positivo:** Você ganha dinheiro com a passagem do tempo. A opção curta desvaloriza muito mais rápido que a longa.
* **Vega Positivo:** A estratégia beneficia-se de um aumento na volatilidade implícita (especialmente na perna longa).
* **Delta Negativo:** No início da operação, ela possui um viés de baixa.

## ⚠️ Riscos e Observações
* **Risco de Atribuição:** Se o ativo cair muito abaixo do strike, você pode ser exercido na opção curta.
* **Estimativa de Saída:** O lucro total depende do valor residual da Put longa. Nossa plataforma utiliza um modelo de estimativa de 85% do prêmio atual para projeção de lucro máximo no vencimento curto.