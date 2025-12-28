// src/strategies/BearCallSpread.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.option_ticker} K${strikeStr}`;
}

export class BearCallSpread implements IStrategy {
    
    public readonly name: string = 'Bear Call Spread (Trava de Baixa)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'BAIXA'; 
    
    getDescription(): string {
        return 'Estratégia de Baixa a Crédito. Vende Call de strike baixo (K1) e Compra Call de strike alto (K2).';
    }

    getLegCount(): number {
        return 2;
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        return []; // Implementado no PayoffCalculator
    }

    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        // Ordena por strike: Call de menor strike sempre vem primeiro
        const callLegs = [...legData].filter(leg => leg.tipo === 'CALL').sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
        
        if (callLegs.length !== 2) return null;

        const K1_short = callLegs[0]; // Vende a mais cara (Strike menor)
        const K2_long = callLegs[1];  // Compra a mais barata (Strike maior)
        
        const K1 = K1_short.strike!;
        const K2 = K2_long.strike!;

        // Validação: Numa Trava de Baixa com CALL, o strike vendido deve ser menor que o comprado
        if (K1 >= K2 || K1_short.vencimento !== K2_long.vencimento) return null;

        // --- 1. Fluxo de Caixa Unitário ---
        // Na trava de crédito, o prêmio recebido (Venda) deve ser maior que o pago (Compra)
        const netPremiumUnitario = K1_short.premio - K2_long.premio;
        
        // Se o prêmio líquido for zero ou negativo, a trava não faz sentido financeiro
        if (netPremiumUnitario <= 0.01) return null; 

        // --- 2. Risco e Retorno Unitário ---
        const width = K2 - K1;
        const max_profit = netPremiumUnitario;
        const max_loss = width - netPremiumUnitario;

        // --- 3. Pontos Chave ---
        const breakeven = K1 + netPremiumUnitario;
        const roi = max_loss > 0 ? (max_profit / max_loss) : 0;

        // --- 4. Gregas ---
        // Venda inverte o sinal da grega unitária
        const greeks: Greeks = {
            delta: (K1_short.gregas_unitarias.delta ?? 0) * -1 + (K2_long.gregas_unitarias.delta ?? 0),
            gamma: (K1_short.gregas_unitarias.gamma ?? 0) * -1 + (K2_long.gregas_unitarias.gamma ?? 0),
            theta: (K1_short.gregas_unitarias.theta ?? 0) * -1 + (K2_long.gregas_unitarias.theta ?? 0),
            vega: (K1_short.gregas_unitarias.vega ?? 0) * -1 + (K2_long.gregas_unitarias.vega ?? 0),
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            { derivative: K1_short, direction: 'VENDA', multiplier: 1, display: generateDisplay(K1_short, 'VENDA', K1) },
            { derivative: K2_long, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K2_long, 'COMPRA', K2) },
        ];
        
        return {
            name: this.name,
            asset: K1_short.ativo_subjacente,
            spread_type: 'VERTICAL CALL',
            expiration: K1_short.vencimento, 
            dias_uteis: K1_short.dias_uteis ?? 0, 
            strike_description: `K1:${K1.toFixed(2)} (V) / K2:${K2.toFixed(2)} (C)`,
            asset_price: assetPrice, 
            net_premium: netPremiumUnitario, 
            cash_flow_bruto: netPremiumUnitario,
            cash_flow_liquido: netPremiumUnitario,
            initialCashFlow: netPremiumUnitario, 
            natureza: 'CRÉDITO' as NaturezaOperacao,
            risco_maximo: max_loss,
            lucro_maximo: max_profit,
            max_profit: max_profit,
            max_loss: -max_loss, 
            current_pnl: 0, 
            current_price: assetPrice, 
            breakEvenPoints: [breakeven], 
            breakeven_low: breakeven, 
            breakeven_high: breakeven, 
            width: width,
            minPriceToMaxProfit: 0,
            maxPriceToMaxProfit: K1,
            risco_retorno_unitario: roi, 
            rentabilidade_max: roi * 100,
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