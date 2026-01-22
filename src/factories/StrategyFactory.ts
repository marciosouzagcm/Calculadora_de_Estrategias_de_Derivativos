// src/factories/StrategyFactory.ts

// Atualizado com extensões .js para compatibilidade com o runtime ESM da Vercel
import { IStrategy } from '../interfaces/IStrategy.js';
import { ButterflySpread } from '../strategies/ButterflySpread.js';
import { CalendarSpread } from '../strategies/CalendarSpread.js';
import { IronCondorSpread } from '../strategies/IronCondorSpread.js';

import {
    LongStraddle,
    LongStrangle,
    ShortStraddle,
    ShortStrangle
} from '../strategies/StraddleSpreadBase.js';

import {
    BearCallSpread,
    BearPutSpread,
    BullCallSpread,
    BullPutSpread
} from '../strategies/VerticalSpreadBase.js';

/**
 * BOARDPRO V40.1 - Strategy Factory (Versão Homologada)
 * Centraliza e reconhece modelos matemáticos para o mercado B3.
 */
export class StrategyFactory {
    
    /**
     * Identifica a estratégia com base na quantidade e tipo de pernas.
     * Reajustado para precisão em detecção de travas de crédito/débito.
     */
    static getStrategyFor(legs: any[]): IStrategy | null {
        const count = legs.length;

        if (count === 2) {
            const dates = new Set(legs.map(l => String(l.vencimento).split(/[T ]/)[0]));
            if (dates.size > 1) return new CalendarSpread();

            const isMixed = legs.some(l => l.tipo === 'CALL') && legs.some(l => l.tipo === 'PUT');
            if (isMixed) {
                const sorted = [...legs].sort((a, b) => (a.strike || 0) - (b.strike || 0));
                const strikeDiff = Math.abs(sorted[0].strike - sorted[1].strike);
                
                if (strikeDiff <= (sorted[0].strike * 0.015)) { // Margem de 1.5% para Straddle
                    return sorted[0].direction === 'VENDA' ? new ShortStraddle() : new LongStraddle();
                }
                return sorted[0].direction === 'VENDA' ? new ShortStrangle() : new LongStrangle();
            }

            const buyLeg = legs.find(l => l.direction === 'COMPRA');
            const sellLeg = legs.find(l => l.direction === 'VENDA');

            if (buyLeg && sellLeg) {
                if (buyLeg.tipo === 'CALL') {
                    return buyLeg.strike < sellLeg.strike ? new BullCallSpread() : new BearCallSpread();
                } else {
                    return buyLeg.strike < sellLeg.strike ? new BullPutSpread() : new BearPutSpread();
                }
            }
        }

        if (count === 3) return new ButterflySpread();
        if (count === 4) return new IronCondorSpread();

        return null;
    }

    /**
     * Catálogo oficial para o Scanner.
     * Retorna instâncias das estratégias para processamento de métricas.
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
            new CalendarSpread()
        ];
    }
}