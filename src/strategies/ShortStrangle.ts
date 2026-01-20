import { IStrategy } from '../interfaces/IStrategy.js';
import { 
    Greeks, 
    NaturezaOperacao, 
    OptionLeg, 
    StrategyMetrics 
} from '../interfaces/Types.js';

/**
 * Helper: Gera a string de exibição para as pernas da Venda de Strangle.
 */
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'VENDA' ? '[V]' : '[C]';
    return `${action} ${leg.option_ticker} (${typeInitial}) K:${strike.toFixed(2)}`;
}

/**
 * CLASSE: Short Strangle (Venda de Volatilidade OTM)
 * FUNCIONALIDADE: Venda de uma PUT (K menor) e uma CALL (K maior) ambas OTM.
 * OBJETIVO: Coletar prêmio através do decaimento temporal (Theta) em um mercado lateral.
 * RISCO: Ilimitado em caso de grandes gaps ou tendências fortes de alta ou baixa.
 */
export class ShortStrangle implements IStrategy {
    public readonly name: string = 'Short Strangle (Venda)';
    public readonly marketView: 'NEUTRA' = 'NEUTRA';

    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];

        // 1. Filtragem Inicial: Separar Puts e Calls válidas e com prêmio
        const puts = allOptions.filter(l => l.tipo === 'PUT' && l.strike! < assetPrice && l.premio > 0);
        const calls = allOptions.filter(l => l.tipo === 'CALL' && l.strike! > assetPrice && l.premio > 0);

        if (puts.length === 0 || calls.length === 0) return [];

        // 2. Scanner de combinações O(n*m)
        for (const putLeg of puts) {
            for (const callLeg of calls) {
                
                // Validação de Vencimento Único
                const datePut = String(putLeg.vencimento).split(/[T ]/)[0];
                const dateCall = String(callLeg.vencimento).split(/[T ]/)[0];
                if (datePut !== dateCall) continue;

                const K_Put = putLeg.strike!;
                const K_Call = callLeg.strike!;

                // Garantia de estrutura: Put abaixo da Call (No Strangle vendido, isso cria o "platô" de lucro)
                if (K_Put >= K_Call) continue;

                // --- Cálculo Financeiro (CRÉDITO) ---
                const netCredit = putLeg.premio + callLeg.premio;
                
                // Filtro de liquidez: Evita montar com opções de 0.01
                if (netCredit <= 0.05) continue;

                const breakevenLow = K_Put - netCredit;
                const breakevenHigh = K_Call + netCredit;

                /**
                 * MARGEM E ROI:
                 * No Brasil, a margem de venda a descoberto é complexa, 
                 * mas 15% do valor do ativo é uma estimativa comum para o cálculo de ROI.
                 */
                const estimatedMargin = assetPrice * 0.15;
                const roi = netCredit / estimatedMargin;

                // --- Cálculo das Gregas Net (SINAIS INVERTIDOS) ---
                const getG = (l: OptionLeg) => l.gregas_unitarias || { delta: 0, gamma: 0, theta: 0, vega: 0 };
                const gP = getG(putLeg);
                const gC = getG(callLeg);

                const netGreeks: Greeks = {
                    // Na venda, subtraímos as gregas para inverter a exposição
                    delta: Number((-(gC.delta + gP.delta)).toFixed(4)),
                    gamma: Number((-(gC.gamma + gP.gamma)).toFixed(4)),
                    theta: Number((-(gC.theta + gP.theta)).toFixed(4)), // Theta positivo = ganha com o tempo
                    vega: Number((-(gC.vega + gP.vega)).toFixed(4)),   // Vega negativo = prejudicado por alta de Vol
                };

                results.push({
                    name: this.name,
                    asset: callLeg.ativo_subjacente,
                    asset_price: assetPrice,
                    spread_type: 'SHORT STRANGLE',
                    expiration: datePut,
                    dias_uteis: callLeg.dias_uteis || 0,
                    strike_description: `P:${K_Put.toFixed(2)} | C:${K_Call.toFixed(2)}`,
                    net_premium: Number(netCredit.toFixed(2)),
                    initialCashFlow: Number(netCredit.toFixed(2)),
                    natureza: 'CRÉDITO' as NaturezaOperacao,
                    max_profit: Number(netCredit.toFixed(2)),
                    max_loss: -Infinity,
                    lucro_maximo: Number(netCredit.toFixed(2)),
                    risco_maximo: Infinity,
                    roi: roi,
                    breakEvenPoints: [
                        Number(breakevenLow.toFixed(2)), 
                        Number(breakevenHigh.toFixed(2))
                    ],
                    greeks: netGreeks,
                    pernas: [
                        { derivative: putLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(putLeg, 'VENDA', K_Put) },
                        { derivative: callLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(callLeg, 'VENDA', K_Call) }
                    ]
                } as StrategyMetrics);
            }
        }

        return results;
    }

    getDescription(): string {
        return 'Estratégia neutra que busca lucrar com o ativo subjacente dentro de um intervalo de preço. O risco é ilimitado fora dos breakevens, mas a probabilidade de lucro é maior que no Straddle devido ao uso de opções OTM.';
    }

    getLegCount(): number { return 2; }
}