import { IStrategy } from '../interfaces/IStrategy.js';
import { OptionLeg, StrategyMetrics, NaturezaOperacao, Greeks } from '../interfaces/Types.js';

/**
 * BOARDPRO V40.1 - Volatility Strategy Base
 * Gerencia Long/Short Straddles e Strangles.
 */
export abstract class VolatilityBase implements IStrategy {
    abstract name: string;
    abstract isLong: boolean;
    abstract isStraddle: boolean;
    public marketView: 'VOLÁTIL' | 'NEUTRA' = 'VOLÁTIL';

    calculateMetrics(allOptions: OptionLeg[], spotPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];
        const expirationGroups: Record<string, OptionLeg[]> = {};

        // 1. Agrupamento por Vencimento para garantir que as pernas coincidam
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
                    
                    // --- Validação de Estrutura ---
                    if (this.isStraddle) {
                        // Straddle: Mesmos strikes (tolerância de 2% para strikes ATM da B3)
                        if (strikeDiff > (call.strike! * 0.02)) continue; 
                    } else {
                        // Strangle: Put deve ter strike menor que a Call (OTM)
                        if (put.strike! >= call.strike!) continue;
                    }

                    const premiumTotal = call.premio + put.premio;
                    if (premiumTotal < 0.05) continue; // Filtra opções com baixíssima liquidez

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
                    const lowerStrikeBase = this.isStraddle ? call.strike! : put.strike!;
                    const upperStrikeBase = call.strike!;
                    
                    const beLow = lowerStrikeBase - premiumTotal;
                    const beHigh = upperStrikeBase + premiumTotal;

                    // --- Gestão de Risco e ROI ---
                    // IMPORTANTE: Mantemos valores numéricos para não quebrar o motor de cálculo.
                    // '999999' sinaliza ao frontend/serviço o conceito de ilimitado.
                    const margemEstimada = spotPrice * 0.25; // Margem B3 costuma variar de 15% a 30%
                    
                    const lucroMax = this.isLong ? 999999 : premiumTotal;
                    const riscoMax = this.isLong ? premiumTotal : 999999;

                    results.push({
                        name: this.name,
                        asset: call.ativo_subjacente,
                        asset_price: spotPrice,
                        expiration: date,
                        dias_uteis: call.dias_uteis || 0,
                        strike_description: this.isStraddle ? `K: ${call.strike!.toFixed(2)}` : `P:${put.strike} | C:${call.strike}`,
                        net_premium: this.isLong ? -premiumTotal : premiumTotal,
                        initialCashFlow: this.isLong ? -premiumTotal : premiumTotal,
                        natureza: (this.isLong ? 'DÉBITO' : 'CRÉDITO') as NaturezaOperacao,

                        max_profit: lucroMax,
                        max_loss: riscoMax,
                        lucro_maximo: lucroMax,
                        risco_maximo: this.isLong ? premiumTotal : margemEstimada, // Para ROI usamos margem no Short
                        
                        roi: this.isLong ? (lucroMax / premiumTotal) : (premiumTotal / margemEstimada),
                        breakEvenPoints: [Number(beLow.toFixed(2)), Number(beHigh.toFixed(2))],
                        greeks: netGreeks,
                        pernas: [
                            { derivative: call, direction: this.isLong ? 'COMPRA' : 'VENDA', multiplier: 1, display: `[${this.isLong ? 'C' : 'V'}] Call K:${call.strike}` },
                            { derivative: put, direction: this.isLong ? 'COMPRA' : 'VENDA', multiplier: 1, display: `[${this.isLong ? 'C' : 'V'}] Put K:${put.strike}` }
                        ]
                    } as StrategyMetrics);
                }
            }
        }
        return results;
    }

    getLegCount(): number { return 2; }
}

// Implementações concretas com Visão de Mercado ajustada
export class LongStraddle extends VolatilityBase { name = 'Long Straddle'; isLong = true; isStraddle = true; marketView = 'VOLÁTIL' as const; }
export class ShortStraddle extends VolatilityBase { name = 'Short Straddle'; isLong = false; isStraddle = true; marketView = 'NEUTRA' as const; }
export class LongStrangle extends VolatilityBase { name = 'Long Strangle'; isLong = true; isStraddle = false; marketView = 'VOLÁTIL' as const; }
export class ShortStrangle extends VolatilityBase { name = 'Short Strangle'; isLong = false; isStraddle = false; marketView = 'NEUTRA' as const; }