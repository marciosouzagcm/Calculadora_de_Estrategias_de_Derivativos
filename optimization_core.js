/**
 * Otimização de Estratégias de Opções - Lógica Core (para execução em Node.js)
 * * Este arquivo contém apenas as funções puras de cálculo e os dados mock,
 * permitindo que a lógica seja executada diretamente no terminal usando Node.js.
 * * Para rodar: node optimization_core.js
 */

// =========================================================================
// 1. CONSTANTES E CONFIGURAÇÕES
// =========================================================================

const DEFAULT_ASSET_PRICE = 34.50; // Preço do ativo subjacente (PETR4)
const FEES = 0.50;                 // Taxa de corretagem por lote (R$)
const LOT_SIZE = 100;              // Tamanho do lote padrão (100 opções por contrato)

// TIPAGEM (Mantida por clareza)
// =========================================================================
// 2. ESTRUTURAS DE DADOS (TIPAGEM Conceitual)
// =========================================================================

/**
 * @typedef {'CALL' | 'PUT'} OptionType
 * @typedef {'BUY' | 'SELL'} Position
 * * @typedef {object} Option
 * @property {string} symbol - Símbolo da opção (ex: "PETRH350")
 * @property {OptionType} type - Tipo da opção ('CALL' ou 'PUT')
 * @property {number} strike - Preço de exercício (R$)
 * @property {number} premium - Prêmio (preço de mercado) da opção (R$)
 * @property {number} contracts - Quantidade de contratos (lotes de 100)
 * @property {Position} position - Posição ('BUY' para compra, 'SELL' para venda)
 */

/**
 * @typedef {object} OptimizationResult
 * @property {string} name - Nome da estratégia (ex: "Travada de Alta")
 * @property {number} profitMax - Lucro máximo potencial (R$)
 * @property {number} lossMax - Prejuízo máximo potencial (R$)
 * @property {number | null} breakEven1 - Primeiro Ponto de Equilíbrio (R$)
 * @property {number | null} breakEven2 - Segundo Ponto de Equilíbrio (R$ - se houver)
 * @property {number} initialCost - Custo líquido inicial (ou crédito) (R$)
 * @property {Option[]} legs - Lista das opções que compõem a estratégia
 */


// =========================================================================
// 3. DADOS MOCK PARA TESTE (O SEU "COMANDO") - DADOS AJUSTADOS
// =========================================================================

const MOCK_OPTIONS_DATA = [
    // Opções Call (Ex: PETRH) - Mantidas para ter diversidade
    { symbol: "PETRH350", type: 'CALL', strike: 35.00, premium: 1.50, contracts: 1, position: 'BUY' }, // Buy Call
    { symbol: "PETRH360", type: 'CALL', strike: 36.00, premium: 0.90, contracts: 1, position: 'SELL' }, // Sell Call
    
    // Opções Put (Ex: PETRW) - AJUSTADO PARA PERMITIR PUT SPREAD
    { symbol: "PETRW350", type: 'PUT', strike: 35.00, premium: 1.50, contracts: 1, position: 'BUY' },  // **PUT COMPRADA (STRIKE MAIOR) - Long Put**
    { symbol: "PETRW340", type: 'PUT', strike: 34.00, premium: 1.20, contracts: 1, position: 'SELL' }, // **PUT VENDIDA (STRIKE MENOR) - Short Put**
];

// =========================================================================
// 4. FUNÇÕES DE CÁLCULO CORE
// =========================================================================

/**
 * Calcula o payoff intrínseco (ganho/perda da opção em relação ao prêmio na expiração).
 * NÃO INCLUI AS TAXAS DE CORRETAGEM INICIAIS.
 * @param {Option} option 
 * @param {number} assetPrice - Preço do ativo na expiração
 * @returns {number} Payoff líquido do prêmio/expiração TOTAL (R$)
 */
function calculateIntrinsicPayoff(option, assetPrice) {
    const contracts = option.contracts;
    
    let intrinsicValue = 0;
    if (option.type === 'CALL') {
        intrinsicValue = Math.max(0, assetPrice - option.strike);
    } else { // PUT
        intrinsicValue = Math.max(0, option.strike - assetPrice);
    }

    let payoffPerContract;
    if (option.position === 'BUY') {
        // Lucro/Prejuízo = Valor Intrínseco - Prêmio Pago (Custo)
        payoffPerContract = intrinsicValue - option.premium;
    } else { // SELL
        // Lucro/Prejuízo = Prêmio Recebido (Crédito) - Valor Intrínseco
        payoffPerContract = option.premium - intrinsicValue;
    }
    
    // O Payoff total é ajustado pelo tamanho do lote e número de contratos.
    const totalPayoff = payoffPerContract * LOT_SIZE * contracts;
    return totalPayoff;
}

