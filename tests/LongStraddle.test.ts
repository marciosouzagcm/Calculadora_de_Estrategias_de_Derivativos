import { describe, it, expect } from 'vitest';
import { LongStraddle } from '../strategies/LongStraddle';
import { OptionLeg } from '../interfaces/Types';

describe('Long Straddle Strategy', () => {
    const strategy = new LongStraddle();
    const assetPrice = 100.00;

    it('deve identificar um Straddle ATM e calcular os breakevens corretamente', () => {
        const mockOptions: OptionLeg[] = [
            {
                option_ticker: 'VALEC100', tipo: 'CALL', strike: 100.00, premio: 4.50,
                vencimento: '2026-03-20', ativo_subjacente: 'VALE3',
                gregas_unitarias: { delta: 0.51, gamma: 0.05, theta: -0.08, vega: 0.12, rho: 0 }
            },
            {
                option_ticker: 'VALEO100', tipo: 'PUT', strike: 100.00, premio: 4.00,
                vencimento: '2026-03-20', ativo_subjacente: 'VALE3',
                gregas_unitarias: { delta: -0.49, gamma: 0.05, theta: -0.07, vega: 0.11, rho: 0 }
            }
        ];

        const results = strategy.calculateMetrics(mockOptions, assetPrice, 0);

        expect(results.length).toBe(1);
        const m = results[0];

        // Custo total: 4.50 + 4.00 = 8.50
        expect(Math.abs(m.net_premium)).toBe(8.50);
        
        // Breakevens: 100 - 8.50 = 91.50 e 100 + 8.50 = 108.50
        expect(m.breakEvenPoints).toContain(91.50);
        expect(m.breakEvenPoints).toContain(108.50);

        // Delta Consolidado: 0.51 + (-0.49) = 0.02 (Quase neutro)
        expect(m.greeks.delta).toBeCloseTo(0.02);
        // Vega Positivo: 0.12 + 0.11 = 0.23
        expect(m.greeks.vega).toBe(0.23);
    });
});