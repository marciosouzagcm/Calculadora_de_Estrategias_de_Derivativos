import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, StrategyMetrics } from '../interfaces/Types';

/**
 * Gera a string de exibição para as pernas da Venda de Strangle
 */
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.option_ticker} K${strike.toFixed(2)}`;
}

export class ShortStrangle implements IStrategy {
    public readonly name: string = 'Short Strangle (Venda)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA';

    /**
     * Scanner: Busca combinações de Puts e Calls OTM para criar uma zona de lucro
     */
    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];

        // 1. Filtrar pernas que estão OTM (ou próximas)
        const puts = allOptions.filter(l => l.tipo === 'PUT' && l.strike !== null);
        const calls = allOptions.filter(l => l.tipo === 'CALL' && l.strike !== null);

        if (puts.length === 0 || calls.length === 0) return [];

        // 2. Scanner de combinações
        for (const putLeg of puts) {
            for (const callLeg of calls) {
                
                // --- CORREÇÃO DE DATA (Crucial para o seu DB) ---
                const datePut = String(putLeg.vencimento).split('T')[0];
                const dateCall = String(callLeg.vencimento).split('T')[0];
                if (datePut !== dateCall) continue;

                const K_Put = putLeg.strike!;
                const K_Call = callLeg.strike!;

                // No Strangle Vendido, buscamos Puts abaixo do preço e Calls acima (Zona de Lucro)
                if (K_Put >= K_Call) continue;

                // --- Financeiro (CRÉDITO) ---
                const netCredit = putLeg.premio + callLeg.premio;
                
                // Filtro de prêmio mínimo (evita opções centaveiras inúteis)
                if (netCredit <= 0.05) continue;

                const breakevenLow = K_Put - netCredit;
                const breakevenHigh = K_Call + netCredit;

                // Margem estimada (Aproximadamente 15% do valor do ativo no Brasil para venda descoberta)
                const margemEstimada = assetPrice * 0.15;
                const roi = netCredit / margemEstimada;

                // --- Gregas Net (Venda = Inverter o sinal da grega unitária) ---
                const getG = (l: OptionLeg) => l.gregas_unitarias || { delta: 0, gamma: 0, theta: 0, vega: 0 };
                const gP = getG(putLeg);
                const gC = getG(callLeg);

                const greeks: Greeks = {
                    delta: Number((-(gC.delta || 0) - (gP.delta || 0)).toFixed(4)),
                    gamma: Number((-(gC.gamma || 0) - (gP.gamma || 0)).toFixed(4)),
                    theta: Number((-(gC.theta || 0) - (gP.theta || 0)).toFixed(4)), // Theta deve ser positivo na venda (lucro com o tempo)
                    vega: Number((-(gC.vega || 0) - (gP.vega || 0)).toFixed(4)),
                };

                // ID Único para evitar duplicidade
                const uid = `SSTR-${K_Put}-${K_Call}-${datePut}`;

                results.push({
                    uid: uid,
                    name: this.name,
                    asset: callLeg.ativo_subjacente,
                    asset_price: assetPrice,
                    spread_type: 'STRANGLE',
                    expiration: datePut,
                    dias_uteis: callLeg.dias_uteis || 0,
                    strike_description: `P:${K_Put.toFixed(2)} | C:${K_Call.toFixed(2)}`,
                    net_premium: Number(netCredit.toFixed(2)),
                    initialCashFlow: Number(netCredit.toFixed(2)),
                    natureza: 'CRÉDITO' as NaturezaOperacao,
                    max_profit: Number(netCredit.toFixed(2)),
                    max_loss: -9999, // Risco ilimitado (teórico)
                    lucro_maximo: Number(netCredit.toFixed(2)),
                    risco_maximo: 9999,
                    roi: roi,
                    breakEvenPoints: [
                        Number(breakevenLow.toFixed(2)), 
                        Number(breakevenHigh.toFixed(2))
                    ],
                    greeks: greeks,
                    pernas: [
                        { derivative: putLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(putLeg, 'VENDA', K_Put) },
                        { derivative: callLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(callLeg, 'VENDA', K_Call) }
                    ]
                } as any);
            }
        }

        return results;
    }

    getDescription(): string {
        return 'Venda de Put e Call OTM de mesmo vencimento. Lucra se o ativo ficar entre os strikes até o vencimento. Atenção: Risco ilimitado se o mercado se mover bruscamente.';
    }

    getLegCount(): number { return 2; }
    generatePayoff(): any[] { return []; }
}