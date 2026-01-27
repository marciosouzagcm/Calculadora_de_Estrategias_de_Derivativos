import { IStrategy } from '../interfaces/IStrategy.js';
import { Greeks, NaturezaOperacao, OptionLeg, StrategyMetrics } from '../interfaces/Types.js';

/**
 * CLASSE: Short Iron Condor
 * ESTRUTURA: Venda de Put OTM + Compra de Put OTM (mais longe) + Venda de Call OTM + Compra de Call OTM (mais longe)
 */
export class ShortIronCondor implements IStrategy {
    public readonly name: string = 'Short Iron Condor';
    public readonly marketView: 'NEUTRA' = 'NEUTRA';

    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];
        
        const calls = allOptions.filter(l => l.tipo === 'CALL' && l.strike > assetPrice && l.premio > 0).sort((a, b) => a.strike - b.strike);
        const puts = allOptions.filter(l => l.tipo === 'PUT' && l.strike < assetPrice && l.premio > 0).sort((a, b) => b.strike - a.strike);

        if (calls.length < 2 || puts.length < 2) return [];

        // Scanner de 4 pontas (Simplificado para pares de travas OTM)
        for (let i = 0; i < puts.length; i++) {
            for (let j = i + 1; j < puts.length; j++) {
                const putShort = puts[i]; // Maior Strike (mais perto do preço)
                const putLong = puts[j];  // Menor Strike (proteção)

                for (let k = 0; k < calls.length; k++) {
                    for (let l = k + 1; l < calls.length; l++) {
                        const callShort = calls[k]; // Menor Strike (mais perto do preço)
                        const callLong = calls[l];  // Maior Strike (proteção)

                        if (putShort.vencimento !== callShort.vencimento) continue;

                        const creditReceived = (putShort.premio - putLong.premio) + (callShort.premio - callLong.premio);
                        if (creditReceived <= 0.10) continue;

                        const putWidth = putShort.strike - putLong.strike;
                        const callWidth = callLong.strike - callShort.strike;
                        const maxRisk = Math.max(putWidth, callWidth) - creditReceived;

                        const greeks: Greeks = {
                            delta: (putShort.gregas_unitarias.delta * -1 + putLong.gregas_unitarias.delta) + 
                                   (callShort.gregas_unitarias.delta * -1 + callLong.gregas_unitarias.delta),
                            gamma: (putShort.gregas_unitarias.gamma * -1 + putLong.gregas_unitarias.gamma) + 
                                   (callShort.gregas_unitarias.gamma * -1 + callLong.gregas_unitarias.gamma),
                            theta: (putShort.gregas_unitarias.theta * -1 + putLong.gregas_unitarias.theta) + 
                                   (callShort.gregas_unitarias.theta * -1 + callLong.gregas_unitarias.theta),
                            vega:  (putShort.gregas_unitarias.vega * -1 + putLong.gregas_unitarias.vega) + 
                                   (callShort.gregas_unitarias.vega * -1 + callLong.gregas_unitarias.vega),
                        };

                        results.push({
                            name: this.name,
                            asset: putShort.ativo_subjacente,
                            spread_type: 'IRON CONDOR',
                            expiration: putShort.vencimento,
                            dias_uteis: putShort.dias_uteis ?? 0,
                            strike_description: `P:${putShort.strike.toFixed(2)} | C:${callShort.strike.toFixed(2)}`,
                            asset_price: assetPrice,
                            net_premium: creditReceived,
                            initialCashFlow: creditReceived,
                            natureza: 'CRÉDITO' as NaturezaOperacao,
                            risco_maximo: maxRisk,
                            lucro_maximo: creditReceived,
                            max_profit: creditReceived,
                            max_loss: -maxRisk,
                            breakEvenPoints: [Number((putShort.strike - creditReceived).toFixed(2)), Number((callShort.strike + creditReceived).toFixed(2))],
                            roi: creditReceived / maxRisk,
                            greeks: greeks,
                            pernas: [
                                { derivative: putLong, direction: 'COMPRA', multiplier: 1, display: `[C] Put K:${putLong.strike}` },
                                { derivative: putShort, direction: 'VENDA', multiplier: 1, display: `[V] Put K:${putShort.strike}` },
                                { derivative: callShort, direction: 'VENDA', multiplier: 1, display: `[V] Call K:${callShort.strike}` },
                                { derivative: callLong, direction: 'COMPRA', multiplier: 1, display: `[C] Call K:${callLong.strike}` }
                            ]
                        } as StrategyMetrics);
                    }
                }
            }
        }
        return results;
    }

    getDescription(): string {
        return 'Estratégia neutra de crédito. Lucra se o ativo permanecer entre os strikes das opções vendidas até o vencimento. Risco e lucro limitados.';
    }

    getLegCount(): number { return 4; }
}