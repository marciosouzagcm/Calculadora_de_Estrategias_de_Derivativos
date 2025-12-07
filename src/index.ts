// src/index.ts (CÓDIGO FINAL CORRIGIDO V3)

// --- 1. Importações (Ajuste os caminhos conforme sua estrutura) ---
import { PayoffCalculator } from './services/PayoffCalculator'; 
import { OptionLeg, StrategyMetrics, ProfitLossValue } from './interfaces/Types'; 
import { readOptionsDataFromCSV } from './services/csvReader'; 
import * as readline from 'readline'; 
import { stdout } from 'process';

// =========================================================================
//                             CONSTANTES GLOBAIS
// =========================================================================

// Taxa de emolumentos/corretagem por perna/lote (ajuste conforme necessário)
const FEE_PER_LEG = 22; 
const LOT_SIZE = 1000; // Lote padrão para cálculo de PnL por contrato
const CSV_FILE_PATH = 'opcoes_final_tratado.csv'; 

const strategyOptionsMap: { [key: number]: string } = {
    1: 'OTIMIZAR',
    2: 'CALL',
    3: 'PUT',
    4: 'STRADDLE',
    5: 'STRANGLE',
    6: 'BORBOLETA',
    7: 'CONDOR',
    8: 'CALENDAR',
};

// =========================================================================
//                             FUNÇÕES DE EXIBIÇÃO
// =========================================================================

function formatValue(value: ProfitLossValue): string {
    if (value === Infinity || value === 'Ilimitado') {
        return "ILIMITADO (Teórico)";
    }
    // Multiplica por LOT_SIZE (100) para mostrar o valor total da operação
    const totalValue = (value as number) * LOT_SIZE; 
    return `R$ ${(totalValue).toFixed(2)}`; 
}

function formatStrategyOutput(metrics: StrategyMetrics, payoffCurve: { price: number; pnl: number }[], title?: string) {
    console.log(`\n======================================================`);
    console.log(`\t\t\t📊 ${metrics.name.toUpperCase()} 📊`);
    if (title) {
        console.log(`\t\t\tCritério de Seleção: ${title.toUpperCase()}`);
    }
    console.log(`======================================================`);
    
    const totalFees = metrics.pernas.length * FEE_PER_LEG;
    const initialCashFlowTotal = metrics.initialCashFlow as number * LOT_SIZE;
    
    // CORREÇÃO ESSENCIAL: Garante que o custo do prêmio (que é negativo em initialCashFlowTotal)
    // seja somado corretamente com as taxas para obter o desembolso total.
    const totalDisbursement = Math.abs(initialCashFlowTotal) + totalFees; 

    console.log(`\n${'Ativo Subjacente:'.padEnd(30)} ${metrics.asset}`);
    console.log(`${'Preço do Ativo (S):'.padEnd(30)} R$ ${metrics.asset_price.toFixed(2)}`);
    console.log(`${'Vencimento (Principal):'.padEnd(30)} ${metrics.expiration}`);
    console.log(`${'Natureza da Operação:'.padEnd(30)} ${metrics.natureza}`);
    console.log(`${'Taxas Totais (Estimado):'.padEnd(30)} R$ ${totalFees.toFixed(2)}`); 
    
    console.log(`\n--- FLUXO DE CAIXA ---`);
    console.log(`${'Fluxo de Caixa (Prêmios):'.padEnd(30)} ${formatValue(metrics.initialCashFlow)} ${metrics.natureza === 'DÉBITO' ? '(Custo Bruto)' : '(Crédito Bruto)'}`);
    // EXIBIÇÃO DO CUSTO REAL TOTAL
    console.log(`${'DESEMBOLSO TOTAL (CUSTO):'.padEnd(30)} R$ ${totalDisbursement.toFixed(2)}`); 

    console.log(`\n--- RISCO E RETORNO (Líquido de Taxas) ---`);
    // Lucro Máximo Líquido = Lucro Máximo Bruto (em R$/ação) - Taxas (em R$/ação)
    console.log(`${'Lucro Máximo (Líquido):'.padEnd(30)} ${formatValue((metrics.max_profit as number) - (totalFees / LOT_SIZE))}`); 
    // Prejuízo Máximo Líquido = Risco Total (igual ao Desembolso Total, pois é uma estratégia de débito com risco limitado)
    console.log(`${'Prejuízo Máximo (Risco Total):'.padEnd(30)} R$ ${totalDisbursement.toFixed(2)}`); 
    
    console.log(`\n--- PONTOS CHAVE ---`);
    metrics.breakEvenPoints.forEach((bep, index) => {
        console.log(`${`Breakeven Point ${index + 1}:`.padEnd(30)} R$ ${bep.toFixed(2)}`);
    });

    console.log(`\n--- PERNAS DA ESTRATÉGIA ---`);
    metrics.pernas.forEach(leg => {
        const strike = leg.derivative.strike?.toFixed(2) || 'N/A';
        const premio = leg.derivative.premio.toFixed(2);
        console.log(`- ${leg.display.padEnd(20)} Strike: R$ ${strike} | Prêmio/Contrato: R$ ${premio} | Ticker: ${leg.derivative.option_ticker} | Vencimento: ${leg.derivative.vencimento}`);
    });
    
    console.log(`\n--- AMOSTRA DA CURVA DE PAYOFF ---`);
    const currentPriceUsed = payoffCurve.find(p => p.price.toFixed(2) === metrics.asset_price.toFixed(2)) 
        || { price: metrics.asset_price, pnl: metrics.current_pnl * LOT_SIZE || 0 }; 
    
    console.log(`(PnL no preço atual R$ ${currentPriceUsed.price.toFixed(2)}: R$ ${currentPriceUsed.pnl.toFixed(2)})`);
    
    const samplePoints = payoffCurve
        .sort((a, b) => a.price - b.price) 
        .filter((_, index) => index % 10 === 0)
        .slice(0, 5);
    
    samplePoints.forEach(point => {
        console.log(`Preço R$ ${point.price.toFixed(2)} -> PnL R$ ${(point.pnl * LOT_SIZE).toFixed(2)}`);
    });
    
    console.log(`\n======================================================\n`);
}

