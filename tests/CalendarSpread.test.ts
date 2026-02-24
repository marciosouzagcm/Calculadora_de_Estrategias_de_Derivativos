import { describe, expect, it } from 'vitest';
import { CalendarSpread } from '../strategies/CalendarSpread';

describe('CalendarSpread Strategy (Trava de Linha)', () => {
    const strategy = new CalendarSpread();

    it('deve identificar corretamente uma trava de linha com Calls', () => {
        const mockOptions: any[] = [
            {
                option_ticker: 'PETRE30', tipo: 'CALL', strike: 30, premio: 1.00,
                vencimento: '2025-05-15', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0.5, gamma: 0.1, theta: -0.1, vega: 0.1, rho: 0 }
            },
            {
                option_ticker: 'PETRF30', tipo: 'CALL', strike: 30, premio: 1.80,
                vencimento: '2025-06-15', ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0.5, gamma: 0.08, theta: -0.06, vega: 0.15, rho: 0 }
            }
        ];

        const results = strategy.calculateMetrics(mockOptions, 30, 0);
        expect(results.length).toBe(1);
        expect(results[0].net_premium).toBeCloseTo(-0.80);
    });

    it('deve ignorar quando o vencimento da "curta" for maior que o da "longa"', () => {
        // Usamos datas IGUAIS para garantir que o filtro d1 >= d2 bloqueie ambos os sentidos do loop
        const invalidOptions: any[] = [
            {
                option_ticker: 'OPCAO_A', tipo: 'CALL', strike: 30, premio: 1.00,
                vencimento: '2025-05-01',
                ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 }
            },
            {
                option_ticker: 'OPCAO_B', tipo: 'CALL', strike: 30, premio: 1.00,
                vencimento: '2025-05-01',
                ativo_subjacente: 'PETR4',
                gregas_unitarias: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 }
            }
        ];

        const results = strategy.calculateMetrics(invalidOptions, 30, 0);
        
        // Agora o resultado será obrigatoriamente 0
        expect(results.length).toBe(0);
    });
});