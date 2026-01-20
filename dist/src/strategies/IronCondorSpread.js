/**
 * Helper: Gera a string de exibição para as pernas do Iron Condor.
 */
function generateDisplay(leg, direction, strike) {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'COMPRA' ? '[C]' : '[V]';
    return `${action} ${leg.option_ticker} (${typeInitial}) K:${strike.toFixed(2)}`;
}
/**
 * CLASSE: IronCondorSpread
 * FUNCIONALIDADE: Combina 4 pernas (2 Puts e 2 Calls) para lucrar com a baixa volatilidade.
 * ESTRUTURA: Put Comprada (K1) < Put Vendida (K2) < Call Vendida (K3) < Call Comprada (K4).
 */
export class IronCondorSpread {
    constructor() {
        this.name = 'Iron Condor';
        this.marketView = 'NEUTRA';
    }
    calculateMetrics(allOptions, assetPrice, feePerLeg) {
        const results = [];
        // 1. Filtragem e Ordenação por Strike
        const puts = allOptions
            .filter(l => l.tipo === 'PUT' && l.strike > 0 && l.premio > 0)
            .sort((a, b) => a.strike - b.strike);
        const calls = allOptions
            .filter(l => l.tipo === 'CALL' && l.strike > 0 && l.premio > 0)
            .sort((a, b) => a.strike - b.strike);
        if (puts.length < 2 || calls.length < 2)
            return [];
        // 2. Scanner de Combinações (O(n⁴) - Mitigado por filtros de estrutura)
        for (let p1 = 0; p1 < puts.length - 1; p1++) { // K1: Put Longa
            for (let p2 = p1 + 1; p2 < puts.length; p2++) { // K2: Put Curta
                for (let c1 = 0; c1 < calls.length - 1; c1++) { // K3: Call Curta
                    for (let c2 = c1 + 1; c2 < calls.length; c2++) { // K4: Call Longa
                        const k1PutLong = puts[p1];
                        const k2PutShort = puts[p2];
                        const k3CallShort = calls[c1];
                        const k4CallLong = calls[c2];
                        // Validação de Vencimento Único
                        if (k1PutLong.vencimento !== k2PutShort.vencimento ||
                            k2PutShort.vencimento !== k3CallShort.vencimento ||
                            k3CallShort.vencimento !== k4CallLong.vencimento)
                            continue;
                        // Validação de Estrutura: Miolo deve ser neutro (K2 < K3)
                        // E o preço atual preferencialmente deve estar entre K2 e K3
                        if (k2PutShort.strike >= k3CallShort.strike)
                            continue;
                        // --- Cálculo Financeiro (CRÉDITO) ---
                        const credit = (k2PutShort.premio + k3CallShort.premio) - (k1PutLong.premio + k4CallLong.premio);
                        // Largura das travas (usamos a maior para o risco máximo)
                        const widthPut = k2PutShort.strike - k1PutLong.strike;
                        const widthCall = k4CallLong.strike - k3CallShort.strike;
                        const maxWidth = Math.max(widthPut, widthCall);
                        /**
                         * FILTROS DE SANIDADE:
                         * 1. Crédito positivo.
                         * 2. Crédito não pode ser maior que a largura (arbitragem impossível).
                         * 3. Simetria aproximada: Evita condors bizarros onde uma asa é 10x maior que a outra.
                         */
                        if (credit <= 0.05 || credit >= maxWidth)
                            continue;
                        if (Math.abs(widthPut - widthCall) > maxWidth * 0.5)
                            continue;
                        const maxLoss = maxWidth - credit;
                        const roi = credit / maxLoss;
                        // --- Cálculo das Gregas Net ---
                        const getG = (l) => l.gregas_unitarias || { delta: 0, gamma: 0, theta: 0, vega: 0 };
                        const gP1 = getG(k1PutLong);
                        const gP2 = getG(k2PutShort);
                        const gC1 = getG(k3CallShort);
                        const gC2 = getG(k4CallLong);
                        const netGreeks = {
                            // Vendas (Short) invertem o sinal das gregas unitárias
                            delta: Number((gP1.delta - gP2.delta - gC1.delta + gC2.delta).toFixed(4)),
                            gamma: Number((gP1.gamma - gP2.gamma - gC1.gamma + gC2.gamma).toFixed(4)),
                            theta: Number((gP1.theta - gP2.theta - gC1.theta + gC2.theta).toFixed(4)),
                            vega: Number((gP1.vega - gP2.vega - gC1.vega + gC2.vega).toFixed(4)),
                        };
                        results.push({
                            name: this.name,
                            asset: k1PutLong.ativo_subjacente,
                            asset_price: assetPrice,
                            spread_type: 'IRON CONDOR',
                            expiration: k1PutLong.vencimento,
                            dias_uteis: k1PutLong.dias_uteis || 0,
                            strike_description: `P:${k1PutLong.strike}/${k2PutShort.strike} | C:${k3CallShort.strike}/${k4CallLong.strike}`,
                            net_premium: Number(credit.toFixed(2)),
                            initialCashFlow: Number(credit.toFixed(2)),
                            natureza: 'CRÉDITO',
                            max_profit: Number(credit.toFixed(2)),
                            max_loss: Number((-maxLoss).toFixed(2)),
                            lucro_maximo: Number(credit.toFixed(2)),
                            risco_maximo: Number(maxLoss.toFixed(2)),
                            roi: roi,
                            breakEvenPoints: [
                                Number((k2PutShort.strike - credit).toFixed(2)),
                                Number((k3CallShort.strike + credit).toFixed(2))
                            ],
                            greeks: netGreeks,
                            pernas: [
                                { derivative: k1PutLong, direction: 'COMPRA', multiplier: 1, display: generateDisplay(k1PutLong, 'COMPRA', k1PutLong.strike) },
                                { derivative: k2PutShort, direction: 'VENDA', multiplier: 1, display: generateDisplay(k2PutShort, 'VENDA', k2PutShort.strike) },
                                { derivative: k3CallShort, direction: 'VENDA', multiplier: 1, display: generateDisplay(k3CallShort, 'VENDA', k3CallShort.strike) },
                                { derivative: k4CallLong, direction: 'COMPRA', multiplier: 1, display: generateDisplay(k4CallLong, 'COMPRA', k4CallLong.strike) }
                            ]
                        });
                    }
                }
            }
        }
        return results;
    }
    getDescription() {
        return 'Estratégia neutra que busca lucrar com o ativo dentro de um intervalo de preço. Combina uma trava de alta com Puts e uma trava de baixa com Calls, limitando o risco nas duas extremidades.';
    }
    getLegCount() { return 4; }
}
