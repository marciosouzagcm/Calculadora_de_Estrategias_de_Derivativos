# 📘 Manual de Operação: Trading Board PRO (V38.0)

Este manual descreve a lógica quantitativa, os algoritmos de filtragem e as diretrizes de segurança aplicadas ao motor de análise de opções. O foco absoluto é o **Gerenciamento de Risco Rigoroso** e a **Eficiência Matemática**.

---

## 1. Configurações de Entrada (Input)
Para que o motor **Black-Scholes** e o algoritmo **Vigilante** operem com precisão, defina:

* **ATIVO:** O ticker do ativo-objeto (Ex: PETR4, BOVA11).
* **SPOT:** O preço atual de mercado (ajustado em tempo real pelo sistema).
* **LOTE:** A quantidade de contratos (padrão: 1000). O tamanho do lote é crucial para a diluição das taxas fixas.
* **FILTRO RISCO:** O custo ou margem máxima aceitável por ação (Ex: 0.30). Este é o seu "limite de dor" financeiro.
* **TAXA/PERNA:** Provisão para custos operacionais (Padrão: R$ 22,00).

---

## 2. A Lógica do "Vigilante" (Filtro de Eficiência)
O sistema aplica uma validação estocástica baseada na relação **Risco/Retorno**:

* ✅ **DENTRO DO FILTRO (OK):** O risco real da operação (Prejuízo Máximo + Taxas totais) dividido pelo lote é $\le$ ao seu Filtro de Risco. Indica uma operação com assimetria favorável.
* ❌ **FORA DO FILTRO (ALTO RISCO):** O risco unitário excede o limite definido. O sistema emite um alerta de exposição excessiva, mesmo que o ROI pareça atraente.

---

## 3. Inteligência de Estratégias & Margem

### A. Operações de Débito (Direção e Volatilidade)
* **Travas e Borboletas:** O lucro é limitado à largura das "asas". O sistema calcula a distância entre os strikes e desconta automaticamente o prêmio pago e as taxas de "ida e volta".
* **Alvo 0 a 0 (Break-even):** O sistema gera o preço exato de saída necessário para cobrir 100% dos custos operacionais, garantindo que o trader saiba seu ponto de "empate" real.

### B. Operações de Crédito (Venda de Tempo/Theta)
* **Iron Condor (4 Pernas):** O risco real é calculado sobre a **maior asa** (Put ou Call). Refletindo a regra de margem institucional, o sistema entende que o mercado não pode atingir os dois lados simultaneamente.
* **ROI Real:** Calculado dividindo o crédito líquido recebido pelo risco de margem da perna mais exposta.

---

## 4. Regras de Segurança "Anti-Quebra" (Black-Box)

> **[IMPORTANTE] Venda Descoberta (Naked):** O sistema identifica automaticamente operações sem trava (Short Strangle/Straddle). Nesses casos, o motor aplica um **Risco Sintético de 20% do Spot** (modelo de stress B3). Isso força essas operações para o status **FORA DO FILTRO**, protegendo o usuário de prejuízos ilimitados.

> **[NOTA] Provisão de Taxas (Fricção):** O sistema provisiona custos de entrada e saída.
> * **2 Pernas:** R$ 88,00 | **3 Pernas:** R$ 132,00 | **4 Pernas:** R$ 176,00.

---

## 5. Fluxo de Trabalho Quantitativo

1.  **Scanner:** Execute a varredura para identificar oportunidades no ativo selecionado.
2.  **Ranking de ROI:** Observe as operações no topo da lista; elas possuem o melhor aproveitamento de capital por real arriscado.
3.  **Análise de Gregas:** Verifique o **Delta da Posição** (exposição direcional) e o **Theta** (ganho por passagem de tempo).
4.  **Exportação PDF:** Gere o relatório para auditoria pessoal ou envio para clientes. O PDF incluirá o **Risco Unitário** e o gráfico de Payoff.

---

## 6. Glossário de Métricas Elite

* **ROI Líquido:** Lucro máximo após todas as taxas dividido pelo capital em risco.
* **Risco Unitário:** O prejuízo máximo real (financeiro + taxas) distribuído por cada unidade do lote.
* **Greeks ($\Delta, \Gamma, \Theta, \nu$):** Sensibilidade da posição à variação do preço, tempo e volatilidade.
* **Base 252:** Normalização do tempo baseada em dias úteis brasileiros para cálculo preciso de opções.

---
**© 2026 BoardPRO Engenharia** - *Este manual garante que a disciplina matemática prevaleça sobre a emoção do trade.*