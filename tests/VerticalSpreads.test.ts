import { describe, it, expect } from 'vitest';
import { 
    BullCallSpread, 
    BullPutSpread 
} from '../strategies/VerticalSpreadBase';

describe('Vertical Spread Strategies', () => {
    
    const mockOptions: any[] = [
        // CALLS para Trava de Alta
        { 
            option_ticker: 'PETRE30', tipo: 'CALL', strike: 30, premio: 2.50, 
            vencimento: '2025-05-15', ativo_subjacente: 'PETR4', 
            gregas_unitarias: { delta: 0.6, gamma: 0.02, theta: -0.01, vega: 0.03 } 
        },
        { 
            option_ticker: 'PETRE32', tipo: 'CALL', strike: 32, premio: 1.20, 
            vencimento: '2025-05-15', ativo_subjacente: 'PETR4', 
            gregas_unitarias: { delta: 0.4, gamma: 0.01, theta: -0.01, vega: 0.02 } 
        },
        // PUTS para Trava de Alta
        { 
            option_ticker: 'PETRP30', tipo: 'PUT', strike: 30, premio: 1.10, 
            vencimento: '2025-05-15', ativo_subjacente: 'PETR4', 
            gregas_unitarias: { delta: -0.4, gamma: 0.02, theta: -0.01, vega: 0.03 } 
        },
        { 
            option_ticker: 'PETRP28', tipo: 'PUT', strike: 28, premio: 0.50, 
            vencimento: '2025-05-15', ativo_subjacente: 'PETR4', 
            gregas_unitarias: { delta: -0.2, gamma: 0.01, theta: -0.01, vega: 0.02 } 
        }
    ];

    it('Bull Call Spread: deve calcular corretamente uma trava de débito', () => {
        const strategy = new BullCallSpread();
        const results = strategy.calculateMetrics(mockOptions, 31, 0);
        const trade = results[0];

        expect(trade.natureza).toBe('DÉBITO');
        expect(trade.net_premium).toBeCloseTo(-1.30);
        expect(trade.breakEvenPoints).toContain(31.30); // Strike Comprado (30) + Custo (1.30)
    });

    it('Bull Put Spread: deve calcular corretamente uma trava de crédito', () => {
        const strategy = new BullPutSpread();
        const results = strategy.calculateMetrics(mockOptions, 31, 0);
        const trade = results[0];

        // Crédito = 1.10 - 0.50 = 0.60
        expect(trade.natureza).toBe('CRÉDITO');
        expect(trade.net_premium).toBeCloseTo(0.60);
        
        // No Bull Put Spread (Crédito), o BE é Strike Vendido (30) - Crédito (0.60) = 29.40
        // Se a classe base retornar 30.60, a lógica de Puts na VerticalSpreadBase precisa ser invertida.
        expect(trade.breakEvenPoints).toContain(29.40); 
    });
});