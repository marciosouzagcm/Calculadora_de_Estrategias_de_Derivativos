/**
 * @fileoverview Implementação da Estratégia Iron Condor Spread.
 * Característica: 4 pernas (Trava de Put + Trava de Call) no mesmo vencimento.
 * Visão de Mercado: NEUTRA/BAIXA VOLATILIDADE.
 */
// [REVISÃO] Acesso a FEES e LOT_SIZE via import.
import { FEES, IStrategy, LOT_SIZE } from '../interfaces/IStrategy';
// [REVISÃO] Renomear OptionData para OptionLeg e tipos de Gregas.
import { Greeks, NaturezaOperacao, OptionLeg, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

export class IronCondorSpread implements IStrategy {
    // [BOA PRÁTICA] Visão de mercado atualizada para maiúsculas (consistência com IStrategy)
    readonly name = 'Iron Condor Spread (Venda de Volatilidade)';
    readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA';

    // [REVISÃO] Assinatura do método ajustada para corresponder a IStrategy (remoção de fees e lotSize)
    calculateMetrics(
        legData: OptionLeg[], 
    ): StrategyMetrics | null {
        
        // O Iron Condor requer 4 pernas (2 CALLs e 2 PUTs)
        if (legData.length !== 4) {
            console.warn("[Iron Condor] Requer exatamente 4 pernas.");
            return null;
        }
        
        // [REVISÃO] Usar OptionLeg na filtragem e ordenação, e garantir que strikes não sejam nulos.
        const callLegs = legData
            .filter(leg => leg.tipo === 'CALL' && leg.strike !== null)
            .sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
        
        const putLegs = legData
            .filter(leg => leg.tipo === 'PUT' && leg.strike !== null)
            .sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));

        if (callLegs.length !== 2 || putLegs.length !== 2 || callLegs[0].vencimento !== putLegs[0].vencimento) {
            console.warn("[Iron Condor] Requer 2 CALLs e 2 PUTs no mesmo vencimento.");
            return null;
        }
        
        // --- Organização dos Strikes (K2 < K1 < K3 < K4) ---
        // Trava de Put Vendida (Bull Put Spread): K1_venda > K2_compra
        const [K2_put_compra, K1_put_venda] = putLegs; 
        
        // Trava de Call Vendida (Bear Call Spread): K4_compra > K3_venda
        const [K3_call_venda, K4_call_compra] = callLegs; 
        
        // Verifica a ordem de strikes (Iron Condor)
        if ((K1_put_venda.strike ?? 0) >= (K3_call_venda.strike ?? 0)) {
            console.warn("[Iron Condor] Strikes centrais devem ter K1_put < K3_call (separação entre as travas).");
            return null;
        }

        const multiplicadorContrato = K1_put_venda.multiplicador_contrato; // Usar o multiplicador da opção

        // 1. Fluxo de Caixa e P/L
        // Net Premium = (Prêmio K1_put_venda + Prêmio K3_call_venda) - (Prêmio K2_put_compra + Prêmio K4_call_compra)
        const netPremium = (K1_put_venda.premio + K3_call_venda.premio) - (K2_put_compra.premio + K4_call_compra.premio);
        
        // Iron Condor é tipicamente uma operação de CRÉDITO
        const isCredit = netPremium > 0;
        const natureza: NaturezaOperacao = isCredit ? 'CRÉDITO' : 'DÉBITO'; 
        
        const cashFlowBruto = Math.abs(netPremium) * multiplicadorContrato;
        // Cash Flow Líquido: Crédito (recebido) - Taxas | Débito (pago) - Taxas
        const cashFlowLiquido = isCredit ? (cashFlowBruto - FEES) : (-cashFlowBruto - FEES);

        // Largura da trava de put (Wp) = K1 - K2
        const widthPut = (K1_put_venda.strike ?? 0) - (K2_put_compra.strike ?? 0);
        // Largura da trava de call (Wc) = K4 - K3
        const widthCall = (K4_call_compra.strike ?? 0) - (K3_call_venda.strike ?? 0);

        // [REVISÃO] Lucro Máximo: É o Prêmio Líquido (se positivo), descontadas as taxas.
        // O lucro máximo é o crédito líquido recebido.
        const lucroMaximo = cashFlowLiquido; 
        
        // [REVISÃO] Risco Máximo (É LIMITADO): Max(Wp, Wc) - Prêmio Líquido Unitário.
        // O risco máximo unitário é a largura da trava menos o crédito (Prêmio) recebido.
        const maxLossUnit = Math.max(widthPut, widthCall) - netPremium;
        
        // O risco máximo total deve incluir as taxas (se o lucro maximo inclui as taxas)
        // No pior caso (loss), perdemos o maxLossUnit * multiplicador, e as taxas já foram pagas/subtraídas do CashFlow.
        // Usaremos o cálculo financeiramente mais simples: Risco Máximo = Perda Máxima Bruta - Lucro Máximo Bruto.
        const riscoMaximo = (maxLossUnit * multiplicadorContrato) + FEES; 
        
        // 2. Pontos de Equilíbrio (Breakeven - BEP)
        // BEP Inferior (Put side): K1_put_venda - Net Premium Unitário
        // BEP Superior (Call side): K3_call_venda + Net Premium Unitário
        const breakeven_low = (K1_put_venda.strike ?? 0) - netPremium;
        const breakeven_high = (K3_call_venda.strike ?? 0) + netPremium;
        
        // Métrica de performance para o Score: Lucro Máximo / Risco Máximo (L/R)
        // [BOA PRÁTICA] Verificar se risco é positivo antes de dividir
        const riscoRetornoUnitario = (lucroMaximo > 0 && riscoMaximo > 0) ? (lucroMaximo / riscoMaximo) : 0; 

        // 3. Agregação de Gregas (Soma das 4 pernas)
        // [REVISÃO] Acessar o objeto gregas_unitarias do OptionLeg
        const netGregas: Greeks = {
            // Long: Vende K1, K3 (+), Compra K2, K4 (-)
            delta: (K1_put_venda.gregas_unitarias.delta + K3_call_venda.gregas_unitarias.delta) - (K2_put_compra.gregas_unitarias.delta + K4_call_compra.gregas_unitarias.delta),
            gamma: (K1_put_venda.gregas_unitarias.gamma + K3_call_venda.gregas_unitarias.gamma) - (K2_put_compra.gregas_unitarias.gamma + K4_call_compra.gregas_unitarias.gamma),
            theta: (K1_put_venda.gregas_unitarias.theta + K3_call_venda.gregas_unitarias.theta) - (K2_put_compra.gregas_unitarias.theta + K4_call_compra.gregas_unitarias.theta), 
            vega: (K1_put_venda.gregas_unitarias.vega + K3_call_venda.gregas_unitarias.vega) - (K2_put_compra.gregas_unitarias.vega + K4_call_compra.gregas_unitarias.vega), 
        };

        // 4. Montagem do Resultado
        // [REVISÃO] Usar 'derivative' em StrategyLeg
        const pernas: StrategyLeg[] = [
            // Bull Put Spread (Vende K1, Compra K2)
            { direction: 'VENDA', multiplier: 1, derivative: K1_put_venda, display: `VENDA: 1x PUT ${K1_put_venda.option_ticker} (K=R$ ${K1_put_venda.strike?.toFixed(2)})` },
            { direction: 'COMPRA', multiplier: 1, derivative: K2_put_compra, display: `COMPRA: 1x PUT ${K2_put_compra.option_ticker} (K=R$ ${K2_put_compra.strike?.toFixed(2)})` },
            // Bear Call Spread (Vende K3, Compra K4)
            { direction: 'VENDA', multiplier: 1, derivative: K3_call_venda, display: `VENDA: 1x CALL ${K3_call_venda.option_ticker} (K=R$ ${K3_call_venda.strike?.toFixed(2)})` },
            { direction: 'COMPRA', multiplier: 1, derivative: K4_call_compra, display: `COMPRA: 1x CALL ${K4_call_compra.option_ticker} (K=R$ ${K4_call_compra.strike?.toFixed(2)})` },
        ];

        return {
            spread_type: this.name,
            vencimento: K1_put_venda.vencimento,
            dias_uteis: K1_put_venda.dias_uteis,
            strike_description: `Faixa: R$ ${K2_put_compra.strike?.toFixed(2)} / R$ ${K1_put_venda.strike?.toFixed(2)} | R$ ${K3_call_venda.strike?.toFixed(2)} / R$ ${K4_call_compra.strike?.toFixed(2)}`,
            net_premium: netPremium,
            cash_flow_liquido: cashFlowLiquido,
            natureza: natureza,
            risco_maximo: riscoMaximo,
            lucro_maximo: lucroMaximo,
            breakeven_low: breakeven_low,
            breakeven_high: breakeven_high, 
            risco_retorno_unitario: riscoRetornoUnitario,
            pernas,
            net_gregas: netGregas,
            score: riscoRetornoUnitario * 10,
        };
    }
    
    // [NOVO] Implementação do método exigido pela interface IStrategy
    generatePayoff(
        metrics: StrategyMetrics
    ): Array<{ assetPrice: number; profitLoss: number }> {
        // A lógica de cálculo do Payoff está centralizada na classe PayoffCalculator.
        // Retornamos um mock para cumprir o contrato da interface.
        console.log(`[IronCondorSpread] Geração de Payoff solicitada para ${metrics.spread_type}.`);
        return []; 
    }
}