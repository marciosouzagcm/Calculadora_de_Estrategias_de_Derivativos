import { IStrategy } from "../interfaces/IStrategy";
import { NaturezaOperacao, OptionLeg, StrategyMetrics } from "../interfaces/Types";

export class CoveredPut implements IStrategy {
    public readonly name: string = 'Lançamento Coberto com Put';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'BAIXA';

    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];
        const puts = allOptions.filter(leg => leg.tipo === 'PUT' && leg.premio > 0);

        for (const put of puts) {
            // No Covered Put:
            // 1. Venda a descoberto do Ativo (Short Stock)
            // 2. Venda da Put (Short Put)
            
            const netCredit = assetPrice + put.premio;
            const maxProfit = (assetPrice - put.strike) + put.premio;
            const breakeven = assetPrice + put.premio;

            results.push({
                name: this.name,
                asset: put.ativo_subjacente,
                spread_type: 'COVERED PUT',
                expiration: put.vencimento,
                strike_description: `Short Stock + V:${put.strike.toFixed(2)}`,
                asset_price: assetPrice,
                net_premium: put.premio,
                initialCashFlow: netCredit,
                natureza: 'CRÉDITO' as NaturezaOperacao,
                risco_maximo: 999999, // Risco ilimitado na alta do ativo
                lucro_maximo: maxProfit,
                max_profit: maxProfit,
                max_loss: -999999,
                breakEvenPoints: [Number(breakeven.toFixed(2))],
                roi: maxProfit / assetPrice,
                greeks: {
                    delta: -1 - put.gregas_unitarias.delta,
                    gamma: -put.gregas_unitarias.gamma,
                    theta: -put.gregas_unitarias.theta,
                    vega: -put.gregas_unitarias.vega,
                },
                pernas: [
                    { 
                        derivative: put, 
                        direction: 'VENDA', 
                        multiplier: 1, 
                        display: `[V] ${put.option_ticker} K:${put.strike.toFixed(2)} (Covered)` 
                    }
                ]
            } as StrategyMetrics);
        }
        return results;
    }

    getDescription(): string {
        return 'Venda do ativo a descoberto combinada com a venda de uma Put. Lucra com a queda do ativo até o strike da Put.';
    }

    getLegCount(): number { return 1; }
}