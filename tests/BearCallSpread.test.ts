import { describe, it, expect } from 'vitest';
import { BearCallSpread } from '../strategies/BearCallSpread';
import { OptionLeg } from '../interfaces/Types';

describe('BearCallSpread Strategy (Trava de Baixa)', () => {
    const strategy = new BearCallSpread();
    const assetPrice = 35.00;

    it('deve calcular corretamente uma trava de crédito com Call', () => {
        const mockOptions: OptionLeg[] = [
            {
                option_ticker: 'PETRE340',
                tipo: 'CALL',
                strike: 34.00,
                premio: 2.10, // Vendida (Mais cara/ITM)
                vencimento: '2025-05-16',
                ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0.65, gamma: 0.08, theta: -0.05, vega: 0.04, rho: 0 },
                dias_uteis: 15
            },
            {
                option_ticker: 'PETRE360',
                tipo: 'CALL',
                strike: 36.00,
                premio: 0.90, // Comprada (Mais barata/OTM)
                vencimento: '2025-05-16',
                ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0.35, gamma: 0.05, theta: -0.03, vega: 0.03, rho: 0 },
                dias_uteis: 15
            }
        ];

        const results = strategy.calculateMetrics(mockOptions, assetPrice, 0);

        expect(results.length).toBe(1);
        const m = results[0];

        // Usando toBeCloseTo para evitar imprecisão de ponto flutuante
        // Crédito Líquido: 2.10 - 0.90 = 1.20
        expect(m.net_premium).toBeCloseTo(1.20);
        // Largura: 36 - 34 = 2.00. Risco Máximo: 2.00 - 1.20 = 0.80
        expect(m.risco_maximo).toBeCloseTo(0.80);
        // Break-even: 34 (strike vendido) + 1.20 (crédito) = 35.20
        expect(m.breakEvenPoints[0]).toBeCloseTo(35.20);

        // Gregas: (Vendido inverte sinal)
        // Delta: (0.65 * -1) + 0.35 = -0.30
        expect(m.greeks.delta).toBeCloseTo(-0.30);
        // Theta: (-0.05 * -1) + (-0.03) = +0.02 (Recebe tempo)
        expect(m.greeks.theta).toBeGreaterThan(0);
    });

    it('deve filtrar travas com ROI "infinito" ou distorcido (book sem liquidez)', () => {
        const illiquidOptions: OptionLeg[] = [
            {
                option_ticker: 'TEST1', tipo: 'CALL', strike: 10, premio: 1.00, 
                vencimento: '2025-05-16', ativo_subjacente: 'X',
                gregas_unitarias: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 }
            },
            {
                option_ticker: 'TEST2', tipo: 'CALL', strike: 11, premio: 0.05, 
                vencimento: '2025-05-16', ativo_subjacente: 'X',
                gregas_unitarias: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 }
            }
        ];
        const results = strategy.calculateMetrics(illiquidOptions, 10, 0);
        expect(results.length).toBe(0);
    });
});