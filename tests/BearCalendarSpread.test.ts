import { describe, it, expect } from 'vitest';
import { BearCalendarSpread } from '../strategies/BearCalendarSpread';
import { OptionLeg } from '../interfaces/Types';

describe('BearCalendarSpread Strategy', () => {
    const strategy = new BearCalendarSpread();
    const assetPrice = 30.00;

    it('deve identificar corretamente um par de calendário de Put', () => {
        const mockOptions: OptionLeg[] = [
            {
                option_ticker: 'PETRW300',
                tipo: 'PUT',
                strike: 30.00,
                premio: 1.50, // Vencimento Longo
                vencimento: '2025-06-20',
                ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: -0.5, gamma: 0.02, theta: -0.01, vega: 0.05, rho: 0 },
                dias_uteis: 40
            },
            {
                option_ticker: 'PETRM300',
                tipo: 'PUT',
                strike: 30.00,
                premio: 0.80, // Vencimento Curto
                vencimento: '2025-05-16',
                ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: -0.45, gamma: 0.05, theta: -0.03, vega: 0.02, rho: 0 },
                dias_uteis: 20
            }
        ];

        const results = strategy.calculateMetrics(mockOptions, assetPrice, 0);

        expect(results.length).toBe(1);
        const m = results[0];

        // Validação de Custo Líquido (1.50 - 0.80 = 0.70)
        expect(m.net_premium).toBe(0.70);
        expect(m.risco_maximo).toBe(0.70);

        // Validação das Gregas da Posição (Long - Short)
        // Delta: -0.5 - (-0.45) = -0.05
        expect(m.greeks.delta).toBeCloseTo(-0.05);
        // Theta: -0.01 - (-0.03) = +0.02 (Calendários ganham com o tempo)
        expect(m.greeks.theta).toBeGreaterThan(0);
    });

    it('não deve aceitar opções com o mesmo vencimento', () => {
        const sameExpiry: OptionLeg[] = [
            {
                option_ticker: 'P1', tipo: 'PUT', strike: 30, premio: 1.0, 
                vencimento: '2025-05-16', ativo_subjacente: 'X',
                gregas_unitarias: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 }
            },
            {
                option_ticker: 'P2', tipo: 'PUT', strike: 30, premio: 0.5, 
                vencimento: '2025-05-16', ativo_subjacente: 'X',
                gregas_unitarias: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 }
            }
        ];
        const results = strategy.calculateMetrics(sameExpiry, assetPrice, 0);
        expect(results.length).toBe(0);
    });
});