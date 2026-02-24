import { describe, it, expect } from 'vitest';
import { LongPutDiagonal } from '../strategies/LongPutDiagonal';
import { OptionLeg } from '../interfaces/Types';

describe('Long Put Diagonal Strategy (Diagonal de Baixa)', () => {
    const strategy = new LongPutDiagonal();
    const assetPrice = 50.00;

    it('deve identificar uma diagonal de baixa válida (Put)', () => {
        const mockOptions: OptionLeg[] = [
            {
                option_ticker: 'PETRS550', // Julho (Back Month)
                tipo: 'PUT', strike: 55.00, premio: 6.00,
                vencimento: '2026-07-17', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: -0.70, gamma: 0.04, theta: -0.03, vega: 0.10, rho: 0 }
            },
            {
                option_ticker: 'PETRR480', // Junho (Front Month)
                tipo: 'PUT', strike: 48.00, premio: 1.50,
                vencimento: '2026-06-19', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: -0.30, gamma: 0.06, theta: -0.06, vega: 0.05, rho: 0 }
            }
        ];

        const results = strategy.calculateMetrics(mockOptions, assetPrice, 0);

        expect(results.length).toBe(1);
        const m = results[0];

        // Débito: 6.00 - 1.50 = 4.50
        expect(m.net_premium).toBe(4.50);
        
        // Theta consolidado: -0.03 - (-0.06) = +0.03 (Tempo a favor)
        expect(m.greeks.theta).toBeGreaterThan(0);
        
        // Delta consolidado: -0.70 - (-0.30) = -0.40 (Visão de baixa)
        expect(m.greeks.delta).toBeLessThan(0);
    });
});