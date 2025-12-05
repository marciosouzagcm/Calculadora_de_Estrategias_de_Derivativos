/**
 * @fileoverview Implementação das Estratégias Straddle (Trava de Duas Pontas).
 * Característica: 1 CALL e 1 PUT no mesmo STRIKE e VENCIMENTO.
 */
import { FEES, IStrategy, LOT_SIZE } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, StrategyLeg, StrategyMetrics } from '../interfaces/Types'

// --- CLASSE BASE PARA A ESTRATÉGIA STRADDLE ---
abstract class StraddleBase implements IStrategy {
    abstract readonly name: string;
    abstract readonly isLong: boolean;
    
    readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL';

    constructor() {
        // @ts-ignore
        this.marketView = this.isLong ? 'VOLÁTIL' : 'NEUTRA';
    }

    calculateMetrics(
        legData: OptionLeg[], 
    ): StrategyMetrics | null {
        if (legData.length !== 2) return null;
        
        const callLeg = legData.find(leg => leg.tipo === 'CALL');
        const putLeg = legData.find(leg => leg.tipo === 'PUT');

        if (!callLeg || !putLeg || callLeg.strike === null || putLeg.strike === null || callLeg.strike !== putLeg.strike || callLeg.vencimento !== putLeg.vencimento) {
            console.warn(`[${this.name}] As opções devem ser uma CALL e uma PUT com o mesmo strike e vencimento.`);
            return null;
        }

        const K = callLeg.strike;
        const multiplicadorContrato = callLeg.multiplicador_contrato;
        
        // 1. Fluxo de Caixa e P/L
        const netPremiumUnitario = callLeg.premio + putLeg.premio;
        const cashFlowBruto = netPremiumUnitario * multiplicadorContrato;
        
        let riscoMaximo: number | 'Ilimitado'; 
        let lucroMaximo: number | 'Ilimitado';
        let cashFlowLiquido: number;
        let natureza: NaturezaOperacao;

        // --- CÁLCULO DE P/L E FLUXO DE CAIXA ---
        if (this.isLong) {
            // LONG STRADDLE (COMPRA) - DÉBITO
            cashFlowLiquido = -cashFlowBruto - FEES;
            natureza = 'DÉBITO';
            riscoMaximo = Math.abs(cashFlowLiquido); 
            lucroMaximo = 'Ilimitado'; 
        } else {
            // SHORT STRADDLE (VENDA) - CRÉDITO
            cashFlowLiquido = cashFlowBruto - FEES;
            natureza = 'CRÉDITO';
            riscoMaximo = 'Ilimitado';
            lucroMaximo = cashFlowLiquido; 
        }

        // 2. Pontos de Equilíbrio (Breakeven - BEP)
        const breakeven_high = K + netPremiumUnitario;
        const breakeven_low = K - netPremiumUnitario;
        
        // 3. Métrica de performance (L/R)
        let riscoRetornoUnitario: number | 'Ilimitado';
        
        if (this.isLong) {
            riscoRetornoUnitario = 'Ilimitado'; 
        } else {
            // Short Straddle: LucroMax / Distância BEP (Proxy Risco)
            riscoRetornoUnitario = (lucroMaximo as number) / (multiplicadorContrato * (breakeven_high - K));
        }

        // 4. Agregação de Gregas
        const sumDelta = (callLeg.gregas_unitarias.delta ?? 0) + (putLeg.gregas_unitarias.delta ?? 0);
        const sumGamma = (callLeg.gregas_unitarias.gamma ?? 0) + (putLeg.gregas_unitarias.gamma ?? 0);
        const sumTheta = (callLeg.gregas_unitarias.theta ?? 0) + (putLeg.gregas_unitarias.theta ?? 0); 
        const sumVega = (callLeg.gregas_unitarias.vega ?? 0) + (putLeg.gregas_unitarias.vega ?? 0); 

        const multiplier = this.isLong ? 1 : -1;

        const netGregas: Greeks = {
            delta: multiplier * sumDelta,
            gamma: multiplier * sumGamma,
            theta: multiplier * sumTheta, 
            vega: multiplier * sumVega, 
        };

        // 5. Montagem do Resultado
        const direction = this.isLong ? 'COMPRA' : 'VENDA';
        const pernas: StrategyLeg[] = [
            {
                direction: direction, multiplier: 1, derivative: callLeg,
                display: `${direction}: 1x CALL ${callLeg.option_ticker} (K=R$ ${K.toFixed(2)} | Prêmio Unitário: R$ ${callLeg.premio.toFixed(2)})`
            },
            {
                direction: direction, multiplier: 1, derivative: putLeg,
                display: `${direction}: 1x PUT ${putLeg.option_ticker} (K=R$ ${K.toFixed(2)} | Prêmio Unitário: R$ ${putLeg.premio.toFixed(2)})`
            },
        ];

        // 6. Cálculo do Score
        let finalScore: number;
        if (this.isLong) {
            finalScore = netPremiumUnitario * 10; 
        } else {
            finalScore = (riscoRetornoUnitario as number) * 100;
        }

        return {
            spread_type: this.name,
            vencimento: callLeg.vencimento,
            dias_uteis: callLeg.dias_uteis,
            strike_description: `Strike Único: R$ ${K.toFixed(2)}`,
            net_premium: netPremiumUnitario,
            cash_flow_liquido: cashFlowLiquido,
            natureza: natureza,
            risco_maximo: riscoMaximo,
            lucro_maximo: lucroMaximo,
            breakeven_low: breakeven_low,
            breakeven_high: breakeven_high, 
            risco_retorno_unitario: riscoRetornoUnitario,
            pernas,
            net_gregas: netGregas,
            score: finalScore,
        };
    }
    
