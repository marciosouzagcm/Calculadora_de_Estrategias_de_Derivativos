# 📘 Documentação Técnica: Motor Quantitativo TradingPro Brasil

**Versão:** 2026.1  
**Status:** Homologado (Full Stack Integrado)  
**Base de Cálculo:** Black-Scholes-Merton (Base 252 - Dias Úteis B3)

---

## 1. Visão Geral do Ecossistema
O motor da **TradingPro Brasil** é uma solução fim-a-fim para análise de derivativos. Ele transforma dados brutos da B3 e cotações em tempo real em inteligência de execução através de seis camadas de processamento.



## 2. Camada de Ingestão Real-Time (`MarketDataService`)

O sistema utiliza a API Brapi para fornecer o preço **Spot** (Ativo-Objeto) necessário para todos os cálculos de Gregas e PnL.

* **Endpoint:** `https://brapi.dev/api/quote/`
* **Segurança:** Implementação de *Timeouts* de 5s para evitar travamentos em ambientes Serverless (Vercel).
* **Tratamento de Dados:** Normalização de strings (trim/uppercase) e validação de tipos numéricos para prevenir erros de cálculo no `d1`.
* **Volatilidade (IV):** Atualmente operando com *fallback* técnico de 35% (0.35), parametrizado para evolução futura em direção à Volatilidade Implícita dinâmica.

---

## 3. Inteligência de Saneamento e Auditoria (`StrategyService`)

O módulo **Vigilante V2** atua na sanitização dos dados antes que cheguem ao frontend:

### 3.1. Correção de Escala de Strikes
Ajuste automático para inconsistências de escala comuns em feeds de dados:
- **Strikes Deflacionados:** Se $K < (Spot \times 0.05) \rightarrow K = K \times 100$.
- **Strikes Inflados:** Se $K > (Spot \times 10) \rightarrow K = K / 100$.

### 3.2. Validação de Monotonicidade
O sistema descarta estratégias com "Arbitragem Suja" (ex: Calls com strike menor custando menos que strikes maiores), garantindo que apenas oportunidades reais sejam exibidas no Scanner.

---

## 4. Motor Matemático (Black-Scholes Base 252)

O núcleo de cálculo (`BlackScholes.ts`) processa o modelo clássico adaptado para feriados nacionais.

### 4.1. As 5 Gregas Primárias
| Grega | Definição Matemática | Aplicação Prática |
| :--- | :--- | :--- |
| **Delta ($\Delta$)** | $N(d_1)$ | Exposição direcional em R$ |
| **Gamma ($\Gamma$)** | $N'(d_1) / (S\sigma\sqrt{t})$ | Risco de aceleração da posição |
| **Theta ($\Theta$)** | Derivada em relação a $t$ | Perda de valor por **Dia Útil** |
| **Vega ($\nu$)** | $SN'(d_1)\sqrt{t}$ | Impacto de 1% na Volatilidade |
| **Rho ($\rho$)** | Derivada em relação a $r$ | Sensibilidade à Taxa Selic |



### 4.2. Normalização de Tempo
O motor utiliza a divisão por 252 dias úteis, garantindo que o decaimento temporal (Theta) não ocorra de forma artificial durante o fechamento do mercado (finais de semana).

---

## 5. Fábrica de Estratégias e Reconhecimento (`StrategyFactory`)

O sistema identifica a morfologia das operações através da análise das pernas:
- **n=1:** Estratégias Cobertas (Income/Hedge).
- **n=2:** Travas (Bull/Bear), Calendários (Séries Dif.), Straddles/Strangles (Mixed).
- **n=3:** Butterfly Spreads.
- **n=4:** Iron Condors e Box Spreads (Arbitragem Financeira).

---

## 6. Motor de Visualização de Risco (`PayoffChart`)

Renderização geométrica do PnL no vencimento baseada em simulação discreta de 81 pontos.

### 6.1. Algoritmo de Breakeven
Identificação dos pontos de equilíbrio através de **Interpolação Linear**:
$$BE = P_1 + (0 - L_1) \times \frac{P_2 - P_1}{L_2 - L_1}$$

### 6.2. Visualização Financeira Líquida
Diferente de calculadoras teóricas, o gráfico da TradingPro já desconta as **taxas de corretagem e emolumentos** (`taxasIdaVolta`), exibindo o lucro real de bolso para o trader.



---
## 7. Arsenal de 23 Estratégias Homologadas
O Scanner processa e valida: Spreads Verticais, Calendários, Diagonais, Ratios, Iron Condors, Box Spreads, Borboletas (Long/Short) e Lançamentos Cobertos.

---
*Documento de Propriedade Técnica da TradingPro Brasil. 2026.*