/**
 * Calcula o custo/crédito inicial, o custo de fechamento e as métricas finais de uma estratégia.
 * @param {Option[]} strategyLegs - Array de opções que formam a estratégia
 * @returns {OptimizationResult} As métricas financeiras da estratégia
 */
function calculateStrategyMetrics(strategyLegs) {
    let initialCashFlow = 0; // Fluxo de caixa inicial (Custo/Crédito) JÁ LÍQUIDO DE TAXAS
    
    // 1. Calcular o Fluxo de Caixa Inicial (Prêmios e Taxas)
    strategyLegs.forEach(leg => {
        const premiumFlow = leg.premium * leg.contracts * LOT_SIZE;
        const fee = FEES * leg.contracts; // Taxa por lote (já em R$)
        
        if (leg.position === 'BUY') {
            // Custo (saída de caixa) = -(Prêmio + Taxa)
            initialCashFlow -= (premiumFlow + fee);
        } else { // SELL
            // Crédito (entrada de caixa) = +(Prêmio - Taxa)
            initialCashFlow += (premiumFlow - fee);
        }
    });

    // 2. Definir Faixa de Preços para Varredura
    const strikes = strategyLegs.map(l => l.strike);
    const minStrike = Math.min(...strikes);
    const maxStrike = Math.max(...strikes);
    
    const priceRange = [];
    for (let p = minStrike - 5; p <= maxStrike + 5; p += 0.1) {
        priceRange.push(p);
    }
    // Inclui pontos cruciais para precisão (strikes e extremos)
    priceRange.push(DEFAULT_ASSET_PRICE, ...strikes);
    const uniquePrices = [...new Set(priceRange)].sort((a, b) => a - b);
    
    // 3. Determinar Lucro Máximo e Prejuízo Máximo (testando também extremos para travas)
    let allPayoffs = [];
    
    // Testa o payoff em todos os preços chave (strikes, PE, e nos extremos +/- Infinito)
    const testPrices = [...uniquePrices, 0.01, 1000.00]; 

    testPrices.forEach(price => {
        let totalIntrinsicPayoff = 0;
        
        strategyLegs.forEach(leg => {
            // Soma o Payoff Bruto da Expiração (Payoff Intrínseco)
            totalIntrinsicPayoff += calculateIntrinsicPayoff(leg, price);
        });
        
        // Payoff Líquido Final = Payoff Intrínseco na Expiração + Fluxo de Caixa Inicial (Líquido de Taxas)
        const finalPayoff = totalIntrinsicPayoff + initialCashFlow; 
        
        allPayoffs.push(finalPayoff);
    });
    
    let maxProfit = Math.max(...allPayoffs);
    let maxLoss = Math.min(...allPayoffs);
    
    // 4. Calcular Pontos de Equilíbrio (Break-Even)
    const breakEvens = [];
    
    for (let i = 1; i < uniquePrices.length; i++) {
        const p1 = uniquePrices[i - 1];
        const p2 = uniquePrices[i];
        
        // Calcula o Payoff líquido (incluindo prêmio e taxas) em p1 e p2
        let payoff1 = strategyLegs.reduce((sum, leg) => sum + calculateIntrinsicPayoff(leg, p1), 0) + initialCashFlow;
        let payoff2 = strategyLegs.reduce((sum, leg) => sum + calculateIntrinsicPayoff(leg, p2), 0) + initialCashFlow;

        // Se houver uma mudança de sinal (de lucro para prejuízo ou vice-versa)
        if ((payoff1 <= 0 && payoff2 > 0) || (payoff1 >= 0 && payoff2 < 0)) {
            // Interpolação Linear Simples (Para aproximação)
            const pe = p1 - payoff1 * ((p2 - p1) / (payoff2 - payoff1));
            
            // Adiciona se for um PE válido (entre os limites de strike) e não for duplicado
            if (pe >= minStrike - 5 && pe <= maxStrike + 5) {
                breakEvens.push(pe);
            }
        }
    }
    
    // Ordena e remove duplicatas próximas
    breakEvens.sort((a, b) => a - b);
    const finalBreakEvens = breakEvens.filter((pe, index) => {
        if (index === 0) return true;
        return Math.abs(pe - breakEvens[index - 1]) > 0.05; // Evita PEs muito próximos
    });

    // Arredondamento final das métricas
    const round2 = (num) => num !== null ? Math.round(num * 100) / 100 : null;

    return {
        name: "Estratégia Otimizada", 
        profitMax: round2(maxProfit),
        lossMax: round2(maxLoss),
        breakEven1: finalBreakEvens[0] ? round2(finalBreakEvens[0]) : null,
        breakEven2: finalBreakEvens[1] ? round2(finalBreakEvens[1]) : null,
        initialCost: round2(initialCashFlow), // Custo/Crédito inicial (Líquido de taxas)
        legs: strategyLegs,
    };
}


