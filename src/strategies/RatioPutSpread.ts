import { IStrategy } from '../interfaces/IStrategy.js';
import { 
    Greeks, 
    NaturezaOperacao, 
    OptionLeg, 
    StrategyMetrics 
} from '../interfaces/Types.js';

function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number, qty: number): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'COMPRA' ? '[C]' : '[V]';
    return `${action} ${qty}x ${leg.option_ticker} (${typeInitial}) K:${strike.toFixed(2)}`;
}

export class RatioPutSpread implements IStrategy {
    public readonly name: string = 'Ratio Put Spread (1x2)';
    public readonly marketView: 'BAIXA' | 'NEUTRA' = 'BAIXA';

    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];
        
        // Filtro: Apenas PUTS, ordenadas por strike decrescente (do maior para o menor)
        const puts = allOptions
            .filter(leg => leg.tipo === 'PUT' && leg.strike > 0 && leg.premio > 0)
            .sort((a, b) => b.strike - a.strike);

        if (puts.length < 2) return [];

        for (let i = 0; i < puts.length; i++) {
            for (let j = i + 1; j < puts.length; j++) {
                const longLeg = puts[i];  // Strike Maior (Compra 1x)
                const shortLeg = puts[j]; // Strike Menor (Venda 2x)

                if (longLeg.vencimento !== shortLeg.vencimento) continue;

                const ratio = 2; 
                // Recebido pelas 2 vendas menos o pago pela 1 compra
                const netPremium = (shortLeg.premio * ratio) - longLeg.premio;
                
                const spreadWidth = longLeg.strike - shortLeg.strike;
                
                /**
                 * Lógica de Payoff:
                 * 1. Se o ativo ficar acima da longLeg: Lucro = netPremium (se crédito)
                 * 2. Se o ativo ficar no strike da shortLeg: Lucro Máximo = spreadWidth + netPremium
                 * 3. Se o ativo cair a zero: Risco substancial (Venda a seco de 1 Put residual)
                 */
                const maxProfit = spreadWidth + netPremium;
                const breakevenBaixa = shortLeg.strike - maxProfit;

                const greeks: Greeks = {
                    delta: longLeg.gregas_unitarias.delta - (shortLeg.gregas_unitarias.delta * ratio),
                    gamma: longLeg.gregas_unitarias.gamma - (shortLeg.gregas_unitarias.gamma * ratio),
                    theta: longLeg.gregas_unitarias.theta - (shortLeg.gregas_unitarias.theta * ratio),
                    vega: longLeg.gregas_unitarias.vega - (shortLeg.gregas_unitarias.vega * ratio),
                };

                results.push({
                    name: this.name,
                    asset: longLeg.ativo_subjacente,
                    spread_type: 'RATIO PUT SPREAD',
                    expiration: longLeg.vencimento,
                    dias_uteis: longLeg.dias_uteis ?? 0,
                    strike_description: `C1:${longLeg.strike.toFixed(2)} / V2:${shortLeg.strike.toFixed(2)}`,
                    asset_price: assetPrice,
                    net_premium: netPremium,
                    initialCashFlow: netPremium,
                    natureza: netPremium >= 0 ? 'CRÉDITO' : 'DÉBITO',
                    // Risco em Ratio Put é alto (o ativo pode ir a zero), diferente da Call que é infinito.
                    risco_maximo: shortLeg.strike - netPremium, 
                    lucro_maximo: maxProfit,
                    max_profit: maxProfit,
                    max_loss: -(shortLeg.strike - netPremium),
                    breakEvenPoints: [Number(breakevenBaixa.toFixed(2))],
                    width: spreadWidth,
                    roi: netPremium > 0 ? (maxProfit / Math.abs(shortLeg.strike)) : (maxProfit / Math.abs(netPremium)),
                    greeks: greeks,
                    pernas: [
                        { 
                            derivative: longLeg, 
                            direction: 'COMPRA', 
                            multiplier: 1, 
                            display: generateDisplay(longLeg, 'COMPRA', longLeg.strike, 1) 
                        },
                        { 
                            derivative: shortLeg, 
                            direction: 'VENDA', 
                            multiplier: ratio, 
                            display: generateDisplay(shortLeg, 'VENDA', shortLeg.strike, ratio) 
                        },
                    ]
                } as StrategyMetrics);
            }
        }

        return results;
    }

    getDescription(): string {
        return 'Compra de 1 Put e venda de 2 Puts de strike inferior. Busca lucrar com a queda moderada ou estabilidade. Possui risco significativo em quedas acentuadas (crash).';
    }

    getLegCount(): number { return 2; }
}