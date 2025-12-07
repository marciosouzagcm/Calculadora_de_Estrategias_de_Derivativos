// src/interfaces/Types.ts

/**
 * @fileoverview Definições de tipos de dados para Derivativos, Pernas de Opções e Métricas de Estratégias.
 * Este arquivo define a estrutura de dados central utilizada na calculadora.
 */

// ====================================================================
// TIPOS BÁSICOS
// ====================================================================

/**
 * Tipo de união para valores de Lucro ou Risco que podem ser numéricos ou ilimitados.
 */
export type ProfitLossValue = number | 'Ilimitado' | 'Ilimitada';

/**
 * Tipo de Posição: Direção da operação.
 */
export type PositionDirection = 'COMPRA' | 'VENDA' | 'SUBJACENTE';

/**
 * Natureza financeira da operação (Fluxo de Caixa Inicial).
 */
export type NaturezaOperacao = 'DÉBITO' | 'CRÉDITO' | 'NEUTRA'; 

// ====================================================================
// INTERFACES UNITÁRIAS
// ====================================================================

/**
 * Tipo para as letras gregas (Delta, Gamma, Theta, Vega).
 */
export interface Greeks {
    readonly delta: number | null; 
    readonly gamma: number | null; 
    readonly theta: number | null; 
    readonly vega: number | null; 
}

/**
 * Dados de um único derivativo (Opção ou Subjacente) para uso em uma perna.
 */
export interface OptionLeg {
    // --- Identificação e Características do Contrato ---
    readonly option_ticker: string; 
    readonly ativo_subjacente: string; 
    readonly vencimento: string; 
    readonly dias_uteis: number; 
    readonly tipo: 'CALL' | 'PUT' | 'SUBJACENTE'; 
    readonly strike: number | null; 
    readonly multiplicador_contrato: number; 

    // --- Dados de Mercado/Cálculo Unitário ---
    premio: number; 
    vol_implicita: number | null; 
    gregas_unitarias: Greeks; // Usa a interface Greeks
}

/**
 * Tipo para a perna dentro de uma estratégia.
 */
export interface StrategyLeg {
    direction: PositionDirection; 
    multiplier: number; 
    derivative: OptionLeg; 
    display: string; 
}


// ====================================================================
// INTERFACE DE ESTRATÉGIA CONSOLIDADA (StrategyMetrics)
// ====================================================================

/**
 * Métricas de uma Estratégia de Opções Consolidada.
 * Inclui campos para análise de Risco, Retorno e Pontos Chave.
 */
export interface StrategyMetrics {
    // --- Identificação e Resumo ---
    name: string; 
    asset: string; 
    asset_price: number;
    spread_type: string; 
    expiration: string; 
    dias_uteis: number; 
    strike_description: string; 
    
    // --- Fluxo de Caixa e Natureza ---
    net_premium: number; 
    cash_flow_bruto: number; 
    cash_flow_liquido: number;
    initialCashFlow: number; // Fluxo de caixa inicial líquido (ajustado por taxas)
    natureza: NaturezaOperacao;

    // --- Risco e Retorno (Valores Absolutos e Consistentes) ---
    // Preferência por usar apenas 'max_profit' e 'max_loss' para P/L absoluto no vencimento
    max_profit: ProfitLossValue; // Lucro Máximo (usado em PayoffCalculator)
    max_loss: ProfitLossValue;   // Prejuízo Máximo (usado em PayoffCalculator)

    // Os campos a seguir são mantidos para compatibilidade com o código existente (IronCondorSpread.ts)
    risco_maximo: ProfitLossValue; 
    lucro_maximo: ProfitLossValue; 
    
    // --- P/L no Vencimento e em Tempo Real ---
    current_pnl: number; 
    current_price: number; 

    // --- Pontos Chave (Break-Even Points) ---
    breakEvenPoints: number[]; // Array de Breakevens
    breakeven_low: number | null; 
    breakeven_high: number | null; 
    
    // --- Métricas Específicas (Ex: Iron Condor/Butterfly) ---
    width: number;
    minPriceToMaxProfit: number; 
    maxPriceToMaxProfit: number;
    
    // --- Métrica de Performance e Priorização ---
    roi: ProfitLossValue; 
    risco_retorno_unitario: ProfitLossValue; 
    rentabilidade_max: ProfitLossValue; 
    margem_exigida: number; 
    probabilidade_sucesso: number; 
    score: number; 
    should_close: boolean;
    
    // --- Detalhes ---
    pernas: StrategyLeg[]; // Lista das pernas
    greeks: Greeks; // Gregas consolidadas da estratégia
}