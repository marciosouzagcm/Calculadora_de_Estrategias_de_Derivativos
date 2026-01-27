import { IStrategy } from '../interfaces/IStrategy.js';
import { 
    Greeks, 
    NaturezaOperacao, 
    OptionLeg, 
    StrategyMetrics 
} from '../interfaces/Types.js';

function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'COMPRA' ? '[C]' : '[V]';
    return `${action} ${leg.option_ticker} (${typeInitial}) K:${strike.toFixed(2)} Exp:${leg.vencimento}`;
}

/**
 * CLASSE: ShortPutDiagonal (Diagonal de Baixa com Put)
 * FUNCIONALIDADE: Venda de Put Front-Month (vencimento curto) ITM e 
 * compra de Put Back-Month (vencimento longo) OTM.
 */
export class ShortPutDiagonal implements IStrategy {
    public readonly name: string = 'Short Put Diagonal';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'BAIXA';

    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];
        
        // Filtro: Apenas PUTS válidas
        const puts = allOptions.filter(leg => leg.tipo === 'PUT' && leg.strike > 0 && leg.premio > 0);

        for (let i = 0; i < puts.length; i++) {
            for (let j = 0; j < puts.length; j++) {
                const longLeg = puts[i];  // Comprada (Back Month)
                const shortLeg = puts[j]; // Vendida (Front Month)

                // REGRAS DA ESTRATÉGIA:
                // 1. Vencimento: Comprada (Long) > Vendida (Short)
                // 2. Strikes: Vendida (ITM/ATM) > Comprada (OTM)
                if (new Date(longLeg.vencimento) <= new Date(shortLeg.vencimento)) continue;
                if (shortLeg.strike <= longLeg.strike) continue;

                // Fluxo de caixa inicial (Geralmente crédito, pois a vendida é ITM)
                const netCredit = shortLeg.premio - longLeg.premio;
                if (netCredit <= 0.05) continue; // Filtro de liquidez mínima

                // Cálculo de Risco e Lucro (Estimados para estratégias horizontais/diagonais)
                // O lucro máximo ocorre se o ativo cair até o strike da comprada no vencimento da curta
                const estimatedLongValueAtExpiry = longLeg.premio * 1.2; // Estimativa de valorização da OTM
                const maxProfit = netCredit + estimatedLongValueAtExpiry;
                const maxLoss = (shortLeg.strike - longLeg.strike) - netCredit;

                const greeks: Greeks = {
                    delta: (longLeg.gregas_unitarias.delta) - shortLeg.gregas_unitarias.delta,
                    gamma: (longLeg.gregas_unitarias.gamma) - shortLeg.gregas_unitarias.gamma,
                    theta: (longLeg.gregas_unitarias.theta) - shortLeg.gregas_unitarias.theta,
                    vega: (longLeg.gregas_unitarias.vega) - shortLeg.gregas_unitarias.vega,
                };

                results.push({
                    name: this.name,
                    asset: longLeg.ativo_subjacente,
                    spread_type: 'DIAGONAL PUT SPREAD',
                    expiration: `${shortLeg.vencimento} / ${longLeg.vencimento}`,
                    dias_uteis: shortLeg.dias_uteis ?? 0,
                    strike_description: `V:${shortLeg.strike.toFixed(2)} (ITM) / C:${longLeg.strike.toFixed(2)} (OTM)`,
                    asset_price: assetPrice,
                    net_premium: netCredit,
                    initialCashFlow: netCredit,
                    natureza: 'CRÉDITO' as NaturezaOperacao,
                    risco_maximo: maxLoss,
                    lucro_maximo: maxProfit,
                    max_profit: maxProfit,
                    max_loss: -maxLoss,
                    breakEvenPoints: [Number((shortLeg.strike - netCredit).toFixed(2))],
                    width: shortLeg.strike - longLeg.strike,
                    roi: maxLoss > 0 ? (maxProfit / maxLoss) : 0,
                    greeks: greeks,
                    pernas: [
                        { 
                            derivative: shortLeg, 
                            direction: 'VENDA', 
                            multiplier: 1, 
                            display: generateDisplay(shortLeg, 'VENDA', shortLeg.strike) 
                        },
                        { 
                            derivative: longLeg, 
                            direction: 'COMPRA', 
                            multiplier: 1, 
                            display: generateDisplay(longLeg, 'COMPRA', longLeg.strike) 
                        }
                    ]
                } as StrategyMetrics);
            }
        }
        return results;
    }

    getDescription(): string {
        return 'Venda de Put ITM de curto prazo e compra de Put OTM de longo prazo. Estratégia diagonal que busca lucro na queda do ativo e no decaimento temporal superior da ponta vendida.';
    }

    getLegCount(): number { return 2; }
}