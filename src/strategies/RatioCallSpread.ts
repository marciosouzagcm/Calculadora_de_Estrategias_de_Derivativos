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

export class RatioCallSpread implements IStrategy {
    public readonly name: string = 'Ratio Call Spread (1x2)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'ALTA';

    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];
        const calls = allOptions
            .filter(leg => leg.tipo === 'CALL' && leg.strike > 0 && leg.premio > 0)
            .sort((a, b) => a.strike - b.strike);

        if (calls.length < 2) return [];

        for (let i = 0; i < calls.length; i++) {
            for (let j = i + 1; j < calls.length; j++) {
                const longLeg = calls[i];  // Strike Menor (Compra 1x)
                const shortLeg = calls[j]; // Strike Maior (Venda 2x)

                if (longLeg.vencimento !== shortLeg.vencimento) continue;

                // Na razão 1x2, vendemos o dobro para financiar
                const ratio = 2; 
                const netPremium = (shortLeg.premio * ratio) - longLeg.premio;
                
                // Cálculo de Lucro e Risco
                // Lucro Máximo ocorre exatamente no strike da ponta vendida
                const spreadWidth = shortLeg.strike - longLeg.strike;
                const maxProfit = spreadWidth + netPremium;
                
                // Risco: Como há uma ponta vendida a seco (2 vendidas para 1 comprada),
                // o risco é teoricamente ilimitado na alta explosiva.
                const breakevenAlta = shortLeg.strike + maxProfit;

                const greeks: Greeks = {
                    delta: longLeg.gregas_unitarias.delta - (shortLeg.gregas_unitarias.delta * ratio),
                    gamma: longLeg.gregas_unitarias.gamma - (shortLeg.gregas_unitarias.gamma * ratio),
                    theta: longLeg.gregas_unitarias.theta - (shortLeg.gregas_unitarias.theta * ratio),
                    vega: longLeg.gregas_unitarias.vega - (shortLeg.gregas_unitarias.vega * ratio),
                };

                results.push({
                    name: this.name,
                    asset: longLeg.ativo_subjacente,
                    spread_type: 'RATIO CALL SPREAD',
                    expiration: longLeg.vencimento,
                    dias_uteis: longLeg.dias_uteis ?? 0,
                    strike_description: `C1:${longLeg.strike.toFixed(2)} / V2:${shortLeg.strike.toFixed(2)}`,
                    asset_price: assetPrice,
                    net_premium: netPremium,
                    initialCashFlow: netPremium,
                    natureza: netPremium >= 0 ? 'CRÉDITO' : 'DÉBITO',
                    risco_maximo: 999999, // Risco ilimitado (venda a seco residual)
                    lucro_maximo: maxProfit,
                    max_profit: maxProfit,
                    max_loss: -999999,
                    breakEvenPoints: [Number(breakevenAlta.toFixed(2))],
                    width: spreadWidth,
                    roi: netPremium > 0 ? (maxProfit / Math.abs(netPremium)) : 0,
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
        return 'Compra de 1 Call ITM/ATM e venda de 2 Calls OTM. Busca lucrar com a alta moderada. Atenção: possui risco ilimitado em caso de alta explosiva do ativo.';
    }

    getLegCount(): number { return 2; }
}