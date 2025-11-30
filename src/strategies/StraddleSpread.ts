/**
 * @fileoverview Implementação das Estratégias Straddle (Trava de Duas Pontas).
 * Característica: 1 CALL e 1 PUT no mesmo STRIKE e VENCIMENTO.
 */
// [REVISÃO] Acesso a FEES e LOT_SIZE via import.
import { FEES, IStrategy, LOT_SIZE } from '../interfaces/IStrategy';
// [REVISÃO] Renomear OptionData para OptionLeg e tipos de Gregas.
import { Greeks, NaturezaOperacao, OptionLeg, StrategyLeg, StrategyMetrics } from '../interfaces/Types'

// --- CLASSE BASE PARA A ESTRATÉGIA STRADDLE ---
abstract class StraddleBase implements IStrategy {
    abstract readonly name: string;
    abstract readonly isLong: boolean;
    // [REVISÃO] marketView com letras maiúsculas para consistência
    readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = this.isLong ? 'VOLÁTIL' : 'NEUTRA';

    // [REVISÃO] Assinatura do método ajustada para corresponder a IStrategy
    calculateMetrics(
        legData: OptionLeg[], 
    ): StrategyMetrics | null {
        if (legData.length !== 2) return null;
        
        // [REVISÃO] Filtragem robusta para OptionLeg
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
            // [CORREÇÃO] Risco Máximo é o custo pago, incluindo taxas.
            riscoMaximo = Math.abs(cashFlowLiquido); 
            lucroMaximo = 'Ilimitado'; 
        } else {
            // SHORT STRADDLE (VENDA) - CRÉDITO
            cashFlowLiquido = cashFlowBruto - FEES;
            natureza = 'CRÉDITO';
            riscoMaximo = 'Ilimitado';
            // [CORREÇÃO] Lucro Máximo é o prêmio recebido, descontado taxas.
            lucroMaximo = cashFlowLiquido; 
        }

        // 2. Pontos de Equilíbrio (Breakeven - BEP)
        // BEP Superior: K + Net Premium Unitário
        // BEP Inferior: K - Net Premium Unitário
        const breakeven_high = K + netPremiumUnitario;
        const breakeven_low = K - netPremiumUnitario;
        
        // 3. Métrica de performance (L/R)
        // Para Long Straddle: Retorno é 'Ilimitado', então usamos uma string.
        // Para Short Straddle: LucroMax / Risco (proxy, ex: BEP-K)
        const riscoRetornoUnitario = this.isLong 
            ? 'Ilimitado' // Lucro Ilimitado / Risco Limitado
            : (lucroMaximo as number) / (multiplicadorContrato * (breakeven_high - K)); // Lucro Max / Distância BEP (Proxy Risco)

        // 4. Agregação de Gregas
        // [REVISÃO] Acessar o objeto gregas_unitarias do OptionLeg
        // As gregas unitárias são somadas e depois multiplicadas por -1 se for Short.
        const sumDelta = callLeg.gregas_unitarias.delta + putLeg.gregas_unitarias.delta;
        const sumGamma = callLeg.gregas_unitarias.gamma + putLeg.gregas_unitarias.gamma;
        const sumTheta = callLeg.gregas_unitarias.theta + putLeg.gregas_unitarias.theta; 
        const sumVega = callLeg.gregas_unitarias.vega + putLeg.gregas_unitarias.vega; 

        const multiplier = this.isLong ? 1 : -1;

        const netGregas: Greeks = {
            // Long Straddle: Gamma, Theta e Vega são POSITIVOS (aposta na variação e Vol)
            // Short Straddle: Gamma, Theta e Vega são NEGATIVOS (perde com a variação e Vol)
            delta: multiplier * sumDelta,
            gamma: multiplier * sumGamma,
            theta: multiplier * sumTheta, 
            vega: multiplier * sumVega, 
        };

        // 5. Montagem do Resultado
        const direction = this.isLong ? 'COMPRA' : 'VENDA';
        // [REVISÃO] Usar 'derivative' em StrategyLeg
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
            // [CORREÇÃO] Se 'Ilimitado', precisa ser string; caso contrário, number
            risco_retorno_unitario: this.isLong ? 'Ilimitado' : (riscoRetornoUnitario as number),
            pernas,
            net_gregas: netGregas,
            // [CORREÇÃO] Score calculado de forma diferente para Long vs Short
            score: this.isLong ? netPremiumUnitario * 10 : (riscoRetornoUnitario as number) * 100,
        };
    }
    
    // [NOVO] Implementação do método exigido pela interface IStrategy
    generatePayoff(
        metrics: StrategyMetrics
    ): Array<{ assetPrice: number; profitLoss: number }> {
        // Retornamos um mock para cumprir o contrato da interface.
        console.log(`[${this.name}] Geração de Payoff solicitada.`);
        return []; 
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