import { IStrategy } from '../interfaces/IStrategy';
import { OptionLeg, StrategyMetrics, NaturezaOperacao, Greeks } from '../interfaces/Types';

export abstract class VolatilityBase implements IStrategy {
    abstract name: string;
    abstract isLong: boolean;
    abstract isStraddle: boolean;
    public marketView: 'VOLÁTIL' | 'NEUTRA' = 'VOLÁTIL';

    calculateMetrics(allOptions: OptionLeg[], spotPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];
        const expirationGroups: Record<string, OptionLeg[]> = {};

        // 1. Agrupamento por Vencimento
        allOptions.forEach(opt => {
            if (!opt.vencimento || opt.tipo === 'SUBJACENTE') return;
            const dateStr = String(opt.vencimento).split(/[T ]/)[0];
            if (!expirationGroups[dateStr]) expirationGroups[dateStr] = [];
            expirationGroups[dateStr].push(opt);
        });

        for (const date in expirationGroups) {
            const options = expirationGroups[date];
            const calls = options.filter(o => o.tipo === 'CALL');
            const puts = options.filter(o => o.tipo === 'PUT');

            for (const call of calls) {
                for (const put of puts) {
                    const strikeDiff = Math.abs(call.strike! - put.strike!);
                    const avgStrike = (call.strike! + put.strike!) / 2;

                    // --- Filtros de Estrutura ---
                    if (this.isStraddle) {
                        // Straddle: Strikes quase idênticos
                        if (strikeDiff > (avgStrike * 0.01)) continue;
                    } else {
                        // Strangle: Put deve ter strike menor que a Call
                        if (put.strike! >= call.strike!) continue;
                        // Opcional: Evitar strikes muito longe do spot
                        if (Math.abs(avgStrike - spotPrice) / spotPrice > 0.20) continue;
                    }

                    const premiumTotal = call.premio + put.premio;
                    if (premiumTotal < 0.05) continue;

                    // --- Cálculo de Gregas ---
                    const getG = (l: OptionLeg) => l.gregas_unitarias || { delta: 0, gamma: 0, theta: 0, vega: 0 };
                    const gC = getG(call);
                    const gP = getG(put);
                    const mult = this.isLong ? 1 : -1;

                    const netGreeks: Greeks = {
                        delta: Number((mult * (gC.delta + gP.delta)).toFixed(4)),
                        gamma: Number((mult * (gC.gamma + gP.gamma)).toFixed(4)),
                        theta: Number((mult * (gC.theta + gP.theta)).toFixed(4)),
                        vega: Number((mult * (gC.vega + gP.vega)).toFixed(4)),
                    };

                    // --- Breakevens ---
                    // No Strangle, os breakevens partem dos strikes individuais
                    const beLow = (this.isStraddle ? avgStrike : put.strike!) - premiumTotal;
                    const beHigh = (this.isStraddle ? avgStrike : call.strike!) + premiumTotal;

                    results.push({
                        name: this.name,
                        asset: call.ativo_subjacente,
                        asset_price: spotPrice,
                        expiration: date,
                        dias_uteis: call.dias_uteis || 0,
                        strike_description: this.isStraddle ? `K: ${avgStrike.toFixed(2)}` : `P:${put.strike} | C:${call.strike}`,
                        net_premium: Number((this.isLong ? -premiumTotal : premiumTotal).toFixed(2)),
                        initialCashFlow: Number((this.isLong ? -premiumTotal : premiumTotal).toFixed(2)),
                        natureza: (this.isLong ? 'DÉBITO' : 'CRÉDITO') as NaturezaOperacao,
                        max_profit: this.isLong ? Infinity : Number(premiumTotal.toFixed(2)),
                        max_loss: this.isLong ? Number((-premiumTotal).toFixed(2)) : -Infinity,
                        lucro_maximo: this.isLong ? Infinity : Number(premiumTotal.toFixed(2)),
                        risco_maximo: this.isLong ? Number(premiumTotal.toFixed(2)) : Infinity,
                        roi: this.isLong ? 0 : (premiumTotal / (spotPrice * 0.15)),
                        breakEvenPoints: [Number(beLow.toFixed(2)), Number(beHigh.toFixed(2))],
                        greeks: netGreeks,
                        pernas: [
                            { direction: this.isLong ? 'COMPRA' : 'VENDA', multiplier: 1, derivative: call, display: `${this.isLong ? 'C' : 'V'}-CALL K${call.strike}` },
                            { direction: this.isLong ? 'COMPRA' : 'VENDA', multiplier: 1, derivative: put, display: `${this.isLong ? 'C' : 'V'}-PUT K${put.strike}` }
                        ]
                    } as StrategyMetrics);
                }
            }
        }
        return results;
    }

    getLegCount(): number { return 2; }
    generatePayoff(): any[] { return []; }
    getDescription(): string { 
        if (this.isStraddle) return this.isLong ? 'Compra de Call e Put no mesmo strike.' : 'Venda de Call e Put no mesmo strike.';
        return this.isLong ? 'Compra de Call e Put com strikes diferentes.' : 'Venda de Call e Put com strikes diferentes.';
    }
}

// Implementações concretas
export class LongStraddle extends VolatilityBase { name = 'Long Straddle'; isLong = true; isStraddle = true; marketView = 'VOLÁTIL' as const; }
export class ShortStraddle extends VolatilityBase { name = 'Short Straddle'; isLong = false; isStraddle = true; marketView = 'NEUTRA' as const; }
export class LongStrangle extends VolatilityBase { name = 'Long Strangle'; isLong = true; isStraddle = false; marketView = 'VOLÁTIL' as const; }
export class ShortStrangle extends VolatilityBase { name = 'Short Strangle'; isLong = false; isStraddle = false; marketView = 'NEUTRA' as const; }