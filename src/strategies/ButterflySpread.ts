// src/strategies/ButterflySpread.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null, qty: number = 1): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    // Usando option_ticker para facilitar a identificação
    return `${qty}x ${action}-${typeInitial} ${leg.option_ticker} K${strikeStr}`;
}

export class ButterflySpread implements IStrategy {
    public readonly name: string = 'Long Butterfly Call';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA'; 

    getDescription(): string { return 'Estratégia neutra a débito. Lucro máximo no miolo (K2).'; }
    getLegCount(): number { return 3; }

    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 3) return null;
        
        // Garante a ordem dos strikes: Asa Inferior (K1) < Miolo (K2) < Asa Superior (K3)
        const callLegs = [...legData].filter(leg => leg.tipo === 'CALL').sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
        if (callLegs.length !== 3) return null;

        const [K1_l, K2_s, K3_l] = callLegs;
        const K1 = K1_l.strike!; 
        const K2 = K2_s.strike!; 
        const K3 = K3_l.strike!;

        // Validação de simetria e vencimento
        const leftWing = K2 - K1;
        const rightWing = K3 - K2;
        if (Math.abs(leftWing - rightWing) > 0.11) return null; 
        if (K1_l.vencimento !== K2_s.vencimento || K2_s.vencimento !== K3_l.vencimento) return null;

        // --- 1. Fluxo de Caixa (UNITÁRIO) ---
        // Custo = Preço pago nas pontas - Preço recebido no miolo (2x)
        const cashFlowBrutoUnitario = K1_l.premio + K3_l.premio - (K2_s.premio * 2);
        
        // Se o custo for irracional (negativo), a borboleta não existe no mercado real
        if (cashFlowBrutoUnitario <= 0.01) return null; 

        // --- 2. Risco e Retorno (UNITÁRIO) ---
        const width = K2 - K1;
        const max_profit = width - cashFlowBrutoUnitario;
        const max_loss = cashFlowBrutoUnitario; 
        const roi = max_profit / max_loss;

        // Se o lucro máximo for menor ou igual a zero após montagem, descarta
        if (max_profit <= 0) return null;

        // --- 3. Gregas ---
        const greeks: Greeks = {
            delta: (K1_l.gregas_unitarias.delta ?? 0) - (2 * (K2_s.gregas_unitarias.delta ?? 0)) + (K3_l.gregas_unitarias.delta ?? 0),
            gamma: (K1_l.gregas_unitarias.gamma ?? 0) - (2 * (K2_s.gregas_unitarias.gamma ?? 0)) + (K3_l.gregas_unitarias.gamma ?? 0),
            theta: (K1_l.gregas_unitarias.theta ?? 0) - (2 * (K2_s.gregas_unitarias.theta ?? 0)) + (K3_l.gregas_unitarias.theta ?? 0),
            vega: (K1_l.gregas_unitarias.vega ?? 0) - (2 * (K2_s.gregas_unitarias.vega ?? 0)) + (K3_l.gregas_unitarias.vega ?? 0),
        };

        return {
            name: this.name,
            asset: K1_l.ativo_subjacente,
            spread_type: 'BUTTERFLY CALL',
            expiration: K1_l.vencimento,
            dias_uteis: K1_l.dias_uteis ?? 0,
            strike_description: `${K1.toFixed(1)}|${K2.toFixed(1)}|${K3.toFixed(1)}`,
            asset_price: assetPrice,
            
            net_premium: -cashFlowBrutoUnitario,
            cash_flow_bruto: -cashFlowBrutoUnitario,
            cash_flow_liquido: -cashFlowBrutoUnitario,
            initialCashFlow: -cashFlowBrutoUnitario,
            natureza: 'DÉBITO' as NaturezaOperacao,

            risco_maximo: max_loss,
            lucro_maximo: max_profit,
            max_profit: max_profit,
            max_loss: -max_loss, // Negativo para o payoff
            
            current_pnl: 0,
            current_price: assetPrice,
            breakEvenPoints: [K1 + cashFlowBrutoUnitario, K3 - cashFlowBrutoUnitario],
            breakeven_low: K1 + cashFlowBrutoUnitario,
            breakeven_high: K3 - cashFlowBrutoUnitario,
            
            width: width,
            minPriceToMaxProfit: K2,
            maxPriceToMaxProfit: K2,
            
            risco_retorno_unitario: roi,
            rentabilidade_max: roi * 100,
            roi: roi,
            margem_exigida: 0, 
            probabilidade_sucesso: 0,
            score: 0,
            should_close: false,
            
            pernas: [
                { derivative: K1_l, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K1_l, 'COMPRA', K1, 1) },
                { derivative: K2_s, direction: 'VENDA', multiplier: 2, display: generateDisplay(K2_s, 'VENDA', K2, 2) },
                { derivative: K3_l, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K3_l, 'COMPRA', K3, 1) }
            ],
            greeks: greeks
        } as StrategyMetrics;
    }

    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> { return []; }
}