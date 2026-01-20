import { IStrategy } from '../interfaces/IStrategy.js';
import { 
    Greeks, 
    NaturezaOperacao, 
    OptionLeg, 
    StrategyMetrics 
} from '../interfaces/Types.js';

/**
 * CLASSE: CalendarSpread (Trava de Linha / Horizontal)
 * FUNCIONALIDADE: Identifica oportunidades onde se vende uma opção de curto prazo 
 * e compra-se uma opção de longo prazo do mesmo tipo (Call ou Put) e mesmo Strike.
 * OBJETIVO: Lucrar com a passagem do tempo (Theta) e a diferença de decaimento temporal.
 */
export class CalendarSpread implements IStrategy {
    public readonly name: string = 'Calendar Spread (Trava de Linha)';
    public readonly marketView: 'NEUTRA' = 'NEUTRA';

    /**
     * Scanner: Compara todos os pares de opções para encontrar spreads horizontais.
     * Complexidade O(n²) - filtrado por Strike e Tipo.
     */
    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];
        
        // Filtro prévio para otimizar o loop: Remove o que não é opção ou não tem strike/prêmio
        const validOptions = allOptions.filter(o => 
            o.tipo !== 'SUBJACENTE' && 
            o.strike && o.strike > 0 && 
            o.premio && o.premio > 0
        );

        for (let i = 0; i < validOptions.length; i++) {
            for (let j = 0; j < validOptions.length; j++) {
                if (i === j) continue;

                const legShort = validOptions[i]; // Opção de Curto Prazo (Venda)
                const legLong = validOptions[j];  // Opção de Longo Prazo (Compra)

                // 1. Validação de Tipo: Devem ser ambas CALL ou ambas PUT
                if (legShort.tipo !== legLong.tipo) continue;

                // 2. Validação de Strike: Devem ser o mesmo strike (ou muito próximos)
                // Tolerância de 0.6% para lidar com ajustes de dividendos ou arredondamentos de corretoras
                const strikeDiff = Math.abs(legShort.strike! - legLong.strike!);
                if (strikeDiff > (legShort.strike! * 0.006)) continue;

                // 3. Validação Cronológica: Short deve vencer antes da Long
                const dateShort = new Date(legShort.vencimento).getTime();
                const dateLong = new Date(legLong.vencimento).getTime();
                if (dateShort >= dateLong) continue;

                // --- Cálculo Financeiro (DÉBITO) ---
                const netCost = legLong.premio - legShort.premio;

                /**
                 * FILTRO DE SANIDADE:
                 * O custo de uma trava de linha deve ser positivo, pois a opção longa 
                 * (com mais valor tempo) deve ser sempre mais cara que a curta.
                 */
                if (netCost <= 0.05) continue;

                // Estimativa de Lucro Máximo (Aprox. 60% do custo em cenários de baixa vol)
                // Nota: Em Calendar, o lucro máximo ocorre se o ativo estiver EXATAMENTE no strike no vencimento da curta.
                const estimatedMaxProfit = Number((netCost * 0.6).toFixed(2));
                const roi = estimatedMaxProfit / netCost;

                // --- Cálculo de Gregas Net ---
                const netGreeks: Greeks = {
                    delta: Number((legLong.gregas_unitarias.delta - legShort.gregas_unitarias.delta).toFixed(4)),
                    gamma: Number((legLong.gregas_unitarias.gamma - legShort.gregas_unitarias.gamma).toFixed(4)),
                    theta: Number((legLong.gregas_unitarias.theta - legShort.gregas_unitarias.theta).toFixed(4)),
                    vega: Number((legLong.gregas_unitarias.vega - legShort.gregas_unitarias.vega).toFixed(4)),
                };

                // 4. Estruturação do Resultado
                results.push({
                    name: this.name,
                    asset: legLong.ativo_subjacente,
                    asset_price: assetPrice,
                    spread_type: 'HORIZONTAL SPREAD',
                    expiration: String(legShort.vencimento).split(/[T ]/)[0], // Vencimento da ponta vendida
                    strike_description: `K: ${legLong.strike?.toFixed(2)} (${legLong.tipo})`,
                    net_premium: -netCost,
                    initialCashFlow: -netCost,
                    natureza: 'DÉBITO' as NaturezaOperacao,
                    max_profit: estimatedMaxProfit,
                    max_loss: -netCost,
                    lucro_maximo: estimatedMaxProfit,
                    risco_maximo: netCost,
                    roi: roi,
                    dias_uteis: legShort.dias_uteis || 0, // RESOLVE O ERRO TS2352
                    breakEvenPoints: [], // O BE de Calendar é dinâmico (depende da Vol)
                    greeks: netGreeks,
                    pernas: [
                        { 
                            derivative: legShort, 
                            direction: 'VENDA', 
                            multiplier: 1, 
                            display: `[V] ${legShort.option_ticker} Exp: ${String(legShort.vencimento).split(/[T ]/)[0]}` 
                        },
                        { 
                            derivative: legLong, 
                            direction: 'COMPRA', 
                            multiplier: 1, 
                            display: `[C] ${legLong.option_ticker} Exp: ${String(legLong.vencimento).split(/[T ]/)[0]}` 
                        }
                    ]
                } as StrategyMetrics);
            }
        }
        return results;
    }

    getDescription(): string {
        return "Estratégia neutra que explora o decaimento temporal (Time Decay). O lucro ocorre se o ativo ficar parado próximo ao strike, fazendo a opção curta desvalorizar mais rápido que a longa.";
    }

    getLegCount(): number { return 2; }
}