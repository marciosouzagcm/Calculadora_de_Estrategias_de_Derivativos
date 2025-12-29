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

        allOptions.forEach(opt => {
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

                    if (this.isStraddle) {
                        // Straddle: Diferença mínima (ajuste para PETR4)
                        if (strikeDiff > (avgStrike * 0.01)) continue;
                    } else {
                        // Strangle: Strikes obrigatoriamente diferentes
                        if (strikeDiff < (avgStrike * 0.02)) continue;
                    }

                    const premiumTotal = call.premio + put.premio;
                    if (premiumTotal < 0.10) continue;

                    results.push({
                        name: this.name,
                        asset: call.ativo_subjacente,
                        asset_price: spotPrice,
                        expiration: date,
                        strike_description: this.isStraddle ? `K: ${avgStrike.toFixed(2)}` : `P${put.strike} | C${call.strike}`,
                        net_premium: Number((this.isLong ? -premiumTotal : premiumTotal).toFixed(2)),
                        natureza: (this.isLong ? 'DÉBITO' : 'CRÉDITO') as NaturezaOperacao,
                        max_profit: this.isLong ? 999999 : Number(premiumTotal.toFixed(2)),
                        max_loss: this.isLong ? Number(premiumTotal.toFixed(2)) : 999999,
                        roi: this.isLong ? 0 : (premiumTotal / (spotPrice * 0.15)),
                        breakEvenPoints: [
                            Number((avgStrike - premiumTotal).toFixed(2)),
                            Number((avgStrike + premiumTotal).toFixed(2))
                        ],
                        pernas: [
                            { direction: this.isLong ? 'COMPRA' : 'VENDA', multiplier: 1, derivative: call, display: `${this.isLong ? 'C' : 'V'}-CALL K${call.strike}` },
                            { direction: this.isLong ? 'COMPRA' : 'VENDA', multiplier: 1, derivative: put, display: `${this.isLong ? 'C' : 'V'}-PUT K${put.strike}` }
                        ]
                    } as any);
                }
            }
        }
        return results;
    }

    getLegCount(): number { return 2; }
    generatePayoff(): any[] { return []; }
    getDescription(): string { return this.name; }
}

// OS NOMES ABAIXO DEVEM SER EXATAMENTE ESTES:
export class LongStraddle extends VolatilityBase { name = 'Long Straddle'; isLong = true; isStraddle = true; }
export class ShortStraddle extends VolatilityBase { name = 'Short Straddle'; isLong = false; isStraddle = true; }
export class LongStrangle extends VolatilityBase { name = 'Long Strangle'; isLong = true; isStraddle = false; }
export class ShortStrangle extends VolatilityBase { name = 'Short Strangle'; isLong = false; isStraddle = false; }