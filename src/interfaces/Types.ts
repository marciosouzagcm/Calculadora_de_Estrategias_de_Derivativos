/**
 * Tipos fundamentais para o motor de estratégias de opções
 */
export type ProfitLossValue = number | 'Ilimitado' | 'Ilimitada';
export type PositionDirection = 'COMPRA' | 'VENDA' | 'SUBJACENTE';
export type NaturezaOperacao = 'DÉBITO' | 'CRÉDITO' | 'NEUTRA'; 

export interface Greeks {
    delta: number; 
    gamma: number; 
    theta: number; 
    vega: number; 
}

export interface OptionLeg {
    ticker?: string;           
    option_ticker?: string;    
    ativo_subjacente: string; 
    vencimento: string; 
    dias_uteis: number; 
    tipo: 'CALL' | 'PUT' | 'SUBJACENTE'; 
    strike: number; 
    multiplicador_contrato?: number; 
    premio: number; 
    vol_implicita: number | null; 
    gregas_unitarias: Greeks; 
    // Atalhos para gessão facilitada
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
}

export interface StrategyLeg {
    direction: PositionDirection; 
    multiplier: number; 
    derivative: OptionLeg; 
    display: string; 
    side_display?: string; 
}

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

    max_profit: ProfitLossValue; 
    max_loss: ProfitLossValue;   
    lucro_maximo: ProfitLossValue; 
    risco_maximo: ProfitLossValue; 
    
    breakEvenPoints: number[]; 
    greeks: Greeks; 
    pernas: StrategyLeg[]; 

    // --- Campos de exibição (Consumidos pelo Frontend) ---
    // Marcados como opcionais (?) para permitir a criação da estratégia antes da formatação final
    roi?: number;
    exibir_roi?: string;           
    exibir_lucro?: string;         
    exibir_risco?: string;         
    probabilidade_lucro?: string;  
    taxas_ciclo?: number;
    stop_loss_sugerido?: string;
    alvo_zero_a_zero?: string;
}