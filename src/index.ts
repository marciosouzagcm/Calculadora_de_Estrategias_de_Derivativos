// src/index.ts (CÓDIGO FINAL CORRIGIDO V8 - Filtro Universal por Natureza)

// --- 1. Importações (Ajuste os caminhos conforme sua estrutura) ---
import { PayoffCalculator } from './services/PayoffCalculator'; 
import { OptionLeg, StrategyMetrics, ProfitLossValue } from './interfaces/Types'; 
import { readOptionsDataFromCSV } from './services/csvReader'; 
import * as readline from 'readline'; 

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
    const initialCashFlowTotal = (metrics.initialCashFlow as number) * LOT_SIZE;
    
    // Calcula o risco total da operação
    // metrics.risco_maximo é o valor unitário (negativo para Débito/Crédito)
    const riskUnitary = (metrics.risco_maximo as number) ?? 0; 
    // O risco total é o valor absoluto do risco unitário * lote + taxas
    const totalRisk = Math.abs(riskUnitary * LOT_SIZE) + totalFees;

    console.log(`\n${'Ativo Subjacente:'.padEnd(30)} ${metrics.asset}`);
    console.log(`${'Preço do Ativo (S):'.padEnd(30)} R$ ${metrics.asset_price.toFixed(2)}`);
    console.log(`${'Vencimento (Principal):'.padEnd(30)} ${metrics.expiration}`);
    console.log(`${'Natureza da Operação:'.padEnd(30)} ${metrics.natureza}`);
    console.log(`${'Taxas Totais (Estimado):'.padEnd(30)} R$ ${totalFees.toFixed(2)}`); 
    
    console.log(`\n--- FLUXO DE CAIXA ---`);
    console.log(`${'Fluxo de Caixa (Prêmios):'.padEnd(30)} ${formatValue(metrics.initialCashFlow)} ${metrics.natureza === 'DÉBITO' ? '(Custo Bruto)' : '(Crédito Bruto)'}`);
    // EXIBIÇÃO DO FLUXO LÍQUIDO (custo com taxas para débito, ou crédito descontado taxas para crédito)
    const initialNetFlow = initialCashFlowTotal - (metrics.natureza === 'DÉBITO' ? totalFees : -totalFees);
    console.log(`${'FLUXO DE CAIXA LÍQUIDO:'.padEnd(30)} R$ ${initialNetFlow.toFixed(2)}`); 

    console.log(`\n--- RISCO E RETORNO (Líquido de Taxas) ---`);
    // Lucro Máximo Líquido 
    const maxProfitValue = metrics.max_profit === 'Ilimitado' ? Infinity : (metrics.max_profit as number);
    const maxProfitLiquid = maxProfitValue === Infinity ? 'Ilimitado' : formatValue(maxProfitValue * LOT_SIZE - totalFees); 
    console.log(`${'Lucro Máximo (Líquido):'.padEnd(30)} ${maxProfitLiquid}`); 
    
    // Prejuízo Máximo Líquido (Risco Total)
    console.log(`${'Prejuízo Máximo (Risco Total):'.padEnd(30)} R$ ${totalRisk.toFixed(2)}`); 
    
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
    const samplePoints = payoffCurve
        .sort((a, b) => a.price - b.price) 
        .filter((_, index) => index % 10 === 0)
        .slice(0, 5);
    
    samplePoints.forEach(point => {
        // O PayoffCalculator já retorna o PnL total (x LOT_SIZE), ajustado para taxas.
        console.log(`Preço R$ ${point.price.toFixed(2)} -> PnL R$ ${point.pnl.toFixed(2)}`);
    });
    
    console.log(`\n======================================================\n`);
}

// =========================================================================================================================
//                             FUNÇÕES DE FILTRAGEM
// =========================================================================================================================

