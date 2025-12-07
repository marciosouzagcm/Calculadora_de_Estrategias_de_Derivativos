// src/strategies/BearPutSpread.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, ProfitLossValue, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

// Constantes fictícias (mantidas apenas para referência, mas o cálculo deve usar feePerLeg)
const FEES = 0.50; 
const LOT_SIZE = 1; 

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
            points.push({ assetPrice: K1 + 5, profitLoss: -metrics.max_loss as number }); 
            // Ponto 2: Breakeven Point
            points.push({ assetPrice: bep, profitLoss: 0 }); 
            // Ponto 3: Lucro Máximo (Abaixo de K2)
            points.push({ assetPrice: K2 - 5, profitLoss: metrics.max_profit as number }); 
        }
        return points;
    }

    /**
     * @inheritdoc IStrategy.calculateMetrics
     * 🎯 CORREÇÃO: Inclusão dos parâmetros 'assetPrice' e 'feePerLeg'
     */
    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        // 🎯 CORREÇÃO DE TIPAGEM: Tipar os parâmetros do sort
        const putLegs = legData.filter(leg => leg.tipo === 'PUT').sort((a: OptionLeg, b: OptionLeg) => (b.strike ?? 0) - (a.strike ?? 0));
        
        if (putLegs.length !== 2) return null;

        const K1_long = putLegs[0];  // Strike Maior (Compra)
        const K2_short = putLegs[1]; // Strike Menor (Venda)
        
        const K1 = K1_long.strike;
        const K2 = K2_short.strike;

        if (K1 === null || K2 === null || K1 <= K2 || K1_long.vencimento !== K2_short.vencimento) return null;

        // --- 1. Fluxo de Caixa ---
        const multiplicadorContrato = LOT_SIZE; 
        // Net Premium: Prêmio Compra K1 - Prêmio Venda K2. Deve ser positivo (Débito).
        const netPremiumUnitario = K1_long.premio - K2_short.premio;
        
        if (netPremiumUnitario <= 0) return null; // Deve ser um Débito Líquido

        const cashFlowBruto = netPremiumUnitario * multiplicadorContrato;
        const natureza: NaturezaOperacao = 'DÉBITO';
        
        // 🎯 CORREÇÃO/AJUSTE: Usar a taxa real por perna
        const totalFees = feePerLeg * 2; 
        const cash_flow_liquido = cashFlowBruto + totalFees; // Débito líquido = Débito Bruto + Taxas

        // --- 2. Risco e Retorno ---
        const widthUnitario = K1 - K2; 
        const width = widthUnitario * multiplicadorContrato; 
        
        // Risco Máximo (Max Loss): Débito líquido (custo total da operação)
        const risco_maximo: ProfitLossValue = cash_flow_liquido; 
        const max_loss: ProfitLossValue = risco_maximo;

        // Lucro Máximo (Max Profit): Largura do Spread - Débito Bruto - Taxas
        const lucro_maximo_total = width - cashFlowBruto - totalFees;
        const lucro_maximo: ProfitLossValue = lucro_maximo_total;
        const max_profit: ProfitLossValue = lucro_maximo;

        // --- 3. Pontos Chave ---
        // Breakeven (Put: K1 - Débito Líquido Unitário)
        const breakeven = K1 - netPremiumUnitario; 
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
            { derivative: K2_short, direction: 'VENDA', multiplier: 1, display: generateDisplay(K2_short, 'VENDA', K2) },
        ];
        
        const roi = (max_profit as number) / (max_loss as number); 

        // --- 6. Agregação Final (Preenchendo TODOS os campos requeridos) ---
        return {
            // --- Identificação e Resumo ---
            name: this.name,
            asset: K1_long.ativo_subjacente,
            spread_type: 'VERTICAL PUT',
            vencimento: K1_long.vencimento,
            expiration: K1_long.vencimento, 
            dias_uteis: K1_long.dias_uteis ?? 0, 
            strike_description: `R$ ${K1?.toFixed(2)} / R$ ${K2?.toFixed(2)}`,
            
            // 🎯 CORREÇÃO CRÍTICA: Incluir a propriedade 'asset_price'
            asset_price: assetPrice, 
            
            // --- Fluxo de Caixa e Natureza ---
            net_premium: netPremiumUnitario, 
            cash_flow_bruto: cashFlowBruto,
            cash_flow_liquido: cash_flow_liquido,
            initialCashFlow: -cashFlowBruto, // Débito inicial é negativo
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
            breakeven_low: breakeven, 
            breakeven_high: breakeven, 
            
            // --- Propriedades de Estrutura ---
            width: width, 
            minPriceToMaxProfit: minPriceToMaxProfit, 
            maxPriceToMaxProfit: maxPriceToMaxProfit, 
            
            // --- Métrica de Performance e Priorização ---
            risco_retorno_unitario: roi, 
            rentabilidade_max: roi,
            roi: roi, 
            margem_exigida: max_loss as number,
            probabilidade_sucesso: 0, 
            score: 0, 
            should_close: false,
            
            // --- Detalhes ---
            pernas: pernas, 
            greeks: greeks, 
        } as StrategyMetrics;
    }
}