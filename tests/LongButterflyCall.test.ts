import { describe, it, expect } from 'vitest';
import { LongButterflyCall } from '../strategies/LongButterflyCall';
import { OptionLeg } from '../interfaces/Types';

describe('Long Butterfly (Call) Strategy', () => {
    const strategy = new LongButterflyCall();
    const assetPrice = 25.00;

    it('deve identificar uma Borboleta de Call simétrica e lucrativa', () => {
        const mockOptions: OptionLeg[] = [
            {
                option_ticker: 'PETRE230', tipo: 'CALL', strike: 23.00, premio: 2.20,
                vencimento: '2025-05-16', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0.90, gamma: 0.05, theta: -0.02, vega: 0.04, rho: 0 }
            },
            {
                option_ticker: 'PETRE250', tipo: 'CALL', strike: 25.00, premio: 1.00,
                vencimento: '2025-05-16', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0.50, gamma: 0.10, theta: -0.05, vega: 0.08, rho: 0 }
            },
            {
                option_ticker: 'PETRE270', tipo: 'CALL', strike: 27.00, premio: 0.20,
                vencimento: '2025-05-16', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0.10, gamma: 0.04, theta: -0.02, vega: 0.03, rho: 0 }
            }
        ];

        const results = strategy.calculateMetrics(mockOptions, assetPrice, 0);

        expect(results.length).toBe(1);
        const m = results[0];

        // Custo: 2.20 - (2 * 1.00) + 0.20 = 0.40
        expect(m.net_premium).toBeCloseTo(0.40);
        // Lucro Máximo: (25 - 23) - 0.40 = 1.60
        expect(m.lucro_maximo).toBeCloseTo(1.60);
        // Breakevens: 23 + 0.40 = 23.40 e 27 - 0.40 = 26.60
        expect(m.breakEvenPoints).toContain(23.40);
        expect(m.breakEvenPoints).toContain(26.60);
    });
});