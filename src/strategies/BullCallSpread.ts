import { IStrategy } from '../interfaces/IStrategy.js';
import { 
    Greeks, 
    NaturezaOperacao, 
    OptionLeg, 
    StrategyMetrics 
} from '../interfaces/Types.js';

/**
 * Helper: Gera a string de exibição para as pernas da estratégia.
 * Utiliza o padrão [C] para Compra e [V] para Venda para facilitar leitura no terminal.
 */
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'COMPRA' ? '[C]' : '[V]';
    return `${action} ${leg.option_ticker} (${typeInitial}) K:${strike.toFixed(2)}`;
}

/**
 * CLASSE: BullCallSpread (Trava de Alta com Call)
 * FUNCIONALIDADE: Identifica oportunidades onde se compra uma CALL de strike menor (ITM/ATM)
 * e vende-se uma CALL de strike maior (OTM). 
 * OBJETIVO: Lucrar com a alta do ativo com risco limitado ao custo da montagem.
 */
export class BullCallSpread implements IStrategy {
    
    public readonly name: string = 'Trava de Alta (Call)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'ALTA'; 
    
    /**
     * Scanner: Itera sobre a lista de opções para encontrar spreads verticais de alta.
     */
    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];

        // 1. Filtro Inicial: Apenas CALLS com strikes e prêmios reais.
        // Ordenação crescente por strike: K1 (Menor) virá antes de K2 (Maior).
        const calls = allOptions
            .filter(leg => leg.tipo === 'CALL' && leg.strike > 0 && leg.premio > 0)
            .sort((a, b) => a.strike - b.strike);

        if (calls.length < 2) return [];

        // 2. Scanner de Combinações (O(n²))
        for (let i = 0; i < calls.length; i++) {
            for (let j = i + 1; j < calls.length; j++) {
                const k1Long = calls[i];  // Strike Baixo = Comprada (ITM/ATM)
                const k2Short = calls[j]; // Strike Alto = Vendida (OTM)

                // Validação: Mesma série/vencimento
                if (k1Long.vencimento !== k2Short.vencimento) continue;

                // --- Cálculo Financeiro (DÉBITO) ---
                const width = k2Short.strike - k1Long.strike;
                const netCost = k1Long.premio - k2Short.premio;

                /**
                 * FILTROS DE REALIDADE DE MERCADO:
                 * 1. Custo Positivo: Garante que a operação é de débito.
                 * 2. Limite de Custo: Se o custo for > 80% da largura, o potencial de lucro 
                 * é muito baixo para o risco assumido (frequentemente causado por spreads largos no book).
                 */
                if (netCost <= 0.02 || netCost >= (width * 0.80)) continue;

                const maxLoss = netCost;
                const maxProfit = width - netCost;
                const roi = maxLoss > 0 ? (maxProfit / maxLoss) : 0;
                
                // Ponto de Equilíbrio: Strike da compra + custo pago
                const breakeven = k1Long.strike + netCost;

                // --- Cálculo de Gregas Net (Posição Consolidada) ---
                const greeks: Greeks = {
                    delta: k1Long.gregas_unitarias.delta - k2Short.gregas_unitarias.delta,
                    gamma: k1Long.gregas_unitarias.gamma - k2Short.gregas_unitarias.gamma,
                    theta: k1Long.gregas_unitarias.theta - k2Short.gregas_unitarias.theta,
                    vega: k1Long.gregas_unitarias.vega - k2Short.gregas_unitarias.vega,
                };

                // 3. Estruturação do Resultado para o Frontend
                results.push({
                    name: this.name,
                    asset: k1Long.ativo_subjacente,
                    spread_type: 'VERTICAL CALL SPREAD',
                    expiration: k1Long.vencimento,
                    dias_uteis: k1Long.dias_uteis ?? 0,
                    strike_description: `C:${k1Long.strike.toFixed(2)} / V:${k2Short.strike.toFixed(2)}`,
                    asset_price: assetPrice,
                    net_premium: -netCost, // Negativo para indicar saída de caixa
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
        return 'Estratégia de Alta (Bullish) a débito. Permite participar da alta do ativo com custo reduzido e risco controlado, limitando o prejuízo máximo ao valor pago na montagem.';
    }

    getLegCount(): number { return 2; }
}