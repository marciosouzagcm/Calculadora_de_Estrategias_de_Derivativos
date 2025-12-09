// src/strategies/CalendarSpread.ts
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, ProfitLossValue, StrategyLeg, StrategyMetrics } from '../interfaces/Types';

// Constantes fictícias
const LOT_SIZE = 100; // Assumimos 100 para converter a taxa por lote para taxa por ação

// Função auxiliar para gerar a string de display
function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', strike: number | null): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const strikeStr = strike?.toFixed(2) || 'N/A';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.ativo_subjacente} K${strikeStr}`;
}

export class CalendarSpread implements IStrategy {
    
    // Supondo Long Calendar Spread (Venda Curta, Compra Longa, mesmo strike)
    public readonly name: string = 'Long Calendar Spread (Débito)';
    public readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA'; // Visão: Estável, mas Volatilidade Implícita crescente
    
    getDescription(): string {
        return 'Estratégia de tempo (Time Spread) a Débito. Vende uma opção com vencimento mais próximo (Short Leg) e Compra uma opção com vencimento mais distante (Long Leg), ambas no mesmo strike.';
    }

    getLegCount(): number {
        return 2;
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        // O payoff de Calendar Spread é complexo pois depende do tempo (theta),
        // mas no vencimento da perna Curta (Short Leg), o perfil é de pico.
        const points: Array<{ assetPrice: number; profitLoss: number }> = [];
        
        // Usa o strike da perna longa para garantir que tenha strike
        const K_strike = (metrics.pernas.find(p => p.direction === 'COMPRA')?.derivative.strike) ?? 0;
        
        // Em Long Calendar, o lucro máximo ocorre no strike K no vencimento da opção curta.
        // Os BEPs são simétricos ao redor do strike.
        if (K_strike > 0 && metrics.breakEvenPoints.length === 2) {
            const bep1 = metrics.breakEvenPoints[0] as number;
            const bep2 = metrics.breakEvenPoints[1] as number;
            
            // Multiplica o risco unitário por LOT_SIZE para o gráfico
            const maxLossTotal = (metrics.max_loss as number) * LOT_SIZE;
            const maxProfitTotal = (metrics.max_profit as number) * LOT_SIZE;
            
            // Ponto 1: Prejuízo (Abaixo do BEP 1)
            points.push({ assetPrice: bep1 - 5, profitLoss: -maxLossTotal }); 
            // Ponto 2: Breakeven Point 1
            points.push({ assetPrice: bep1, profitLoss: 0 }); 
            // Ponto 3: Lucro Máximo (No Strike K)
            points.push({ assetPrice: K_strike, profitLoss: maxProfitTotal }); 
            // Ponto 4: Breakeven Point 2
            points.push({ assetPrice: bep2, profitLoss: 0 });
            // Ponto 5: Prejuízo (Acima do BEP 2)
            points.push({ assetPrice: bep2 + 5, profitLoss: -maxLossTotal });
        }
        return points;
    }

    /**
     * @inheritdoc IStrategy.calculateMetrics
     */
    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        // Ordenar por vencimento (vencimento mais curto primeiro)
        const sortedLegs = legData.sort((a: OptionLeg, b: OptionLeg) => {
            const dateA = new Date(a.vencimento);
            const dateB = new Date(b.vencimento);
            return dateA.getTime() - dateB.getTime();
        });
        
        const shortLeg = sortedLegs[0];  // Vencimento Curto (Venda)
        const longLeg = sortedLegs[1]; // Vencimento Longo (Compra)
        
        const K_strike = shortLeg.strike;

        // O Calendar Spread exige o mesmo strike e vencimentos diferentes.
        if (K_strike === null || K_strike !== longLeg.strike || shortLeg.vencimento === longLeg.vencimento) return null;
        
        // Para ser um LONG Calendar Spread (débito), Prêmio Longo > Prêmio Curto
        if (longLeg.premio <= shortLeg.premio) return null; 

        // --- 1. Fluxo de Caixa (UNITÁRIO) ---
        
        // Débito Bruto Unitário = Prêmio Longo - Prêmio Curto
        const cashFlowBrutoUnitario = longLeg.premio - shortLeg.premio;
        
        const natureza: NaturezaOperacao = 'DÉBITO';
        
        // Taxa Unitária por Ação (Total fees / Lote)
        const totalFeesUnitario = (feePerLeg * 2) / LOT_SIZE; 
        
        // Débito líquido Unitário = Débito Bruto Unitário + Taxas Unitárias
        const cash_flow_liquido_unitario = cashFlowBrutoUnitario + totalFeesUnitario; 

        // --- 2. Risco e Retorno (UNITÁRIO) ---
        
