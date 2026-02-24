import { describe, it, expect } from 'vitest';
import { LongStrangle } from '../strategies/LongStrangle';
import { OptionLeg } from '../interfaces/Types';

describe('Long Strangle Strategy', () => {
    const strategy = new LongStrangle();
    const assetPrice = 50.00;

    it('deve identificar um Strangle OTM corretamente', () => {
        const mockOptions: OptionLeg[] = [
            {
                option_ticker: 'PETRR460', tipo: 'PUT', strike: 46.00, premio: 0.80,
                vencimento: '2026-06-19', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: -0.25, gamma: 0.04, theta: -0.04, vega: 0.06, rho: 0 }
            },
            {
                option_ticker: 'PETRE540', tipo: 'CALL', strike: 54.00, premio: 0.70,
                vencimento: '2026-06-19', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0.22, gamma: 0.03, theta: -0.03, vega: 0.05, rho: 0 }
            }
        ];

        const results = strategy.calculateMetrics(mockOptions, assetPrice, 0);

        expect(results.length).toBe(1);
        const m = results[0];

        // Custo total: 0.80 + 0.70 = 1.50
        expect(Math.abs(m.net_premium)).toBe(1.50);
        
        // Breakevens: 46 - 1.50 = 44.50 e 54 + 1.50 = 55.50
        expect(m.breakEvenPoints).toContain(44.50);
        expect(m.breakEvenPoints).toContain(55.50);

        // Delta: -0.25 + 0.22 = -0.03 (Quase neutro)
        expect(m.greeks.delta).toBeCloseTo(-0.03);
    });
});