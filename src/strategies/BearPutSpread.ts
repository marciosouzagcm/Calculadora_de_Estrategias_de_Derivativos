// src/strategies/BearPutSpread.ts

import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, ProfitLossValue, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

// Constantes fictícias (mantidas apenas para referência, mas o cálculo deve usar feePerLeg)
const FEES = 0.50; 
const LOT_SIZE = 1; // Mantido 1 para indicar que os cálculos são unitários

// Função auxiliar para gerar a string de display
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.ativo_subjacente} K${strikeStr}`;
}

export class BearPutSpread implements IStrategy {
    
    public readonly name: string = 'Bear Put Spread (Débito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'BAIXA'; // Visão: Baixa
    
    getDescription(): string {
        return 'Estratégia de Baixa (Bearish) a Débito. Compra Put de strike alto (K1) e Vende Put de strike baixo (K2).';
    }

    getLegCount(): number {
        return 2;
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        const points: Array<{ assetPrice: number; profitLoss: number }> = [];
        const K1 = (metrics.pernas.find(p => p.direction === 'COMPRA')?.derivative.strike) ?? 0;
        const K2 = (metrics.pernas.find(p => p.direction === 'VENDA')?.derivative.strike) ?? 0;

        if (K1 > K2 && K2 > 0 && metrics.breakEvenPoints.length > 0) {
            const bep = metrics.breakEvenPoints[0] as number;
            
            // Ponto 1: Prejuízo Máximo (Acima de K1)
            // metrics.max_loss é o valor total de débito (positivo)
            points.push({ assetPrice: K1 + 5, profitLoss: -(metrics.max_loss as number) * 100 }); 
            // Ponto 2: Breakeven Point
            points.push({ assetPrice: bep, profitLoss: 0 }); 
            // Ponto 3: Lucro Máximo (Abaixo de K2)
            points.push({ assetPrice: K2 - 5, profitLoss: (metrics.max_profit as number) * 100 }); 
        }
        return points;
    }

    /**
     * @inheritdoc IStrategy.calculateMetrics
     */
    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        // Put K1 > Put K2, ordenar pelo strike decrescente
        const putLegs = legData.filter(leg => leg.tipo === 'PUT').sort((a: OptionLeg, b: OptionLeg) => (b.strike ?? 0) - (a.strike ?? 0));
        
        if (putLegs.length !== 2) return null;

        const K1_long = putLegs[0];  // Strike Maior (Compra)
        const K2_short = putLegs[1]; // Strike Menor (Venda)
        
        const K1 = K1_long.strike;
        const K2 = K2_short.strike;

        if (K1 === null || K2 === null || K1 <= K2 || K1_long.vencimento !== K2_short.vencimento) return null;

        // --- 1. Fluxo de Caixa (UNITÁRIO) ---
        
        // Débito Bruto Unitário (Custo Unitário da Opção)
        const cashFlowBrutoUnitario = K1_long.premio - K2_short.premio;
        
        if (cashFlowBrutoUnitario <= 0) return null; // Deve ser um Débito Líquido

        const natureza: NaturezaOperacao = 'DÉBITO';
        
        // Taxa Unitária por Ação (Total fees / Lote)
        const totalFeesUnitario = (feePerLeg * 2) / 100; // Assumindo lote = 100
        
        // Débito Líquido Unitário (Custo Total da Operação por Ação)
        const cash_flow_liquido_unitario = cashFlowBrutoUnitario + totalFeesUnitario; 

        // --- 2. Risco e Retorno (UNITÁRIO) ---
        const widthUnitario = K1 - K2; 
        
        // Risco Máximo (Max Loss): Débito líquido unitário (custo total da operação por ação)
        const max_loss: ProfitLossValue = cash_flow_liquido_unitario;
        
        // Lucro Máximo (Max Profit): Largura do Spread - Débito Líquido Unitário
        const max_profit: ProfitLossValue = widthUnitario - cash_flow_liquido_unitario;

        // --- 3. Pontos Chave ---
        // Breakeven (Put: K1 - Débito BRUTO Unitário)
        // Nota: O BEP deve usar o prêmio bruto, pois as taxas são custos fixos que não alteram a paridade de mercado.
        const breakeven = K1 - cashFlowBrutoUnitario; 
        const breakEvenPoints = [breakeven]; 
        
        // Lucro Máximo é atingido quando o preço do ativo é <= K2
        const minPriceToMaxProfit = 0; 
        const maxPriceToMaxProfit = K2; 

        // --- 4. Gregas ---
        const greeks: Greeks = {
            delta: (K1_long.gregas_unitarias.delta ?? 0) * 1 + (K2_short.gregas_unitarias.delta ?? 0) * -1,
            gamma: (K1_long.gregas_unitarias.gamma ?? 0) * 1 + (K2_short.gregas_unitarias.gamma ?? 0) * -1,
            theta: (K1_long.gregas_unitarias.theta ?? 0) * 1 + (K2_short.gregas_unitarias.theta ?? 0) * -1,
            vega: (K1_long.gregas_unitarias.vega ?? 0) * 1 + (K2_short.gregas_unitarias.vega ?? 0) * -1,
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            { derivative: K1_long, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K1_long, 'COMPRA', K1) },
            { derivative: K2_short, direction: 'VENDA', multiplier: -1, display: generateDisplay(K2_short, 'VENDA', K2) }, // Multiplier -1 para Venda
        ];
        
        const roi = (max_loss as number) > 0 ? (max_profit as number) / (max_loss as number) : 0; 

        // --- 6. Agregação Final (Valores UNITÁRIOS) ---
        return {
            name: this.name,
            asset: K1_long.ativo_subjacente,
            spread_type: 'VERTICAL PUT',
            vencimento: K1_long.vencimento,
            expiration: K1_long.vencimento, 
            dias_uteis: K1_long.dias_uteis ?? 0, 
            strike_description: `R$ ${K1?.toFixed(2)} / R$ ${K2?.toFixed(2)}`,
            
            asset_price: assetPrice, 
            
            // --- Fluxo de Caixa e Natureza (UNITÁRIOS) ---
            net_premium: cashFlowBrutoUnitario, // Prémio Bruto Unitário
            cash_flow_bruto: cashFlowBrutoUnitario,
            cash_flow_liquido: cash_flow_liquido_unitario,
            initialCashFlow: -cashFlowBrutoUnitario, // Débito inicial Bruto (negativo)
            natureza: natureza,

            // --- Risco e Retorno (UNITÁRIOS) ---
            risco_maximo: max_loss, // Custo Total por ação (unitário)
            lucro_maximo: max_profit, // Lucro Líquido por ação (unitário)
            max_profit: max_profit,
            max_loss: max_loss, // O max_loss é o risco (positivo)

            current_pnl: 0, 
            current_price: assetPrice, // Corrigido para assetPrice
            
            // --- Pontos Chave ---
            breakEvenPoints: breakEvenPoints, 
            breakeven_low: breakeven, 
            breakeven_high: breakeven, 
            
            // --- Propriedades de Estrutura ---
            width: widthUnitario, // Largura Unitária
            minPriceToMaxProfit: minPriceToMaxProfit, 
            maxPriceToMaxProfit: maxPriceToMaxProfit, 
            
            // --- Métrica de Performance e Priorização ---
            risco_retorno_unitario: roi, 
            rentabilidade_max: roi,
            roi: roi, 
            margem_exigida: cashFlowBrutoUnitario, // Margem para Débito é o custo BRUTO (unitário)
            probabilidade_sucesso: 0, 
            score: 0, 
            should_close: false,
            
            // --- Detalhes ---
            pernas: pernas, 
            greeks: greeks, 
        } as StrategyMetrics;
    }
}