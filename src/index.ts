// src/index.ts

// --- 1. Importações (Ajuste os caminhos conforme sua estrutura) ---
import { PayoffCalculator } from './services/PayoffCalculator'; 
import { OptionLeg, StrategyMetrics, ProfitLossValue } from './interfaces/Types'; 
import { readOptionsDataFromCSV } from './services/csvReader'; // << NOVO IMPORT DE CSV

// =========================================================================
//                             CONSTANTES GLOBAIS (AJUSTADAS)
// =========================================================================

const FEES = 0.50; // Constante mockada para teste
const LOT_SIZE = 1; // Constante mockada para teste
// ATENÇÃO: Ajuste o preço real do BOVA11 aqui. Usando R$ 160,00 como exemplo.
const CURRENT_ASSET_PRICE = 161.29; 
const CSV_FILE_PATH = 'opcoes_final_tratado.csv'; // << VERIFIQUE ESTE CAMINHO



// =========================================================================
//                             FUNÇÕES DE EXIBIÇÃO
// =========================================================================

function formatValue(value: ProfitLossValue): string {
    if (value === Infinity || value === 'Ilimitado') {
        return "ILIMITADO (Teórico)";
    }
    return `R$ ${(value as number).toFixed(2)}`; 
}

function formatStrategyOutput(metrics: StrategyMetrics, payoffCurve: { price: number; pnl: number }[], title?: string) {
    if (title) {
        console.log(`\n======================================================`);
        console.log(`\t\t\t🥇 ${title.toUpperCase()} 🥇`);
        console.log(`======================================================`);
    } else {
        console.log(`\n======================================================`);
        console.log(`\t\t\t📊 ${metrics.name.toUpperCase()} 📊`);
        console.log(`======================================================`);
    }
    
    console.log(`\n${'Ativo Subjacente:'.padEnd(30)} ${metrics.asset}`);
    console.log(`${'Vencimento (Principal):'.padEnd(30)} ${metrics.expiration}`);
    console.log(`${'Natureza da Operação:'.padEnd(30)} ${metrics.natureza}`);
    
    console.log(`\n--- FLUXO DE CAIXA ---`);
    console.log(`${'Fluxo de Caixa Inicial:'.padEnd(30)} ${formatValue(metrics.initialCashFlow)} ${metrics.natureza === 'DÉBITO' ? '(Custo)' : '(Crédito)'}`);

    console.log(`\n--- RISCO E RETORNO ---`);
    console.log(`${'Lucro Máximo:'.padEnd(30)} ${formatValue(metrics.max_profit)}`);
    console.log(`${'Prejuízo Máximo (Risco):'.padEnd(30)} ${formatValue(metrics.max_loss)}`); 
    
    console.log(`\n--- PONTOS CHAVE ---`);
    metrics.breakEvenPoints.forEach((bep, index) => {
        console.log(`${`Breakeven Point ${index + 1}:`.padEnd(30)} R$ ${bep.toFixed(2)}`);
    });

    console.log(`\n--- PERNAS DA ESTRATÉGIA ---`);
    metrics.pernas.forEach(leg => {
        const strike = leg.derivative.strike?.toFixed(2) || 'N/A';
        const premio = leg.derivative.premio.toFixed(2);
        console.log(`- ${leg.display.padEnd(20)} Strike: R$ ${strike} | Prêmio: R$ ${premio} | Ticker: ${leg.derivative.option_ticker} | Vencimento: ${leg.derivative.vencimento}`);
    });
    
    console.log(`\n--- AMOSTRA DA CURVA DE PAYOFF ---`);
    const pnlAtCurrentPrice = payoffCurve.find(p => p.price === CURRENT_ASSET_PRICE) || { price: CURRENT_ASSET_PRICE, pnl: 0 };
    
    console.log(`(PnL no preço atual R$ ${CURRENT_ASSET_PRICE.toFixed(2)}: R$ ${pnlAtCurrentPrice.pnl.toFixed(2)})`);
    
    const samplePoints = payoffCurve.filter((_, index) => index % 10 === 0).slice(0, 5);
    
    samplePoints.forEach(point => {
        console.log(`Preço R$ ${point.price.toFixed(2)} -> PnL R$ ${point.pnl.toFixed(2)}`);
    });
    
    console.log(`\n======================================================\n`);
}

// =========================================================================
//                             FUNÇÕES DE FILTRAGEM
// =========================================================================

