// src/strategies/LongStrangle.ts
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

export class LongStrangle implements IStrategy {
    
    public readonly name: string = 'Long Strangle (Débito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'VOLÁTIL'; // Visão: Alta Volatilidade
    
    getDescription(): string {
        return 'Estratégia de Alta Volatilidade a Débito. Compra Call de Strike Alto e Put de Strike Baixo no mesmo Vencimento.';
    }

    getLegCount(): number {
        return 2;
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        const points: Array<{ assetPrice: number; profitLoss: number }> = [];
        const callLeg = metrics.pernas.find(p => p.derivative.tipo === 'CALL')?.derivative;
        const putLeg = metrics.pernas.find(p => p.derivative.tipo === 'PUT')?.derivative;

        // Garante que max_loss é um número (é um valor finito nesta estratégia)
        const maxLossValue = metrics.max_loss as number;

        if (callLeg && putLeg && metrics.breakEvenPoints.length === 2) {
            const K_put = putLeg.strike ?? 0;
            const K_call = callLeg.strike ?? 0;
            const bep1 = metrics.breakEvenPoints[0] as number;
            const bep2 = metrics.breakEvenPoints[1] as number;
            
            // Ponto 1: Lucro na Baixa (Bem abaixo do BEP 1)
            points.push({ assetPrice: bep1 - 5, profitLoss: 5 * LOT_SIZE - maxLossValue }); 
            // Ponto 2: Breakeven Point 1
            points.push({ assetPrice: bep1, profitLoss: 0 }); 
            // Ponto 3: Perda Máxima (Entre os strikes, ex: (K_put + K_call)/2)
            points.push({ assetPrice: (K_put + K_call) / 2, profitLoss: -maxLossValue }); 
            // Ponto 4: Breakeven Point 2
            points.push({ assetPrice: bep2, profitLoss: 0 }); 
            // Ponto 5: Lucro na Alta (Bem acima do BEP 2)
            points.push({ assetPrice: bep2 + 5, profitLoss: 5 * LOT_SIZE - maxLossValue }); 
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
        // Débito: Prêmio Call Comprada + Prêmio Put Comprada
        const netPremiumUnitario = callLeg.premio + putLeg.premio;
        
        const cashFlowBruto = netPremiumUnitario * multiplicadorContrato;
        const natureza: NaturezaOperacao = 'DÉBITO';
        const cash_flow_liquido = cashFlowBruto + FEES; // Débito Líquido = Débito Bruto + Taxas

        // --- 2. Risco e Retorno ---
        // Risco Máximo (Max Loss): Custo total (Débito Líquido)
        const risco_maximo: ProfitLossValue = cash_flow_liquido; 
        const max_loss: ProfitLossValue = risco_maximo;

        // Lucro Máximo (Max Profit): Ilimitado
        const lucro_maximo: ProfitLossValue = Infinity; 
        const max_profit: ProfitLossValue = lucro_maximo;

        // --- 3. Pontos Chave ---
        // Breakeven Points (Dois pontos)
        const breakeven1 = (K_put) - netPremiumUnitario;
        const breakeven2 = (K_call) + netPremiumUnitario;
        const breakEvenPoints = [breakeven1, breakeven2]; // ✅ INCLUÍDO
        
        // Lucro Máximo é atingido fora dos BEPs, não é um preço fixo
        const minPriceToMaxProfit = breakeven2; // Acima do BEP Superior
        const maxPriceToMaxProfit = breakeven1; // Abaixo do BEP Inferior
        
        // Width: Distância entre os strikes
        const width = K_call - K_put; // ✅ INCLUÍDO

        // --- 4. Gregas ---
        const greeks: Greeks = {
            delta: (callLeg.gregas_unitarias.delta ?? 0) * 1 + (putLeg.gregas_unitarias.delta ?? 0) * 1,
            gamma: (callLeg.gregas_unitarias.gamma ?? 0) * 1 + (putLeg.gregas_unitarias.gamma ?? 0) * 1,
            theta: (callLeg.gregas_unitarias.theta ?? 0) * 1 + (putLeg.gregas_unitarias.theta ?? 0) * 1,
            vega: (callLeg.gregas_unitarias.vega ?? 0) * 1 + (putLeg.gregas_unitarias.vega ?? 0) * 1,
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            { derivative: callLeg, direction: 'COMPRA', multiplier: 1, display: generateDisplay(callLeg, 'COMPRA', K_call) },
            { derivative: putLeg, direction: 'COMPRA', multiplier: 1, display: generateDisplay(putLeg, 'COMPRA', K_put) },
        ];
        
        // ROI é tecnicamente infinito, mas usamos 99999 para fins práticos em sistemas.
        const roi = 99999; // ✅ INCLUÍDO

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
            initialCashFlow: -cashFlowBruto, // ✅ INCLUÍDO (Débito inicial deve ser negativo)
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