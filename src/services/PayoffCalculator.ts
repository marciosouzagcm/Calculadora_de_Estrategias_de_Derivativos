import { IStrategy } from '../interfaces/IStrategy';
import {
    OptionLeg,
    ProfitLossValue,
    StrategyMetrics,
    Greeks
} from '../interfaces/Types';

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

    // --- Métodos de Combinação (Mantidos conforme sua lógica) ---

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

    // --- Lógica de Consolidação e Normalização ---

    /**
     * Consolida as gregas das pernas individuais para a estratégia total
     */
    private calculateNetGreeks(metrics: StrategyMetrics): Greeks {
        return metrics.pernas.reduce((acc, leg) => {
            const factor = leg.direction === 'COMPRA' ? 1 : -1;
            const unit = leg.derivative.gregas_unitarias;

            return {
                delta: (acc.delta ?? 0) + ((unit.delta ?? 0) * factor),
                gamma: (acc.gamma ?? 0) + ((unit.gamma ?? 0) * factor),
                theta: (acc.theta ?? 0) + ((unit.theta ?? 0) * factor),
                vega: (acc.vega ?? 0) + ((unit.vega ?? 0) * factor),
            };
        }, { delta: 0, gamma: 0, theta: 0, vega: 0 } as Greeks);
    }

    private normalizeMetrics(metrics: StrategyMetrics): StrategyMetrics {
        // 1. Ajuste de Sinais para Débito
        if (metrics.natureza === 'DÉBITO') {
            const absLoss = Math.abs(Number(metrics.max_loss));
            metrics.max_loss = -absLoss as ProfitLossValue;
            metrics.risco_maximo = -absLoss as ProfitLossValue;
        }

        // 2. Garantir preenchimento dos campos do seu Types.ts
        metrics.initialCashFlow = metrics.initialCashFlow ?? metrics.net_premium;
        metrics.breakEvenPoints = metrics.breakEvenPoints ?? [];
        
        // 3. Consolidar Gregas
        metrics.greeks = this.calculateNetGreeks(metrics);

        return metrics;
    }

    public findAndCalculateSpreads(currentAssetPrice: number): StrategyMetrics[] {
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
                        // Aplica as convicções de sinal e soma as gregas
                        results.push(this.normalizeMetrics(res));
                    }
                } catch (e) {}
            }
        }
        return results;
    }
}