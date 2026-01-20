/**
 * Helper: Gera a string de exibição para as pernas da Borboleta.
 * Exemplo: 2x [V] PETRA30 (C) K:30.00
 */
function generateDisplay(leg, direction, strike, qty) {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'COMPRA' ? '[C]' : '[V]';
    return `${qty}x ${action} ${leg.option_ticker} (${typeInitial}) K:${strike.toFixed(2)}`;
}
/**
 * CLASSE: ButterflySpread (Borboleta)
 * FUNCIONALIDADE: Identifica combinações de 3 strikes (K1 < K2 < K3) onde compramos as "asas"
 * (K1 e K3) e vendemos o dobro do "corpo" (K2).
 * OBJETIVO: Lucrar com a estabilidade do preço do ativo próximo ao strike central.
 */
export class ButterflySpread {
    constructor() {
        this.name = 'Butterfly (Borboleta)';
        this.marketView = 'NEUTRA';
    }
    /**
     * Scanner: Busca combinações simétricas de 3 pontas.
     * Complexidade O(n³) - otimizada por filtros de strike e vencimento.
     */
    calculateMetrics(allOptions, assetPrice, feePerLeg) {
        const results = [];
        // 1. Filtro: Apenas CALLs com prêmio e strike válidos, ordenadas por strike
        const calls = allOptions
            .filter(leg => leg.tipo === 'CALL' && leg.strike > 0 && leg.premio > 0)
            .sort((a, b) => a.strike - b.strike);
        if (calls.length < 3)
            return [];
        // 2. Scanner de 3 pontas
        for (let i = 0; i < calls.length - 2; i++) {
            for (let j = i + 1; j < calls.length - 1; j++) {
                for (let k = j + 1; k < calls.length; k++) {
                    const k1Low = calls[i];
                    const k2Mid = calls[j];
                    const k3High = calls[k];
                    // Validação de Vencimento Único
                    if (k1Low.vencimento !== k2Mid.vencimento || k2Mid.vencimento !== k3High.vencimento)
                        continue;
                    // Validação de Simetria (Asas iguais)
                    const leftWing = k2Mid.strike - k1Low.strike;
                    const rightWing = k3High.strike - k2Mid.strike;
                    // Tolerância para strikes de ativos com centavos
                    if (Math.abs(leftWing - rightWing) > 0.05)
                        continue;
                    // --- Cálculo Financeiro (DÉBITO) ---
                    // Custo = (Compra K1 + Compra K3) - (2x Venda K2)
                    const cost = k1Low.premio + k3High.premio - (k2Mid.premio * 2);
                    /**
                     * FILTROS DE SANIDADE:
                     * 1. Custo deve ser positivo (operação de débito).
                     * 2. Custo não pode exceder a largura da asa (seria prejuízo garantido).
                     */
                    if (cost <= 0.01 || cost >= leftWing)
                        continue;
                    const maxProfit = leftWing - cost;
                    const roi = maxProfit / cost;
                    // --- Cálculo de Gregas Net (Perna central x2 e invertida) ---
                    const g1 = k1Low.gregas_unitarias;
                    const g2 = k2Mid.gregas_unitarias;
                    const g3 = k3High.gregas_unitarias;
                    const netGreeks = {
                        delta: Number((g1.delta - (2 * g2.delta) + g3.delta).toFixed(4)),
                        gamma: Number((g1.gamma - (2 * g2.gamma) + g3.gamma).toFixed(4)),
                        theta: Number((g1.theta - (2 * g2.theta) + g3.theta).toFixed(4)),
                        vega: Number((g1.vega - (2 * g2.vega) + g3.vega).toFixed(4)),
                    };
                    // 3. Estruturação do Resultado
                    results.push({
                        name: this.name,
                        asset: k1Low.ativo_subjacente,
                        asset_price: assetPrice,
                        spread_type: 'BUTTERFLY',
                        expiration: k1Low.vencimento,
                        dias_uteis: k1Low.dias_uteis || 0,
                        strike_description: `${k1Low.strike.toFixed(1)} | ${k2Mid.strike.toFixed(1)} | ${k3High.strike.toFixed(1)}`,
                        net_premium: -cost,
                        initialCashFlow: -cost,
                        natureza: 'DÉBITO',
                        max_profit: maxProfit,
                        max_loss: -cost,
                        lucro_maximo: maxProfit,
                        risco_maximo: cost,
                        roi: roi,
                        breakEvenPoints: [
                            Number((k1Low.strike + cost).toFixed(2)),
                            Number((k3High.strike - cost).toFixed(2))
                        ],
                        greeks: netGreeks,
                        pernas: [
                            { derivative: k1Low, direction: 'COMPRA', multiplier: 1, display: generateDisplay(k1Low, 'COMPRA', k1Low.strike, 1) },
                            { derivative: k2Mid, direction: 'VENDA', multiplier: 2, display: generateDisplay(k2Mid, 'VENDA', k2Mid.strike, 2) },
                            { derivative: k3High, direction: 'COMPRA', multiplier: 1, display: generateDisplay(k3High, 'COMPRA', k3High.strike, 1) }
                        ]
                    });
                }
            }
        }
        return results;
    }
    getDescription() {
        return 'Estratégia neutra com risco limitado. O lucro máximo ocorre se o ativo expirar exatamente no strike central (K2). Possui dois pontos de equilíbrio (breakevens).';
    }
    getLegCount() { return 3; }
}
