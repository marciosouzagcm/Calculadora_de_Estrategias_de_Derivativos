import { IStrategy } from '../interfaces/IStrategy';
import {
    Greeks,
    OptionLeg,
    ProfitLossValue,
    StrategyMetrics
} from '../interfaces/Types';

import { BlackScholes } from './BlackScholes';

// Importações das estratégias
import { BearCallSpread } from '../strategies/BearCallSpread';
import { BearPutSpread } from '../strategies/BearPutSpread';
import { BullCallSpread } from '../strategies/BullCallSpread';
import { BullPutSpread } from '../strategies/BullPutSpread';
import { ButterflySpread } from '../strategies/ButterflySpread';
import { CalendarSpread } from '../strategies/CalendarSpread';
import { IronCondorSpread } from '../strategies/IronCondorSpread';
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
        { name: 'Long Butterfly Call', strategy: new ButterflySpread() },
        { name: 'Iron Condor Spread', strategy: new IronCondorSpread() },
        { name: 'Calendar Spread', strategy: new CalendarSpread() },
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
            const group = groups[key];
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
        const TOLERANCE = 0.01;

        const callGroups = calls.reduce((acc, curr) => {
            const key = `${curr.ativo_subjacente}-${curr.vencimento}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(curr);
            return acc;
        }, {} as OptionGroupMap);

        const putGroups = puts.reduce((acc, curr) => {
            const key = `${curr.ativo_subjacente}-${curr.vencimento}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(curr);
            return acc;
        }, {} as OptionGroupMap);

        for (const key in callGroups) {
            if (putGroups[key]) {
                for (const callLeg of callGroups[key]) {
                    for (const putLeg of putGroups[key]) {
                        if (callLeg.strike === null || putLeg.strike === null) continue;
                        const sameStrike = Math.abs(callLeg.strike - putLeg.strike) < TOLERANCE;
                        if ((mustHaveSameStrike && sameStrike) || (!mustHaveSameStrike && !sameStrike)) {
                            combinations.push([callLeg, putLeg]);
                        }
                    }
                }
            }
        }
        return combinations;
    }

    private calculateNetGreeks(metrics: StrategyMetrics, currentAssetPrice: number): Greeks {
        const SELIC = 0.1075;

        return metrics.pernas.reduce((acc, leg) => {
            const totalFactor = (leg.direction === 'COMPRA' ? 1 : -1) * leg.multiplier;
            const strikeSafe = leg.derivative.strike ?? 0;
            
            let unitarias = { ...leg.derivative.gregas_unitarias };

            if ((leg.derivative.tipo === 'CALL' || leg.derivative.tipo === 'PUT') && strikeSafe > 0) {
                const tempoAnos = Math.max(leg.derivative.dias_uteis || 1, 1) / 252;
                const volSafe = (leg.derivative.vol_implicita && leg.derivative.vol_implicita > 0.01) 
                                ? leg.derivative.vol_implicita : 0.35;

                unitarias = {
                    delta: BlackScholes.calculateDelta(currentAssetPrice, strikeSafe, tempoAnos, volSafe, SELIC, leg.derivative.tipo),
                    gamma: BlackScholes.calculateGamma(currentAssetPrice, strikeSafe, tempoAnos, volSafe, SELIC),
                    theta: BlackScholes.calculateTheta(currentAssetPrice, strikeSafe, tempoAnos, volSafe, SELIC, leg.derivative.tipo),
                    vega: BlackScholes.calculateVega(currentAssetPrice, strikeSafe, tempoAnos, volSafe, SELIC)
                };
            } else if (leg.derivative.tipo === 'SUBJACENTE') {
                unitarias = { delta: 1, gamma: 0, theta: 0, vega: 0 };
            }

            return {
                delta: (acc.delta ?? 0) + ((unitarias.delta ?? 0) * totalFactor),
                gamma: (acc.gamma ?? 0) + ((unitarias.gamma ?? 0) * totalFactor),
                theta: (acc.theta ?? 0) + ((unitarias.theta ?? 0) * totalFactor),
                vega: (acc.vega ?? 0) + ((unitarias.vega ?? 0) * totalFactor),
            };
        }, { delta: 0, gamma: 0, theta: 0, vega: 0 } as Greeks);
    }

    private normalizeMetrics(metrics: StrategyMetrics, currentAssetPrice: number): StrategyMetrics {
        if (metrics.natureza === 'DÉBITO') {
            const absLoss = Math.abs(Number(metrics.max_loss));
            metrics.max_loss = -absLoss as ProfitLossValue;
            metrics.risco_maximo = -absLoss as ProfitLossValue;
        }

        metrics.initialCashFlow = metrics.initialCashFlow ?? metrics.net_premium;
        metrics.breakEvenPoints = metrics.breakEvenPoints ?? [];
        
        // CORREÇÃO DOS ERROS TS18047: Usando nullish coalescing para garantir Number
        const calculatedGreeks = this.calculateNetGreeks(metrics, currentAssetPrice);
        metrics.greeks = {
            delta: Number((calculatedGreeks.delta ?? 0).toFixed(4)),
            gamma: Number((calculatedGreeks.gamma ?? 0).toFixed(4)),
            theta: Number((calculatedGreeks.theta ?? 0).toFixed(4)),
            vega: Number((calculatedGreeks.vega ?? 0).toFixed(4))
        };

        const risco = Math.abs(Number(metrics.risco_maximo || 0));
        let lucro = 0;
        if (typeof metrics.max_profit === 'number') lucro = metrics.max_profit;
        else if (metrics.max_profit === 'Ilimitado') lucro = 999999;

        (metrics as any).riskRewardRatio = lucro > 0 ? parseFloat((risco / lucro).toFixed(2)) : 99;

        return metrics;
    }

    public findAndCalculateSpreads(currentAssetPrice: number, maxRR: number = 0.5): StrategyMetrics[] {
        const strategiesToRun = SPREAD_MAP[0];
        let results: StrategyMetrics[] = [];

        const sameCall = this.findTwoLegCombinationsSameType(this.optionsData, 'CALL');
        const samePut = this.findTwoLegCombinationsSameType(this.optionsData, 'PUT');
        const diffStrike = this.findTwoLegCombinationsDifferentType(this.optionsData, false);
        const sameStrike = this.findTwoLegCombinationsDifferentType(this.optionsData, true);

        for (const sObj of strategiesToRun) {
            let combos: OptionLeg[][] = [];
            if (sObj.strategy instanceof BullCallSpread || sObj.strategy instanceof BearCallSpread) combos = sameCall;
            else if (sObj.strategy instanceof BullPutSpread || sObj.strategy instanceof BearPutSpread) combos = samePut;
            else if (sObj.strategy instanceof LongStraddle || sObj.strategy instanceof ShortStraddle) combos = sameStrike;
            else if (sObj.strategy instanceof LongStrangle || sObj.strategy instanceof ShortStrangle) combos = diffStrike;

            for (const combo of combos) {
                try {
                    const res = sObj.strategy.calculateMetrics(combo, currentAssetPrice, this.feePerLeg);
                    if (res) {
                        const normalized = this.normalizeMetrics(res, currentAssetPrice);
                        if ((normalized as any).riskRewardRatio <= maxRR) {
                            results.push(normalized);
                        }
                    }
                } catch (e) {}
            }
        }
        return results;
    }
}