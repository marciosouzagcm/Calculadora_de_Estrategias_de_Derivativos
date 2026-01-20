/**
 * Helper: Gera a string de exibição para as pernas da estratégia.
 * Mantido fora da classe por ser uma utilidade de formatação.
 */
function generateDisplay(leg, direction, strike) {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'COMPRA' ? '[C]' : '[V]';
    return `${action} ${leg.option_ticker} (${typeInitial}) K:${strike.toFixed(2)}`;
}
/**
 * CLASSE: BearCallSpread (Trava de Baixa com Call)
 * FUNCIONALIDADE: Identifica oportunidades onde se vende uma CALL e compra-se outra CALL
 * de strike superior para limitar o risco, recebendo um crédito líquido (Net Credit).
 */
export class BearCallSpread {
    constructor() {
        this.name = 'Trava de Baixa (Call)';
        this.marketView = 'BAIXA';
    }
    /**
     * Scanner principal: Itera sobre todas as opções do ativo para encontrar
     * combinações que atendam aos critérios de uma Trava de Baixa.
     */
    calculateMetrics(allOptions, assetPrice, feePerLeg) {
        const results = [];
        // 1. Filtro Inicial: Apenas CALLS com strike válido, ordenadas por strike (ascendente)
        const calls = allOptions
            .filter(leg => leg.tipo === 'CALL' && leg.strike > 0 && leg.premio > 0)
            .sort((a, b) => a.strike - b.strike);
        if (calls.length < 2)
            return [];
        // 2. Scanner de Combinações (O(n²))
        for (let i = 0; i < calls.length; i++) {
            for (let j = i + 1; j < calls.length; j++) {
                const k1Short = calls[i]; // Strike Menor = Vendida (Mais ITM/ATM)
                const k2Long = calls[j]; // Strike Maior = Comprada (Mais OTM)
                // Validação de Vencimento: Precisam ser da mesma série
                if (k1Short.vencimento !== k2Long.vencimento)
                    continue;
                // --- Cálculo Financeiro Bruto ---
                const width = k2Long.strike - k1Short.strike;
                const netPremium = k1Short.premio - k2Long.premio;
                /**
                 * FILTROS DE SANIDADE (Boas Práticas de Mercado):
                 * 1. Crédito Mínimo: Ignora travas que pagam menos de R$ 0.02 (pó ou sem liquidez).
                 * 2. Relação Risco/Retorno: Se o prêmio for > 90% da largura, os dados de book
                 * provavelmente estão defasados ou sem liquidez (ROI "infinito" falso).
                 */
                if (netPremium <= 0.02 || netPremium >= (width * 0.90))
                    continue;
                const maxProfit = netPremium;
                const maxLoss = width - netPremium;
                const roi = maxLoss > 0 ? (maxProfit / maxLoss) : 0;
                const breakeven = k1Short.strike + netPremium;
                // --- Cálculo das Gregas da Posição ---
                // Nota: Gregas vendidas invertem o sinal.
                const greeks = {
                    delta: (k1Short.gregas_unitarias.delta * -1) + k2Long.gregas_unitarias.delta,
                    gamma: (k1Short.gregas_unitarias.gamma * -1) + k2Long.gregas_unitarias.gamma,
                    theta: (k1Short.gregas_unitarias.theta * -1) + k2Long.gregas_unitarias.theta,
                    vega: (k1Short.gregas_unitarias.vega * -1) + k2Long.gregas_unitarias.vega,
                };
                // 3. Montagem do Objeto de Resumo
                results.push({
                    name: this.name,
                    asset: k1Short.ativo_subjacente,
                    spread_type: 'VERTICAL CALL SPREAD',
                    expiration: k1Short.vencimento,
                    dias_uteis: k1Short.dias_uteis ?? 0,
                    strike_description: `V:${k1Short.strike.toFixed(2)} / C:${k2Long.strike.toFixed(2)}`,
                    asset_price: assetPrice,
                    net_premium: netPremium,
                    initialCashFlow: netPremium,
                    natureza: 'CRÉDITO',
                    risco_maximo: maxLoss,
                    lucro_maximo: maxProfit,
                    max_profit: maxProfit,
                    max_loss: -maxLoss, // Representação negativa para prejuízo
                    breakEvenPoints: [Number(breakeven.toFixed(2))],
                    width: width,
                    roi: roi,
                    greeks: greeks,
                    pernas: [
                        {
                            derivative: k1Short,
                            direction: 'VENDA',
                            multiplier: 1,
                            display: generateDisplay(k1Short, 'VENDA', k1Short.strike)
                        },
                        {
                            derivative: k2Long,
                            direction: 'COMPRA',
                            multiplier: 1,
                            display: generateDisplay(k2Long, 'COMPRA', k2Long.strike)
                        },
                    ]
                });
            }
        }
        return results;
    }
    getDescription() {
        return 'Estratégia de Baixa (Bearish) com viés de crédito. Consiste na venda de uma Call ITM/ATM e compra de uma Call OTM para proteção contra altas explosivas.';
    }
    getLegCount() { return 2; }
}
