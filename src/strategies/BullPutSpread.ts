// src/strategies/BullPutSpread.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, ProfitLossValue, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

// Constantes fictícias (mantidas apenas para referência)
const LOT_SIZE = 100; // Assumimos 100 para converter a taxa por lote para taxa por ação

// Função auxiliar para gerar a string de display
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.ativo_subjacente} K${strikeStr}`;
}

export class BullPutSpread implements IStrategy {
    
    public readonly name: string = 'Bull Put Spread (Crédito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'ALTA'; // Visão: Alta/Neutra
    
    getDescription(): string {
        return 'Estratégia de Alta/Neutra (Bullish) a Crédito. Vende Put de strike alto (K1) e Compra Put de strike baixo (K2).';
    }

    getLegCount(): number {
        return 2;
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        const points: Array<{ assetPrice: number; profitLoss: number }> = [];
        // K1 é Venda (Strike Maior), K2 é Compra (Strike Menor)
        const K1 = (metrics.pernas.find(p => p.direction === 'VENDA')?.derivative.strike) ?? 0;
        const K2 = (metrics.pernas.find(p => p.direction === 'COMPRA')?.derivative.strike) ?? 0;

        if (K1 > K2 && K2 > 0 && metrics.breakEvenPoints.length > 0) {
            const bep = metrics.breakEvenPoints[0] as number;
            
            // Ponto 1: Lucro Máximo (Acima de K1)
            // Multiplica o lucro unitário por LOT_SIZE para o gráfico
            points.push({ assetPrice: K1 + 5, profitLoss: (metrics.max_profit as number) * LOT_SIZE }); 
            // Ponto 2: Breakeven Point
            points.push({ assetPrice: bep, profitLoss: 0 }); 
            // Ponto 3: Prejuízo Máximo (Abaixo de K2)
            // Multiplica o risco unitário por LOT_SIZE para o gráfico
            points.push({ assetPrice: K2 - 5, profitLoss: -(metrics.max_loss as number) * LOT_SIZE }); 
        }
        return points;
    }

    /**
     * @inheritdoc IStrategy.calculateMetrics
     */
    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        // Ordena por strike descendente: K1 (maior) Venda, K2 (menor) Compra
        const putLegs = legData.filter(leg => leg.tipo === 'PUT').sort((a: OptionLeg, b: OptionLeg) => (b.strike ?? 0) - (a.strike ?? 0));
        
        if (putLegs.length !== 2) return null;

        const K1_short = putLegs[0];  // Strike Maior (Venda)
        const K2_long = putLegs[1]; // Strike Menor (Compra)
        
        const K1 = K1_short.strike;
        const K2 = K2_long.strike;

        if (K1 === null || K2 === null || K1 <= K2 || K1_short.vencimento !== K2_long.vencimento) return null;

        // --- 1. Fluxo de Caixa (UNITÁRIO) ---
        
        // Crédito Bruto Unitário (Prêmio Venda K1 - Prêmio Compra K2)
        const cashFlowBrutoUnitario = K1_short.premio - K2_long.premio;
        
        if (cashFlowBrutoUnitario <= 0) return null; // Deve ser um Crédito Bruto

        const natureza: NaturezaOperacao = 'CRÉDITO';
        
        // Taxa Unitária por Ação (Total fees / Lote)
        const totalFeesUnitario = (feePerLeg * 2) / LOT_SIZE; 
        
        // Crédito Líquido Unitário (Lucro Máximo)
        // Crédito líquido = Crédito Bruto - Taxas
        const cash_flow_liquido_unitario = cashFlowBrutoUnitario - totalFeesUnitario; 

        // --- 2. Risco e Retorno (UNITÁRIO) ---
        const widthUnitario = K1 - K2; 
        
        // Lucro Máximo (Max Profit): Crédito líquido unitário (prêmio total recebido - taxas)
        const max_profit: ProfitLossValue = cash_flow_liquido_unitario;

        // Risco Máximo (Max Loss): Largura do Spread - Crédito Bruto + Taxas
        // Risco Máximo = Largura Unitária - Lucro Máximo Bruto + Taxas Unitárias
        const max_loss: ProfitLossValue = widthUnitario - cashFlowBrutoUnitario + totalFeesUnitario;
        const risco_maximo: ProfitLossValue = max_loss; // Renomeado para coerência

        // --- 3. Pontos Chave ---
        // Breakeven (Put: K1 - Crédito BRUTO Unitário)
        const breakeven = K1 - cashFlowBrutoUnitario; 
        const breakEvenPoints = [breakeven]; 
        
        // Lucro Máximo é atingido quando o preço do ativo é >= K1
        const minPriceToMaxProfit = K1; 
        const maxPriceToMaxProfit = Infinity; 

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
        
        const roi = (max_loss as number) > 0 ? (max_profit as number) / (max_loss as number) : 0; 

        // --- 6. Agregação Final (Valores UNITÁRIOS) ---
        return {
            // --- Identificação e Resumo ---
            name: this.name,
            asset: K1_short.ativo_subjacente,
            spread_type: 'VERTICAL PUT',
            vencimento: K1_short.vencimento,
            expiration: K1_short.vencimento, 
            dias_uteis: K1_short.dias_uteis ?? 0, 
            strike_description: `R$ ${K1?.toFixed(2)} / R$ ${K2?.toFixed(2)}`,
            
            asset_price: assetPrice, 
            
            // --- Fluxo de Caixa e Natureza (UNITÁRIOS) ---
            net_premium: cashFlowBrutoUnitario, // Prémio Bruto Unitário
            cash_flow_bruto: cashFlowBrutoUnitario,
            cash_flow_liquido: cash_flow_liquido_unitario,
            initialCashFlow: cashFlowBrutoUnitario, // Crédito inicial Bruto (positivo)
            natureza: natureza,

            // --- Risco e Retorno (UNITÁRIOS) ---
            risco_maximo: risco_maximo, // Risco Total por ação (unitário)
            lucro_maximo: max_profit, // Lucro Líquido por ação (unitário)
            max_profit: max_profit,
            max_loss: max_loss, 

            current_pnl: 0, 
            current_price: assetPrice, 
            
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
            // A Margem exigida é a Largura - Prêmio Bruto (Unitário)
            margem_exigida: widthUnitario - cashFlowBrutoUnitario, 
            probabilidade_sucesso: 0, 
            score: 0, 
            should_close: false,
            
            // --- Detalhes ---
            pernas: pernas, 
            greeks: greeks, 
        } as StrategyMetrics;
    }
}