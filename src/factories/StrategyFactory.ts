import { IStrategy } from '../interfaces/IStrategy';
import { ButterflySpread } from '../strategies/ButterflySpread';
import { CalendarSpread } from '../strategies/CalendarSpread';
import { IronCondorSpread } from '../strategies/IronCondorSpread';

import {
    LongStraddle,
    LongStrangle,
    ShortStraddle,
    ShortStrangle
} from '../strategies/StraddleSpreadBase';

import {
    BearCallSpread,
    BearPutSpread,
    BullCallSpread,
    BullPutSpread
} from '../strategies/VerticalSpreadBase';

export class StrategyFactory {
    static getStrategyFor(legs: any[]): IStrategy | null {
        const count = legs.length;
        if (count === 2) {
            const dates = new Set(legs.map(l => String(l.vencimento).split(/[T ]/)[0]));
            if (dates.size > 1) return new CalendarSpread();

            const isMixed = legs.some(l => l.tipo === 'CALL') && legs.some(l => l.tipo === 'PUT');
            if (isMixed) {
                const sorted = [...legs].sort((a, b) => (a.strike || 0) - (b.strike || 0));
                const strikeDiff = Math.abs(sorted[0].strike - sorted[1].strike);
                if (strikeDiff <= (sorted[0].strike * 0.01)) {
                    return sorted[0].direction === 'VENDA' ? new ShortStraddle() : new LongStraddle();
                }
                return sorted[0].direction === 'VENDA' ? new ShortStrangle() : new LongStrangle();
            }
            // ... (restante da lógica de travas verticais)
        }
        if (count === 3) return new ButterflySpread();
        if (count === 4) return new IronCondorSpread();
        return null;
    }

    static getAllStrategies(): IStrategy[] {
        return [
            new BullCallSpread(), new BearCallSpread(),
            new BullPutSpread(), new BearPutSpread(),
            new LongStraddle(), new ShortStraddle(),
            new LongStrangle(), new ShortStrangle(),
            new IronCondorSpread(), new ButterflySpread(),
            new CalendarSpread()
        ];
    }
}