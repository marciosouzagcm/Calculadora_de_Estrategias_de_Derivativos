/**
 * @fileoverview Implementação das 4 Estratégias Verticais (Bull Call, Bear Call, Bull Put, Bear Put).
 * Esta classe base calcula as métricas de forma centralizada.
 */
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, StrategyLeg, StrategyMetrics, ProfitLossValue } from '../interfaces/Types'

// Constantes fictícias
const LOT_SIZE = 100; // Multiplicador de lote padrão
const FEES_PER_LEG_TOTAL = 0.50; // Exemplo: 0.50 por lote.

// --- CLASSE BASE PARA TODAS AS TRAVAS VERTICAIS ---
abstract class VerticalSpreadBase implements IStrategy {
    abstract readonly name: string;
    abstract readonly isBull: boolean; // É de alta (Bull)?
    abstract readonly isCall: boolean; // É de Call?
    
    readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL'; 
    
    constructor() {
        this.marketView = this.isBull ? 'ALTA' : 'BAIXA';
    }

    getDescription(): string {
        const type = this.isCall ? 'CALL' : 'PUT';
        const direction = this.isBull ? 'ALTA' : 'BAIXA';
        const nature = this.isBull === this.isCall ? 'DÉBITO' : 'CRÉDITO';
        return `Trava Vertical de ${type} com visão de ${direction}. Operação a ${nature}. Risco e Lucro Máximos limitados.`;
    }
    
    getLegCount(): number {
        return 2;
    }
    
