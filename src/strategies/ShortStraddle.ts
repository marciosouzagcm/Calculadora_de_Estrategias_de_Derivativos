// src/strategies/ShortStraddle.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, OptionLeg, StrategyMetrics, StrategyLeg, NaturezaOperacao, ProfitLossValue } from '../interfaces/Types';

// Função auxiliar para gerar a string de display
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.ativo_subjacente} K${strikeStr}`;
}

export class ShortStraddle implements IStrategy {
    
    public readonly name: string = 'Short Straddle (Crédito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA'; 
    
    getDescription(): string {
        return 'Venda de Call e Put no mesmo strike. Lucro máximo se o ativo ficar parado; risco ilimitado.';
    }

    getLegCount(): number {
        return 2;
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        return []; // Calculado centralmente
    }

    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        const callLeg = legData.find(leg => leg.tipo === 'CALL');
        const putLeg = legData.find(leg => leg.tipo === 'PUT');
        
        if (!callLeg || !putLeg || callLeg.strike !== putLeg.strike || callLeg.vencimento !== putLeg.vencimento) return null;

        const K = callLeg.strike!;

        // --- 1. Fluxo de Caixa (UNITÁRIO) ---
        const netPremiumUnitario = callLeg.premio + putLeg.premio;
        if (netPremiumUnitario <= 0) return null;

        // --- 2. Risco e Retorno (UNITÁRIO) ---
        const lucro_maximo = netPremiumUnitario; 
        const max_loss = Infinity; 

        // --- 3. Pontos Chave ---
        const breakeven_low = K - netPremiumUnitario;
        const breakeven_high = K + netPremiumUnitario;
        
        // Em estratégias de crédito com risco infinito, o ROI é geralmente baixo 
        // ou calculado sobre a margem exigida pela corretora.
        const roi = 0.15; 

        // --- 4. Gregas (Venda = -1 * Gregas Unitárias) ---
        const greeks: Greeks = {
            delta: -(callLeg.gregas_unitarias.delta ?? 0) - (putLeg.gregas_unitarias.delta ?? 0),
            gamma: -(callLeg.gregas_unitarias.gamma ?? 0) - (putLeg.gregas_unitarias.gamma ?? 0),
            // Short Straddle é POSITIVO em Theta (ganha com a decomposição do tempo)
            theta: -(callLeg.gregas_unitarias.theta ?? 0) - (putLeg.gregas_unitarias.theta ?? 0), 
            // Short Straddle é NEGATIVO em Vega (perde se a volatilidade subir)
            vega: -(callLeg.gregas_unitarias.vega ?? 0) - (putLeg.gregas_unitarias.vega ?? 0), 
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            { derivative: callLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(callLeg, 'VENDA', K) },
            { derivative: putLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(putLeg, 'VENDA', K) },
        ];
        
        return {
            name: this.name,
            asset: callLeg.ativo_subjacente,
            spread_type: 'STRADDLE', 
            expiration: callLeg.vencimento, 
            dias_uteis: callLeg.dias_uteis ?? 0, 
            strike_description: `K: ${K.toFixed(2)}`,
            asset_price: assetPrice, 
            
            net_premium: netPremiumUnitario,
            cash_flow_bruto: netPremiumUnitario,
            cash_flow_liquido: netPremiumUnitario,
            initialCashFlow: netPremiumUnitario, 
            natureza: 'CRÉDITO' as NaturezaOperacao,

            risco_maximo: max_loss,
            lucro_maximo: lucro_maximo, 
            max_profit: lucro_maximo,
            max_loss: -max_loss,
            
            current_pnl: 0, 
            current_price: assetPrice, 

            breakEvenPoints: [breakeven_low, breakeven_high], 
            breakeven_low: breakeven_low, 
            breakeven_high: breakeven_high, 
            
            width: 0, 
            minPriceToMaxProfit: K, 
            maxPriceToMaxProfit: K, 
            
            risco_retorno_unitario: roi, 
            rentabilidade_max: roi,
            roi: roi, 
            margem_exigida: assetPrice * 0.2, // Estimativa conservadora de margem (20% do valor do ativo)
            probabilidade_sucesso: 0, 
            score: 0, 
            should_close: false,
            
            pernas: pernas, 
            greeks: greeks, 
        } as StrategyMetrics;
    }
}