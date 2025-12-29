import cors from 'cors';
import express, { Request, Response } from 'express';
import { DataOrchestrator } from './services/DataOrchestrator';
import { StrategyService } from './services/StrategyService';

const app = express();

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
})); 
app.use(express.json());

app.get('/api/analise', async (req: Request, res: Response): Promise<void> => {
    try {
        const { ticker, preco, lote } = req.query;

        if (!ticker) {
            res.status(400).json({ status: "error", message: "Ticker é obrigatório." });
            return;
        }

        const tickerStr = String(ticker).toUpperCase().trim();
        const loteNum = parseInt(String(lote)) || 100;
        const precoNum = (preco && preco !== 'undefined' && preco !== '') ? parseFloat(String(preco)) : undefined;

        console.log(`[API] 🔍 Buscando Top 11 para: ${tickerStr} (Lote: ${loteNum})`);

        // O StrategyService agora já retorna apenas 1 de cada estratégia, ordenadas por ROI
        const resultados = await StrategyService.getOportunidades(
            tickerStr, 
            loteNum,
            precoNum
        );

        res.json({
            status: "success",
            timestamp: new Date().toISOString(),
            info: {
                ticker: tickerStr,
                lote: loteNum,
                precoReferencia: precoNum || "DB"
            },
            count: resultados.length,
            data: resultados
        });

    } catch (error: any) {
        console.error(`[API ERROR] ❌: ${error.message}`);
        if (!res.headersSent) {
            res.status(500).json({ status: "error", message: error.message });
        }
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    try {
        DataOrchestrator.init();
    } catch (e) {}
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});