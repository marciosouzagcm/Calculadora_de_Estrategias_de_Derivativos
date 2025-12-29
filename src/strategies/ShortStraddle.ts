import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.option_ticker} K${strike.toFixed(2)}`;
}

export class ShortStraddle implements IStrategy {
    
    public readonly name: string = 'Short Straddle (Venda)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA'; 
    
    /**
     * Scanner: Busca strikes onde se pode vender Call e Put simultaneamente
     */
    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];

        // 1. Agrupar por strike
        const optionsByStrike: { [strike: number]: OptionLeg[] } = {};
        allOptions.forEach(leg => {
            if (leg.strike === null || leg.tipo === 'SUBJACENTE') return;
            if (!optionsByStrike[leg.strike]) optionsByStrike[leg.strike] = [];
            optionsByStrike[leg.strike].push(leg);
        });

        // 2. Analisar cada strike para venda
        for (const strikeStr in optionsByStrike) {
            const strike = parseFloat(strikeStr);
            const legs = optionsByStrike[strike];

            const callLeg = legs.find(l => l.tipo === 'CALL');
            const putLeg = legs.find(l => l.tipo === 'PUT');

            if (!callLeg || !putLeg || callLeg.vencimento !== putLeg.vencimento) continue;

            // Filtro: Geralmente vendido ATM (próximo ao preço do ativo)
            const distanceFromPrice = Math.abs(strike - assetPrice) / assetPrice;
            if (distanceFromPrice > 0.10) continue; 

            // --- Financeiro (CRÉDITO) ---
            const netCredit = callLeg.premio + putLeg.premio;
            if (netCredit <= 0.10) continue;

            const breakevenLow = strike - netCredit;
            const breakevenHigh = strike + netCredit;

            // Margem estimada (exigência da B3 costuma ser em torno de 20% do ativo subjacente)
            const margemEstimada = assetPrice * 0.20;
            const roi = netCredit / margemEstimada;

            // --- Gregas Net (Sinais invertidos pois é VENDA) ---
            const greeks: Greeks = {
                delta: -(callLeg.gregas_unitarias.delta ?? 0) - (putLeg.gregas_unitarias.delta ?? 0),
                gamma: -(callLeg.gregas_unitarias.gamma ?? 0) - (putLeg.gregas_unitarias.gamma ?? 0),
                theta: -(callLeg.gregas_unitarias.theta ?? 0) - (putLeg.gregas_unitarias.theta ?? 0), // Geralmente POSITIVO
                vega: -(callLeg.gregas_unitarias.vega ?? 0) - (putLeg.gregas_unitarias.vega ?? 0),   // Geralmente NEGATIVO
            };

            results.push({
                name: this.name,
                asset: callLeg.ativo_subjacente,
                spread_type: 'STRADDLE',
                expiration: callLeg.vencimento,
                dias_uteis: callLeg.dias_uteis || 0,
                strike_description: `K: ${strike.toFixed(2)}`,
                asset_price: assetPrice,
                net_premium: netCredit,
                initialCashFlow: netCredit,
                natureza: 'CRÉDITO' as NaturezaOperacao,
                max_profit: netCredit,
                max_loss: -999999, // Risco ilimitado
                lucro_maximo: netCredit,
                risco_maximo: 999999,
                roi: roi,
                breakEvenPoints: [Number(breakevenLow.toFixed(2)), Number(breakevenHigh.toFixed(2))],
                greeks: greeks,
                pernas: [
                    { derivative: callLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(callLeg, 'VENDA', strike) },
                    { derivative: putLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(putLeg, 'VENDA', strike) }
                ]
            } as any);
        }

        return results;
    }

    getDescription(): string {
        return 'Venda de Call e Put no mesmo strike. Estratégia "vendedora de tempo" que lucra se o ativo não se mover.';
    }

    getLegCount(): number { return 2; }
    generatePayoff(): any[] { return []; }
}