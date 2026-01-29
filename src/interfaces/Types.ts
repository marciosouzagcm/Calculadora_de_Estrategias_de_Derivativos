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
    symbol?: string; // Adicionado para compatibilidade com API
    ativo_subjacente: string; 
    vencimento: string; 
    dias_uteis: number; 
    tipo: 'CALL' | 'PUT' | 'SUBJACENTE'; 
    strike: number; 
    multiplicador_contrato?: number; 
    premio: number; 
    vol_implicita: number | null; 
    gregas_unitarias: Greeks; 
    // Campos diretos para facilitar acesso
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;
    direction?: PositionDirection; // Adicionado para o loop de pernas
}

export interface StrategyLeg {
    direction: PositionDirection; 
    multiplier: number; 
    derivative: OptionLeg; 
    display: string; 
    side_display?: string; 
    // Atalhos para renderização direta
    strike?: number;
    premio?: number;
    tipo?: string;
    symbol?: string;
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
    pernas: any[]; // Alterado para 'any' ou uma união para suportar OptionLeg[] direto

    // --- CAMPOS CRUCIAIS PARA O RELATÓRIO ---
    totalLiquido: number;  // Usado no ReportTemplate
    riscoReal: number;     // Usado no ReportTemplate
    roi: number;           // Usado no ReportTemplate
    be?: number;           // Atalho para breakEvenPoints[0]
    ur?: number;           // Unidade de Risco
    payoffData?: Array<{price: number, profit: number}>; // Essencial para o SVG
    
    // Gregas diretas para facilitar o mapeamento no template
    delta?: number;
    gamma?: number;
    theta?: number;
    vega?: number;

    // Campos de exibição (Strings formatadas)
    exibir_roi?: string;           
    exibir_lucro?: string;         
    exibir_risco?: string;         
    probabilidade_lucro?: string;  
    taxas_ciclo?: number;
    stop_loss_sugerido?: string;
    alvo_zero_a_zero?: string;
    officialDescription?: string;
}