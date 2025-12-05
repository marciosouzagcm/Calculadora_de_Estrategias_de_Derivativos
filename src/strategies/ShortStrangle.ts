// src/strategies/ShortStrangle.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, OptionLeg, StrategyMetrics, StrategyLeg, NaturezaOperacao, ProfitLossValue } from '../interfaces/Types';

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

export class ShortStrangle implements IStrategy {
    
    public readonly name: string = 'Short Strangle (Crédito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA'; // Visão: Baixa Volatilidade
    
    getDescription(): string {
        return 'Estratégia de Baixa Volatilidade a Crédito. Vende Call de Strike Alto e Put de Strike Baixo no mesmo Vencimento. Risco Ilimitado.';
    }

    getLegCount(): number {
        return 2;
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        const points: Array<{ assetPrice: number; profitLoss: number }> = [];
        const callLeg = metrics.pernas.find(p => p.derivative.tipo === 'CALL')?.derivative;
        const putLeg = metrics.pernas.find(p => p.derivative.tipo === 'PUT')?.derivative;

        // Garante que max_profit é um número (é um valor finito nesta estratégia)
        const maxProfitValue = metrics.max_profit as number;

        if (callLeg && putLeg && metrics.breakEvenPoints.length === 2) {
            const K_put = putLeg.strike ?? 0;
            const K_call = callLeg.strike ?? 0;
            const bep1 = metrics.breakEvenPoints[0] as number;
            const bep2 = metrics.breakEvenPoints[1] as number;
            
            // Ponto 1: Perda Ilimitada na Baixa (Ponto bem abaixo do BEP 1)
            points.push({ assetPrice: bep1 - 5, profitLoss: -maxProfitValue - 5 * LOT_SIZE }); 
            // Ponto 2: Breakeven Point 1
            points.push({ assetPrice: bep1, profitLoss: 0 }); 
            // Ponto 3: Lucro Máximo (Entre os strikes, ex: (K_put + K_call)/2)
            points.push({ assetPrice: (K_put + K_call) / 2, profitLoss: maxProfitValue }); 
            // Ponto 4: Breakeven Point 2
            points.push({ assetPrice: bep2, profitLoss: 0 }); 
            // Ponto 5: Perda Ilimitada na Alta (Ponto bem acima do BEP 2)
            points.push({ assetPrice: bep2 + 5, profitLoss: -maxProfitValue - 5 * LOT_SIZE }); 
        }
        return points;
    }

    calculateMetrics(legData: OptionLeg[]): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        const callLeg = legData.find(leg => leg.tipo === 'CALL');
        const putLeg = legData.find(leg => leg.tipo === 'PUT');
        
        // Verifica se é um Strangle (strikes diferentes, vencimentos iguais)
        if (!callLeg || !putLeg || callLeg.strike === putLeg.strike || callLeg.vencimento !== putLeg.vencimento) return null;

        const K_call = callLeg.strike;
        const K_put = putLeg.strike;

        if (K_call === null || K_put === null || K_call <= K_put) return null;

        // --- 1. Fluxo de Caixa ---
        const multiplicadorContrato = LOT_SIZE; 
        // Crédito: Prêmio Call Vendida + Prêmio Put Vendida
        const netPremiumUnitario = callLeg.premio + putLeg.premio;
        
        const cashFlowBruto = netPremiumUnitario * multiplicadorContrato;
        const natureza: NaturezaOperacao = 'CRÉDITO';
        const cash_flow_liquido = cashFlowBruto - FEES; // Crédito Líquido = Crédito Bruto - Taxas

        // --- 2. Risco e Retorno ---
        // Lucro Máximo (Max Profit): Crédito Líquido recebido
        const lucro_maximo: ProfitLossValue = cash_flow_liquido; 
        const max_profit: ProfitLossValue = lucro_maximo;

        // Risco Máximo (Max Loss): Ilimitado
        const risco_maximo: ProfitLossValue = Infinity; 
        const max_loss: ProfitLossValue = risco_maximo;

        // --- 3. Pontos Chave ---
        // Breakeven Points (Dois pontos)
        const breakeven1 = (K_put) - netPremiumUnitario;
        const breakeven2 = (K_call) + netPremiumUnitario;
        const breakEvenPoints = [breakeven1, breakeven2]; // ✅ INCLUÍDO
        
        // Lucro Máximo é atingido entre os strikes (K_put e K_call)
        const minPriceToMaxProfit = K_put; // ✅ INCLUÍDO
        const maxPriceToMaxProfit = K_call; // ✅ INCLUÍDO
        
        // Width: Distância entre os strikes
        const width = K_call - K_put; // ✅ INCLUÍDO

        // --- 4. Gregas ---
        const greeks: Greeks = {
            delta: (callLeg.gregas_unitarias.delta ?? 0) * -1 + (putLeg.gregas_unitarias.delta ?? 0) * -1,
            gamma: (callLeg.gregas_unitarias.gamma ?? 0) * -1 + (putLeg.gregas_unitarias.gamma ?? 0) * -1,
            theta: (callLeg.gregas_unitarias.theta ?? 0) * -1 + (putLeg.gregas_unitarias.theta ?? 0) * -1,
            vega: (callLeg.gregas_unitarias.vega ?? 0) * -1 + (putLeg.gregas_unitarias.vega ?? 0) * -1,
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            { derivative: callLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(callLeg, 'VENDA', K_call) },
            { derivative: putLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(putLeg, 'VENDA', K_put) },
        ];
        
        // ROI é zero ou NaN (pois o risco é infinito), usamos 0
        const roi = 0; // ✅ INCLUÍDO

        // --- 6. Agregação Final (Preenchendo TODOS os campos requeridos) ---
        return {
            // --- Identificação e Resumo ---
            name: this.name,
            asset: callLeg.ativo_subjacente,
            spread_type: 'STRANGLE', 
            vencimento: callLeg.vencimento,
            expiration: callLeg.vencimento, // ✅ INCLUÍDO
            dias_uteis: callLeg.dias_uteis ?? 0, 
            strike_description: `R$ ${K_put?.toFixed(2)} / R$ ${K_call?.toFixed(2)}`, // ✅ INCLUÍDO
            
            // --- Fluxo de Caixa e Natureza ---
            net_premium: netPremiumUnitario, 
            cash_flow_bruto: cashFlowBruto,
            cash_flow_liquido: cash_flow_liquido,
            initialCashFlow: cashFlowBruto, // ✅ INCLUÍDO (Crédito inicial deve ser positivo)
            natureza: natureza,

            // --- Risco e Retorno ---
            risco_maximo: risco_maximo,
            lucro_maximo: lucro_maximo, 
            max_profit: max_profit,
            max_loss: max_loss,
            
            current_pnl: 0, 
            current_price: 0, 

            // --- Pontos Chave ---
            breakEvenPoints: breakEvenPoints, // ✅ INCLUÍDO
            breakeven_low: breakeven1, 
            breakeven_high: breakeven2, 
            
            // --- Propriedades de Estrutura ---
            width: width, // ✅ INCLUÍDO
            minPriceToMaxProfit: minPriceToMaxProfit, // ✅ INCLUÍDO
            maxPriceToMaxProfit: maxPriceToMaxProfit, // ✅ INCLUÍDO
            
            // --- Métrica de Performance e Priorização ---
            risco_retorno_unitario: roi, 
            rentabilidade_max: roi,
            roi: roi, // ✅ INCLUÍDO
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