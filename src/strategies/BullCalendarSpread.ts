import { IStrategy } from '../interfaces/IStrategy.js';
import { Greeks, NaturezaOperacao, OptionLeg, StrategyMetrics } from '../interfaces/Types.js';

export class BullCalendarSpread implements IStrategy {
    public readonly name: string = 'Bull Calendar Spread';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'ALTA';

    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];
        const calls = allOptions.filter(leg => leg.tipo === 'CALL' && leg.premio > 0);

        for (const longLeg of calls) {
            for (const shortLeg of calls) {
                // REGRAS: 1. Mesmo Strike | 2. Long Exp > Short Exp | 3. Strike > Asset Price (Bullish)
                if (longLeg.strike !== shortLeg.strike) continue;
                if (new Date(longLeg.vencimento) <= new Date(shortLeg.vencimento)) continue;
                if (longLeg.strike <= assetPrice) continue;

                const netCost = longLeg.premio - shortLeg.premio;
                if (netCost <= 0) continue;

                // O lucro máximo ocorre se o ativo estiver no Strike no vencimento da perna curta
                const estimatedLongValue = longLeg.premio * 0.85; 
                const maxProfit = estimatedLongValue - netCost;

                results.push({
                    name: this.name,
                    asset: longLeg.ativo_subjacente,
                    spread_type: 'HORIZONTAL CALL SPREAD',
                    expiration: `${shortLeg.vencimento} / ${longLeg.vencimento}`,
                    dias_uteis: shortLeg.dias_uteis ?? 0,
                    strike_description: `K:${longLeg.strike.toFixed(2)} (Horizontal)`,
                    asset_price: assetPrice,
                    net_premium: netCost,
                    initialCashFlow: -netCost,
                    natureza: 'DÉBITO' as NaturezaOperacao,
                    risco_maximo: netCost,
                    lucro_maximo: maxProfit,
                    max_profit: maxProfit,
                    max_loss: -netCost,
                    breakEvenPoints: [Number((longLeg.strike - netCost).toFixed(2)), Number((longLeg.strike + netCost).toFixed(2))],
                    width: 0,
                    roi: maxProfit / netCost,
                    greeks: {
                        delta: longLeg.gregas_unitarias.delta - shortLeg.gregas_unitarias.delta,
                        gamma: longLeg.gregas_unitarias.gamma - shortLeg.gregas_unitarias.gamma,
                        theta: longLeg.gregas_unitarias.theta - shortLeg.gregas_unitarias.theta,
                        vega: longLeg.gregas_unitarias.vega - shortLeg.gregas_unitarias.vega,
                    },
                    pernas: [
                        { derivative: longLeg, direction: 'COMPRA', multiplier: 1, display: `[C] ${longLeg.option_ticker} (Long Exp)` },
                        { derivative: shortLeg, direction: 'VENDA', multiplier: 1, display: `[V] ${shortLeg.option_ticker} (Short Exp)` }
                    ]
                } as StrategyMetrics);
            }
        }
        return results;
    }

    getDescription(): string {
        return 'Compra de Call longa e venda de Call curta de mesmo strike (OTM). Lucra com a passagem do tempo e valorização moderada do ativo.';
    }

    getLegCount(): number { return 2; }
}