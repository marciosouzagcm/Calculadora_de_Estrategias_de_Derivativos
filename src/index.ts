// src/index.ts (V37.1 - Correção de Tipagem e Relatório Completo)

import { PayoffCalculator } from './services/PayoffCalculator'; 
import { StrategyMetrics } from './interfaces/Types'; 
import { readOptionsDataFromCSV } from './services/csvReader'; 
import * as readline from 'readline'; 

const FEE_PER_LEG = 22.00; 
const CSV_FILE_PATH = 'opcoes_final_tratado.csv'; 

const fmtBRL = (val: number) => {
    if (val === Infinity || val > 999999) return "ILIMITADO";
    if (val === -Infinity || val < -999999) return "RISCO ILIMITADO";
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

function displayStrategyCard(metrics: StrategyMetrics, rank: number, lot: number) {
    const numPernas = metrics.pernas.length;
    const feesOpen = numPernas * FEE_PER_LEG;
    const feesClose = numPernas * FEE_PER_LEG; 
    
    const isExplosion = metrics.name.toLowerCase().includes('straddle') || metrics.name.toLowerCase().includes('strangle');
    const maxProfitVal = typeof metrics.max_profit === 'number' ? metrics.max_profit : Infinity;
    const maxLossVal = typeof metrics.max_loss === 'number' ? metrics.max_loss : 0;

    const maxProfitLiquid = maxProfitVal === Infinity ? Infinity : (maxProfitVal * lot) - feesOpen;
    const totalRisk = (Math.abs(maxLossVal) * lot) + feesOpen;
    const rrRatio = (metrics as any).riskRewardRatio ?? 0;
    const roi = maxProfitVal === Infinity ? '∞' : ((maxProfitLiquid / (totalRisk || 1)) * 100).toFixed(2) + '%';

    console.log(`\n[#${rank}] ${metrics.name.toUpperCase()} | R:R Alvo: ${rrRatio}:1`);
    console.log(`--------------------------------------------------------------------------------`);
    
    // 1. CUSTOS OPERACIONAIS
    console.log(`DETALHAMENTO DE TAXAS (LOTE ${lot}):`);
    console.log(`  Entrada: ${fmtBRL(feesOpen)} | Reversão (Saída): ${fmtBRL(feesClose)} | Ciclo Total: ${fmtBRL(feesOpen + feesClose)}`);

    // 2. ALVOS DE MERCADO
    console.log(`\nALVOS PARA 0 A 0 (PAGAR IDA + VOLTA):`);
    if (isExplosion) {
        const target00 = (totalRisk + feesClose) / lot;
        console.log(`  > O conjunto deve valorizar até: R$ ${target00.toFixed(2)}/un`);
    } else {
        const target00 = (maxProfitVal * lot - (feesOpen + feesClose)) / lot;
        console.log(`  > Recomprar a trava por no máximo: R$ ${target00.toFixed(2)}/un`);
    }

    // 3. RESUMO FINANCEIRO
    console.log(`\nRESUMO FINANCEIRO:`);
    console.log(`  Vencimento: ${metrics.expiration.padEnd(10)} | ROI: ${roi}`);
    console.log(`  Lucro Máx Líq: ${fmtBRL(maxProfitLiquid).padEnd(12)} | Risco Total: ${fmtBRL(totalRisk)}`);
    console.log(`  Break-Even: ${metrics.breakEvenPoints.map(b => b.toFixed(2)).join(' / ')}`);
    
    // 4. GREGAS E STOP
    const dNet = metrics.greeks.delta ?? 0;
    const tNet = metrics.greeks.theta ?? 0;
    const stopLossReal = isExplosion ? (totalRisk * 0.5) + feesClose : maxProfitLiquid + feesClose;
    
    console.log(`\nGREGAS (NET) & RISCO:`);
    console.log(`  Delta Net: ${dNet.toFixed(2).padStart(6)} | Theta Net: ${tNet.toFixed(4).padStart(8)}`);
    console.log(`  STOP LOSS SUGERIDO: -${fmtBRL(stopLossReal)} (Incluindo reversão)`);

    // 5. PERNAS
    console.log(`\nPERNAS:`);
    metrics.pernas.forEach(p => {
        const side = p.direction === 'COMPRA' ? '[C]' : '[V]';
        const d = p.derivative as any;
        let pUn = d.premioPct ?? d.premio ?? d.ultimo_preco ?? d.last_price ?? 0;
        if (typeof pUn === 'string') pUn = parseFloat(pUn.replace(',', '.'));
        
        const ticker = p.derivative.option_ticker.padEnd(10);
        // CORREÇÃO AQUI: Adicionado ?? 0 para evitar erro de 'null'
        const strike = (p.derivative.strike ?? 0).toFixed(2).padStart(6);
        const delta = (p.derivative.gregas_unitarias.delta ?? 0).toFixed(2).padStart(5);
        const premio = Number(pUn).toFixed(2).padStart(7);

        console.log(`  ${side} | ${p.derivative.tipo.padEnd(5)} | ${ticker} | STK: ${strike} | PRM: R$ ${premio}`);
    });
    console.log(`--------------------------------------------------------------------------------`);
}

async function runStrategyCalculator() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const prompt = (q: string): Promise<string> => new Promise(res => rl.question(q, res));

    try {
        console.log("\n====================================================");
        console.log("    ANALISADOR DE ASSIMETRIA PROFISSIONAL V37.1");
        console.log("====================================================");

        const ticker = (await prompt(`Ativo: `)).toUpperCase().trim();
        const price = parseFloat((await prompt(`Preço Atual: `)).replace(',', '.'));
        const maxRR = parseFloat((await prompt(`Risco Máximo: `)).replace(',', '.')) || 0.20;
        const inputLot = parseInt(await prompt(`Lote: `)) || 1000;

        const options = await readOptionsDataFromCSV(CSV_FILE_PATH, price);
        const filtered = options.filter(o => o.ativo_subjacente.toUpperCase() === ticker);

        const calculator = new PayoffCalculator(filtered, FEE_PER_LEG, inputLot);
        const results = calculator.findAndCalculateSpreads(price, maxRR).filter(s => {
            const totalFees = s.pernas.length * FEE_PER_LEG * 2;
            return (Number(s.max_profit) * inputLot) > (totalFees * 1.5);
        });

        if (results.length > 0) {
            const explosao = results.filter(s => s.name.toLowerCase().includes('str')).sort((a,b) => Number(a.max_loss) - Number(b.max_loss)).slice(0,3);
            const estrut = results.filter(s => !s.name.toLowerCase().includes('str')).sort((a,b) => (a as any).riskRewardRatio - (b as any).riskRewardRatio).slice(0,5);

            if (explosao.length > 0) {
                console.log("\n>>> CATEGORIA: EXPLOSÃO");
                explosao.forEach((s, i) => displayStrategyCard(s, i + 1, inputLot));
            }

            if (estrut.length > 0) {
                console.log("\n>>> CATEGORIA: ESTRUTURADAS");
                estrut.forEach((s, i) => displayStrategyCard(s, i + 1, inputLot));
            }

            console.log("\n" + "=".repeat(85));
            console.log("             SUMÁRIO DE OPORTUNIDADES (RANKING DE ASSIMETRIA)");
            console.log("=".repeat(85));
            console.log(`${'ESTRATÉGIA'.padEnd(25)} | ${'R:R'.padEnd(10)} | ${'RISCO TOTAL'.padEnd(15)} | ${'LUCRO LÍQ'}`);
            console.log("-".repeat(85));

            [...estrut, ...explosao].forEach(s => {
                const rr = (s as any).riskRewardRatio?.toString() ?? "0.00";
                const risk = (Math.abs(Number(s.max_loss)) * inputLot) + (s.pernas.length * FEE_PER_LEG);
                const profit = s.max_profit === Infinity ? "ILIMITADO" : fmtBRL((Number(s.max_profit) * inputLot) - (s.pernas.length * FEE_PER_LEG));
                console.log(`${s.name.substring(0, 24).padEnd(25)} | ${rr.padEnd(10)} | ${fmtBRL(risk).padEnd(15)} | ${profit}`);
            });
            console.log("=".repeat(85));
            console.log(`Total de estratégias viáveis encontradas: ${results.length}`);
            console.log("=".repeat(85) + "\n");

        } else {
            console.log(`\n[!] Nenhuma estratégia lucrativa após taxas.`);
        }
    } catch (e: any) {
        console.error(`\n[ERRO] ${e.message}`);
    } finally {
        rl.close();
    }
}

runStrategyCalculator();