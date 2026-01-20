import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, OptionLeg, StrategyLeg, StrategyMetrics } from '../interfaces/Types';
import { BlackScholes } from './BlackScholes';

import { BearCallSpread } from '../strategies/BearCallSpread';
import { BearPutSpread } from '../strategies/BearPutSpread';
import { BullCallSpread } from '../strategies/BullCallSpread';
import { BullPutSpread } from '../strategies/BullPutSpread';
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
    ],
};

export class PayoffCalculator {
    constructor(
        private optionsData: OptionLeg[], 
        private feePerLeg: number, 
        private lotSize: number
    ) {}

    private normalizeMetrics(metrics: StrategyMetrics, currentAssetPrice: number): StrategyMetrics {
        const totalFeesFinanceiro = metrics.pernas.length * this.feePerLeg * 2;
        metrics.taxas_ciclo = totalFeesFinanceiro;

        const profitBrutoUnitario = typeof metrics.max_profit === 'number' ? metrics.max_profit : 0;
        const lossBrutoUnitario = typeof metrics.max_loss === 'number' ? Math.abs(metrics.max_loss) : 0;

        metrics.max_profit = parseFloat((profitBrutoUnitario * this.lotSize - totalFeesFinanceiro).toFixed(2));
        metrics.lucro_maximo = metrics.max_profit;
        metrics.max_loss = parseFloat((lossBrutoUnitario * this.lotSize + totalFeesFinanceiro).toFixed(2));
        metrics.risco_maximo = -metrics.max_loss; 

        metrics.greeks = this.calculateNetGreeks(metrics, currentAssetPrice);

        if (metrics.max_loss > 0) {
            metrics.roi = metrics.max_profit / metrics.max_loss;
            metrics.exibir_roi = `${(metrics.roi * 100).toFixed(2)}%`;
        }

        (metrics as any).riskRewardRatio = metrics.max_profit > 0 
            ? parseFloat((metrics.max_loss / metrics.max_profit).toFixed(2)) 
            : 99;

        metrics.pernas = metrics.pernas.map((p: StrategyLeg) => {
            if (p.derivative.strike > 500) p.derivative.strike /= 100;
            if (p.derivative.premio > 50) p.derivative.premio /= 100;
            return p;
        });

        return metrics;
    }

    private calculateNetGreeks(metrics: StrategyMetrics, currentAssetPrice: number): Greeks {
        const SELIC = 0.1075;
        return metrics.pernas.reduce((acc, leg) => {
            const factor = (leg.direction === 'COMPRA' ? 1 : -1) * (leg.multiplier || 1);
            const s = leg.derivative.strike;
            const strikeSafe = s > 500 ? s / 100 : s;
            
            let unitarias: Greeks;

            if (leg.derivative.gregas_unitarias && leg.derivative.gregas_unitarias.delta !== 0) {
                unitarias = leg.derivative.gregas_unitarias;
            } else {
                const t = Math.max(leg.derivative.dias_uteis || 1, 1) / 252;
                const v = leg.derivative.vol_implicita || 0.35;
                const tipo = leg.derivative.tipo as 'CALL' | 'PUT';

                unitarias = {
                    delta: BlackScholes.calculateDelta(currentAssetPrice, strikeSafe, t, v, SELIC, tipo),
                    gamma: BlackScholes.calculateGamma(currentAssetPrice, strikeSafe, t, v, SELIC),
                    theta: BlackScholes.calculateTheta(currentAssetPrice, strikeSafe, t, v, SELIC, tipo),
                    vega: BlackScholes.calculateVega(currentAssetPrice, strikeSafe, t, v, SELIC)
                };
            }

            return {
                delta: acc.delta + (unitarias.delta * factor),
                gamma: acc.gamma + (unitarias.gamma * factor),
                theta: acc.theta + (unitarias.theta * factor),
                vega: acc.vega + (unitarias.vega * factor),
            };
        }, { delta: 0, gamma: 0, theta: 0, vega: 0 } as Greeks);
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
            const group = groups[key].sort((a, b) => a.strike - b.strike);
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
                const strikeCall = callLeg.strike > 500 ? callLeg.strike / 100 : callLeg.strike;
                const strikePut = putLeg.strike > 500 ? putLeg.strike / 100 : putLeg.strike;
                if ((mustHaveSameStrike && Math.abs(strikeCall - strikePut) < TOLERANCE) || 
                    (!mustHaveSameStrike && Math.abs(strikeCall - strikePut) >= TOLERANCE)) {
                    combinations.push([callLeg, putLeg]);
                }
            }
        }
        return combinations;
    }

    public findAndCalculateSpreads(currentAssetPrice: number, maxRR: number = 3.0): StrategyMetrics[] {
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
                    const res = sObj.strategy.calculateMetrics(combo, currentAssetPrice, 0); 
                    if (res) {
                        const resArray = Array.isArray(res) ? res : [res];
                        for (const item of resArray) {
                            const normalized = this.normalizeMetrics(item, currentAssetPrice);
                            if ((normalized as any).riskRewardRatio <= maxRR) results.push(normalized);
                        }
                    }
                } catch (e) {}
            }
        }
        return results.sort((a, b) => (a as any).riskRewardRatio - (b as any).riskRewardRatio);
    }
}