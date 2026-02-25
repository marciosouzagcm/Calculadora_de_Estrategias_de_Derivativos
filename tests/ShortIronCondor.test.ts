import { describe, it, expect } from 'vitest';
import { ShortIronCondor } from '../strategies/ShortIronCondor';

describe('Short Iron Condor Strategy', () => {
    const strategy = new ShortIronCondor();

    it('deve identificar corretamente um Short Iron Condor com lucro limitado ao crédito recebido', () => {
        const mockOptions: any[] = [
            // Perna da Put (Trava de Crédito Put)
            { option_ticker: 'PETRP30', tipo: 'PUT', strike: 30, premio: 0.80, vencimento: '2025-05-15', ativo_subjacente: 'PETR4', gregas_unitarias: { delta: -0.3, gamma: 0.02, theta: 0.02, vega: 0.05 } },
            { option_ticker: 'PETRP28', tipo: 'PUT', strike: 28, premio: 0.30, vencimento: '2025-05-15', ativo_subjacente: 'PETR4', gregas_unitarias: { delta: -0.1, gamma: 0.01, theta: 0.01, vega: 0.02 } },
            // Perna da Call (Trava de Crédito Call)
            { option_ticker: 'PETRE34', tipo: 'CALL', strike: 34, premio: 0.70, vencimento: '2025-05-15', ativo_subjacente: 'PETR4', gregas_unitarias: { delta: 0.3, gamma: 0.02, theta: -0.02, vega: 0.05 } },
            { option_ticker: 'PETRE36', tipo: 'CALL', strike: 36, premio: 0.20, vencimento: '2025-05-15', ativo_subjacente: 'PETR4', gregas_unitarias: { delta: 0.1, gamma: 0.01, theta: -0.01, vega: 0.02 } }
        ];

        const results = strategy.calculateMetrics(mockOptions, 32, 0);

        // Crédito = (0.80 - 0.30) + (0.70 - 0.20) = 0.50 + 0.50 = 1.00
        // Risco = (30 - 28) - 1.00 = 1.00
        // BE Baixa = 30 - 1.00 = 29.00
        // BE Alta = 34 + 1.00 = 35.00

        expect(results.length).toBe(1);
        expect(results[0].net_premium).toBeCloseTo(1.00);
        expect(results[0].lucro_maximo).toBeCloseTo(1.00);
        expect(results[0].risco_maximo).toBeCloseTo(1.00);
        expect(results[0].breakEvenPoints).toContain(29.00);
        expect(results[0].breakEvenPoints).toContain(35.00);
    });
});