import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.option_ticker} K${strike.toFixed(2)}`;
}

export class BearCallSpread implements IStrategy {
    public readonly name: string = 'Trava de Baixa (Call)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'BAIXA';

    /**
     * Scanner para encontrar todas as combinações de Trava de Baixa (Call)
     */
    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];
        
        // 1. Filtrar apenas CALLS com strike e ordenar
        const calls = allOptions
            .filter(leg => leg.tipo === 'CALL' && leg.strike !== null)
            .sort((a, b) => a.strike - b.strike);

        if (calls.length < 2) return [];

        // 2. Loop de combinações (Scanner)
        for (let i = 0; i < calls.length; i++) {
            for (let j = i + 1; j < calls.length; j++) {
                const K1_short = calls[i]; // Strike menor (Venda)
                const K2_long = calls[j];  // Strike maior (Compra)

                const K1 = K1_short.strike;
                const K2 = K2_long.strike;

                // Validação de vencimento
                if (K1_short.vencimento !== K2_long.vencimento) continue;

                // --- Cálculo Financeiro ---
                const width = K2 - K1;
                const netPremium = K1_short.premio - K2_long.premio;

                // --- FILTRO DE SANIDADE / REALIDADE ---
                // 1. Prêmio deve ser positivo (trava de crédito)
                // 2. Se o crédito for > 80% da largura, o ROI é irreal (erro de liquidez)
                if (netPremium <= 0.05 || netPremium > (width * 0.80)) continue;

                const max_profit = netPremium;
                const max_loss = width - netPremium;
                const roi = max_loss > 0 ? (max_profit / max_loss) : 0;
                const breakeven = K1 + netPremium;

                // --- Gregas ---
                const greeks: Greeks = {
                    delta: (K1_short.gregas_unitarias.delta * -1) + K2_long.gregas_unitarias.delta,
                    gamma: (K1_short.gregas_unitarias.gamma * -1) + K2_long.gregas_unitarias.gamma,
                    theta: (K1_short.gregas_unitarias.theta * -1) + K2_long.gregas_unitarias.theta,
                    vega: (K1_short.gregas_unitarias.vega * -1) + K2_long.gregas_unitarias.vega,
                };

                results.push({
                    name: this.name,
                    asset: K1_short.ativo_subjacente,
                    spread_type: 'VERTICAL CALL',
                    expiration: K1_short.vencimento,
                    dias_uteis: K1_short.dias_uteis ?? 0,
                    strike_description: `V:${K1.toFixed(2)} / C:${K2.toFixed(2)}`,
                    asset_price: assetPrice,
                    net_premium: netPremium,
                    initialCashFlow: netPremium,
                    natureza: 'CRÉDITO' as NaturezaOperacao,
                    risco_maximo: max_loss,
                    lucro_maximo: max_profit,
                    max_profit: max_profit,
                    max_loss: -max_loss,
                    breakEvenPoints: [Number(breakeven.toFixed(2))],
                    width: width,
                    roi: roi,
                    greeks: greeks,
                    pernas: [
                        { derivative: K1_short, direction: 'VENDA', multiplier: 1, display: generateDisplay(K1_short, 'VENDA', K1) },
                        { derivative: K2_long, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K2_long, 'COMPRA', K2) },
                    ]
                } as any);
            }
        }

        return results;
    }

    getDescription(): string {
        return 'Estratégia de Baixa a Crédito. Vende Call de strike baixo (K1) e Compra Call de strike alto (K2).';
    }

    getLegCount(): number { return 2; }
    generatePayoff(): any[] { return []; }
}