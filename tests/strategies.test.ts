// tests/strategies.test.ts
/**
 * @fileoverview Testes unitários de alto nível para as estratégias e a classe PayoffCalculator.
 * Objetivo: Garantir que a lógica de cálculo de P/L e Breakeven da refatoração Python -> TS 
 * continua correta para cenários conhecidos.
 */
import { OptionLeg, StrategyMetrics } from '../src/interfaces/Derivative';
import { PayoffCalculator } from '../src/services/PayoffCalculator';

// --- MOCK DATA (Simulação de Opções Processadas) ---
// Dados baseados em um ativo fictício 'MOCK3'
const MOCK_OPTIONS: OptionLeg[] = [
    // Opções Call para Vertical Spread
    { idAcao: 'MOCK3', option_ticker: 'MOCKC100', vencimento: '2025-12-31', tipo: 'CALL', strike: 100, premio: 5.00, dias_uteis: 30, delta: 0.60, gamma: 0.05, theta: -0.05, vega: 0.25, volatilidade: 0.30 },
    { idAcao: 'MOCK3', option_ticker: 'MOCKC110', vencimento: '2025-12-31', tipo: 'CALL', strike: 110, premio: 1.50, dias_uteis: 30, delta: 0.35, gamma: 0.03, theta: -0.02, vega: 0.15, volatilidade: 0.30 },
    { idAcao: 'MOCK3', option_ticker: 'MOCKC120', vencimento: '2025-12-31', tipo: 'CALL', strike: 120, premio: 0.50, dias_uteis: 30, delta: 0.15, gamma: 0.01, theta: -0.01, vega: 0.05, volatilidade: 0.30 },
    // Opções Put para Straddle
    { idAcao: 'MOCK3', option_ticker: 'MOCKP110', vencimento: '2025-12-31', tipo: 'PUT', strike: 110, premio: 2.50, dias_uteis: 30, delta: -0.40, gamma: 0.04, theta: -0.03, vega: 0.18, volatilidade: 0.30 },
];

const FEES = 44.00;
const LOT_SIZE = 100;
const CURRENT_PRICE = 105.00;

describe('PayoffCalculator e Estratégias', () => {
    let calculator: PayoffCalculator;

    beforeAll(() => {
        calculator = new PayoffCalculator(MOCK_OPTIONS, FEES, LOT_SIZE);
    });

    // --- TESTE 1: BULL CALL SPREAD (Trava de Alta - Débito) ---
    // Montagem: Compra K100 (5.00) e Vende K110 (1.50)
    // Net Premium (Débito) = 5.00 - 1.50 = 3.50
    // Fluxo Líquido: -(3.50 * 100) - 44.00 = -394.00
    // Lucro Máximo: (110 - 100 - 3.50) * 100 - 44.00 = 6.50 * 100 - 44.00 = 606.00
    // Risco Máximo: 394.00
    // Breakeven: K_lower (100) + Net Premium (3.50) = 103.50
    test('Calcula Bull Call Spread (Trava de Alta) corretamente', () => {
        const results = calculator.findAndCalculateSpreads(3); // Seleção 3: Bull Call
        const bullCall = results.find(r => r.spread_type === 'Bull Call');

        expect(bullCall).not.toBeNull();
        expect(bullCall!.net_premium).toBeCloseTo(3.50);
        expect(bullCall!.natureza).toBe('DÉBITO');
        expect(bullCall!.cash_flow_liquido).toBeCloseTo(-394.00); 
        expect(bullCall!.lucro_maximo).toBeCloseTo(606.00); 
        expect(bullCall!.risco_maximo).toBeCloseTo(394.00);
        expect(bullCall!.breakeven_low).toBeCloseTo(103.50);
        // Net Delta: Long K100 (0.60) - Short K110 (0.35) = 0.25
        expect(bullCall!.net_gregas.delta).toBeCloseTo(0.25);
    });

    // --- TESTE 2: BEAR CALL SPREAD (Trava de Baixa - Crédito) ---
    // Montagem: Vende K100 (5.00) e Compra K110 (1.50) -> (Essa é a montagem real, mas a classe reverte)
    // A classe VerticalSpread assume o DÉBITO/CRÉDITO: 
    // BEAR CALL: Venda (5.00) - Compra (1.50) = 3.50 (CRÉDITO)
    // Fluxo Líquido: (3.50 * 100) - 44.00 = 306.00
    // Lucro Máximo: 306.00
    // Risco Máximo: (110 - 100) * 100 - 350.00 + 44.00 = 1000 - 350 + 44 = 694.00
    // Breakeven: K_lower (100) + Net Premium (3.50) = 103.50
    test('Calcula Bear Call Spread (Trava de Baixa) corretamente', () => {
        const results = calculator.findAndCalculateSpreads(1); // Seleção 1: Bear Call
        const bearCall = results.find(r => r.spread_type === 'Bear Call');
        
        expect(bearCall).not.toBeNull();
        expect(bearCall!.net_premium).toBeCloseTo(3.50);
        expect(bearCall!.natureza).toBe('CRÉDITO');
        expect(bearCall!.cash_flow_liquido).toBeCloseTo(306.00); 
        expect(bearCall!.lucro_maximo).toBeCloseTo(306.00); 
        expect(bearCall!.risco_maximo).toBeCloseTo(694.00);
        expect(bearCall!.breakeven_low).toBeCloseTo(103.50);
    });

    // --- TESTE 3: LONG STRADDLE (Débito - Volatilidade) ---
    // Montagem: Compra K110 Call (1.50) e K110 Put (2.50)
    // Net Premium (Débito) = 1.50 + 2.50 = 4.00
    // Fluxo Líquido: -(4.00 * 100) - 44.00 = -444.00
    // Risco Máximo: 444.00
    // Lucro Máximo: Ilimitado
    // Breakeven: 110 +/- 4.00 -> 106.00 e 114.00
    test('Calcula Long Straddle (Débito) corretamente', () => {
        const results = calculator.findAndCalculateSpreads(7); // Seleção 7: Long Straddle
        const straddle = results.find(r => r.spread_type === 'Long Straddle');

        expect(straddle).not.toBeNull();
        expect(straddle!.net_premium).toBeCloseTo(4.00);
        expect(straddle!.natureza).toBe('DÉBITO');
        expect(straddle!.cash_flow_liquido).toBeCloseTo(-444.00);
        expect(straddle!.risco_maximo).toBe(444.00);
        expect(straddle!.lucro_maximo).toBe('Ilimitado');
        expect(straddle!.breakeven_low).toBeCloseTo(106.00);
        expect(straddle!.breakeven_high).toBeCloseTo(114.00);
        // Net Delta: (Call 0.35 + Put -0.40) * 1 = -0.05
        expect(straddle!.net_gregas.delta).toBeCloseTo(-0.05);
    });
});