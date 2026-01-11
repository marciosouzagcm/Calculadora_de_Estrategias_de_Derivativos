import { OptionLeg, StrategyMetrics } from '../interfaces/Types';
import { IStrategy } from '../interfaces/IStrategy';

export class LongCollar implements IStrategy {
    public name = "Rochedo (Long Collar)";
    public marketView: "ALTA" | "BAIXA" | "NEUTRA" | "VOLÁTIL" = "NEUTRA";

    public calculateMetrics(options: OptionLeg[], spotPrice: number, fee: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];
        const calls = options.filter(o => o.tipo === 'CALL' && o.strike > spotPrice);
        const puts = options.filter(o => o.tipo === 'PUT' && o.strike < spotPrice);

        for (const call of calls) {
            for (const put of puts) {
                const netCost = spotPrice + put.premio - call.premio;
                const maxProfit = call.strike - netCost;
                const maxLoss = netCost - put.strike;

                if (maxProfit <= 0) continue;

                results.push({
                    name: this.name,
                    asset: call.ativo_subjacente,
                    asset_price: spotPrice,
                    strike_description: `P:${put.strike} | C:${call.strike}`,
                    net_premium: netCost - spotPrice,
                    initialCashFlow: netCost,
                    natureza: 'DÉBITO',
                    max_profit: maxProfit,
                    max_loss: maxLoss,
                    lucro_maximo: maxProfit,
                    risco_maximo: maxLoss,
                    breakEvenPoints: [netCost],
                    greeks: {
                        delta: 1 + put.gregas_unitarias.delta - call.gregas_unitarias.delta,
                        gamma: put.gregas_unitarias.gamma - call.gregas_unitarias.gamma,
                        theta: put.gregas_unitarias.theta - call.gregas_unitarias.theta,
                        vega: put.gregas_unitarias.vega - call.gregas_unitarias.vega
                    },
                    pernas: [
                        { direction: 'SUBJACENTE', multiplier: 1, derivative: { tipo: 'SUBJACENTE', strike: spotPrice } as any, display: 'ATIVO' },
                        { direction: 'COMPRA', multiplier: 1, derivative: put, display: `P ${put.strike}` },
                        { direction: 'VENDA', multiplier: 1, derivative: call, display: `C ${call.strike}` }
                    ]
                });
            }
        }
        return results;
    }
}