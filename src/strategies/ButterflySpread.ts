// src/strategies/ButterflySpread.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, OptionLeg, StrategyMetrics, StrategyLeg, NaturezaOperacao, ProfitLossValue } from '../interfaces/Types';

// Constantes fictícias (assumindo que estas existem no seu ambiente)
const FEES = 0.50; 
const LOT_SIZE = 1; 

// Função auxiliar para gerar a string de display
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null, multiplier: number): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${multiplier}${action}-${typeInitial} ${leg.ativo_subjacente} K${strikeStr}`;
}

export class ButterflySpread implements IStrategy {
    
    public readonly name: string = 'Long Butterfly Spread (Débito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA'; // Visão: Neutra/Baixa Volatilidade
    
    getDescription(): string {
        return 'Estratégia de Baixa Volatilidade a Débito. Compra K1, Vende 2x K2, Compra K3 (Geralmente com Calls).';
    }

    getLegCount(): number {
        return 4; // 1 Compra, 2 Vendas, 1 Compra (Quatro pernas no total, mas 3 strikes diferentes)
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        const points: Array<{ assetPrice: number; profitLoss: number }> = [];
        const [k1, k2, k3] = metrics.pernas.map(p => p.derivative.strike).sort((a, b) => (a ?? 0) - (b ?? 0));

        if (k1 && k2 && k3 && k1 < k2 && k2 < k3 && metrics.breakEvenPoints.length === 2) {
            const bep1 = metrics.breakEvenPoints[0] as number;
            const bep2 = metrics.breakEvenPoints[1] as number;
            
            // Ponto 1: Prejuízo Máximo (Abaixo de K1)
            points.push({ assetPrice: k1 - 5, profitLoss: -metrics.max_loss as number }); 
            // Ponto 2: Breakeven Point 1
            points.push({ assetPrice: bep1, profitLoss: 0 }); 
            // Ponto 3: Lucro Máximo (No Strike Central K2)
            points.push({ assetPrice: k2, profitLoss: metrics.max_profit as number }); 
            // Ponto 4: Breakeven Point 2
            points.push({ assetPrice: bep2, profitLoss: 0 }); 
            // Ponto 5: Prejuízo Máximo (Acima de K3)
            points.push({ assetPrice: k3 + 5, profitLoss: -metrics.max_loss as number }); 
        }
        return points;
    }

    calculateMetrics(legData: OptionLeg[]): StrategyMetrics | null {
        // Assume-se que a entrada deve ter 4 pernas, com 3 strikes: K1 (C), K2 (2xV), K3 (C)
        if (legData.length !== 4) return null;

        const calls = legData.filter(leg => leg.tipo === 'CALL');
        if (calls.length !== 4) return null; // Apenas Butterfly com Call

        // Ordena por strike para identificar K1, K2, K3
        const sortedLegs = calls.sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
        
        const K1_long = sortedLegs[0];
        const K2_short_1 = sortedLegs[1];
        const K2_short_2 = sortedLegs[2];
        const K3_long = sortedLegs[3];

        const K1 = K1_long.strike;
        const K2 = K2_short_1.strike;
        const K3 = K3_long.strike;

        // Verifica se os strikes e vencimentos estão corretos para a borboleta simétrica
        if (K1 === null || K2 === null || K3 === null || K1 >= K2 || K2 >= K3 || 
            K2_short_1.strike !== K2_short_2.strike || K1_long.vencimento !== K3_long.vencimento) return null;

        // --- 1. Fluxo de Caixa ---
        const multiplicadorContrato = LOT_SIZE; 
        // Débito = (Prêmio K1 + Prêmio K3) - 2 * Prêmio K2. Deve ser positivo (Débito).
        const netPremiumUnitario = (K1_long.premio + K3_long.premio) - (K2_short_1.premio + K2_short_2.premio);
        
        if (netPremiumUnitario > 0) { // Borboleta Longa (Débito)
            const cashFlowBruto = netPremiumUnitario * multiplicadorContrato;
            const natureza: NaturezaOperacao = 'DÉBITO';
            const cash_flow_liquido = cashFlowBruto + FEES; // Débito Líquido = Débito Bruto + Taxas

            // --- 2. Risco e Retorno ---
            const widthUnitario = K3 - K1; 
            const width = widthUnitario * multiplicadorContrato; // Incluído
            
            // Risco Máximo (Max Loss): Custo total (Débito Líquido)
            const risco_maximo: ProfitLossValue = cash_flow_liquido; 
            const max_loss: ProfitLossValue = risco_maximo;

            // Lucro Máximo (Max Profit): Largura entre K1 e K2 - Débito Bruto - Taxas
            const larguraK1K2 = K2 - K1;
            const lucro_maximo_total = (larguraK1K2 * multiplicadorContrato) - cashFlowBruto - FEES;
            
            const lucro_maximo: ProfitLossValue = lucro_maximo_total;
            const max_profit: ProfitLossValue = lucro_maximo;

            // --- 3. Pontos Chave ---
            // Breakeven Points (Dois pontos)
            const bep1 = K1 + netPremiumUnitario;
            const bep2 = K3 - netPremiumUnitario;
            const breakEvenPoints = [bep1, bep2]; // Incluído
            
            // Lucro Máximo é atingido apenas no strike central K2
            const minPriceToMaxProfit = K2; // Incluído
            const maxPriceToMaxProfit = K2; // Incluído
            
            // --- 4. Gregas ---
            const greeks: Greeks = {
                delta: (K1_long.gregas_unitarias.delta ?? 0) * 1 + (K2_short_1.gregas_unitarias.delta ?? 0) * -2 + (K3_long.gregas_unitarias.delta ?? 0) * 1,
                gamma: (K1_long.gregas_unitarias.gamma ?? 0) * 1 + (K2_short_1.gregas_unitarias.gamma ?? 0) * -2 + (K3_long.gregas_unitarias.gamma ?? 0) * 1,
                theta: (K1_long.gregas_unitarias.theta ?? 0) * 1 + (K2_short_1.gregas_unitarias.theta ?? 0) * -2 + (K3_long.gregas_unitarias.theta ?? 0) * 1,
                vega: (K1_long.gregas_unitarias.vega ?? 0) * 1 + (K2_short_1.gregas_unitarias.vega ?? 0) * -2 + (K3_long.gregas_unitarias.vega ?? 0) * 1,
            };

            // --- 5. Pernas ---
            const pernas: StrategyLeg[] = [
                { derivative: K1_long, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K1_long, 'COMPRA', K1, 1) },
                { derivative: K2_short_1, direction: 'VENDA', multiplier: 2, display: generateDisplay(K2_short_1, 'VENDA', K2, 2) }, // Usa a primeira perna para o display e a soma das duas para métricas
                { derivative: K3_long, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K3_long, 'COMPRA', K3, 1) },
            ];
            
            const roi = (max_profit as number) / (max_loss as number); // Incluído

            // --- 6. Agregação Final (Preenchendo TODOS os campos requeridos) ---
            return {
                // ... (Campos de Identificação)
                name: this.name,
                asset: K1_long.ativo_subjacente,
                spread_type: 'BUTTERFLY CALL',
                vencimento: K1_long.vencimento,
                expiration: K1_long.vencimento, // Incluído
                dias_uteis: K1_long.dias_uteis ?? 0, 
                strike_description: `R$ ${K1?.toFixed(2)} / R$ ${K2?.toFixed(2)} / R$ ${K3?.toFixed(2)}`,
                
                // --- Fluxo de Caixa e Natureza ---
                net_premium: netPremiumUnitario, 
                cash_flow_bruto: cashFlowBruto,
                cash_flow_liquido: cash_flow_liquido,
                initialCashFlow: -cashFlowBruto, // Incluído (Débito inicial deve ser negativo)
                natureza: natureza,

                // --- Risco e Retorno ---
                risco_maximo: risco_maximo,
                lucro_maximo: lucro_maximo, 
                max_profit: max_profit,
                max_loss: max_loss,
                
                current_pnl: 0, 
                current_price: 0, 

                // --- Pontos Chave ---
                breakEvenPoints: breakEvenPoints, // Incluído
                breakeven_low: bep1, 
                breakeven_high: bep2, 
                
                // --- Propriedades de Estrutura ---
                width: width, // Incluído
                minPriceToMaxProfit: minPriceToMaxProfit, // Incluído
                maxPriceToMaxProfit: maxPriceToMaxProfit, // Incluído
                
                // --- Métrica de Performance e Priorização ---
                risco_retorno_unitario: roi, 
                rentabilidade_max: roi,
                roi: roi, // Incluído
                margem_exigida: max_loss as number,
                probabilidade_sucesso: 0, 
                score: 0, 
                should_close: false,
                
                // --- Detalhes ---
                pernas: pernas, 
                greeks: greeks, 
            } as StrategyMetrics;
        }

        return null;
    }
}