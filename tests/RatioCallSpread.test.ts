import { describe, it, expect } from 'vitest';
import { RatioCallSpread } from '../strategies/RatioCallSpread';

describe('Ratio Call Spread Strategy (1x2)', () => {
    const strategy = new RatioCallSpread();

    it('deve identificar corretamente um Ratio Call Spread com lucro máximo no strike da ponta vendida', () => {
        const mockOptions: any[] = [
            {
                option_ticker: 'PETRE30', tipo: 'CALL', strike: 30, premio: 2.00,
                vencimento: '2025-05-15', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0.6, gamma: 0.05, theta: -0.05, vega: 0.1 }
            },
            {
                option_ticker: 'PETRE32', tipo: 'CALL', strike: 32, premio: 0.80,
                vencimento: '2025-05-15', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0.3, gamma: 0.03, theta: -0.03, vega: 0.05 }
            }
        ];

        const results = strategy.calculateMetrics(mockOptions, 30, 0);

        // Net Premium = (0.80 * 2) - 2.00 = 1.60 - 2.00 = -0.40 (Débito)
        // Spread Width = 32 - 30 = 2.00
        // Max Profit = 2.00 + (-0.40) = 1.60
        // Breakeven Alta = 32 + 1.60 = 33.60

        expect(results.length).toBe(1);
        expect(results[0].net_premium).toBeCloseTo(-0.40);
        expect(results[0].lucro_maximo).toBeCloseTo(1.60);
        expect(results[0].breakEvenPoints[0]).toBe(33.60);
    });

    it('deve ignorar opções com vencimentos diferentes', () => {
        const invalidOptions: any[] = [
            { tipo: 'CALL', strike: 30, premio: 1.0, vencimento: '2025-05-15' },
            { tipo: 'CALL', strike: 32, premio: 0.5, vencimento: '2025-06-15' }
        ];
        const results = strategy.calculateMetrics(invalidOptions as any, 30, 0);
        expect(results.length).toBe(0);
    });
});