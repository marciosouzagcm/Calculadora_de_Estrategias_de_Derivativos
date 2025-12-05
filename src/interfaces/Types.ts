// src/interfaces/types.ts

/**
 * @fileoverview Definições de tipos de dados para Derivativos, Pernas de Opções e Métricas de Estratégias.
 * Este arquivo define a estrutura de dados central utilizada na calculadora.
 */

// Tipo de união para valores de Lucro ou Risco que podem ser numéricos ou ilimitados
export type ProfitLossValue = number | 'Ilimitado' | 'Ilimitada';

// Tipo para as letras gregas (Delta, Gamma, Theta, Vega)
export type Greeks = {
    readonly delta: number | null; 
    readonly gamma: number | null; 
    readonly theta: number | null; 
    readonly vega: number | null; 
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

// Natureza financeira da operação (TS2693 corrigido)
export type NaturezaOperacao = 'DÉBITO' | 'CRÉDITO' | 'NEUTRA'; 

// Métricas de uma Estratégia
export type StrategyMetrics = {
    // --- Identificação e Resumo ---
    name: string; 
    asset: string; 
    spread_type: string; 
    // Usado como 'expiration' no IronCondorSpread.ts
    readonly expiration: string; 
    dias_uteis: number; 
    strike_description: string; 
    
    // --- Fluxo de Caixa e Natureza ---
    net_premium: number; 
    cash_flow_bruto: number; 
    cash_flow_liquido: number;
    // 📢 CORREÇÃO: Adicionada a propriedade 'initialCashFlow' para aceitar o valor do IronCondorSpread.ts
    initialCashFlow: number;
    natureza: NaturezaOperacao;

    // --- Risco e Retorno (Valores Absolutos) ---
    risco_maximo: ProfitLossValue; 
    lucro_maximo: ProfitLossValue; 
    
    // --- P/L no Vencimento e em Tempo Real ---
    // Mantendo os campos (max_profit e max_loss) separados dos campos (lucro_maximo e risco_maximo) para flexibilidade:
    max_profit: ProfitLossValue; 
    max_loss: ProfitLossValue; 
    current_pnl: number; 
    current_price: number; 

    // --- Pontos Chave (Break-Even Points) ---
    // 📢 CORREÇÃO: Usando 'breakEvenPoints' para harmonizar com o array retornado
    breakEvenPoints: number[]; 
    breakeven_low: number | null; 
    breakeven_high: number | null; 
    
    // 📢 CORREÇÃO: Adicionadas propriedades usadas em IronCondorSpread.ts
    width: number;
    minPriceToMaxProfit: number; 
    maxPriceToMaxProfit: number;
    
    // --- Métrica de Performance e Priorização ---
    // 📢 CORREÇÃO: Usando 'roi' para harmonizar com o IronCondorSpread.ts
    roi: ProfitLossValue; 
    risco_retorno_unitario: ProfitLossValue; 
    rentabilidade_max: ProfitLossValue; 
    margem_exigida: number; 
    probabilidade_sucesso: number; 
    score: number; 
    should_close: boolean;
    
    // --- Detalhes ---
    pernas: StrategyLeg[]; 
    greeks: Greeks; 
};