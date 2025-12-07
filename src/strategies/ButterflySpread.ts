// src/strategies/ButterflySpread.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, ProfitLossValue, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

// Constantes fictícias
const LOT_SIZE = 1; 

// Função auxiliar para gerar a string de display
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.ativo_subjacente} K${strikeStr}`;
}

export class ButterflySpread implements IStrategy {
    
    public readonly name: string = 'Long Butterfly Call (Débito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA'; // Visão: Baixa Volatilidade
    
    getDescription(): string {
        return 'Estratégia de baixa volatilidade (neutra) a Débito. Compra 1 Call K1 (baixo), Vende 2 Calls K2 (meio, ATM) e Compra 1 Call K3 (alto).';
    }

    getLegCount(): number {
        return 3; // Long Butterfly Call: 1-2-1
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        const points: Array<{ assetPrice: number; profitLoss: number }> = [];
        const K1 = (metrics.pernas.find(p => p.multiplier === 1)?.derivative.strike) ?? 0; // Compra K1
        const K2 = (metrics.pernas.find(p => p.multiplier === 2)?.derivative.strike) ?? 0; // Venda K2
        const K3 = (metrics.pernas.filter(p => p.multiplier === 1)[1]?.derivative.strike) ?? 0; // Compra K3

        if (K1 < K2 && K2 < K3 && metrics.breakEvenPoints.length === 2) {
            const bep1 = metrics.breakEvenPoints[0] as number;
            const bep2 = metrics.breakEvenPoints[1] as number;
            
            // Ponto 1: Prejuízo Máximo (Abaixo de K1)
            points.push({ assetPrice: K1 - 5, profitLoss: -metrics.max_loss as number }); 
            // Ponto 2: Breakeven Point 1
            points.push({ assetPrice: bep1, profitLoss: 0 }); 
            // Ponto 3: Lucro Máximo (No K2 - Meio)
            points.push({ assetPrice: K2, profitLoss: metrics.max_profit as number }); 
            // Ponto 4: Breakeven Point 2
            points.push({ assetPrice: bep2, profitLoss: 0 });
            // Ponto 5: Prejuízo Máximo (Acima de K3)
            points.push({ assetPrice: K3 + 5, profitLoss: -metrics.max_loss as number });
        }
        return points;
    }
    
    /**
     * @inheritdoc IStrategy.calculateMetrics
     * 🎯 CORREÇÃO: Inclusão dos parâmetros 'assetPrice' e 'feePerLeg'
     */
    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        // A Borboleta (Butterfly) precisa de 3 pernas: 1 compra, 2 vendas, 1 compra
        if (legData.length !== 3) return null;

        // Ordenar por strike ascendente (K1 < K2 < K3)
        const callLegs = legData.filter(leg => leg.tipo === 'CALL').sort((a: OptionLeg, b: OptionLeg) => (a.strike ?? 0) - (b.strike ?? 0));
        
        if (callLegs.length !== 3) return null;

        const K1_long = callLegs[0];  // Strike Menor (Compra)
        const K2_short = callLegs[1]; // Strike Médio (Venda - Multiplicador 2)
        const K3_long = callLegs[2];  // Strike Maior (Compra)

        const K1 = K1_long.strike;
        const K2 = K2_short.strike;
        const K3 = K3_long.strike;
        
        // As pernas K1, K2 e K3 devem ter o mesmo vencimento
        if (K1 === null || K2 === null || K3 === null || K1 >= K2 || K2 >= K3 || K1_long.vencimento !== K2_short.vencimento || K2_short.vencimento !== K3_long.vencimento) return null;

        // --- 1. Fluxo de Caixa ---
        const multiplicadorContrato = LOT_SIZE; 
        
        // Débito Bruto = (Prêmio K1 * 1) + (Prêmio K3 * 1) - (Prêmio K2 * 2)
        const cashFlowBrutoUnitario = K1_long.premio + K3_long.premio - (K2_short.premio * 2);
        
        // Numa Long Butterfly, o resultado deve ser um Débito (cashFlowBrutoUnitario > 0)
        if (cashFlowBrutoUnitario <= 0) return null; 

        const cashFlowBruto = cashFlowBrutoUnitario * multiplicadorContrato;
        const natureza: NaturezaOperacao = 'DÉBITO';
        
        // Total de pernas = 4 (1 Compra + 2 Vendas + 1 Compra)
        const totalFees = feePerLeg * 4; 
        const cash_flow_liquido = cashFlowBruto + totalFees; // Débito líquido = Débito Bruto + Taxas

        // --- 2. Risco e Retorno ---
        const widthUnitario = K2 - K1; // Largura entre strikes (K2 - K1 ou K3 - K2)
        const width = widthUnitario * multiplicadorContrato; 
        
        // Risco Máximo (Max Loss): Débito líquido (custo total da operação)
        const risco_maximo: ProfitLossValue = cash_flow_liquido; 
        const max_loss: ProfitLossValue = risco_maximo;

        // Lucro Máximo (Max Profit): Largura do Spread (K2-K1) - Débito Bruto - Taxas
        const lucro_maximo_total = width - cashFlowBruto - totalFees;
        const lucro_maximo: ProfitLossValue = lucro_maximo_total;
        const max_profit: ProfitLossValue = lucro_maximo;
        
        // --- 3. Pontos Chave ---
        // Breakeven 1 (Inferior): K1 + Débito Líquido Unitário
        const breakeven1 = K1 + cashFlowBrutoUnitario; 
        // Breakeven 2 (Superior): K3 - Débito Líquido Unitário
        const breakeven2 = K3 - cashFlowBrutoUnitario; 
        const breakEvenPoints = [breakeven1, breakeven2]; 

        // Lucro Máximo é atingido em K2
        const minPriceToMaxProfit = K2; 
        const maxPriceToMaxProfit = K2; 

        // --- 4. Gregas ---
        const greeks: Greeks = {
            delta: (K1_long.gregas_unitarias.delta ?? 0) * 1 + (K2_short.gregas_unitarias.delta ?? 0) * -2 + (K3_long.gregas_unitarias.delta ?? 0) * 1,
            gamma: (K1_long.gregas_unitarias.gamma ?? 0) * 1 + (K2_short.gregas_unitarias.gamma ?? 0) * -2 + (K3_long.gregas_unitarias.gamma ?? 0) * 1,
            theta: (K1_long.gregas_unitarias.theta ?? 0) * 1 + (K2_short.gregas_unitarias.theta ?? 0) * -2 + (K3_long.gregas_unitarias.theta ?? 0) * 1,
            vega: (K1_long.gregas_unitarias.vega ?? 0) * 1 + (K2_short.gregas_unitarias.vega ?? 0) * -2 + (K3_long.gregas_unitarias.vega ?? 0) * 1,
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            { derivative: K1_long, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K1_long, 'COMPRA', K1) },
            { derivative: K2_short, direction: 'VENDA', multiplier: 2, display: generateDisplay(K2_short, 'VENDA', K2) }, // Multiplier 2
            { derivative: K3_long, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K3_long, 'COMPRA', K3) },
        ];
        
        const roi = (max_profit as number) / (max_loss as number); 
        
        // --- 6. Agregação Final (Preenchendo TODOS os campos requeridos) ---
        return {
            // --- Identificação e Resumo ---
            name: this.name,
            asset: K1_long.ativo_subjacente,
            spread_type: 'BUTTERFLY CALL',
            vencimento: K1_long.vencimento,
            expiration: K1_long.vencimento, 
            dias_uteis: K1_long.dias_uteis ?? 0, 
            strike_description: `R$ ${K1?.toFixed(2)} / R$ ${K2?.toFixed(2)} / R$ ${K3?.toFixed(2)}`,
            
            // 🎯 CORREÇÃO CRÍTICA: Incluir a propriedade 'asset_price'
            asset_price: assetPrice, 
            
            // --- Fluxo de Caixa e Natureza ---
            net_premium: cashFlowBrutoUnitario, // Net premium unitário (custo)
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