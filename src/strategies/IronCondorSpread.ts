// src/strategies/IronCondorSpread.ts
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

    getDescription(): string { return 'Estratégia neutra a crédito. Combina uma Bull Put e uma Bear Call Spread.'; }
    getLegCount(): number { return 4; }

    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 4) return null;

        const puts = legData.filter(l => l.tipo === 'PUT').sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
        const calls = legData.filter(l => l.tipo === 'CALL').sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
        
        if (puts.length !== 2 || calls.length !== 2) return null;

        // K1 < K2 (Puts) e K3 < K4 (Calls)
        const [K1_l, K2_s] = puts; 
        const [K3_s, K4_l] = calls;
        
        const K1 = K1_l.strike!; const K2 = K2_s.strike!; 
        const K3 = K3_s.strike!; const K4 = K4_l.strike!;

        // Validação da estrutura: Asas devem estar fora do corpo (K2 < K3)
        if (K1 >= K2 || K2 >= K3 || K3 >= K4) return null;
        if (K1_l.vencimento !== K4_l.vencimento) return null; // Simplificação: todos mesmo vencimento

        // --- 1. Fluxo de Caixa (UNITÁRIO) ---
        // Crédito = (Recebido das curtas) - (Pago pelas longas/proteções)
        const credit = (K2_s.premio + K3_s.premio) - (K1_l.premio + K4_l.premio);
        if (credit <= 0) return null;

        // --- 2. Risco e Retorno (UNITÁRIO) ---
        // Risco é a maior largura entre as travas menos o crédito recebido
        const width = Math.max(K2 - K1, K4 - K3);
        const max_loss = width - credit;
        const roi = credit / max_loss;

        // --- 3. Gregas (Soma das 4 pernas) ---
        const greeks: Greeks = {
            delta: (K1_l.gregas_unitarias.delta ?? 0) - (K2_s.gregas_unitarias.delta ?? 0) - (K3_s.gregas_unitarias.delta ?? 0) + (K4_l.gregas_unitarias.delta ?? 0),
            gamma: (K1_l.gregas_unitarias.gamma ?? 0) - (K2_s.gregas_unitarias.gamma ?? 0) - (K3_s.gregas_unitarias.gamma ?? 0) + (K4_l.gregas_unitarias.gamma ?? 0),
            theta: (K1_l.gregas_unitarias.theta ?? 0) - (K2_s.gregas_unitarias.theta ?? 0) - (K3_s.gregas_unitarias.theta ?? 0) + (K4_l.gregas_unitarias.theta ?? 0),
            vega: (K1_l.gregas_unitarias.vega ?? 0) - (K2_s.gregas_unitarias.vega ?? 0) - (K3_s.gregas_unitarias.vega ?? 0) + (K4_l.gregas_unitarias.vega ?? 0),
        };

        return {
            name: this.name,
            asset: K1_l.ativo_subjacente,
            spread_type: 'IRON CONDOR',
            expiration: K1_l.vencimento,
            dias_uteis: K1_l.dias_uteis ?? 0,
            strike_description: `P:${K1}/${K2} | C:${K3}/${K4}`,
            asset_price: assetPrice,
            
            net_premium: credit,
            cash_flow_bruto: credit,
            cash_flow_liquido: credit,
            initialCashFlow: credit,
            natureza: 'CRÉDITO' as NaturezaOperacao,

            risco_maximo: max_loss,
            lucro_maximo: credit,
            max_profit: credit,
            max_loss: -max_loss,
            
            current_pnl: 0,
            current_price: assetPrice,
            breakEvenPoints: [K2 - credit, K3 + credit],
            breakeven_low: K2 - credit,
            breakeven_high: K3 + credit,
            
            width: width,
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
            greeks: greeks
        } as StrategyMetrics;
    }

    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> { return []; }
}