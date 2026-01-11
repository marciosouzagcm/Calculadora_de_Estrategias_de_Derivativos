import { OptionLeg, StrategyMetrics, StrategyLeg } from '../interfaces/Types';
import { IStrategy } from '../interfaces/IStrategy';

export class CallRatioSpread implements IStrategy {
    public name = "Booster (Call Ratio Spread)";
    public marketView: "ALTA" | "BAIXA" | "NEUTRA" | "VOLÁTIL" = "ALTA";

    public calculateMetrics(options: OptionLeg[], spotPrice: number, fee: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];
        const calls = options.filter(o => o.tipo === 'CALL').sort((a, b) => a.strike - b.strike);

        for (let i = 0; i < calls.length; i++) {
            for (let j = i + 1; j < calls.length; j++) {
                const buyLeg = calls[i];  
                const sellLeg = calls[j]; 

                const netPremium = buyLeg.premio - (sellLeg.premio * 2);
                
                // Filtro: Ratio Spreads não devem custar uma fortuna
                if (netPremium > buyLeg.strike * 0.15) continue; 

                const maxProfit = (sellLeg.strike - buyLeg.strike) - netPremium;
                const breakEven = sellLeg.strike + maxProfit;

                results.push({
                    name: this.name,
                    asset: buyLeg.ativo_subjacente,
                    asset_price: spotPrice,
                    strike_description: `${buyLeg.strike} / 2x ${sellLeg.strike}`,
                    net_premium: netPremium,
                    initialCashFlow: netPremium,
                    natureza: netPremium <= 0 ? 'CRÉDITO' : 'DÉBITO',
                    max_profit: maxProfit,
                    max_loss: 'Ilimitado',
                    lucro_maximo: maxProfit,
                    risco_maximo: 'Ilimitado',
                    breakEvenPoints: [buyLeg.strike + netPremium, breakEven],
                    greeks: {
                        delta: buyLeg.gregas_unitarias.delta - (sellLeg.gregas_unitarias.delta * 2),
                        gamma: buyLeg.gregas_unitarias.gamma - (sellLeg.gregas_unitarias.gamma * 2),
                        theta: buyLeg.gregas_unitarias.theta - (sellLeg.gregas_unitarias.theta * 2),
                        vega: buyLeg.gregas_unitarias.vega - (sellLeg.gregas_unitarias.vega * 2)
                    },
                    pernas: [
                        { direction: 'COMPRA', multiplier: 1, derivative: buyLeg, display: `C ${buyLeg.strike}` },
                        { direction: 'VENDA', multiplier: 2, derivative: sellLeg, display: `V 2x ${sellLeg.strike}` }
                    ]
                });
            }
        }
        return results;
    }
}