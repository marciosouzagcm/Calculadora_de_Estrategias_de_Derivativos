// src/strategies/BearPutSpread.ts

import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, ProfitLossValue, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

// Função auxiliar para gerar a string de display
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.ativo_subjacente} K${strikeStr}`;
}

export class BearPutSpread implements IStrategy {
    
    public readonly name: string = 'Bear Put Spread (Débito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'BAIXA';
    
    getDescription(): string {
        return 'Estratégia de Baixa a Débito. Compra Put de strike alto (K1) e Vende Put de strike baixo (K2).';
    }

    getLegCount(): number {
        return 2;
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        return []; // Implementado pelo PayoffCalculator central
    }

    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        // Put K1 > Put K2, ordenar pelo strike decrescente
        const putLegs = legData.filter(leg => leg.tipo === 'PUT').sort((a, b) => (b.strike ?? 0) - (a.strike ?? 0));
        
        if (putLegs.length !== 2) return null;

        const K1_long = putLegs[0];  // Strike Maior (Compra)
        const K2_short = putLegs[1]; // Strike Menor (Venda)
        
        const K1 = K1_long.strike!;
        const K2 = K2_short.strike!;

        if (K1 <= K2 || K1_long.vencimento !== K2_short.vencimento) return null;

        // --- 1. Fluxo de Caixa (UNITÁRIO) ---
        // Débito Bruto Unitário = Preço Pago - Preço Recebido
        const cashFlowBrutoUnitario = K1_long.premio - K2_short.premio;
        
        if (cashFlowBrutoUnitario <= 0) return null; 

        // --- 2. Risco e Retorno (UNITÁRIO) ---
        const width = K1 - K2; 
        
        // Em estratégias de Débito, o risco máximo é o próprio débito pago
        const max_loss = cashFlowBrutoUnitario;
        const max_profit = width - cashFlowBrutoUnitario;

        if (max_profit <= 0) return null;

        // --- 3. Pontos Chave ---
        const breakeven = K1 - cashFlowBrutoUnitario; 
        const roi = max_profit / max_loss;

        // --- 4. Gregas ---
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
            expiration: K1_long.vencimento, // Corrigido de 'vencimento' para 'expiration'
            dias_uteis: K1_long.dias_uteis ?? 0, 
            strike_description: `K1:${K1.toFixed(2)} / K2:${K2.toFixed(2)}`,
            asset_price: assetPrice, 
            
            net_premium: -cashFlowBrutoUnitario, // Negativo pois é débito
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
            
            breakEvenPoints: [breakeven], 
            breakeven_low: breakeven, 
            breakeven_high: breakeven, 
            
            width: width,
            minPriceToMaxProfit: 0, 
            maxPriceToMaxProfit: K2, 
            
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