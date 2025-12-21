// src/strategies/BearCallSpread.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, ProfitLossValue, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.ativo_subjacente} K${strikeStr}`;
}

export class BearCallSpread implements IStrategy {
    
    public readonly name: string = 'Bear Call Spread (Crédito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'BAIXA'; 
    
    getDescription(): string {
        return 'Estratégia de Baixa a Crédito. Vende Call de strike baixo (K1) e Compra Call de strike alto (K2).';
    }

    getLegCount(): number {
        return 2;
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        return []; // Será implementado pelo PayoffCalculator
    }

    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        const callLegs = legData.filter(leg => leg.tipo === 'CALL').sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
        
        if (callLegs.length !== 2) return null;

        const K1_short = callLegs[0]; // Strike Menor (Venda)
        const K2_long = callLegs[1];  // Strike Maior (Compra)
        
        const K1 = K1_short.strike!;
        const K2 = K2_long.strike!;

        if (K1 >= K2 || K1_short.vencimento !== K2_long.vencimento) return null;

        // --- 1. Fluxo de Caixa Unitário ---
        const netPremiumUnitario = K1_short.premio - K2_long.premio;
        if (netPremiumUnitario <= 0) return null; 

        // --- 2. Risco e Retorno Unitário ---
        const width = K2 - K1;
        const max_profit = netPremiumUnitario;
        const max_loss = width - netPremiumUnitario;

        if (max_loss <= 0) return null;

        // --- 3. Pontos Chave ---
        const breakeven = K1 + netPremiumUnitario;
        const roi = max_profit / max_loss;

        // --- 4. Gregas ---
        const greeks: Greeks = {
            delta: (K1_short.gregas_unitarias.delta ?? 0) * -1 + (K2_long.gregas_unitarias.delta ?? 0),
            gamma: (K1_short.gregas_unitarias.gamma ?? 0) * -1 + (K2_long.gregas_unitarias.gamma ?? 0),
            theta: (K1_short.gregas_unitarias.theta ?? 0) * -1 + (K2_long.gregas_unitarias.theta ?? 0),
            vega: (K1_short.gregas_unitarias.vega ?? 0) * -1 + (K2_long.gregas_unitarias.vega ?? 0),
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            { derivative: K1_short, direction: 'VENDA', multiplier: 1, display: generateDisplay(K1_short, 'VENDA', K1) },
            { derivative: K2_long, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K2_long, 'COMPRA', K2) },
        ];
        
        return {
            name: this.name,
            asset: K1_short.ativo_subjacente,
            spread_type: 'VERTICAL CALL',
            expiration: K1_short.vencimento, 
            dias_uteis: K1_short.dias_uteis ?? 0, 
            strike_description: `K1:${K1.toFixed(2)} / K2:${K2.toFixed(2)}`,
            asset_price: assetPrice, 
            net_premium: netPremiumUnitario, 
            cash_flow_bruto: netPremiumUnitario,
            cash_flow_liquido: netPremiumUnitario,
            initialCashFlow: netPremiumUnitario, 
            natureza: 'CRÉDITO' as NaturezaOperacao,
            risco_maximo: max_loss,
            lucro_maximo: max_profit,
            max_profit: max_profit,
            max_loss: -max_loss, // Negativo para o payoff
            current_pnl: 0, 
            current_price: assetPrice, 
            breakEvenPoints: [breakeven], 
            breakeven_low: breakeven, 
            breakeven_high: breakeven, 
            width: width,
            minPriceToMaxProfit: 0,
            maxPriceToMaxProfit: K1,
            risco_retorno_unitario: roi, 
            rentabilidade_max: roi,
            roi: roi, 
            margem_exigida: max_loss,
            probabilidade_sucesso: 0, 
            score: 0, 
            should_close: false,
            pernas: pernas, 
            greeks: greeks,
        } as StrategyMetrics;
    }
}