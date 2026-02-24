import { IStrategy } from '../interfaces/IStrategy.js';
import { 
    Greeks, 
    NaturezaOperacao, 
    OptionLeg, 
    StrategyMetrics 
} from '../interfaces/Types.js';

export class CalendarSpread implements IStrategy {
    public readonly name: string = 'Calendar Spread (Trava de Linha)';
    public readonly marketView: 'NEUTRA' = 'NEUTRA';

    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];
        
        const validOptions = allOptions.filter(o => 
            o.tipo !== 'SUBJACENTE' && 
            o.strike && o.strike > 0 && 
            o.premio && o.premio > 0
        );

        for (let i = 0; i < validOptions.length; i++) {
            for (let j = 0; j < validOptions.length; j++) {
                if (i === j) continue;

                const legShort = validOptions[i]; // Candidata a Venda
                const legLong = validOptions[j];  // Candidata a Compra

                // 1. Mesmo Tipo (Call/Put)
                if (legShort.tipo !== legLong.tipo) continue;

                // 2. Mesmo Strike (tolerância 0.6%)
                const s1 = legShort.strike || 0;
                const s2 = legLong.strike || 0;
                if (Math.abs(s1 - s2) > (s1 * 0.006)) continue;

                // 3. TRAVA DE DATA (Transforma em número puro para não ter erro)
                const d1 = new Date(legShort.vencimento).getTime();
                const d2 = new Date(legLong.vencimento).getTime();

                // Se a vendida vencer DEPOIS ou no MESMO dia da comprada, ignora.
                if (d1 >= d2) continue;

                // 4. TRAVA DE PRÊMIO (Custo deve ser positivo)
                // A opção longa PRECISA ser mais cara. Se der negativo, a estrutura está invertida.
                const netCost = legLong.premio - legShort.premio;
                if (netCost <= 0) continue;

                const estimatedMaxProfit = Number((netCost * 0.6).toFixed(2));
                
                const netGreeks: Greeks = {
                    delta: Number((legLong.gregas_unitarias.delta - legShort.gregas_unitarias.delta).toFixed(4)),
                    gamma: Number((legLong.gregas_unitarias.gamma - legShort.gregas_unitarias.gamma).toFixed(4)),
                    theta: Number((legLong.gregas_unitarias.theta - legShort.gregas_unitarias.theta).toFixed(4)),
                    vega: Number((legLong.gregas_unitarias.vega - legShort.gregas_unitarias.vega).toFixed(4)),
                    rho: Number(((legLong.gregas_unitarias.rho || 0) - (legShort.gregas_unitarias.rho || 0)).toFixed(4))
                };

                results.push({
                    name: this.name,
                    asset: legLong.ativo_subjacente,
                    asset_price: assetPrice,
                    spread_type: 'HORIZONTAL SPREAD',
                    expiration: String(legShort.vencimento).substring(0, 10),
                    strike_description: `K: ${legLong.strike?.toFixed(2)} (${legLong.tipo})`,
                    net_premium: -netCost,
                    initialCashFlow: -netCost,
                    natureza: 'DÉBITO' as NaturezaOperacao,
                    max_profit: estimatedMaxProfit,
                    max_loss: -netCost,
                    lucro_maximo: estimatedMaxProfit,
                    risco_maximo: netCost,
                    roi: estimatedMaxProfit / netCost,
                    dias_uteis: legShort.dias_uteis || 0,
                    breakEvenPoints: [], 
                    greeks: netGreeks,
                    pernas: [
                        { derivative: legShort, direction: 'VENDA', multiplier: 1, display: `[V] ${legShort.option_ticker}` },
                        { derivative: legLong, direction: 'COMPRA', multiplier: 1, display: `[C] ${legLong.option_ticker}` }
                    ]
                } as StrategyMetrics);
            }
        }
        return results;
    }

    getDescription(): string { return "Trava de linha horizontal."; }
    getLegCount(): number { return 2; }
}