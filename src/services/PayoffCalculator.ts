import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, OptionLeg, StrategyMetrics } from '../interfaces/Types';
import { BlackScholes } from './BlackScholes';

// Importações
import { BearCallSpread } from '../strategies/BearCallSpread';
import { BearPutSpread } from '../strategies/BearPutSpread';
import { BullCallSpread } from '../strategies/BullCallSpread';
import { BullPutSpread } from '../strategies/BullPutSpread';
import { CallRatioSpread } from '../strategies/CallRatioSpread';
import { LongCollar } from '../strategies/LongCollar';
import { LongStraddle } from '../strategies/LongStraddle';
import { LongStrangle } from '../strategies/LongStrangle';
import { ShortStraddle } from '../strategies/ShortStraddle';
import { ShortStrangle } from '../strategies/ShortStrangle';

type OptionGroupMap = { [key: string]: OptionLeg[] }; 

export const SPREAD_MAP: { [key: number]: { name: string, strategy: IStrategy }[] } = {
    0: [
        { name: 'Bull Call Spread', strategy: new BullCallSpread() },
        { name: 'Bear Call Spread', strategy: new BearCallSpread() },
        { name: 'Bull Put Spread', strategy: new BullPutSpread() },
        { name: 'Bear Put Spread', strategy: new BearPutSpread() }, 
        { name: 'Long Straddle', strategy: new LongStraddle() },
        { name: 'Short Straddle', strategy: new ShortStraddle() },
        { name: 'Long Strangle', strategy: new LongStrangle() },
        { name: 'Short Strangle', strategy: new ShortStrangle() },
        { name: 'Booster (Ratio Spread)', strategy: new CallRatioSpread() },
        { name: 'Rochedo (Long Collar)', strategy: new LongCollar() },
    ],
};

export class PayoffCalculator {
    private optionsData: OptionLeg[];
    private feePerLeg: number; 
    private lotSize: number;

    constructor(optionsData: OptionLeg[], feePerLeg: number, lotSize: number) { 
        this.optionsData = optionsData;
        this.feePerLeg = feePerLeg;
        this.lotSize = lotSize;
    }

