// src/strategies/ShortStraddle.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, OptionLeg, StrategyMetrics, StrategyLeg, NaturezaOperacao, ProfitLossValue } from '../interfaces/Types';

// Constantes fictícias
const LOT_SIZE = 1; 

// Função auxiliar para gerar a string de display
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.ativo_subjacente} K${strikeStr}`;
}

export class ShortStraddle implements IStrategy {
    
    public readonly name: string = 'Short Straddle (Crédito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA'; // Visão: Baixa Volatilidade
    
    getDescription(): string {
        // 🎯 CORREÇÃO: Removida a tag de imagem que estava causando erro de sintaxe.
        return 'Estratégia de Baixa Volatilidade a Crédito. Vende Call e Put no mesmo Strike e Vencimento. Risco Ilimitado.';
    }

    getLegCount(): number {
        return 2;
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        const points: Array<{ assetPrice: number; profitLoss: number }> = [];
        const strike = metrics.pernas[0].derivative.strike ?? 0;

        const maxProfitValue = metrics.max_profit as number; 

        if (strike > 0 && metrics.breakEvenPoints.length === 2) {
            const bep1 = metrics.breakEvenPoints[0] as number;
            const bep2 = metrics.breakEvenPoints[1] as number;
            
            // Ponto 1: Perda Ilimitada na Baixa (Ponto bem abaixo do BEP 1)
            points.push({ assetPrice: bep1 - 5, profitLoss: -maxProfitValue - 5 * LOT_SIZE }); 
            // Ponto 2: Breakeven Point 1
            points.push({ assetPrice: bep1, profitLoss: 0 }); 
            // Ponto 3: Lucro Máximo (No Strike Central K)
            points.push({ assetPrice: strike, profitLoss: maxProfitValue }); 
            // Ponto 4: Breakeven Point 2
            points.push({ assetPrice: bep2, profitLoss: 0 }); 
            // Ponto 5: Perda Ilimitada na Alta (Ponto bem acima do BEP 2)
            points.push({ assetPrice: bep2 + 5, profitLoss: -maxProfitValue - 5 * LOT_SIZE }); 
        }
        return points;
    }

    /**
     * @inheritdoc IStrategy.calculateMetrics
     */
    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        const callLeg = legData.find(leg => leg.tipo === 'CALL');
        const putLeg = legData.find(leg => leg.tipo === 'PUT');
        
        if (!callLeg || !putLeg || callLeg.strike !== putLeg.strike || callLeg.vencimento !== putLeg.vencimento) return null;

        const K = callLeg.strike;

        // --- 1. Fluxo de Caixa ---
        const multiplicadorContrato = LOT_SIZE; 
        const netPremiumUnitario = callLeg.premio + putLeg.premio;
        
        const cashFlowBruto = netPremiumUnitario * multiplicadorContrato;
        const natureza: NaturezaOperacao = 'CRÉDITO';
        
        const totalFees = feePerLeg * 2; // 2 pernas
        const cash_flow_liquido = cashFlowBruto - totalFees; // Crédito Líquido = Crédito Bruto - Taxas

        // --- 2. Risco e Retorno ---
        const lucro_maximo: ProfitLossValue = cash_flow_liquido; 
        const max_profit: ProfitLossValue = lucro_maximo;

        const risco_maximo: ProfitLossValue = Infinity; 
        const max_loss: ProfitLossValue = risco_maximo;

        // --- 3. Pontos Chave ---
        const breakeven1 = (K ?? 0) - netPremiumUnitario;
        const breakeven2 = (K ?? 0) + netPremiumUnitario;
        const breakEvenPoints = [breakeven1, breakeven2]; 
        
        const minPriceToMaxProfit = K; 
        const maxPriceToMaxProfit = K; 
        
        const width = 0; 

        // --- 4. Gregas ---
        const greeks: Greeks = {
            delta: (callLeg.gregas_unitarias.delta ?? 0) * -1 + (putLeg.gregas_unitarias.delta ?? 0) * -1,
            gamma: (callLeg.gregas_unitarias.gamma ?? 0) * -1 + (putLeg.gregas_unitarias.gamma ?? 0) * -1,
            theta: (callLeg.gregas_unitarias.theta ?? 0) * -1 + (putLeg.gregas_unitarias.theta ?? 0) * -1,
            vega: (callLeg.gregas_unitarias.vega ?? 0) * -1 + (putLeg.gregas_unitarias.vega ?? 0) * -1,
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            { derivative: callLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(callLeg, 'VENDA', K) },
            { derivative: putLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(putLeg, 'VENDA', K) },
        ];
        
        const roi = 0; 

        // --- 6. Agregação Final (Preenchendo TODOS os campos requeridos) ---
        return {
            // --- Identificação e Resumo ---
            name: this.name,
            asset: callLeg.ativo_subjacente,
            spread_type: 'STRADDLE', 
            vencimento: callLeg.vencimento,
            expiration: callLeg.vencimento, 
            dias_uteis: callLeg.dias_uteis ?? 0, 
            strike_description: `R$ ${K?.toFixed(2)}`,
            
            // ✅ CORREÇÃO: Inclusão da propriedade 'asset_price'
            asset_price: assetPrice, 
            
            // --- Fluxo de Caixa e Natureza ---
            net_premium: netPremiumUnitario, 
            cash_flow_bruto: cashFlowBruto,
            cash_flow_liquido: cash_flow_liquido,
            initialCashFlow: cashFlowBruto, 
            natureza: natureza,

            // --- Risco e Retorno ---
            risco_maximo: risco_maximo,
            lucro_maximo: lucro_maximo, 
            max_profit: max_profit,
            max_loss: max_loss,
            
            current_pnl: 0, 
            current_price: 0, 

            // --- Pontos Chave ---
            breakEvenPoints: breakEvenPoints, 
            breakeven_low: breakeven1, 
            breakeven_high: breakeven2, 
            
            // --- Propriedades de Estrutura ---
            width: width, 
            minPriceToMaxProfit: minPriceToMaxProfit, 
            maxPriceToMaxProfit: maxPriceToMaxProfit, 
            
            // --- Métrica de Performance e Priorização ---
            risco_retorno_unitario: roi, 
            rentabilidade_max: roi,
            roi: roi, 
            margem_exigida: max_profit as number,
            probabilidade_sucesso: 0, 
            score: 0, 
            should_close: false,
            
            // --- Detalhes ---
            pernas: pernas, 
            greeks: greeks, 
        } as StrategyMetrics;
    }
}