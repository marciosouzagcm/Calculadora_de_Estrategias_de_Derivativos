import cors from 'cors';
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
// Ajuste de caminho: subindo um nível para achar a pasta src
import { DataOrchestrator } from '../src/services/DataOrchestrator.js';
import { StrategyService } from '../src/services/StrategyService.js';

dotenv.config();

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Rota de teste rápido
app.get('/api', (req, res) => {
    res.json({ status: "online", message: "API unificada na raiz" });
});

// Rota de Análise
app.get('/api/analise', async (req: Request, res: Response) => {
    try {
        const { ticker, preco, lote } = req.query;
        if (!ticker) {
            return res.status(400).json({ error: "Ticker é obrigatório" });
        }

        const tickerStr = String(ticker).toUpperCase().trim();
        const loteNum = parseInt(String(lote)) || 100;
        const precoNum = preco ? parseFloat(String(preco)) : undefined;

        // Inicializa conexão com banco
        await DataOrchestrator.init();

        const resultados = await StrategyService.getOportunidades(tickerStr, loteNum, precoNum);

        res.json({
            status: "success",
            data: resultados
        });
    } catch (error: any) {
        console.error("Erro na API:", error);
        res.status(500).json({ error: error.message });
    }
});

export default app;