// src/strategies/ShortStraddle.ts
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

export class ShortStraddle implements IStrategy {
    
    public readonly name: string = 'Short Straddle (Crédito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA'; // Visão: Baixa Volatilidade
    
    getDescription(): string {
        return 'Estratégia de Baixa Volatilidade a Crédito. Vende Call e Put no mesmo Strike e Vencimento. Risco Ilimitado.';
    }

    getLegCount(): number {
        return 2;
    }
    
    /**
     * 🎯 CORREÇÃO CRÍTICA: Lógica de cálculo de PnL no Payoff revisada.
     */
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        // 

//[Image of Short Straddle payoff diagram]

        const points: Array<{ assetPrice: number; profitLoss: number }> = [];
        const strike = metrics.pernas[0].derivative.strike ?? 0;
        
        // Lucro Máximo Unitário (crédito líquido por ação)
        const maxProfitUnitario = metrics.max_profit as number; 
        
        // Conversão para PnL Total para o gráfico
        const maxProfitTotal = maxProfitUnitario * LOT_SIZE;

        if (strike > 0 && metrics.breakEvenPoints.length === 2) {
            const bep1 = metrics.breakEvenPoints[0] as number;
            const bep2 = metrics.breakEvenPoints[1] as number;
            
            // Gerar 5 pontos-chave para plotagem
            const pricePoints = [
                bep1 - 5, // Perda Ilimitada na Baixa
                bep1, 
                strike, // Lucro Máximo
                bep2, 
                bep2 + 5 // Perda Ilimitada na Alta
            ];
            
            // Loop para calcular PnL TOTAL (multiplicado por LOT_SIZE) em cada ponto
            for (const S of pricePoints) {
                // PnL Unitário = Crédito Total - Perda da Call (max(0, S - K)) - Perda da Put (max(0, K - S))
                const pnlUnitario = maxProfitUnitario - Math.max(0, S - strike) - Math.max(0, strike - S);
                
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
        // Crédito Bruto Unitário: Prêmio Call Vendida + Prêmio Put Vendida
        const netPremiumUnitario = callLeg.premio + putLeg.premio;
        
        const natureza: NaturezaOperacao = 'CRÉDITO';
        
        // Taxa Unitária por Ação (Total fees / Lote)
        const totalFeesUnitario = (feePerLeg * 2) / LOT_SIZE; // 2 pernas
        
        // Crédito Líquido Unitário = Crédito Bruto Unitário - Taxas Unitárias
        const cash_flow_liquido_unitario = netPremiumUnitario - totalFeesUnitario; 

        // --- 2. Risco e Retorno (UNITÁRIO) ---
        
        // Lucro Máximo (Max Profit) Unitário: Crédito Líquido Unitário
        const lucro_maximo: ProfitLossValue = cash_flow_liquido_unitario; 
        const max_profit: ProfitLossValue = lucro_maximo;

        // Risco Máximo (Max Loss): Ilimitado
        const risco_maximo: ProfitLossValue = Infinity; 
        const max_loss: ProfitLossValue = risco_maximo;

        // --- 3. Pontos Chave ---
        // Breakeven Points (usando o Crédito BRUTO do prêmio, pois taxas não alteram o payoff no vencimento)
        const breakeven1 = (K ?? 0) - netPremiumUnitario;
        const breakeven2 = (K ?? 0) + netPremiumUnitario;
        const breakEvenPoints = [breakeven1, breakeven2]; 
        
        // O lucro máximo ocorre no Strike K
        const minPriceToMaxProfit = breakeven1; // Entre BEP 1 e BEP 2
        const maxPriceToMaxProfit = breakeven2; // Entre BEP 1 e BEP 2
        
        const width = 0; 

        // --- 4. Gregas ---
        // Multiplicadores: Venda Call (-1), Venda Put (-1)
        const greeks: Greeks = {
            // Delta Geral: Próximo de 0 no ATM
            delta: (callLeg.gregas_unitarias.delta ?? 0) * -1 + (putLeg.gregas_unitarias.delta ?? 0) * -1,
            // Gamma negativo (indesejado)
            gamma: (callLeg.gregas_unitarias.gamma ?? 0) * -1 + (putLeg.gregas_unitarias.gamma ?? 0) * -1,
            // Theta positivo (desejado, ganha com o tempo)
            theta: (callLeg.gregas_unitarias.theta ?? 0) * -1 + (putLeg.gregas_unitarias.theta ?? 0) * -1, 
            // Vega negativo (desejado, ganha com a queda da volatilidade)
            vega: (callLeg.gregas_unitarias.vega ?? 0) * -1 + (putLeg.gregas_unitarias.vega ?? 0) * -1, 
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            { derivative: callLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(callLeg, 'VENDA', K) },
            { derivative: putLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(putLeg, 'VENDA', K) },
        ];
        
        const roi = 0; // Não calculável com risco infinito

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
            net_premium: netPremiumUnitario, // Net premium unitário (crédito)
            cash_flow_bruto: netPremiumUnitario,
            cash_flow_liquido: cash_flow_liquido_unitario,
            initialCashFlow: netPremiumUnitario, // Crédito inicial Bruto é positivo (unitário)
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
            margem_exigida: netPremiumUnitario, // Margem pode ser baseada no prêmio ou em requisitos da corretora
            probabilidade_sucesso: 0, 
            score: 0, 
            should_close: false,
            
            // --- Detalhes ---
            pernas: pernas, 
            greeks: greeks, 
        } as StrategyMetrics;
    }
}