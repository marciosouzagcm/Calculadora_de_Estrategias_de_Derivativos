import { IStrategy } from '../interfaces/IStrategy';
import { 
    Greeks, 
    NaturezaOperacao, 
    OptionLeg, 
    StrategyMetrics 
} from '../interfaces/Types';

/**
 * Helper: Gera a string de exibição para as pernas do Straddle.
 */
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'COMPRA' ? '[C]' : '[V]';
    return `${action} ${leg.option_ticker} (${typeInitial}) K:${strike.toFixed(2)}`;
}

/**
 * CLASSE: Long Straddle
 * FUNCIONALIDADE: Compra de uma CALL e uma PUT com o mesmo strike e mesmo vencimento.
 * OBJETIVO: Lucrar com um movimento forte do ativo subjacente, independente da direção.
 * CARACTERÍSTICA: Delta Neutro (inicialmente), Theta Negativo e Vega Positivo.
 */
export class LongStraddle implements IStrategy {
    public readonly name: string = 'Long Straddle';
    public readonly marketView: 'VOLÁTIL' = 'VOLÁTIL'; 

    /**
     * Scanner: Busca pares de Call/Put no mesmo vencimento e strike (com tolerância).
     */
    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];

        // 1. Agrupar opções por vencimento para otimizar o scanner
        const groupsByDate: { [date: string]: OptionLeg[] } = {};
        
        allOptions.forEach(leg => {
            if (!leg.vencimento || leg.tipo === 'SUBJACENTE' || leg.premio <= 0) return;
            const dateKey = String(leg.vencimento).split(/[T ]/)[0];
            if (!groupsByDate[dateKey]) groupsByDate[dateKey] = [];
            groupsByDate[dateKey].push(leg);
        });

        // 2. Analisar cada grupo de vencimento
        for (const date in groupsByDate) {
            const options = groupsByDate[date];
            const calls = options.filter(o => o.tipo === 'CALL');
            const puts = options.filter(o => o.tipo === 'PUT');

            for (const call of calls) {
                for (const put of puts) {
                    /**
                     * VALIDAÇÃO DE STRIKE (Pulo do Gato):
                     * Usamos uma tolerância de 0.6% para unir strikes que deveriam ser idênticos
                     * mas sofrem pequenos desvios por ajustes de proventos.
                     */
                    const strikeDiff = Math.abs(call.strike! - put.strike!);
                    const avgStrike = (call.strike! + put.strike!) / 2;

                    if (strikeDiff > (avgStrike * 0.006)) continue; 

                    // Filtro de Proximidade: Straddles são montados "At-The-Money" (ATM)
                    if (Math.abs(avgStrike - assetPrice) / assetPrice > 0.10) continue;

                    // --- Cálculo Financeiro (DÉBITO) ---
                    const netCost = call.premio + put.premio;
                    if (netCost <= 0.05) continue;

                    // Lucro máximo é tecnicamente infinito na alta, mas usamos um valor simbólico ou null
                    const maxProfit = Infinity; 
                    
                    // Gregas Consolidadas
                    const g: Greeks = {
                        delta: Number(((call.gregas_unitarias?.delta || 0) + (put.gregas_unitarias?.delta || 0)).toFixed(4)),
                        gamma: Number(((call.gregas_unitarias?.gamma || 0) + (put.gregas_unitarias?.gamma || 0)).toFixed(4)),
                        theta: Number(((call.gregas_unitarias?.theta || 0) + (put.gregas_unitarias?.theta || 0)).toFixed(4)),
                        vega: Number(((call.gregas_unitarias?.vega || 0) + (put.gregas_unitarias?.vega || 0)).toFixed(4)),
                    };

                    results.push({
                        name: this.name,
                        asset: call.ativo_subjacente,
                        spread_type: 'STRADDLE',
                        expiration: date,
                        dias_uteis: call.dias_uteis || 0,
                        strike_description: `K: ${avgStrike.toFixed(2)}`,
                        asset_price: assetPrice,
                        net_premium: -netCost,
                        initialCashFlow: -netCost,
                        natureza: 'DÉBITO' as NaturezaOperacao,
                        max_profit: maxProfit,
                        max_loss: -netCost,
                        lucro_maximo: maxProfit,
                        risco_maximo: netCost,
                        roi: 0, // ROI é indefinido para lucro infinito
                        breakEvenPoints: [
                            Number((avgStrike - netCost).toFixed(2)), 
                            Number((avgStrike + netCost).toFixed(2))
                        ],
                        greeks: g,
                        pernas: [
                            { derivative: call, direction: 'COMPRA', multiplier: 1, display: generateDisplay(call, 'COMPRA', call.strike!) },
                            { derivative: put, direction: 'COMPRA', multiplier: 1, display: generateDisplay(put, 'COMPRA', put.strike!) }
                        ]
                    } as StrategyMetrics);
                }
            }
        }
        return results;
    }

    getDescription(): string { 
        return 'Estratégia de volatilidade pura. Consiste na compra simultânea de uma Call e uma Put de mesmo strike. O lucro ocorre se o ativo se mover agressivamente para qualquer lado.'; 
    }

    getLegCount(): number { return 2; }
}