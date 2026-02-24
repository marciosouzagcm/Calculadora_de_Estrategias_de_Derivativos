import { describe, it, expect } from 'vitest';
import { BoxSpread } from '../strategies/BoxSpread';
import { OptionLeg } from '../interfaces/Types';

describe('BoxSpread Strategy (Arbitragem)', () => {
    const strategy = new BoxSpread();
    const assetPrice = 30.00;

    it('deve identificar um Box Spread lucrativo (Arbitragem)', () => {
        const mockOptions: OptionLeg[] = [
            // Bull Call Spread: C30 (1.50) e V32 (0.60) -> Custo 0.90
            {
                option_ticker: 'CALL30', tipo: 'CALL', strike: 30, premio: 1.50,
                vencimento: '2025-05-16', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0.5, gamma: 0.01, theta: -0.01, vega: 0.01, rho: 0 }
            },
            {
                option_ticker: 'CALL32', tipo: 'CALL', strike: 32, premio: 0.60,
                vencimento: '2025-05-16', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0.3, gamma: 0.01, theta: -0.01, vega: 0.01, rho: 0 }
            },
            // Bear Put Spread: C32 (1.20) e V30 (0.40) -> Custo 0.80
            {
                option_ticker: 'PUT32', tipo: 'PUT', strike: 32, premio: 1.20,
                vencimento: '2025-05-16', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: -0.7, gamma: 0.01, theta: -0.01, vega: 0.01, rho: 0 }
            },
            {
                option_ticker: 'PUT30', tipo: 'PUT', strike: 30, premio: 0.40,
                vencimento: '2025-05-16', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: -0.5, gamma: 0.01, theta: -0.01, vega: 0.01, rho: 0 }
            }
        ];

        const results = strategy.calculateMetrics(mockOptions, assetPrice, 0);

        expect(results.length).toBe(1);
        const m = results[0];

        // Largura (Width) = 32 - 30 = 2.00
        // Custo Líquido = (1.50 - 0.60) + (1.20 - 0.40) = 0.90 + 0.80 = 1.70
        // Lucro Max = 2.00 - 1.70 = 0.30
        expect(m.net_premium).toBe(1.70);
        expect(m.lucro_maximo).toBeCloseTo(0.30);
        
        // No Box, o Delta deve ser neutro (próximo de zero)
        // (0.5 - 0.3) + (-0.7 - (-0.5)) = 0.2 + (-0.2) = 0
        expect(m.greeks.delta).toBeCloseTo(0);
    });
});