// src/strategies/BearCallSpread.ts (CORRIGIDO)

import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, ProfitLossValue, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

// Constantes fictícias (Mantido 1 para cálculos unitários - o multiplicador virá do index.ts via LOT_SIZE)
const LOT_SIZE = 1; 

// Função auxiliar para gerar a string de display
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.ativo_subjacente} K${strikeStr}`;
}

export class BearCallSpread implements IStrategy {
    
    public readonly name: string = 'Bear Call Spread (Crédito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'BAIXA'; // Visão: Baixa
    
    getDescription(): string {
        return 'Estratégia de Baixa (Bearish) a Crédito. Vende Call de strike baixo (K1) e Compra Call de strike alto (K2).';
    }

    getLegCount(): number {
        return 2;
    }
    
    // O Payoff aqui usa os valores brutos. O PayoffCalculator ajustará para curva detalhada.
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        const points: Array<{ assetPrice: number; profitLoss: number }> = [];
        const K1 = (metrics.pernas.find(p => p.direction === 'VENDA')?.derivative.strike) ?? 0;
        const K2 = (metrics.pernas.find(p => p.direction === 'COMPRA')?.derivative.strike) ?? 0;

        if (K1 > 0 && K2 > K1 && metrics.breakEvenPoints.length > 0) {
            const bep = metrics.breakEvenPoints[0] as number;
            
            // Ponto 1: Lucro Máximo (Abaixo de K1) - Valor LÍQUIDO (max_profit)
            points.push({ assetPrice: K1 - 5, profitLoss: metrics.max_profit as number }); 
            // Ponto 2: Breakeven Point
            points.push({ assetPrice: bep, profitLoss: 0 }); 
            // Ponto 3: Prejuízo Máximo (Acima de K2) - Valor LÍQUIDO (max_loss é negativo)
            points.push({ assetPrice: K2 + 5, profitLoss: metrics.max_loss as number }); 
        }
        return points;
    }

    // 🎯 ASSINATURA CORRIGIDA: Recebe o preço do ativo e a taxa por perna
    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        const callLegs = legData.filter(leg => leg.tipo === 'CALL').sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
        
        if (callLegs.length !== 2) return null;

        const K1_short = callLegs[0]; // Strike Menor (Venda - Deve ter prêmio maior)
        const K2_long = callLegs[1];  // Strike Maior (Compra - Deve ter prêmio menor)
        
        const K1 = K1_short.strike;
        const K2 = K2_long.strike;

        // 🚨 Regra de Vencimento
        if (K1 === null || K2 === null || K1 >= K2 || K1_short.vencimento !== K2_long.vencimento) return null;

        // --- 1. Fluxo de Caixa ---
        // Prêmio Bruto (Unitário) = Venda - Compra
        const netPremiumUnitario = K1_short.premio - K2_long.premio;
        
        // Deve ser uma operação a crédito para ser um Bear Call Spread
        if (netPremiumUnitario <= 0) return null; 

        const cashFlowBrutoUnitario = netPremiumUnitario;
        const cashFlowBrutoTotal = netPremiumUnitario * LOT_SIZE; // Total da operação (Bruto)
        const natureza: NaturezaOperacao = 'CRÉDITO';
        
        // CÁLCULO DINÂMICO DA TAXA (por ação)
        const totalFeesUnitario = (feePerLeg * 2) / LOT_SIZE; // Taxa unitária por ação
        
        // Crédito líquido Unitário = Prêmio Bruto Unitário - Taxas Unitárias
        const cash_flow_liquido_unitario = cashFlowBrutoUnitario - totalFeesUnitario; 

        // --- 2. Risco e Retorno (Líquido e Unitário) ---
        const widthUnitario = K2 - K1; 
        
        // Lucro Máximo Líquido (Unitário)
        // Ocorre se preço <= K1. Lucro é o crédito líquido que você recebeu.
        const max_profit: ProfitLossValue = cash_flow_liquido_unitario;

        // Prejuízo Máximo Líquido (Unitário)
        // Ocorre se preço >= K2.
        // Prejuízo = (Largura Unitária) - (Crédito Líquido Unitário)
        // NOTA: O max_loss deve ser negativo para representar perda no Payoff.
        const max_loss_unitario = (widthUnitario) - cash_flow_liquido_unitario;
        const max_loss: ProfitLossValue = -max_loss_unitario; // 🎯 CORREÇÃO: Deve ser negativo

        // --- 3. Pontos Chave ---
        const breakeven = K1 + cashFlowBrutoUnitario; // K1 + Prêmio Líquido (Bruto)
        // Nota: Breakeven é calculado com o prêmio bruto, pois a taxa é um custo fixo que não muda o ponto de empate.
        const breakEvenPoints = [breakeven]; 
        
        const minPriceToMaxProfit = 0; 
        const maxPriceToMaxProfit = K1; 

        // --- 4. Gregas ---
        const greeks: Greeks = {
            delta: (K1_short.gregas_unitarias.delta ?? 0) * -1 + (K2_long.gregas_unitarias.delta ?? 0) * 1,
            gamma: (K1_short.gregas_unitarias.gamma ?? 0) * -1 + (K2_long.gregas_unitarias.gamma ?? 0) * 1,
            theta: (K1_short.gregas_unitarias.theta ?? 0) * -1 + (K2_long.gregas_unitarias.theta ?? 0) * 1,
            vega: (K1_short.gregas_unitarias.vega ?? 0) * -1 + (K2_long.gregas_unitarias.vega ?? 0) * 1,
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            { derivative: K1_short, direction: 'VENDA', multiplier: -1, display: generateDisplay(K1_short, 'VENDA', K1) },
            { derivative: K2_long, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K2_long, 'COMPRA', K2) },
        ];
        
        // 🎯 CÁLCULO DO ROI/RISCO RETORNO COM BASE NOS VALORES UNITÁRIOS E ABSOLUTOS
        const risco_retorno = max_loss_unitario > 0 ? (max_profit as number) / max_loss_unitario : 0;

        // --- 6. Agregação Final ---
        return {
            name: this.name,
            asset: K1_short.ativo_subjacente,
            spread_type: 'VERTICAL CALL',
            vencimento: K1_short.vencimento,
            expiration: K1_short.vencimento, 
            dias_uteis: K1_short.dias_uteis ?? 0, 
            strike_description: `R$ ${K1?.toFixed(2)} / R$ ${K2?.toFixed(2)}`,
            
            asset_price: assetPrice, 

            net_premium: netPremiumUnitario, 
            cash_flow_bruto: cashFlowBrutoUnitario, // 🎯 CORREÇÃO: Usar unitário
            cash_flow_liquido: cash_flow_liquido_unitario,
            initialCashFlow: cash_flow_liquido_unitario, // 🎯 CORREÇÃO: Usar unitário líquido
            natureza: natureza,

            risco_maximo: max_loss, // 🎯 CORREÇÃO: Valor NEGATIVO (representa perda)
            lucro_maximo: max_profit, // Valor POSITIVO
            
            max_profit: max_profit,
            max_loss: max_loss,
            
            current_pnl: 0, 
            current_price: assetPrice, 

            breakEvenPoints: breakEvenPoints, 
            breakeven_low: breakeven, 
            breakeven_high: breakeven, 
            
            width: widthUnitario * LOT_SIZE, // 🎯 CORREÇÃO: Largura Total
            minPriceToMaxProfit: minPriceToMaxProfit,
            maxPriceToMaxProfit: maxPriceToMaxProfit,
            
            risco_retorno_unitario: risco_retorno, 
            rentabilidade_max: risco_retorno,
            roi: risco_retorno, 
            margem_exigida: max_loss_unitario, // 🎯 CORREÇÃO: Deve ser o valor absoluto (Risco por ação)
            probabilidade_sucesso: 0, 
            score: 0, 
            should_close: false,
            
            pernas: pernas, 
            greeks: greeks,
        } as StrategyMetrics;
    }
}