function filterByCostRatio(strategies: StrategyMetrics[], maxRatioPercent: number): StrategyMetrics[] {
    const maxRatio = maxRatioPercent / 100;
    
    // Filtra estratégias com lucro máximo finito
    const strategiesWithFiniteProfit = strategies.filter(s => 
        s.max_profit !== 'Ilimitado' && s.max_profit !== Infinity 
    );

    const filtered = strategiesWithFiniteProfit.filter(metrics => {
        const maxProfit = metrics.max_profit as number;
        
        // 1. Descartar se o Lucro Máximo Bruto for zero ou negativo
        if (maxProfit <= 0) {
            return false;
        }

        let efficiencyRatio: number;

        // 2. Definir a Razão de Eficiência com base na natureza da operação
        if (metrics.natureza === 'DÉBITO') {
            // DÉBITO: Custo Unitário / Lucro Máximo Unitário
            const cost = Math.abs(metrics.cash_flow_bruto as number); // Usar o fluxo BRUTO (Custo/Prêmio)
            if (cost <= 0) return false;
            efficiencyRatio = cost / maxProfit; 
        } else if (metrics.natureza === 'CRÉDITO' || metrics.natureza === 'NEUTRA') {
            // CRÉDITO/NEUTRA: Risco Máximo Unitário / Lucro Máximo Unitário
            const risk = Math.abs(metrics.margem_exigida as number); // margem_exigida = risco máximo unitário (positivo)
            if (risk <= 0) return false; // Deve haver risco para a razão ser calculada
            efficiencyRatio = risk / maxProfit;
        } else {
            return false; // Ignora operações de natureza desconhecida
        }
        
        // 3. O Filtro: A Razão de Eficiência deve ser menor ou igual ao limite
        return efficiencyRatio <= maxRatio;
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

    // 3. CAPTURA DA ESTRATÉGIA DESEJADA E O FILTRO DE CUSTO/LUCRO
    console.log(`\nQual estratégia deseja analisar? (Selecione o número)`);
    Object.entries(strategyOptionsMap).forEach(([key, value]) => {
        console.log(`[${key}] ${value}`);
    });
    
    const strategyChoiceNumStr: string = await prompt(`Sua escolha (1-${Object.keys(strategyOptionsMap).length}): `);
    const strategyChoiceNum = parseInt(strategyChoiceNumStr);
    const chosenStrategy = strategyOptionsMap[strategyChoiceNum] || 'QUALQUER'; 
    
    let MAX_COST_RATIO = 40; // Valor padrão 40%

    // PERGUNTA O FILTRO DE EFICIÊNCIA SEMPRE
    const ratioStr = await prompt(`\nQual é o CUSTO/RISCO MÁXIMO (em %) do Lucro Máximo desejado? (Padrão: 40) `);
    const inputRatio = parseInt(ratioStr);
    if (!isNaN(inputRatio) && inputRatio > 0) {
        MAX_COST_RATIO = inputRatio;
    }

    console.log(`\n[INFO] Ticker do Ativo: ${assetTicker}`);
    console.log(`[INFO] Preço do Ativo Subjacente: R$ ${CURRENT_ASSET_PRICE.toFixed(2)}`);
    console.log(`[INFO] Estratégia Escolhida: ${chosenStrategy}`);
    console.log(`[INFO] Filtro Custo/Risco Máximo: ${MAX_COST_RATIO}%`);
    
    // 4. CARREGAR DADOS REAIS DO CSV
    console.log(`[INFO] Carregando dados do arquivo: ${CSV_FILE_PATH}`);
    let optionsData: OptionLeg[];
    try {
        optionsData = await readOptionsDataFromCSV(CSV_FILE_PATH, CURRENT_ASSET_PRICE); 
        
        // Filtra opções que pertencem ao Ticker escolhido (garante consistência)
        const filteredOptions = optionsData.filter(opt => opt.ativo_subjacente.toUpperCase() === assetTicker);
        
        if (filteredOptions.length === 0) {
            console.error(`[ERRO CRÍTICO] Nenhuma opção encontrada no CSV para o ativo: ${assetTicker}.`);
            rl.close();
            return;
        }

        optionsData = filteredOptions;
        console.log(`[SUCESSO] ${optionsData.length} opções do ativo ${assetTicker} carregadas.`);

    } catch (error) {
        console.error(`\n[ERRO CRÍTICO] Falha ao carregar ou processar dados do CSV.`);
        if (error instanceof Error) {
            console.error(`Detalhes: ${error.message}`);
        }
        rl.close();
        return; 
    }
    
    // 5. Instanciar e Encontrar todas as estratégias possíveis
    const calculator = new PayoffCalculator(optionsData, FEE_PER_LEG, LOT_SIZE);
    let allCalculatedStrategies = calculator.findAndCalculateSpreads(CURRENT_ASSET_PRICE); 
    
    if (allCalculatedStrategies.length === 0) {
        console.log("Nenhuma estratégia válida foi encontrada com os dados fornecidos.");
        rl.close();
        return;
    }

    // 5.1. FILTRAGEM PELO TIPO ESCOLHIDO PELO USUÁRIO.
    if (chosenStrategy !== 'QUALQUER' && chosenStrategy !== 'OTIMIZAR') {
        allCalculatedStrategies = allCalculatedStrategies.filter(s => s.name.toUpperCase().includes(chosenStrategy));
        console.log(`[FILTRO TIPO] ${allCalculatedStrategies.length} estratégias do tipo ${chosenStrategy} encontradas.`);
    }

    // 6. Aplicar o Filtro Universal de Custo/Risco e Ranqueamento
    
    console.log(`\n[FILTRO C/R] Aplicando filtro de Custo/Risco Máximo (${MAX_COST_RATIO}%)...`);
    
    // 🎯 APLICAÇÃO UNIVERSAL DO FILTRO 🎯
    const costRatioCandidates = filterByCostRatio(allCalculatedStrategies, MAX_COST_RATIO); 

    const filterTitle = `CUSTO/RISCO <= ${MAX_COST_RATIO}% DO LUCRO MÁXIMO (MELHOR RELAÇÃO)`;

    console.log("\n=====================================================================================");
    console.log(`\t\t🥇 MELHOR ESTRATÉGIA: RANQUEADA PELA MAIOR EFICIÊNCIA (RAZÃO) 🥇`); 
    console.log("=======================================================================================\n");

    if (costRatioCandidates.length > 0) {
        
        // 🚨 ORDENAÇÃO CHAVE: PELO MELHOR RATIO DE EFICIÊNCIA (Custo/Lucro ou Risco/Lucro) 🚨
        costRatioCandidates.sort((a, b) => {
            
            // Lógica de cálculo da razão para ranqueamento
            const calculateRatio = (metrics: StrategyMetrics): number => {
                const maxProfit = metrics.max_profit as number;
                if (maxProfit <= 0) return Infinity;

                if (metrics.natureza === 'DÉBITO') {
                    const cost = Math.abs(metrics.cash_flow_bruto as number);
                    return cost > 0 ? cost / maxProfit : Infinity;
                } else if (metrics.natureza === 'CRÉDITO' || metrics.natureza === 'NEUTRA') {
                    const risk = Math.abs(metrics.margem_exigida as number);
                    return risk > 0 ? risk / maxProfit : Infinity;
                }
                return Infinity;
            };

            const aRatio = calculateRatio(a); 
            const bRatio = calculateRatio(b);

            return aRatio - bRatio; // Ordenação crescente: o menor ratio (melhor eficiência) vai para o início
        });
        
        const bestRatioStrategy = costRatioCandidates[0]; 

        // Calcula a curva de Payoff
        const curve = calculator.calculatePayoffCurve(bestRatioStrategy, CURRENT_ASSET_PRICE);
        
        formatStrategyOutput(bestRatioStrategy, curve, filterTitle);
        
        console.log(`[INFO] ${costRatioCandidates.length} estratégias atendem ao critério de Custo/Risco.`);
    } else {
        console.log(`Nenhuma estratégia atendeu ao critério de Custo/Risco Máximo (${MAX_COST_RATIO}%).`);
    }
    
    console.log("Processo de Análise de Estratégias Finalizado.");
    rl.close();
}

runStrategyCalculator();