        // Risco Máximo (Max Loss): É o custo inicial da operação (Débito líquido unitário)
        const max_loss: ProfitLossValue = cash_flow_liquido_unitario; 
        const risco_maximo: ProfitLossValue = max_loss;

        // Lucro Máximo (Max Profit): Placeholder (Exemplo: 2.5x o débito bruto unitário)
        // O lucro máximo REAL é o preço da opção longa - o débito inicial (Líquido)
        // O valor máximo que a opção longa pode ter no vencimento da curta é K_strike - K_strike (zero, se for OTM), mas geralmente é o valor intrínseco.
        // Usamos o placeholder com o prêmio bruto, pois o lucro máximo tende a ser maior que o débito:
        const max_profit_bruto_unitario = cashFlowBrutoUnitario * 2.5; 
        
        // Lucro Líquido = Lucro Bruto Placeholder - Taxas
        const lucro_maximo: ProfitLossValue = max_profit_bruto_unitario - totalFeesUnitario;
        const max_profit: ProfitLossValue = lucro_maximo;


        // --- 3. Pontos Chave ---
        // O cálculo exato dos BEPs para Calendar Spread é complexo e depende de modelos de precificação.
        // Usamos o risco/retorno unitário como base para os placeholders de BEP:
        const breakeven_offset = max_loss as number; // Usa o custo unitário como offset
        const breakeven1 = K_strike - breakeven_offset; 
        const breakeven2 = K_strike + breakeven_offset; 
        const breakEvenPoints = [breakeven1, breakeven2]; 

        // Lucro Máximo é atingido no Strike K no vencimento da perna curta
        const minPriceToMaxProfit = K_strike; 
        const maxPriceToMaxProfit = K_strike; 

        // --- 4. Gregas ---
        const greeks: Greeks = {
            // Delta: Compra Longa (1) + Venda Curta (-1)
            delta: (longLeg.gregas_unitarias.delta ?? 0) * 1 + (shortLeg.gregas_unitarias.delta ?? 0) * -1,
            gamma: (longLeg.gregas_unitarias.gamma ?? 0) * 1 + (shortLeg.gregas_unitarias.gamma ?? 0) * -1,
            // Theta: Longa (positivo) - Curta (negativo) = Positivo (desejado)
            theta: (longLeg.gregas_unitarias.theta ?? 0) * 1 + (shortLeg.gregas_unitarias.theta ?? 0) * -1, 
            // Vega: Longa (positivo) - Curta (negativo) = Positivo (desejado)
            vega: (longLeg.gregas_unitarias.vega ?? 0) * 1 + (shortLeg.gregas_unitarias.vega ?? 0) * -1, 
        };

        // --- 5. Pernas ---
        const pernas: StrategyLeg[] = [
            { derivative: shortLeg, direction: 'VENDA', multiplier: -1, display: generateDisplay(shortLeg, 'VENDA', K_strike) }, // Multiplier -1
            { derivative: longLeg, direction: 'COMPRA', multiplier: 1, display: generateDisplay(longLeg, 'COMPRA', K_strike) },
        ];
        
        const roi = (max_loss as number) > 0 ? (max_profit as number) / (max_loss as number) : 0; 
        
        // --- 6. Agregação Final (Valores UNITÁRIOS) ---
        return {
            // --- Identificação e Resumo ---
            name: this.name,
            asset: longLeg.ativo_subjacente,
            spread_type: 'CALENDAR SPREAD',
            vencimento: shortLeg.vencimento, // Vencimento considerado: da perna curta
            expiration: shortLeg.vencimento, 
            dias_uteis: shortLeg.dias_uteis ?? 0, 
            strike_description: `K: R$ ${K_strike?.toFixed(2)} (Mesmo Strike)`,
            
            asset_price: assetPrice, 
            
            // --- Fluxo de Caixa e Natureza (UNITÁRIOS) ---
            net_premium: cashFlowBrutoUnitario, // Net premium unitário (custo)
            cash_flow_bruto: cashFlowBrutoUnitario,
            cash_flow_liquido: cash_flow_liquido_unitario,
            initialCashFlow: -cashFlowBrutoUnitario, // Débito inicial Bruto é negativo (unitário)
            natureza: natureza,

            // --- Risco e Retorno (UNITÁRIOS) ---
            risco_maximo: risco_maximo, // Risco Líquido por ação (unitário)
            lucro_maximo: lucro_maximo, // Lucro Líquido por ação (unitário)
            max_profit: max_profit,
            max_loss: max_loss,
            
            current_pnl: 0, 
            current_price: assetPrice, 
            
            // --- Pontos Chave ---
            breakEvenPoints: breakEvenPoints, 
            breakeven_low: breakeven1, 
            breakeven_high: breakeven2, 
            
            // --- Propriedades de Estrutura ---
            width: 0, // Calendar Spread não tem width de strike
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