    // -------------------------------------------------------------------
    // IMPLEMENTAÇÃO FINAL DO generatePayoff (Baseada na lógica de VerticalSpread)
    // -------------------------------------------------------------------
    generatePayoff(
        metrics: StrategyMetrics
    ): Array<{ assetPrice: number; profitLoss: number }> {
        const pernas = metrics.pernas;
        if (pernas.length !== 2) return [];

        const multiplicadorContrato = LOT_SIZE;
        const cashFlowLiquido = metrics.cash_flow_liquido as number;
        
        // Straddle tem apenas um strike. Usamos ele para centralizar o gráfico.
        const K = pernas[0].derivative.strike as number;

        // Range de Preços: K +/- 2.5 * (Prêmio Líquido Unitário)
        // Isso garante que os pontos de Breakeven e a área de máximo risco/lucro sejam visíveis.
        const range = metrics.net_premium as number; 
        const startPrice = K - range * 2.5;
        const endPrice = K + range * 2.5;
        const step = range / 10; // Gera 20 pontos de dados no gráfico
        
        const payoffData: Array<{ assetPrice: number; profitLoss: number }> = [];

        for (let S_T = startPrice; S_T <= endPrice; S_T += step) {
            let totalIntrinsicPL = 0;

            // --- Cálculo do P/L Intrínseco por Perna ---
            for (const perna of pernas) {
                const K_perna = perna.derivative.strike as number;
                const tipo = perna.derivative.tipo;
                const direcao = perna.direction;
                
                let intrinsicValue = 0;
                
                // P/L Intrínseco da Opção (valor da opção no vencimento)
                if (tipo === 'CALL') {
                    intrinsicValue = Math.max(0, S_T - K_perna);
                } else if (tipo === 'PUT') {
                    intrinsicValue = Math.max(0, K_perna - S_T);
                }
                
                // Compra = +1 (Ganho), Venda = -1 (Perda)
                const positionSign = direcao === 'COMPRA' ? 1 : -1;
                
                const pernaPL = intrinsicValue * positionSign * multiplicadorContrato;
                totalIntrinsicPL += pernaPL;
            }
            
            // P/L Total = P/L Intrínseco + Cash Flow Líquido
            const profitLoss = totalIntrinsicPL + cashFlowLiquido;
            
            payoffData.push({ 
                assetPrice: parseFloat(S_T.toFixed(2)), 
                profitLoss: parseFloat(profitLoss.toFixed(2)) 
            });
        }
        
        return payoffData; 
    }
}

// --- CLASSES CONCRETAS ---
export class LongStraddle extends StraddleBase {
    readonly name = 'Long Straddle (Compra de Volatilidade)';
    readonly isLong = true;
}

export class ShortStraddle extends StraddleBase {
    readonly name = 'Short Straddle (Venda de Volatilidade)';
    readonly isLong = false;
}