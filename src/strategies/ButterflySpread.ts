// src/strategies/ButterflySpread.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, ProfitLossValue, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

// Constantes fictícias
const LOT_SIZE = 100; // Assumimos 100 para converter a taxa por lote para taxa por ação
const FEES_PER_LEG_TOTAL = 0.50; // Exemplo de taxa por lote (usada para simulação)

// Função auxiliar para gerar a string de display
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.ativo_subjacente} K${strikeStr}`;
}

export class ButterflySpread implements IStrategy {
    
    public readonly name: string = 'Long Butterfly Call (Débito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA'; 
    
    getDescription(): string {
        return 'Estratégia de baixa volatilidade (neutra) a Débito. Compra 1 Call K1 (baixo), Vende 2 Calls K2 (meio, ATM) e Compra 1 Call K3 (alto).';
    }

    getLegCount(): number {
        return 3; // Long Butterfly Call: 1-2-1
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        
        // 1. Extração de strikes e pontos (REVISADO)
        const pernas = metrics.pernas;
        if (pernas.length !== 3) return [];
        
        // Extrai e ordena os strikes
        const strikes = pernas
            .map(p => p.derivative.strike)
            .filter((K): K is number => K !== null) 
            .sort((a, b) => a - b);
        
        if (strikes.length !== 3) return [];

        const [K1, K2, K3] = strikes; 

        // Usa os Breakeven Points calculados
        const bep1 = metrics.breakeven_low as number;
        const bep2 = metrics.breakeven_high as number;

        // Lucro/Risco Total (para o Payoff, usamos valores totais: Unitário * LOT_SIZE)
        const maxProfitTotal = (metrics.max_profit as number) * LOT_SIZE;
        const maxLossTotal = (metrics.max_loss as number) * LOT_SIZE;

        // 2. Definição do Range de Preços (S_T)
        const range = K3 - K1;
        const startPrice = K1 - range * 0.5;
        const endPrice = K3 + range * 0.5;
        const step = range / 20;

        const cashFlowLiquido = metrics.initialCashFlow as number * -1 * LOT_SIZE; // Débito é custo, então é negativo no P&L inicial
        const multiplicadorContrato = LOT_SIZE;
        
        const payoffData: Array<{ assetPrice: number; profitLoss: number }> = [];

        for (let S_T = startPrice; S_T <= endPrice; S_T += step) {
            let totalIntrinsicPL = 0;

            // --- 3. Cálculo do P/L Intrínseco por Perna ---
            for (const perna of pernas) {
                const K_perna = perna.derivative.strike as number;
                const tipo = perna.derivative.tipo;
                const direcao = perna.direction;
                const pernaMultiplier = perna.multiplier > 0 ? perna.multiplier : Math.abs(perna.multiplier); // Multiplier deve ser 1 ou 2 (valor absoluto)
                
                let intrinsicValueUnitario = 0;
                
                if (tipo === 'CALL') {
                    intrinsicValueUnitario = Math.max(0, S_T - K_perna);
                } else if (tipo === 'PUT') {
                    intrinsicValueUnitario = Math.max(0, K_perna - S_T);
                }
                
                const positionSign = direcao === 'COMPRA' ? 1 : -1;
                
                const pernaPL = intrinsicValueUnitario * positionSign * multiplicadorContrato * pernaMultiplier;
                
                totalIntrinsicPL += pernaPL;
            }
            
            // 4. P/L Total = P/L Intrínseco - Custo Líquido Total
            // Na Long Butterfly a débito, o cash flow é o custo inicial (saída de caixa),
            // então o P&L final é P/L Intrínseco - Custo Total.
            const profitLoss = totalIntrinsicPL - (metrics.cash_flow_liquido as number * LOT_SIZE);
            
            payoffData.push({ 
                assetPrice: parseFloat(S_T.toFixed(2)), 
                profitLoss: parseFloat(profitLoss.toFixed(2)) 
            });
        }
        
        return payoffData; 
    }
    
    /**
     * @inheritdoc IStrategy.calculateMetrics
     */
    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        // ... (Lógica de calculateMetrics não foi alterada, pois estava correta) ...

        if (legData.length !== 3) return null;

        const callLegs = legData.filter(leg => leg.tipo === 'CALL').sort((a: OptionLeg, b: OptionLeg) => (a.strike ?? 0) - (b.strike ?? 0));
        
        if (callLegs.length !== 3) return null;

        const K1_long = callLegs[0];  
        const K2_short = callLegs[1]; 
        const K3_long = callLegs[2];  

        const K1 = K1_long.strike;
        const K2 = K2_short.strike;
        const K3 = K3_long.strike;
        
        if (K1 === null || K2 === null || K3 === null || K1 >= K2 || K2 >= K3 || K1_long.vencimento !== K2_short.vencimento || K2_short.vencimento !== K3_long.vencimento) return null;

        // --- 1. Fluxo de Caixa (UNITÁRIO) ---
        const cashFlowBrutoUnitario = K1_long.premio + K3_long.premio - (K2_short.premio * 2);
        
        // Garantindo que é Débito (Custo)
        if (cashFlowBrutoUnitario <= 0) return null; 

        const natureza: NaturezaOperacao = 'DÉBITO';
        
        const totalFeesUnitario = (feePerLeg * 4) / LOT_SIZE; 
        
        // Débito líquido Unitário = Débito Bruto Unitário + Taxas Unitárias
        const cash_flow_liquido_unitario = cashFlowBrutoUnitario + totalFeesUnitario; 

        // --- 2. Risco e Retorno (UNITÁRIO) ---
        const widthUnitario = K2 - K1; 
        
        // Risco Máximo (Max Loss): Débito líquido unitário
        const max_loss: ProfitLossValue = cash_flow_liquido_unitario;
        const risco_maximo: ProfitLossValue = max_loss;

        // Lucro Máximo (Max Profit): Largura Unitária - Custo Bruto Unitário - Taxas
        const max_profit: ProfitLossValue = widthUnitario - cash_flow_liquido_unitario;
        const lucro_maximo: ProfitLossValue = max_profit;
        
        // --- 3. Pontos Chave ---
        // Breakeven 1 (Inferior): K1 + Débito Bruto Unitário
        const breakeven1 = K1 + cashFlowBrutoUnitario; 
        // Breakeven 2 (Superior): K3 - Débito Bruto Unitário
        const breakeven2 = K3 - cashFlowBrutoUnitario; 
        const breakEvenPoints = [breakeven1, breakeven2]; 

        const minPriceToMaxProfit = K2; 
        const maxPriceToMaxProfit = K2; 

        // --- 4. Gregas ---
        const greeks: Greeks = {
            delta: (K1_long.gregas_unitarias.delta ?? 0) * 1 + (K2_short.gregas_unitarias.delta ?? 0) * -2 + (K3_long.gregas_unitarias.delta ?? 0) * 1,
            gamma: (K1_long.gregas_unitarias.gamma ?? 0) * 1 + (K2_short.gregas_unitarias.gamma ?? 0) * -2 + (K3_long.gregas_unitarias.gamma ?? 0) * 1,
            theta: (K1_long.gregas_unitarias.theta ?? 0) * 1 + (K2_short.gregas_unitarias.theta ?? 0) * -2 + (K3_long.gregas_unitarias.theta ?? 0) * 1,
            vega: (K1_long.gregas_unitarias.vega ?? 0) * 1 + (K2_short.gregas_unitarias.vega ?? 0) * -2 + (K3_long.gregas_unitarias.vega ?? 0) * 1,
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            { derivative: K1_long, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K1_long, 'COMPRA', K1) },
            { derivative: K2_short, direction: 'VENDA', multiplier: 2, display: generateDisplay(K2_short, 'VENDA', K2) }, // Multiplier 2, direção VENDA
            { derivative: K3_long, direction: 'COMPRA', multiplier: 1, display: generateDisplay(K3_long, 'COMPRA', K3) },
        ];
        
        const roi = (max_loss as number) > 0 ? (max_profit as number) / (max_loss as number) : 0; 
        
        // --- 6. Agregação Final ---
        return {
            name: this.name,
            asset: K1_long.ativo_subjacente,
            spread_type: 'BUTTERFLY CALL',
            vencimento: K1_long.vencimento,
            expiration: K1_long.vencimento, 
            dias_uteis: K1_long.dias_uteis ?? 0, 
            strike_description: `R$ ${K1?.toFixed(2)} / R$ ${K2?.toFixed(2)} / R$ ${K3?.toFixed(2)}`,
            
            asset_price: assetPrice, 
            
            // --- Fluxo de Caixa e Natureza (UNITÁRIOS) ---
            net_premium: cashFlowBrutoUnitario, 
            cash_flow_bruto: cashFlowBrutoUnitario * LOT_SIZE,
            cash_flow_liquido: cash_flow_liquido_unitario * LOT_SIZE, // TOTAL
            initialCashFlow: cash_flow_liquido_unitario * LOT_SIZE, // Débito Líquido TOTAL
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
            width: widthUnitario, 
            minPriceToMaxProfit: minPriceToMaxProfit, 
            maxPriceToMaxProfit: maxPriceToMaxProfit, 
            
            // --- Métrica de Performance ---
            risco_retorno_unitario: roi, 
            rentabilidade_max: roi,
            roi: roi, 
            margem_exigida: max_loss as number, 
            probabilidade_sucesso: 0, 
            score: roi * 10,
            should_close: false,
            
            // --- Detalhes ---
            pernas: pernas, 
            greeks: greeks, 
        } as StrategyMetrics;
    }
}