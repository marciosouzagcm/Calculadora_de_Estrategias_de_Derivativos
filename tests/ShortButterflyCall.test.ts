import { describe, it, expect } from 'vitest';
import { ShortButterflyCall } from '../strategies/ShortButterflyCall';

describe('Short Butterfly Call Strategy', () => {
    const strategy = new ShortButterflyCall();

    it('deve identificar corretamente uma Short Butterfly (Call) com lucro máximo no crédito recebido', () => {
        const mockOptions: any[] = [
            { option_ticker: 'CALL_A', tipo: 'CALL', strike: 30, premio: 4.50, vencimento: '2025-05-15', ativo_subjacente: 'PETR4', gregas_unitarias: { delta: 0.8, gamma: 0.01, theta: -0.02, vega: 0.05 } },
            { option_ticker: 'CALL_B', tipo: 'CALL', strike: 32, premio: 2.50, vencimento: '2025-05-15', ativo_subjacente: 'PETR4', gregas_unitarias: { delta: 0.5, gamma: 0.02, theta: -0.03, vega: 0.08 } },
            { option_ticker: 'CALL_C', tipo: 'CALL', strike: 34, premio: 1.20, vencimento: '2025-05-15', ativo_subjacente: 'PETR4', gregas_unitarias: { delta: 0.2, gamma: 0.01, theta: -0.01, vega: 0.04 } }
        ];

        const results = strategy.calculateMetrics(mockOptions, 32, 0);

        // netCredit = 4.50 - (2 * 2.50) + 1.20 = 4.50 - 5.00 + 1.20 = 0.70
        // Risco Max = (32 - 30) - 0.70 = 2.00 - 0.70 = 1.30
        // BE Alta = 34 - 0.70 = 33.30
        // BE Baixa = 30 + 0.70 = 30.70

        expect(results.length).toBe(1);
        expect(results[0].net_premium).toBeCloseTo(0.70);
        expect(results[0].lucro_maximo).toBeCloseTo(0.70);
        expect(results[0].risco_maximo).toBeCloseTo(1.30);
        expect(results[0].breakEvenPoints).toContain(30.70);
        expect(results[0].breakEvenPoints).toContain(33.30);
    });
});