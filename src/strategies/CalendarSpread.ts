// src/strategies/CalendarSpread.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, ProfitLossValue, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

// Função auxiliar para gerar a string de display
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    const dateParts = leg.vencimento.split('-');
    const month = dateParts.length > 1 ? dateParts[1] : '';
    return `${action}-${typeInitial} ${leg.ativo_subjacente} K${strikeStr} (${month})`;
}

export class CalendarSpread implements IStrategy {
    
    public readonly name: string = 'Long Calendar Spread (Débito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA'; 
    
    getDescription(): string {
        return 'Estratégia de tempo (Horizontal). Vende o vencimento curto e compra o longo no mesmo strike.';
    }

    getLegCount(): number {
        return 2;
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        return []; // O payoff de calendário requer Black-Scholes para estimar o valor da perna longa no vencimento da curta.
    }

    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        // Ordenar por vencimento (mais curto primeiro)
        const sortedLegs = [...legData].sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());
        
        const shortLeg = sortedLegs[0];  // Vencimento Curto (Venda)
        const longLeg = sortedLegs[1];   // Vencimento Longo (Compra)
        
        const K_strike = shortLeg.strike!;

        // Validação: Mesmo strike, vencimentos diferentes e tipo idêntico (Call/Call ou Put/Put)
        if (K_strike !== longLeg.strike || shortLeg.vencimento === longLeg.vencimento || shortLeg.tipo !== longLeg.tipo) return null;
        
        // Em um Long Calendar, a opção longa é sempre mais cara que a curta
        if (longLeg.premio <= shortLeg.premio) return null; 

        // --- 1. Fluxo de Caixa (UNITÁRIO) ---
        const cashFlowBrutoUnitario = longLeg.premio - shortLeg.premio;

        // --- 2. Risco e Retorno (UNITÁRIO) ---
        // Risco Máximo é o débito total pago
        const max_loss = cashFlowBrutoUnitario; 

        // Lucro Máximo em Calendários é teórico (ocorre se o papel fechar no strike no vencimento da curta)
        // Uma estimativa comum de mercado é que o lucro máximo seja ~1.5x a 2x o débito pago,
        // dependendo da volatilidade. Usaremos 1.5x como conservador para o ranking.
        const max_profit = cashFlowBrutoUnitario * 1.5;

        // --- 3. Pontos Chave ---
        // BEPs em Calendários variam com a IV, estimativa simplificada:
        const breakeven_offset = max_loss * 0.8; 
        const breakeven1 = K_strike - breakeven_offset; 
        const breakeven2 = K_strike + breakeven_offset; 
        const roi = max_profit / max_loss;

        // --- 4. Gregas ---
        const greeks: Greeks = {
            delta: (longLeg.gregas_unitarias.delta ?? 0) - (shortLeg.gregas_unitarias.delta ?? 0),
            gamma: (longLeg.gregas_unitarias.gamma ?? 0) - (shortLeg.gregas_unitarias.gamma ?? 0),
            // Calendários são positivos em Theta (ganham com a passagem do tempo)
            theta: (longLeg.gregas_unitarias.theta ?? 0) - (shortLeg.gregas_unitarias.theta ?? 0), 
            // Calendários são positivos em Vega (ganham com o aumento da volatilidade)
            vega: (longLeg.gregas_unitarias.vega ?? 0) - (shortLeg.gregas_unitarias.vega ?? 0), 
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            { derivative: shortLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(shortLeg, 'VENDA', K_strike) },
            { derivative: longLeg, direction: 'COMPRA', multiplier: 1, display: generateDisplay(longLeg, 'COMPRA', K_strike) },
        ];
        
        return {
            name: this.name,
            asset: longLeg.ativo_subjacente,
            spread_type: 'CALENDAR SPREAD',
            expiration: shortLeg.vencimento, // O vencimento da estratégia é o da perna curta
            dias_uteis: shortLeg.dias_uteis ?? 0, 
            strike_description: `K: ${K_strike.toFixed(2)}`,
            asset_price: assetPrice, 
            
            net_premium: -cashFlowBrutoUnitario,
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
            
            breakEvenPoints: [breakeven1, breakeven2], 
            breakeven_low: breakeven1, 
            breakeven_high: breakeven2, 
            
            width: 0,
            minPriceToMaxProfit: K_strike, 
            maxPriceToMaxProfit: K_strike, 
            
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