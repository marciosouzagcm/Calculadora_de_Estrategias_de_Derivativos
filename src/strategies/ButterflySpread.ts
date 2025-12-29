import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, StrategyMetrics } from '../interfaces/Types';

/**
 * Gera a string de exibição para cada perna da Borboleta
 */
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number, qty: number): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    // Removido o campo 'sigla' para evitar erro TS2339
    return `${qty}x ${action}-${typeInitial} ${leg.option_ticker} K${strike.toFixed(2)}`;
}

export class ButterflySpread implements IStrategy {
    public readonly name: string = 'Butterfly (Borboleta)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA';

    /**
     * Scanner: Busca combinações simétricas de K1, K2 (2x) e K3
     */
    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];
        
        // 1. Filtra apenas CALLs e ordena por strike
        const calls = allOptions
            .filter(leg => leg.tipo === 'CALL' && leg.strike !== null)
            .sort((a, b) => (a.strike || 0) - (b.strike || 0));

        if (calls.length < 3) return [];

        // 2. Scanner de 3 pontas (O(n^3))
        for (let i = 0; i < calls.length - 2; i++) {
            for (let j = i + 1; j < calls.length - 1; j++) {
                for (let k = j + 1; k < calls.length; k++) {
                    const K1_l = calls[i];
                    const K2_s = calls[j];
                    const K3_l = calls[k];

                    const K1 = K1_l.strike!;
                    const K2 = K2_s.strike!;
                    const K3 = K3_l.strike!;

                    // --- CORREÇÃO DE DATA ---
                    // Normaliza a data para ignorar discrepâncias de fuso horário/formato
                    const date1 = String(K1_l.vencimento).split('T')[0];
                    const date2 = String(K2_s.vencimento).split('T')[0];
                    const date3 = String(K3_l.vencimento).split('T')[0];

                    if (date1 !== date2 || date2 !== date3) continue;

                    // Validação de Simetria (Asas iguais)
                    const leftWing = K2 - K1;
                    const rightWing = K3 - K2;
                    // Tolerância de 0.10 para strikes de ETFs/Ações com centavos
                    if (Math.abs(leftWing - rightWing) > 0.10) continue; 

                    // 3. Cálculos Financeiros (DÉBITO)
                    // Custo = (Compra Asa 1 + Compra Asa 2) - (2x Venda Miolo)
                    const cost = K1_l.premio + K3_l.premio - (K2_s.premio * 2);
                    
                    // FILTROS DE SANIDADE:
                    // Evita custos negativos (arbitragem irreal) ou prêmios irrisórios
                    if (cost <= 0.02 || cost >= leftWing) continue;

                    const maxProfitUnit = leftWing - cost;
                    if (maxProfitUnit <= 0) continue;

                    const roi = maxProfitUnit / cost;

                    // 4. Gregas Net (A perna central é multiplicada por 2)
                    const g1 = K1_l.gregas_unitarias || { delta: 0, gamma: 0, theta: 0, vega: 0 };
                    const g2 = K2_s.gregas_unitarias || { delta: 0, gamma: 0, theta: 0, vega: 0 };
                    const g3 = K3_l.gregas_unitarias || { delta: 0, gamma: 0, theta: 0, vega: 0 };

                    const netGreeks: Greeks = {
                        delta: Number((g1.delta - (2 * g2.delta) + g3.delta).toFixed(4)),
                        gamma: Number((g1.gamma - (2 * g2.gamma) + g3.gamma).toFixed(4)),
                        theta: Number((g1.theta - (2 * g2.theta) + g3.theta).toFixed(4)),
                        vega: Number((g1.vega - (2 * g2.vega) + g3.vega).toFixed(4)),
                    };

                    results.push({
                        name: this.name,
                        asset: K1_l.ativo_subjacente,
                        asset_price: assetPrice,
                        spread_type: 'BUTTERFLY',
                        expiration: date1,
                        dias_uteis: K1_l.dias_uteis || 0,
                        strike_description: `${K1.toFixed(1)} | ${K2.toFixed(1)} | ${K3.toFixed(1)}`,
                        net_premium: Number((-cost).toFixed(2)),
                        initialCashFlow: Number((-cost).toFixed(2)),
                        natureza: 'DÉBITO' as NaturezaOperacao,
                        max_profit: Number(maxProfitUnit.toFixed(2)),
                        max_loss: Number((-cost).toFixed(2)),
                        lucro_maximo: Number(maxProfitUnit.toFixed(2)),
                        risco_maximo: Number(cost.toFixed(2)),
                        roi: roi,
                        breakEvenPoints: [
                            Number((K1 + cost).toFixed(2)), 
                            Number((K3 - cost).toFixed(2))
                        ],
                        greeks: netGreeks,
                        pernas: [
                            { derivative: K1_l, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K1_l, 'COMPRA', K1, 1) },
                            { derivative: K2_s, direction: 'VENDA', multiplier: 2, display: generateDisplay(K2_s, 'VENDA', K2, 2) },
                            { derivative: K3_l, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K3_l, 'COMPRA', K3, 1) }
                        ]
                    } as any);
                }
            }
        }

        return results;
    }

    getDescription(): string {
        return 'Estratégia neutra que lucra se o ativo expirar próximo ao strike central (K2). Risco e retorno limitados.';
    }

    getLegCount(): number { return 3; }
    generatePayoff(): any[] { return []; }
}