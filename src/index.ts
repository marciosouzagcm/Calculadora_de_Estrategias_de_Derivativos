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
    // Verifica se é uma estratégia de volatilidade (Straddle/Strangle)
    const isExplosion = metrics.name.toLowerCase().includes('str');
    const numPernas = metrics.pernas.length;
    const feesOpen = numPernas * FEE_PER_LEG;
    const feesClose = feesOpen;
    
    // Tratamento para valores "Ilimitados" ou numéricos
    const parseValue = (val: any) => (typeof val === 'number' && val < 900000) ? val : null;

    const maxProfitNum = parseValue(metrics.max_profit);
    const maxLossNum = parseValue(metrics.max_loss);

    // Cálculos Financeiros com proteção para null (Ilimitado)
    const profitFinanceiro = maxProfitNum !== null ? (maxProfitNum * lot) - feesOpen : "Ilimitado";
    const totalRiskFinanceiro = maxLossNum !== null ? (Math.abs(maxLossNum) * lot) + feesOpen : (isExplosion ? 0 : "Sob Consulta");

    // Cálculo do Stop Loss Sugerido
    let stopLossVal = "A definir";
    if (typeof totalRiskFinanceiro === 'number') {
        const val = isExplosion ? (totalRiskFinanceiro * 0.5) + feesClose : (totalRiskFinanceiro * 0.3) + feesClose;
        stopLossVal = `-${fmtBRL(val)}`;
    }

    return {
        ...metrics,
        exibir_roi: (typeof profitFinanceiro === 'number' && typeof totalRiskFinanceiro === 'number' && totalRiskFinanceiro > 0)
            ? ((profitFinanceiro / totalRiskFinanceiro) * 100).toFixed(2) + '%'
            : 'Variável',
        exibir_risco: typeof totalRiskFinanceiro === 'number' ? fmtBRL(totalRiskFinanceiro) : totalRiskFinanceiro,
        exibir_lucro: typeof profitFinanceiro === 'number' ? fmtBRL(profitFinanceiro) : profitFinanceiro,
        stop_loss_sugerido: stopLossVal,
        alvo_zero_a_zero: isExplosion 
            ? `> O conjunto deve valorizar até: R$ ${(( (typeof totalRiskFinanceiro === 'number' ? totalRiskFinanceiro : 0) + feesClose) / lot).toFixed(2)}/un`
            : `> Recomprar a trava por no máximo: R$ ${maxProfitNum !== null ? ((maxProfitNum * lot - (feesOpen + feesClose)) / lot).toFixed(2) : '0.00'}/un`,
        pernas: metrics.pernas.map(p => ({
            ...p,
            side_display: p.direction === 'COMPRA' ? '[C]' : '[V]',
            derivative: {
                ...p.derivative,
                strike: p.derivative.strike ?? 0,
                premio: p.derivative.premio ?? 0
            }
        }))
    };
}

app.get('/api/analise', async (req, res) => {
    try {
        const ticker = (req.query.ticker as string || 'PETR4').toUpperCase();
        const price = parseFloat(req.query.preco as string || '40.00');
        const inputLot = parseInt(req.query.lote as string || '1000');

        if (!fs.existsSync(CSV_FILE_PATH)) return res.status(500).json({ error: "CSV não encontrado" });

        const options = await readOptionsDataFromCSV(CSV_FILE_PATH, price);
        const filtered = options.filter(o => o.ativo_subjacente.toUpperCase() === ticker);
        
        const calculator = new PayoffCalculator(filtered, FEE_PER_LEG, inputLot);
        const results = calculator.findAndCalculateSpreads(price, 0.20);
        
        // CORREÇÃO AQUI: Removido o filtro que barrava "STR"
        const estruturadas = results.map(s => prepareStrategyForFrontend(s, inputLot));

        // Separar para o frontend poder organizar em abas (opcional, mas ajuda)
        const voadoras = estruturadas.filter(s => s.name.toLowerCase().includes('str'));
        const travas = estruturadas.filter(s => !s.name.toLowerCase().includes('str'));

        res.json({ 
            status: "success", 
            data: { 
                todas: estruturadas,
                travas,
                voadoras // Straddles e Strangles
            } 
        });
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ status: "error", message: e.message });
    }
});

app.listen(3000, () => console.log("BACKEND V38.0 ONLINE: http://localhost:3000"));