// =========================================================================
// 5. LÓGICA DE OTIMIZAÇÃO (O "CORE" DO PROJETO) - SEM ALTERAÇÕES
// =========================================================================

/**
 * Simples otimização que seleciona a estratégia de Put Spread (Travada de Baixa) 
 * com o melhor P/L (Payoff Máximo / Prejuízo Máximo).
 * * @param {Option[]} availableOptions - Todas as opções disponíveis no livro
 * @returns {OptimizationResult | null} A melhor estratégia encontrada
 */
function runOptimization(availableOptions) {
    console.log("========================================================================");
    console.log(`[CORE] Executando Otimização (Preço do Ativo: R$${DEFAULT_ASSET_PRICE.toFixed(2)})`);
    console.log("========================================================================");

    const putOptions = availableOptions.filter(o => o.type === 'PUT');
    let bestStrategy = null;
    let bestScore = -Infinity;
    
    // A Estratégia de Put Spread (Travada de Baixa) é composta por:
    // 1. Compra de PUT com Strike MAIOR (Long Put)
    // 2. Venda de PUT com Strike MENOR (Short Put)
    
    // Apenas filtra o que é PUT e garante que a BuyPut tenha strike maior
    for (const buyPut of putOptions.filter(p => p.position === 'BUY')) {
        for (const sellPut of putOptions.filter(p => p.position === 'SELL')) {
            
            // Requisito: Strike do Buy Put (Long) deve ser MAIOR que o Strike do Sell Put (Short)
            if (buyPut.strike > sellPut.strike) {
                
                const strategyLegs = [
                    // Garante que a posição seja refletida corretamente (foi simplificado no mock)
                    { ...buyPut, contracts: 1, position: 'BUY' }, 
                    { ...sellPut, contracts: 1, position: 'SELL' }
                ];

                try {
                    const metrics = calculateStrategyMetrics(strategyLegs);

                    // Verifica se é uma trava válida (não pode ter lucro ou prejuízo infinito)
                    if (metrics.profitMax === Infinity || metrics.lossMax === -Infinity) continue;

                    // Critério de Otimização: Maximizar o P/L Ratio (Profit/Loss)
                    const profitLossRatio = metrics.profitMax / Math.abs(metrics.lossMax);
                    
                    if (profitLossRatio > bestScore) {
                        bestScore = profitLossRatio;
                        bestStrategy = metrics;
                        bestStrategy.name = `Put Spread (Melhor P/L: ${profitLossRatio.toFixed(2)})`;
                    }
                } catch (error) {
                    // console.error("Erro ao calcular métricas para Put Spread:", error.message);
                    continue; // Pula a combinação com erro
                }
            }
        }
    }

    return bestStrategy;
}


// =========================================================================
// 6. EXECUÇÃO DO "COMANDO" PRINCIPAL - SEM ALTERAÇÕES
// =========================================================================

function main() {
    // 1. O seu "comando" de dados está aqui: MOCK_OPTIONS_DATA
    
    // 2. Executa a otimização com os dados mockados
    const result = runOptimization(MOCK_OPTIONS_DATA);

    // 3. Imprime o resultado no terminal (a saída do "comando")
    if (result) {
        console.log("\n✅ MELHOR ESTRATÉGIA ENCONTRADA (Put Spread):");
        console.log("================================================");
        console.log(`Nome da Estratégia: ${result.name}`);
        console.log(`Ponto de Equilíbrio (PE1): ${result.breakEven1 ? `R$${result.breakEven1.toFixed(2)}` : 'N/A'}`);
        console.log(`Ponto de Equilíbrio (PE2): ${result.breakEven2 ? `R$${result.breakEven2.toFixed(2)}` : 'N/A'}`);
        console.log(`Lucro Máximo: R$${result.profitMax.toFixed(2)}`);
        console.log(`Prejuízo Máximo: R$${result.lossMax.toFixed(2)}`);
        console.log(`Custo/Crédito Inicial (Líquido de Taxas): R$${result.initialCost.toFixed(2)}`);
        console.log("\nDetalhes das Opções (Legs):");
        result.legs.forEach(leg => {
            const action = leg.position === 'BUY' ? 'COMPRA' : 'VENDA';
            console.log(`- ${action} ${leg.contracts}x ${leg.symbol} (Strike: R$${leg.strike.toFixed(2)}, Prêmio: R$${leg.premium.toFixed(2)})`);
        });
        console.log("================================================");
    } else {
        console.log("\n❌ Nenhuma Put Spread válida pôde ser formada com os dados atuais.");
    }
}

// Inicia a aplicação Node.js
main();