import express from 'express';
import cors from 'cors';
import { PayoffCalculator } from './services/PayoffCalculator'; 
import { StrategyMetrics } from './interfaces/Types'; 
import { readOptionsDataFromCSV } from './services/csvReader'; 
import * as path from 'path'; 
import * as fs from 'fs';

const app = express();
app.use(cors());

const FEE_PER_LEG = 22.00; 
const CSV_FILE_PATH = path.join(process.cwd(), 'src', 'opcoes_final_tratado.csv'); 

const fmtBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

function prepareStrategyForFrontend(metrics: StrategyMetrics, lot: number): any {
    const isExplosion = metrics.name.toLowerCase().includes('str');
    const numPernas = metrics.pernas.length;
    const feesOpen = numPernas * FEE_PER_LEG;
    const feesClose = feesOpen;
    
    // Tratamento rigoroso para evitar NaN
    const maxProfitNum = typeof metrics.max_profit === 'number' ? metrics.max_profit : 0;
    const maxLossNum = typeof metrics.max_loss === 'number' ? metrics.max_loss : 0;

    const maxProfitLiquid = (maxProfitNum * lot) - feesOpen;
    const totalRiskFinanceiro = (Math.abs(maxLossNum) * lot) + feesOpen;
    
    // Cálculo do Stop Loss (Fiel ao Terminal)
    const stopLossVal = isExplosion ? (totalRiskFinanceiro * 0.5) + feesClose : maxProfitLiquid + feesClose;

    return {
        ...metrics,
        // Chaves específicas que o Frontend vai ler
        exibir_roi: totalRiskFinanceiro === 0 ? '0.00%' : ((maxProfitLiquid / totalRiskFinanceiro) * 100).toFixed(2) + '%',
        exibir_risco: totalRiskFinanceiro,
        stop_loss_sugerido: `-${fmtBRL(stopLossVal)}`,
        alvo_zero_a_zero: isExplosion 
            ? `> O conjunto deve valorizar até: R$ ${((totalRiskFinanceiro + feesClose) / lot).toFixed(2)}/un`
            : `> Recomprar a trava por no máximo: R$ ${((maxProfitNum * lot - (feesOpen + feesClose)) / lot).toFixed(2)}/un`,
        pernas: metrics.pernas.map(p => ({
            ...p,
            side_display: p.direction === 'COMPRA' ? '[C]' : '[V]',
            derivative: {
                ...p.derivative,
                strike: p.derivative.strike ?? 0, // Resolve TS18047
                premio: p.derivative.premio ?? 0
            }
        }))
    };
}

app.get('/api/analise', async (req, res) => {
    try {
        const ticker = (req.query.ticker as string || 'ITUB4').toUpperCase();
        const price = parseFloat(req.query.preco as string || '40.00');
        const inputLot = parseInt(req.query.lote as string || '1000');

        if (!fs.existsSync(CSV_FILE_PATH)) return res.status(500).json({ error: "CSV não encontrado" });

        const options = await readOptionsDataFromCSV(CSV_FILE_PATH, price);
        const filtered = options.filter(o => o.ativo_subjacente.toUpperCase() === ticker);
        
        const calculator = new PayoffCalculator(filtered, FEE_PER_LEG, inputLot);
        const results = calculator.findAndCalculateSpreads(price, 0.20);
        
        const estruturadas = results
            .filter(s => !s.name.toLowerCase().includes('str'))
            .map(s => prepareStrategyForFrontend(s, inputLot));

        res.json({ status: "success", data: { estruturadas } });
    } catch (e: any) {
        res.status(500).json({ status: "error", message: e.message });
    }
});

app.listen(3000, () => console.log("BACKEND V37.6 ONLINE: http://localhost:3000"));