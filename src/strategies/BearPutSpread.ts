// src/strategies/BearPutSpread.ts

import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.option_ticker} K${strikeStr}`;
}

export class BearPutSpread implements IStrategy {
    
    public readonly name: string = 'Bear Put Spread (Trava de Baixa)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'BAIXA';
    
    getDescription(): string {
        return 'Estratégia de Baixa a Débito. Compra Put de strike alto (K1) e Vende Put de strike baixo (K2).';
    }

    getLegCount(): number {
        return 2;
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        return []; 
    }

    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        // Ordenar pelo strike decrescente: K1 (Maior) > K2 (Menor)
        const putLegs = [...legData].filter(leg => leg.tipo === 'PUT').sort((a, b) => (b.strike ?? 0) - (a.strike ?? 0));
        
        if (putLegs.length !== 2) return null;

        const K1_long = putLegs[0];  // Compra a mais cara (ITM)
        const K2_short = putLegs[1]; // Vende a mais barata (OTM)
        
        const K1 = K1_long.strike!;
        const K2 = K2_short.strike!;

        if (K1 <= K2 || K1_long.vencimento !== K2_short.vencimento) return null;

        // --- 1. Fluxo de Caixa (UNITÁRIO) ---
        const cashFlowBrutoUnitario = K1_long.premio - K2_short.premio;
        
        // Em uma trava de débito, o custo deve ser positivo
        if (cashFlowBrutoUnitario <= 0.01) return null; 

        // --- 2. Risco e Retorno (UNITÁRIO) ---
        const width = K1 - K2; 
        const max_loss = cashFlowBrutoUnitario;
        const max_profit = width - cashFlowBrutoUnitario;

        if (max_profit <= 0) return null;

        // --- 3. Pontos Chave ---
        const breakeven = K1 - cashFlowBrutoUnitario; 
        const roi = max_profit / max_loss;

        // --- 4. Gregas ---
        // Delta de Put é negativo. Compra mantém sinal, Venda inverte.
        const greeks: Greeks = {
            delta: (K1_long.gregas_unitarias.delta ?? 0) - (K2_short.gregas_unitarias.delta ?? 0),
            gamma: (K1_long.gregas_unitarias.gamma ?? 0) - (K2_short.gregas_unitarias.gamma ?? 0),
            theta: (K1_long.gregas_unitarias.theta ?? 0) - (K2_short.gregas_unitarias.theta ?? 0),
            vega: (K1_long.gregas_unitarias.vega ?? 0) - (K2_short.gregas_unitarias.vega ?? 0),
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            { derivative: K1_long, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K1_long, 'COMPRA', K1) },
            { derivative: K2_short, direction: 'VENDA', multiplier: 1, display: generateDisplay(K2_short, 'VENDA', K2) },
        ];
        
        return {
            name: this.name,
            asset: K1_long.ativo_subjacente,
            spread_type: 'VERTICAL PUT',
            expiration: K1_long.vencimento,
            dias_uteis: K1_long.dias_uteis ?? 0, 
            strike_description: `K1:${K1.toFixed(2)} (C) / K2:${K2.toFixed(2)} (V)`,
            asset_price: assetPrice, 
            net_premium: -cashFlowBrutoUnitario, 
            cash_flow_bruto: -cashFlowBrutoUnitario,
            cash_flow_liquido: -cashFlowBrutoUnitario,
            initialCashFlow: -cashFlowBrutoUnitario, 
            natureza: 'DÉBITO' as NaturezaOperacao,
            risco_maximo: max_loss,
            lucro_maximo: max_profit,
            max_profit: max_profit,
            max_loss: -max_loss, // Ajustado para negativo para representar saída de caixa/risco
            current_pnl: 0, 
            current_price: assetPrice, 
            breakEvenPoints: [breakeven], 
            breakeven_low: breakeven, 
            breakeven_high: breakeven, 
            width: width,
            minPriceToMaxProfit: 0, 
            maxPriceToMaxProfit: K2, 
            risco_retorno_unitario: roi, 
            rentabilidade_max: roi * 100,
            roi: roi, 
            margem_exigida: 0, // Trava de débito geralmente não exige margem, apenas o custo
            probabilidade_sucesso: 0, 
            score: 0, 
            should_close: false,
            pernas: pernas, 
            greeks: greeks, 
        } as StrategyMetrics;
    }
}