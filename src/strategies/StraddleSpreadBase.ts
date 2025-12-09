/**
 * @fileoverview Implementação das Estratégias Straddle (Trava de Duas Pontas).
 * Característica: 1 CALL e 1 PUT no mesmo STRIKE e VENCIMENTO.
 */
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, StrategyLeg, StrategyMetrics, ProfitLossValue } from '../interfaces/Types'

// Constantes fictícias - Reajustadas para refletir o uso externo.
const LOT_SIZE = 100; // Multiplicador de lote padrão
const FEES_PER_LEG_TOTAL = 0.50; // Exemplo: 0.50 por lote.

// Função auxiliar para gerar a string de display
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', K: number): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.ativo_subjacente} K${K.toFixed(2)} (Prêmio: R$ ${leg.premio.toFixed(2)})`;
}

// --- CLASSE BASE PARA A ESTRATÉGIA STRADDLE ---
abstract class StraddleBase implements IStrategy {
    abstract readonly name: string;
    abstract readonly isLong: boolean;
    
    readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL';

    constructor() {
        this.marketView = this.isLong ? 'VOLÁTIL' : 'NEUTRA';
    }

    getDescription(): string {
        return this.isLong 
            ? 'Estratégia de Alta Volatilidade a Débito. Compra Call e Put no mesmo Strike e Vencimento. Risco Limitado, Lucro Ilimitado.'
            : 'Estratégia de Baixa Volatilidade a Crédito. Vende Call e Put no mesmo Strike e Vencimento. Lucro Limitado, Risco Ilimitado.';
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
        
        const callLeg = legData.find(leg => leg.tipo === 'CALL');
        const putLeg = legData.find(leg => leg.tipo === 'PUT');

        if (!callLeg || !putLeg || callLeg.strike === null || putLeg.strike === null || callLeg.strike !== putLeg.strike || callLeg.vencimento !== putLeg.vencimento) {
            console.warn(`[${this.name}] As opções devem ser uma CALL e uma PUT com o mesmo strike e vencimento.`);
            return null;
        }

        const K = callLeg.strike;
        
        // --- 1. Fluxo de Caixa (UNITÁRIO) ---
        const netPremiumUnitario = callLeg.premio + putLeg.premio;
        
        // Taxa Unitária por Ação (Total de 2 pernas / LOTE)
        const totalFeesUnitario = (feePerLeg * 2) / LOT_SIZE; 
        
        let riscoMaximo: ProfitLossValue; 
        let lucroMaximo: ProfitLossValue;
        let cashFlowLiquido: number;
        let natureza: NaturezaOperacao;
        const direction = this.isLong ? 'COMPRA' : 'VENDA';
        const multiplier = this.isLong ? 1 : -1; // Multiplicador para P&L

        // --- CÁLCULO DE P/L E FLUXO DE CAIXA UNITÁRIO ---
        if (this.isLong) {
            // LONG STRADDLE (DÉBITO)
            cashFlowLiquido = -(netPremiumUnitario + totalFeesUnitario); // Débito líquido (por ação)
            natureza = 'DÉBITO';
            riscoMaximo = Math.abs(cashFlowLiquido); // Custo máximo (prêmio líquido unitário)
            lucroMaximo = Infinity; 
        } else {
            // SHORT STRADDLE (CRÉDITO)
            cashFlowLiquido = netPremiumUnitario - totalFeesUnitario; // Crédito líquido (por ação)
            natureza = 'CRÉDITO';
            riscoMaximo = Infinity;
            lucroMaximo = cashFlowLiquido; // Lucro máximo é o crédito líquido unitário
        }

        // 2. Pontos de Equilíbrio (Breakeven - BEP) - Usam o prêmio BRUTO
        const breakeven_high = K + netPremiumUnitario;
        const breakeven_low = K - netPremiumUnitario;
        
        // 3. Métrica de performance (L/R)
        let riscoRetornoUnitario: ProfitLossValue;
        
        if (this.isLong) {
            riscoRetornoUnitario = Infinity; // Lucro Ilimitado / Risco Limitado
        } else {
            // Short Straddle: Risco Ilimitado, mas podemos usar o Retorno sobre Margem Exigida (Proxy)
            // Proxy para o Short Straddle: Lucro Máximo / Distância entre Breakevens
            const margemRisco = breakeven_high - breakeven_low; 
            riscoRetornoUnitario = margemRisco > 0 ? (lucroMaximo as number) / margemRisco : 0;
        }

        // 4. Agregação de Gregas (UNITÁRIA)
        const netGregas: Greeks = {
            // Multiplicamos as Gregas UNITÁRIAS das pernas pelo sinal da posição (Long=1, Short=-1)
            delta: multiplier * ((callLeg.gregas_unitarias.delta ?? 0) + (putLeg.gregas_unitarias.delta ?? 0)),
            gamma: multiplier * ((callLeg.gregas_unitarias.gamma ?? 0) + (putLeg.gregas_unitarias.gamma ?? 0)),
            theta: multiplier * ((callLeg.gregas_unitarias.theta ?? 0) + (putLeg.gregas_unitarias.theta ?? 0)), 
            vega: multiplier * ((callLeg.gregas_unitarias.vega ?? 0) + (putLeg.gregas_unitarias.vega ?? 0)), 
        };

        // 5. Montagem do Resultado
        const pernas: StrategyLeg[] = [
            { direction: direction, multiplier: 1, derivative: callLeg, display: generateDisplay(callLeg, direction, K) },
            { direction: direction, multiplier: 1, derivative: putLeg, display: generateDisplay(putLeg, direction, K) },
        ];

        // 6. Cálculo do Score
        let finalScore: number;
        if (this.isLong) {
            // Long Straddle: Quanto menor o custo (netPremiumUnitario), melhor
            finalScore = (1 / netPremiumUnitario) * 100; 
        } else {
            // Short Straddle: Baseado no proxy Risco/Retorno
            finalScore = (riscoRetornoUnitario as number) * 1000;
        }

        return {
            // Adicionando todos os campos da interface StrategyMetrics
            name: this.name,
            asset: callLeg.ativo_subjacente,
            asset_price: assetPrice,
            spread_type: 'STRADDLE',
            expiration: callLeg.vencimento,
            vencimento: callLeg.vencimento,
            dias_uteis: callLeg.dias_uteis ?? 0,
            strike_description: `Strike Único: R$ ${K.toFixed(2)}`,
            
            net_premium: netPremiumUnitario, // Unitário: Crédito/Débito Bruto
            cash_flow_bruto: netPremiumUnitario * LOT_SIZE,
            cash_flow_liquido: cashFlowLiquido * LOT_SIZE, // Total: Líquido
            initialCashFlow: cashFlowLiquido * LOT_SIZE, // Total: Líquido
            natureza: natureza,
            
            risco_maximo: riscoMaximo, // Unitário
            lucro_maximo: lucroMaximo, // Unitário
            max_profit: lucroMaximo, // Unitário
            max_loss: riscoMaximo, // Unitário

            current_pnl: 0, 
            current_price: assetPrice, 
            
            breakEvenPoints: [breakeven_low, breakeven_high],
            breakeven_low: breakeven_low,
            breakeven_high: breakeven_high, 
            
            width: 0, // Não é um spread vertical
            minPriceToMaxProfit: K, 
            maxPriceToMaxProfit: K, 
            
            risco_retorno_unitario: riscoRetornoUnitario,
            rentabilidade_max: riscoRetornoUnitario,
            roi: riscoRetornoUnitario, 
            margem_exigida: this.isLong ? (riscoMaximo as number) : netPremiumUnitario * 2, // Proxy para Short
            probabilidade_sucesso: 0, 
            should_close: false,
            
            pernas,
            greeks: netGregas,
            score: finalScore,
        } as StrategyMetrics;
    }
    
