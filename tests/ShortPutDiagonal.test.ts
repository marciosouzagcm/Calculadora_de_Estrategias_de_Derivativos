import { describe, it, expect } from 'vitest';
import { ShortPutDiagonal } from '../strategies/ShortPutDiagonal';

describe('Short Put Diagonal Strategy', () => {
    const strategy = new ShortPutDiagonal();

    it('deve identificar corretamente uma Short Put Diagonal com crédito líquido', () => {
        const mockOptions: any[] = [
            { 
                option_ticker: 'PETRP36', tipo: 'PUT', strike: 36, premio: 4.20, 
                vencimento: '2025-05-15', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: -0.8, gamma: 0.02, theta: 0.05, vega: 0.04 } 
            },
            { 
                option_ticker: 'PETRP32', tipo: 'PUT', strike: 32, premio: 1.50, 
                vencimento: '2025-06-20', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: -0.3, gamma: 0.01, theta: 0.02, vega: 0.06 } 
            }
        ];

        const results = strategy.calculateMetrics(mockOptions, 34, 0);

        // netCredit = 4.20 (Venc Curt/ITM) - 1.50 (Venc Long/OTM) = 2.70
        // Width = 36 - 32 = 4.00
        // maxLoss = 4.00 - 2.70 = 1.30

        expect(results.length).toBe(1);
        expect(results[0].net_premium).toBeCloseTo(2.70);
        expect(results[0].risco_maximo).toBeCloseTo(1.30);
        expect(results[0].natureza).toBe('CRÉDITO');
    });
});