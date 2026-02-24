import { describe, it, expect } from 'vitest';
import { IronCondorSpread } from '../strategies/IronCondorSpread';
import { OptionLeg } from '../interfaces/Types';

describe('IronCondorSpread Strategy', () => {
    const strategy = new IronCondorSpread();
    const assetPrice = 100.00;

    it('deve calcular corretamente um Iron Condor simétrico', () => {
        const mockOptions: OptionLeg[] = [
            // PUTS
            { option_ticker: 'P90', tipo: 'PUT', strike: 90.00, premio: 0.50, vencimento: '2026-04-17', gregas_unitarias: { delta: -0.15, gamma: 0.02, theta: -0.02, vega: 0.03, rho: 0 } },
            { option_ticker: 'P95', tipo: 'PUT', strike: 95.00, premio: 1.20, vencimento: '2026-04-17', gregas_unitarias: { delta: -0.30, gamma: 0.04, theta: -0.04, vega: 0.05, rho: 0 } },
            // CALLS
            { option_ticker: 'C105', tipo: 'CALL', strike: 105.00, premio: 1.10, vencimento: '2026-04-17', gregas_unitarias: { delta: 0.30, gamma: 0.04, theta: -0.04, vega: 0.05, rho: 0 } },
            { option_ticker: 'C110', tipo: 'CALL', strike: 110.00, premio: 0.40, vencimento: '2026-04-17', gregas_unitarias: { delta: 0.15, gamma: 0.02, theta: -0.02, vega: 0.03, rho: 0 } }
        ];

        const results = strategy.calculateMetrics(mockOptions, assetPrice, 0);
        expect(results.length).toBe(1);
        
        const m = results[0];
        // Crédito: (1.20 + 1.10) - (0.50 + 0.40) = 2.30 - 0.90 = 1.40
        expect(m.net_premium).toBe(1.40);
        // Risco Máximo: Largura(5) - Crédito(1.40) = 3.60
        expect(m.risco_maximo).toBe(3.60);
        // Breakevens: 95 - 1.40 = 93.60 e 105 + 1.40 = 106.40
        expect(m.breakEvenPoints).toContain(93.60);
        expect(m.breakEvenPoints).toContain(106.40);
    });
});