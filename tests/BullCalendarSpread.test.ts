import { describe, it, expect } from 'vitest';
import { BullCalendarSpread } from '../strategies/BullCalendarSpread';
import { OptionLeg } from '../interfaces/Types';

describe('BullCalendarSpread Strategy', () => {
    const strategy = new BullCalendarSpread();
    const assetPrice = 25.00;

    it('deve identificar corretamente um par de calendário de Call OTM', () => {
        const mockOptions: OptionLeg[] = [
            {
                option_ticker: 'PETRF280',
                tipo: 'CALL',
                strike: 28.00, // OTM (28 > 25)
                premio: 1.20, // Vencimento Longo
                vencimento: '2025-06-20',
                ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0.4, gamma: 0.03, theta: -0.02, vega: 0.06, rho: 0 },
                dias_uteis: 45
            },
            {
                option_ticker: 'PETRE280',
                tipo: 'CALL',
                strike: 28.00,
                premio: 0.70, // Vencimento Curto
                vencimento: '2025-05-16',
                ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0.35, gamma: 0.05, theta: -0.04, vega: 0.03, rho: 0 },
                dias_uteis: 22
            }
        ];

        const results = strategy.calculateMetrics(mockOptions, assetPrice, 0);

        expect(results.length).toBe(1);
        const m = results[0];

        // Custo Líquido: 1.20 - 0.70 = 0.50
        expect(m.net_premium).toBe(0.50);
        
        // Lucro Máximo estimado: (1.20 * 0.85) - 0.50 = 1.02 - 0.50 = 0.52
        expect(m.lucro_maximo).toBeCloseTo(0.52);

        // Theta deve ser positivo (ganha com o tempo): -0.02 - (-0.04) = +0.02
        expect(m.greeks.theta).toBeGreaterThan(0);
    });

    it('deve ignorar calendários ITM ou ATM conforme a regra de mercado Bullish', () => {
        const itmOptions: OptionLeg[] = [
            {
                option_ticker: 'ITM_LONG', tipo: 'CALL', strike: 20, premio: 5.0, 
                vencimento: '2025-06-20', ativo_subjacente: 'X',
                gregas_unitarias: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 }
            },
            {
                option_ticker: 'ITM_SHORT', tipo: 'CALL', strike: 20, premio: 4.5, 
                vencimento: '2025-05-16', ativo_subjacente: 'X',
                gregas_unitarias: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 }
            }
        ];
        // Strike 20 < Asset 25 -> Deve filtrar
        const results = strategy.calculateMetrics(itmOptions, 25, 0);
        expect(results.length).toBe(0);
    });
});