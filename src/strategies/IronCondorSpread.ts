// src/strategies/IronCondorSpread.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, ProfitLossValue, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

// Constantes fictícias
const LOT_SIZE = 100; // Assumimos 100 para converter a taxa por lote para taxa por ação

// Função auxiliar para gerar a string de display
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.ativo_subjacente} K${strikeStr}`;
}

export class IronCondorSpread implements IStrategy {
    
    public readonly name: string = 'Iron Condor (Crédito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA'; // Visão: Baixa Volatilidade (Estabilidade)
    
    getDescription(): string {
        return 'Estratégia de baixa volatilidade (neutra) a Crédito, combinando um Bull Put Spread e um Bear Call Spread. Vende opções centrais (K2 Put e K3 Call) e compra opções externas (K1 Put e K4 Call) para limitar o risco.';
    }

    getLegCount(): number {
        return 4; 
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        // O payoff do Iron Condor tem um formato de mesa (table top) 

//[Image of Iron Condor payoff diagram]

        const points: Array<{ assetPrice: number; profitLoss: number }> = [];
        
        // Identificação simplificada dos Strikes a partir das métricas
        const K1 = (metrics.pernas.find(p => p.derivative.tipo === 'PUT' && p.multiplier === 1)?.derivative.strike) ?? 0;
        const K2 = (metrics.pernas.find(p => p.derivative.tipo === 'PUT' && p.multiplier === -1)?.derivative.strike) ?? 0;
        const K3 = (metrics.pernas.find(p => p.derivative.tipo === 'CALL' && p.multiplier === -1)?.derivative.strike) ?? 0;
        const K4 = (metrics.pernas.find(p => p.derivative.tipo === 'CALL' && p.multiplier === 1)?.derivative.strike) ?? 0;

        if (K1 > 0 && K2 > 0 && K3 > 0 && K4 > 0 && metrics.breakEvenPoints.length === 2) {
            const bep1 = metrics.breakEvenPoints[0] as number;
            const bep2 = metrics.breakEvenPoints[1] as number;

            // Multiplica o PnL unitário por LOT_SIZE para o gráfico
            const maxLossTotal = (metrics.max_loss as number) * LOT_SIZE;
            const maxProfitTotal = (metrics.max_profit as number) * LOT_SIZE;
            
            // Ponto 1: Prejuízo Máximo (Abaixo de K1)
            points.push({ assetPrice: K1 - 5, profitLoss: -maxLossTotal }); 
            // Ponto 2: Breakeven Point 1
            points.push({ assetPrice: bep1, profitLoss: 0 }); 
            // Ponto 3: Lucro Máximo (Meio, entre K2 e K3)
            points.push({ assetPrice: (K2 + K3) / 2, profitLoss: maxProfitTotal }); 
            // Ponto 4: Breakeven Point 2
            points.push({ assetPrice: bep2, profitLoss: 0 });
            // Ponto 5: Prejuízo Máximo (Acima de K4)
            points.push({ assetPrice: K4 + 5, profitLoss: -maxLossTotal });
        }
        return points;
    }
    
    /**
     * @inheritdoc IStrategy.calculateMetrics
     */
    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 4) return null;

        // --- Classificação das Pernas ---
        const putLegs = legData.filter(leg => leg.tipo === 'PUT').sort((a: OptionLeg, b: OptionLeg) => (a.strike ?? 0) - (b.strike ?? 0));
        const callLegs = legData.filter(leg => leg.tipo === 'CALL').sort((a: OptionLeg, b: OptionLeg) => (a.strike ?? 0) - (b.strike ?? 0));
        
        if (putLegs.length !== 2 || callLegs.length !== 2) return null;

        // Put Spread (Bull Put - Crédito)
        const K1_long_put = putLegs[0];  // Strike Menor (Compra - Risco Limitado)
        const K2_short_put = putLegs[1]; // Strike Maior (Venda - Lucro)

        // Call Spread (Bear Call - Crédito)
        const K3_short_call = callLegs[0]; // Strike Menor (Venda - Lucro)
        const K4_long_call = callLegs[1];  // Strike Maior (Compra - Risco Limitado)
        
        const K1 = K1_long_put.strike;
        const K2 = K2_short_put.strike;
        const K3 = K3_short_call.strike;
        const K4 = K4_long_call.strike;
        
        // Condição para Iron Condor: K1 < K2 < K3 < K4, mesmo vencimento.
        if (K1 === null || K2 === null || K3 === null || K4 === null || K1 >= K2 || K2 >= K3 || K3 >= K4 || K1_long_put.vencimento !== K4_long_call.vencimento) return null;

        // --- 1. Fluxo de Caixa (UNITÁRIO) ---
        
        // Crédito Bruto Unitário = (Prêmio Venda K2 Put - Prêmio Compra K1 Put) + (Prêmio Venda K3 Call - Prêmio Compra K4 Call)
        const cashFlowBrutoUnitario = (K2_short_put.premio - K1_long_put.premio) + (K3_short_call.premio - K4_long_call.premio);
        
        // O Iron Condor deve ser um Crédito (cashFlowBrutoUnitario > 0)
        if (cashFlowBrutoUnitario <= 0) return null; 

        const natureza: NaturezaOperacao = 'CRÉDITO';
        
        // Taxa Unitária por Ação (Total fees / Lote)
        const totalFeesUnitario = (feePerLeg * 4) / LOT_SIZE; // 4 pernas
        
        // Crédito líquido Unitário = Crédito Bruto Unitário - Taxas Unitárias
        const cash_flow_liquido_unitario = cashFlowBrutoUnitario - totalFeesUnitario;

        // --- 2. Risco e Retorno (UNITÁRIO) ---
        
        // Lucro Máximo (Max Profit): Crédito líquido unitário (prêmio total recebido - taxas)
        const lucro_maximo: ProfitLossValue = cash_flow_liquido_unitario; 
        const max_profit: ProfitLossValue = lucro_maximo;

        // Risco Máximo (Max Loss) Unitário: É o maior Gap Unitário - Crédito Bruto Unitário + Taxas Unitárias
        const putWidthUnitario = K2 - K1; // Gap Put: K2 - K1
        const callWidthUnitario = K4 - K3; // Gap Call: K4 - K3
        const maxGapUnitario = Math.max(putWidthUnitario, callWidthUnitario);
        
        // Risco Máximo Unitário = Largura Máxima Unitária - Crédito Líquido Unitário
        const risco_maximo: ProfitLossValue = maxGapUnitario - cashFlowBrutoUnitario + totalFeesUnitario;
        const max_loss: ProfitLossValue = risco_maximo;

        // --- 3. Pontos Chave ---
        // Breakeven 1 (Inferior - Lado Put): K2 - Crédito Bruto Unitário
        const breakeven1 = K2 - cashFlowBrutoUnitario; 
        // Breakeven 2 (Superior - Lado Call): K3 + Crédito Bruto Unitário
        const breakeven2 = K3 + cashFlowBrutoUnitario; 
        const breakEvenPoints = [breakeven1, breakeven2]; 

        // Lucro Máximo é atingido entre K2 e K3
        const minPriceToMaxProfit = K2; 
        const maxPriceToMaxProfit = K3; 

        // --- 4. Gregas ---
        // Multiplicadores: Compra(1), Venda(-1)
        const greeks: Greeks = {
            // Put Long (K1, +1), Put Short (K2, -1), Call Short (K3, -1), Call Long (K4, +1)
            delta: (K1_long_put.gregas_unitarias.delta ?? 0) * 1 + (K2_short_put.gregas_unitarias.delta ?? 0) * -1 + (K3_short_call.gregas_unitarias.delta ?? 0) * -1 + (K4_long_call.gregas_unitarias.delta ?? 0) * 1,
            gamma: (K1_long_put.gregas_unitarias.gamma ?? 0) * 1 + (K2_short_put.gregas_unitarias.gamma ?? 0) * -1 + (K3_short_call.gregas_unitarias.gamma ?? 0) * -1 + (K4_long_call.gregas_unitarias.gamma ?? 0) * 1,
            theta: (K1_long_put.gregas_unitarias.theta ?? 0) * 1 + (K2_short_put.gregas_unitarias.theta ?? 0) * -1 + (K3_short_call.gregas_unitarias.theta ?? 0) * -1 + (K4_long_call.gregas_unitarias.theta ?? 0) * 1, 
            vega: (K1_long_put.gregas_unitarias.vega ?? 0) * 1 + (K2_short_put.gregas_unitarias.vega ?? 0) * -1 + (K3_short_call.gregas_unitarias.vega ?? 0) * -1 + (K4_long_call.gregas_unitarias.vega ?? 0) * 1, 
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            // Bull Put Spread (Venda K2, Compra K1)
            { derivative: K2_short_put, direction: 'VENDA', multiplier: -1, display: generateDisplay(K2_short_put, 'VENDA', K2) },
            { derivative: K1_long_put, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K1_long_put, 'COMPRA', K1) },
            // Bear Call Spread (Venda K3, Compra K4)
            { derivative: K3_short_call, direction: 'VENDA', multiplier: -1, display: generateDisplay(K3_short_call, 'VENDA', K3) },
            { derivative: K4_long_call, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K4_long_call, 'COMPRA', K4) },
        ];
        
        const roi = (max_loss as number) > 0 ? (max_profit as number) / (max_loss as number) : 0; 
        
        // --- 6. Agregação Final (Valores UNITÁRIOS) ---
        return {
            // --- Identificação e Resumo ---
            name: this.name,
            asset: K1_long_put.ativo_subjacente,
            spread_type: 'IRON CONDOR',
            vencimento: K1_long_put.vencimento, 
            expiration: K1_long_put.vencimento, 
            dias_uteis: K1_long_put.dias_uteis ?? 0, 
            strike_description: `K1/K2/K3/K4: R$ ${K1?.toFixed(2)} / ${K2?.toFixed(2)} / ${K3?.toFixed(2)} / ${K4?.toFixed(2)}`,
            
            asset_price: assetPrice, 
            
            // --- Fluxo de Caixa e Natureza (UNITÁRIOS) ---
            net_premium: cashFlowBrutoUnitario, // Net premium unitário (crédito)
            cash_flow_bruto: cashFlowBrutoUnitario,
            cash_flow_liquido: cash_flow_liquido_unitario,
            initialCashFlow: cashFlowBrutoUnitario, // Crédito inicial Bruto é positivo (unitário)
            natureza: natureza,

            // --- Risco e Retorno (UNITÁRIOS) ---
            risco_maximo: risco_maximo, // Risco Líquido por ação (unitário)
            lucro_maximo: lucro_maximo, // Lucro Líquido por ação (unitário)
            max_profit: max_profit,
            max_loss: max_loss,
            
            current_pnl: 0, 
            current_price: assetPrice, 
            
            // --- Pontos Chave ---
            breakEvenPoints: breakEvenPoints, 
            breakeven_low: breakeven1, 
            breakeven_high: breakeven2, 
            
            // --- Propriedades de Estrutura ---
            width: maxGapUnitario, // Largura máxima unitária
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