    // -------------------------------------------------------------------
    // IMPLEMENTAÇÃO FINAL DO generatePayoff
    // -------------------------------------------------------------------
    generatePayoff(
        metrics: StrategyMetrics
    ): Array<{ assetPrice: number; profitLoss: number }> {
        // 
        const pernas = metrics.pernas;
        if (pernas.length !== 2) return [];

        // Usamos o Cash Flow Líquido TOTAL (multiplicado por LOT_SIZE)
        const cashFlowLiquidoTotal = metrics.cash_flow_liquido as number;
        
        const K = pernas[0].derivative.strike as number;

        // Range de Preços: K +/- 2.5 * (Prêmio Líquido Unitário)
        // O cálculo do P/L Intrínseco é feito para o LOTE total.
        const range = (metrics.net_premium as number) * LOT_SIZE; 
        const startPrice = K - range * 0.025; // Ajustando o range para 2.5x o prêmio total/lote
        const endPrice = K + range * 0.025;
        const step = range / 250; // Gera ~50 pontos de dados no gráfico
        
        const payoffData: Array<{ assetPrice: number; profitLoss: number }> = [];

        for (let S_T = startPrice; S_T <= endPrice; S_T += step) {
            let totalIntrinsicPL = 0;

            // --- Cálculo do P/L Intrínseco por Perna ---
            for (const perna of pernas) {
                const K_perna = perna.derivative.strike as number;
                const tipo = perna.derivative.tipo;
                const direcao = perna.direction;
                
                let intrinsicValueUnitario = 0;
                
                // P/L Intrínseco da Opção (valor da opção no vencimento)
                if (tipo === 'CALL') {
                    intrinsicValueUnitario = Math.max(0, S_T - K_perna);
                } else if (tipo === 'PUT') {
                    intrinsicValueUnitario = Math.max(0, K_perna - S_T);
                }
                
                // Compra = +1 (Ganha com valor intrínseco), Venda = -1 (Perde com valor intrínseco)
                const positionSign = direcao === 'COMPRA' ? 1 : -1;
                
                // P/L Intrínseco TOTAL da perna: (Valor Intrínseco Unitário * LOTE) * Sinal
                const pernaPL = intrinsicValueUnitario * positionSign * LOT_SIZE;
                totalIntrinsicPL += pernaPL;
            }
            
            // P/L Total = P/L Intrínseco TOTAL + Cash Flow Líquido TOTAL
            const profitLoss = totalIntrinsicPL + cashFlowLiquidoTotal;
            
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