// src/strategies/CalendarSpread.ts
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
    return `${action}-${typeInitial} ${leg.ativo_subjacente} K${strikeStr} T${leg.dias_uteis}`;
}

export class CalendarSpread implements IStrategy {
    
    public readonly name: string = 'Long Calendar Spread (Débito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA'; // Visão: Neutra/Favorável ao tempo
    
    getDescription(): string {
        return 'Estratégia de Baixa Volatilidade (Tempo). Vende Opção Curta, Compra Opção Longa (mesmo Strike).';
    }

    getLegCount(): number {
        return 2;
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        const points: Array<{ assetPrice: number; profitLoss: number }> = [];
        const strike = metrics.pernas[0].derivative.strike ?? 0;

        if (strike > 0 && metrics.breakEvenPoints.length === 2) {
            const bep1 = metrics.breakEvenPoints[0] as number;
            const bep2 = metrics.breakEvenPoints[1] as number;
            
            // Ponto 1: Lucro/Prejuízo na extrema esquerda (Baixa volatilidade)
            points.push({ assetPrice: strike - 5, profitLoss: -metrics.max_loss as number }); 
            // Ponto 2: Breakeven Point 1
            points.push({ assetPrice: bep1, profitLoss: 0 }); 
            // Ponto 3: Lucro Máximo (No Strike Central K)
            points.push({ assetPrice: strike, profitLoss: metrics.max_profit as number }); 
            // Ponto 4: Breakeven Point 2
            points.push({ assetPrice: bep2, profitLoss: 0 }); 
            // Ponto 5: Lucro/Prejuízo na extrema direita (Alta volatilidade)
            points.push({ assetPrice: strike + 5, profitLoss: -metrics.max_loss as number }); 
        }
        return points;
    }

    calculateMetrics(legData: OptionLeg[]): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        const [leg1, leg2] = legData.sort((a, b) => (a.dias_uteis ?? 0) - (b.dias_uteis ?? 0));
        
        const shortLeg = leg1; // Vencimento Curto (Venda)
        const longLeg = leg2;   // Vencimento Longo (Compra)
        
        const K = shortLeg.strike;

        // Regras para Calendar Spread de Débito (Long Calendar)
        if (K === null || shortLeg.strike !== longLeg.strike || shortLeg.dias_uteis === longLeg.dias_uteis) return null;
        
        // Deve ser uma operação a débito (preço longo > preço curto)
        const netPremiumUnitario = longLeg.premio - shortLeg.premio;
        if (netPremiumUnitario <= 0) return null;

        // --- 1. Fluxo de Caixa ---
        const multiplicadorContrato = LOT_SIZE; 
        const cashFlowBruto = netPremiumUnitario * multiplicadorContrato;
        const natureza: NaturezaOperacao = 'DÉBITO';
        const cash_flow_liquido = cashFlowBruto + FEES; // Débito Líquido = Débito Bruto + Taxas

        // --- 2. Risco e Retorno ---
        // Risco Máximo (Max Loss): Custo total (Débito Líquido)
        const risco_maximo: ProfitLossValue = cash_flow_liquido; 
        const max_loss: ProfitLossValue = risco_maximo;
        
        // Lucro Máximo (Max Profit): Apenas estimado. Estimativa conservadora.
        // Assumimos que a opção curta zera e a longa mantém 50% do seu prêmio (Estimativa)
        const premioOpcaoLongaNoVencCurtoEstimado = longLeg.premio * 0.5; 
        const lucro_maximo_total_estimado = (premioOpcaoLongaNoVencCurtoEstimado * multiplicadorContrato) - cashFlowBruto - FEES;

        const lucro_maximo: ProfitLossValue = lucro_maximo_total_estimado;
        const max_profit: ProfitLossValue = lucro_maximo;

        // --- 3. Pontos Chave ---
        // Pontos de Breakeven (Apenas estimados)
        const bepOffset = netPremiumUnitario * 1.2; // Offset de Breakeven (Estimativa)
        const bep1 = K - bepOffset;
        const bep2 = K + bepOffset;
        const breakEvenPoints = [bep1, bep2]; 
        
        // Lucro Máximo é atingido no strike central K (no vencimento da perna curta)
        const minPriceToMaxProfit = K; 
        const maxPriceToMaxProfit = K; 
        
        // Width: Usaremos 0, pois é um spread horizontal (mesmo strike)
        const width = 0; 

        // --- 4. Gregas ---
        const greeks: Greeks = {
            delta: (longLeg.gregas_unitarias.delta ?? 0) * 1 + (shortLeg.gregas_unitarias.delta ?? 0) * -1,
            gamma: (longLeg.gregas_unitarias.gamma ?? 0) * 1 + (shortLeg.gregas_unitarias.gamma ?? 0) * -1,
            theta: (longLeg.gregas_unitarias.theta ?? 0) * 1 + (shortLeg.gregas_unitarias.theta ?? 0) * -1,
            vega: (longLeg.gregas_unitarias.vega ?? 0) * 1 + (shortLeg.gregas_unitarias.vega ?? 0) * -1,
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            { derivative: shortLeg, direction: 'VENDA', multiplier: 1, display: generateDisplay(shortLeg, 'VENDA', K) },
            { derivative: longLeg, direction: 'COMPRA', multiplier: 1, display: generateDisplay(longLeg, 'COMPRA', K) },
        ];
        
        const roi = (max_profit as number) / (max_loss as number); 

        // --- 6. Agregação Final (Preenchendo TODOS os campos requeridos) ---
        return {
            // --- Identificação e Resumo ---
            name: this.name,
            asset: shortLeg.ativo_subjacente, // CORRIGIDO: Usando shortLeg
            spread_type: 'CALENDAR SPREAD',
            vencimento: shortLeg.vencimento,
            expiration: shortLeg.vencimento, 
            dias_uteis: shortLeg.dias_uteis ?? 0, 
            strike_description: `R$ ${K?.toFixed(2)}`,
            
            // --- Fluxo de Caixa e Natureza ---
            net_premium: netPremiumUnitario, 
            cash_flow_bruto: cashFlowBruto,
            cash_flow_liquido: cash_flow_liquido,
            initialCashFlow: -cashFlowBruto, 
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
            breakeven_low: bep1, 
            breakeven_high: bep2, 
            
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