import cors from 'cors';
import express, { Request, Response } from 'express';
import { pool } from './config/database'; // Importado para o Health Check
import { DataOrchestrator } from './services/DataOrchestrator';
import { StrategyService } from './services/StrategyService';

const app = express();

// Configuração de CORS - Mantida flexível para o seu Frontend (Vite)
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
})); 

app.use(express.json());

// --- ROTA DE HEALTH CHECK ---
// Útil para verificar se a API e o Banco estão vivos sem processar nada pesado
app.get('/api/health', async (_req: Request, res: Response) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: "ok", database: "connected", timestamp: new Date() });
    } catch (error: any) {
        res.status(500).json({ status: "error", database: "disconnected", message: error.message });
    }
});

// --- ROTA PRINCIPAL DE ANÁLISE ---
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

        // Busca as oportunidades no StrategyService
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
                precoReferencia: precoNum || "Preço de Mercado (DB)"
            },
            count: resultados.length,
            data: resultados
        });

    } catch (error: any) {
        // Log detalhado no servidor para facilitar o seu Debug
        console.error(`[API ERROR] ❌ ${new Date().toISOString()}: ${error.message}`);
        
        if (!res.headersSent) {
            res.status(500).json({ 
                status: "error", 
                message: "Erro ao processar estratégias. Verifique a conexão com o banco.",
                details: error.message 
            });
        }
    }
});

const PORT = process.env.PORT || 3001;

// Inicialização com tratamento de erro no Orchestrator
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    
    try {
        console.log(`📡 [WATCHER] Iniciando monitoramento de arquivos...`);
        DataOrchestrator.init();
    } catch (error: any) {
        console.error(`[ORCHESTRATOR ERROR] ❌ Falha ao iniciar: ${error.message}`);
    }
});