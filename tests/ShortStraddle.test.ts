import { describe, it, expect } from 'vitest';
import { ShortStraddle } from '../strategies/ShortStraddle';

describe('Short Straddle Strategy (Venda)', () => {
    const strategy = new ShortStraddle();

    it('deve identificar corretamente um Short Straddle e calcular os breakevens simétricos', () => {
        const mockOptions: any[] = [
            { 
                option_ticker: 'PETRE30', tipo: 'CALL', strike: 30, premio: 1.50, 
                vencimento: '2025-05-15', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0.5, gamma: 0.05, theta: -0.04, vega: 0.10 } 
            },
            { 
                option_ticker: 'PETRP30', tipo: 'PUT', strike: 30, premio: 1.20, 
                vencimento: '2025-05-15', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: -0.5, gamma: 0.05, theta: -0.04, vega: 0.10 } 
            }
        ];

        const results = strategy.calculateMetrics(mockOptions, 30, 0);

        // netCredit = 1.50 + 1.20 = 2.70
        // BE Alta = 30 + 2.70 = 32.70
        // BE Baixa = 30 - 2.70 = 27.30

        expect(results.length).toBe(1);
        expect(results[0].net_premium).toBeCloseTo(2.70);
        expect(results[0].lucro_maximo).toBeCloseTo(2.70);
        expect(results[0].breakEvenPoints).toContain(27.30);
        expect(results[0].breakEvenPoints).toContain(32.70);
    });
});