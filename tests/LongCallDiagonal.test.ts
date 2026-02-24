import { describe, it, expect } from 'vitest';
import { LongCallDiagonal } from '../strategies/LongCallDiagonal';
import { OptionLeg } from '../interfaces/Types';

describe('Long Call Diagonal Strategy', () => {
    const strategy = new LongCallDiagonal();
    const assetPrice = 30.00;

    it('deve identificar uma diagonal de alta válida', () => {
        const mockOptions: OptionLeg[] = [
            {
                option_ticker: 'PETRF300', // Junho (Back Month)
                tipo: 'CALL', strike: 30.00, premio: 2.50,
                vencimento: '2026-06-19', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0.60, gamma: 0.05, theta: -0.02, vega: 0.08, rho: 0 }
            },
            {
                option_ticker: 'PETRE320', // Maio (Front Month)
                tipo: 'CALL', strike: 32.00, premio: 0.80,
                vencimento: '2026-05-15', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0.35, gamma: 0.08, theta: -0.05, vega: 0.04, rho: 0 }
            }
        ];

        const results = strategy.calculateMetrics(mockOptions, assetPrice, 0);

        expect(results.length).toBe(1);
        const m = results[0];

        // Débito: 2.50 - 0.80 = 1.70
        expect(m.net_premium).toBe(1.70);
        // Vencimento composto
        expect(m.expiration).toContain('2026-05-15');
        // Theta consolidado: -0.02 - (-0.05) = +0.03 (Ganha com o tempo)
        expect(m.greeks.theta).toBeGreaterThan(0);
    });
});