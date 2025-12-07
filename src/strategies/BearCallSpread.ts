// src/strategies/BearCallSpread.ts

import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, ProfitLossValue, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

// Constantes fictícias (Estas serão passadas como argumentos ou obtidas de forma dinâmica)
// NOTA: 'FEES' global foi removida, pois a taxa é calculada dinamicamente com base em feePerLeg.
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
    
    // MÉTODO REQUERIDO: generatePayoff 
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        const points: Array<{ assetPrice: number; profitLoss: number }> = [];
        const K1 = (metrics.pernas.find(p => p.direction === 'VENDA')?.derivative.strike) ?? 0;
        const K2 = (metrics.pernas.find(p => p.direction === 'COMPRA')?.derivative.strike) ?? 0;

        // Apenas um exemplo de pontos, a curva real seria mais detalhada
        if (K1 > 0 && K2 > K1 && metrics.breakEvenPoints.length > 0) {
            const bep = metrics.breakEvenPoints[0] as number;
            
            // Ponto 1: Lucro Máximo (Abaixo de K1)
            points.push({ assetPrice: K1 - 5, profitLoss: metrics.max_profit as number }); 
            // Ponto 2: Breakeven Point
            points.push({ assetPrice: bep, profitLoss: 0 }); 
            // Ponto 3: Prejuízo Máximo (Acima de K2)
            points.push({ assetPrice: K2 + 5, profitLoss: metrics.max_loss as number }); // max_loss é negativo na métrica
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

        if (K1 === null || K2 === null || K1 >= K2 || K1_short.vencimento !== K2_long.vencimento) return null;

        // --- 1. Fluxo de Caixa ---
        const multiplicadorContrato = LOT_SIZE; 
        const netPremiumUnitario = K1_short.premio - K2_long.premio;
        
        // Deve ser uma operação a crédito para ser um Bear Call Spread
        if (netPremiumUnitario <= 0) return null; 

        const cashFlowBruto = netPremiumUnitario * multiplicadorContrato;
        const natureza: NaturezaOperacao = 'CRÉDITO';
        
        // CÁLCULO DINÂMICO DA TAXA: Taxa por perna * Número de pernas (2)
        const totalFees = feePerLeg * 2; 
        const cash_flow_liquido = cashFlowBruto - totalFees; // Crédito líquido = Prêmio Bruto - Taxas

        // --- 2. Risco e Retorno ---
        const widthUnitario = K2 - K1; 
        const width = widthUnitario * multiplicadorContrato; 
        
        // Lucro Máximo (Se o preço do ativo ficar abaixo de K1 no vencimento)
        const max_profit: ProfitLossValue = cash_flow_liquido;

        // Prejuízo Máximo (Se o preço do ativo subir acima de K2 no vencimento)
        const risco_maximo_bruto = width - cashFlowBruto; 
        // O risco total é (Largura - Crédito Bruto) + Taxas
        const max_loss: ProfitLossValue = risco_maximo_bruto + totalFees;

        // --- 3. Pontos Chave ---
        const breakeven = K1 + netPremiumUnitario; // K1 + Prêmio Líquido
        const breakEvenPoints = [breakeven]; 
        
        const minPriceToMaxProfit = 0; 
        const maxPriceToMaxProfit = K1; 

        // --- 4. Gregas ---
        // A grega combinada é a soma ponderada. Venda = -1; Compra = +1.
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
        
        const roi = (max_profit as number) / (max_loss as number);

        // --- 6. Agregação Final (COM AS PROPRIEDADES NECESSÁRIAS) ---
        return {
            name: this.name,
            asset: K1_short.ativo_subjacente,
            spread_type: 'VERTICAL CALL',
            vencimento: K1_short.vencimento,
            expiration: K1_short.vencimento, 
            dias_uteis: K1_short.dias_uteis ?? 0, 
            strike_description: `R$ ${K1?.toFixed(2)} / R$ ${K2?.toFixed(2)}`,
            
            // 🎯 PROPRIEDADE CORRIGIDA (TS2352)
            asset_price: assetPrice, 

            net_premium: netPremiumUnitario, 
            cash_flow_bruto: cashFlowBruto,
            cash_flow_liquido: cash_flow_liquido,
            initialCashFlow: cash_flow_liquido, // Usa o líquido no fluxo inicial
            natureza: natureza,

            risco_maximo: max_loss,
            lucro_maximo: max_profit, 
            
            max_profit: max_profit,
            max_loss: max_loss,
            
            current_pnl: 0, 
            current_price: assetPrice, // Deve usar o preço atual

            breakEvenPoints: breakEvenPoints, 
            breakeven_low: breakeven, 
            breakeven_high: breakeven, 
            
            width: width, 
            minPriceToMaxProfit: minPriceToMaxProfit,
            maxPriceToMaxProfit: maxPriceToMaxProfit,
            
            risco_retorno_unitario: roi, 
            rentabilidade_max: roi,
            roi: roi, 
            margem_exigida: max_loss as number,
            probabilidade_sucesso: 0, 
            score: 0, 
            should_close: false,
            
            pernas: pernas, 
            greeks: greeks,
        } as StrategyMetrics;
    }
}