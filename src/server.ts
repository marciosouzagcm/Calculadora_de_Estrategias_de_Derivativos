import express, { Request, Response } from 'express';
import cors from 'cors'; 
import { StrategyService } from './services/StrategyService';
import { DataOrchestrator } from './services/DataOrchestrator';

const app = express();

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
})); 
app.use(express.json());

/**
 * Endpoint de Análise Estratégica
 */
app.get('/api/analise', async (req: Request, res: Response): Promise<void> => {
    try {
        const { ticker, preco, lote } = req.query;

        if (!ticker) {
            res.status(400).json({ 
                status: "error", 
                message: "O ticker do ativo subjacente é obrigatório." 
            });
            return;
        }

        const tickerStr = String(ticker).toUpperCase().trim();
        // Garante que o lote seja um número válido, padrão 100
        const loteNum = parseInt(String(lote)) || 100;
        
        const precoNum = (preco && preco !== 'undefined' && preco !== '') 
            ? parseFloat(String(preco)) 
            : undefined;

        console.log(`[API] 🔍 Buscando oportunidades para: ${tickerStr} (Lote: ${loteNum})`);

        // Chamada ao serviço que agora filtra 1 de cada e calcula ROI realista
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
                fontePreco: precoNum ? "Manual" : "Banco de Dados",
                precoReferencia: precoNum || "DB"
            },
            count: resultados.length,
            data: resultados
        });

    } catch (error: any) {
        console.error(`[API ERROR] ❌ Falha no processamento: ${error.message}`);
        if (!res.headersSent) {
            res.status(500).json({ 
                status: "error", 
                message: "Erro interno no servidor ao processar estratégias.",
                details: error.message 
            });
        }
    }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    try {
        DataOrchestrator.init();
        console.log("[SYSTEM] 📂 Monitor de arquivos Excel (DataOrchestrator) ativado.");
    } catch (e) {
        console.warn("[WARN] ⚠️ DataOrchestrator não pôde iniciar.");
    }

    console.log(`
    ========================================================
    🚀 TRADING BOARD BACKEND - ONLINE
    --------------------------------------------------------
    📡 ENDPOINT: http://localhost:${PORT}/api/analise
    🔧 STATUS: StrategyFactory & Services Integrados
    ========================================================
    `);
});