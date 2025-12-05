/**
 * @fileoverview Implementação das 4 Estratégias Verticais (Bull Call, Bear Call, Bull Put, Bear Put).
 * Característica: 2 pernas (1 Compra, 1 Venda) da mesma classe (CALL ou PUT), strikes diferentes, mesmo vencimento.
 */
import { FEES, IStrategy, LOT_SIZE } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, StrategyLeg, StrategyMetrics } from '../interfaces/Types'

// --- CLASSE BASE PARA TODAS AS TRAVAS VERTICAIS ---
abstract class VerticalSpreadBase implements IStrategy {
    abstract readonly name: string;
    abstract readonly isBull: boolean; // É de alta (Bull)?
    abstract readonly isCall: boolean; // É de Call?
    
    readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL'; 
    
    constructor() {
        // @ts-ignore
        this.marketView = this.isBull ? 'ALTA' : 'BAIXA';
    }
    
    calculateMetrics(
        legData: OptionLeg[], 
    ): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        const expectedType = this.isCall ? 'CALL' : 'PUT';
        // Ordena por strike crescente (Leg1 < Leg2)
        const validLegs = legData.filter(leg => 
            leg.tipo === expectedType && leg.strike !== null && leg.vencimento === legData[0].vencimento
        ).sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0)); 

        if (validLegs.length !== 2) return null;

        const [Leg1, Leg2] = validLegs; // Leg1 = Strike Menor, Leg2 = Strike Maior

        // --- Identificação da Perna Comprada (K_A) e Vendida (K_B) ---
        let K_A_compra: OptionLeg; // Perna de compra
        let K_B_venda: OptionLeg; // Perna de venda
        const multiplicadorContrato = Leg1.multiplicador_contrato;

        if (this.isBull) { // BULL SPREADS (Alta)
            if (this.isCall) {
                // Bull Call (Débito): Compra K1, Vende K2
                K_A_compra = Leg1; 
                K_B_venda = Leg2;
            } else {
                // Bull Put (Crédito): Vende K1, Compra K2
                K_A_compra = Leg2; 
                K_B_venda = Leg1;
            }
        } else { // BEAR SPREADS (Baixa)
            if (this.isCall) {
                // Bear Call (Crédito): Vende K1, Compra K2
                K_A_compra = Leg2; 
                K_B_venda = Leg1;
            } else {
                // Bear Put (Débito): Compra K1, Vende K2
                K_A_compra = Leg1; 
                K_B_venda = Leg2;
            }
        }
        
        // 1. Fluxo de Caixa e P/L
        const netPremiumUnitario = K_A_compra.premio - K_B_venda.premio;
        const cashFlowBruto = Math.abs(netPremiumUnitario) * multiplicadorContrato;
        
        const natureza: NaturezaOperacao = netPremiumUnitario > 0 ? 'DÉBITO' : 'CRÉDITO';
        const cashFlowLiquido = netPremiumUnitario > 0 ? (-cashFlowBruto - FEES) : (cashFlowBruto - FEES);
        
        // Largura da Trava
        const strikeDifference = Math.abs((K_B_venda.strike ?? 0) - (K_A_compra.strike ?? 0));
        const widthTotal = strikeDifference * multiplicadorContrato;

        let riscoMaximo: number;
        let lucroMaximo: number;
        
        if (natureza === 'DÉBITO') {
            // Débito (Bull Call, Bear Put): Risco = Custo Líquido | Lucro = Largura - Custo Bruto
            riscoMaximo = Math.abs(cashFlowLiquido); 
            lucroMaximo = widthTotal + cashFlowLiquido; // cashFlowLiquido é negativo aqui
        } else {
            // Crédito (Bear Call, Bull Put): Lucro = Crédito Líquido | Risco = Largura - Crédito Bruto
            lucroMaximo = cashFlowLiquido; 
            riscoMaximo = widthTotal - cashFlowBruto + FEES;
        }

        // 2. Pontos de Equilíbrio (Breakeven - BEP)
        const breakeven = this.isCall
            // Call: Strike Menor + Prêmio Líquido (semelhante ao Long Call, mas com ajuste)
            ? (Leg1.strike ?? 0) + netPremiumUnitario 
            // Put: Strike Maior - Prêmio Líquido (semelhante ao Short Put, mas com ajuste)
            : (Leg2.strike ?? 0) - netPremiumUnitario; 
        
        // Métrica de performance para o Score: Lucro Máximo / Risco Máximo (L/R)
        const riscoRetornoUnitario = (lucroMaximo > 0 && riscoMaximo > 0) ? (lucroMaximo / riscoMaximo) : 0; 

        // 3. Agregação de Gregas (Compra - Venda)
        const netGregas: Greeks = {
            // Compra A - Venda B
            delta: (K_A_compra.gregas_unitarias.delta ?? 0) - (K_B_venda.gregas_unitarias.delta ?? 0),
            gamma: (K_A_compra.gregas_unitarias.gamma ?? 0) - (K_B_venda.gregas_unitarias.gamma ?? 0),
            theta: (K_A_compra.gregas_unitarias.theta ?? 0) - (K_B_venda.gregas_unitarias.theta ?? 0), 
            vega: (K_A_compra.gregas_unitarias.vega ?? 0) - (K_B_venda.gregas_unitarias.vega ?? 0), 
        };

        // 4. Montagem do Resultado
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
            breakeven_high: breakeven, // Não é tecnicamente errado ter o mesmo valor para um único BEP
            risco_retorno_unitario: riscoRetornoUnitario,
            pernas,
            net_gregas: netGregas,
            score: riscoRetornoUnitario * 10,
        };
    }
    
    // [IMPLEMENTAÇÃO DE PAYOFF - CÓDIGO DA RESPOSTA ANTERIOR]
    generatePayoff(
        metrics: StrategyMetrics
    ): Array<{ assetPrice: number; profitLoss: number }> {
        
        // 1. Extração de Dados Essenciais
        const pernas = metrics.pernas;
        if (pernas.length !== 2) return [];

        const multiplicadorContrato = LOT_SIZE; 
        const cashFlowLiquido = metrics.cash_flow_liquido as number;
        
        // Determinar o range de preço com base nos strikes
        const strikes = pernas.map(p => p.derivative.strike as number).sort((a, b) => a - b);
        const K_low = strikes[0];
        const K_high = strikes[1];

        // 2. Definição do Range de Preços (S_T)
        const range = K_high - K_low;
        const startPrice = K_low - range * 1.5;
        const endPrice = K_high + range * 1.5;
        const step = range / 10;
        
        const payoffData: Array<{ assetPrice: number; profitLoss: number }> = [];

        for (let S_T = startPrice; S_T <= endPrice; S_T += step) {
            let totalIntrinsicPL = 0;

            // --- 3. Cálculo do P/L Intrínseco por Perna ---
            for (const perna of pernas) {
                const K = perna.derivative.strike as number;
                const tipo = perna.derivative.tipo;
                const direcao = perna.direction;
                
                let intrinsicValue = 0;
                
                // P/L Intrínseco da Opção (valor da opção no vencimento)
                if (tipo === 'CALL') {
                    intrinsicValue = Math.max(0, S_T - K);
                } else if (tipo === 'PUT') {
                    intrinsicValue = Math.max(0, K - S_T);
                }
                
                // Ajuste pelo Sentido da Operação: Compra = +1 (Ganho), Venda = -1 (Perda)
                const positionSign = direcao === 'COMPRA' ? 1 : -1;
                
                const pernaPL = intrinsicValue * positionSign * multiplicadorContrato;
                
                totalIntrinsicPL += pernaPL;
            }
            
            // 4. P/L Total = P/L Intrínseco + Cash Flow Líquido
            const profitLoss = totalIntrinsicPL + cashFlowLiquido;
            
            payoffData.push({ 
                assetPrice: parseFloat(S_T.toFixed(2)), 
                profitLoss: parseFloat(profitLoss.toFixed(2)) 
            });
        }
        
        return payoffData; 
    }
}

// ----------------------------------------------------
// IMPLEMENTAÇÕES ESPECÍFICAS (sem alteração)
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