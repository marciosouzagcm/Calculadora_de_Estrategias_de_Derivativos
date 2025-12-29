/**
 * Tipos fundamentais para o motor de estratégias de opções
 */

export type ProfitLossValue = number | 'Ilimitado' | 'Ilimitada';
export type PositionDirection = 'COMPRA' | 'VENDA' | 'SUBJACENTE';
export type NaturezaOperacao = 'DÉBITO' | 'CRÉDITO' | 'NEUTRA'; 

/**
 * Gregas Net ou Unitárias
 */
export interface Greeks {
    delta: number; 
    gamma: number; 
    theta: number; 
    vega: number; 
}

/**
 * Representação de uma opção vinda do Banco de Dados
 */
export interface OptionLeg {
    ticker?: string;           
    option_ticker?: string;    
    ativo_subjacente: string; 
    vencimento: string; 
    dias_uteis: number; 
    tipo: 'CALL' | 'PUT' | 'SUBJACENTE'; 
    strike: number; // Alterado para number para evitar check de null constante
    multiplicador_contrato?: number; 
    
    premio: number; 
    vol_implicita: number | null; 
    
    /**
     * Gregas calculadas/armazenadas
     */
    gregas_unitarias: Greeks; 

    // Campos auxiliares para facilitar o acesso direto
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
}

/**
 * Estrutura de uma perna dentro de uma estratégia montada
 */
export interface StrategyLeg {
    direction: PositionDirection; 
    multiplier: number; 
    derivative: OptionLeg; 
    display: string; 
    side_display?: string; 
}

/**
 * Interface Principal de Resultados das Estratégias
 */
export interface StrategyMetrics {
    name: string; 
    asset: string; 
    asset_price: number;
    spread_type: string; 
    expiration: string; 
    dias_uteis: number; 
    strike_description: string; 
    
    net_premium: number; 
    initialCashFlow: number; 
    natureza: NaturezaOperacao;

    // Valores teóricos (podem ser strings como "Ilimitado")
    max_profit: ProfitLossValue; 
    max_loss: ProfitLossValue;   
    lucro_maximo: ProfitLossValue; 
    risco_maximo: ProfitLossValue; 
    
    breakEvenPoints: number[]; 
    greeks: Greeks; 
    pernas: StrategyLeg[]; 

    /**
     * Propriedades de Gestão e Exibição (Calculadas pelo StrategyService)
     * Adicionadas para resolver erros de compilação e alimentar o Frontend
     */
    roi?: number;                 // Valor decimal (ex: 0.155) para ordenação
    exibir_roi?: string;          // String formatada (ex: "15.50%")
    exibir_risco?: ProfitLossValue; // [CORREÇÃO]: Alterado de number para ProfitLossValue
    taxas_ciclo?: number;         // TAXA TOTAL DA OPERAÇÃO (EX: R$ 44.00)
    stop_loss_sugerido?: string;
    alvo_zero_a_zero?: string;
}