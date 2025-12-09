// src/strategies/LongStrangle.ts
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

export class LongStrangle implements IStrategy {
    
    public readonly name: string = 'Long Strangle (Débito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'VOLÁTIL'; // Visão: Alta Volatilidade
    
    getDescription(): string {
        return 'Estratégia de Alta Volatilidade a Débito. Compra Call (strike alto) e Put (strike baixo) no mesmo Vencimento.';
    }

    getLegCount(): number {
        return 2;
    }
    
    /**
     * 🎯 CORREÇÃO CRÍTICA: Lógica de cálculo de PnL no Payoff revisada para ser genérica.
     */
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        // 

//[Image of Long Strangle payoff diagram]

        const points: Array<{ assetPrice: number; profitLoss: number }> = [];
        
        // K_Put é o strike menor e K_Call é o strike maior.
        const K_Put = metrics.pernas.find(p => p.derivative.tipo === 'PUT')?.derivative.strike ?? 0;
        const K_Call = metrics.pernas.find(p => p.derivative.tipo === 'CALL')?.derivative.strike ?? 0;
        
        // Prejuízo Máximo Unitário (custo líquido por ação)
        const maxLossUnitario = metrics.max_loss as number; 
        
        // Conversão para PnL Total para o gráfico
        const maxLossTotal = maxLossUnitario * LOT_SIZE;

        if (K_Put > 0 && K_Call > 0 && metrics.breakEvenPoints.length === 2) {
            const bep1 = metrics.breakEvenPoints[0] as number;
            const bep2 = metrics.breakEvenPoints[1] as number;
            
            // Pontos chave para plotagem
            const pricePoints = [
                K_Put - 5, // Abaixo do strike da Put (Lucro)
                bep1, // BEP 1
                (K_Put + K_Call) / 2, // Ponto central (Perda Máxima)
                bep2, // BEP 2
                K_Call + 5 // Acima do strike da Call (Lucro)
            ];
            
            // Loop para calcular PnL em cada ponto
            for (const S of pricePoints) {
                // PnL Unitário = Lucro Call + Lucro Put - Custo Unitário
                const payoffCall = Math.max(0, S - K_Call);
                const payoffPut = Math.max(0, K_Put - S);
                
                const pnlUnitario = payoffCall + payoffPut - maxLossUnitario;

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

        const putLeg = legData.find(leg => leg.tipo === 'PUT');
        const callLeg = legData.find(leg => leg.tipo === 'CALL'); 
        
        if (!callLeg || !putLeg || callLeg.vencimento !== putLeg.vencimento) return null;

        const K_Put = putLeg.strike;
        const K_Call = callLeg.strike;

        // Long Strangle exige que K_Put < K_Call (strikes diferentes)
        if (K_Put === null || K_Call === null || K_Put >= K_Call) return null;


        // --- 1. Fluxo de Caixa (UNITÁRIO) ---
        // Débito Bruto Unitário: Prêmio Put Comprada + Prêmio Call Comprada
        const netPremiumUnitario = putLeg.premio + callLeg.premio;
        
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
        // BEP 1 (Inferior): Strike da Put - Prêmio Bruto Unitário
        const breakeven1 = K_Put - netPremiumUnitario;
        // BEP 2 (Superior): Strike da Call + Prêmio Bruto Unitário
        const breakeven2 = K_Call + netPremiumUnitario;
        const breakEvenPoints = [breakeven1, breakeven2]; 
        
        // A perda máxima ocorre entre os strikes K_Put e K_Call
        const minPriceToMaxProfit = breakeven2; // Acima do BEP Superior
        const maxPriceToMaxProfit = breakeven1; // Abaixo do BEP Inferior
        
        const width = K_Call - K_Put; // Diferença entre os strikes

        // --- 4. Gregas ---
        // Multiplicadores: Compra Put (+1), Compra Call (+1)
        const greeks: Greeks = {
            delta: (callLeg.gregas_unitarias.delta ?? 0) * 1 + (putLeg.gregas_unitarias.delta ?? 0) * 1,
            gamma: (callLeg.gregas_unitarias.gamma ?? 0) * 1 + (putLeg.gregas_unitarias.gamma ?? 0) * 1, // Gamma positivo (desejado)
            theta: (callLeg.gregas_unitarias.theta ?? 0) * 1 + (putLeg.gregas_unitarias.theta ?? 0) * 1, // Theta negativo (indesejado)
            vega: (callLeg.gregas_unitarias.vega ?? 0) * 1 + (putLeg.gregas_unitarias.vega ?? 0) * 1, // Vega positivo (desejado)
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            { derivative: putLeg, direction: 'COMPRA', multiplier: 1, display: generateDisplay(putLeg, 'COMPRA', K_Put) },
            { derivative: callLeg, direction: 'COMPRA', multiplier: 1, display: generateDisplay(callLeg, 'COMPRA', K_Call) },
        ];
        
        const roi = Infinity; 

        // --- 6. Agregação Final (Valores UNITÁRIOS) ---
        return {
            // --- Identificação e Resumo ---
            name: this.name,
            asset: callLeg.ativo_subjacente,
            spread_type: 'STRANGLE', 
            vencimento: callLeg.vencimento,
            expiration: callLeg.vencimento, 
            dias_uteis: callLeg.dias_uteis ?? 0, 
            strike_description: `Put K: R$ ${K_Put?.toFixed(2)} / Call K: R$ ${K_Call?.toFixed(2)}`,
            
            asset_price: assetPrice, 
            
            // --- Fluxo de Caixa e Natureza (UNITÁRIOS) ---
            net_premium: netPremiumUnitario, 
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