    private findTwoLegCombinationsSameType(options: OptionLeg[], targetType: 'CALL' | 'PUT'): OptionLeg[][] {
        const combinations: OptionLeg[][] = [];
        const filtered = options.filter(o => o.tipo === targetType);
        const groups = filtered.reduce((acc, current) => {
            const key = `${current.ativo_subjacente}-${current.vencimento}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(current);
            return acc; 
        }, {} as OptionGroupMap);

        for (const key in groups) {
            const group = groups[key].sort((a, b) => (a.strike || 0) - (b.strike || 0));
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    combinations.push([group[i], group[j]]);
                }
            }
        }
        return combinations;
    }

    private findTwoLegCombinationsDifferentType(options: OptionLeg[], mustHaveSameStrike: boolean = false): OptionLeg[][] {
        const combinations: OptionLeg[][] = [];
        const calls = options.filter(o => o.tipo === 'CALL');
        const puts = options.filter(o => o.tipo === 'PUT');
        const TOLERANCE = 0.10;

        for (const callLeg of calls) {
            for (const putLeg of puts) {
                if (callLeg.vencimento !== putLeg.vencimento) continue;
                const strikeCall = callLeg.strike ?? 0;
                const strikePut = putLeg.strike ?? 0;
                const sameStrike = Math.abs(strikeCall - strikePut) < TOLERANCE;
                if ((mustHaveSameStrike && sameStrike) || (!mustHaveSameStrike && !sameStrike)) {
                    combinations.push([callLeg, putLeg]);
                }
            }
        }
        return combinations;
    }

    private calculateNetGreeks(metrics: StrategyMetrics, currentAssetPrice: number): Greeks {
        const SELIC = 0.1075;
        return metrics.pernas.reduce((acc, leg) => {
            const totalFactor = (leg.direction === 'COMPRA' ? 1 : -1) * (leg.multiplier || 1);
            const strikeSafe = leg.derivative.strike ?? 0;
            const tempoAnos = Math.max(leg.derivative.dias_uteis || 1, 1) / 252;
            const volSafe = (leg.derivative.vol_implicita && leg.derivative.vol_implicita > 0) ? leg.derivative.vol_implicita : 0.35;
            
            const unitarias = {
                delta: BlackScholes.calculateDelta(currentAssetPrice, strikeSafe, tempoAnos, volSafe, SELIC, leg.derivative.tipo as any),
                gamma: BlackScholes.calculateGamma(currentAssetPrice, strikeSafe, tempoAnos, volSafe, SELIC),
                theta: BlackScholes.calculateTheta(currentAssetPrice, strikeSafe, tempoAnos, volSafe, SELIC, leg.derivative.tipo as any),
                vega: BlackScholes.calculateVega(currentAssetPrice, strikeSafe, tempoAnos, volSafe, SELIC)
            };

            return {
                delta: (acc.delta || 0) + (unitarias.delta * totalFactor),
                gamma: (acc.gamma || 0) + (unitarias.gamma * totalFactor),
                theta: (acc.theta || 0) + (unitarias.theta * totalFactor),
                vega: (acc.vega || 0) + (unitarias.vega * totalFactor),
            };
        }, { delta: 0, gamma: 0, theta: 0, vega: 0 } as Greeks);
    }

    private normalizeMetrics(metrics: StrategyMetrics, currentAssetPrice: number): StrategyMetrics {
        const profit = typeof metrics.max_profit === 'number' ? metrics.max_profit : 0;
        const loss = Math.abs(typeof metrics.max_loss === 'number' ? metrics.max_loss : 0);
        const totalFees = metrics.pernas.length * (this.feePerLeg / this.lotSize);
        const netProfit = profit - totalFees;
        const netRisk = loss + totalFees;

        metrics.greeks = this.calculateNetGreeks(metrics, currentAssetPrice);
        // Aumentamos o limite para não descartar estratégias de risco ilimitado
        (metrics as any).riskRewardRatio = netProfit > 0 ? parseFloat((netRisk / netProfit).toFixed(2)) : 999;

        return metrics;
    }

    public findAndCalculateSpreads(currentAssetPrice: number, maxRR: number = 1000): StrategyMetrics[] {
        const strategiesToRun = SPREAD_MAP[0];
        let results: StrategyMetrics[] = [];

        const sameCall = this.findTwoLegCombinationsSameType(this.optionsData, 'CALL');
        const samePut = this.findTwoLegCombinationsSameType(this.optionsData, 'PUT');
        const diffStrike = this.findTwoLegCombinationsDifferentType(this.optionsData, false);
        const sameStrike = this.findTwoLegCombinationsDifferentType(this.optionsData, true);

        for (const sObj of strategiesToRun) {
            let combos: OptionLeg[][] = [];
            
            if (sObj.strategy instanceof BullCallSpread || sObj.strategy instanceof BearCallSpread || sObj.strategy instanceof CallRatioSpread) {
                combos = sameCall; 
            } else if (sObj.strategy instanceof BullPutSpread || sObj.strategy instanceof BearPutSpread) {
                combos = samePut;
            } else if (sObj.strategy instanceof LongStraddle || sObj.strategy instanceof ShortStraddle) {
                combos = sameStrike;
            } else if (sObj.strategy instanceof LongStrangle || sObj.strategy instanceof ShortStrangle || sObj.strategy instanceof LongCollar) {
                combos = diffStrike;
            }

            // LOG DE DIAGNÓSTICO
            if (combos.length > 0) {
                console.log(`Buscando ${sObj.name}: ${combos.length} combinações encontradas.`);
            }

            for (const combo of combos) {
                try {
                    const metricsArray = sObj.strategy.calculateMetrics(combo, currentAssetPrice, 0); 
                    
                    if (Array.isArray(metricsArray) && metricsArray.length > 0) {
                        metricsArray.forEach(res => {
                            const normalized = this.normalizeMetrics(res, currentAssetPrice);
                            // Permitimos um RR muito alto (1000) para estratégias de ratio/naked
                            if ((normalized as any).riskRewardRatio <= maxRR) {
                                results.push(normalized);
                            }
                        });
                    }
                } catch (e) {}
            }
        }
        
        console.log(`Total final no scanner: ${results.length} oportunidades.`);
        return results;
    }
}