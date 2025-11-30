/**
 * @fileoverview Implementação das 4 Estratégias Verticais (Bull Call, Bear Call, Bull Put, Bear Put).
 * Característica: 2 pernas (1 Compra, 1 Venda) da mesma classe (CALL ou PUT), strikes diferentes, mesmo vencimento.
 */
// [REVISÃO] Acesso a FEES e LOT_SIZE via import.
import { FEES, IStrategy, LOT_SIZE } from '../interfaces/IStrategy';
// [REVISÃO] Renomear OptionData para OptionLeg e tipos de Gregas.
import { Greeks, NaturezaOperacao, OptionLeg, StrategyLeg, StrategyMetrics } from '../interfaces/Types'

// --- CLASSE BASE PARA TODAS AS TRAVAS VERTICAIS ---
abstract class VerticalSpreadBase implements IStrategy {
    abstract readonly name: string;
    abstract readonly isBull: boolean; // É de alta (Bull)?
    abstract readonly isCall: boolean; // É de Call?
    
    // [REVISÃO] marketView com letras maiúsculas para consistência
    readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = this.isBull ? 'ALTA' : 'BAIXA';
    
    // [REVISÃO] Assinatura do método ajustada para corresponder a IStrategy
    calculateMetrics(
        legData: OptionLeg[], 
    ): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        const expectedType = this.isCall ? 'CALL' : 'PUT';
        // [REVISÃO] Filtra pernas válidas, garantindo strike não nulo
        const validLegs = legData.filter(leg => 
            leg.tipo === expectedType && leg.strike !== null && leg.vencimento === legData[0].vencimento
        ).sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0)); // Ordena por strike crescente

        if (validLegs.length !== 2) {
            console.warn(`[${this.name}] Requer duas pernas do tipo ${expectedType} com o mesmo vencimento e strikes.`);
            return null;
        }

        const [Leg1, Leg2] = validLegs; // Leg1 < Leg2

        // --- Identificação da Perna Comprada (K_A) e Vendida (K_B) ---
        let K_A_compra: OptionLeg; // Perna de compra
        let K_B_venda: OptionLeg; // Perna de venda
        const multiplicadorContrato = Leg1.multiplicador_contrato;

        // Bull Spreads (K_compra < K_venda) - Strike comprado é o de menor risco
        // Bear Spreads (K_compra > K_venda) - Strike vendido é o de menor risco
        
        // Em todas as Verticais: A perna COMPRADA é sempre aquela que tem o prêmio MAIOR na Bull Spread,
        // ou a perna que está mais próxima do Ativo Subjacente.
        
        if (this.isBull) { // BULL SPREADS (Alta)
            // Call: Compra o strike MENOR (Leg1) | Put: Compra o strike MAIOR (Leg2)
            if (this.isCall) {
                // Bull Call: Compra K1, Vende K2
                K_A_compra = Leg1;
                K_B_venda = Leg2;
            } else {
                // Bull Put: Vende K1, Compra K2
                K_A_compra = Leg2;
                K_B_venda = Leg1;
            }
        } else { // BEAR SPREADS (Baixa)
            // Call: Vende o strike MENOR (Leg1) | Put: Vende o strike MAIOR (Leg2)
            if (this.isCall) {
                // Bear Call: Vende K1, Compra K2
                K_A_compra = Leg2; // Perna comprada é o strike MAIOR
                K_B_venda = Leg1; // Perna vendida é o strike MENOR
            } else {
                // Bear Put: Compra K1, Vende K2
                K_A_compra = Leg1;
                K_B_venda = Leg2;
            }
        }
        
        // 1. Fluxo de Caixa e P/L
        // Net Premium = Prêmio Compra - Prêmio Venda
        const netPremiumUnitario = K_A_compra.premio - K_B_venda.premio;
        const cashFlowBruto = Math.abs(netPremiumUnitario) * multiplicadorContrato;
        
        // Natureza: Se o prêmio de Compra > Prêmio de Venda, é DÉBITO.
        const natureza: NaturezaOperacao = netPremiumUnitario > 0 ? 'DÉBITO' : 'CRÉDITO';
        // Cash Flow Líquido: Débito (-CashBruto - FEES) | Crédito (CashBruto - FEES)
        const cashFlowLiquido = netPremiumUnitario > 0 ? (-cashFlowBruto - FEES) : (cashFlowBruto - FEES);
        
        // Largura da Trava
        const strikeDifference = Math.abs((K_B_venda.strike ?? 0) - (K_A_compra.strike ?? 0));
        
        // [CORREÇÃO] Risco Máximo e Lucro Máximo
        const widthTotal = strikeDifference * multiplicadorContrato;

        let riscoMaximo: number;
        let lucroMaximo: number;
        
        if (natureza === 'DÉBITO') {
            // Débito (Bull Call, Bear Put): Risco = Débito Líquido | Lucro = Largura - Débito Bruto
            riscoMaximo = Math.abs(cashFlowLiquido); 
            lucroMaximo = widthTotal - cashFlowBruto - FEES;
        } else {
            // Crédito (Bear Call, Bull Put): Lucro = Crédito Líquido | Risco = Largura - Crédito Bruto
            lucroMaximo = cashFlowBrido - FEES;
            riscoMaximo = widthTotal - cashFlowBruto + FEES;
        }

        // 2. Pontos de Equilíbrio (Breakeven - BEP)
        // O BEP é sempre a perna VENDIDA +/- o Prémio Líquido Unitário
        const breakeven = this.isCall
            ? (K_A_compra.strike ?? 0) + netPremiumUnitario // Call: K_Compra + Débito/Crédito
            : (K_A_compra.strike ?? 0) - netPremiumUnitario; // Put: K_Compra - Débito/Crédito
        
        // Métrica de performance para o Score: Lucro Máximo / Risco Máximo (L/R)
        const riscoRetornoUnitario = (lucroMaximo > 0 && riscoMaximo > 0) ? (lucroMaximo / riscoMaximo) : 0; 

        // 3. Agregação de Gregas (Compra - Venda)
        // [REVISÃO] Acessar o objeto gregas_unitarias do OptionLeg
        const netGregas: Greeks = {
            delta: (K_A_compra.gregas_unitarias.delta ?? 0) - (K_B_venda.gregas_unitarias.delta ?? 0),
            gamma: (K_A_compra.gregas_unitarias.gamma ?? 0) - (K_B_venda.gregas_unitarias.gamma ?? 0),
            theta: (K_A_compra.gregas_unitarias.theta ?? 0) - (K_B_venda.gregas_unitarias.theta ?? 0), 
            vega: (K_A_compra.gregas_unitarias.vega ?? 0) - (K_B_venda.gregas_unitarias.vega ?? 0), 
        };

        // 4. Montagem do Resultado
        // [REVISÃO] Usar 'derivative' em StrategyLeg
        const pernas: StrategyLeg[] = [
            { 
                direction: 'COMPRA', multiplier: 1, derivative: K_A_compra, 
                display: `COMPRA: 1x ${expectedType} ${K_A_compra.option_ticker} (K=R$ ${K_A_compra.strike?.toFixed(2)})`
            },
            { 
                direction: 'VENDA', multiplier: 1, derivative: K_B_venda, 
                display: `VENDA: 1x ${expectedType} ${K_B_venda.option_ticker} (K=R$ ${K_B_venda.strike?.toFixed(2)})`
            },
        ];

        return {
            spread_type: this.name,
            vencimento: K_A_compra.vencimento,
            dias_uteis: K_A_compra.dias_uteis,
            strike_description: `Trava: R$ ${K_A_compra.strike?.toFixed(2)} / R$ ${K_B_venda.strike?.toFixed(2)}`,
            net_premium: netPremiumUnitario,
            cash_flow_liquido: cashFlowLiquido,
            natureza: natureza,
            risco_maximo: riscoMaximo,
            lucro_maximo: lucroMaximo,
            breakeven_low: breakeven, 
            breakeven_high: undefined, // Trava Vertical tem apenas 1 BEP
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
        // Retornamos um mock para cumprir o contrato da interface.
        console.log(`[${this.name}] Geração de Payoff solicitada.`);
        return []; 
    }
}

// ----------------------------------------------------
// IMPLEMENTAÇÕES ESPECÍFICAS
// ----------------------------------------------------

// 1. Bull Call Spread (Alta, Débito: Compra K_baixo, Vende K_alto)
export class BullCallSpread extends VerticalSpreadBase {
    readonly name = 'Bull Call Spread (Débito)';
    readonly isBull = true;
    readonly isCall = true;
}

// 2. Bear Call Spread (Baixa, Crédito: Vende K_baixo, Compra K_alto)
export class BearCallSpread extends VerticalSpreadBase {
    readonly name = 'Bear Call Spread (Crédito)';
    readonly isBull = false;
    readonly isCall = true;
}

// 3. Bull Put Spread (Alta, Crédito: Vende K_alto, Compra K_baixo)
export class BullPutSpread extends VerticalSpreadBase {
    readonly name = 'Bull Put Spread (Crédito)';
    readonly isBull = true;
    readonly isCall = false;
}

// 4. Bear Put Spread (Baixa, Débito: Compra K_alto, Vende K_baixo)
export class BearPutSpread extends VerticalSpreadBase {
    readonly name = 'Bear Put Spread (Débito)';
    readonly isBull = false;
    readonly isCall = false;
}