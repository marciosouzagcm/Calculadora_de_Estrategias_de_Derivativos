import { describe, it, expect } from 'vitest';
import { BullCallSpread } from '../strategies/BullCallSpread';
import { OptionLeg } from '../interfaces/Types';

describe('BullCallSpread Strategy (Trava de Alta com Call)', () => {
    const strategy = new BullCallSpread();
    const assetPrice = 20.00;

    it('deve calcular corretamente uma trava de alta a débito', () => {
        const mockOptions: OptionLeg[] = [
            {
                option_ticker: 'PETRE200',
                tipo: 'CALL',
                strike: 20.00,
                premio: 1.50, // Comprada (ITM/ATM)
                vencimento: '2025-05-16',
                ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0.55, gamma: 0.10, theta: -0.05, vega: 0.04, rho: 0 },
                dias_uteis: 20
            },
            {
                option_ticker: 'PETRE220',
                tipo: 'CALL',
                strike: 22.00,
                premio: 0.60, // Vendida (OTM)
                vencimento: '2025-05-16',
                ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0.25, gamma: 0.06, theta: -0.03, vega: 0.03, rho: 0 },
                dias_uteis: 20
            }
        ];

        const results = strategy.calculateMetrics(mockOptions, assetPrice, 0);

        expect(results.length).toBe(1);
        const m = results[0];

        // Custo Líquido: 1.50 - 0.60 = 0.90
        expect(m.net_premium).toBe(-0.90);
        // Lucro Máximo: (22 - 20) - 0.90 = 1.10
        expect(m.lucro_maximo).toBe(1.10);
        // Break-even: 20 + 0.90 = 20.90
        expect(m.breakEvenPoints[0]).toBe(20.90);

        // Delta Consolidado: 0.55 - 0.25 = 0.30 (Positivo/Bullish)
        expect(m.greeks.delta).toBeCloseTo(0.30);
    });

    it('deve filtrar travas onde o custo é excessivo (> 80% da largura)', () => {
        const mockOptions: OptionLeg[] = [
            {
                option_ticker: 'C1', tipo: 'CALL', strike: 10, premio: 1.00, 
                vencimento: '2025-05-16', ativo_subjacente: 'X',
                gregas_unitarias: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 }
            },
            {
                option_ticker: 'C2', tipo: 'CALL', strike: 11, premio: 0.10, 
                vencimento: '2025-05-16', ativo_subjacente: 'X',
                gregas_unitarias: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 }
            }
        ];
        // Custo: 0.90 | Largura: 1.00 (90% > 80%) -> Deve ser filtrado
        const results = strategy.calculateMetrics(mockOptions, 10, 0);
        expect(results.length).toBe(0);
    });
});