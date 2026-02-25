import { describe, it, expect } from 'vitest';
import { ShortStrangle } from '../strategies/ShortStrangle';

describe('Short Strangle Strategy (Venda)', () => {
    const strategy = new ShortStrangle();

    it('deve identificar corretamente um Short Strangle e calcular breakevens mais largos que o Straddle', () => {
        const mockOptions: any[] = [
            { 
                option_ticker: 'PETRP28', tipo: 'PUT', strike: 28, premio: 0.60, 
                vencimento: '2025-05-15', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: -0.2, gamma: 0.02, theta: -0.02, vega: 0.05 } 
            },
            { 
                option_ticker: 'PETRE32', tipo: 'CALL', strike: 32, premio: 0.50, 
                vencimento: '2025-05-15', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0.2, gamma: 0.02, theta: -0.02, vega: 0.05 } 
            }
        ];

        const results = strategy.calculateMetrics(mockOptions, 30, 0);

        // netCredit = 0.60 + 0.50 = 1.10
        // BE Alta = 32 + 1.10 = 33.10
        // BE Baixa = 28 - 1.10 = 26.90

        expect(results.length).toBe(1);
        expect(results[0].net_premium).toBeCloseTo(1.10);
        expect(results[0].breakEvenPoints).toContain(26.90);
        expect(results[0].breakEvenPoints).toContain(33.10);
    });
});