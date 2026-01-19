/**
 * @fileoverview Interface que define o contrato para todas as classes de Estratégia.
 */

import { OptionLeg, StrategyMetrics } from './Types';

/**
 * Interface base para todas as classes de estratégias de opções e derivativos.
 * Esta versão suporta processamento em lote (Batch Processing) para scanners.
 */
export interface IStrategy {
    /** Nome amigável da estratégia (ex: "Iron Condor", "Trava de Alta") */
    readonly name: string; 
    
    /** Perspectiva de mercado esperada para a estratégia */
    readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL';

    /**
     * Motor de Cálculo e Scanner.
     * Recebe todas as pernas disponíveis e o preço do ativo subjacente.
     * * @param legs - Lista completa de opções disponíveis (Chain de Opções)
     * @param assetPrice - Preço atual do ativo (Spot)
     * @param feePerLeg - Custos operacionais por perna (Corretagem/Emolumentos)
     * @returns Um array com todas as combinações lucrativas encontradas.
     */
    calculateMetrics(
        legs: OptionLeg[], 
        assetPrice: number, 
        feePerLeg: number 
    ): StrategyMetrics[]; 
}