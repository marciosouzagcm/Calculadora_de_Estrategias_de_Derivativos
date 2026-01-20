import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
import { DataOrchestrator } from './services/DataOrchestrator';
import { StrategyService } from './services/StrategyService';
// Carrega variáveis de ambiente (.env)
dotenv.config();
const app = express();
/**
 * --- CONFIGURAÇÃO DE SEGURANÇA (CORS) ---
 * Permite que o seu Frontend (React/Vercel) acesse a API no Render.
 */
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
/**
 * --- ENDPOINT DE SAÚDE (HEALTH CHECK) ---
 * Essencial para o Render manter a instância ativa e monitorar o status.
 */
app.get('/health', (req, res) => {
    res.status(200).json({
        status: "ok",
        server: "BoardPro API",
        database: "Connected",
        timestamp: new Date().toISOString()
    });
});
/**
 * --- ROTA PRINCIPAL DE ANÁLISE ---
 * GET /api/analise?ticker=PETR4&lote=100
 */
app.get('/api/analise', async (req, res) => {
    try {
        const { ticker, preco, lote } = req.query;
        if (!ticker) {
            res.status(400).json({ status: "error", message: "Ticker (ex: PETR4) é obrigatório." });
            return;
        }
        const tickerStr = String(ticker).toUpperCase().trim();
        const loteNum = parseInt(String(lote)) || 100;
        // Conversão segura de preço manual (se houver)
        let precoNum;
        if (preco && preco !== 'undefined' && preco !== '') {
            precoNum = parseFloat(String(preco));
        }
        console.log(`[API] 🔍 Scanner acionado para: ${tickerStr} | Lote: ${loteNum}`);
        // Invoca o motor de estratégias (StrategyService)
        const resultados = await StrategyService.getOportunidades(tickerStr, loteNum, precoNum);
        // Resposta formatada para o Dashboard
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
    }
    catch (error) {
        console.error(`[API ERROR] ❌ Erro ao processar ticker ${req.query.ticker}: ${error.message}`);
        if (!res.headersSent) {
            res.status(500).json({
                status: "error",
                message: "Erro interno ao calcular estratégias. Verifique a conexão com o banco de dados."
            });
        }
    }
});
/**
 * --- INICIALIZAÇÃO DO SERVIÇO ---
 */
const PORT = process.env.PORT || 10000; // Render usa a porta 10000 por padrão
const startServer = async () => {
    try {
        console.log("⏳ [STARTUP] Inicializando serviços de dados...");
        // Inicializa a conexão com o TiDB Cloud via DataOrchestrator
        await DataOrchestrator.init();
        app.listen(PORT, () => {
            console.log("--------------------------------------------------");
            console.log(`🚀 BOARDPRO API RODANDO NA PORTA: ${PORT}`);
            console.log(`📡 ENDPOINT: http://localhost:${PORT}/api/analise`);
            console.log(`🌍 AMBIENTE: ${process.env.NODE_ENV || 'production'}`);
            console.log("--------------------------------------------------");
        });
    }
    catch (err) {
        console.error("❌ [FATAL] Falha crítica ao conectar ao TiDB/Banco de Dados:", err);
        // Em produção, não queremos que o servidor suba se o banco estiver fora.
        process.exit(1);
    }
};
startServer();
