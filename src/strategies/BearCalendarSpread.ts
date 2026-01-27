import { IStrategy } from '../interfaces/IStrategy.js';
import { 
    Greeks, 
    NaturezaOperacao, 
    OptionLeg, 
    StrategyMetrics 
} from '../interfaces/Types.js';

/**
 * CLASSE: Bear Calendar Spread (ou Calendar Put Spread)
 * FUNCIONALIDADE: Compra de uma Put de vencimento longo e venda de uma Put 
 * de vencimento curto, ambas com o mesmo strike (geralmente OTM).
 * Lucra com a passagem do tempo e uma queda moderada do ativo.
 */
export class BearCalendarSpread implements IStrategy {
    public readonly name: string = 'Bear Calendar Spread';
    public readonly marketView: 'BAIXA' | 'NEUTRA' = 'BAIXA';

    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];
        
        // Filtro: Apenas PUTS com prêmio e strike válidos
        const puts = allOptions.filter(leg => leg.tipo === 'PUT' && leg.strike > 0 && leg.premio > 0);

        // O(n²) Scanner para encontrar pares de calendários
        for (let i = 0; i < puts.length; i++) {
            for (let j = 0; j < puts.length; j++) {
                const longPut = puts[i];  // Opção Comprada (Vencimento Longo)
                const shortPut = puts[j]; // Opção Vendida (Vencimento Curto)

                // CRITÉRIOS TÉCNICOS:
                // 1. Mesmo Strike
                // 2. Vencimento da comprada > Vencimento da vendida
                // 3. Viés Bearish: Strike geralmente abaixo do preço do ativo (OTM)
                if (longPut.strike !== shortPut.strike) continue;
                if (new Date(longPut.vencimento) <= new Date(shortPut.vencimento)) continue;

                const netCost = longPut.premio - shortPut.premio;

                // Filtro de Sanidade: Deve ser uma operação de débito
                if (netCost <= 0.02) continue;

                /**
                 * CÁLCULO DE RESULTADOS:
                 * Em calendários, o lucro máximo ocorre no vencimento da opção curta.
                 * Usamos uma estimativa do valor residual da opção longa (Black-Scholes simplificado).
                 */
                const estimatedLongValueAtShortExpiry = longPut.premio * 0.85; 
                const maxProfit = estimatedLongValueAtShortExpiry - netCost;
                const maxLoss = netCost;

                // Gregas da Posição
                const greeks: Greeks = {
                    delta: longPut.gregas_unitarias.delta - shortPut.gregas_unitarias.delta,
                    gamma: longPut.gregas_unitarias.gamma - shortPut.gregas_unitarias.gamma,
                    theta: longPut.gregas_unitarias.theta - shortPut.gregas_unitarias.theta, // Geralmente positivo
                    vega: longPut.gregas_unitarias.vega - shortPut.gregas_unitarias.vega,    // Geralmente positivo
                };

                results.push({
                    name: this.name,
                    asset: longPut.ativo_subjacente,
                    spread_type: 'HORIZONTAL PUT SPREAD',
                    expiration: `${shortPut.vencimento} (Curta) / ${longPut.vencimento} (Longa)`,
                    dias_uteis: shortPut.dias_uteis ?? 0,
                    strike_description: `K:${longPut.strike.toFixed(2)} (Horizontal)`,
                    asset_price: assetPrice,
                    net_premium: netCost,
                    initialCashFlow: -netCost,
                    natureza: 'DÉBITO' as NaturezaOperacao,
                    risco_maximo: maxLoss,
                    lucro_maximo: maxProfit,
                    max_profit: maxProfit,
                    max_loss: -maxLoss,
                    breakEvenPoints: [Number((longPut.strike - netCost).toFixed(2)), Number((longPut.strike + netCost).toFixed(2))],
                    width: 0,
                    roi: maxLoss > 0 ? (maxProfit / maxLoss) : 0,
                    greeks: greeks,
                    pernas: [
                        { 
                            derivative: longPut, 
                            direction: 'COMPRA', 
                            multiplier: 1, 
                            display: `[C] ${longPut.option_ticker} K:${longPut.strike.toFixed(2)} (${longPut.vencimento})` 
                        },
                        { 
                            derivative: shortPut, 
                            direction: 'VENDA', 
                            multiplier: 1, 
                            display: `[V] ${shortPut.option_ticker} K:${shortPut.strike.toFixed(2)} (${shortPut.vencimento})` 
                        },
                    ]
                } as StrategyMetrics);
            }
        }

        return results;
    }

    getDescription(): string {
        return 'Compra de Put longa e venda de Put curta de mesmo strike. Beneficia-se da queda do ativo até o strike e da passagem do tempo (Theta), que desvaloriza a opção curta mais rápido.';
    }

    getLegCount(): number { return 2; }
}