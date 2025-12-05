// src/strategies/IronCondorSpread.ts
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

export class IronCondorSpread implements IStrategy {
    
    public readonly name: string = 'Iron Condor Spread (Crédito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA'; // Visão: Neutra/Baixa Volatilidade
    
    getDescription(): string {
        return 'Estratégia de Baixa Volatilidade a Crédito. Vende Put e Call internas, Compra Put e Call externas.';
    }

    getLegCount(): number {
        return 4;
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        const points: Array<{ assetPrice: number; profitLoss: number }> = [];
        const strikes = metrics.pernas.map(p => p.derivative.strike).sort((a, b) => (a ?? 0) - (b ?? 0));
        const [P2, P1, C1, C2] = strikes;

        if (P2 && P1 && C1 && C2 && metrics.breakEvenPoints.length === 2) {
            const bep1 = metrics.breakEvenPoints[0] as number;
            const bep2 = metrics.breakEvenPoints[1] as number;
            
            // Ponto 1: Perda Máxima (Abaixo de P2)
            points.push({ assetPrice: P2 - 5, profitLoss: -metrics.max_loss as number }); 
            // Ponto 2: Breakeven Point 1
            points.push({ assetPrice: bep1, profitLoss: 0 }); 
            // Ponto 3: Lucro Máximo (Entre P1 e C1)
            points.push({ assetPrice: (P1 + C1) / 2, profitLoss: metrics.max_profit as number }); 
            // Ponto 4: Breakeven Point 2
            points.push({ assetPrice: bep2, profitLoss: 0 }); 
            // Ponto 5: Perda Máxima (Acima de C2)
            points.push({ assetPrice: C2 + 5, profitLoss: -metrics.max_loss as number }); 
        }
        return points;
    }

