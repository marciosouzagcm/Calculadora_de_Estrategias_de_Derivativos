import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

/** * CORREÇÃO CRÍTICA DE IMPORT (NodeNext):
 * Quando usamos module: NodeNext, o TypeScript exige a extensão .js 
 * nos imports de arquivos locais, mesmo que o arquivo físico seja .ts.
 */
import { DataOrchestrator } from '../src/services/DataOrchestrator.js';
import { DatabaseService, pool } from '../src/config/database.js';
import { PayoffCalculator } from '../src/services/PayoffCalculator.js';
import { StrategyMetrics } from '../src/interfaces/Types.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const FEE_PER_LEG = 22.00;

// Helper para formatar moeda
const fmtBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// Função de preparação para o Frontend
function prepareStrategyForFrontend(metrics: StrategyMetrics, lot: number): any {
    const isExplosion = metrics.name.toLowerCase().includes('str');
    const numPernas = metrics.pernas.length;
    const feesOpen = numPernas * FEE_PER_LEG;
    
    const maxProfitNum = (typeof metrics.max_profit === 'number' && metrics.max_profit < 900000) ? metrics.max_profit : null;
    const maxLossNum = (typeof metrics.max_loss === 'number' && metrics.max_loss < 900000) ? metrics.max_loss : null;

    const profitFinanceiro = maxProfitNum !== null ? (maxProfitNum * lot) - feesOpen : "Ilimitado";
    const totalRiskFinanceiro = maxLossNum !== null ? (Math.abs(maxLossNum) * lot) + feesOpen : (isExplosion ? 0 : "Sob Consulta");

    return {
        ...metrics,
        exibir_roi: (typeof profitFinanceiro === 'number' && typeof totalRiskFinanceiro === 'number' && totalRiskFinanceiro > 0)
            ? ((profitFinanceiro / totalRiskFinanceiro) * 100).toFixed(2) + '%'
            : 'Variável',
        exibir_risco: typeof totalRiskFinanceiro === 'number' ? fmtBRL(totalRiskFinanceiro) : totalRiskFinanceiro,
        exibir_lucro: typeof profitFinanceiro === 'number' ? fmtBRL(profitFinanceiro) : profitFinanceiro,
        pernas: metrics.pernas.map(p => ({
            ...p,
            side_display: p.direction === 'COMPRA' ? '[C]' : '[V]'
        }))
    };
}

// --- ROTAS ---

app.get('/api/analise', async (req, res) => {
    try {
        const ticker = (req.query.ticker as string || 'ABEV3').toUpperCase();
        const inputLot = parseInt(req.query.lote as string || '1000');

        const currentPrice = await DatabaseService.getSpotPrice(ticker);
        if (currentPrice === 0) throw new Error(`Preço spot não encontrado para ${ticker}`);

        const options = await DatabaseService.getOptionsByTicker(ticker);
        const calculator = new PayoffCalculator(options, FEE_PER_LEG, inputLot);
        const results = calculator.findAndCalculateSpreads(currentPrice, 0.25);
        
        const estruturadas = results.map(s => prepareStrategyForFrontend(s, inputLot));

        res.json({ status: "success", data: estruturadas });
    } catch (e: any) {
        res.status(500).json({ status: "error", message: e.message });
    }
});

// --- BOOTSTRAP ---

async function start() {
    try {
        // Testa conexão com TiDB antes de abrir a porta
        await pool.query('SELECT 1');
        console.log('✅ [DATABASE] TiDB Cloud conectado.');

        if (process.env.NODE_ENV !== 'production') {
            DataOrchestrator.init();
        }

        if (process.env.VERCEL !== '1') {
            app.listen(PORT, () => {
                console.log(`🚀 [BOARDPRO] Online em http://localhost:${PORT}`);
            });
        }
    } catch (err) {
        console.error('❌ Erro na inicialização:', err);
    }
}

start();

export default app;