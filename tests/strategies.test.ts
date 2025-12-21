// tests/strategies.test.ts
import { OptionLeg, StrategyMetrics } from '../src/interfaces/Types';
import { PayoffCalculator } from '../src/services/PayoffCalculator';

/**
 * MOCK DATA - Simulação de Opções
 * Ajustado para bater com a interface OptionLeg refinada.
 */
const MOCK_OPTIONS: OptionLeg[] = [
    { 
        ativo_subjacente: 'MOCK3', 
        display: 'MOCKC100', 
        vencimento: '2025-12-31', 
        tipo: 'CALL', 
        strike: 100, 
        premio: 5.00, 
        derivative: { tipo: 'CALL', strike: 100, premio: 5.00 }, // Compatibilidade com a perna
        gregas: { delta: 0.60, gamma: 0.05, theta: -0.05, vega: 0.25 }
    },
    { 
        ativo_subjacente: 'MOCK3', 
        display: 'MOCKC110', 
        vencimento: '2025-12-31', 
        tipo: 'CALL', 
        strike: 110, 
        premio: 1.50, 
        derivative: { tipo: 'CALL', strike: 110, premio: 1.50 },
        gregas: { delta: 0.35, gamma: 0.03, theta: -0.02, vega: 0.15 }
    },
    { 
        ativo_subjacente: 'MOCK3', 
        display: 'MOCKP110', 
        vencimento: '2025-12-31', 
        tipo: 'PUT', 
        strike: 110, 
        premio: 2.50, 
        derivative: { tipo: 'PUT', strike: 110, premio: 2.50 },
        gregas: { delta: -0.40, gamma: 0.04, theta: -0.03, vega: 0.18 }
    }
];

const FEE_PER_LEG = 22.00; // Por perna (Total para 2 pernas = 44.00)
const LOT_SIZE = 100;
const CURRENT_PRICE = 105.00;

describe('PayoffCalculator e Validação de Estratégias', () => {
    let calculator: PayoffCalculator;

    beforeAll(() => {
        // Inicializa o calculador com os mocks
        calculator = new PayoffCalculator(MOCK_OPTIONS, FEE_PER_LEG, LOT_SIZE);
    });

    test('Deve validar Bull Call Spread (Trava de Alta) - Cenário de Débito', () => {
        const results = calculator.findAndCalculateSpreads(CURRENT_PRICE);
        // Procuramos pelo nome técnico definido na classe BullCallSpread
        const bullCall = results.find(r => r.name === 'Bull Call Spread');

        expect(bullCall).toBeDefined();
        
        // No débito: 5.00 - 1.50 = 3.50 unitário
        expect(Number(bullCall!.initialCashFlow)).toBeCloseTo(3.50);
        expect(bullCall!.natureza).toBe('DÉBITO');

        // Nossa convicção: Risco máximo em débito é NEGATIVO
        // 3.50 * 100 = 350.00 (taxas de 44.00 serão somadas no index.ts)
        expect(Number(bullCall!.risco_maximo)).toBeLessThan(0);
        expect(Number(bullCall!.risco_maximo)).toBeCloseTo(-3.50); 

        // Breakeven: K_low + Custo = 100 + 3.50 = 103.50
        expect(bullCall!.breakeven).toContainEqual(expect.closeTo(103.50));
    });

    test('Deve validar Bear Call Spread (Trava de Baixa) - Cenário de Crédito', () => {
        const results = calculator.findAndCalculateSpreads(CURRENT_PRICE);
        const bearCall = results.find(r => r.name === 'Bear Call Spread');

        expect(bearCall).toBeDefined();
        expect(bearCall!.natureza).toBe('CRÉDITO');

        // Lucro Máximo em Crédito é o próprio crédito recebido (3.50 unitário)
        expect(Number(bearCall!.max_profit)).toBeCloseTo(3.50);
        
        // Risco em Crédito: Largura (10) - Recebido (3.50) = 6.50
        // Como é risco, deve ser negativo conforme nossa convenção
        expect(Number(bearCall!.risco_maximo)).toBeCloseTo(-6.50);
    });

    test('Deve validar Long Straddle - Cenário de Volatilidade', () => {
        const results = calculator.findAndCalculateSpreads(CURRENT_PRICE);
        const straddle = results.find(r => r.name === 'Long Straddle');

        expect(straddle).toBeDefined();
        expect(straddle!.natureza).toBe('DÉBITO');
        
        // 1.50 (Call) + 2.50 (Put) = 4.00
        expect(Number(straddle!.initialCashFlow)).toBeCloseTo(4.00);
        
        // Lucro Ilimitado
        expect(straddle!.max_profit).toBe(Infinity);

        // Breakevens: Strike (110) +/- 4.00 = 106 e 114
        expect(straddle!.breakeven).toContainEqual(expect.closeTo(106.00));
        expect(straddle!.breakeven).toContainEqual(expect.closeTo(114.00));
    });
});