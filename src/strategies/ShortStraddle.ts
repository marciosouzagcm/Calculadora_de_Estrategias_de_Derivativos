// src/strategies/ShortStraddle.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, OptionLeg, StrategyMetrics, StrategyLeg, NaturezaOperacao } from '../interfaces/Types';

function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.option_ticker} K${strikeStr}`;
}

export class ShortStraddle implements IStrategy {
    
    public readonly name: string = 'Short Straddle';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA'; 
    
    getDescription(): string {
        return 'Venda de Call e Put no mesmo strike. Lucro máximo se o ativo ficar parado; risco ilimitado.';
    }

    getLegCount(): number {
        return 2;
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        return []; 
    }

    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        const callLeg = legData.find(leg => leg.tipo === 'CALL');
        const putLeg = legData.find(leg => leg.tipo === 'PUT');
        
        if (!callLeg || !putLeg || callLeg.strike !== putLeg.strike || callLeg.vencimento !== putLeg.vencimento) return null;

        const K = callLeg.strike!;

        // --- 1. Fluxo de Caixa (UNITÁRIO) ---
        // Recebemos prêmio por vender ambas as pontas
        const netPremiumUnitario = callLeg.premio + putLeg.premio;
        if (netPremiumUnitario <= 0.01) return null;

        // --- 2. Risco e Retorno (UNITÁRIO) ---
        const lucro_maximo = netPremiumUnitario; 
        const max_loss = Infinity; 

        // --- 3. Pontos Chave ---
        const breakeven_low = K - netPremiumUnitario;
        const breakeven_high = K + netPremiumUnitario;
        
        // ROI para Short Straddle é calculado sobre a margem (ex: 20% do valor do ativo)
        const margemEstimada = assetPrice * 0.20;
        const roi = lucro_maximo / margemEstimada; 

        // --- 4. Gregas (Venda inverte o sinal da grega unitária da opção) ---
        const greeks: Greeks = {
            delta: -(callLeg.gregas_unitarias.delta ?? 0) - (putLeg.gregas_unitarias.delta ?? 0),
            gamma: -(callLeg.gregas_unitarias.gamma ?? 0) - (putLeg.gregas_unitarias.gamma ?? 0),
            // Short Straddle é POSITIVO em Theta (ganha com a passagem do tempo)
            theta: -(callLeg.gregas_unitarias.theta ?? 0) - (putLeg.gregas_unitarias.theta ?? 0), 
            // Short Straddle é NEGATIVO em Vega (perde se a volatilidade subir)
            vega: -(callLeg.gregas_unitarias.vega ?? 0) - (putLeg.gregas_unitarias.vega ?? 0), 
        };

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
            max_loss: -999999, // Representação de risco ilimitado para o gráfico
            
            current_pnl: 0, 
            current_price: assetPrice, 

            breakEvenPoints: [breakeven_low, breakeven_high], 
            breakeven_low: breakeven_low, 
            breakeven_high: breakeven_high, 
            
            width: 0, 
            minPriceToMaxProfit: K, 
            maxPriceToMaxProfit: K, 
            
            risco_retorno_unitario: roi, 
            rentabilidade_max: roi * 100,
            roi: roi, 
            margem_exigida: margemEstimada, 
            probabilidade_sucesso: 0, 
            score: 0, 
            should_close: false,
            
            pernas: pernas, 
            greeks: greeks, 
        } as StrategyMetrics;
    }
}