import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, ProfitLossValue, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.ativo_subjacente} K${strikeStr}`;
}

export class IronCondorSpread implements IStrategy {
    public readonly name: string = 'Iron Condor (Crédito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA';

    getDescription(): string { return 'Iron Condor a Crédito.'; }
    getLegCount(): number { return 4; }

    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 4) return null;
        const puts = legData.filter(l => l.tipo === 'PUT').sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
        const calls = legData.filter(l => l.tipo === 'CALL').sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
        if (puts.length !== 2 || calls.length !== 2) return null;

        const [K1_l, K2_s] = puts; const [K3_s, K4_l] = calls;
        const K1 = K1_l.strike!; const K2 = K2_s.strike!; const K3 = K3_s.strike!; const K4 = K4_l.strike!;
        if (K1 >= K2 || K2 >= K3 || K3 >= K4) return null;

        const credit = (K2_s.premio + K3_s.premio) - (K1_l.premio + K4_l.premio);
        if (credit <= 0) return null;

        const max_loss = Math.max(K2 - K1, K4 - K3) - credit;
        const roi = credit / max_loss;

        return {
            name: this.name,
            asset: K1_l.ativo_subjacente,
            spread_type: 'IRON CONDOR',
            expiration: K1_l.vencimento, // Removido campo 'vencimento' que causava erro
            dias_uteis: K1_l.dias_uteis ?? 0,
            strike_description: `${K1}/${K2}/${K3}/${K4}`,
            asset_price: assetPrice,
            net_premium: credit,
            cash_flow_bruto: credit,
            cash_flow_liquido: credit,
            initialCashFlow: credit,
            natureza: 'CRÉDITO' as NaturezaOperacao,
            risco_maximo: max_loss,
            lucro_maximo: credit,
            max_profit: credit,
            max_loss: max_loss,
            current_pnl: 0,
            current_price: assetPrice,
            breakEvenPoints: [K2 - credit, K3 + credit],
            breakeven_low: K2 - credit,
            breakeven_high: K3 + credit,
            width: Math.max(K2 - K1, K4 - K3),
            minPriceToMaxProfit: K2,
            maxPriceToMaxProfit: K3,
            risco_retorno_unitario: roi,
            rentabilidade_max: roi,
            roi: roi,
            margem_exigida: max_loss,
            probabilidade_sucesso: 0,
            score: 0,
            should_close: false,
            pernas: [
                { derivative: K1_l, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K1_l, 'COMPRA', K1) },
                { derivative: K2_s, direction: 'VENDA', multiplier: 1, display: generateDisplay(K2_s, 'VENDA', K2) },
                { derivative: K3_s, direction: 'VENDA', multiplier: 1, display: generateDisplay(K3_s, 'VENDA', K3) },
                { derivative: K4_l, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K4_l, 'COMPRA', K4) }
            ],
            greeks: { delta: 0, gamma: 0, theta: 0, vega: 0 }
        } as StrategyMetrics;
    }

    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> { return []; }
}