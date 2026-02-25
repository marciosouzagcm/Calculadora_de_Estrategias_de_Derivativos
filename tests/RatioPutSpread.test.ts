import { describe, it, expect } from 'vitest';
import { RatioPutSpread } from '../strategies/RatioPutSpread';

describe('Ratio Put Spread Strategy (1x2)', () => {
    const strategy = new RatioPutSpread();

    it('deve identificar corretamente um Ratio Put Spread com lucro máximo no strike da venda', () => {
        const mockOptions: any[] = [
            {
                option_ticker: 'PETRP34', tipo: 'PUT', strike: 34, premio: 1.50,
                vencimento: '2025-05-15', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: -0.4, gamma: 0.04, theta: 0.03, vega: 0.08 }
            },
            {
                option_ticker: 'PETRP32', tipo: 'PUT', strike: 32, premio: 0.60,
                vencimento: '2025-05-15', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: -0.2, gamma: 0.02, theta: 0.01, vega: 0.04 }
            }
        ];

        const results = strategy.calculateMetrics(mockOptions, 35, 0);

        // Net Premium = (0.60 * 2) - 1.50 = 1.20 - 1.50 = -0.30 (Débito)
        // Spread Width = 34 - 32 = 2.00
        // Max Profit = 2.00 + (-0.30) = 1.70
        // Breakeven Baixa = 32 - 1.70 = 30.30

        expect(results.length).toBe(1);
        expect(results[0].net_premium).toBeCloseTo(-0.30);
        expect(results[0].lucro_maximo).toBeCloseTo(1.70);
        expect(results[0].breakEvenPoints[0]).toBe(30.30);
    });
});