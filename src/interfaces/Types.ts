// src/interfaces/types.ts

/**
 * @fileoverview Definições de tipos de dados para Derivativos, Pernas de Opções e Métricas de Estratégias.
 * Este arquivo define a estrutura de dados central utilizada na calculadora.
 */

// Tipo de união para valores de Lucro ou Risco que podem ser numéricos ou ilimitados
export type ProfitLossValue = number | 'Ilimitado' | 'Ilimitada';

// Tipo para as letras gregas (Delta, Gamma, Theta, Vega)
export type Greeks = {
    readonly delta: number;
    readonly gamma: number;
    readonly theta: number;
    readonly vega: number;
};

// Tipo de Posição: Direção da operação
export type PositionDirection = 'COMPRA' | 'VENDA' | 'SUBJACENTE';

// Dados de um único derivativo (Opção ou Subjacente) para uso em uma perna
export type OptionLeg = {
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
    gregas_unitarias: Greeks;
};

// Tipo para a perna dentro de uma estratégia
export type StrategyLeg = {
    direction: PositionDirection; 
    multiplier: number; 
    derivative: OptionLeg; 
    display: string; 
};

// Natureza financeira da operação
export type NaturezaOperacao = 'DÉBITO' | 'CRÉDITO' | 'NEUTRA'; 

// Métricas de uma Estratégia
export type StrategyMetrics = {
    // --- Identificação e Resumo ---
    spread_type: string; 
    vencimento: string; 
    dias_uteis: number; 
    strike_description: string; 
    
    // --- Fluxo de Caixa e Natureza ---
    net_premium: number; 
    cash_flow_liquido: number; 
    natureza: NaturezaOperacao;

    // --- Risco e Retorno (Usando o tipo corrigido ProfitLossValue) ---
    risco_maximo: ProfitLossValue; // CORRIGIDO
    lucro_maximo: ProfitLossValue; // CORRIGIDO
    
    // --- Pontos Chave (Break-Even Points) ---
    breakeven_low: number | null; 
    breakeven_high: number | null; 
    
    // --- Métrica de Performance e Priorização ---
    risco_retorno_unitario: number; 
    score: number; 

    // --- Detalhes ---
    pernas: StrategyLeg[]; 
    net_gregas: Greeks;
};