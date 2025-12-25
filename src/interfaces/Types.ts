export type ProfitLossValue = number | 'Ilimitado' | 'Ilimitada';
export type PositionDirection = 'COMPRA' | 'VENDA' | 'SUBJACENTE';
export type NaturezaOperacao = 'DÉBITO' | 'CRÉDITO' | 'NEUTRA'; 

export interface Greeks {
    readonly delta: number | null; 
    readonly gamma: number | null; 
    readonly theta: number | null; 
    readonly vega: number | null; 
}

export interface OptionLeg {
    readonly option_ticker: string; 
    readonly ativo_subjacente: string; 
    readonly vencimento: string; 
    readonly dias_uteis: number; 
    readonly tipo: 'CALL' | 'PUT' | 'SUBJACENTE'; 
    readonly strike: number | null; 
    readonly multiplicador_contrato: number; 
    premio: number; 
    vol_implicita: number | null; 
    gregas_unitarias: Greeks; 
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

    /**
     * Campos de exibição formatados (Opcionais para permitir a criação inicial nas estratégias)
     */
    exibir_roi?: string;
    exibir_risco?: number;
    stop_loss_sugerido?: string;
    alvo_zero_a_zero?: string;
}