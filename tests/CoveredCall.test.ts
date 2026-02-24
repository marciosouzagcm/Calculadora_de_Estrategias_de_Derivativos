import { describe, it, expect } from 'vitest';
import { CoveredCall } from '../strategies/CoveredCall';
import { OptionLeg } from '../interfaces/Types';

describe('CoveredCall Strategy (Lançamento Coberto)', () => {
    const strategy = new CoveredCall();
    const assetPrice = 30.00;

    it('deve calcular corretamente os ganhos de um lançamento ATM', () => {
        const mockOptions: OptionLeg[] = [
            {
                option_ticker: 'PETRE300',
                tipo: 'CALL',
                strike: 30.00,
                premio: 1.50, // Prêmio recebido
                vencimento: '2025-05-16',
                ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0.52, gamma: 0.08, theta: -0.04, vega: 0.03, rho: 0 },
                dias_uteis: 20
            }
        ];

        const results = strategy.calculateMetrics(mockOptions, assetPrice, 0);

        expect(results.length).toBe(1);
        const m = results[0];

        // Break-even: 30.00 - 1.50 = 28.50
        expect(m.breakEvenPoints[0]).toBe(28.50);
        // Lucro Máximo (ATM): apenas o prêmio (1.50)
        expect(m.lucro_maximo).toBe(1.50);
        
        // Delta da Posição: 1 - 0.52 = 0.48
        expect(m.greeks.delta).toBeCloseTo(0.48);
        // Theta da Posição: -(-0.04) = 0.04 (Positivo, ganha com o tempo)
        expect(m.greeks.theta).toBeGreaterThan(0);
    });

    it('deve incluir a valorização do ativo no lucro máximo para lançamentos OTM', () => {
        const mockOptions: OptionLeg[] = [
            {
                option_ticker: 'PETRE320',
                tipo: 'CALL',
                strike: 32.00, // OTM
                premio: 0.80,
                vencimento: '2025-05-16',
                ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0.30, gamma: 0.05, theta: -0.02, vega: 0.02, rho: 0 }
            }
        ];

        const results = strategy.calculateMetrics(mockOptions, assetPrice, 0);
        const m = results[0];

        // Lucro Máximo: (32 - 30) + 0.80 = 2.80
        expect(m.lucro_maximo).toBe(2.80);
    });
});