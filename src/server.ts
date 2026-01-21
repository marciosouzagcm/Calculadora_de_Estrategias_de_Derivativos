import cors from 'cors';
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { DataOrchestrator } from './services/DataOrchestrator.js';
import { StrategyService } from './services/StrategyService.js';

/** * CORREÇÃO CRÍTICA (NodeNext):
 * Removemos o import de '../api/routes.js' pois ele foi deletado e unificado no api/index.ts.
 * Importamos o app unificado para manter a consistência.
 */
import appUnificado from '../api/index.js'; 

dotenv.config();

const app = express();

/**
 * --- CONFIGURAÇÃO DE SEGURANÇA (CORS) ---
 */
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
})); 

app.use(express.json());

/**
 * --- ENDPOINT DE SAÚDE (HEALTH CHECK) ---
 */
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ 
        status: "ok", 
        server: "BoardPro API",
        timestamp: new Date().toISOString()
    });
});

/**
 * --- ROTA DE ANÁLISE QUANTITATIVA ---
 */
app.get('/api/analise', async (req: Request, res: Response): Promise<void> => {
    try {
        const { ticker, preco, lote, risco } = req.query;

        if (!ticker) {
            res.status(400).json({ status: "error", message: "Ticker é obrigatório." });
            return;
        }

        const tickerStr = String(ticker).toUpperCase().trim();
        const loteNum = parseInt(String(lote)) || 100;
        const riscoMax = parseFloat(String(risco)) || 1000;
        
        let precoNum: number | undefined;
        if (preco && preco !== 'undefined' && preco !== '') {
            precoNum = parseFloat(String(preco));
        }

        console.log(`[API] 🔍 Scanner acionado: ${tickerStr} | Lote: ${loteNum} | Risco: ${riscoMax}`);

        // Invoca o motor de estratégias
        const resultados = await StrategyService.getOportunidades(
            tickerStr, 
            loteNum,
            precoNum
        );

        res.json({
            status: "success",
            timestamp: new Date().toISOString(),
            info: { ticker: tickerStr, lote: loteNum, riscoMax },
            count: resultados.length,
            data: resultados
        });

    } catch (error: any) {
        console.error(`[API ERROR] ❌ Erro: ${error.message}`);
        if (!res.headersSent) {
            res.status(500).json({ 
                status: "error", 
                message: "Erro ao calcular estratégias. Verifique a conexão com o TiDB." 
            });
        }
    }
});

/**
 * --- INICIALIZAÇÃO ---
 */
const PORT: number = Number(process.env.PORT) || 10000;

const startServer = async () => {
    try {
        // Evita inicialização dupla se estiver rodando na Vercel
        if (process.env.VERCEL === '1') return;

        console.log("⏳ [STARTUP] Inicializando serviços de dados...");
        await DataOrchestrator.init();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log("--------------------------------------------------");
            console.log(`🚀 BOARDPRO API RODANDO NA PORTA: ${PORT}`);
            console.log(`🌍 AMBIENTE: ${process.env.NODE_ENV || 'production'}`);
            console.log("--------------------------------------------------");
        });
    } catch (err) {
        console.error("❌ [FATAL] Falha crítica ao iniciar servidor:", err);
        process.exit(1); 
    }
};

// Executa apenas se não estiver em ambiente de teste ou Vercel
if (process.env.NODE_ENV !== 'test') {
    startServer();
}

export default app;