import { IStrategy } from '../interfaces/IStrategy.js';
import { 
    Greeks, 
    NaturezaOperacao, 
    OptionLeg, 
    StrategyMetrics 
} from '../interfaces/Types.js';

/**
 * Helper: Gera a string de exibição para as pernas da Venda de Straddle.
 */
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'VENDA' ? '[V]' : '[C]';
    return `${action} ${leg.option_ticker} (${typeInitial}) K:${strike.toFixed(2)}`;
}

/**
 * CLASSE: Short Straddle (Venda de Volatilidade)
 * FUNCIONALIDADE: Venda simultânea de uma CALL e uma PUT no mesmo strike.
 * OBJETIVO: Lucrar com a passagem do tempo e a queda da volatilidade implícita.
 * RISCO: Ilimitado se o ativo se mover bruscamente para qualquer lado.
 */
export class ShortStraddle implements IStrategy {
    
    public readonly name: string = 'Short Straddle (Venda)';
    public readonly marketView: 'NEUTRA' = 'NEUTRA'; 
    
    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];

        // 1. Agrupar por strike para encontrar pares Call/Put idênticos
        const optionsByStrike: { [strike: number]: OptionLeg[] } = {};
        allOptions.forEach(leg => {
            if (!leg.strike || leg.tipo === 'SUBJACENTE' || leg.premio <= 0) return;
            if (!optionsByStrike[leg.strike]) optionsByStrike[leg.strike] = [];
            optionsByStrike[leg.strike].push(leg);
        });

        // 2. Analisar cada strike
        for (const strikeStr in optionsByStrike) {
            const strike = parseFloat(strikeStr);
            const legs = optionsByStrike[strike];

            const callLeg = legs.find(l => l.tipo === 'CALL');
            const putLeg = legs.find(l => l.tipo === 'PUT');

            // Validação de paridade e vencimento
            if (!callLeg || !putLeg) continue;
            
            const dCall = String(callLeg.vencimento).split(/[T ]/)[0];
            const dPut = String(putLeg.vencimento).split(/[T ]/)[0];
            if (dCall !== dPut) continue;

            // Filtro ATM: Short Straddles costumam ser montados próximos ao dinheiro
            const distanceFromPrice = Math.abs(strike - assetPrice) / assetPrice;
            if (distanceFromPrice > 0.10) continue; 

            // --- Cálculo Financeiro (CRÉDITO) ---
            const netCredit = callLeg.premio + putLeg.premio;
            if (netCredit <= 0.10) continue;

            const breakevenLow = strike - netCredit;
            const breakevenHigh = strike + netCredit;

            /**
             * MARGEM ESTIMADA (Risco de Cauda):
             * A B3 exige margem significativa para vendas a descoberto.
             * Uma estimativa conservadora é 20% do valor do ativo.
             */
            const estimatedMargin = assetPrice * 0.20;
            const roi = netCredit / estimatedMargin;

            // --- Cálculo das Gregas Net (SINAIS INVERTIDOS) ---
            // Como é uma VENDA, invertemos o Delta, Gamma, Vega e Theta unitários.
            const getG = (l: OptionLeg) => l.gregas_unitarias || { delta: 0, gamma: 0, theta: 0, vega: 0 };
            const gC = getG(callLeg);
            const gP = getG(putLeg);

            const netGreeks: Greeks = {
                delta: Number((-(gC.delta + gP.delta)).toFixed(4)),
                gamma: Number((-(gC.gamma + gP.gamma)).toFixed(4)),
                theta: Number((-(gC.theta + gP.theta)).toFixed(4)), // Geralmente Positivo (Ganho com o tempo)
                vega: Number((-(gC.vega + gP.vega)).toFixed(4)),   // Geralmente Negativo (Prejudicado por alta de Vol)
            };

            results.push({
                name: this.name,
                asset: callLeg.ativo_subjacente,
                spread_type: 'SHORT STRADDLE',
                expiration: dCall,
                dias_uteis: callLeg.dias_uteis || 0,
                strike_description: `K: ${strike.toFixed(2)}`,
                asset_price: assetPrice,
                net_premium: netCredit,
                initialCashFlow: netCredit,
                natureza: 'CRÉDITO' as NaturezaOperacao,
                max_profit: netCredit,
                max_loss: -Infinity, 
                lucro_maximo: netCredit,
                risco_maximo: Infinity,
                roi: roi,
                breakEvenPoints: [
                    Number(breakevenLow.toFixed(2)), 
                    Number(breakevenHigh.toFixed(2))
                ],
                greeks: netGreeks,
                pernas: [
                    { derivative: callLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(callLeg, 'VENDA', strike) },
                    { derivative: putLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(putLeg, 'VENDA', strike) }
                ]
            } as StrategyMetrics);
        }

        return results;
    }

    getDescription(): string {
        return 'Estratégia neutra com alto risco. Consiste na venda de uma Call e uma Put no mesmo strike. O lucro máximo é o prêmio recebido, obtido se o ativo ficar parado exatamente no strike até o vencimento.';
    }

    getLegCount(): number { return 2; }
}