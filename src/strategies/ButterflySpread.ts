import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, ProfitLossValue, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.ativo_subjacente} K${strikeStr}`;
}

export class ButterflySpread implements IStrategy {
    public readonly name: string = 'Long Butterfly Call (Débito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA'; 

    getDescription(): string { return 'Borboleta de Call a Débito.'; }
    getLegCount(): number { return 3; }

    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 3) return null;
        const callLegs = legData.filter(leg => leg.tipo === 'CALL').sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
        if (callLegs.length !== 3) return null;

        const [K1_l, K2_s, K3_l] = callLegs;
        const K1 = K1_l.strike!; const K2 = K2_s.strike!; const K3 = K3_l.strike!;
        if (Math.abs((K2 - K1) - (K3 - K2)) > 0.1) return null;

        const cashFlowBrutoUnitario = K1_l.premio + K3_l.premio - (K2_s.premio * 2);
        if (cashFlowBrutoUnitario <= 0) return null; 

        const max_profit = (K2 - K1) - cashFlowBrutoUnitario;
        const roi = max_profit / cashFlowBrutoUnitario;

        return {
            name: this.name,
            asset: K1_l.ativo_subjacente,
            spread_type: 'BUTTERFLY CALL',
            expiration: K1_l.vencimento, // Usando apenas o campo correto
            dias_uteis: K1_l.dias_uteis ?? 0,
            strike_description: `${K1}/${K2}/${K3}`,
            asset_price: assetPrice,
            net_premium: -cashFlowBrutoUnitario,
            cash_flow_bruto: -cashFlowBrutoUnitario,
            cash_flow_liquido: -cashFlowBrutoUnitario,
            initialCashFlow: -cashFlowBrutoUnitario,
            natureza: 'DÉBITO' as NaturezaOperacao,
            risco_maximo: cashFlowBrutoUnitario,
            lucro_maximo: max_profit,
            max_profit: max_profit,
            max_loss: cashFlowBrutoUnitario,
            current_pnl: 0,
            current_price: assetPrice,
            breakEvenPoints: [K1 + cashFlowBrutoUnitario, K3 - cashFlowBrutoUnitario],
            breakeven_low: K1 + cashFlowBrutoUnitario,
            breakeven_high: K3 - cashFlowBrutoUnitario,
            width: K2 - K1,
            minPriceToMaxProfit: K2,
            maxPriceToMaxProfit: K2,
            risco_retorno_unitario: roi,
            rentabilidade_max: roi,
            roi: roi,
            margem_exigida: cashFlowBrutoUnitario,
            probabilidade_sucesso: 0,
            score: 0,
            should_close: false,
            pernas: [
                { derivative: K1_l, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K1_l, 'COMPRA', K1) },
                { derivative: K2_s, direction: 'VENDA', multiplier: 2, display: generateDisplay(K2_s, 'VENDA', K2) },
                { derivative: K3_l, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K3_l, 'COMPRA', K3) }
            ],
            greeks: { delta: 0, gamma: 0, theta: 0, vega: 0 }
        } as StrategyMetrics;
    }

    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> { return []; }
}