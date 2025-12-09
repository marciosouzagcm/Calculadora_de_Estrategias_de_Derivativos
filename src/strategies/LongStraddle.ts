// src/strategies/LongStraddle.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, OptionLeg, StrategyMetrics, StrategyLeg, NaturezaOperacao, ProfitLossValue } from '../interfaces/Types';

// Constantes fictícias
const LOT_SIZE = 100; // Assumimos 100 para converter a taxa por lote para taxa por ação

// Função auxiliar para gerar a string de display
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.ativo_subjacente} K${strikeStr}`;
}

export class LongStraddle implements IStrategy {
    
    public readonly name: string = 'Long Straddle (Débito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'VOLÁTIL'; // Visão: Alta Volatilidade
    
    getDescription(): string {
        return 'Estratégia de Alta Volatilidade a Débito. Compra Call e Put no mesmo Strike e Vencimento.';
    }

    getLegCount(): number {
        return 2;
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        // 
        const points: Array<{ assetPrice: number; profitLoss: number }> = [];
        const strike = metrics.pernas[0].derivative.strike ?? 0;
        
        // Custo Líquido da operação por ação (Prejuízo Máximo Unitário)
        const maxLossUnitario = metrics.max_loss as number;
        // Converte para o PnL total do lote para o gráfico
        const maxLossTotal = maxLossUnitario * LOT_SIZE; 
        

        if (strike > 0 && metrics.breakEvenPoints.length === 2) {
            const bep1 = metrics.breakEvenPoints[0] as number;
            const bep2 = metrics.breakEvenPoints[1] as number;
            
            // Pontos: abaixo do BEP 1, BEP 1, Strike, BEP 2, acima do BEP 2
            const pricePoints = [
                bep1 - 5,
                bep1, 
                strike, 
                bep2, 
                bep2 + 5
            ];
            
            // Loop para calcular PnL TOTAL (multiplicado por LOT_SIZE) em cada ponto
            for (const S of pricePoints) {
                // PnL Unitário = Lucro da Call (max(0, S - K)) + Lucro da Put (max(0, K - S)) - Custo Unitário
                const pnlUnitario = Math.max(0, S - strike) + Math.max(0, strike - S) - maxLossUnitario;
                
                points.push({ assetPrice: S, profitLoss: pnlUnitario * LOT_SIZE });
            }
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

        // --- 1. Fluxo de Caixa (UNITÁRIO) ---
        // Débito Bruto Unitário: Prêmio Call Comprada + Prêmio Put Comprada
        const netPremiumUnitario = callLeg.premio + putLeg.premio;
        
        const natureza: NaturezaOperacao = 'DÉBITO';
        
        // Taxa Unitária por Ação (Total fees / Lote)
        const totalFeesUnitario = (feePerLeg * 2) / LOT_SIZE; // 2 pernas
        
        // Débito Líquido Unitário = Débito Bruto Unitário + Taxas Unitárias
        const cash_flow_liquido_unitario = netPremiumUnitario + totalFeesUnitario; 

        // --- 2. Risco e Retorno (UNITÁRIO) ---
        
        // Risco Máximo (Max Loss) Unitário: Custo total (Débito Líquido Unitário)
        const risco_maximo: ProfitLossValue = cash_flow_liquido_unitario; 
        const max_loss: ProfitLossValue = risco_maximo;

        // Lucro Máximo (Max Profit): Ilimitado
        const lucro_maximo: ProfitLossValue = Infinity; 
        const max_profit: ProfitLossValue = lucro_maximo;

        // --- 3. Pontos Chave ---
        // Breakeven Points (usando o custo BRUTO do prêmio, pois taxas não alteram o payoff no vencimento)
        const breakeven1 = (K ?? 0) - netPremiumUnitario;
        const breakeven2 = (K ?? 0) + netPremiumUnitario;
        const breakEvenPoints = [breakeven1, breakeven2]; 
        
        const minPriceToMaxProfit = breakeven2; // Acima do BEP Superior
        const maxPriceToMaxProfit = breakeven1; // Abaixo do BEP Inferior
        
        const width = 0; 

        // --- 4. Gregas ---
        // Multiplicadores: Compra Call (+1), Compra Put (+1)
        const greeks: Greeks = {
            delta: (callLeg.gregas_unitarias.delta ?? 0) * 1 + (putLeg.gregas_unitarias.delta ?? 0) * 1,
            gamma: (callLeg.gregas_unitarias.gamma ?? 0) * 1 + (putLeg.gregas_unitarias.gamma ?? 0) * 1, // Gamma positivo (desejado)
            theta: (callLeg.gregas_unitarias.theta ?? 0) * 1 + (putLeg.gregas_unitarias.theta ?? 0) * 1, // Theta negativo (indesejado)
            vega: (callLeg.gregas_unitarias.vega ?? 0) * 1 + (putLeg.gregas_unitarias.vega ?? 0) * 1, // Vega positivo (desejado)
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            { derivative: callLeg, direction: 'COMPRA', multiplier: 1, display: generateDisplay(callLeg, 'COMPRA', K) },
            { derivative: putLeg, direction: 'COMPRA', multiplier: 1, display: generateDisplay(putLeg, 'COMPRA', K) },
        ];
        
        // ROI tende ao infinito
        const roi = Infinity; 

        // --- 6. Agregação Final (Valores UNITÁRIOS) ---
        return {
            // --- Identificação e Resumo ---
            name: this.name,
            asset: callLeg.ativo_subjacente,
            spread_type: 'STRADDLE', 
            vencimento: callLeg.vencimento,
            expiration: callLeg.vencimento, 
            dias_uteis: callLeg.dias_uteis ?? 0, 
            strike_description: `K: R$ ${K?.toFixed(2)} (Mesmo Strike)`,
            
            asset_price: assetPrice, 
            
            // --- Fluxo de Caixa e Natureza (UNITÁRIOS) ---
            net_premium: netPremiumUnitario, // Net premium unitário (custo)
            cash_flow_bruto: netPremiumUnitario,
            cash_flow_liquido: cash_flow_liquido_unitario,
            initialCashFlow: -netPremiumUnitario, // Débito inicial Bruto é negativo (unitário)
            natureza: natureza,

            // --- Risco e Retorno (UNITÁRIOS) ---
            risco_maximo: risco_maximo,
            lucro_maximo: lucro_maximo, 
            max_profit: max_profit,
            max_loss: max_loss,
            
            current_pnl: 0, 
            current_price: assetPrice, 

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