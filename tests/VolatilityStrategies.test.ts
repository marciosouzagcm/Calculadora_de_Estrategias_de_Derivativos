import { describe, expect, it } from 'vitest';
import {
    LongStraddle,
    LongStrangle,
    ShortStraddle
} from '../strategies/StraddleSpreadBase'; // Apontando para o arquivo correto

describe('Volatility Strategies (Based on StraddleSpreadBase)', () => {
    
    const mockOptions: any[] = [
        { 
            option_ticker: 'PETRE30', tipo: 'CALL', strike: 30, premio: 1.50, 
            vencimento: '2025-05-15', ativo_subjacente: 'PETR4',
            gregas_unitarias: { delta: 0.5, gamma: 0.05, theta: -0.04, vega: 0.10 } 
        },
        { 
            option_ticker: 'PETRP30', tipo: 'PUT', strike: 30, premio: 1.20, 
            vencimento: '2025-05-15', ativo_subjacente: 'PETR4',
            gregas_unitarias: { delta: -0.5, gamma: 0.05, theta: -0.04, vega: 0.10 } 
        },
        { 
            option_ticker: 'PETRP28', tipo: 'PUT', strike: 28, premio: 0.60, 
            vencimento: '2025-05-15', ativo_subjacente: 'PETR4',
            gregas_unitarias: { delta: -0.2, gamma: 0.02, theta: -0.02, vega: 0.05 } 
        }
    ];

    it('Long Straddle: deve calcular débito corretamente', () => {
        const strategy = new LongStraddle();
        const results = strategy.calculateMetrics(mockOptions.filter(o => o.strike === 30), 30, 0);
        
        expect(results[0].natureza).toBe('DÉBITO');
        expect(results[0].net_premium).toBeCloseTo(-2.70);
    });

    it('Short Straddle: deve calcular crédito e theta positivo', () => {
        const strategy = new ShortStraddle();
        const results = strategy.calculateMetrics(mockOptions.filter(o => o.strike === 30), 30, 0);
        
        expect(results[0].natureza).toBe('CRÉDITO');
        expect(results[0].greeks.theta).toBeGreaterThan(0);
    });

    it('Long Strangle: deve validar pontos de equilíbrio OTM', () => {
        const strategy = new LongStrangle();
        const results = strategy.calculateMetrics(mockOptions, 30, 0);
        
        // Formato da descrição: "P:28 | C:30"
        const strangle = results.find(r => r.strike_description.includes('P:28'));
        
        expect(strangle).toBeDefined();
        // BE Low: 28 - (1.50 + 0.60) = 25.90
        expect(strangle?.breakEvenPoints).toContain(25.90);
        expect(strangle?.breakEvenPoints).toContain(32.10);
    });
});