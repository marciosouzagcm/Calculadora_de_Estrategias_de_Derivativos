import express, { Request, Response } from 'express';
import cors from 'cors'; 
import { StrategyService } from './services/StrategyService';

const app = express();
app.use(cors()); 
app.use(express.json());

app.get('/api/analise', async (req: Request, res: Response): Promise<void> => {
    try {
        const { ticker, preco, risco, lote } = req.query;

        if (!ticker || !preco) {
            res.status(400).json({ status: "error", message: "Ticker e Preço obrigatórios." });
            return;
        }

        const tickerStr = String(ticker).toUpperCase().trim();
        const precoNum = parseFloat(String(preco));
        const riscoNum = parseFloat(String(risco)) || 0.70;
        const loteNum = parseInt(String(lote)) || 1000;

        const resultados = await StrategyService.getOportunidades(tickerStr, precoNum, riscoNum, loteNum);

        res.json({
            status: "success",
            data: resultados
        });

    } catch (error: any) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 API rodando na porta ${PORT}`));