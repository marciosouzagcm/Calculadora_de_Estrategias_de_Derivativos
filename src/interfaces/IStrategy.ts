// src/interfaces/IStrategy.ts 

/**
 * @fileoverview Interface que define o contrato para todas as classes de Estratégia.
 * Qualquer estratégia (VerticalSpread, Butterfly, Condor, etc.) deve implementar esta interface (Strategy Pattern).
 */

// Importamos OptionLeg (o dado bruto que virá do PayoffCalculator) e StrategyMetrics
import { OptionLeg, StrategyMetrics } from './Types';

// --- Constantes Comuns ---
export const LOT_SIZE = 100; // Tamanho padrão do lote (Ex: 100 ações por contrato)
export const FEES = 44.00; // Exemplo de custos totais (corretagem, emolumentos, etc.) por montagem.

/**
 * Interface base para todas as classes de estratégias de opções e derivativos.
 * Garante que todas as estratégias possuam as propriedades e métodos essenciais.
 */
export interface IStrategy {
    // Propriedades somente leitura
    readonly name: string; // Ex: 'Bull Call Spread'
    
    // Visão de mercado esperada para que a estratégia seja vantajosa
    readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL';

    /**
     * Calcula todas as métricas financeiras (P/L, Breakeven, Gregas Agregadas) da estratégia.
     * * **[CORREÇÃO CRÍTICA]**: Recebe OptionLeg[] do PayoffCalculator.ts. 
     * * @param legs Array contendo apenas os dados brutos das opções (OptionLeg).
     * @param assetPrice Preço atual do ativo subjacente.
     * @param feePerLeg Custo de transação por perna da estratégia.
     * @returns Um objeto StrategyMetrics contendo os resultados ou null se a montagem for inválida.
     */
    calculateMetrics(
        legs: OptionLeg[], // Argumento 1: As pernas da opção
        assetPrice: number, // Argumento 2: O preço do ativo subjacente
        feePerLeg: number // Argumento 3: A taxa/custo por perna
    ): StrategyMetrics | null;

    // ... (o restante da interface permanece igual)
}