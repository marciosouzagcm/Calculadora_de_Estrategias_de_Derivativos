import { IStrategy } from '../interfaces/IStrategy.js';
import { 
    Greeks, 
    NaturezaOperacao, 
    OptionLeg, 
    StrategyMetrics 
} from '../interfaces/Types.js';

export class CoveredCall implements IStrategy {
    public readonly name: string = 'Lançamento Coberto (Covered Call)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA';

    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];
        
        // Filtra apenas CALLS OTM ou ATM (onde o lançamento faz mais sentido para renda)
        const calls = allOptions.filter(leg => leg.tipo === 'CALL' && leg.premio > 0);

        for (const call of calls) {
            // No Lançamento Coberto:
            // 1. Compra do Ativo (assetPrice)
            // 2. Venda da Call (call.premio)
            
            const netCost = assetPrice - call.premio;
            const maxProfit = (call.strike > assetPrice) 
                ? (call.strike - assetPrice) + call.premio 
                : call.premio;

            // O risco é a queda do ativo, mitigada pelo prêmio recebido
            const maxLoss = netCost; 
            const breakeven = assetPrice - call.premio;

            const greeks: Greeks = {
                delta: 1 - call.gregas_unitarias.delta, // 1 (do ativo) - delta da call vendida
                gamma: -call.gregas_unitarias.gamma,
                theta: -call.gregas_unitarias.theta, // Theta positivo para o lançador (ganha com o tempo)
                vega: -call.gregas_unitarias.vega,
            };

            results.push({
                name: this.name,
                asset: call.ativo_subjacente,
                spread_type: 'COVERED CALL',
                expiration: call.vencimento,
                dias_uteis: call.dias_uteis ?? 0,
                strike_description: `Ativo + V:${call.strike.toFixed(2)}`,
                asset_price: assetPrice,
                net_premium: call.premio,
                initialCashFlow: -netCost, // Desembolso para comprar o ativo menos o prêmio
                natureza: 'DÉBITO' as NaturezaOperacao,
                risco_maximo: maxLoss,
                lucro_maximo: maxProfit,
                max_profit: maxProfit,
                max_loss: -maxLoss,
                breakEvenPoints: [Number(breakeven.toFixed(2))],
                width: 0,
                roi: netCost > 0 ? (maxProfit / netCost) : 0,
                greeks: greeks,
                pernas: [
                    { 
                        derivative: call, 
                        direction: 'VENDA', 
                        multiplier: 1, 
                        display: `[V] ${call.option_ticker} K:${call.strike.toFixed(2)} (Hedged)` 
                    }
                ]
            } as StrategyMetrics);
        }

        return results;
    }

    getDescription(): string {
        return 'Consiste na compra do ativo subjacente e na venda simultânea de uma opção de compra (Call). Visa gerar renda e reduzir o preço médio de aquisição do ativo.';
    }

    getLegCount(): number { return 1; }
}