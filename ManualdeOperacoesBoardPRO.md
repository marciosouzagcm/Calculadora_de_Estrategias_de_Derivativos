📘 Manual de Operação: Trading Board PRO


Este manual descreve a lógica quantitativa e as diretrizes de segurança aplicadas ao motor de análise de opções. O foco principal é o Gerenciamento de Risco Rigoroso.

1. Configurações de Entrada (Input)
Para uma análise precisa, o usuário deve definir quatro parâmetros fundamentais:

ATIVO: O ticker da ação ou ETF (ex: BOVA11).

SPOT: O preço atual da ação no mercado.

LOTE: A quantidade de contratos (padrão: 1000).

FILTRO RISCO: O custo ou margem máxima aceitável por ação. (Padrão: 0.30).

2. A Lógica do "Vigilante" (Filtro de Risco)
O sistema aplica uma validação binária baseada na eficiência do capital:

✅ DENTRO DO FILTRO (OK): O risco real da operação (prejuízo máximo + taxas) dividido pelo lote é menor ou igual ao seu Filtro de Risco. Indica uma operação barata em relação ao potencial de lucro.

❌ FORA DO FILTRO (ALTO RISCO): O custo ou risco unitário excede o seu limite. Mesmo que o ROI seja alto, o sistema alerta para a exposição excessiva do patrimônio.

3. Inteligência de Estratégias (Cálculo de Largura)
A. Operações de Débito (Compra de Direção/Volatilidade)
Travas Simples (2 Pernas): Risco é o custo total da montagem.

Borboletas (3 Pernas): O lucro é limitado à largura de apenas uma asa (distância entre o strike inferior e o médio). O sistema agora ignora a largura total para evitar lucros inflados.

Alvo 0 a 0: Preço unitário necessário na venda para cobrir o prêmio pago + taxas de ida e volta.

B. Operações de Crédito (Venda de Volatilidade/Tempo)
Travas de Crédito (2 Pernas): O risco é a largura entre strikes menos o crédito recebido.

Iron Condor (4 Pernas): O risco real é calculado sobre a maior asa (Put ou Call) e não sobre a soma de ambas. Isso reflete a margem real exigida, pois o mercado só pode "atropelar" um lado por vez.

ROI Real: Calculado dividindo o crédito líquido pelo risco de margem da maior asa.

4. Regras de Segurança Integradas (Anti-Quebra)
[!IMPORTANT] Venda Descoberta (Short Strangle/Straddle): O sistema identifica automaticamente a ausência de travas de proteção (temCompra === false). Nesses casos, ele aplica um Risco Sintético de 20% do Spot (Margem B3). Isso garante que vendas a seco sempre apareçam como FORA DO FILTRO, impedindo a exposição a prejuízos ilimitados.

[!NOTE] Cálculo de Taxas: O sistema provisiona R$ 22,00 por perna na entrada e R$ 22,00 na saída.

2 Pernas: R$ 88,00 total.

3 Pernas: R$ 132,00 total.

4 Pernas: R$ 176,00 total.

5. Fluxo de Trabalho Recomendado
Escanear: Insira o ticker e execute o scanner.

Ranking por ROI: O sistema ordena automaticamente as operações que entregam mais lucro por cada real arriscado.

Validar Filtro: Priorize operações marcadas como OK. Se uma operação estiver "FORA DO FILTRO", avalie se o aumento do lote (ex: de 100 para 1000) dilui as taxas o suficiente para torná-la viável.

Alvo Estratégico: Utilize o valor "Para empatar o ciclo" como sua ordem de saída (Take Profit) mínima.

6. Glossário de Métricas
ROI Real: Lucro Líquido (após todas as taxas) dividido pelo Risco Total (Margem ou Débito).

Risco Unitário: O prejuízo máximo real distribuído por cada ação do lote.

Montagem Líquida: O saldo financeiro imediato na conta (Negativo para Débito, Positivo para Crédito).

Este manual garante que a disciplina matemática prevaleça sobre a emoção do trade.