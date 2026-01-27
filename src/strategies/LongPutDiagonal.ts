import { IStrategy } from '../interfaces/IStrategy.js';
import { 
    Greeks, 
    NaturezaOperacao, 
    OptionLeg, 
    StrategyMetrics 
} from '../interfaces/Types.js';

function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number): string {
    const typeInitial = leg.tipo === 'PUT' ? 'P' : 'C';
    const action = direction === 'COMPRA' ? '[C]' : '[V]';
    return `${action} ${leg.option_ticker} (${typeInitial}) K:${strike.toFixed(2)} Exp:${leg.vencimento}`;
}

/**
 * CLASSE: LongPutDiagonal
 * FUNCIONALIDADE: Compra de uma PUT ITM (vencimento longo) e venda de uma PUT OTM (vencimento curto).
 * Visão de mercado: Baixa moderada ou queda com aumento de volatilidade.
 */
export class LongPutDiagonal implements IStrategy {
    public readonly name: string = 'Long Put Diagonal (Diagonal de Baixa)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'BAIXA';

    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];
        
        // Filtro: Apenas PUTS com prêmio e strikes positivos
        const puts = allOptions.filter(leg => leg.tipo === 'PUT' && leg.strike > 0 && leg.premio > 0);

        for (let i = 0; i < puts.length; i++) {
            for (let j = 0; j < puts.length; j++) {
                const longLeg = puts[i];  // Put Comprada (Back Month)
                const shortLeg = puts[j]; // Put Vendida (Front Month)

                // CRITÉRIOS TÉCNICOS:
                // 1. Vencimento da comprada deve ser MAIOR que a vendida (Diagonal)
                // 2. Strike da comprada deve ser MAIOR que o da vendida (Compra ITM/Venda OTM para Put)
                if (new Date(longLeg.vencimento) <= new Date(shortLeg.vencimento)) continue;
                if (longLeg.strike <= shortLeg.strike) continue;

                const netPremium = longLeg.premio - shortLeg.premio;

                // Filtro de sanidade: Operação tipicamente de Débito
                if (netPremium <= 0.05) continue;

                // Estimativa de valor residual da ponta longa no vencimento da curta
                const estimatedLongValue = longLeg.premio * 0.85; 
                const maxProfit = (longLeg.strike - shortLeg.strike) + shortLeg.premio - (longLeg.premio - estimatedLongValue);
                const maxLoss = netPremium;

                const greeks: Greeks = {
                    delta: longLeg.gregas_unitarias.delta - shortLeg.gregas_unitarias.delta,
                    gamma: longLeg.gregas_unitarias.gamma - shortLeg.gregas_unitarias.gamma,
                    theta: longLeg.gregas_unitarias.theta - shortLeg.gregas_unitarias.theta,
                    vega: longLeg.gregas_unitarias.vega - shortLeg.gregas_unitarias.vega,
                };

                results.push({
                    name: this.name,
                    asset: longLeg.ativo_subjacente,
                    spread_type: 'DIAGONAL PUT SPREAD',
                    expiration: `${shortLeg.vencimento} / ${longLeg.vencimento}`,
                    dias_uteis: shortLeg.dias_uteis ?? 0,
                    strike_description: `C:${longLeg.strike.toFixed(2)} / V:${shortLeg.strike.toFixed(2)}`,
                    asset_price: assetPrice,
                    net_premium: netPremium,
                    initialCashFlow: -netPremium,
                    natureza: 'DÉBITO' as NaturezaOperacao,
                    risco_maximo: maxLoss,
                    lucro_maximo: maxProfit,
                    max_profit: maxProfit,
                    max_loss: -maxLoss,
                    breakEvenPoints: [Number((longLeg.strike - netPremium).toFixed(2))],
                    width: longLeg.strike - shortLeg.strike,
                    roi: maxLoss > 0 ? (maxProfit / maxLoss) : 0,
                    greeks: greeks,
                    pernas: [
                        { 
                            derivative: longLeg, 
                            direction: 'COMPRA', 
                            multiplier: 1, 
                            display: generateDisplay(longLeg, 'COMPRA', longLeg.strike) 
                        },
                        { 
                            derivative: shortLeg, 
                            direction: 'VENDA', 
                            multiplier: 1, 
                            display: generateDisplay(shortLeg, 'VENDA', shortLeg.strike) 
                        },
                    ]
                } as StrategyMetrics);
            }
        }
        return results;
    }

    getDescription(): string {
        return 'Estratégia diagonal de débito utilizando Puts. Envolve a compra de uma Put ITM de longo prazo e a venda de uma Put OTM de curto prazo. Lucra com a queda do ativo e a erosão do prêmio da opção curta.';
    }

    getLegCount(): number { return 2; }
}