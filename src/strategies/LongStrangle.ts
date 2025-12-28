// src/strategies/LongStrangle.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, OptionLeg, StrategyMetrics, StrategyLeg, NaturezaOperacao } from '../interfaces/Types';

function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.option_ticker} K${strikeStr}`;
}

export class LongStrangle implements IStrategy {
    
    public readonly name: string = 'Long Strangle';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'VOLÁTIL'; 
    
    getDescription(): string {
        return 'Compra de Call e Put OTM com strikes diferentes. Mais barato que o Straddle, mas exige maior movimento.';
    }

    getLegCount(): number {
        return 2;
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        return []; 
    }

    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        const putLeg = legData.find(leg => leg.tipo === 'PUT');
        const callLeg = legData.find(leg => leg.tipo === 'CALL'); 
        
        if (!callLeg || !putLeg || callLeg.vencimento !== putLeg.vencimento) return null;

        const K_Put = putLeg.strike!;
        const K_Call = callLeg.strike!;

        // No Strangle, a Put deve ter strike menor que a Call (ambas OTM)
        if (K_Put >= K_Call) return null;

        // --- 1. Fluxo de Caixa (UNITÁRIO) ---
        const netPremiumUnitario = putLeg.premio + callLeg.premio;
        if (netPremiumUnitario <= 0.01) return null;

        // --- 2. Risco e Retorno (UNITÁRIO) ---
        const max_loss = netPremiumUnitario; 
        const max_profit = Infinity;

        // --- 3. Pontos Chave ---
        const breakeven_low = K_Put - netPremiumUnitario;
        const breakeven_high = K_Call + netPremiumUnitario;
        
        const roi = 10; 

        // --- 4. Gregas ---
        const greeks: Greeks = {
            delta: (callLeg.gregas_unitarias.delta ?? 0) + (putLeg.gregas_unitarias.delta ?? 0),
            gamma: (callLeg.gregas_unitarias.gamma ?? 0) + (putLeg.gregas_unitarias.gamma ?? 0),
            theta: (callLeg.gregas_unitarias.theta ?? 0) + (putLeg.gregas_unitarias.theta ?? 0),
            vega: (callLeg.gregas_unitarias.vega ?? 0) + (putLeg.gregas_unitarias.vega ?? 0),
        };

        const pernas: StrategyLeg[] = [
            { derivative: putLeg, direction: 'COMPRA', multiplier: 1, display: generateDisplay(putLeg, 'COMPRA', K_Put) },
            { derivative: callLeg, direction: 'COMPRA', multiplier: 1, display: generateDisplay(callLeg, 'COMPRA', K_Call) },
        ];
        
        return {
            name: this.name,
            asset: callLeg.ativo_subjacente,
            spread_type: 'STRANGLE', 
            expiration: callLeg.vencimento, 
            dias_uteis: callLeg.dias_uteis ?? 0, 
            strike_description: `P:${K_Put.toFixed(2)} | C:${K_Call.toFixed(2)}`,
            asset_price: assetPrice, 
            
            net_premium: -netPremiumUnitario,
            cash_flow_bruto: -netPremiumUnitario,
            cash_flow_liquido: -netPremiumUnitario,
            initialCashFlow: -netPremiumUnitario, 
            natureza: 'DÉBITO' as NaturezaOperacao,

            risco_maximo: max_loss,
            lucro_maximo: max_profit,
            max_profit: max_profit,
            max_loss: -max_loss, // Negativo para o payoff
            
            current_pnl: 0, 
            current_price: assetPrice, 

            breakEvenPoints: [breakeven_low, breakeven_high], 
            breakeven_low: breakeven_low, 
            breakeven_high: breakeven_high, 
            
            width: K_Call - K_Put, 
            minPriceToMaxProfit: 0, 
            maxPriceToMaxProfit: Infinity, 
            
            risco_retorno_unitario: roi, 
            rentabilidade_max: roi * 100,
            roi: roi, 
            margem_exigida: 0, 
            probabilidade_sucesso: 0, 
            score: 0, 
            should_close: false,
            
            pernas: pernas, 
            greeks: greeks, 
        } as StrategyMetrics;
    }
}