/**
 * @fileoverview Interface que define o contrato para todas as classes de Estratégia.
 * Qualquer estratégia (VerticalSpread, Butterfly, Condor, etc.) deve implementar esta interface (Strategy Pattern).
 */

// [REVISÃO] Importar StrategyLeg, que contém a direção (Compra/Venda) e multiplicador, e não apenas o dado do ativo.
import { StrategyLeg, StrategyMetrics } from './Types'; // Assumindo que o arquivo revisado se chama 'types'

// --- Constantes Comuns ---
// [BOA PRÁTICA] Estas constantes devem ser usadas internamente pelas implementações de IStrategy ou em um arquivo de configuração.
export const LOT_SIZE = 100; // Tamanho padrão do lote (Ex: 100 ações por contrato)
export const FEES = 44.00; // Exemplo de custos totais (corretagem, emolumentos, etc.) por montagem.

/**
 * Interface base para todas as classes de estratégias de opções e derivativos.
 * Garante que todas as estratégias possuam as propriedades e métodos essenciais.
 */
export interface IStrategy {
    // [BOA PRÁTICA] Propriedades somente leitura
    readonly name: string; // Ex: 'Bull Call Spread'
    
    // Visão de mercado esperada para que a estratégia seja vantajosa
    readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL';

    /**
     * Calcula todas as métricas financeiras (P/L, Breakeven, Gregas Agregadas) da estratégia.
     * * [REVISÃO] O método deve receber StrategyLeg[] para saber se é COMPRA/VENDA e qual a quantidade.
     * [REVISÃO] Removidos fees e lotSize dos parâmetros. A classe deve gerenciar essas constantes internamente (via construtor ou import).
     * * @param legs Array contendo a definição das pernas, incluindo direção, multiplicador e os dados do derivativo.
     * @returns Um objeto StrategyMetrics contendo os resultados ou null se a montagem for inválida.
     */
    calculateMetrics(
        legs: StrategyLeg[], 
    ): StrategyMetrics | null;

    /**
     * Opcional: Renderiza o gráfico de Payoff. 
     * Um método para gerar os pontos do gráfico de P&L em função do preço do subjacente no vencimento.
     * * [SUGESTÃO] Adicionar um método para o gráfico (Payoff) para ser um requisito da interface.
     * @param metrics As métricas calculadas, necessárias para definir os limites do gráfico.
     * @returns Array de pontos (Preço do Ativo, Lucro/Prejuízo).
     */
    generatePayoff(
        metrics: StrategyMetrics
    ): Array<{ assetPrice: number; profitLoss: number }>;
}