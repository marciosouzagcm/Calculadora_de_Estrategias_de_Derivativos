// src/strategies/BullPutSpread.ts
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

export class BullPutSpread implements IStrategy {
    
    public readonly name: string = 'Bull Put Spread (Crédito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'ALTA'; // Visão: Alta
    
    getDescription(): string {
        return 'Estratégia de Alta (Bullish) a Crédito. Vende Put de strike alto (K1) e Compra Put de strike baixo (K2).';
    }

    getLegCount(): number {
        return 2;
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        const points: Array<{ assetPrice: number; profitLoss: number }> = [];
        // K1 é o Strike Vendido (Maior), K2 é o Strike Comprado (Menor)
        const K1 = (metrics.pernas.find(p => p.direction === 'VENDA')?.derivative.strike) ?? 0;
        const K2 = (metrics.pernas.find(p => p.direction === 'COMPRA')?.derivative.strike) ?? 0;

        if (K1 > K2 && K2 > 0 && metrics.breakEvenPoints.length > 0) {
            const bep = metrics.breakEvenPoints[0] as number;
            
            // Ponto 1: Lucro Máximo (Acima de K1)
            points.push({ assetPrice: K1 + 5, profitLoss: metrics.max_profit as number }); 
            // Ponto 2: Breakeven Point
            points.push({ assetPrice: bep, profitLoss: 0 }); 
            // Ponto 3: Prejuízo Máximo (Abaixo de K2)
            points.push({ assetPrice: K2 - 5, profitLoss: -metrics.max_loss as number }); 
        }
        return points;
    }

    calculateMetrics(legData: OptionLeg[]): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        // Ordenamos do maior strike para o menor (K1 > K2)
        const putLegs = legData.filter(leg => leg.tipo === 'PUT').sort((a, b) => (b.strike ?? 0) - (a.strike ?? 0));
        
        if (putLegs.length !== 2) return null;

        const K1_short = putLegs[0];  // Strike Maior (Venda)
        const K2_long = putLegs[1]; // Strike Menor (Compra)
        
        const K1 = K1_short.strike;
        const K2 = K2_long.strike;

        if (K1 === null || K2 === null || K1 <= K2 || K1_short.vencimento !== K2_long.vencimento) return null;

        // --- 1. Fluxo de Caixa ---
        const multiplicadorContrato = LOT_SIZE; 
        // Net Premium: Prêmio Venda K1 - Prêmio Compra K2. Deve ser positivo (Crédito).
        const netPremiumUnitario = K1_short.premio - K2_long.premio;
        
        if (netPremiumUnitario <= 0) return null; // Deve ser um Crédito Líquido

        const cashFlowBruto = netPremiumUnitario * multiplicadorContrato;
        const natureza: NaturezaOperacao = 'CRÉDITO';
        const cash_flow_liquido = cashFlowBruto - FEES;

        // --- 2. Risco e Retorno ---
        const widthUnitario = K1 - K2; 
        const width = widthUnitario * multiplicadorContrato; 
        
        // Lucro Máximo (Max Profit): Crédito Líquido recebido
        const lucro_maximo: ProfitLossValue = cash_flow_liquido; 
        const max_profit: ProfitLossValue = lucro_maximo;

        // Risco Máximo (Max Loss): Largura do Spread - Crédito Bruto + Taxas
        const risco_maximo_total = width - cashFlowBruto + FEES;
        const risco_maximo: ProfitLossValue = risco_maximo_total;
        const max_loss: ProfitLossValue = risco_maximo;

        // --- 3. Pontos Chave ---
        // Breakeven (Put: K1 - Crédito Líquido Unitário)
        const breakeven = K1 - netPremiumUnitario; 
        const breakEvenPoints = [breakeven]; 
        
        // Lucro Máximo é atingido quando o preço do ativo é >= K1
        const minPriceToMaxProfit = K1; 
        const maxPriceToMaxProfit = widthUnitario > 0 ? 1000000 : 0; 

        // --- 4. Gregas ---
        const greeks: Greeks = {
            delta: (K1_short.gregas_unitarias.delta ?? 0) * -1 + (K2_long.gregas_unitarias.delta ?? 0) * 1,
            gamma: (K1_short.gregas_unitarias.gamma ?? 0) * -1 + (K2_long.gregas_unitarias.gamma ?? 0) * 1,
            theta: (K1_short.gregas_unitarias.theta ?? 0) * -1 + (K2_long.gregas_unitarias.theta ?? 0) * 1,
            vega: (K1_short.gregas_unitarias.vega ?? 0) * -1 + (K2_long.gregas_unitarias.vega ?? 0) * 1,
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            { derivative: K1_short, direction: 'VENDA', multiplier: 1, display: generateDisplay(K1_short, 'VENDA', K1) },
            { derivative: K2_long, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K2_long, 'COMPRA', K2) },
        ];
        
        const roi = (max_profit as number) / (max_loss as number); 

        // --- 6. Agregação Final (Preenchendo TODOS os campos requeridos) ---
        return {
            // --- Identificação e Resumo ---
            name: this.name,
            asset: K1_short.ativo_subjacente,
            spread_type: 'VERTICAL PUT',
            vencimento: K1_short.vencimento,
            expiration: K1_short.vencimento, // Incluído
            dias_uteis: K1_short.dias_uteis ?? 0, 
            strike_description: `R$ ${K1?.toFixed(2)} / R$ ${K2?.toFixed(2)}`,
            
            // --- Fluxo de Caixa e Natureza ---
            net_premium: netPremiumUnitario, 
            cash_flow_bruto: cashFlowBruto,
            cash_flow_liquido: cash_flow_liquido,
            initialCashFlow: cashFlowBruto, // Incluído (Crédito inicial deve ser positivo)
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
            breakeven_low: breakeven, 
            breakeven_high: breakeven, 
            
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
}