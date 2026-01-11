/**
 * Tipos fundamentais para o motor de estratégias
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
    premio: number; 
    vol_implicita: number | null; 
    gregas_unitarias: Greeks; 
}

export interface StrategyLeg {
    direction: PositionDirection; 
    multiplier: number; 
    derivative: OptionLeg; 
    display: string; 
}

export interface StrategyMetrics {
    name: string; 
    asset: string; 
    asset_price: number;
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
    roi?: number; 
    exibir_roi?: string; 
    exibir_risco?: ProfitLossValue; 
    taxas_ciclo?: number; 
}