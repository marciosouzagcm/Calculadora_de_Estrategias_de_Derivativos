// src/factories/StrategyFactory.ts

// Adicionadas as extensões .js para compatibilidade com o runtime ESM da Vercel
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
 * BOARDPRO V40.0 - Strategy Factory (Versão Homologada)
 * Centraliza apenas as estratégias validadas para o mercado brasileiro.
 */
export class StrategyFactory {
    
    /**
     * Identifica a estratégia com base na quantidade e tipo de pernas.
     * Útil para o Simulador e para reconhecer montagens enviadas pelo usuário.
     */
    static getStrategyFor(legs: any[]): IStrategy | null {
        const count = legs.length;

        if (count === 2) {
            // Verifica se é uma trava de calendário (vencimentos diferentes)
            const dates = new Set(legs.map(l => String(l.vencimento).split(/[T ]/)[0]));
            if (dates.size > 1) return new CalendarSpread();

            // Verifica se é Straddle ou Strangle (Misto de Call e Put)
            const isMixed = legs.some(l => l.tipo === 'CALL') && legs.some(l => l.tipo === 'PUT');
            if (isMixed) {
                const sorted = [...legs].sort((a, b) => (a.strike || 0) - (b.strike || 0));
                const strikeDiff = Math.abs(sorted[0].strike - sorted[1].strike);
                
                // Se strikes forem muito próximos (margem de 1%), consideramos Straddle
                if (strikeDiff <= (sorted[0].strike * 0.01)) {
                    return sorted[0].direction === 'VENDA' ? new ShortStraddle() : new LongStraddle();
                }
                return sorted[0].direction === 'VENDA' ? new ShortStrangle() : new LongStrangle();
            }

            // Travas Verticais (Mesmo tipo de opção)
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
     * Retorna o catálogo oficial para o Scanner.
     * Atualmente com 11 modelos robustos para o mercado de B3.
     */
    static getAllStrategies(): IStrategy[] {
        return [
            // Travas de Alta e Baixa (Débito e Crédito)
            new BullCallSpread(), 
            new BearCallSpread(),
            new BullPutSpread(), 
            new BearPutSpread(),
            
            // Operações de Volatilidade (Straddle e Strangle)
            new LongStraddle(), 
            new ShortStraddle(),
            new LongStrangle(), 
            new ShortStrangle(),
            
            // Estruturas de Renda e Tempo
            new IronCondorSpread(), 
            new ButterflySpread(), 
            new CalendarSpread()
        ];
    }
}