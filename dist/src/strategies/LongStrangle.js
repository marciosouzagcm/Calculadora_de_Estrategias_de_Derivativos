/**
 * Helper: Gera a string de exibição para as pernas do Strangle.
 */
function generateDisplay(leg, direction, strike) {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'COMPRA' ? '[C]' : '[V]';
    return `${action} ${leg.option_ticker} (${typeInitial}) K:${strike.toFixed(2)}`;
}
/**
 * CLASSE: Long Strangle
 * FUNCIONALIDADE: Compra de uma PUT (strike menor) e uma CALL (strike maior).
 * OBJETIVO: Estratégia de volatilidade barata. Lucra se o ativo romper o intervalo dos strikes + custo.
 */
export class LongStrangle {
    constructor() {
        this.name = 'Long Strangle';
        this.marketView = 'VOLÁTIL';
    }
    calculateMetrics(allOptions, assetPrice, feePerLeg) {
        const results = [];
        // 1. Filtragem Inicial (Garante dados mínimos para o scanner)
        const puts = allOptions.filter(l => l.tipo === 'PUT' && l.strike > 0 && l.premio > 0);
        const calls = allOptions.filter(l => l.tipo === 'CALL' && l.strike > 0 && l.premio > 0);
        if (puts.length === 0 || calls.length === 0)
            return [];
        // 2. Scanner de combinações O(n*m)
        for (const putLeg of puts) {
            for (const callLeg of calls) {
                // Validação de Vencimento Único
                const dPut = String(putLeg.vencimento).split(/[T ]/)[0];
                const dCall = String(callLeg.vencimento).split(/[T ]/)[0];
                if (dPut !== dCall)
                    continue;
                const kPut = putLeg.strike;
                const kCall = callLeg.strike;
                /**
                 * REGRAS DE ESTRUTURA:
                 * 1. No Strangle, a Put deve ter strike MENOR que a Call (Ambas OTM).
                 * 2. Distância do Spot: Evitamos strikes muito profundos (Ex: > 20% de distância).
                 */
                if (kPut >= kCall)
                    continue;
                if (kPut > assetPrice || kCall < assetPrice)
                    continue; // Garante que são OTM
                // --- Cálculo Financeiro (DÉBITO) ---
                const netCost = putLeg.premio + callLeg.premio;
                // Filtro de liquidez/sanidade
                if (netCost <= 0.05)
                    continue;
                // Pontos de Equilíbrio (Breakevens)
                const breakevenLow = kPut - netCost;
                const breakevenHigh = kCall + netCost;
                // --- Cálculo das Gregas Net ---
                const getG = (l) => l.gregas_unitarias || { delta: 0, gamma: 0, theta: 0, vega: 0 };
                const gP = getG(putLeg);
                const gC = getG(callLeg);
                const netGreeks = {
                    delta: Number((gC.delta + gP.delta).toFixed(4)),
                    gamma: Number((gC.gamma + gP.gamma).toFixed(4)),
                    theta: Number((gC.theta + gP.theta).toFixed(4)),
                    vega: Number((gC.vega + gP.vega).toFixed(4)),
                };
                results.push({
                    name: this.name,
                    asset: callLeg.ativo_subjacente,
                    asset_price: assetPrice,
                    spread_type: 'STRANGLE',
                    expiration: dPut,
                    dias_uteis: callLeg.dias_uteis || 0,
                    strike_description: `P:${kPut.toFixed(2)} | C:${kCall.toFixed(2)}`,
                    net_premium: -netCost,
                    initialCashFlow: -netCost,
                    natureza: 'DÉBITO',
                    max_profit: Infinity,
                    max_loss: -netCost,
                    lucro_maximo: Infinity,
                    risco_maximo: netCost,
                    roi: 0,
                    breakEvenPoints: [
                        Number(breakevenLow.toFixed(2)),
                        Number(breakevenHigh.toFixed(2))
                    ],
                    greeks: netGreeks,
                    pernas: [
                        { derivative: putLeg, direction: 'COMPRA', multiplier: 1, display: generateDisplay(putLeg, 'COMPRA', kPut) },
                        { derivative: callLeg, direction: 'COMPRA', multiplier: 1, display: generateDisplay(callLeg, 'COMPRA', kCall) }
                    ]
                });
            }
        }
        return results;
    }
    getDescription() {
        return 'Estratégia de volatilidade de baixo custo. Consiste em comprar uma Put e uma Call fora do dinheiro. Exige um movimento maior do que o Straddle para lucrar, mas o risco financeiro é menor.';
    }
    getLegCount() { return 2; }
}