    calculateMetrics(legData: OptionLeg[]): StrategyMetrics | null {
        if (legData.length !== 4) return null;

        // Separação e ordenação das pernas
        const putLegs = legData.filter(leg => leg.tipo === 'PUT').sort((a, b) => (b.strike ?? 0) - (a.strike ?? 0));
        const callLegs = legData.filter(leg => leg.tipo === 'CALL').sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));

        if (putLegs.length !== 2 || callLegs.length !== 2) return null;

        const P1_short = putLegs[0];  // Put Strike Alto (Vendido)
        const P2_long = putLegs[1];   // Put Strike Baixo (Comprado)
        const C1_short = callLegs[0]; // Call Strike Baixo (Vendido)
        const C2_long = callLegs[1];  // Call Strike Alto (Comprado)
        
        const P1 = P1_short.strike;
        const P2 = P2_long.strike;
        const C1 = C1_short.strike;
        const C2 = C2_long.strike;

        // Verifica se os strikes e vencimentos estão corretos
        if (P1 === null || P2 === null || C1 === null || C2 === null || P2 >= P1 || P1 >= C1 || C1 >= C2 || 
            P1_short.vencimento !== C2_long.vencimento) return null;

        // --- 1. Fluxo de Caixa ---
        const multiplicadorContrato = LOT_SIZE; 
        // Net Premium: (Prêmio P1 + Prêmio C1) - (Prêmio P2 + Prêmio C2). Deve ser positivo (Crédito).
        const netPremiumUnitario = (P1_short.premio + C1_short.premio) - (P2_long.premio + C2_long.premio);
        
        if (netPremiumUnitario <= 0) return null; // Deve ser um Crédito Líquido

        const cashFlowBruto = netPremiumUnitario * multiplicadorContrato;
        const natureza: NaturezaOperacao = 'CRÉDITO';
        const cash_flow_liquido = cashFlowBruto - FEES;

        // --- 2. Risco e Retorno ---
        const widthPut = P1 - P2;
        const widthCall = C2 - C1;
        const maxWidth = Math.max(widthPut, widthCall); // A largura que define a perda

        // Lucro Máximo (Max Profit): Crédito Líquido recebido
        const lucro_maximo: ProfitLossValue = cash_flow_liquido; 
        const max_profit: ProfitLossValue = lucro_maximo;

        // Risco Máximo (Max Loss): Largura do Spread (máxima) - Crédito Bruto + Taxas
        const risco_maximo_total = (maxWidth * multiplicadorContrato) - cashFlowBruto + FEES;
        const risco_maximo: ProfitLossValue = risco_maximo_total;
        const max_loss: ProfitLossValue = risco_maximo;

        // --- 3. Pontos Chave ---
        // Breakeven Points
        const breakeven1 = P1 - netPremiumUnitario; // Perna Put (Inferior)
        const breakeven2 = C1 + netPremiumUnitario; // Perna Call (Superior)
        const breakEvenPoints = [breakeven1, breakeven2]; // 📢 INCLUÍDO
        
        // Lucro Máximo é atingido entre os strikes vendidos (P1 e C1)
        const minPriceToMaxProfit = P1; // 📢 INCLUÍDO
        const maxPriceToMaxProfit = C1; // 📢 INCLUÍDO
        
        // Width: A largura total da estratégia
        const width = C2 - P2; // 📢 INCLUÍDO

        // --- 4. Gregas ---
        const greeks: Greeks = {
            delta: (P1_short.gregas_unitarias.delta ?? 0) * -1 + (P2_long.gregas_unitarias.delta ?? 0) * 1 +
                   (C1_short.gregas_unitarias.delta ?? 0) * -1 + (C2_long.gregas_unitarias.delta ?? 0) * 1,
            gamma: (P1_short.gregas_unitarias.gamma ?? 0) * -1 + (P2_long.gregas_unitarias.gamma ?? 0) * 1 +
                   (C1_short.gregas_unitarias.gamma ?? 0) * -1 + (C2_long.gregas_unitarias.gamma ?? 0) * 1,
            theta: (P1_short.gregas_unitarias.theta ?? 0) * -1 + (P2_long.gregas_unitarias.theta ?? 0) * 1 +
                   (C1_short.gregas_unitarias.theta ?? 0) * -1 + (C2_long.gregas_unitarias.theta ?? 0) * 1,
            vega: (P1_short.gregas_unitarias.vega ?? 0) * -1 + (P2_long.gregas_unitarias.vega ?? 0) * 1 +
                  (C1_short.gregas_unitarias.vega ?? 0) * -1 + (C2_long.gregas_unitarias.vega ?? 0) * 1,
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            { derivative: P1_short, direction: 'VENDA', multiplier: 1, display: generateDisplay(P1_short, 'VENDA', P1) },
            { derivative: P2_long, direction: 'COMPRA', multiplier: 1, display: generateDisplay(P2_long, 'COMPRA', P2) },
            { derivative: C1_short, direction: 'VENDA', multiplier: 1, display: generateDisplay(C1_short, 'VENDA', C1) },
            { derivative: C2_long, direction: 'COMPRA', multiplier: 1, display: generateDisplay(C2_long, 'COMPRA', C2) },
        ];
        
        const roi = (max_profit as number) / (max_loss as number); // 📢 INCLUÍDO

        // --- 6. Agregação Final (Preenchendo TODOS os campos requeridos) ---
        return {
            // --- Identificação e Resumo ---
            name: this.name,
            asset: P1_short.ativo_subjacente,
            spread_type: 'IRON CONDOR', // 📢 INCLUÍDO
            vencimento: P1_short.vencimento,
            expiration: P1_short.vencimento, // 📢 INCLUÍDO
            dias_uteis: P1_short.dias_uteis ?? 0, // 📢 INCLUÍDO
            strike_description: `R$ ${P2?.toFixed(2)} - R$ ${C2?.toFixed(2)}`, // 📢 INCLUÍDO
            
            // --- Fluxo de Caixa e Natureza ---
            net_premium: netPremiumUnitario, 
            cash_flow_bruto: cashFlowBruto,
            cash_flow_liquido: cash_flow_liquido,
            initialCashFlow: cashFlowBruto, // 📢 INCLUÍDO (Crédito inicial deve ser positivo)
            natureza: natureza,

            // --- Risco e Retorno ---
            risco_maximo: risco_maximo,
            lucro_maximo: lucro_maximo, 
            max_profit: max_profit,
            max_loss: max_loss,
            
            current_pnl: 0, 
            current_price: 0, 

            // --- Pontos Chave ---
            breakEvenPoints: breakEvenPoints, // 📢 INCLUÍDO
            breakeven_low: breakeven1, 
            breakeven_high: breakeven2, 
            
            // --- Propriedades de Estrutura ---
            width: width, // 📢 INCLUÍDO (Largura total)
            minPriceToMaxProfit: minPriceToMaxProfit, // 📢 INCLUÍDO
            maxPriceToMaxProfit: maxPriceToMaxProfit, // 📢 INCLUÍDO
            
            // --- Métrica de Performance e Priorização ---
            risco_retorno_unitario: roi, 
            rentabilidade_max: roi,
            roi: roi, // 📢 INCLUÍDO
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