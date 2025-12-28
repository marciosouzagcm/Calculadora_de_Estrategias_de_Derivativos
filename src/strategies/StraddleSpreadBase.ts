import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, OptionLeg, StrategyMetrics } from '../interfaces/Types';

export abstract class StraddleBase implements IStrategy {
    abstract name: string;
    abstract isLong: boolean;
    
    // CORREÇÃO: Tipando explicitamente para aceitar os valores da IStrategy
    marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA';

    constructor() {}

    calculateMetrics(legs: OptionLeg[], spotPrice: number, feePerLeg: number): StrategyMetrics | null {
        // Agora o TS aceita pois os valores batem exatamente com o tipo literal
        this.marketView = this.isLong ? 'VOLÁTIL' : 'NEUTRA';

        const call = legs.find(l => l.tipo === 'CALL');
        const put = legs.find(l => l.tipo === 'PUT');

        if (!call || !put) return null;

        const netPremium = this.isLong 
            ? -(call.premio + put.premio) 
            : (call.premio + put.premio);

        const beLow = (call.strike || spotPrice) - Math.abs(netPremium);
        const beHigh = (call.strike || spotPrice) + Math.abs(netPremium);

        return {
            name: this.name,
            asset: call.ativo_subjacente,
            asset_price: spotPrice,
            spread_type: 'STRADDLE',
            expiration: call.vencimento,
            dias_uteis: call.dias_uteis,
            strike_description: `ATM @ R$ ${call.strike}`,
            net_premium: netPremium,
            initialCashFlow: netPremium,
            natureza: netPremium < 0 ? 'DÉBITO' : 'CRÉDITO',
            max_profit: this.isLong ? 'Ilimitado' : Number(Math.abs(netPremium).toFixed(2)),
            max_loss: this.isLong ? Number(Math.abs(netPremium).toFixed(2)) : 'Ilimitado',
            lucro_maximo: this.isLong ? 'Ilimitado' : Number(Math.abs(netPremium).toFixed(2)),
            risco_maximo: this.isLong ? Number(Math.abs(netPremium).toFixed(2)) : 'Ilimitado',
            breakEvenPoints: [Number(beLow.toFixed(2)), Number(beHigh.toFixed(2))],
            greeks: this.calculateNetGreeks(legs),
            pernas: legs.map(l => ({
                direction: this.isLong ? 'COMPRA' : 'VENDA',
                multiplier: 1,
                derivative: l,
                display: `${this.isLong ? 'Compra' : 'Venda'} de ${l.tipo} Strike ${l.strike}`
            }))
        };
    }

    private calculateNetGreeks(legs: OptionLeg[]): Greeks {
        const factor = this.isLong ? 1 : -1;
        return {
            delta: Number(legs.reduce((acc, l) => acc + (l.gregas_unitarias.delta * factor), 0).toFixed(4)),
            gamma: Number(legs.reduce((acc, l) => acc + (l.gregas_unitarias.gamma * factor), 0).toFixed(4)),
            theta: Number(legs.reduce((acc, l) => acc + (l.gregas_unitarias.theta * factor), 0).toFixed(4)),
            vega: Number(legs.reduce((acc, l) => acc + (l.gregas_unitarias.vega * factor), 0).toFixed(4))
        };
    }
}

export class LongStraddle extends StraddleBase {
    name = 'Long Straddle';
    isLong = true;
}

export class ShortStraddle extends StraddleBase {
    name = 'Short Straddle';
    isLong = false;
}