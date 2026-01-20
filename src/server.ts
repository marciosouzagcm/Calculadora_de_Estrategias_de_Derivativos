import cors from 'cors';
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { DataOrchestrator } from './services/DataOrchestrator.js';
import { StrategyService } from './services/StrategyService.js';

/** * CORREÇÃO CRÍTICA (NodeNext):
 * 1. O caminho sobe um nível (../) pois a pasta 'api' está na raiz.
 * 2. O uso da extensão '.js' é obrigatório para que o NodeNext resolva o módulo corretamente.
 */
import optionsRouter from '../api/routes.js'; 

// Carrega variáveis de ambiente (.env)
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
 * --- REGISTRO DE ROTAS ---
 */
// Acopla as rotas de busca de opções (ex: GET /api/opcoes)
app.use('/api', optionsRouter);

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
        console.log("⏳ [STARTUP] Inicializando serviços de dados...");
        
        // Inicializa a conexão com o TiDB Cloud
        await DataOrchestrator.init();
        
        // Escuta em 0.0.0.0 para garantir acessibilidade em ambientes cloud
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

startServer();