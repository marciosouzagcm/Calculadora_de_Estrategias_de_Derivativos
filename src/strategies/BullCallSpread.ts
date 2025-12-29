import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.option_ticker} K${strike.toFixed(2)}`;
}

export class BullCallSpread implements IStrategy {
    
    public readonly name: string = 'Trava de Alta (Call)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'ALTA'; 
    
    /**
     * Scanner: Encontra todas as travas de alta com Calls (Bull Call Spread)
     */
    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];

        // 1. Filtrar apenas CALLS com strike e ordenar por strike (Crescente)
        const calls = allOptions
            .filter(leg => leg.tipo === 'CALL' && leg.strike !== null)
            .sort((a, b) => a.strike - b.strike);

        if (calls.length < 2) return [];

        // 2. Loop de combinações: K1 (Menor/Compra) e K2 (Maior/Venda)
        for (let i = 0; i < calls.length; i++) {
            for (let j = i + 1; j < calls.length; j++) {
                const K1_long = calls[i];  // Strike Baixo (Compra - ITM/ATM)
                const K2_short = calls[j]; // Strike Alto (Venda - OTM)

                const K1 = K1_long.strike;
                const K2 = K2_short.strike;

                // Validação de vencimento
                if (K1_long.vencimento !== K2_short.vencimento) continue;

                // --- Cálculo Financeiro (DÉBITO) ---
                const width = K2 - K1;
                const netCost = K1_long.premio - K2_short.premio;

                // FILTROS DE REALIDADE DE MERCADO:
                // 1. O custo deve ser positivo (pagamos pela trava)
                // 2. Não pagar mais de 80% da largura (evita ROIs baixos demais que somem com taxas)
                if (netCost <= 0.05 || netCost > (width * 0.80)) continue;

                const max_loss = netCost;
                const max_profit = width - netCost;
                const roi = max_loss > 0 ? (max_profit / max_loss) : 0;
                const breakeven = K1 + netCost;

                // --- Cálculo de Gregas Net ---
                const greeks: Greeks = {
                    delta: K1_long.gregas_unitarias.delta - K2_short.gregas_unitarias.delta,
                    gamma: K1_long.gregas_unitarias.gamma - K2_short.gregas_unitarias.gamma,
                    theta: K1_long.gregas_unitarias.theta - K2_short.gregas_unitarias.theta,
                    vega: K1_long.gregas_unitarias.vega - K2_short.gregas_unitarias.vega,
                };

                results.push({
                    name: this.name,
                    asset: K1_long.ativo_subjacente,
                    spread_type: 'VERTICAL CALL',
                    expiration: K1_long.vencimento,
                    dias_uteis: K1_long.dias_uteis ?? 0,
                    strike_description: `C:${K1.toFixed(2)} / V:${K2.toFixed(2)}`,
                    asset_price: assetPrice,
                    net_premium: -netCost, // Negativo (saída de caixa)
                    initialCashFlow: -netCost,
                    natureza: 'DÉBITO' as NaturezaOperacao,
                    risco_maximo: max_loss,
                    lucro_maximo: max_profit,
                    max_profit: max_profit,
                    max_loss: -max_loss,
                    breakEvenPoints: [Number(breakeven.toFixed(2))],
                    width: width,
                    roi: roi,
                    greeks: greeks,
                    pernas: [
                        { derivative: K1_long, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K1_long, 'COMPRA', K1) },
                        { derivative: K2_short, direction: 'VENDA', multiplier: 1, display: generateDisplay(K2_short, 'VENDA', K2) },
                    ]
                } as any);
            }
        }

        return results;
    }

    getDescription(): string {
        return 'Estratégia de Alta a Débito. Compra Call de strike baixo (K1) e Vende Call de strike alto (K2).';
    }

    getLegCount(): number { return 2; }
    generatePayoff(): any[] { return []; }
}