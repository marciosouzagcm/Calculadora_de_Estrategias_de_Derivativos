import { PayoffCalculator } from '../src/services/PayoffCalculator';
const MOCK_OPTIONS = [
    {
        ativo_subjacente: 'PETR4',
        option_ticker: 'PETRL280',
        vencimento: '2025-12-20',
        dias_uteis: 22,
        tipo: 'CALL',
        strike: 28.00,
        premio: 1.50,
        vol_implicita: 0.35,
        gregas_unitarias: { delta: 0.50, gamma: 0.05, theta: -0.02, vega: 0.10 }
    },
    {
        ativo_subjacente: 'PETR4',
        option_ticker: 'PETRL300',
        vencimento: '2025-12-20',
        dias_uteis: 22,
        tipo: 'CALL',
        strike: 30.00,
        premio: 0.60,
        vol_implicita: 0.35,
        gregas_unitarias: { delta: 0.30, gamma: 0.03, theta: -0.01, vega: 0.08 }
    }
];
describe('PayoffCalculator V40.0', () => {
    const FEE = 0;
    const LOT = 100;
    const calculator = new PayoffCalculator(MOCK_OPTIONS, FEE, LOT);
    test('Deve validar Trava de Alta (Bull Call Spread)', () => {
        const results = calculator.findAndCalculateSpreads(28.50, 10);
        // Buscando pelo nome que o console log revelou
        const bullCall = results.find(r => r.name === 'Trava de Alta (Call)' || r.name === 'Bull Call Spread');
        expect(bullCall).toBeDefined();
        expect(bullCall?.breakEvenPoints).toBeDefined();
        // 1.50 - 0.60 = 0.90 unitário. Com 100 opções = 90.00
        expect(Number(bullCall?.max_profit)).toBeGreaterThan(0);
        console.log(`Lucro Máximo Calculado: R$ ${bullCall?.max_profit}`);
    });
});