// =========================================================================================================================
//                             FUNÇÕES DE FILTRAGEM
// =========================================================================================================================

function filterByCostRatio(strategies: StrategyMetrics[], maxCostRatioPercent: number): StrategyMetrics[] {
    const maxRatio = maxCostRatioPercent / 100;
    
    const debitStrategies = strategies.filter(s => 
        s.natureza === 'DÉBITO' && 
        s.max_profit !== Infinity 
    );

    const filtered = debitStrategies.filter(metrics => {
        const cost = Math.abs(metrics.initialCashFlow as number); 
        const maxProfit = metrics.max_profit as number;
        
        if (maxProfit <= 0 || cost <= 0) {
            return false;
        }

        // Filtro: Custo / Lucro Máximo deve ser menor ou igual ao limite (0.40)
        return (cost / maxProfit) <= maxRatio;
    });

    return filtered;
}

// =========================================================================
//                             EXECUÇÃO PRINCIPAL
// =========================================================================

async function runStrategyCalculator() { 
    console.log("--- Iniciando Módulo Principal de Cálculo de Estratégias ---");
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    
    const prompt = (query: string): Promise<string> => new Promise(resolve => rl.question(query, resolve));
    
    // 1. CAPTURA DO TICKER DO ATIVO
    const assetTicker: string = (await prompt(`\nQual é o Ticker do ativo subjacente (e.g., BOVA11)? `))
        ?.toUpperCase().trim() || ''; 
    
    if (!assetTicker) {
        console.error("[ERRO] O Ticker do ativo subjacente é obrigatório.");
        rl.close();
        return;
    }

    // 2. CAPTURA DO PREÇO ATUAL DO ATIVO
    const currentAssetPriceStr: string = await prompt(`\nQual é o PREÇO ATUAL do ativo subjacente (${assetTicker})? (e.g., 154.44) `);
    
    const CURRENT_ASSET_PRICE = parseFloat(currentAssetPriceStr.replace(',', '.')); 
    
    if (isNaN(CURRENT_ASSET_PRICE) || CURRENT_ASSET_PRICE <= 0) {
        console.error("[ERRO] Preço do ativo inválido. Use um número positivo.");
        rl.close();
        return;
    }

    // 3. CAPTURA DA ESTRATÉGIA DESEJADA
    console.log(`\nQual estratégia deseja analisar? (Selecione o número)`);
    Object.entries(strategyOptionsMap).forEach(([key, value]) => {
        console.log(`[${key}] ${value}`);
    });
    
    const strategyChoiceNumStr: string = await prompt(`Sua escolha (1-${Object.keys(strategyOptionsMap).length}): `);
    rl.close(); 

    const strategyChoiceNum = parseInt(strategyChoiceNumStr);
    const chosenStrategy = strategyOptionsMap[strategyChoiceNum] || 'QUALQUER'; 
    
    console.log(`\n[INFO] Ticker do Ativo: ${assetTicker}`);
    console.log(`[INFO] Preço do Ativo Subjacente: R$ ${CURRENT_ASSET_PRICE.toFixed(2)}`);
    console.log(`[INFO] Estratégia Escolhida: ${chosenStrategy}`);
    
    // 4. CARREGAR DADOS REAIS DO CSV
    console.log(`[INFO] Carregando dados do arquivo: ${CSV_FILE_PATH}`);
    let optionsData: OptionLeg[];
    try {
        optionsData = await readOptionsDataFromCSV(CSV_FILE_PATH, CURRENT_ASSET_PRICE); 
        
        // Filtra opções que pertencem ao Ticker escolhido (garante consistência)
        const filteredOptions = optionsData.filter(opt => opt.ativo_subjacente.toUpperCase() === assetTicker);
        
        if (filteredOptions.length === 0) {
            console.error(`[ERRO CRÍTICO] Nenhuma opção encontrada no CSV para o ativo: ${assetTicker}.`);
            return;
        }

        optionsData = filteredOptions;
        console.log(`[SUCESSO] ${optionsData.length} opções do ativo ${assetTicker} carregadas.`);

    } catch (error) {
        console.error(`\n[ERRO CRÍTICO] Falha ao carregar ou processar dados do CSV.`);
        if (error instanceof Error) {
            console.error(`Detalhes: ${error.message}`);
        }
        return; 
    }
    
    // 5. Instanciar e Encontrar todas as estratégias possíveis
    const calculator = new PayoffCalculator(optionsData, FEE_PER_LEG, LOT_SIZE);
    let allCalculatedStrategies = calculator.findAndCalculateSpreads(CURRENT_ASSET_PRICE); 
    
    // FILTRAGEM PELO TIPO ESCOLHIDO PELO USUÁRIO
    if (chosenStrategy !== 'QUALQUER' && allCalculatedStrategies.length > 0) {
        allCalculatedStrategies = allCalculatedStrategies.filter(s => s.name.toUpperCase().includes(chosenStrategy));
        console.log(`[FILTRO] ${allCalculatedStrategies.length} estratégias do tipo ${chosenStrategy} encontradas.`);
    }

    if (allCalculatedStrategies.length === 0) {
        console.log("Nenhuma estratégia válida foi encontrada com os dados/filtro fornecidos.");
        return;
    }

    // 6. Filtrar e Exibir a melhor Operação: 40% Custo/Ganho + Ranqueamento Risco/Retorno
    
    const MAX_COST_RATIO = 40;
    const costRatioCandidates = filterByCostRatio(allCalculatedStrategies, MAX_COST_RATIO); 

    console.log("\n=====================================================================================");
    console.log(`\t\t🥇 MELHOR ESTRATÉGIA: RANQUEADA PELO MELHOR RISCO-RETORNO (CUSTO/LUCRO) 🥇`); 
    console.log("=======================================================================================\n");

    if (costRatioCandidates.length > 0) {
        
        // 🚨 ORDENAÇÃO CHAVE: PELO MELHOR RISCO/RETORNO (MENOR RATIO CUSTO/LUCRO) 🚨
        costRatioCandidates.sort((a, b) => {
            const aCost = Math.abs(a.initialCashFlow as number);
            const aProfit = a.max_profit as number;
            
            const bCost = Math.abs(b.initialCashFlow as number);
            const bProfit = b.max_profit as number;

            // Calcula o Ratio Custo/Lucro para ranqueamento
            // Quanto menor, melhor.
            const aRatio = aProfit > 0 ? aCost / aProfit : Infinity; 
            const bRatio = bProfit > 0 ? bCost / bProfit : Infinity;

            return aRatio - bRatio; // Ordenação crescente: o menor ratio (melhor) vai para o início
        });
        
        const bestRatioStrategy = costRatioCandidates[0]; 

        // Calcula a curva de Payoff
        const curve = calculator.calculatePayoffCurve(bestRatioStrategy, CURRENT_ASSET_PRICE);
        
        formatStrategyOutput(bestRatioStrategy, curve, `Custo <= ${MAX_COST_RATIO}% do Lucro Máximo (Melhor Risco/Retorno)`);
        
        console.log(`[INFO] ${costRatioCandidates.length} estratégias atendem ao critério Custo/Ganho (${MAX_COST_RATIO}%).`);
    } else {
        console.log(`Nenhuma estratégia de débito com lucro fixo atendeu ao critério Custo <= ${MAX_COST_RATIO}% do Ganho.`);
    }
    
    console.log("Processo de Análise de Estratégias Finalizado.");
}

runStrategyCalculator();