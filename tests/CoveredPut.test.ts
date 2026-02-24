import { describe, it, expect } from 'vitest';
import { CoveredPut } from '../strategies/CoveredPut';
import { OptionLeg } from '../interfaces/Types';

describe('CoveredPut Strategy (Lançamento Coberto de Put)', () => {
    const strategy = new CoveredPut();
    const assetPrice = 50.00;

    it('deve calcular corretamente os ganhos de um lançamento de Put ATM', () => {
        const mockOptions: OptionLeg[] = [
            {
                option_ticker: 'PETRR500',
                tipo: 'PUT',
                strike: 50.00,
                premio: 2.00, // Prêmio recebido
                vencimento: '2025-06-20',
                ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: -0.50, gamma: 0.04, theta: -0.03, vega: 0.02, rho: 0 },
                dias_uteis: 30
            }
        ];

        const results = strategy.calculateMetrics(mockOptions, assetPrice, 0);
        const m = results[0];

        // Break-even (Alta): 50.00 + 2.00 = 52.00
        expect(m.breakEvenPoints[0]).toBe(52.00);
        
        // Lucro Máximo (ATM): apenas o prêmio (2.00)
        expect(m.lucro_maximo).toBe(2.00);
        
        // Delta da Posição: -1 (ativo short) - (-0.50) = -0.50
        expect(m.greeks.delta).toBeCloseTo(-0.50);
        
        // Theta da Posição: -(-0.03) = 0.03 (Positivo)
        expect(m.greeks.theta).toBeGreaterThan(0);
    });

    it('deve calcular lucro adicional se a Put for OTM (strike < preço ativo)', () => {
        const mockOptions: OptionLeg[] = [
            {
                option_ticker: 'PETRR450',
                tipo: 'PUT',
                strike: 45.00, // OTM para quem está vendido
                premio: 1.00,
                vencimento: '2025-06-20',
                ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: -0.25, gamma: 0.03, theta: -0.02, vega: 0.01, rho: 0 }
            }
        ];

        const results = strategy.calculateMetrics(mockOptions, assetPrice, 0);
        const m = results[0];

        // Lucro Máximo: (50 - 45) + 1.00 = 6.00
        expect(m.lucro_maximo).toBe(6.00);
    });
});