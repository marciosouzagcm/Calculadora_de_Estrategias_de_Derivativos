import cors from 'cors';
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { DataOrchestrator } from './services/DataOrchestrator';
import { StrategyService } from './services/StrategyService';

// Carrega variáveis de ambiente (.env) - Essencial para a Nuvem
dotenv.config();

const app = express();

// --- Middleware de Segurança e CORS ---
app.use(cors({
    origin: '*', // Em produção, substitua pelo domínio da sua Vercel
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
})); 
app.use(express.json());

// --- Endpoint de Saúde (Health Check) ---
// Útil para o Render saber que a instância está viva
app.get('/health', (req, res) => {
    res.status(200).json({ status: "ok", environment: process.env.NODE_ENV });
});

// --- Rota Principal de Análise ---
app.get('/api/analise', async (req: Request, res: Response): Promise<void> => {
    try {
        const { ticker, preco, lote } = req.query;

        if (!ticker) {
            res.status(400).json({ status: "error", message: "Ticker é obrigatório." });
            return;
        }

        const tickerStr = String(ticker).toUpperCase().trim();
        const loteNum = parseInt(String(lote)) || 100;
        
        // Melhor tratamento para o preço de referência
        let precoNum: number | undefined;
        if (preco && preco !== 'undefined' && preco !== '') {
            precoNum = parseFloat(String(preco));
        }

        console.log(`[API] 🔍 Buscando Oportunidades: ${tickerStr} (Lote: ${loteNum})`);

        // Busca estratégias (Agora integra MarketDataService + Nuvem)
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
                precoReferencia: precoNum || "REAL-TIME/DB"
            },
            count: resultados.length,
            data: resultados
        });

    } catch (error: any) {
        console.error(`[API ERROR] ❌: ${error.message}`);
        if (!res.headersSent) {
            res.status(500).json({ 
                status: "error", 
                message: "Erro interno no processamento da estratégia." 
            });
        }
    }
});

// --- Inicialização do Servidor ---
const PORT = process.env.PORT || 3001;

// Função para iniciar banco e servidor em ordem
const startServer = async () => {
    try {
        // Inicializa orquestrador de dados (Conexão com Banco de Dados Nuvem)
        await DataOrchestrator.init();
        console.log("✅ Banco de Dados conectado com sucesso.");

        app.listen(PORT, () => {
            console.log(`🚀 BoardPro API rodando na porta ${PORT}`);
            console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (err) {
        console.error("❌ Falha crítica na inicialização do servidor:", err);
        process.exit(1); // Encerra se não conseguir conectar ao banco
    }
};

startServer();