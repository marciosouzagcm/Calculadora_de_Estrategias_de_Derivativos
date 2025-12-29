import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, StrategyMetrics } from '../interfaces/Types';

function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.option_ticker} K${strike.toFixed(2)}`;
}

export class LongStraddle implements IStrategy {
    public readonly name: string = 'Long Straddle';
    public readonly marketView: 'VOLÁTIL' = 'VOLÁTIL'; 

    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];

        // 1. Agrupar por data de vencimento primeiro (Obrigatório para Straddle)
        const groupsByDate: { [date: string]: OptionLeg[] } = {};
        
        allOptions.forEach(leg => {
            if (!leg.vencimento || leg.tipo === 'SUBJACENTE') return;
            // Normaliza a data para evitar problemas com ISO Strings (T00:00:00Z)
            const dateKey = String(leg.vencimento).split(/[T ]/)[0];
            if (!groupsByDate[dateKey]) groupsByDate[dateKey] = [];
            groupsByDate[dateKey].push(leg);
        });

        // 2. Analisar cada vencimento
        for (const date in groupsByDate) {
            const options = groupsByDate[date];
            const calls = options.filter(o => o.tipo === 'CALL');
            const puts = options.filter(o => o.tipo === 'PUT');

            for (const call of calls) {
                for (const put of puts) {
                    // --- O PULO DO GATO: TOLERÂNCIA DE STRIKE ---
                    // Em vez de call.strike === put.strike, usamos uma margem de 0.6%
                    // Isso une strikes como 30.12 e 30.15 de PETR4
                    const strikeDiff = Math.abs(call.strike! - put.strike!);
                    const avgStrike = (call.strike! + put.strike!) / 2;

                    if (strikeDiff > (avgStrike * 0.006)) continue; 

                    // Filtro de Proximidade (Opcional - 15% do spot)
                    if (Math.abs(avgStrike - assetPrice) / assetPrice > 0.15) continue;

                    const netCost = call.premio + put.premio;
                    if (netCost <= 0.05) continue;

                    // Gregas Net com tratamento de erro
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
                        net_premium: Number((-netCost).toFixed(2)),
                        initialCashFlow: Number((-netCost).toFixed(2)),
                        natureza: 'DÉBITO' as NaturezaOperacao,
                        max_profit: 999999,
                        max_loss: Number((-netCost).toFixed(2)),
                        lucro_maximo: 999999,
                        risco_maximo: Number(netCost.toFixed(2)),
                        roi: 0,
                        breakEvenPoints: [
                            Number((avgStrike - netCost).toFixed(2)), 
                            Number((avgStrike + netCost).toFixed(2))
                        ],
                        greeks: g,
                        pernas: [
                            { derivative: call, direction: 'COMPRA', multiplier: 1, display: generateDisplay(call, 'COMPRA', call.strike!) },
                            { derivative: put, direction: 'COMPRA', multiplier: 1, display: generateDisplay(put, 'COMPRA', put.strike!) }
                        ]
                    } as any);
                }
            }
        }
        return results;
    }

    getDescription(): string { return 'Compra de Call e Put no mesmo strike.'; }
    getLegCount(): number { return 2; }
    generatePayoff(): any[] { return []; }
}