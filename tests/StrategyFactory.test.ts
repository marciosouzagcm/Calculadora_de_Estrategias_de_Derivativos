import { describe, expect, it } from 'vitest';
import { StrategyFactory } from '../src/factories/StrategyFactory';

describe('StrategyFactory', () => {
    
    it('deve identificar um Covered Call (1 perna CALL)', () => {
        const legs = [
            { tipo: 'CALL', direction: 'VENDA', strike: 30.00 }
        ];
        const strategy = StrategyFactory.getStrategyFor(legs);
        expect(strategy?.name).toBe('Lançamento Coberto (Covered Call)');
    });

    it('deve identificar um Bull Call Spread (2 pernas CALL, compra no strike mais baixo)', () => {
        const legs = [
            { tipo: 'CALL', direction: 'COMPRA', strike: 30.00, vencimento: '2026-04-15' },
            { tipo: 'CALL', direction: 'VENDA', strike: 32.00, vencimento: '2026-04-15' }
        ];
        const strategy = StrategyFactory.getStrategyFor(legs);
        expect(strategy?.name).toBe('Trava de Alta (Call)');
    });

    it('deve identificar um Calendar Spread (2 pernas, mesmo strike, vencimentos diferentes)', () => {
        const legs = [
            { tipo: 'CALL', strike: 30.00, vencimento: '2026-04-15' },
            { tipo: 'CALL', strike: 30.00, vencimento: '2026-05-15' }
        ];
        const strategy = StrategyFactory.getStrategyFor(legs);
        expect(strategy?.name).toBe('Calendar Spread (Trava de Linha)');
    });

    it('deve identificar um Long Straddle (2 pernas CALL/PUT, mesmo strike/vencimento)', () => {
        const legs = [
            { tipo: 'CALL', direction: 'COMPRA', strike: 30.00, vencimento: '2026-04-15' },
            { tipo: 'PUT', direction: 'COMPRA', strike: 30.00, vencimento: '2026-04-15' }
        ];
        const strategy = StrategyFactory.getStrategyFor(legs);
        expect(strategy?.name).toBe('Long Straddle');
    });

    it('deve identificar um Box Spread (4 pernas, tipos mistos, apenas 2 strikes)', () => {
        const legs = [
            { tipo: 'CALL', direction: 'COMPRA', strike: 30.00 },
            { tipo: 'CALL', direction: 'VENDA', strike: 32.00 },
            { tipo: 'PUT', direction: 'VENDA', strike: 30.00 },
            { tipo: 'PUT', direction: 'COMPRA', strike: 32.00 }
        ];
        const strategy = StrategyFactory.getStrategyFor(legs);
        expect(strategy?.name).toBe('Box Spread (Arbitragem)');
    });

    it('deve retornar todas as 23 estratégias no catálogo oficial', () => {
        const all = StrategyFactory.getAllStrategies();
        expect(all.length).toBe(23);
        
        // Verifica se nomes importantes estão na lista
        const names = all.map(s => s.name);
        expect(names).toContain('Trava de Alta (Call)');
        expect(names).toContain('Iron Condor');
        expect(names).toContain('Ratio Call Spread (1x2)');
    });

    it('deve retornar null para uma combinação desconhecida', () => {
        const legs: any[] = [];
        const strategy = StrategyFactory.getStrategyFor(legs);
        expect(strategy).toBeNull();
    });
});