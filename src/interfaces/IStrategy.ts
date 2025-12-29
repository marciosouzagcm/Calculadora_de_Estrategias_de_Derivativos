/**
 * @fileoverview Interface que define o contrato para todas as classes de Estratégia.
 */

import { OptionLeg, StrategyMetrics } from './Types';

/**
 * Interface base para todas as classes de estratégias de opções e derivativos.
 */
export interface IStrategy {
    readonly name: string; 
    readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL';

    /**
     * Calcula todas as métricas financeiras.
     * [CORREÇÃO]: Retorna um Array de StrategyMetrics para suportar múltiplas combinações no scanner.
     */
    calculateMetrics(
        legs: OptionLeg[], 
        assetPrice: number, 
        feePerLeg: number 
    ): StrategyMetrics[]; // <--- ALTERADO DE StrategyMetrics | null PARA StrategyMetrics[]
}