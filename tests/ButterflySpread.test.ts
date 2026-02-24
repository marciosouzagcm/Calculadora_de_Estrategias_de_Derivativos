import { describe, it, expect } from 'vitest';
import { ButterflySpread } from '../strategies/ButterflySpread';
import { OptionLeg } from '../interfaces/Types';

describe('ButterflySpread Strategy (Borboleta)', () => {
    const strategy = new ButterflySpread();
    const assetPrice = 30.00;

    it('deve identificar uma borboleta simétrica lucrativa', () => {
        const mockOptions: OptionLeg[] = [
            { option_ticker: 'K1', tipo: 'CALL', strike: 28.00, premio: 2.50, vencimento: '2025-05-16', ativo_subjacente: 'X', gregas_unitarias: { delta: 0.8, gamma: 0, theta: 0, vega: 0, rho: 0 } },
            { option_ticker: 'K2', tipo: 'CALL', strike: 30.00, premio: 1.10, vencimento: '2025-05-16', ativo_subjacente: 'X', gregas_unitarias: { delta: 0.5, gamma: 0, theta: 0, vega: 0, rho: 0 } },
            { option_ticker: 'K3', tipo: 'CALL', strike: 32.00, premio: 0.30, vencimento: '2025-05-16', ativo_subjacente: 'X', gregas_unitarias: { delta: 0.2, gamma: 0, theta: 0, vega: 0, rho: 0 } }
        ];

        const results = strategy.calculateMetrics(mockOptions, assetPrice, 0);
        expect(results.length).toBe(1);
        const m = results[0];

        // Custo: 2.50 + 0.30 - (2 * 1.10) = 2.80 - 2.20 = 0.60
        // Como é débito, net_premium deve ser -0.60
        expect(m.net_premium).toBeCloseTo(-0.60);
        // Lucro Máximo: (30 - 28) - 0.60 = 1.40
        expect(m.lucro_maximo).toBeCloseTo(1.40);
    });

    it('deve ignorar borboletas assimétricas', () => {
        const mockOptions: OptionLeg[] = [
            { option_ticker: 'K1', tipo: 'CALL', strike: 28.00, premio: 2.50, vencimento: '2025-05-16', ativo_subjacente: 'X', gregas_unitarias: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 } },
            { option_ticker: 'K2', tipo: 'CALL', strike: 30.00, premio: 1.10, vencimento: '2025-05-16', ativo_subjacente: 'X', gregas_unitarias: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 } },
            { option_ticker: 'K4', tipo: 'CALL', strike: 33.00, premio: 0.10, vencimento: '2025-05-16', ativo_subjacente: 'X', gregas_unitarias: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 } }
        ];

        const results = strategy.calculateMetrics(mockOptions, assetPrice, 0);
        expect(results.length).toBe(0);
    });
});