// src/strategies/ButterflySpread.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, ProfitLossValue, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null, qty: number = 1): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${qty}x ${action}-${typeInitial} ${leg.ativo_subjacente} K${strikeStr}`;
}

export class ButterflySpread implements IStrategy {
    public readonly name: string = 'Long Butterfly Call (Débito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA'; 

    getDescription(): string { return 'Estratégia neutra a débito. Lucro máximo no miolo (K2).'; }
    getLegCount(): number { return 3; }

    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 3) return null;
        
        const callLegs = legData.filter(leg => leg.tipo === 'CALL').sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
        if (callLegs.length !== 3) return null;

        const [K1_l, K2_s, K3_l] = callLegs;
        const K1 = K1_l.strike!; 
        const K2 = K2_s.strike!; 
        const K3 = K3_l.strike!;

        // Validação de simetria (essencial para borboletas)
        if (Math.abs((K2 - K1) - (K3 - K2)) > 0.1) return null;
        if (K1_l.vencimento !== K2_s.vencimento || K2_s.vencimento !== K3_l.vencimento) return null;

        // --- 1. Fluxo de Caixa (UNITÁRIO) ---
        // Custo = (Asas Compradas) - (2x Corpo Vendido)
        const cashFlowBrutoUnitario = K1_l.premio + K3_l.premio - (K2_s.premio * 2);
        
        // Se o custo for negativo ou zero, a montagem está distorcida (arbitragem)
        if (cashFlowBrutoUnitario <= 0) return null; 

        // --- 2. Risco e Retorno (UNITÁRIO) ---
        const width = K2 - K1;
        const max_profit = width - cashFlowBrutoUnitario;
        const max_loss = cashFlowBrutoUnitario; // Risco máximo em borboletas de débito é o prêmio pago
        const roi = max_profit / max_loss;

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
            strike_description: `${K1.toFixed(2)} | ${K2.toFixed(2)} | ${K3.toFixed(2)}`,
            asset_price: assetPrice,
            
            net_premium: -cashFlowBrutoUnitario,
            cash_flow_bruto: -cashFlowBrutoUnitario,
            cash_flow_liquido: -cashFlowBrutoUnitario,
            initialCashFlow: -cashFlowBrutoUnitario,
            natureza: 'DÉBITO' as NaturezaOperacao,

            risco_maximo: max_loss,
            lucro_maximo: max_profit,
            max_profit: max_profit,
            max_loss: max_loss,
            
            current_pnl: 0,
            current_price: assetPrice,
            breakEvenPoints: [K1 + cashFlowBrutoUnitario, K3 - cashFlowBrutoUnitario],
            breakeven_low: K1 + cashFlowBrutoUnitario,
            breakeven_high: K3 - cashFlowBrutoUnitario,
            
            width: width,
            minPriceToMaxProfit: K2,
            maxPriceToMaxProfit: K2,
            
            risco_retorno_unitario: roi,
            rentabilidade_max: roi,
            roi: roi,
            margem_exigida: max_loss,
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