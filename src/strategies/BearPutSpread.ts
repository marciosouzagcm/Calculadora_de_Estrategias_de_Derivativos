import { IStrategy } from '../interfaces/IStrategy.js';
import { 
    Greeks, 
    NaturezaOperacao, 
    OptionLeg, 
    StrategyMetrics 
} from '../interfaces/Types.js';

/**
 * Helper: Gera a string de exibição para as pernas da estratégia.
 */
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'COMPRA' ? '[C]' : '[V]';
    return `${action} ${leg.option_ticker} (${typeInitial}) K:${strike.toFixed(2)}`;
}

/**
 * CLASSE: BearPutSpread (Trava de Baixa com Put)
 * FUNCIONALIDADE: Identifica oportunidades onde se compra uma PUT de strike maior (ITM/ATM)
 * e vende-se uma PUT de strike menor (OTM). É uma operação de débito (saída de caixa).
 */
export class BearPutSpread implements IStrategy {
    
    public readonly name: string = 'Trava de Baixa (Put)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'BAIXA';
    
    /**
     * Scanner: Encontra todas as combinações de Trava de Baixa com Puts.
     */
    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];

        // 1. Filtro Inicial: Apenas PUTS com strike e prêmio válidos
        // Ordena decrescente (Maior strike primeiro para facilitar o loop de compra ITM -> venda OTM)
        const puts = allOptions
            .filter(leg => leg.tipo === 'PUT' && leg.strike > 0 && leg.premio > 0)
            .sort((a, b) => b.strike - a.strike); 

        if (puts.length < 2) return [];

        // 2. Loop Scanner (O(n²))
        for (let i = 0; i < puts.length; i++) {
            for (let j = i + 1; j < puts.length; j++) {
                const k1Long = puts[i];  // Strike Alto = Comprada (ITM/ATM)
                const k2Short = puts[j]; // Strike Baixo = Vendida (OTM)

                // Validação de Vencimento
                if (k1Long.vencimento !== k2Short.vencimento) continue;

                // --- Cálculo Financeiro (DÉBITO) ---
                const width = k1Long.strike - k2Short.strike;
                const netCost = k1Long.premio - k2Short.premio;

                /**
                 * FILTROS DE SANIDADE:
                 * 1. Custo Líquido: Deve ser positivo (operação de débito).
                 * 2. Limite de Custo: Não deve ultrapassar 85% da largura da trava.
                 * Pagar muito caro em uma trava limita o ROI e indica erro de spread no book.
                 */
                if (netCost <= 0.02 || netCost >= (width * 0.85)) continue;

                const maxLoss = netCost;
                const maxProfit = width - netCost;
                const roi = maxLoss > 0 ? (maxProfit / maxLoss) : 0;
                const breakeven = k1Long.strike - netCost;

                // --- Cálculo das Gregas da Posição ---
                const greeks: Greeks = {
                    delta: k1Long.gregas_unitarias.delta - k2Short.gregas_unitarias.delta,
                    gamma: k1Long.gregas_unitarias.gamma - k2Short.gregas_unitarias.gamma,
                    theta: k1Long.gregas_unitarias.theta - k2Short.gregas_unitarias.theta,
                    vega: k1Long.gregas_unitarias.vega - k2Short.gregas_unitarias.vega,
                };

                // 3. Montagem do Objeto de Resumo
                results.push({
                    name: this.name,
                    asset: k1Long.ativo_subjacente,
                    spread_type: 'VERTICAL PUT SPREAD',
                    expiration: k1Long.vencimento,
                    dias_uteis: k1Long.dias_uteis ?? 0,
                    strike_description: `C:${k1Long.strike.toFixed(2)} / V:${k2Short.strike.toFixed(2)}`,
                    asset_price: assetPrice,
                    net_premium: -netCost, // Representado como negativo (saída de caixa)
                    initialCashFlow: -netCost,
                    natureza: 'DÉBITO' as NaturezaOperacao,
                    risco_maximo: maxLoss,
                    lucro_maximo: maxProfit,
                    max_profit: maxProfit,
                    max_loss: -maxLoss,
                    breakEvenPoints: [Number(breakeven.toFixed(2))],
                    width: width,
                    roi: roi,
                    greeks: greeks,
                    pernas: [
                        { 
                            derivative: k1Long, 
                            direction: 'COMPRA', 
                            multiplier: 1, 
                            display: generateDisplay(k1Long, 'COMPRA', k1Long.strike) 
                        },
                        { 
                            derivative: k2Short, 
                            direction: 'VENDA', 
                            multiplier: 1, 
                            display: generateDisplay(k2Short, 'VENDA', k2Short.strike) 
                        },
                    ]
                } as StrategyMetrics);
            }
        }

        return results;
    }

    getDescription(): string {
        return 'Estratégia de Baixa (Bearish) a débito. Envolve a compra de uma Put mais cara (perto do dinheiro) e a venda de uma Put mais barata (fora do dinheiro) para reduzir o custo da operação.';
    }

    getLegCount(): number { return 2; }
}