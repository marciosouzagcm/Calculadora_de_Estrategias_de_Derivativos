// src/strategies/ShortStrangle.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, OptionLeg, StrategyMetrics, StrategyLeg, NaturezaOperacao, ProfitLossValue } from '../interfaces/Types';

function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.ativo_subjacente} K${strikeStr}`;
}

export class ShortStrangle implements IStrategy {
    
    public readonly name: string = 'Short Strangle (Crédito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA'; 
    
    getDescription(): string {
        return 'Venda de Put e Call fora do dinheiro. Oferece uma zona de lucro maior que o Straddle, mas com risco ilimitado.';
    }

    getLegCount(): number {
        return 2;
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        return []; // Processado pelo motor de payoff central
    }

    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        const putLeg = legData.find(leg => leg.tipo === 'PUT');
        const callLeg = legData.find(leg => leg.tipo === 'CALL'); 
        
        if (!callLeg || !putLeg || callLeg.vencimento !== putLeg.vencimento) return null;

        const K_Put = putLeg.strike!;
        const K_Call = callLeg.strike!;

        // Validação: No Strangle vendido, K_Put < K_Call
        if (K_Put >= K_Call) return null;

        // --- 1. Fluxo de Caixa (UNITÁRIO) ---
        const netPremiumUnitario = putLeg.premio + callLeg.premio;
        if (netPremiumUnitario <= 0) return null;

        // --- 2. Risco e Retorno (UNITÁRIO) ---
        const lucro_maximo = netPremiumUnitario; 
        const max_loss = Infinity; 

        // --- 3. Pontos Chave ---
        const breakeven_low = K_Put - netPremiumUnitario;
        const breakeven_high = K_Call + netPremiumUnitario;
        
        // ROI estimado sobre margem (Strangle costuma exigir menos margem que Straddle)
        const roi = 0.20; 

        // --- 4. Gregas (Venda = -1 * Gregas Unitárias) ---
        const greeks: Greeks = {
            delta: -(callLeg.gregas_unitarias.delta ?? 0) - (putLeg.gregas_unitarias.delta ?? 0),
            gamma: -(callLeg.gregas_unitarias.gamma ?? 0) - (putLeg.gregas_unitarias.gamma ?? 0),
            theta: -(callLeg.gregas_unitarias.theta ?? 0) - (putLeg.gregas_unitarias.theta ?? 0), // Theta Positivo
            vega: -(callLeg.gregas_unitarias.vega ?? 0) - (putLeg.gregas_unitarias.vega ?? 0),   // Vega Negativo
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            { derivative: putLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(putLeg, 'VENDA', K_Put) },
            { derivative: callLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(callLeg, 'VENDA', K_Call) },
        ];
        
        return {
            name: this.name,
            asset: callLeg.ativo_subjacente,
            spread_type: 'STRANGLE', 
            expiration: callLeg.vencimento, 
            dias_uteis: callLeg.dias_uteis ?? 0, 
            strike_description: `P: ${K_Put.toFixed(2)} | C: ${K_Call.toFixed(2)}`,
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
            
            width: K_Call - K_Put, 
            minPriceToMaxProfit: K_Put, 
            maxPriceToMaxProfit: K_Call, 
            
            risco_retorno_unitario: roi, 
            rentabilidade_max: roi,
            roi: roi, 
            margem_exigida: assetPrice * 0.15, // Margem estimada (15% do ativo)
            probabilidade_sucesso: 0, 
            score: 0, 
            should_close: false,
            
            pernas: pernas, 
            greeks: greeks, 
        } as StrategyMetrics;
    }
}