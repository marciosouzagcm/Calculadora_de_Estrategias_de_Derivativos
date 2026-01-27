import { IStrategy } from "../interfaces/IStrategy";
import { NaturezaOperacao, OptionLeg, StrategyMetrics } from "../interfaces/Types";

export class ShortButterflyCall implements IStrategy {
    public readonly name: string = 'Short Butterfly (Call)';
    public readonly marketView: 'VOLÁTIL' = 'VOLÁTIL';

    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];
        const calls = allOptions.filter(leg => leg.tipo === 'CALL' && leg.premio > 0).sort((a, b) => a.strike - b.strike);

        for (let i = 0; i < calls.length; i++) {
            for (let j = i + 1; j < calls.length; j++) {
                for (let k = j + 1; k < calls.length; k++) {
                    const leg1 = calls[i]; // Venda
                    const leg2 = calls[j]; // Compra 2x
                    const leg3 = calls[k]; // Venda
                    
                    const dist1 = leg2.strike - leg1.strike;
                    const dist2 = leg3.strike - leg2.strike;
                    if (Math.abs(dist1 - dist2) > 0.01) continue;

                    const netCredit = leg1.premio - (2 * leg2.premio) + leg3.premio;
                    if (netCredit <= 0) continue;

                    results.push({
                        name: this.name,
                        asset: leg1.ativo_subjacente,
                        spread_type: 'SHORT BUTTERFLY',
                        expiration: leg1.vencimento,
                        strike_description: `V:${leg1.strike.toFixed(2)} | 2xC:${leg2.strike.toFixed(2)} | V:${leg3.strike.toFixed(2)}`,
                        asset_price: assetPrice,
                        net_premium: netCredit,
                        initialCashFlow: netCredit,
                        natureza: 'CRÉDITO' as NaturezaOperacao,
                        risco_maximo: dist1 - netCredit,
                        lucro_maximo: netCredit,
                        max_profit: netCredit,
                        max_loss: -(dist1 - netCredit),
                        breakEvenPoints: [Number((leg1.strike + netCredit).toFixed(2)), Number((leg3.strike - netCredit).toFixed(2))],
                        roi: netCredit / (dist1 - netCredit),
                        greeks: {
                            delta: (leg1.gregas_unitarias.delta - (2 * leg2.gregas_unitarias.delta) + leg3.gregas_unitarias.delta) * -1,
                            gamma: (leg1.gregas_unitarias.gamma - (2 * leg2.gregas_unitarias.gamma) + leg3.gregas_unitarias.gamma) * -1,
                            theta: (leg1.gregas_unitarias.theta - (2 * leg2.gregas_unitarias.theta) + leg3.gregas_unitarias.theta) * -1,
                            vega: (leg1.gregas_unitarias.vega - (2 * leg2.gregas_unitarias.vega) + leg3.gregas_unitarias.vega) * -1,
                        },
                        pernas: [
                            { derivative: leg1, direction: 'VENDA', multiplier: 1, display: `[V] 1x K:${leg1.strike}` },
                            { derivative: leg2, direction: 'COMPRA', multiplier: 2, display: `[C] 2x K:${leg2.strike}` },
                            { derivative: leg3, direction: 'VENDA', multiplier: 1, display: `[V] 1x K:${leg3.strike}` }
                        ]
                    } as StrategyMetrics);
                }
            }
        }
        return results;
    }

    getDescription(): string {
        return 'Venda de borboleta. Lucra com a volatilidade, onde o preço do ativo deve sair da faixa dos strikes.';
    }

    getLegCount(): number { return 3; }
}