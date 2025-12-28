import { IStrategy } from '../interfaces/IStrategy';
import { OptionLeg } from '../interfaces/Types';

import { ButterflySpread } from '../strategies/ButterflySpread';
import { IronCondorSpread } from '../strategies/IronCondorSpread';
import { LongStraddle, ShortStraddle } from '../strategies/StraddleSpreadBase';
import { BearCallSpread, BearPutSpread, BullCallSpread, BullPutSpread } from '../strategies/VerticalSpreadBase';

export class StrategyFactory {
    /**
     * Identifica a estratégia correta baseada no número de pernas e tipos.
     */
    static getStrategyFor(legs: any[]): IStrategy | null {
        const count = legs.length;

        if (count === 2) {
            // Usamos 'any' ou fazemos verificações de tipo para evitar erro de compilação
            const isAllCall = legs.every(l => l.tipo === 'CALL');
            const isAllPut = legs.every(l => l.tipo === 'PUT');

            // Encontrar strikes para decidir se é Bull ou Bear
            // Adicionamos a verificação '?' para caso não encontre
            const sortedByStrike = [...legs].sort((a, b) => (a.strike || 0) - (b.strike || 0));
            const lowStrikeLeg = sortedByStrike[0];
            const highStrikeLeg = sortedByStrike[1];

            // Se as pernas não tiverem strikes válidos, retornamos null
            if (!lowStrikeLeg?.strike || !highStrikeLeg?.strike) return null;

            if (isAllCall) {
                // Na trava de alta com CALL (Bull Call), compramos o strike baixo
                return new BullCallSpread();
            }
            if (isAllPut) {
                // Na trava de alta com PUT (Bull Put), vendemos o strike alto
                return new BullPutSpread();
            }
        }

        if (count === 3) return new ButterflySpread();
        if (count === 4) return new IronCondorSpread();

        return null;
    }

    /**
     * Lista para o motor de busca iterar.
     * Este é o método principal usado pelo seu StrategyService.
     */
    static getAllStrategies(): IStrategy[] {
        return [
            new BullCallSpread(),
            new BearCallSpread(),
            new BullPutSpread(),
            new BearPutSpread(),
            new LongStraddle(),
            new ShortStraddle(),
            new IronCondorSpread(),
            new ButterflySpread()
        ];
    }
}