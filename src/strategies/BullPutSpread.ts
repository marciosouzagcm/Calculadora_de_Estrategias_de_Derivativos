import { IStrategy } from '../interfaces/IStrategy.js';
import { 
    Greeks, 
    NaturezaOperacao, 
    OptionLeg, 
    StrategyMetrics 
} from '../interfaces/Types.js';

/**
 * Helper: Gera a string de exibição para as pernas da estratégia.
 * Exemplo de saída: [V] PETRA28 (P) K:28.00
 */
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'COMPRA' ? '[C]' : '[V]';
    return `${action} ${leg.option_ticker} (${typeInitial}) K:${strike.toFixed(2)}`;
}

/**
 * CLASSE: BullPutSpread (Trava de Alta com Put)
 * FUNCIONALIDADE: Identifica oportunidades de venda de uma PUT de strike maior (ITM/ATM)
 * combinada com a compra de uma PUT de strike menor (OTM) para limitar o risco.
 * OBJETIVO: Receber um crédito líquido e lucrar se o ativo permanecer acima do Breakeven.
 */
export class BullPutSpread implements IStrategy {
    
    public readonly name: string = 'Trava de Alta (Put)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'ALTA'; 
    
    /**
     * Scanner: Busca e calcula todas as combinações de Bull Put Spread.
     */
    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];

        // 1. Filtro Inicial: Apenas PUTS com strikes e prêmios válidos.
        // Ordenação decrescente: K1 (Strike Maior) aparece primeiro.
        const puts = allOptions
            .filter(leg => leg.tipo === 'PUT' && leg.strike > 0 && leg.premio > 0)
            .sort((a, b) => b.strike - a.strike);

        if (puts.length < 2) return [];

        // 2. Scanner de Combinações (O(n²))
        for (let i = 0; i < puts.length; i++) {
            for (let j = i + 1; j < puts.length; j++) {
                const k1Short = puts[i]; // Strike Alto = Vendida (Mais ITM/ATM)
                const k2Long = puts[j];  // Strike Baixo = Comprada (Mais OTM)

                // Validação: Mesma série/vencimento
                if (k1Short.vencimento !== k2Long.vencimento) continue;

                // --- Cálculo Financeiro (CRÉDITO) ---
                const width = k1Short.strike - k2Long.strike;
                const netCredit = k1Short.premio - k2Long.premio;

                /**
                 * FILTROS DE SANIDADE:
                 * 1. Crédito Positivo: Garante que estamos recebendo prêmio na montagem.
                 * 2. Limite de Crédito: Se o crédito for > 85% da largura, o risco é desproporcional
                 * ou os dados de book estão travados/sem liquidez.
                 */
                if (netCredit <= 0.02 || netCredit >= (width * 0.85)) continue;

                const maxProfit = netCredit;
                const maxLoss = width - netCredit;
                const roi = maxLoss > 0 ? (maxProfit / maxLoss) : 0;
                
                // Ponto de Equilíbrio: Strike da Venda - Crédito Recebido
                const breakeven = k1Short.strike - netCredit;

                // --- Cálculo de Gregas Net (Venda inverte sinal unitário) ---
                const greeks: Greeks = {
                    delta: (k1Short.gregas_unitarias.delta * -1) + k2Long.gregas_unitarias.delta,
                    gamma: (k1Short.gregas_unitarias.gamma * -1) + k2Long.gregas_unitarias.gamma,
                    theta: (k1Short.gregas_unitarias.theta * -1) + k2Long.gregas_unitarias.theta,
                    vega: (k1Short.gregas_unitarias.vega * -1) + k2Long.gregas_unitarias.vega,
                };

                // 3. Estruturação para retorno
                results.push({
                    name: this.name,
                    asset: k1Short.ativo_subjacente,
                    spread_type: 'VERTICAL PUT SPREAD',
                    expiration: k1Short.vencimento,
                    dias_uteis: k1Short.dias_uteis ?? 0,
                    strike_description: `V:${k1Short.strike.toFixed(2)} / C:${k2Long.strike.toFixed(2)}`,
                    asset_price: assetPrice,
                    net_premium: netCredit, // Crédito positivo (entrada de caixa)
                    initialCashFlow: netCredit,
                    natureza: 'CRÉDITO' as NaturezaOperacao,
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
                            derivative: k1Short, 
                            direction: 'VENDA', 
                            multiplier: 1, 
                            display: generateDisplay(k1Short, 'VENDA', k1Short.strike) 
                        },
                        { 
                            derivative: k2Long, 
                            direction: 'COMPRA', 
                            multiplier: 1, 
                            display: generateDisplay(k2Long, 'COMPRA', k2Long.strike) 
                        },
                    ]
                } as StrategyMetrics);
            }
        }

        return results;
    }

    getDescription(): string {
        return 'Estratégia de Alta ou Lateral (Bullish/Neutral) a crédito. Envolve a venda de uma Put mais cara e compra de uma Put mais barata para limitar as perdas em caso de queda acentuada do ativo.';
    }

    getLegCount(): number { return 2; }
}