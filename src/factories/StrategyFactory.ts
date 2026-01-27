// BOARDPRO V40.1 - Strategy Factory (Versão Homologada e Expandida)
// Centraliza e reconhece modelos matemáticos para o mercado B3.

import { IStrategy } from '../interfaces/IStrategy.js';

// Estratégias Base
import { ButterflySpread } from '../strategies/ButterflySpread.js';
import { CalendarSpread } from '../strategies/CalendarSpread.js';
import { IronCondorSpread } from '../strategies/IronCondorSpread.js';

// Variações de Calendário e Diagonais (Novas)
import { BullCalendarSpread } from '../strategies/BullCalendarSpread.js';
import { BearCalendarSpread } from '../strategies/BearCalendarSpread.js';
import { LongCallDiagonal } from '../strategies/LongCallDiagonal.js';
import { LongPutDiagonal } from '../strategies/LongPutDiagonal.js';
import { ShortPutDiagonal } from '../strategies/ShortPutDiagonal.js';

// Estratégias de Razão e Arbitragem (Novas)
import { RatioCallSpread } from '../strategies/RatioCallSpread.js';
import { RatioPutSpread } from '../strategies/RatioPutSpread.js';
import { BoxSpread } from '../strategies/BoxSpread.js';

// Estratégias Cobertas (Novas)
import { CoveredCall } from '../strategies/CoveredCall.js';
import { CoveredPut } from '../strategies/CoveredPut.js';

// Variações de Butterfly (Novas)
import { LongButterflyCall } from '../strategies/LongButterflyCall.js';
import { ShortButterflyCall } from '../strategies/ShortButterflyCall.js';

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

export class StrategyFactory {
    
    /**
     * Identifica a estratégia com base na quantidade e tipo de pernas.
     * Utilizado para reconhecimento de posições custodiadas ou montadas manualmente.
     */
    static getStrategyFor(legs: any[]): IStrategy | null {
        const count = legs.length;

        if (count === 1) {
            // Detecção básica de lançamento coberto se houver flag de hedge/ativo
            if (legs[0].tipo === 'CALL') return new CoveredCall();
            if (legs[0].tipo === 'PUT') return new CoveredPut();
        }

        if (count === 2) {
            const dates = new Set(legs.map(l => String(l.vencimento).split(/[T ]/)[0]));
            
            // Lógica de Calendário/Diagonal (Vencimentos Diferentes)
            if (dates.size > 1) {
                const isSameStrike = legs[0].strike === legs[1].strike;
                if (isSameStrike) return new CalendarSpread();
                return new LongCallDiagonal(); 
            }

            const isMixed = legs.some(l => l.tipo === 'CALL') && legs.some(l => l.tipo === 'PUT');
            if (isMixed) {
                const sorted = [...legs].sort((a, b) => (a.strike || 0) - (b.strike || 0));
                const strikeDiff = Math.abs(sorted[0].strike - sorted[1].strike);
                
                if (strikeDiff <= (sorted[0].strike * 0.015)) { 
                    return sorted[0].direction === 'VENDA' ? new ShortStraddle() : new LongStraddle();
                }
                return sorted[0].direction === 'VENDA' ? new ShortStrangle() : new LongStrangle();
            }

            const buyLeg = legs.find(l => l.direction === 'COMPRA');
            const sellLeg = legs.find(l => l.direction === 'VENDA');

            if (buyLeg && sellLeg) {
                // Travas Verticais Clássicas
                if (buyLeg.tipo === 'CALL') {
                    return buyLeg.strike < sellLeg.strike ? new BullCallSpread() : new BearCallSpread();
                } else {
                    return buyLeg.strike < sellLeg.strike ? new BullPutSpread() : new BearPutSpread();
                }
            }
        }

        if (count === 3) return new ButterflySpread();
        if (count === 4) {
            // Se as pernas forem de tipos diferentes e strikes pares, pode ser Box ou Iron Condor
            const hasPuts = legs.some(l => l.tipo === 'PUT');
            const hasCalls = legs.some(l => l.tipo === 'CALL');
            if (hasPuts && hasCalls && legs.every(l => l.direction === 'COMPRA' || l.direction === 'VENDA')) {
                // Checagem simplificada para Box Spread
                const strikes = new Set(legs.map(l => l.strike));
                if (strikes.size === 2) return new BoxSpread();
            }
            return new IronCondorSpread();
        }

        return null;
    }

    /**
     * Catálogo oficial para o Scanner.
     * Adicionado todas as 23 variações para que o loop de busca as processe.
     */
    static getAllStrategies(): IStrategy[] {
        return [
            // Verticais e Direcionais
            new BullCallSpread(), 
            new BearCallSpread(),
            new BullPutSpread(), 
            new BearPutSpread(),
            
            // Volatilidade Pura
            new LongStraddle(), 
            new ShortStraddle(),
            new LongStrangle(), 
            new ShortStrangle(),
            
            // Calendários (Time Spreads)
            new CalendarSpread(),
            new BullCalendarSpread(),
            new BearCalendarSpread(),
            
            // Diagonais
            new LongCallDiagonal(),
            new LongPutDiagonal(),
            new ShortPutDiagonal(),
            
            // Ratios (Razão)
            new RatioCallSpread(),
            new RatioPutSpread(),
            
            // Complexas (4+ pernas)
            new IronCondorSpread(), 
            new BoxSpread(),
            
            // Borboletas
            new ButterflySpread(), 
            new LongButterflyCall(),
            new ShortButterflyCall(),
            
            // Cobertas
            new CoveredCall(),
            new CoveredPut()
        ];
    }
}