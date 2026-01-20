export class VerticalSpreadBase {
    constructor() {
        this.marketView = 'ALTA';
    }
    /**
     * Motor de cálculo para todas as variações de travas verticais
     */
    calculateMetrics(allOptions, spotPrice, feePerLeg) {
        this.marketView = this.isBull ? 'ALTA' : 'BAIXA';
        const results = [];
        // Filtra opções por tipo e garante que o strike existe e é numérico
        const filteredOptions = allOptions.filter(o => o.tipo === this.type &&
            o.strike !== null &&
            !isNaN(Number(o.strike)));
        for (let i = 0; i < filteredOptions.length; i++) {
            for (let j = 0; j < filteredOptions.length; j++) {
                if (i === j)
                    continue;
                const optA = filteredOptions[i];
                const optB = filteredOptions[j];
                // CORREÇÃO DE DATA: Normaliza para garantir que a comparação funcione
                const dateA = String(optA.vencimento).split('T')[0];
                const dateB = String(optB.vencimento).split('T')[0];
                if (dateA !== dateB)
                    continue;
                let buyLeg, sellLeg;
                // Lógica de Direção (Bull/Bear)
                // Bull: Compra strike menor (Call) ou Vende strike menor (Put)
                // Aqui definimos quem é a ponta de compra e venda para o cálculo
                if (this.isBull) {
                    if (optA.strike < optB.strike) {
                        buyLeg = optA;
                        sellLeg = optB;
                    }
                    else
                        continue;
                }
                else {
                    if (optA.strike > optB.strike) {
                        buyLeg = optA;
                        sellLeg = optB;
                    }
                    else
                        continue;
                }
                // Prêmios e Diferencial
                const netPremium = sellLeg.premio - buyLeg.premio;
                const strikeDiff = Math.abs(sellLeg.strike - buyLeg.strike);
                const isCredit = netPremium > 0;
                // Lucro e Perda Máxima
                const maxProfit = isCredit ? netPremium : strikeDiff + netPremium;
                const maxLoss = isCredit ? strikeDiff - netPremium : Math.abs(netPremium);
                // Filtro de viabilidade (Evita distorções de book vazio)
                if (maxProfit <= 0 || maxLoss <= 0 || maxProfit > strikeDiff)
                    continue;
                // Cálculo do Break-even
                let be = 0;
                if (this.type === 'CALL') {
                    be = isCredit ? sellLeg.strike + netPremium : buyLeg.strike + Math.abs(netPremium);
                }
                else {
                    be = isCredit ? sellLeg.strike - netPremium : buyLeg.strike - Math.abs(netPremium);
                }
                results.push({
                    name: this.name,
                    asset: buyLeg.ativo_subjacente,
                    asset_price: spotPrice,
                    spread_type: 'VERTICAL',
                    expiration: dateA,
                    dias_uteis: buyLeg.dias_uteis || 0,
                    strike_description: `${buyLeg.strike.toFixed(2)} / ${sellLeg.strike.toFixed(2)}`,
                    net_premium: Number(netPremium.toFixed(2)),
                    initialCashFlow: Number(netPremium.toFixed(2)),
                    natureza: isCredit ? 'CRÉDITO' : 'DÉBITO',
                    max_profit: Number(maxProfit.toFixed(2)),
                    max_loss: Number(-maxLoss.toFixed(2)),
                    lucro_maximo: Number(maxProfit.toFixed(2)),
                    risco_maximo: Number(maxLoss.toFixed(2)),
                    roi: maxProfit / maxLoss,
                    breakEvenPoints: [Number(be.toFixed(2))],
                    greeks: this.calculateNetGreeks(buyLeg, sellLeg),
                    pernas: [
                        {
                            direction: 'COMPRA',
                            multiplier: 1,
                            derivative: buyLeg,
                            display: `C-${this.type[0]} K${buyLeg.strike}`
                        },
                        {
                            direction: 'VENDA',
                            multiplier: 1,
                            derivative: sellLeg,
                            display: `V-${this.type[0]} K${sellLeg.strike}`
                        }
                    ]
                });
            }
        }
        return results;
    }
    calculateNetGreeks(buy, sell) {
        const g1 = buy.gregas_unitarias || { delta: 0, gamma: 0, theta: 0, vega: 0 };
        const g2 = sell.gregas_unitarias || { delta: 0, gamma: 0, theta: 0, vega: 0 };
        return {
            delta: Number((g1.delta - g2.delta).toFixed(4)),
            gamma: Number((g1.gamma - g2.gamma).toFixed(4)),
            theta: Number((g1.theta - g2.theta).toFixed(4)),
            vega: Number((g1.vega - g2.vega).toFixed(4))
        };
    }
    getLegCount() { return 2; }
    generatePayoff() { return []; }
    getDescription() { return this.name; }
}
export class BullCallSpread extends VerticalSpreadBase {
    constructor() {
        super(...arguments);
        this.name = 'Trava de Alta (Call)';
        this.isBull = true;
        this.type = 'CALL';
    }
}
export class BearCallSpread extends VerticalSpreadBase {
    constructor() {
        super(...arguments);
        this.name = 'Trava de Baixa (Call)';
        this.isBull = false;
        this.type = 'CALL';
    }
}
export class BullPutSpread extends VerticalSpreadBase {
    constructor() {
        super(...arguments);
        this.name = 'Trava de Alta (Put)';
        this.isBull = true;
        this.type = 'PUT';
    }
}
export class BearPutSpread extends VerticalSpreadBase {
    constructor() {
        super(...arguments);
        this.name = 'Trava de Baixa (Put)';
        this.isBull = false;
        this.type = 'PUT';
    }
}
