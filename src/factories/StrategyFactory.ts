import { IStrategy } from '../interfaces/IStrategy';
import { ButterflySpread } from '../strategies/ButterflySpread';
import { CalendarSpread } from '../strategies/CalendarSpread';
import { IronCondorSpread } from '../strategies/IronCondorSpread';

// Novas Estratégias
import { CallRatioSpread } from '../strategies/CallRatioSpread'; // Booster
import { LongCollar } from '../strategies/LongCollar';           // Rochedo

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
            const sorted = [...legs].sort((a, b) => (a.strike || 0) - (b.strike || 0));

            // LÓGICA PARA ROCHEDO (LONG COLLAR)
            // Geralmente 1 Put Comprada e 1 Call Vendida de strikes diferentes
            if (isMixed) {
                const strikeDiff = Math.abs(sorted[0].strike - sorted[1].strike);
                const isSameStrike = strikeDiff <= (sorted[0].strike * 0.01);

                if (isSameStrike) {
                    return sorted[0].direction === 'VENDA' ? new ShortStraddle() : new LongStraddle();
                }

                // Se for Call/Put de strikes diferentes, pode ser Strangle ou Rochedo
                // Se a direção for oposta (um compra, outro vende), é um Collar (Rochedo)
                if (legs[0].direction !== legs[1].direction) {
                    return new LongCollar();
                }

                return sorted[0].direction === 'VENDA' ? new ShortStrangle() : new LongStrangle();
            }

            // LÓGICA PARA BOOSTER (CALL RATIO SPREAD)
            // Se as duas pernas forem do mesmo tipo (CALL) e tiverem multiplicadores/direções de Ratio
            const allCalls = legs.every(l => l.tipo === 'CALL');
            if (allCalls && legs.some(l => l.multiplier && l.multiplier > 1)) {
                return new CallRatioSpread();
            }

            // ... (restante da lógica de travas verticais existentes)
            if (legs[0].tipo === 'CALL') {
                return legs[0].strike < legs[1].strike ? new BullCallSpread() : new BearCallSpread();
            } else {
                return legs[0].strike < legs[1].strike ? new BullPutSpread() : new BearPutSpread();
            }
        }

        if (count === 3) {
            // Butterfly ou Ratio Spreads de 3 pernas
            return new ButterflySpread();
        }
        
        if (count === 4) return new IronCondorSpread();
        
        return null;
    }

    /**
     * MODO SCANNER: Adicione aqui todas as estratégias que o sistema
     * deve procurar automaticamente ao ler o Excel.
     */
    static getAllStrategies(): IStrategy[] {
        return [
            new BullCallSpread(), 
            new BearCallSpread(),
            new BullPutSpread(), 
            new BearPutSpread(),
            new LongStraddle(), 
            new ShortStraddle(),
            new LongStrangle(), 
            new ShortStrangle(),
            new IronCondorSpread(), 
            new ButterflySpread(),
            new CalendarSpread(),
            // --- NOVAS ESTRATÉGIAS ADICIONADAS AO SCANNER ---
            new CallRatioSpread(), // Agora o scanner vai procurar por Booster
            new LongCollar()       // Agora o scanner vai procurar por Rochedo
        ];
    }
}