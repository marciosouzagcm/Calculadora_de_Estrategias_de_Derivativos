/**
 * @fileoverview Interface que define o contrato para todas as classes de Estratégia.
 */

import { OptionLeg, StrategyMetrics } from './Types';

/**
 * Interface base para todas as classes de estratégias de opções e derivativos.
 * Suporta processamento em lote para scanners institucionais.
 */
export interface IStrategy {
    /** Nome amigável da estratégia (ex: "Iron Condor", "Trava de Alta") */
    readonly name: string; 
    
    /** Perspectiva de mercado esperada */
    readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL';

    /**
     * Motor de Cálculo e Scanner.
     * @param legs - Lista completa de opções disponíveis (Chain de Opções)
     * @param assetPrice - Preço atual do ativo (Spot)
     * @param feePerLeg - Custos operacionais por perna
     * @param lote - Tamanho da posição para cálculo de risco real
     * @returns Um array com todas as combinações lucrativas encontradas.
     */
    calculateMetrics(
        legs: OptionLeg[], 
        assetPrice: number, 
        feePerLeg: number,
        lote: number
    ): StrategyMetrics[]; 
}