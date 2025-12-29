import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, StrategyMetrics } from '../interfaces/Types';

/**
 * Gera a string de exibição para as pernas do Iron Condor
 */
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    // Removido leg.sigla para evitar erro TS2339 (Property does not exist on type OptionLeg)
    return `${action}-${typeInitial} ${leg.option_ticker} K${strike.toFixed(2)}`;
}

export class IronCondorSpread implements IStrategy {
    public readonly name: string = 'Iron Condor';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA';

    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];

        // 1. Separar e ordenar
        const puts = allOptions
            .filter(l => l.tipo === 'PUT' && l.strike !== null)
            .sort((a, b) => (a.strike || 0) - (b.strike || 0));
        
        const calls = allOptions
            .filter(l => l.tipo === 'CALL' && l.strike !== null)
            .sort((a, b) => (a.strike || 0) - (b.strike || 0));

        if (puts.length < 2 || calls.length < 2) return [];

        // 2. Scanner de combinações (4 pernas)
        for (let p1 = 0; p1 < puts.length - 1; p1++) { // K1: Put Comprada (Asa Esquerda)
            for (let p2 = p1 + 1; p2 < puts.length; p2++) { // K2: Put Vendida (Corpo Esquerdo)
                for (let c1 = 0; c1 < calls.length - 1; c1++) { // K3: Call Vendida (Corpo Direito)
                    for (let c2 = c1 + 1; c2 < calls.length; c2++) { // K4: Call Comprada (Asa Direita)
                        
                        const K1_l = puts[p1]; const K2_s = puts[p2];
                        const K3_s = calls[c1]; const K4_l = calls[c2];

                        // --- CORREÇÃO DE DATA ---
                        const dP1 = String(K1_l.vencimento).split('T')[0];
                        const dP2 = String(K2_s.vencimento).split('T')[0];
                        const dC1 = String(K3_s.vencimento).split('T')[0];
                        const dC2 = String(K4_l.vencimento).split('T')[0];

                        if (dP1 !== dP2 || dP2 !== dC1 || dC1 !== dC2) continue;

                        // Validação de Estrutura: Put vendida < Call vendida para garantir o "miolo" neutro
                        if (K2_s.strike! >= K3_s.strike!) continue; 

                        // 3. Financeiro (CRÉDITO)
                        const credit = (K2_s.premio + K3_s.premio) - (K1_l.premio + K4_l.premio);
                        const widthPut = K2_s.strike! - K1_l.strike!;
                        const widthCall = K4_l.strike! - K3_s.strike!;
                        const maxWidth = Math.max(widthPut, widthCall);

                        // FILTROS DE SANIDADE:
                        if (credit <= 0.05 || credit >= maxWidth) continue;

                        const maxLoss = maxWidth - credit;
                        const roi = credit / maxLoss;

                        // 4. Gregas Net com proteção contra undefined
                        const getG = (l: OptionLeg) => l.gregas_unitarias || { delta: 0, gamma: 0, theta: 0, vega: 0 };
                        const gP1 = getG(K1_l); const gP2 = getG(K2_s);
                        const gC1 = getG(K3_s); const gC2 = getG(K4_l);

                        const greeks: Greeks = {
                            delta: Number((gP1.delta - gP2.delta - gC1.delta + gC2.delta).toFixed(4)),
                            gamma: Number((gP1.gamma - gP2.gamma - gC1.gamma + gC2.gamma).toFixed(4)),
                            theta: Number((gP1.theta - gP2.theta - gC1.theta + gC2.theta).toFixed(4)),
                            vega: Number((gP1.vega - gP2.vega - gC1.vega + gC2.vega).toFixed(4)),
                        };

                        results.push({
                            name: this.name,
                            asset: K1_l.ativo_subjacente,
                            asset_price: assetPrice,
                            spread_type: 'IRON CONDOR',
                            expiration: dP1,
                            dias_uteis: K1_l.dias_uteis || 0,
                            strike_description: `P:${K1_l.strike}/${K2_s.strike} | C:${K3_s.strike}/${K4_l.strike}`,
                            net_premium: Number(credit.toFixed(2)),
                            initialCashFlow: Number(credit.toFixed(2)),
                            natureza: 'CRÉDITO' as NaturezaOperacao,
                            max_profit: Number(credit.toFixed(2)),
                            max_loss: Number((-maxLoss).toFixed(2)),
                            lucro_maximo: Number(credit.toFixed(2)),
                            risco_maximo: Number(maxLoss.toFixed(2)),
                            roi: roi,
                            breakEvenPoints: [
                                Number((K2_s.strike! - credit).toFixed(2)), 
                                Number((K3_s.strike! + credit).toFixed(2))
                            ],
                            greeks: greeks,
                            pernas: [
                                { derivative: K1_l, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K1_l, 'COMPRA', K1_l.strike!) },
                                { derivative: K2_s, direction: 'VENDA', multiplier: 1, display: generateDisplay(K2_s, 'VENDA', K2_s.strike!) },
                                { derivative: K3_s, direction: 'VENDA', multiplier: 1, display: generateDisplay(K3_s, 'VENDA', K3_s.strike!) },
                                { derivative: K4_l, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K4_l, 'COMPRA', K4_l.strike!) }
                            ]
                        } as any);
                    }
                }
            }
        }

        return results;
    }

    getDescription(): string {
        return 'Estratégia neutra a crédito que combina uma trava de alta com puts e uma trava de baixa com calls.';
    }

    getLegCount(): number { return 4; }
    generatePayoff(): any[] { return []; }
}