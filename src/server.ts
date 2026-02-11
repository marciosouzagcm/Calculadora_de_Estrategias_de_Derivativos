import cors from 'cors';
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { DataOrchestrator } from './services/DataOrchestrator.js';
import { StrategyService } from './services/StrategyService.js';

// Configuração para caminhos no ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
})); 

app.use(express.json());

/**
 * --- CONFIGURAÇÃO DE ARQUIVOS ESTÁTICOS ---
 * Aqui definimos onde o servidor busca os arquivos do Frontend
 */
const rootPath = process.cwd();
const calculadoraPath = path.join(rootPath, 'dist');
const landingPath = path.join(rootPath, 'landingpagecalculadora', 'dist');

// Serve os arquivos estáticos (CSS, JS, Imagens) das duas pastas
app.use(express.static(calculadoraPath, { index: false }));
if (fs.existsSync(landingPath)) {
    app.use(express.static(landingPath, { index: false }));
}

/**
 * --- ROTEAMENTO DE DOMÍNIO E PÁGINAS ---
 */

// 1. ROTA RAIZ: Decide entre Landing Page ou Calculadora
app.get('/', (req: Request, res: Response) => {
    const host = req.headers.host || '';
    
    // Se vier pelo domínio oficial, tenta mostrar a Landing Page
    if (host.includes('tradingprobrasil.com')) {
        const landingIndex = path.join(landingPath, 'index.html');
        if (fs.existsSync(landingIndex)) {
            console.log("[SERVER] Servindo Landing Page para:", host);
            return res.sendFile(landingIndex);
        }
    }

    // Caso contrário (ou se a landing não existir), serve a Calculadora
    const appIndex = path.join(calculadoraPath, 'index.html');
    if (fs.existsSync(appIndex)) {
        return res.sendFile(appIndex);
    }
    
    res.status(404).send("Site em construção. Verifique os builds das pastas dist.");
});

// 2. ROTA /APP: Força a abertura da calculadora
app.get(['/app', '/app/*'], (req: Request, res: Response) => {
    const appIndex = path.join(calculadoraPath, 'index.html');
    if (fs.existsSync(appIndex)) {
        return res.sendFile(appIndex);
    }
    res.status(404).send("Calculadora não encontrada.");
});

/**
 * --- ENDPOINTS DE API ---
 */
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ 
        status: "ok", 
        server: "BoardPro API",
        timestamp: new Date().toISOString()
    });
});

app.get('/api/analise', async (req: Request, res: Response): Promise<void> => {
    try {
        const { ticker, preco, lote, risco } = req.query;
        if (!ticker) {
            res.status(400).json({ status: "error", message: "Ticker é obrigatório." });
            return;
        }
        const tickerStr = String(ticker).toUpperCase().trim();
        const resultados = await StrategyService.getOportunidades(tickerStr, parseInt(String(lote)) || 100, preco ? parseFloat(String(preco)) : undefined);
        res.json({ status: "success", data: resultados });
    } catch (error: any) {
        console.error(`[API ERROR] ❌ Erro: ${error.message}`);
        res.status(500).json({ status: "error", message: "Erro interno no servidor." });
    }
});

/**
 * --- INICIALIZAÇÃO ---
 */
const PORT: number = Number(process.env.PORT) || 10000;

const startServer = async () => {
    try {
        if (process.env.VERCEL === '1') return;

        console.log("⏳ [STARTUP] Inicializando serviços...");
        try {
            await DataOrchestrator.init();
            console.log("✅ [DATABASE] Conexão TiDB OK.");
        } catch (dbErr: any) {
            console.error("⚠️ [DATABASE ERROR] TiDB Offline.");
        }
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log("--------------------------------------------------");
            console.log(`🚀 SERVIDOR ATIVO NA PORTA: ${PORT}`);
            console.log(`🔗 LANDING: www.tradingprobrasil.com`);
            console.log(`📱 APP: /app`);
            console.log("--------------------------------------------------");
        });
    } catch (err) {
        process.exit(1); 
    }
};

if (process.env.NODE_ENV !== 'test') {
    startServer();
}

export default app;