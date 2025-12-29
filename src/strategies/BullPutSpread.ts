import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.option_ticker} K${strike.toFixed(2)}`;
}

export class BullPutSpread implements IStrategy {
    
    public readonly name: string = 'Trava de Alta (Put)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'ALTA'; 
    
    /**
     * Scanner: Busca todas as combinações de Bull Put Spread no banco de dados
     */
    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];

        // 1. Filtrar apenas PUTS com strike e ordenar por strike (Decrescente)
        // K1 (Venda - Strike Maior) e K2 (Compra - Strike Menor)
        const puts = allOptions
            .filter(leg => leg.tipo === 'PUT' && leg.strike !== null)
            .sort((a, b) => b.strike - a.strike);

        if (puts.length < 2) return [];

        // 2. Loop Scanner
        for (let i = 0; i < puts.length; i++) {
            for (let j = i + 1; j < puts.length; j++) {
                const K1_short = puts[i]; // Strike Alto (Venda - ATM/ITM)
                const K2_long = puts[j];  // Strike Baixo (Compra - OTM)

                const K1 = K1_short.strike;
                const K2 = K2_long.strike;

                // Validação de vencimento
                if (K1_short.vencimento !== K2_long.vencimento) continue;

                // --- Cálculo Financeiro (CRÉDITO) ---
                const width = K1 - K2;
                const netCredit = K1_short.premio - K2_long.premio;

                // FILTROS DE SANIDADE:
                // 1. Deve gerar crédito positivo
                // 2. Crédito não pode exceder 80% da largura (evita distorção de ROI)
                if (netCredit <= 0.05 || netCredit > (width * 0.80)) continue;

                const max_profit = netCredit;
                const max_loss = width - netCredit;
                const roi = max_loss > 0 ? (max_profit / max_loss) : 0;
                const breakeven = K1 - netCredit;

                // --- Cálculo de Gregas Net ---
                // Venda inverte o sinal da grega unitária
                const greeks: Greeks = {
                    delta: (K1_short.gregas_unitarias.delta * -1) + K2_long.gregas_unitarias.delta,
                    gamma: (K1_short.gregas_unitarias.gamma * -1) + K2_long.gregas_unitarias.gamma,
                    theta: (K1_short.gregas_unitarias.theta * -1) + K2_long.gregas_unitarias.theta,
                    vega: (K1_short.gregas_unitarias.vega * -1) + K2_long.gregas_unitarias.vega,
                };

                results.push({
                    name: this.name,
                    asset: K1_short.ativo_subjacente,
                    spread_type: 'VERTICAL PUT',
                    expiration: K1_short.vencimento,
                    dias_uteis: K1_short.dias_uteis ?? 0,
                    strike_description: `V:${K1.toFixed(2)} / C:${K2.toFixed(2)}`,
                    asset_price: assetPrice,
                    net_premium: netCredit,
                    initialCashFlow: netCredit,
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
        return 'Estratégia de Alta/Neutra a Crédito. Vende Put de strike alto (K1) e Compra Put de strike baixo (K2).';
    }

    getLegCount(): number { return 2; }
    generatePayoff(): any[] { return []; }
}