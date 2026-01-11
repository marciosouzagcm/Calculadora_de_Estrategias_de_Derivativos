import cors from 'cors';
import express, { Request, Response } from 'express';
import { DataOrchestrator } from './services/DataOrchestrator';
import { StrategyService } from './services/StrategyService';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/api/analise', async (req: Request, res: Response) => {
    try {
        const ticker = String(req.query.ticker || '').toUpperCase();
        const preco = req.query.preco ? parseFloat(String(req.query.preco)) : undefined;
        // GARANTE O LOTE 1000 SE NÃO ENVIADO
        const lote = parseInt(String(req.query.lote)) || 1000; 

        const resultados = await StrategyService.getOportunidades(ticker, lote, preco);

        console.log(`\n[API] 🔍 Oportunidades para ${ticker} | Lote: ${lote}`);
        console.log(`--------------------------------------------------------------------------------`);

        resultados.forEach((item, index) => {
            const lucroFormatado = typeof item.max_profit === 'number' 
                ? item.max_profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                : item.max_profit;

            const idx = (index + 1).toString().padStart(2, '0');
            console.log(`[${idx}] ${item.name.padEnd(25)} | STRIKE: ${item.strike_description.padStart(12)} | ROI: ${item.exibir_roi?.padStart(8)} | LUCRO: ${lucroFormatado}`);
        });
        
        console.log(`--------------------------------------------------------------------------------`);
        res.json({ status: "success", count: resultados.length, data: resultados });
    } catch (error: any) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(3001, () => {
    console.log(`🚀 TRADING BOARD PRO V38.5 ON`);
    DataOrchestrator.init();
});