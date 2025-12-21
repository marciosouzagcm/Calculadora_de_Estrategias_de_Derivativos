// src/index.ts (V25 - Completo: Taxas, Espécies e Lote)

import { PayoffCalculator } from './services/PayoffCalculator'; 
import { StrategyMetrics } from './interfaces/Types'; 
import { readOptionsDataFromCSV } from './services/csvReader'; 
import * as readline from 'readline'; 

const FEE_PER_LEG = 22.00; // Taxa por perna (ajuste conforme sua corretora)
const CSV_FILE_PATH = 'opcoes_final_tratado.csv'; 

/**
 * Formata valores para Moeda Brasileira (BRL)
 */
const fmtBRL = (val: number) => {
    if (val === Infinity || val > 9999999) return "ILIMITADO";
    if (val === -Infinity || val < -9999999) return "RISCO ILIMITADO";
    if (isNaN(val)) return "R$ 0.00";
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

/**
 * Exibe o Card detalhado da estratégia no console
 */
function displayStrategyCard(metrics: StrategyMetrics, rank: number, lot: number) {
    const numPernas = metrics.pernas.length;
    const totalFees = numPernas * FEE_PER_LEG;
    
    // Valores de Lucro e Risco extraídos da sua interface
    const maxProfitVal = typeof metrics.max_profit === 'number' ? metrics.max_profit : Infinity;
    const maxLossVal = typeof metrics.max_loss === 'number' ? metrics.max_loss : Infinity;

    // Cálculos Financeiros Líquidos (Multiplicados pelo Lote)
    const premiumFlowTotal = metrics.initialCashFlow * lot;
    const maxProfitLiquid = maxProfitVal === Infinity 
        ? Infinity 
        : (maxProfitVal * lot) - totalFees;

    const totalRisk = maxLossVal === Infinity 
        ? Infinity 
        : (Math.abs(maxLossVal) * lot) + totalFees;
    
    // Cálculo de ROI
    let roiDisplay = "N/A";
    if (maxProfitLiquid === Infinity) roiDisplay = "∞ (ILIMITADO)";
    else if (totalRisk > 0) {
        roiDisplay = `${((maxProfitLiquid / totalRisk) * 100).toFixed(2)}%`;
    }

    console.log(`\n[#${rank}] ${metrics.name.toUpperCase()} (${metrics.spread_type})`);
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`Vencimento: ${metrics.expiration.padEnd(12)} | Natureza: ${metrics.natureza.padEnd(10)} | ROI: ${roiDisplay}`);
    
    // Gregas e Custos Operacionais
    const d = metrics.greeks.delta ?? 0;
    const t = metrics.greeks.theta ?? 0;
    console.log(`Delta Net: ${d.toFixed(2).padStart(6)} | Theta Net: ${t.toFixed(4).padStart(8)} | Taxa Total Operação: ${fmtBRL(totalFees)}`);
    console.log(`Break-Even Points: ${metrics.breakEvenPoints.map(b => b.toFixed(2)).join(' / ')}`);
    
    console.log(`Fluxo Inicial (Lote): ${fmtBRL(premiumFlowTotal)} | Lucro Máx Líq: ${fmtBRL(maxProfitLiquid)}`);
    console.log(`Risco Máximo Total:   ${fmtBRL(totalRisk)}`);
    
    console.log(`\nPERNAS (Lote: ${lot}):`);
    console.log(`  Sentido | Espécie | Símbolo           | Strike  | Prêmio (Un) | Delta Un.`);
    
    metrics.pernas.forEach(p => {
        const side = p.direction === 'COMPRA' ? '[C]' : '[V]';
        const species = p.derivative.tipo.padEnd(7); // CALL ou PUT
        const symbol = p.derivative.option_ticker.padEnd(17);
        const strike = (p.derivative.strike ?? 0).toFixed(2).padStart(7);
        const premUnit = p.derivative.premio.toFixed(2).padStart(11);
        const deltaUn = p.derivative.gregas_unitarias.delta?.toFixed(2) ?? "0.00";
        
        console.log(`  ${side}     | ${species} | ${symbol} | ${strike} | ${premUnit} | ${deltaUn}`);
    });
    console.log(`--------------------------------------------------------------------------------`);
}

/**
 * Função principal de execução
 */
async function runStrategyCalculator() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const prompt = (q: string): Promise<string> => new Promise(res => rl.question(q, res));

    try {
        console.log("\n====================================================");
        console.log("   ANALISADOR DE ESTRATÉGIAS PROFISSIONAL V25");
        console.log("====================================================");

        const assetTicker = (await prompt(`Ativo (Ex: PETR4): `)).toUpperCase().trim();
        const priceInput = (await prompt(`Preço Atual do Ativo: `)).replace(',', '.');
        const price = parseFloat(priceInput);
        const userLimitROI = parseFloat(await prompt(`ROI Mínimo Desejado %: `)) || 0;
        const inputLot = parseInt(await prompt(`Tamanho do Lote (Ex: 1000): `)) || 100;

        // Leitura e Filtro dos Dados
        const allOptions = await readOptionsDataFromCSV(CSV_FILE_PATH, price);
        const filtered = allOptions.filter(o => o.ativo_subjacente.toUpperCase() === assetTicker);

        if (filtered.length === 0) throw new Error(`O ativo ${assetTicker} não foi encontrado no CSV.`);

        // Execução dos Cálculos
        const calculator = new PayoffCalculator(filtered, FEE_PER_LEG, inputLot);
        const allResults = calculator.findAndCalculateSpreads(price);

        // Agrupamento para mostrar apenas a melhor de cada categoria
        const bestByGroup: Map<string, StrategyMetrics> = new Map();

        allResults.forEach(strat => {
            const fees = strat.pernas.length * FEE_PER_LEG;
            const mProfit = typeof strat.max_profit === 'number' ? strat.max_profit : Infinity;
            const mLoss = typeof strat.max_loss === 'number' ? Math.abs(strat.max_loss) : 1;

            const netProfit = (mProfit * inputLot) - fees;
            const totalR = (mLoss * inputLot) + fees;

            // Filtros de Viabilidade
            if (strat.max_profit !== 'Ilimitado' && netProfit <= 0) return;
            if (strat.max_profit !== 'Ilimitado' && totalR > 0) {
                const currentROI = (netProfit / totalR) * 100;
                if (currentROI < userLimitROI) return;
            }

            // Seleciona a de maior lucro máximo para a categoria
            const currentBest = bestByGroup.get(strat.name);
            if (!currentBest || (mProfit > (currentBest.max_profit as number))) {
                bestByGroup.set(strat.name, strat);
            }
        });

        // Ordenação Final: Ilimitados primeiro, depois por Lucro
        const finalResults = Array.from(bestByGroup.values()).sort((a, b) => {
            if (a.max_profit === 'Ilimitado') return -1;
            if (b.max_profit === 'Ilimitado') return 1;
            return (Number(b.max_profit) - Number(a.max_profit));
        });

        if (finalResults.length > 0) {
            console.log(`\n[SUCESSO] Foram encontradas ${finalResults.length} estratégias para ${assetTicker}:`);
            finalResults.forEach((strat, i) => displayStrategyCard(strat, i + 1, inputLot));
        } else {
            console.log(`\n[!] Nenhuma estratégia atende aos critérios de ROI de ${userLimitROI}%.`);
        }

    } catch (e: any) {
        console.error(`\n[ERRO] ${e.message}`);
    } finally {
        rl.close();
    }
}

runStrategyCalculator();