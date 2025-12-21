// src/index.ts (V20 - Versão Final Consolidada)

import { PayoffCalculator } from './services/PayoffCalculator'; 
import { StrategyMetrics } from './interfaces/Types'; 
import { readOptionsDataFromCSV } from './services/csvReader'; 
import * as readline from 'readline'; 

const FEE_PER_LEG = 22; 
const CSV_FILE_PATH = 'opcoes_final_tratado.csv'; 

const fmtBRL = (val: number) => {
    if (val === Infinity) return "Ilimitado";
    if (isNaN(val)) return "R$ 0.00";
    return `R$ ${val.toFixed(2)}`;
};

function displayStrategyCard(metrics: StrategyMetrics, rank: number, lot: number) {
    const numPernas = metrics.pernas.length;
    const totalFees = numPernas * FEE_PER_LEG;
    
    // Cálculos Financeiros
    const premiumFlow = (metrics.initialCashFlow as number) * lot;
    const netInitialFlow = premiumFlow - totalFees;
    const isCredit = premiumFlow > 0;

    const maxProfitLiquid = typeof metrics.max_profit === 'number' 
        ? (metrics.max_profit * lot - totalFees) 
        : Infinity;

    const totalRisk = metrics.risco_maximo === Infinity 
        ? Infinity 
        : (Math.abs(metrics.risco_maximo as number) * lot) + totalFees;
    
    // Cálculo de Retorno/Ratio
    let ratioStr = "N/A";
    if (maxProfitLiquid === Infinity) {
        ratioStr = "ILIMITADO";
    } else if (totalRisk !== Infinity && totalRisk !== 0) {
        ratioStr = `1 : ${(maxProfitLiquid / totalRisk).toFixed(2)}`;
    }

    const effPercent = (maxProfitLiquid === Infinity || totalRisk === Infinity || maxProfitLiquid <= 0) 
        ? 0 
        : (totalRisk / maxProfitLiquid) * 100;

    console.log(`\n[#${rank}] ${metrics.name.toUpperCase()} (${isCredit ? 'CRÉDITO' : 'DÉBITO'})`);
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`Vencimento: ${metrics.expiration.padEnd(12)} | Retorno: ${ratioStr}`);
    console.log(`Financeiro: Fluxo Líquido ${fmtBRL(netInitialFlow)} | Lucro Máx Líq: ${fmtBRL(maxProfitLiquid)}`);
    console.log(`Risco Total (Custo + Taxas): ${fmtBRL(totalRisk)} | Eficiência: ${effPercent.toFixed(1)}%`);
    
    console.log(`\nPERNAS (Lote: ${lot}):`);
    console.log(`  Tipo | Símbolo         | Strike  | Prêmio (Un) | Total Perna   | Taxa`);
    
    metrics.pernas.forEach(l => {
        const side = l.direction === 'COMPRA' ? '[C]' : '[V]';
        const symbol = l.display.padEnd(15);
        const strike = l.derivative.strike?.toFixed(2).padStart(7);
        const premUnit = l.derivative.premio.toFixed(2).padStart(11);
        const totalPerna = (l.derivative.premio * lot).toFixed(2).padStart(13);
        
        console.log(`  ${side}  | ${symbol} | ${strike} | ${premUnit} | ${fmtBRL(parseFloat(totalPerna))} | ${fmtBRL(FEE_PER_LEG)}`);
    });
    console.log(`--------------------------------------------------------------------------------`);
}

async function runStrategyCalculator() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const prompt = (q: string): Promise<string> => new Promise(res => rl.question(q, res));

    try {
        console.log("\n--- ANALISADOR DE ESTRATÉGIAS PROFISSIONAL V20 ---");
        const assetTicker = (await prompt(`Ativo (Ex: ABEV3): `)).toUpperCase().trim();
        const price = parseFloat((await prompt(`Preço Atual: `)).replace(',', '.'));
        const userLimit = parseFloat(await prompt(`Seu limite de Custo/Risco % (Ex: 80): `)) || 80;
        const inputLot = parseInt(await prompt(`Tamanho do Lote (Ex: 1000): `)) || 1000;

        const allOptions = await readOptionsDataFromCSV(CSV_FILE_PATH, price);
        const filtered = allOptions.filter(o => o.ativo_subjacente.toUpperCase() === assetTicker);

        if (filtered.length === 0) throw new Error("Ativo não encontrado no CSV.");

        const calculator = new PayoffCalculator(filtered, FEE_PER_LEG, inputLot);
        const allResults = calculator.findAndCalculateSpreads(price);

        // Agrupamento Inteligente
        const bestByGroup: Map<string, StrategyMetrics> = new Map();

        allResults.forEach(strat => {
            const fees = strat.pernas.length * FEE_PER_LEG;
            const netProfit = (strat.max_profit as number) * inputLot - fees;

            // Filtro 1: A estratégia precisa ser lucrativa após taxas (exceto se for lucro ilimitado)
            if (strat.max_profit !== Infinity && netProfit <= 0) return;

            // Filtro 2: Eficiência dentro do limite do usuário
            if (strat.max_profit !== Infinity) {
                const totalR = (Math.abs(strat.risco_maximo as number) * inputLot) + fees;
                if ((totalR / netProfit) * 100 > userLimit) return;
            }

            // Seleciona a melhor variante de cada tipo (critério: maior lucro líquido)
            const currentBest = bestByGroup.get(strat.name);
            if (!currentBest || (strat.max_profit as number) > (currentBest.max_profit as number)) {
                bestByGroup.set(strat.name, strat);
            }
        });

        const finalResults = Array.from(bestByGroup.values()).sort((a, b) => {
            if (a.max_profit === Infinity) return -1;
            return 1;
        });

        if (finalResults.length > 0) {
            console.log(`\n[SUCESSO] Encontradas ${finalResults.length} categorias que atendem seus critérios:`);
            finalResults.forEach((strat, i) => displayStrategyCard(strat, i + 1, inputLot));
        } else {
            console.log(`\n[!] Nenhuma estratégia viável encontrada para ${assetTicker} com esses parâmetros.`);
            console.log(`Dica: Aumente o Lote ou o limite de Custo/Risco.`);
        }

    } catch (e: any) {
        console.error(`\n[ERRO] ${e.message}`);
    } finally {
        rl.close();
    }
}

runStrategyCalculator();