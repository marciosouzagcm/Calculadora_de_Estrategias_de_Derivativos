import { IStrategy } from '../interfaces/IStrategy.js';
import { Greeks, NaturezaOperacao, OptionLeg, StrategyMetrics } from '../interfaces/Types.js';

export class LongButterflyCall implements IStrategy {
    public readonly name: string = 'Long Butterfly (Call)';
    public readonly marketView: 'NEUTRA' = 'NEUTRA';

    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];
        const calls = allOptions
            .filter(leg => leg.tipo === 'CALL' && leg.premio > 0)
            .sort((a, b) => a.strike - b.strike);

        // O(n³) Scanner - Busca 3 strikes com distâncias iguais
        for (let i = 0; i < calls.length; i++) {
            for (let j = i + 1; j < calls.length; j++) {
                for (let k = j + 1; k < calls.length; k++) {
                    const leg1 = calls[i]; // Asa Inferior
                    const leg2 = calls[j]; // Miolo (Vendido 2x)
                    const leg3 = calls[k]; // Asa Superior

                    if (leg1.vencimento !== leg2.vencimento || leg2.vencimento !== leg3.vencimento) continue;

                    // Verifica se os strikes são equidistantes (K2 - K1 == K3 - K2)
                    const dist1 = leg2.strike - leg1.strike;
                    const dist2 = leg3.strike - leg2.strike;
                    
                    if (Math.abs(dist1 - dist2) > 0.01) continue;

                    const netCost = leg1.premio - (2 * leg2.premio) + leg3.premio;
                    if (netCost <= 0.05) continue; // Filtro de custo mínimo

                    const maxProfit = dist1 - netCost;
                    const breakevenBaixo = leg1.strike + netCost;
                    const breakevenAlto = leg3.strike - netCost;

                    results.push({
                        name: this.name,
                        asset: leg1.ativo_subjacente,
                        spread_type: 'BUTTERFLY CALL SPREAD',
                        expiration: leg1.vencimento,
                        dias_uteis: leg1.dias_uteis ?? 0,
                        strike_description: `K:${leg1.strike.toFixed(2)} | 2x${leg2.strike.toFixed(2)} | K:${leg3.strike.toFixed(2)}`,
                        asset_price: assetPrice,
                        net_premium: netCost,
                        initialCashFlow: -netCost,
                        natureza: 'DÉBITO' as NaturezaOperacao,
                        risco_maximo: netCost,
                        lucro_maximo: maxProfit,
                        max_profit: maxProfit,
                        max_loss: -netCost,
                        breakEvenPoints: [Number(breakevenBaixo.toFixed(2)), Number(breakevenAlto.toFixed(2))],
                        width: dist1,
                        roi: maxProfit / netCost,
                        greeks: {
                            delta: leg1.gregas_unitarias.delta - (2 * leg2.gregas_unitarias.delta) + leg3.gregas_unitarias.delta,
                            gamma: leg1.gregas_unitarias.gamma - (2 * leg2.gregas_unitarias.gamma) + leg3.gregas_unitarias.gamma,
                            theta: leg1.gregas_unitarias.theta - (2 * leg2.gregas_unitarias.theta) + leg3.gregas_unitarias.theta,
                            vega: leg1.gregas_unitarias.vega - (2 * leg2.gregas_unitarias.vega) + leg3.gregas_unitarias.vega,
                        },
                        pernas: [
                            { derivative: leg1, direction: 'COMPRA', multiplier: 1, display: `[C] 1x K:${leg1.strike}` },
                            { derivative: leg2, direction: 'VENDA', multiplier: 2, display: `[V] 2x K:${leg2.strike}` },
                            { derivative: leg3, direction: 'COMPRA', multiplier: 1, display: `[C] 1x K:${leg3.strike}` }
                        ]
                    } as StrategyMetrics);
                }
            }
        }
        return results;
    }

    getDescription(): string {
        return 'Combinação de uma trava de alta e uma trava de baixa. Lucro máximo quando o ativo expira exatamente no strike central.';
    }

    getLegCount(): number { return 3; }
}