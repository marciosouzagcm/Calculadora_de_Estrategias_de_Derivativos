import { describe, it, expect } from 'vitest';
import { BearPutSpread } from '../strategies/BearPutSpread';
import { OptionLeg } from '../interfaces/Types';

describe('BearPutSpread Strategy (Trava de Baixa com Put)', () => {
    const strategy = new BearPutSpread();
    const assetPrice = 30.00;

    it('deve calcular corretamente uma trava de débito com Put', () => {
        const mockOptions: OptionLeg[] = [
            {
                option_ticker: 'PETRR320',
                tipo: 'PUT',
                strike: 32.00,
                premio: 2.50, // Comprada (ITM - Mais cara)
                vencimento: '2025-06-20',
                ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: -0.70, gamma: 0.05, theta: -0.02, vega: 0.04, rho: 0 },
                dias_uteis: 30
            },
            {
                option_ticker: 'PETRR280',
                tipo: 'PUT',
                strike: 28.00,
                premio: 0.50, // Vendida (OTM - Mais barata)
                vencimento: '2025-06-20',
                ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: -0.30, gamma: 0.03, theta: -0.01, vega: 0.02, rho: 0 },
                dias_uteis: 30
            }
        ];

        const results = strategy.calculateMetrics(mockOptions, assetPrice, 0);

        expect(results.length).toBe(1);
        const m = results[0];

        // Custo Líquido: 2.50 - 0.50 = 2.00
        expect(m.net_premium).toBe(-2.00); // Representação de débito
        expect(m.risco_maximo).toBe(2.00);

        // Lucro Máximo: (32 - 28) - 2.00 = 2.00
        expect(m.lucro_maximo).toBe(2.00);

        // Break-even: 32 (Strike Comprado) - 2.00 (Débito) = 30.00
        expect(m.breakEvenPoints[0]).toBe(30.00);

        // Delta: -0.70 - (-0.30) = -0.40 (Bearish)
        expect(m.greeks.delta).toBeCloseTo(-0.40);
    });

    it('deve filtrar travas onde o custo ultrapassa 85% da largura', () => {
        const expensiveOptions: OptionLeg[] = [
            {
                option_ticker: 'P1', tipo: 'PUT', strike: 10, premio: 0.95, 
                vencimento: '2025-06-20', ativo_subjacente: 'X',
                gregas_unitarias: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 }
            },
            {
                option_ticker: 'P2', tipo: 'PUT', strike: 9, premio: 0.05, 
                vencimento: '2025-06-20', ativo_subjacente: 'X',
                gregas_unitarias: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 }
            }
        ];
        // Custo: 0.90 | Largura: 1.00 (90% > 85%) -> Deve ser filtrado
        const results = strategy.calculateMetrics(expensiveOptions, 10, 0);
        expect(results.length).toBe(0);
    });
});