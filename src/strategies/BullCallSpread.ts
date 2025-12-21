// src/strategies/BullCallSpread.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, ProfitLossValue, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

// Função auxiliar para gerar a string de display
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.ativo_subjacente} K${strikeStr}`;
}

export class BullCallSpread implements IStrategy {
    
    public readonly name: string = 'Bull Call Spread (Débito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'ALTA'; 
    
    getDescription(): string {
        return 'Estratégia de Alta a Débito. Compra Call de strike baixo (K1) e Vende Call de strike alto (K2).';
    }

    getLegCount(): number {
        return 2;
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        return []; // Implementado pelo PayoffCalculator central
    }

    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        // K1 (menor) Compra, K2 (maior) Venda
        const callLegs = legData.filter(leg => leg.tipo === 'CALL').sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
        
        if (callLegs.length !== 2) return null;

        const K1_long = callLegs[0];  // Strike Menor (Compra)
        const K2_short = callLegs[1]; // Strike Maior (Venda)
        
        const K1 = K1_long.strike!;
        const K2 = K2_short.strike!;

        if (K1 >= K2 || K1_long.vencimento !== K2_short.vencimento) return null;

        // --- 1. Fluxo de Caixa (UNITÁRIO) ---
        // Débito Bruto Unitário = Preço Pago - Preço Recebido
        const cashFlowBrutoUnitario = K1_long.premio - K2_short.premio;
        
        if (cashFlowBrutoUnitario <= 0) return null; 

        // --- 2. Risco e Retorno (UNITÁRIO) ---
        const width = K2 - K1; 
        
        // Risco Máximo é o débito pago
        const max_loss = cashFlowBrutoUnitario;
        const max_profit = width - cashFlowBrutoUnitario;

        if (max_profit <= 0) return null;

        // --- 3. Pontos Chave ---
        const breakeven = K1 + cashFlowBrutoUnitario; 
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
            spread_type: 'VERTICAL CALL',
            expiration: K1_long.vencimento, // Corrigido para remover 'vencimento'
            dias_uteis: K1_long.dias_uteis ?? 0, 
            strike_description: `K1:${K1.toFixed(2)} / K2:${K2.toFixed(2)}`,
            asset_price: assetPrice, 
            
            net_premium: -cashFlowBrutoUnitario, // Negativo para débito
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
            minPriceToMaxProfit: K2, 
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