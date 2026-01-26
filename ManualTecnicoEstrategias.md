# 📘 Manual Técnico de Engenharia Financeira: BoardPRO Intelligence
**Versão:** 2026.1  
**Classificação:** Institucional / Restrito  
**Motor de Cálculo:** BSM-252 High-Frequency Engine  
**Última Atualização:** 26/01/2026

---

## 1. Introdução e Arquitetura do Sistema
Este manual detalha a modelagem matemática e as diretrizes operacionais das 23 estratégias de derivativos integradas ao ecossistema **BoardPRO**. Diferente de materiais educativos comuns, este documento foca na **Dinâmica das Gregas**, na **Gestão de Margem** e no **Decaimento Temporal (Theta)**, servindo como especificação técnica para o scanner de oportunidades e para a geração de relatórios de risco.

---

## 2. Estratégias de Direção e Spread (Vertical Spreads)

### 2.1 Bull Call Spread (Trava de Alta com Call)
* **Nome Técnico:** `LongCallVerticalSpread`
* **Modelagem:** Compra de Call $C(K_1)$ e Venda de Call $C(K_2)$, onde $K_1 < K_2$.
* **Dinâmica das Gregas:**
    * **Delta:** Positivo (Máximo quando o preço do ativo está entre os strikes).
    * **Theta:** Evolui de negativo para positivo à medida que o ativo ultrapassa o $K_2$.
    * **Vega:** Longo (se beneficia de alta na IV), mas mitigado pela ponta vendida.
* **Visão Quantitativa:** Otimiza a relação Risco/Retorno ao limitar o custo de carregamento. O lucro é maximizado quando o ativo objeto atinge o *Strike* da ponta vendida no vencimento, capturando a convergência do valor extrínseco.
* **Risco de Cauda:** Exposição máxima limitada ao prêmio líquido pago (Net Debit).

### 2.2 Bear Call Spread (Trava de Baixa com Call / Credit Spread)
* **Nome Técnico:** `ShortCallVerticalSpread`
* **Modelagem:** Venda de Call $C(K_1)$ e Compra de Call $C(K_2)$ (Asa de Proteção), onde $K_1 < K_2$.
* **Visão de Risco Institucional:** Estratégia de **Venda de Volatilidade**.
* **Gestão de Delta:** Delta Negativo. A estratégia lucra com a erosão do valor tempo das opções vendidas.
* **Análise de Margem:** Exige garantia reduzida devido à trava de proteção, ideal para gestão de capital eficiente (Portfolio Margin).
* **Uso Recomendado:** Cenários de resistência técnica e volatilidade implícita (IV) em níveis de sobrecompra (Mean Reversion).

### 2.3 Bull Put Spread (Trava de Alta com Put)
* **Nome Técnico:** `ShortPutVerticalSpread`
* **Arquitetura:** Venda de Put $P(K_1)$ e Compra de Put $P(K_2)$, onde $K_1 > K_2$.
* **Fator de Lucratividade:** **Theta Positivo**. É uma operação "vendedora de tempo".
* **Perfil de Fluxo:** Crédito Imediato (Net Credit).
* **Visão de Mercado:** Altista a Neutro. Excelente para zonas de suporte macroeconômico. Se o ativo permanecer acima de $K_1$, o investidor retém 100% do prêmio, explorando o *Skew* de volatilidade das Puts.

### 2.4 Bear Put Spread (Trava de Baixa com Put)
* **Nome Técnico:** `LongPutVerticalSpread`
* **Modelagem:** Compra de Put $P(K_1)$ e Venda de Put $P(K_2)$, onde $K_1 > K_2$.
* **Objetivo:** Hedge direcional com custo financiado.
* **Comportamento de Gamma:** Aumenta conforme o preço cai em direção ao $K_1$, acelerando os ganhos em movimentos de *Sell-off*.
* **Análise de Custo:** O prêmio recebido pela venda da Put $K_2$ reduz o *Breakeven* da operação, tornando a proteção mais barata que a compra a seco (Long Put).

---

## 3. Estratégias de Volatilidade e Neutralidade (Market Neutral)

### 3.1 Iron Condor (Vendido)
* **Nome Técnico:** `ShortIronCondor`
* **Configuração:** Combinação de um *Bear Call Spread* OTM e um *Bull Put Spread* OTM.
* **Tese de Investimento:** **Double Credit Generation**. O investidor aposta que o ativo expirará dentro de um intervalo (Range) definido.
* **Análise de Gregas:**
    * **Delta:** Próximo a zero (Delta Neutral).
    * **Theta:** Positivo (O melhor cenário é a passagem do tempo sem movimento).
    * **Vega:** Negativo (Lucra com a queda da volatilidade implícita após eventos de estresse).
* **Controle de Risco:** O risco é estritamente limitado à largura das "asas" menos o crédito total recebido.

### 3.2 Butterfly (Borboleta de Call)
* **Nome Técnico:** `LongCallButterfly`
* **Configuração:** Compra 1 Call $K_1$, Vende 2 Calls $K_2$ (ATM) e Compra 1 Call $K_3$.
* **Precisão Cirúrgica:** Estratégia de baixo custo e alta convexidade. O lucro máximo ocorre se o ativo expirar exatamente no $K_2$.
* **Perfil de Risco:** Relação Risco/Retorno frequentemente superior a 1:5. Indicada para momentos de consolidação extrema ou "Pinning" de vencimento.

---

## 4. Estratégias Temporais e de Arbitragem

### 4.1 Calendar Spread (Trava de Calendário / Horizontal)
* **Modelagem:** Venda de opção de curto prazo e compra de opção de longo prazo no mesmo strike.
* **Exploração de Theta:** Lucra com a diferença de decaimento temporal entre as séries. Opções curtas perdem valor mais rápido que as longas.
* **Risco de Vega:** Altamente sensível a mudanças na curva de volatilidade futura.

---

## 5. Glossário de Métricas Quantitativas (Padrão BoardPRO)

| Métrica | Definição Técnica | Aplicação no Scanner |
| :--- | :--- | :--- |
| **Probability of Profit (PoP)** | Probabilidade estatística de a operação resultar em lucro > $0. | Filtro de seleção de setups de alta probabilidade. |
| **Expected Value (EV)** | Média ponderada de todos os resultados possíveis baseada em simulações de Monte Carlo. | Define o valor teórico justo da estratégia. |
| **Gamma Risk** | Sensibilidade do Delta a movimentos bruscos do ativo objeto. | Alerta para riscos de "explosão" de posição perto do vencimento. |
| **Buying Power Reduction** | Impacto real na margem de garantia exigida pela B3/Corretora. | Gestão de liquidez do portfólio. |

---

## 6. Governança e Modelagem de Estresse
As estratégias aqui detalhadas são monitoradas pelo **Vigilante V2**, que executa testes de estresse automatizados (Shock Tests) de +/- 10% no ativo objeto e +/- 5% na Volatilidade Implícita para prever o comportamento da carteira em cenários de *Black Swan*.

**Aviso Legal:** O uso deste manual pressupõe conhecimento avançado de derivativos. A BoardPRO Intelligence não se responsabiliza por decisões tomadas com base em interpretações errôneas da modelagem matemática aqui exposta.