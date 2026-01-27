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
    return `${action} ${leg.option_ticker} (${typeInitial}) K:${strike.toFixed(2)}`;
}

/**
 * CLASSE: BoxSpread (Arbitragem de 4 Pontas)
 * FUNCIONALIDADE: Combina uma Trava de Alta com Call e uma Trava de Baixa com Put.
 * O objetivo é capturar distorções de preço onde o custo total é menor que a largura do spread.
 */
export class BoxSpread implements IStrategy {
    public readonly name: string = 'Box Spread (Arbitragem)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA';

    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];
        
        // Separação de Calls e Puts por vencimento para otimizar o scanner
        const calls = allOptions.filter(leg => leg.tipo === 'CALL' && leg.strike > 0 && leg.premio > 0);
        const puts = allOptions.filter(leg => leg.tipo === 'PUT' && leg.strike > 0 && leg.premio > 0);

        // Agrupar por vencimento
        const expDates = [...new Set(calls.map(c => c.vencimento))];

        for (const exp of expDates) {
            const callsInExp = calls.filter(c => c.vencimento === exp).sort((a, b) => a.strike - b.strike);
            const putsInExp = puts.filter(p => p.vencimento === exp).sort((a, b) => a.strike - b.strike);

            if (callsInExp.length < 2 || putsInExp.length < 2) continue;

            for (let i = 0; i < callsInExp.length; i++) {
                for (let j = i + 1; j < callsInExp.length; j++) {
                    const kLow = callsInExp[i].strike;
                    const kHigh = callsInExp[j].strike;

                    // Busca as Puts correspondentes aos mesmos strikes
                    const pLow = putsInExp.find(p => p.strike === kLow);
                    const pHigh = putsInExp.find(p => p.strike === kHigh);

                    if (!pLow || !pHigh) continue;

                    // COMPOSIÇÃO DO BOX:
                    // 1. Bull Call Spread: Compra K_Low, Vende K_High
                    // 2. Bear Put Spread: Compra K_High, Vende K_Low
                    const callLegLow = callsInExp[i];  // Compra
                    const callLegHigh = callsInExp[j]; // Venda
                    const putLegHigh = pHigh;          // Compra
                    const putLegLow = pLow;            // Venda

                    const netCost = (callLegLow.premio - callLegHigh.premio) + (putLegHigh.premio - putLegLow.premio);
                    const width = kHigh - kLow;

                    // Arbitragem: O lucro ocorre se o custo for menor que a largura (width)
                    const maxProfit = width - netCost;
                    
                    // Em um Box Spread perfeito, o risco é o custo não ser recuperado (spread negativo)
                    // No scanner, filtramos apenas os que fazem sentido financeiro
                    if (maxProfit <= 0.01) continue;

                    // Gregas no Box Spread tendem a ser próximas de zero (Delta Neutral)
                    const greeks: Greeks = {
                        delta: (callLegLow.gregas_unitarias.delta - callLegHigh.gregas_unitarias.delta) + 
                               (putLegHigh.gregas_unitarias.delta - putLegLow.gregas_unitarias.delta),
                        gamma: (callLegLow.gregas_unitarias.gamma - callLegHigh.gregas_unitarias.gamma) + 
                               (putLegHigh.gregas_unitarias.gamma - putLegLow.gregas_unitarias.gamma),
                        theta: (callLegLow.gregas_unitarias.theta - callLegHigh.gregas_unitarias.theta) + 
                               (putLegHigh.gregas_unitarias.theta - putLegLow.gregas_unitarias.theta),
                        vega:  (callLegLow.gregas_unitarias.vega - callLegHigh.gregas_unitarias.vega) + 
                               (putLegHigh.gregas_unitarias.vega - putLegLow.gregas_unitarias.vega),
                    };

                    results.push({
                        name: this.name,
                        asset: callLegLow.ativo_subjacente,
                        spread_type: 'BOX ARBITRAGE',
                        expiration: exp,
                        dias_uteis: callLegLow.dias_uteis ?? 0,
                        strike_description: `Strikes: ${kLow.toFixed(2)} e ${kHigh.toFixed(2)}`,
                        asset_price: assetPrice,
                        net_premium: netCost,
                        initialCashFlow: -netCost,
                        natureza: 'DÉBITO' as NaturezaOperacao,
                        risco_maximo: netCost > width ? netCost - width : 0,
                        lucro_maximo: maxProfit,
                        max_profit: maxProfit,
                        max_loss: netCost > width ? -(netCost - width) : 0,
                        breakEvenPoints: [], // Não há breakeven, o lucro é constante
                        width: width,
                        roi: netCost > 0 ? (maxProfit / netCost) : 0,
                        greeks: greeks,
                        pernas: [
                            { derivative: callLegLow, direction: 'COMPRA', multiplier: 1, display: generateDisplay(callLegLow, 'COMPRA', kLow) },
                            { derivative: callLegHigh, direction: 'VENDA', multiplier: 1, display: generateDisplay(callLegHigh, 'VENDA', kHigh) },
                            { derivative: putLegHigh, direction: 'COMPRA', multiplier: 1, display: generateDisplay(putLegHigh, 'COMPRA', kHigh) },
                            { derivative: putLegLow, direction: 'VENDA', multiplier: 1, display: generateDisplay(putLegLow, 'VENDA', kLow) }
                        ]
                    } as StrategyMetrics);
                }
            }
        }
        return results;
    }

    getDescription(): string {
        return 'Estratégia de arbitragem sintética que garante um retorno fixo no vencimento. Combina travas de alta e baixa com os mesmos strikes para eliminar o risco direcional.';
    }

    getLegCount(): number { return 4; }
}