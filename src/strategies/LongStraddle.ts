// src/strategies/LongStraddle.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, OptionLeg, StrategyMetrics, StrategyLeg, NaturezaOperacao, ProfitLossValue } from '../interfaces/Types';

// Função auxiliar para gerar a string de display
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.ativo_subjacente} K${strikeStr}`;
}

export class LongStraddle implements IStrategy {
    
    public readonly name: string = 'Long Straddle (Débito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'VOLÁTIL'; 
    
    getDescription(): string {
        return 'Estratégia de Alta Volatilidade a Débito. Compra Call e Put no mesmo Strike e Vencimento.';
    }

    getLegCount(): number {
        return 2;
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        return []; // Implementado pelo calculador central
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
        // Risco Máximo é o custo total pago
        const max_loss = netPremiumUnitario; 
        // Lucro Máximo é teoricamente infinito (na prática limitado pelo ativo ir a zero ou disparar)
        const max_profit = Infinity;

        // --- 3. Pontos Chave ---
        const breakeven_low = K - netPremiumUnitario;
        const breakeven_high = K + netPremiumUnitario;
        
        // ROI para Straddle é frequentemente calculado sobre o capital em risco (débito)
        // Como o lucro é infinito, usamos um valor alto ou 1000% para o Score de ranking
        const roi = 10; 

        // --- 4. Gregas ---
        const greeks: Greeks = {
            delta: (callLeg.gregas_unitarias.delta ?? 0) + (putLeg.gregas_unitarias.delta ?? 0),
            gamma: (callLeg.gregas_unitarias.gamma ?? 0) + (putLeg.gregas_unitarias.gamma ?? 0),
            theta: (callLeg.gregas_unitarias.theta ?? 0) + (putLeg.gregas_unitarias.theta ?? 0),
            vega: (callLeg.gregas_unitarias.vega ?? 0) + (putLeg.gregas_unitarias.vega ?? 0),
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            { derivative: callLeg, direction: 'COMPRA', multiplier: 1, display: generateDisplay(callLeg, 'COMPRA', K) },
            { derivative: putLeg, direction: 'COMPRA', multiplier: 1, display: generateDisplay(putLeg, 'COMPRA', K) },
        ];
        
        return {
            name: this.name,
            asset: callLeg.ativo_subjacente,
            spread_type: 'STRADDLE', 
            expiration: callLeg.vencimento, 
            dias_uteis: callLeg.dias_uteis ?? 0, 
            strike_description: `K: ${K.toFixed(2)}`,
            asset_price: assetPrice, 
            
            net_premium: -netPremiumUnitario,
            cash_flow_bruto: -netPremiumUnitario,
            cash_flow_liquido: -netPremiumUnitario,
            initialCashFlow: -netPremiumUnitario, 
            natureza: 'DÉBITO' as NaturezaOperacao,

            risco_maximo: max_loss,
            lucro_maximo: max_profit,
            max_profit: max_profit,
            max_loss: max_loss,
            
            current_pnl: 0, 
            current_price: assetPrice, 

            breakEvenPoints: [breakeven_low, breakeven_high], 
            breakeven_low: breakeven_low, 
            breakeven_high: breakeven_high, 
            
            width: 0, 
            minPriceToMaxProfit: breakeven_high, 
            maxPriceToMaxProfit: breakeven_low, 
            
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