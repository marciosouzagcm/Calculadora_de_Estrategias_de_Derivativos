import { IStrategy } from '../interfaces/IStrategy.js';
import { OptionLeg, StrategyMetrics, Greeks } from '../interfaces/Types.js';

/**
 * BOARDPRO V40.1 - Vertical Spread Base
 * Gerencia Travas de Alta e Baixa (Débito e Crédito) para Call e Put.
 */
export abstract class VerticalSpreadBase implements IStrategy {
    abstract name: string;
    abstract isBull: boolean;
    abstract type: 'CALL' | 'PUT';
    public marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'ALTA';

    calculateMetrics(allOptions: OptionLeg[], spotPrice: number, feePerLeg: number): StrategyMetrics[] {
        this.marketView = this.isBull ? 'ALTA' : 'BAIXA';
        const results: StrategyMetrics[] = [];

        // Filtro rigoroso para garantir integridade dos dados
        const filteredOptions = allOptions.filter(o => 
            o.tipo === this.type && 
            o.strike !== null && 
            !isNaN(Number(o.strike)) &&
            o.premio > 0 // Evita opções sem cotação
        );

        for (let i = 0; i < filteredOptions.length; i++) {
            for (let j = 0; j < filteredOptions.length; j++) {
                if (i === j) continue;

                const optA = filteredOptions[i];
                const optB = filteredOptions[j];

                // Garante que ambas as pernas são do mesmo vencimento (Trava Vertical)
                if (String(optA.vencimento).split('T')[0] !== String(optB.vencimento).split('T')[0]) continue;

                let buyLeg: OptionLeg, sellLeg: OptionLeg;

                // Define a estrutura lógica: Bull Spread vs Bear Spread
                if (this.isBull) {
                    if (optA.strike! < optB.strike!) { buyLeg = optA; sellLeg = optB; } else continue;
                } else {
                    if (optA.strike! > optB.strike!) { buyLeg = optA; sellLeg = optB; } else continue;
                }

                const cost = buyLeg.premio - sellLeg.premio;
                const strikeDiff = Math.abs(sellLeg.strike! - buyLeg.strike!);
                
                let maxProfit = 0;
                let maxLoss = 0;
                let be = 0;

                // Lógica de Travas de Débito (Call Bull / Put Bear)
                if (cost > 0) {
                    maxProfit = strikeDiff - cost;
                    maxLoss = cost;
                    // Break-even: Strike da ponta comprada +/- custo
                    be = this.type === 'CALL' ? buyLeg.strike! + cost : buyLeg.strike! - cost;
                } 
                // Lógica de Travas de Crédito (Call Bear / Put Bull)
                else {
                    const creditReceived = Math.abs(cost);
                    maxProfit = creditReceived;
                    maxLoss = strikeDiff - creditReceived;
                    // Break-even: Strike da ponta vendida +/- crédito
                    be = this.type === 'CALL' ? sellLeg.strike! - creditReceived : sellLeg.strike! + creditReceived;
                }

                // Filtro de viabilidade operacional (ROI Mínimo)
                if (maxProfit <= 0.001 || maxLoss <= 0.001) continue;

                results.push({
                    name: this.name,
                    asset: buyLeg.ativo_subjacente,
                    asset_price: spotPrice,
                    spread_type: 'VERTICAL',
                    expiration: String(optA.vencimento).split('T')[0],
                    dias_uteis: buyLeg.dias_uteis || 0,
                    strike_description: `${buyLeg.strike!.toFixed(2)} / ${sellLeg.strike!.toFixed(2)}`,
                    
                    net_premium: -cost, 
                    initialCashFlow: -cost,
                    natureza: cost > 0 ? 'DÉBITO' : 'CRÉDITO',
                    max_profit: maxProfit,
                    max_loss: maxLoss,
                    lucro_maximo: maxProfit,
                    risco_maximo: maxLoss,
                    roi: maxLoss > 0 ? (maxProfit / maxLoss) : 0,
                    breakEvenPoints: [Number(be.toFixed(2))],
                    greeks: this.calculateNetGreeks(buyLeg, sellLeg),
                    pernas: [
                        { derivative: buyLeg, direction: 'COMPRA', multiplier: 1, display: `[C] ${buyLeg.option_ticker}` },
                        { derivative: sellLeg, direction: 'VENDA', multiplier: 1, display: `[V] ${sellLeg.option_ticker}` }
                    ]
                } as StrategyMetrics);
            }
        }
        return results;
    }

    private calculateNetGreeks(buy: OptionLeg, sell: OptionLeg): Greeks {
        const g1 = buy.gregas_unitarias || { delta: 0, gamma: 0, theta: 0, vega: 0 };
        const g2 = sell.gregas_unitarias || { delta: 0, gamma: 0, theta: 0, vega: 0 };
        return {
            delta: Number((g1.delta - g2.delta).toFixed(4)),
            gamma: Number((g1.gamma - g2.gamma).toFixed(4)),
            theta: Number((g1.theta - g2.theta).toFixed(4)),
            vega: Number((g1.vega - g2.vega).toFixed(4))
        };
    }

    getLegCount(): number { return 2; }
}

export class BullCallSpread extends VerticalSpreadBase { name = 'Trava de Alta (Call)'; isBull = true; type = 'CALL' as const; }
export class BearCallSpread extends VerticalSpreadBase { name = 'Trava de Baixa (Call)'; isBull = false; type = 'CALL' as const; }
export class BullPutSpread extends VerticalSpreadBase { name = 'Trava de Alta (Put)'; isBull = true; type = 'PUT' as const; }
export class BearPutSpread extends VerticalSpreadBase { name = 'Trava de Baixa (Put)'; isBull = false; type = 'PUT' as const; }