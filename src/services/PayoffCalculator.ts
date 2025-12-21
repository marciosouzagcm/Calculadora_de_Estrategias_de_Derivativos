// src/services/PayoffCalculator.ts

import { IStrategy } from '../interfaces/IStrategy';
import {
    OptionLeg,
    ProfitLossValue,
    StrategyMetrics
} from '../interfaces/Types';

// Importações das classes de estratégia
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

    // --- Auxiliares de Combinação ---

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

    private findTwoLegCombinationsCalendar(options: OptionLeg[], targetType: 'CALL' | 'PUT'): OptionLeg[][] {
        const combinations: OptionLeg[][] = [];
        const filtered = options.filter(o => o.tipo === targetType);
        const groups = filtered.reduce((acc, current) => {
            if (current.strike === null) return acc;
            const key = `${current.ativo_subjacente}-${current.strike.toFixed(2)}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(current);
            return acc;
        }, {} as OptionGroupMap);

        for (const key in groups) {
            const group = groups[key];
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    const [legA, legB] = group[i].vencimento < group[j].vencimento ? [group[i], group[j]] : [group[j], group[i]];
                    if (legA.vencimento !== legB.vencimento) {
                        combinations.push([legA, legB]);
                    }
                }
            }
        }
        return combinations;
    }

    private findThreeLegCombinations(options: OptionLeg[], targetType: 'CALL' | 'PUT'): OptionLeg[][] {
        const combinations: OptionLeg[][] = [];
        const filtered = options.filter(o => o.tipo === targetType);
        const TOLERANCE = 0.10; // Aumentado para captar mais borboletas

        const groups = filtered.reduce((acc, current) => {
            const key = `${current.ativo_subjacente}-${current.vencimento}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(current);
            return acc;
        }, {} as OptionGroupMap);

        for (const key in groups) {
            const group = groups[key].sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    for (let k = j + 1; k < group.length; k++) {
                        const K1 = group[i].strike!;
                        const K2 = group[j].strike!;
                        const K3 = group[k].strike!;
                        const diff1 = K2 - K1;
                        const diff2 = K3 - K2;
                        if (Math.abs(diff1 - diff2) < TOLERANCE && diff1 > 0) {
                            combinations.push([group[i], group[j], group[k]]);
                        }
                    }
                }
            }
        }
        return combinations;
    }

    private findFourLegCombinations(options: OptionLeg[]): OptionLeg[][] {
        const combinations: OptionLeg[][] = [];
        const TOLERANCE = 0.15;
        const groups = options.reduce((acc, curr) => {
            const key = `${curr.ativo_subjacente}-${curr.vencimento}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(curr);
            return acc;
        }, {} as OptionGroupMap);

        for (const key in groups) {
            const group = groups[key];
            const calls = group.filter(o => o.tipo === 'CALL').sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
            const puts = group.filter(o => o.tipo === 'PUT').sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));

            for (let pi = 0; pi < puts.length; pi++) {
                for (let pj = pi + 1; pj < puts.length; pj++) {
                    const widthPut = puts[pj].strike! - puts[pi].strike!;
                    for (let ci = 0; ci < calls.length; ci++) {
                        for (let cj = ci + 1; cj < calls.length; cj++) {
                            const widthCall = calls[cj].strike! - calls[ci].strike!;
                            if (puts[pj].strike! < calls[ci].strike! && Math.abs(widthPut - widthCall) < TOLERANCE) {
                                combinations.push([puts[pi], puts[pj], calls[ci], calls[cj]]);
                            }
                        }
                    }
                }
            }
        }
        return combinations;
    }

    // --- Métodos de Cálculo ---

    public calculatePayoffCurve(strategy: StrategyMetrics, currentAssetPrice: number, rangePercent: number = 0.20, steps: number = 100): { price: number, pnl: number }[] {
        if (!strategy.pernas || strategy.pernas.length === 0) return [];
        const minPrice = currentAssetPrice * (1 - rangePercent);
        const maxPrice = currentAssetPrice * (1 + rangePercent);
        const stepSize = (maxPrice - minPrice) / steps;
        const curve: { price: number, pnl: number }[] = [];
        const totalFees = this.feePerLeg * strategy.pernas.length;

        for (let i = 0; i <= steps; i++) {
            const price = minPrice + (i * stepSize);
            let totalPnL = 0;
            for (const leg of strategy.pernas) {
                const strike = leg.derivative.strike!;
                const premium = leg.derivative.premio;
                const isCall = leg.derivative.tipo === 'CALL';
                const isCompra = leg.direction === 'COMPRA';
                
                let intrinsic = isCall ? Math.max(0, price - strike) : Math.max(0, strike - price);
                totalPnL += isCompra ? (intrinsic - premium) : (premium - intrinsic);
            }
            curve.push({ price, pnl: parseFloat((totalPnL * this.lotSize - totalFees).toFixed(2)) });
        }
        return curve;
    }

    private fixMaxLossForDebitSpreads(metrics: StrategyMetrics): StrategyMetrics {
        if (metrics.natureza === 'DÉBITO' && metrics.max_profit !== Infinity) {
            const costUnitario = Math.abs(metrics.initialCashFlow as number); 
            metrics.max_loss = -costUnitario as ProfitLossValue;
            metrics.risco_maximo = -costUnitario as ProfitLossValue; 
            metrics.margem_exigida = costUnitario; 
        }
        return metrics;
    }

    public findAndCalculateSpreads(currentAssetPrice: number): StrategyMetrics[] {
        const strategiesToRun = SPREAD_MAP[0];
        let results: StrategyMetrics[] = [];

        // 1. Processar Travas e Volatilidade (2 Pernas)
        const sameCall = this.findTwoLegCombinationsSameType(this.optionsData, 'CALL');
        const samePut = this.findTwoLegCombinationsSameType(this.optionsData, 'PUT');
        const diffStrike = this.findTwoLegCombinationsDifferentType(this.optionsData, false);
        const sameStrike = this.findTwoLegCombinationsDifferentType(this.optionsData, true);
        const calendars = this.findTwoLegCombinationsCalendar(this.optionsData, 'CALL');

        for (const sObj of strategiesToRun) {
            let combos: OptionLeg[][] = [];
            if (sObj.strategy instanceof BullCallSpread || sObj.strategy instanceof BearCallSpread) combos = sameCall;
            else if (sObj.strategy instanceof BullPutSpread || sObj.strategy instanceof BearPutSpread) combos = samePut;
            else if (sObj.strategy instanceof LongStraddle || sObj.strategy instanceof ShortStraddle) combos = sameStrike;
            else if (sObj.strategy instanceof LongStrangle || sObj.strategy instanceof ShortStrangle) combos = diffStrike;
            else if (sObj.strategy instanceof CalendarSpread) combos = calendars;
            else if (sObj.strategy instanceof ButterflySpread) combos = this.findThreeLegCombinations(this.optionsData, 'CALL');
            else if (sObj.strategy instanceof IronCondorSpread) combos = this.findFourLegCombinations(this.optionsData);

            for (const combo of combos) {
                try {
                    const res = sObj.strategy.calculateMetrics(combo, currentAssetPrice, this.feePerLeg);
                    if (res) results.push(this.fixMaxLossForDebitSpreads(res));
                } catch (e) {}
            }
        }
        return results;
    }
}