// src/strategies/CalendarSpread.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    // Extrai mês e ano para diferenciar os vencimentos no display
    const dateParts = leg.vencimento.split('-');
    const label = dateParts.length > 1 ? `${dateParts[1]}/${dateParts[0].slice(-2)}` : '';
    return `${action}-${typeInitial} ${leg.option_ticker} K${strikeStr} (${label})`;
}

export class CalendarSpread implements IStrategy {
    
    public readonly name: string = 'Long Calendar Spread';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA'; 
    
    getDescription(): string {
        return 'Estratégia horizontal (tempo). Vende vencimento curto e compra longo no mesmo strike.';
    }

    getLegCount(): number {
        return 2;
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        return []; // Requer modelo Black-Scholes para estimar preço da perna longa
    }

    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        // Ordenar por vencimento: Mais curto (Venda) primeiro
        const sortedLegs = [...legData].sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());
        
        const shortLeg = sortedLegs[0];  // Vencimento Curto
        const longLeg = sortedLegs[1];   // Vencimento Longo
        
        const K_strike = shortLeg.strike!;

        // Validações Cruciais para Calendário
        if (K_strike !== longLeg.strike || 
            shortLeg.vencimento === longLeg.vencimento || 
            shortLeg.tipo !== longLeg.tipo) return null;
        
        // Em um Long Calendar, a opção longa (mais tempo) DEVE ser mais cara
        const cashFlowBrutoUnitario = longLeg.premio - shortLeg.premio;
        if (cashFlowBrutoUnitario <= 0.05) return null; 

        // --- 1. Risco e Retorno (Estimativas de Mercado) ---
        const max_loss = cashFlowBrutoUnitario; 
        // Estimativa conservadora de lucro máximo (pico no strike)
        const max_profit = cashFlowBrutoUnitario * 1.5;

        // --- 2. Pontos Chave ---
        const breakeven_offset = assetPrice * 0.05; // Estimativa: 5% de range
        const breakeven1 = K_strike - breakeven_offset; 
        const breakeven2 = K_strike + breakeven_offset; 
        const roi = max_profit / max_loss;

        // --- 3. Gregas (Soma ponderada) ---
        const greeks: Greeks = {
            delta: (longLeg.gregas_unitarias.delta ?? 0) - (shortLeg.gregas_unitarias.delta ?? 0),
            gamma: (longLeg.gregas_unitarias.gamma ?? 0) - (shortLeg.gregas_unitarias.gamma ?? 0),
            theta: (longLeg.gregas_unitarias.theta ?? 0) - (shortLeg.gregas_unitarias.theta ?? 0), 
            vega: (longLeg.gregas_unitarias.vega ?? 0) - (shortLeg.gregas_unitarias.vega ?? 0), 
        };

        const pernas: StrategyLeg[] = [
            { derivative: shortLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(shortLeg, 'VENDA', K_strike) },
            { derivative: longLeg, direction: 'COMPRA', multiplier: 1, display: generateDisplay(longLeg, 'COMPRA', K_strike) },
        ];
        
        return {
            name: this.name,
            asset: longLeg.ativo_subjacente,
            spread_type: 'CALENDAR SPREAD',
            expiration: shortLeg.vencimento,
            dias_uteis: shortLeg.dias_uteis ?? 0, 
            strike_description: `Strike: ${K_strike.toFixed(2)}`,
            asset_price: assetPrice, 
            
            net_premium: -cashFlowBrutoUnitario,
            cash_flow_bruto: -cashFlowBrutoUnitario,
            cash_flow_liquido: -cashFlowBrutoUnitario,
            initialCashFlow: -cashFlowBrutoUnitario, 
            natureza: 'DÉBITO' as NaturezaOperacao,

            risco_maximo: max_loss,
            lucro_maximo: max_profit,
            max_profit: max_profit,
            max_loss: -max_loss, // Negativo para o payoff
            
            current_pnl: 0, 
            current_price: assetPrice, 
            
            breakEvenPoints: [breakeven1, breakeven2], 
            breakeven_low: breakeven1, 
            breakeven_high: breakeven2, 
            
            width: 0,
            minPriceToMaxProfit: K_strike, 
            maxPriceToMaxProfit: K_strike, 
            
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