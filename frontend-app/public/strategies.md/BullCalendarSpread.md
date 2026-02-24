# Estratégias Quantitativas: Bull Calendar Spread (Calendário de Calls)

O **Bull Calendar Spread** é uma estratégia de tempo e volatilidade com viés de alta. Ela se diferencia de uma trava comum por utilizar dois meses de vencimento diferentes, focando na aceleração da perda de valor das opções curtas.



## 🟢 Quando utilizar?
* **Visão de Mercado:** Moderadamente Altista.
* **Cenário Ideal:** Você acredita que o ativo subirá até um certo nível (o Strike) e ficará "parado" ao redor dele até o primeiro vencimento.
* **Vantagem:** O custo é menor do que comprar uma Call de longo prazo a seco.

## 🛠 Como é montada?
Utiliza duas Calls com o **mesmo Strike** (escolhido acima do preço atual do ativo - OTM):
1.  **Compra de uma Call** para o vencimento distante (Ex: série de Junho).
2.  **Venda de uma Call** para o vencimento próximo (Ex: série de Maio).

## 📈 Dinâmica de Lucro e Prejuízo
* **Lucro Máximo:** Atingido se o preço do ativo estiver exatamente no strike no dia do vencimento da opção curta. Nesse cenário, a opção vendida expira sem valor e a opção comprada ainda possui valor de mercado significativo.
* **Prejuízo Máximo:** Limitado ao **Débito Pago** (Custo Líquido) na montagem.
* **Ponto de Equilíbrio:** Devido à natureza multi-temporal, os break-evens são zonas de preço ao redor do strike, influenciadas pela volatilidade.

## 🧠 Comportamento das Gregas
* **Theta Positivo:** A principal fonte de lucro. A opção vendida (curta) "derrete" mais rápido que a comprada (longa).
* **Vega Positivo:** A posição beneficia-se se a volatilidade implícita do ativo aumentar, especialmente no vencimento longo.
* **Delta Positivo:** Beneficia-se da alta do ativo até o strike escolhido.

## ⚠️ Riscos e Observações
* **Movimentos Explosivos:** Se o ativo subir demais e passar muito do strike rapidamente, a estratégia pode perder eficácia ou entrar em prejuízo, pois a opção curta começa a ganhar valor intrínseco muito rápido.
* **Valor Residual:** O lucro real depende de quanto o mercado pagará pela opção longa quando a curta expirar. Nosso scanner estima esse valor em 85% do prêmio atual para segurança do usuário.