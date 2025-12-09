// src/strategies/ShortStrangle.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, OptionLeg, StrategyMetrics, StrategyLeg, NaturezaOperacao, ProfitLossValue } from '../interfaces/Types';

// Constantes fictícias
const LOT_SIZE = 100; // Assumimos 100 para conversão de taxa/lote para taxa/ação

// Função auxiliar para gerar a string de display
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.ativo_subjacente} K${strikeStr}`;
}

export class ShortStrangle implements IStrategy {
    
    public readonly name: string = 'Short Strangle (Crédito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA'; // Visão: Baixa Volatilidade
    
    getDescription(): string {
        return 'Estratégia de Baixa Volatilidade a Crédito. Vende Call (strike alto) e Put (strike baixo) no mesmo Vencimento. Risco Ilimitado.';
    }

    getLegCount(): number {
        return 2;
    }
    
    /**
     * 🎯 CORREÇÃO CRÍTICA: Lógica de cálculo de PnL no Payoff revisada.
     */
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        // 
        const points: Array<{ assetPrice: number; profitLoss: number }> = [];
        
        // K_Put é o strike menor e K_Call é o strike maior.
        const K_Put = metrics.pernas.find(p => p.derivative.tipo === 'PUT')?.derivative.strike ?? 0;
        const K_Call = metrics.pernas.find(p => p.derivative.tipo === 'CALL')?.derivative.strike ?? 0;
        
        // Lucro Máximo Unitário (crédito líquido por ação)
        const maxProfitUnitario = metrics.max_profit as number; 

        if (K_Put > 0 && K_Call > 0 && metrics.breakEvenPoints.length === 2) {
            const bep1 = metrics.breakEvenPoints[0] as number;
            const bep2 = metrics.breakEvenPoints[1] as number;
            
            // Pontos chave para plotagem
            const pricePoints = [
                bep1 - 5, // Perda Ilimitada na Baixa
                bep1, // BEP 1
                (K_Put + K_Call) / 2, // Ponto central (Lucro Máximo)
                bep2, // BEP 2
                bep2 + 5 // Perda Ilimitada na Alta
            ];
            
            // Loop para calcular PnL TOTAL em cada ponto
            for (const S of pricePoints) {
                // PnL Unitário = Crédito Líquido - Perda da Call - Perda da Put
                // O risco ocorre APENAS fora da zona de strikes.
                
                // Payoff Put Vendida: -(K_Put - S)
                const perdaPut = Math.max(0, K_Put - S);
                // Payoff Call Vendida: -(S - K_Call)
                const perdaCall = Math.max(0, S - K_Call);

                // PnL Unitário = Crédito Líquido - Perda Total
                const pnlUnitario = maxProfitUnitario - perdaPut - perdaCall;

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

        // Short Strangle exige que K_Put < K_Call (strikes diferentes)
        if (K_Put === null || K_Call === null || K_Put >= K_Call) return null;


        // --- 1. Fluxo de Caixa (UNITÁRIO) ---
        // Crédito Bruto Unitário: Prêmio Put Vendida + Prêmio Call Vendida
        const netPremiumUnitario = putLeg.premio + callLeg.premio;
        
        const natureza: NaturezaOperacao = 'CRÉDITO';
        
        // Taxa Unitária por Ação (Total fees / Lote)
        const totalFeesUnitario = (feePerLeg * 2) / LOT_SIZE; // 2 pernas
        
        // Crédito Líquido Unitário = Crédito Bruto Unitário - Taxas Unitárias
        const cash_flow_liquido_unitario = netPremiumUnitario - totalFeesUnitario;

        // --- 2. Risco e Retorno (UNITÁRIO) ---
        // Lucro Máximo (Max Profit) Unitário: Crédito Líquido recebido
        const lucro_maximo: ProfitLossValue = cash_flow_liquido_unitario; 
        const max_profit: ProfitLossValue = lucro_maximo;

        // Risco Máximo (Max Loss): Ilimitado
        const risco_maximo: ProfitLossValue = Infinity; 
        const max_loss: ProfitLossValue = risco_maximo;

        // --- 3. Pontos Chave ---
        // Breakeven Points (usando o Crédito BRUTO do prêmio, pois taxas não alteram o payoff no vencimento)
        // BEP 1 (Inferior): Strike da Put - Prêmio Bruto Unitário
        const breakeven1 = K_Put - netPremiumUnitario;
        // BEP 2 (Superior): Strike da Call + Prêmio Bruto Unitário
        const breakeven2 = K_Call + netPremiumUnitario;
        const breakEvenPoints = [breakeven1, breakeven2]; 
        
        // Lucro Máximo é atingido entre os strikes K_Put e K_Call
        const minPriceToMaxProfit = K_Put; 
        const maxPriceToMaxProfit = K_Call; 
        
        const width = K_Call - K_Put; // Diferença entre os strikes

        // --- 4. Gregas ---
        // Multiplicadores: Venda Put (-1), Venda Call (-1)
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
            { derivative: putLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(putLeg, 'VENDA', K_Put) },
            { derivative: callLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(callLeg, 'VENDA', K_Call) },
        ];
        
        const roi = 0; 

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
            margem_exigida: max_profit as number, // A margem exigida é, no mínimo, o lucro máximo.
            probabilidade_sucesso: 0, 
            score: 0, 
            should_close: false,
            
            // --- Detalhes ---
            pernas: pernas, 
            greeks: greeks, 
        } as StrategyMetrics;
    }
}