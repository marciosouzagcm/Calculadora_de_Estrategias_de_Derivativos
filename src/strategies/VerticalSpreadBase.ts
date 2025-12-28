import { IStrategy } from '../interfaces/IStrategy';
import { OptionLeg, StrategyMetrics, Greeks } from '../interfaces/Types';

export abstract class VerticalSpreadBase implements IStrategy {
    abstract name: string;
    abstract isBull: boolean;
    abstract type: 'CALL' | 'PUT';

    // Tipagem rigorosa para satisfazer a IStrategy
    marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'ALTA';

    constructor() {
        // Construtor vazio para evitar erro TS2715
    }

    calculateMetrics(legs: OptionLeg[], spotPrice: number, feePerLeg: number): StrategyMetrics | null {
        // Define a visão de mercado no momento do cálculo
        this.marketView = this.isBull ? 'ALTA' : 'BAIXA';

        const bought = legs.find(l => l.strike !== null); // Lógica simplificada para exemplo
        const sold = legs.find(l => l.strike !== null); 
        
        // Em travas verticais, precisamos identificar qual é a ponta comprada e a vendida
        // baseada nos strikes e na direção (Bull/Bear)
        const sorted = [...legs].sort((a, b) => (a.strike || 0) - (b.strike || 0));
        
        let buyLeg: OptionLeg, sellLeg: OptionLeg;

        if (this.type === 'CALL') {
            [buyLeg, sellLeg] = this.isBull ? [sorted[0], sorted[1]] : [sorted[1], sorted[0]];
        } else {
            [buyLeg, sellLeg] = this.isBull ? [sorted[1], sorted[0]] : [sorted[0], sorted[1]];
        }

        const netPremium = sellLeg.premio - buyLeg.premio;
        const strikeDiff = Math.abs((sellLeg.strike || 0) - (buyLeg.strike || 0));

        // Lucro e Perda Máxima para Travas
        const maxProfit = netPremium > 0 ? netPremium : strikeDiff + netPremium;
        const maxLoss = netPremium > 0 ? strikeDiff - netPremium : Math.abs(netPremium);

        return {
            name: this.name,
            asset: buyLeg.ativo_subjacente,
            asset_price: spotPrice,
            spread_type: 'VERTICAL',
            expiration: buyLeg.vencimento,
            dias_uteis: buyLeg.dias_uteis,
            strike_description: `${buyLeg.strike} / ${sellLeg.strike}`,
            net_premium: Number(netPremium.toFixed(2)),
            initialCashFlow: Number(netPremium.toFixed(2)),
            natureza: netPremium < 0 ? 'DÉBITO' : 'CRÉDITO',
            max_profit: Number(maxProfit.toFixed(2)),
            max_loss: Number(maxLoss.toFixed(2)),
            lucro_maximo: Number(maxProfit.toFixed(2)),
            risco_maximo: Number(maxLoss.toFixed(2)),
            breakEvenPoints: [Number(((buyLeg.strike || 0) + (netPremium < 0 ? Math.abs(netPremium) : -netPremium)).toFixed(2))],
            greeks: this.calculateNetGreeks(buyLeg, sellLeg),
            pernas: [
                { direction: 'COMPRA', multiplier: 1, derivative: buyLeg, display: `Compra ${buyLeg.tipo} ${buyLeg.strike}` },
                { direction: 'VENDA', multiplier: 1, derivative: sellLeg, display: `Venda ${sellLeg.tipo} ${sellLeg.strike}` }
            ]
        };
    }

    private calculateNetGreeks(buy: OptionLeg, sell: OptionLeg): Greeks {
        return {
            delta: Number((buy.gregas_unitarias.delta - sell.gregas_unitarias.delta).toFixed(4)),
            gamma: Number((buy.gregas_unitarias.gamma - sell.gregas_unitarias.gamma).toFixed(4)),
            theta: Number((buy.gregas_unitarias.theta - sell.gregas_unitarias.theta).toFixed(4)),
            vega: Number((buy.gregas_unitarias.vega - sell.gregas_unitarias.vega).toFixed(4))
        };
    }
}

// Classes Concretas
export class BullCallSpread extends VerticalSpreadBase {
    name = 'Trava de Alta (Call)';
    isBull = true;
    type = 'CALL' as const;
}

export class BearCallSpread extends VerticalSpreadBase {
    name = 'Trava de Baixa (Call)';
    isBull = false;
    type = 'CALL' as const;
}

export class BullPutSpread extends VerticalSpreadBase {
    name = 'Trava de Alta (Put)';
    isBull = true;
    type = 'PUT' as const;
}

export class BearPutSpread extends VerticalSpreadBase {
    name = 'Trava de Baixa (Put)';
    isBull = false;
    type = 'PUT' as const;
}