    calculateMetrics(
        legData: OptionLeg[], 
        assetPrice: number, 
        feePerLeg: number = FEES_PER_LEG_TOTAL 
    ): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        const expectedType = this.isCall ? 'CALL' : 'PUT';
        // Filtra por tipo correto e ordena por strike crescente
        const validLegs = legData.filter(leg => 
            leg.tipo === expectedType && leg.strike !== null && leg.vencimento === legData[0].vencimento
        ).sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0)); 

        if (validLegs.length !== 2 || validLegs[0].strike === validLegs[1].strike) return null;

        const [Leg1_K_low, Leg2_K_high] = validLegs; // Leg1 = Strike Menor, Leg2 = Strike Maior

        // --- 1. Identificação da Perna Comprada (K_A) e Vendida (K_B) ---
        let K_A_compra: OptionLeg; // Perna de compra
        let K_B_venda: OptionLeg; // Perna de venda
        
        if (this.isBull) { // BULL SPREADS (Alta)
            if (this.isCall) {
                // Bull Call (Débito): Compra K_low, Vende K_high
                K_A_compra = Leg1_K_low; // Compra K_baixo
                K_B_venda = Leg2_K_high; // Vende K_alto
            } else {
                // Bull Put (Crédito): Compra K_low (defesa), Vende K_high (crédito)
                K_A_compra = Leg1_K_low; // Compra K_baixo
                K_B_venda = Leg2_K_high; // Vende K_alto
            }
        } else { // BEAR SPREADS (Baixa)
            if (this.isCall) {
                // Bear Call (Crédito): Compra K_high (defesa), Vende K_low (crédito)
                K_A_compra = Leg2_K_high; // Compra K_alto
                K_B_venda = Leg1_K_low; // Vende K_baixo
            } else {
                // Bear Put (Débito): Compra K_high (débito), Vende K_low (defesa)
                K_A_compra = Leg2_K_high; // Compra K_alto
                K_B_venda = Leg1_K_low; // Vende K_baixo
            }
        }
        
        // --- 2. Fluxo de Caixa e P/L (UNITÁRIO) ---
        // Prêmio da Compra - Prêmio da Venda
        const netPremiumUnitarioBruto = K_A_compra.premio - K_B_venda.premio; 
        
        // A Natureza é definida pelo sinal. Débito > 0, Crédito < 0.
        const natureza: NaturezaOperacao = netPremiumUnitarioBruto > 0 ? 'DÉBITO' : 'CRÉDITO';
        
        // Taxa Unitária por Ação (Total de 2 pernas / LOTE)
        const totalFeesUnitario = (feePerLeg * 2) / LOT_SIZE; 

        // Prêmio Líquido Unitário
        let netPremiumUnitarioLiquido: number;
        if (natureza === 'DÉBITO') {
            // O custo líquido aumenta (ficando mais positivo)
            netPremiumUnitarioLiquido = netPremiumUnitarioBruto + totalFeesUnitario; 
        } else {
            // O crédito líquido diminui (ficando menos negativo, ou seja, mais perto de zero)
            netPremiumUnitarioLiquido = netPremiumUnitarioBruto - totalFeesUnitario;
        }

        // Largura da Trava (Unitário)
        const strikeDifferenceUnitario = Math.abs((Leg2_K_high.strike ?? 0) - (Leg1_K_low.strike ?? 0));
        const width = strikeDifferenceUnitario;
        
        let riscoMaximo: ProfitLossValue; // Unitário
        let lucroMaximo: ProfitLossValue; // Unitário
        
        if (natureza === 'DÉBITO') {
            // Débito: Risco = Custo Líquido Unitário
            riscoMaximo = netPremiumUnitarioLiquido; 
            // Lucro Máx = Largura Unitária - Débito Bruto Unitário
            lucroMaximo = width - netPremiumUnitarioBruto;
        } else {
            // Crédito: Lucro = Crédito Líquido Unitário
            lucroMaximo = -netPremiumUnitarioLiquido; // Inverte o sinal (lucro deve ser positivo)
            // Risco Máx = Largura Unitária - Crédito Bruto Unitário
            riscoMaximo = width - (-netPremiumUnitarioBruto);
        }

        // Fluxo de Caixa Líquido (Total da operação)
        // Se Débito: É um custo (negativo). Se Crédito: É um ganho (positivo).
        const cashFlowLiquidoTotal = netPremiumUnitarioLiquido * LOT_SIZE * (natureza === 'CRÉDITO' ? 1 : -1);
        
        // 3. Ponto de Equilíbrio (Breakeven - BEP) - Usa o prêmio BRUTO unitário
        
        // Perna mais próxima do dinheiro (Direcional): 
        // Call: K_low (Bull Call) ou K_low (Bear Call) -> Leg1_K_low
        // Put: K_high (Bull Put) ou K_high (Bear Put) -> Leg2_K_high
        const K_direcional = this.isCall ? Leg1_K_low.strike as number : Leg2_K_high.strike as number;

        // Breakeven Final = K_direcional +/- Prêmio Bruto.
        const breakevenFinal = K_direcional + netPremiumUnitarioBruto;

        // Métrica de performance para o Score: Lucro Máximo / Risco Máximo (L/R)
        const lucroMaximoNum = lucroMaximo as number;
        const riscoMaximoNum = riscoMaximo as number;
        const riscoRetornoUnitario = (lucroMaximoNum > 0 && riscoMaximoNum > 0) ? (lucroMaximoNum / riscoMaximoNum) : 0; 

        // 4. Agregação de Gregas (Compra - Venda)
        const netGregas: Greeks = {
            // Gregas: Perna Comprada - Perna Vendida
            delta: (K_A_compra.gregas_unitarias.delta ?? 0) - (K_B_venda.gregas_unitarias.delta ?? 0),
            gamma: (K_A_compra.gregas_unitarias.gamma ?? 0) - (K_B_venda.gregas_unitarias.gamma ?? 0),
            theta: (K_A_compra.gregas_unitarias.theta ?? 0) - (K_B_venda.gregas_unitarias.theta ?? 0), 
            vega: (K_A_compra.gregas_unitarias.vega ?? 0) - (K_B_venda.gregas_unitarias.vega ?? 0), 
        };

        // 5. Montagem do Resultado
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

        // 6. Agregação Final
        return {
            name: this.name,
            asset: K_A_compra.ativo_subjacente,
            asset_price: assetPrice,
            spread_type: this.name.includes('Call') ? 'VERTICAL_CALL' : 'VERTICAL_PUT',
            expiration: K_A_compra.vencimento,
            vencimento: K_A_compra.vencimento,
            dias_uteis: K_A_compra.dias_uteis ?? 0,
            strike_description: `Trava: R$ ${Leg1_K_low.strike?.toFixed(2)} / R$ ${Leg2_K_high.strike?.toFixed(2)}`,
            
            net_premium: netPremiumUnitarioBruto, 
            cash_flow_bruto: netPremiumUnitarioBruto * LOT_SIZE,
            cash_flow_liquido: cashFlowLiquidoTotal, 
            initialCashFlow: cashFlowLiquidoTotal, 
            natureza: natureza,
            
            risco_maximo: riscoMaximo, 
            lucro_maximo: lucroMaximo, 
            max_profit: lucroMaximo,
            max_loss: riscoMaximo,
            
            current_pnl: 0, 
            current_price: assetPrice, 

            breakEvenPoints: [breakevenFinal],
            breakeven_low: breakevenFinal, 
            breakeven_high: breakevenFinal, 
            
            width: width,
            // Zona de lucro: Acima do K_high (Bull Call), Abaixo do K_low (Bear Put), etc.
            minPriceToMaxProfit: this.isBull ? K_B_venda.strike : K_B_venda.strike, 
            maxPriceToMaxProfit: this.isBull ? Infinity : K_B_venda.strike, 

            risco_retorno_unitario: riscoRetornoUnitario,
            rentabilidade_max: riscoRetornoUnitario,
            roi: riscoRetornoUnitario, 
            margem_exigida: riscoMaximoNum,
            probabilidade_sucesso: 0, 
            should_close: false,
            
            pernas,
            greeks: netGregas,
            score: riscoRetornoUnitario * 10,
        } as StrategyMetrics;
    }
    
    // O generatePayoff calcula o Payoff de duas pernas, que é universal para Spreads Verticais
    generatePayoff(
        metrics: StrategyMetrics
    ): Array<{ assetPrice: number; profitLoss: number }> {
        const pernas = metrics.pernas;
        if (pernas.length !== 2) return [];

        const multiplicadorContrato = LOT_SIZE; 
        const cashFlowLiquido = metrics.cash_flow_liquido as number; // Cash Flow Líquido TOTAL
        
        // Determinar o range de preço com base nos strikes
        const strikes = pernas.map(p => p.derivative.strike as number).sort((a, b) => a - b);
        const K_low = strikes[0];
        const K_high = strikes[1];

        // Definição do Range de Preços (S_T)
        const range = K_high - K_low;
        // Para uma boa visualização, usamos uma margem maior que a largura da trava
        const startPrice = K_low - range * 1.5; 
        const endPrice = K_high + range * 1.5;
        const step = range / 20; 
        
        const payoffData: Array<{ assetPrice: number; profitLoss: number }> = [];

        for (let S_T = startPrice; S_T <= endPrice; S_T += step) {
            let totalIntrinsicPL = 0;

            // --- Cálculo do P/L Intrínseco por Perna ---
            for (const perna of pernas) {
                const K = perna.derivative.strike as number;
                const tipo = perna.derivative.tipo;
                const direcao = perna.direction;
                
                let intrinsicValue = 0;
                
                // Valor Intrínseco da Opção no Vencimento
                if (tipo === 'CALL') {
                    intrinsicValue = Math.max(0, S_T - K);
                } else if (tipo === 'PUT') {
                    intrinsicValue = Math.max(0, K - S_T);
                }
                
                // Ajuste pelo Sentido da Operação
                const positionSign = direcao === 'COMPRA' ? 1 : -1;
                
                // P/L Intrínseco TOTAL da perna: (Valor Intrínseco Unitário * LOTE) * Sinal
                const pernaPL = intrinsicValue * positionSign * multiplicadorContrato;
                
                totalIntrinsicPL += pernaPL;
            }
            
            // P/L Total = P/L Intrínseco + Cash Flow Líquido TOTAL
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
// IMPLEMENTAÇÕES ESPECÍFICAS
// ----------------------------------------------------

export class BullCallSpread extends VerticalSpreadBase {
    readonly name = 'Bull Call Spread (Débito)';
    readonly isBull = true;
    readonly isCall = true;
}

export class BearCallSpread extends VerticalSpreadBase {
    readonly name = 'Bear Call Spread (Crédito)';
    readonly isBull = false;
    readonly isCall = true;
}

export class BullPutSpread extends VerticalSpreadBase {
    readonly name = 'Bull Put Spread (Crédito)';
    readonly isBull = true;
    readonly isCall = false;
}

export class BearPutSpread extends VerticalSpreadBase {
    readonly name = 'Bear Put Spread (Débito)';
    readonly isBull = false;
    readonly isCall = false;
}