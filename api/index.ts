import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { DataOrchestrator } from '../src/services/DataOrchestrator.js';
import { DatabaseService, pool } from '../src/config/database.js';
import { PayoffCalculator } from '../src/services/PayoffCalculator.js';
import { StrategyMetrics } from '../src/interfaces/Types.js';

dotenv.config();

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

const FEE_PER_LEG = 22.00;

const fmtBRL = (val: number) => new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
}).format(val);

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
        if (!currentPrice || currentPrice === 0) {
            return res.status(404).json({ status: "error", message: `Preço spot de ${ticker} indisponível.` });
        }

        const options = await DatabaseService.getOptionsByTicker(ticker);
        const calculator = new PayoffCalculator(options, FEE_PER_LEG, inputLot);
        const results = calculator.findAndCalculateSpreads(currentPrice, 0.25);
        
        const estruturadas = results.map(s => prepareStrategyForFrontend(s, inputLot));

        res.json({ status: "success", data: estruturadas });
    } catch (e: any) {
        console.error('❌ [ANALISE ERROR]:', e.message);
        res.status(500).json({ status: "error", message: "Erro ao processar análise estratégica." });
    }
});

app.get('/api/cotacao', async (req, res) => {
    try {
        const { ticker } = req.query;
        if (!ticker) return res.status(400).json({ error: "Ticker é obrigatório" });
        
        const tickerUpper = String(ticker).toUpperCase();
        const preco = await DatabaseService.getSpotPrice(tickerUpper);
        
        res.json({ ticker: tickerUpper, preco: preco || 0, timestamp: new Date().toISOString() });
    } catch (e: any) {
        res.status(500).json({ error: "Erro ao buscar cotação." });
    }
});

app.get('/api/buscar-opcoes', async (req, res) => {
    try {
        const { ticker } = req.query;
        if (!ticker) return res.status(400).json({ error: "Ticker é obrigatório" });
        const opcoes = await DatabaseService.getOptionsByTicker(String(ticker).toUpperCase());
        res.json(opcoes);
    } catch (e: any) {
        res.status(500).json({ error: "Erro ao buscar grade de opções." });
    }
});

// NOVA ROTA: Salvar Estratégia
app.post('/api/salvar-estrategia', async (req, res) => {
    try {
        const data = req.body;
        // Lógica de salvamento no TiDB ou Firebase aqui
        console.log(`💾 [SAVE] Estratégia ${data.name} recebida.`);
        res.status(201).json({ status: "success", message: "Estratégia salva com sucesso!" });
    } catch (e: any) {
        res.status(500).json({ error: "Erro ao salvar estratégia." });
    }
});

// --- INICIALIZAÇÃO ---

pool.query('SELECT 1')
    .then(() => console.log('✅ [DATABASE] TiDB Cloud conectado.'))
    .catch(err => console.error('❌ [DATABASE] Erro:', err.message));

if (process.env.VERCEL !== '1') {
    DataOrchestrator.init().catch(console.error);
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => console.log(`🚀 [BOARDPRO] Local: http://localhost:${PORT}`));
}

export default app;