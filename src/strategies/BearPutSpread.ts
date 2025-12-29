import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.option_ticker} K${strike.toFixed(2)}`;
}

export class BearPutSpread implements IStrategy {
    
    public readonly name: string = 'Trava de Baixa (Put)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'BAIXA';
    
    /**
     * Scanner: Encontra todas as travas de baixa com Puts (Bear Put Spread)
     */
    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];

        // 1. Filtrar apenas PUTS com strike válido
        const puts = allOptions
            .filter(leg => leg.tipo === 'PUT' && leg.strike !== null)
            .sort((a, b) => b.strike - a.strike); // Ordena decrescente (Maior strike primeiro)

        if (puts.length < 2) return [];

        // 2. Loop Scanner: K1 (Maior Strike/Compra) e K2 (Menor Strike/Venda)
        for (let i = 0; i < puts.length; i++) {
            for (let j = i + 1; j < puts.length; j++) {
                const K1_long = puts[i];  // Strike Alto (Compra - ITM/ATM)
                const K2_short = puts[j]; // Strike Baixo (Venda - OTM)

                const K1 = K1_long.strike;
                const K2 = K2_short.strike;

                // Validação de vencimento
                if (K1_long.vencimento !== K2_short.vencimento) continue;

                // --- Cálculo Financeiro (DÉBITO) ---
                const width = K1 - K2;
                const netCost = K1_long.premio - K2_short.premio;

                // FILTROS DE SANIDADE:
                // 1. O custo deve ser positivo
                // 2. Não pagar mais de 80% da largura (evita ROIs pífios ou erros de book)
                if (netCost <= 0.05 || netCost > (width * 0.80)) continue;

                const max_loss = netCost;
                const max_profit = width - netCost;
                const roi = max_loss > 0 ? (max_profit / max_loss) : 0;
                const breakeven = K1 - netCost;

                // --- Gregas ---
                const greeks: Greeks = {
                    delta: K1_long.gregas_unitarias.delta - K2_short.gregas_unitarias.delta,
                    gamma: K1_long.gregas_unitarias.gamma - K2_short.gregas_unitarias.gamma,
                    theta: K1_long.gregas_unitarias.theta - K2_short.gregas_unitarias.theta,
                    vega: K1_long.gregas_unitarias.vega - K2_short.gregas_unitarias.vega,
                };

                results.push({
                    name: this.name,
                    asset: K1_long.ativo_subjacente,
                    spread_type: 'VERTICAL PUT',
                    expiration: K1_long.vencimento,
                    dias_uteis: K1_long.dias_uteis ?? 0,
                    strike_description: `C:${K1.toFixed(2)} / V:${K2.toFixed(2)}`,
                    asset_price: assetPrice,
                    net_premium: -netCost, // Negativo pois é saída de caixa (débito)
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
        return 'Estratégia de Baixa a Débito. Compra Put de strike alto (K1) e Vende Put de strike baixo (K2).';
    }

    getLegCount(): number { return 2; }
    generatePayoff(): any[] { return []; }
}