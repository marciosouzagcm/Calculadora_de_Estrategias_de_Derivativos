// src/strategies/BearCallSpread.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, ProfitLossValue, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

// Constantes fictícias (assumindo que estas existem no seu ambiente)
const FEES = 0.50; 
const LOT_SIZE = 1; 

// Função auxiliar para gerar a string de display
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.ativo_subjacente} K${strikeStr}`;
}

export class BearCallSpread implements IStrategy {
    
    // 📢 Propriedades 'readonly' requeridas pela IStrategy
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

        if (K1 > 0 && K2 > K1 && metrics.breakEvenPoints.length > 0) {
            const bep = metrics.breakEvenPoints[0] as number;
            
            // Ponto 1: Lucro Máximo (Abaixo de K1)
            points.push({ assetPrice: K1 - 5, profitLoss: metrics.max_profit as number }); 
            // Ponto 2: Breakeven Point
            points.push({ assetPrice: bep, profitLoss: 0 }); 
            // Ponto 3: Prejuízo Máximo (Acima de K2)
            points.push({ assetPrice: K2 + 5, profitLoss: -metrics.max_loss as number }); 
        }
        return points;
    }

    calculateMetrics(legData: OptionLeg[]): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        const callLegs = legData.filter(leg => leg.tipo === 'CALL').sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
        
        if (callLegs.length !== 2) return null;

        const K1_short = callLegs[0]; // Strike Menor (Venda)
        const K2_long = callLegs[1];  // Strike Maior (Compra)
        
        const K1 = K1_short.strike;
        const K2 = K2_long.strike;

        if (K1 === null || K2 === null || K1 >= K2 || K1_short.vencimento !== K2_long.vencimento) return null;

        // --- 1. Fluxo de Caixa ---
        const multiplicadorContrato = LOT_SIZE; 
        const netPremiumUnitario = K1_short.premio - K2_long.premio;
        
        if (netPremiumUnitario <= 0) return null; 

        const cashFlowBruto = netPremiumUnitario * multiplicadorContrato;
        const natureza: NaturezaOperacao = 'CRÉDITO';
        const cash_flow_liquido = cashFlowBruto - FEES;

        // --- 2. Risco e Retorno ---
        const widthUnitario = K2 - K1; 
        const width = widthUnitario * multiplicadorContrato; // 📢 CALCULADA
        
        const lucro_maximo: ProfitLossValue = cash_flow_liquido; 
        const max_profit: ProfitLossValue = cash_flow_liquido;

        const risco_maximo_total = width - cashFlowBruto + FEES;
        const risco_maximo: ProfitLossValue = risco_maximo_total;
        const max_loss: ProfitLossValue = risco_maximo_total;

        // --- 3. Pontos Chave ---
        const breakeven = K1 + netPremiumUnitario; 
        const breakEvenPoints = [breakeven]; 
        
        // Lucro Máximo é atingido quando o preço do ativo é <= K1
        const minPriceToMaxProfit = 0; // 📢 CALCULADA
        const maxPriceToMaxProfit = K1; // 📢 CALCULADA

        // --- 4. Gregas ---
        const greeks: Greeks = {
            delta: (K1_short.gregas_unitarias.delta ?? 0) * -1 + (K2_long.gregas_unitarias.delta ?? 0) * 1,
            gamma: (K1_short.gregas_unitarias.gamma ?? 0) * -1 + (K2_long.gregas_unitarias.gamma ?? 0) * 1,
            theta: (K1_short.gregas_unitarias.theta ?? 0) * -1 + (K2_long.gregas_unitarias.theta ?? 0) * 1,
            vega: (K1_short.gregas_unitarias.vega ?? 0) * -1 + (K2_long.gregas_unitarias.vega ?? 0) * 1,
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            { derivative: K1_short, direction: 'VENDA', multiplier: 1, display: generateDisplay(K1_short, 'VENDA', K1) },
            { derivative: K2_long, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K2_long, 'COMPRA', K2) },
        ];
        
        const roi = (max_profit as number) / (max_loss as number);

        // --- 6. Agregação Final (AGORA COM TODAS AS PROPRIEDADES) ---
        return {
            name: this.name,
            asset: K1_short.ativo_subjacente,
            spread_type: 'VERTICAL CALL',
            vencimento: K1_short.vencimento,
            expiration: K1_short.vencimento, 
            dias_uteis: K1_short.dias_uteis ?? 0, 
            strike_description: `R$ ${K1?.toFixed(2)} / R$ ${K2?.toFixed(2)}`,
            
            net_premium: netPremiumUnitario, 
            cash_flow_bruto: cashFlowBruto,
            cash_flow_liquido: cash_flow_liquido,
            initialCashFlow: cashFlowBruto, 
            natureza: natureza,

            risco_maximo: risco_maximo,
            lucro_maximo: lucro_maximo, 
            
            max_profit: max_profit,
            max_loss: max_loss,
            
            current_pnl: 0, 
            current_price: 0, 

            breakEvenPoints: breakEvenPoints, 
            breakeven_low: breakeven, 
            breakeven_high: breakeven, 
            
            // 📢 PROPRIEDADES CORRIGIDAS/INCLUÍDAS
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