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

export class LongCallDiagonal implements IStrategy {
    public readonly name: string = 'Long Call Diagonal (Diagonal de Alta)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'ALTA';

    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];
        
        // Filtra Calls com prêmio e strike válidos
        const calls = allOptions.filter(leg => leg.tipo === 'CALL' && leg.strike > 0 && leg.premio > 0);

        for (let i = 0; i < calls.length; i++) {
            for (let j = 0; j < calls.length; j++) {
                const longLeg = calls[i];  // Opção Comprada (Back Month)
                const shortLeg = calls[j]; // Opção Vendida (Front Month)

                // CRITÉRIOS DA ESTRATÉGIA:
                // 1. Vencimento da comprada deve ser MAIOR que a vendida
                // 2. Strike da comprada (ITM/ATM) deve ser MENOR que o da vendida (OTM)
                if (new Date(longLeg.vencimento) <= new Date(shortLeg.vencimento)) continue;
                if (longLeg.strike >= shortLeg.strike) continue;

                const netPremium = longLeg.premio - shortLeg.premio;

                // Filtro de sanidade: Deve ser uma operação de DÉBITO inicial
                if (netPremium <= 0) continue;

                // Em estratégias diagonais, o lucro máximo e breakeven dependem da estimativa 
                // do valor da opção longa no vencimento da curta (Black-Scholes).
                // Aqui usamos a estimativa intrínseca + prêmio residual simplificado.
                const estimatedLongValueAtExpiry = longLeg.premio * 0.8; // Simplificação para o Scanner
                const maxProfit = (shortLeg.strike - longLeg.strike) + shortLeg.premio + (estimatedLongValueAtExpiry - longLeg.premio);
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
                    spread_type: 'DIAGONAL CALL SPREAD',
                    expiration: `${shortLeg.vencimento} / ${longLeg.vencimento}`,
                    dias_uteis: shortLeg.dias_uteis ?? 0,
                    strike_description: `C:${longLeg.strike.toFixed(2)} (Long) / V:${shortLeg.strike.toFixed(2)} (Short)`,
                    asset_price: assetPrice,
                    net_premium: netPremium,
                    initialCashFlow: -netPremium,
                    natureza: 'DÉBITO' as NaturezaOperacao,
                    risco_maximo: maxLoss,
                    lucro_maximo: maxProfit,
                    max_profit: maxProfit,
                    max_loss: -maxLoss,
                    breakEvenPoints: [Number((longLeg.strike + netPremium).toFixed(2))], // PE Baixo aproximado
                    width: shortLeg.strike - longLeg.strike,
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
        return 'Compra de Call ITM para vencimento longo e venda de Call OTM para vencimento curto. Beneficia-se do passar do tempo (Time Decay) mais rápido na ponta vendida.';
    }

    getLegCount(): number { return 2; }
}