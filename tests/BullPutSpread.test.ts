import { describe, it, expect } from 'vitest';
import { BullPutSpread } from '../strategies/BullPutSpread';
import { OptionLeg } from '../interfaces/Types';

describe('BullPutSpread Strategy (Trava de Alta com Put)', () => {
    const strategy = new BullPutSpread();
    const assetPrice = 30.00;

    it('deve calcular corretamente uma trava de alta a crédito com Puts', () => {
        const mockOptions: OptionLeg[] = [
            {
                option_ticker: 'PETRP300', tipo: 'PUT', strike: 30.00, premio: 1.20, // Venda (ATM)
                vencimento: '2025-05-16', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: -0.50, gamma: 0.10, theta: -0.04, vega: 0.05, rho: 0 }
            },
            {
                option_ticker: 'PETRP280', tipo: 'PUT', strike: 28.00, premio: 0.40, // Compra (OTM)
                vencimento: '2025-05-16', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: -0.20, gamma: 0.05, theta: -0.02, vega: 0.03, rho: 0 }
            }
        ];

        const results = strategy.calculateMetrics(mockOptions, assetPrice, 0);
        const m = results[0];

        // Crédito Líquido: 1.20 - 0.40 = 0.80
        expect(m.net_premium).toBeCloseTo(0.80);
        // Risco Máximo: (30 - 28) - 0.80 = 1.20
        expect(m.risco_maximo).toBeCloseTo(1.20);
        // Lucro Máximo = Crédito: 0.80
        expect(m.lucro_maximo).toBeCloseTo(0.80);
        // Break-even: 30 - 0.80 = 29.20
        expect(m.breakEvenPoints[0]).toBeCloseTo(29.20);
    });
});