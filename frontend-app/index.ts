// src/index.ts
//
// Ponto de entrada da Calculadora de Estratégias de Derivativos.
// Inclui correções de tipagem para manusear valores 'Ilimitado'.

// [REVISÃO] Importar a interface StrategyMetrics para manter a consistência com o domínio
import { FEES, LOT_SIZE, CSV_FILEPATH } from '../config/Config';
import { StrategyMetrics } from '../src/interfaces/types'; // Assumindo o caminho correto para o types.ts

// ==========================================================
// 1. Definição de Tipos e Interfaces
// ==========================================================

// Define um subconjunto da StrategyMetrics para uso no display
type DisplayResult = Pick<StrategyMetrics, 'spread_type' | 'lucro_maximo' | 'risco_maximo'> & {
    // Adiciona uma função mock de payoff para fins de demonstração do index.
    payoff_no_vencimento: (spot: number) => number;
};


// ==========================================================
// 2. Lógica Principal (Exemplo de simulação)
// ==========================================================

function runStrategyCalculator() {
    console.log("--- Iniciando a Calculadora de Estratégias de Derivativos ---");
    console.log(`Dados carregados de: ${CSV_FILEPATH}`);
    console.log(`Taxa de Corretagem por Contrato: R$ ${FEES.toFixed(2)}`);

    // Exemplo de um resultado simulado
    const result: DisplayResult = {
        spread_type: "Long Straddle (Compra de Volatilidade)", 
        // Exemplo: Long Straddle tem Risco Limitado (Custo) e Lucro Ilimitado
        risco_maximo: 850.25, // Custo de montagem
        lucro_maximo: 'Ilimitado', 
        // Payoff mock: |Spot - Strike| - Custo
        payoff_no_vencimento: (spot: number) => Math.abs(spot - 100) - 4.55 // Strike K=100, Custo Unitário=4.55
    };

    // --- Aplicação da Lógica de Display (Type Narrowing Corrigido) ---

    // 1. Risco Máximo
    const maxRiscoStr = (result.risco_maximo === 'Ilimitado')
        ? "Ilimitado (Teórico)"
        // CORREÇÃO: Usar 'as number' para garantir ao TS que o valor é um número 
        // antes de chamar .toFixed(2) no bloco 'false'.
        : `R$ ${(result.risco_maximo as number).toFixed(2)}`; 

    // 2. Lucro Máximo
    const maxLucroStr = (result.lucro_maximo === 'Ilimitado')
        ? "Ilimitado (Teórico)"
        // CORREÇÃO: Usar 'as number' no bloco 'false'.
        : `R$ ${(result.lucro_maximo as number).toFixed(2)}`;

    console.log("\n--- Resultado da Estratégia ---");
    console.log(`Estratégia: ${result.spread_type}`);
    console.log(`Risco Máximo: ${maxRiscoStr}`);
    console.log(`Lucro Máximo: ${maxLucroStr}`);
    console.log(`Lote Padrão: ${LOT_SIZE} contratos`);

    // Exemplo de cálculo do Payoff para um preço de 102
    const spotPrice = 102;
    const payoff = result.payoff_no_vencimento(spotPrice) * LOT_SIZE; // Multiplica o payoff unitário pelo lote
    
    console.log(`Payoff no vencimento para Ponto ${spotPrice}: R$ ${payoff.toFixed(2)} (Lote)`);

    console.log("\n--- Execução Concluída ---");
}

runStrategyCalculator();