import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, StrategyMetrics } from '../interfaces/Types';

/**
 * Gera a string de exibição para as pernas do Strangle
 */
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.option_ticker} K${strike.toFixed(2)}`;
}

export class LongStrangle implements IStrategy {
    
    public readonly name: string = 'Long Strangle';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'VOLÁTIL'; 
    
    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];

        // 1. Separar Puts e Calls (Filtro OTM flexível)
        // Removi o filtro rígido de strike < assetPrice para permitir que o scanner encontre mais opções próximas ao dinheiro
        const puts = allOptions.filter(l => l.tipo === 'PUT' && l.strike !== null);
        const calls = allOptions.filter(l => l.tipo === 'CALL' && l.strike !== null);

        if (puts.length === 0 || calls.length === 0) return [];

        // 2. Scanner de combinações
        for (const putLeg of puts) {
            for (const callLeg of calls) {
                
                // --- CORREÇÃO DE DATA (Crucial para o seu DB) ---
                const dPut = String(putLeg.vencimento).split('T')[0];
                const dCall = String(callLeg.vencimento).split('T')[0];
                if (dPut !== dCall) continue;

                const K_Put = putLeg.strike!;
                const K_Call = callLeg.strike!;

                // No Strangle, a Put deve ter strike MENOR que a Call
                if (K_Put >= K_Call) continue;

                // --- Financeiro (DÉBITO) ---
                const netCost = putLeg.premio + callLeg.premio;
                
                // Filtro de Sanidade
                if (netCost <= 0.05) continue;

                const breakevenLow = K_Put - netCost;
                const breakevenHigh = K_Call + netCost;

                // --- Gregas Net com proteção contra Undefined ---
                const getG = (l: OptionLeg) => l.gregas_unitarias || { delta: 0, gamma: 0, theta: 0, vega: 0 };
                const gP = getG(putLeg);
                const gC = getG(callLeg);

                const greeks: Greeks = {
                    delta: Number((gC.delta + gP.delta).toFixed(4)),
                    gamma: Number((gC.gamma + gP.gamma).toFixed(4)),
                    theta: Number((gC.theta + gP.theta).toFixed(4)),
                    vega: Number((gC.vega + gP.vega).toFixed(4)),
                };

                results.push({
                    name: this.name,
                    asset: callLeg.ativo_subjacente,
                    asset_price: assetPrice,
                    spread_type: 'STRANGLE',
                    expiration: dPut,
                    dias_uteis: callLeg.dias_uteis || 0,
                    strike_description: `P:${K_Put.toFixed(2)} | C:${K_Call.toFixed(2)}`,
                    net_premium: Number((-netCost).toFixed(2)),
                    initialCashFlow: Number((-netCost).toFixed(2)),
                    natureza: 'DÉBITO' as NaturezaOperacao,
                    max_profit: 9999, // Representação de lucro ilimitado
                    max_loss: Number((-netCost).toFixed(2)),
                    lucro_maximo: 9999,
                    risco_maximo: Number(netCost.toFixed(2)),
                    roi: 0, // ROI em estratégias compradas de lucro ilimitado é arbitrário
                    breakEvenPoints: [
                        Number(breakevenLow.toFixed(2)), 
                        Number(breakevenHigh.toFixed(2))
                    ],
                    greeks: greeks,
                    pernas: [
                        { derivative: putLeg, direction: 'COMPRA', multiplier: 1, display: generateDisplay(putLeg, 'COMPRA', K_Put) },
                        { derivative: callLeg, direction: 'COMPRA', multiplier: 1, display: generateDisplay(callLeg, 'COMPRA', K_Call) }
                    ]
                } as any);
            }
        }

        return results;
    }

    getDescription(): string {
        return 'Compra de Call e Put com strikes diferentes. Lucra com movimentos fortes para qualquer lado e aumento da volatilidade.';
    }

    getLegCount(): number { return 2; }
    generatePayoff(): any[] { return []; }
}