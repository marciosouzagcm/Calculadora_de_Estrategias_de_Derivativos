/**
 * config/Config.ts
 *
 * Arquivo de configuração que exporta constantes
 * essenciais para a aplicação.
 */

// Taxas e Custos
export const FEES: number = 0.50; // Exemplo: R$ 0.50 por contrato
export const LOT_SIZE: number = 100; // Lote padrão para opções no Brasil

// Caminho para o arquivo CSV de dados
export const CSV_FILEPATH: string = 'data/opcoes_historico.csv';

console.log(`Configuração carregada: Lote = ${LOT_SIZE}, Taxa = ${FEES}`);