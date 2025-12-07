// src/strategies/ShortStrangle.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, OptionLeg, StrategyMetrics, StrategyLeg, NaturezaOperacao, ProfitLossValue } from '../interfaces/Types';

// Constantes fictícias
const LOT_SIZE = 1; 

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
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        const points: Array<{ assetPrice: number; profitLoss: number }> = [];
        
        // K_Put é o strike menor e K_Call é o strike maior.
        const K_Put = metrics.pernas.find(p => p.derivative.tipo === 'PUT')?.derivative.strike ?? 0;
        const K_Call = metrics.pernas.find(p => p.derivative.tipo === 'CALL')?.derivative.strike ?? 0;
        
        const maxProfitValue = metrics.max_profit as number; 

        if (K_Put > 0 && K_Call > 0 && metrics.breakEvenPoints.length === 2) {
            const bep1 = metrics.breakEvenPoints[0] as number;
            const bep2 = metrics.breakEvenPoints[1] as number;
            
            // Ponto 1: Perda Ilimitada na Baixa (Ponto abaixo do BEP 1)
            points.push({ assetPrice: bep1 - 5, profitLoss: -maxProfitValue - 5 * LOT_SIZE }); 
            // Ponto 2: Breakeven Point 1
            points.push({ assetPrice: bep1, profitLoss: 0 }); 
            // Ponto 3: Lucro Máximo (Entre os strikes K_Put e K_Call)
            points.push({ assetPrice: (K_Put + K_Call) / 2, profitLoss: maxProfitValue }); 
            // Ponto 4: Breakeven Point 2
            points.push({ assetPrice: bep2, profitLoss: 0 }); 
            // Ponto 5: Perda Ilimitada na Alta (Ponto acima do BEP 2)
            points.push({ assetPrice: bep2 + 5, profitLoss: -maxProfitValue - 5 * LOT_SIZE });
        }
        return points;
    }

    /**
     * 🎯 CORREÇÃO 1: Assinatura do método corrigida para incluir 'assetPrice' e 'feePerLeg'.
     * @inheritdoc IStrategy.calculateMetrics
     */
    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        // Short Strangle é a VENDA de Call e Put. Não há necessidade de checar 'direcao' em OptionLeg.
        const putLeg = legData.find(leg => leg.tipo === 'PUT');
        const callLeg = legData.find(leg => leg.tipo === 'CALL'); 
        
        if (!callLeg || !putLeg || callLeg.vencimento !== putLeg.vencimento) return null;

        const K_Put = putLeg.strike;
        const K_Call = callLeg.strike;

        // Short Strangle exige que K_Put < K_Call (strikes diferentes)
        if (K_Put === null || K_Call === null || K_Put >= K_Call) return null;


        // --- 1. Fluxo de Caixa ---
        const multiplicadorContrato = LOT_SIZE; 
        // Crédito: Prêmio Put Vendida + Prêmio Call Vendida
        const netPremiumUnitario = putLeg.premio + callLeg.premio;
        
        const cashFlowBruto = netPremiumUnitario * multiplicadorContrato;
        const natureza: NaturezaOperacao = 'CRÉDITO';
        
        const totalFees = feePerLeg * 2; // 2 pernas
        const cash_flow_liquido = cashFlowBruto - totalFees; // Crédito Líquido = Crédito Bruto - Taxas

        // --- 2. Risco e Retorno ---
        // Lucro Máximo (Max Profit): Crédito Líquido recebido
        const lucro_maximo: ProfitLossValue = cash_flow_liquido; 
        const max_profit: ProfitLossValue = lucro_maximo;

        // Risco Máximo (Max Loss): Ilimitado
        const risco_maximo: ProfitLossValue = Infinity; 
        const max_loss: ProfitLossValue = risco_maximo;

        // --- 3. Pontos Chave ---
        // Breakeven Points (Dois pontos)
        const breakeven1 = K_Put - netPremiumUnitario;
        const breakeven2 = K_Call + netPremiumUnitario;
        const breakEvenPoints = [breakeven1, breakeven2]; 
        
        // Lucro Máximo é atingido entre os strikes K_Put e K_Call
        const minPriceToMaxProfit = K_Put; 
        const maxPriceToMaxProfit = K_Call; 
        
        const width = K_Call - K_Put; // Diferença entre os strikes

        // --- 4. Gregas ---
        const greeks: Greeks = {
            delta: (callLeg.gregas_unitarias.delta ?? 0) * -1 + (putLeg.gregas_unitarias.delta ?? 0) * -1,
            gamma: (callLeg.gregas_unitarias.gamma ?? 0) * -1 + (putLeg.gregas_unitarias.gamma ?? 0) * -1, // Gamma negativo
            theta: (callLeg.gregas_unitarias.theta ?? 0) * -1 + (putLeg.gregas_unitarias.theta ?? 0) * -1, // Theta positivo
            vega: (callLeg.gregas_unitarias.vega ?? 0) * -1 + (putLeg.gregas_unitarias.vega ?? 0) * -1, // Vega negativo
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            { derivative: putLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(putLeg, 'VENDA', K_Put) },
            { derivative: callLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(callLeg, 'VENDA', K_Call) },
        ];
        
        const roi = 0; 

        // --- 6. Agregação Final (Preenchendo TODOS os campos requeridos) ---
        return {
            // --- Identificação e Resumo ---
            name: this.name,
            asset: callLeg.ativo_subjacente,
            spread_type: 'STRANGLE', 
            vencimento: callLeg.vencimento,
            expiration: callLeg.vencimento, 
            dias_uteis: callLeg.dias_uteis ?? 0, 
            strike_description: `Put K: R$ ${K_Put?.toFixed(2)} / Call K: R$ ${K_Call?.toFixed(2)}`,
            
            // 🎯 CORREÇÃO 2: Inclusão da propriedade 'asset_price'
            asset_price: assetPrice, 
            
            // --- Fluxo de Caixa e Natureza ---
            net_premium: netPremiumUnitario, 
            cash_flow_bruto: cashFlowBruto,
            cash_flow_liquido: cash_flow_liquido,
            initialCashFlow: cashFlowBruto, // Crédito inicial deve ser positivo
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