function filterWinningStrategies(strategies: StrategyMetrics[]): { [key: string]: StrategyMetrics } {
    const winners: { [key: string]: StrategyMetrics } = {};
    
    // --- 1. Maior Lucro Máximo ---
    let maxProfitWinner = strategies.reduce((max, current) => {
        if (current.max_profit === 'Ilimitado') return current; 
        
        const currentProfit = current.max_profit as number;
        const maxProfit = max.max_profit === 'Ilimitado' ? Infinity : max.max_profit as number;

        if (currentProfit > maxProfit) return current;
        return max;
    }, strategies[0]);

    winners['Maior Lucro Máximo'] = maxProfitWinner;
    
    // --- 2. Menor Custo Inicial (Menor Débito Absoluto) ---
    const debitStrategies = strategies.filter(s => s.natureza === 'DÉBITO');
    
    let minCostWinner = debitStrategies.reduce((min, current) => {
        const currentCost = Math.abs(current.initialCashFlow as number);
        const minCost = Math.abs(min.initialCashFlow as number);

        if (currentCost < minCost) return current;
        return min;
    }, debitStrategies[0]);
    
    winners['Menor Custo Inicial'] = minCostWinner;


    // --- 3. Menor Risco (Prejuízo Máximo) ---
    const limitedRiskStrategies = strategies.filter(s => s.max_loss !== 'Ilimitado');
    
    let minRiskWinner = limitedRiskStrategies.reduce((min, current) => {
        const currentLoss = current.max_loss as number;
        const minLoss = min.max_loss as number;

        if (currentLoss < minLoss) return current;
        return min;
    }, limitedRiskStrategies[0]);

    winners['Menor Risco'] = minRiskWinner;
    
    return winners;
}


// =========================================================================
//                             EXECUÇÃO PRINCIPAL (ASSÍNCRONA)
// =========================================================================

async function runStrategyCalculator() { // << AGORA É ASSÍNCRONA
    console.log("--- Iniciando Módulo Principal de Cálculo de Estratégias ---");
    console.log(`Ativo Subjacente: BOVA11 | Preço Atual: R$ ${CURRENT_ASSET_PRICE.toFixed(2)}`);
    
    // 1. CARREGAR DADOS REAIS DO CSV
    console.log(`\n[INFO] Carregando dados do arquivo: ${CSV_FILE_PATH}`);
    let optionsData: OptionLeg[];
    try {
        // Usa o preço atual para converter o prêmio de % para R$
        optionsData = await readOptionsDataFromCSV(CSV_FILE_PATH, CURRENT_ASSET_PRICE); 
        console.log(`[SUCESSO] ${optionsData.length} opções carregadas e prêmios convertidos para R$.`);
    } catch (error) {
        console.error(`\n[ERRO CRÍTICO] Falha ao carregar ou processar dados do CSV.`);
        if (error instanceof Error) {
            console.error(`Detalhes: ${error.message}`);
        }
        return; 
    }
    
    // 2. Instanciar o PayoffCalculator com os dados reais
    const calculator = new PayoffCalculator(optionsData, FEES, LOT_SIZE);
    
    // 3. Encontrar e calcular todas as estratégias possíveis (seleção 0)
    const allCalculatedStrategies = calculator.findAndCalculateSpreads(0);
    
    console.log(`\n[RESUMO] ${allCalculatedStrategies.length} Estratégias Válidas Encontradas no total.`);
    
    // 4. Filtrar e Exibir as Operações Vencedoras
    console.log("\n=======================================================");
    console.log("\t\t\t\t⭐ OPERAÇÕES VENCEDORAS FILTRADAS ⭐");
    console.log("=======================================================\n");

    if (allCalculatedStrategies.length === 0) {
        console.log("Nenhuma estratégia válida foi encontrada com os dados de opções fornecidos.");
        return;
    }

    const winningStrategies = filterWinningStrategies(allCalculatedStrategies);
    
    for (const criterion in winningStrategies) {
        const metrics = winningStrategies[criterion];
        const curve = calculator.calculatePayoffCurve(metrics, CURRENT_ASSET_PRICE, 0.20, 100);
        formatStrategyOutput(metrics, curve, `Critério: ${criterion}`);
    }
    
    console.log("Processo de Análise de Estratégias Finalizado.");
}

runStrategyCalculator();