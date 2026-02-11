import cors from 'cors';
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { DataOrchestrator } from './services/DataOrchestrator.js';
import { StrategyService } from './services/StrategyService.js';

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
 * Ajustado para o build unificado (Multi-Page App)
 */
const rootPath = process.cwd();
const distPath = path.join(rootPath, 'dist');

// Serve arquivos estáticos (JS, CSS, Imagens) a partir da raiz da dist
app.use(express.static(distPath, { index: false }));

/**
 * --- ROTEAMENTO DE DOMÍNIO E PÁGINAS ---
 */

// 1. ROTA RAIZ: Decide entre Landing Page ou Calculadora
app.get('/', (req: Request, res: Response) => {
    const host = req.headers.host || '';
    
    // Caminhos gerados pelo seu vite.config.ts (rollupOptions.input)
    const landingIndex = path.join(distPath, 'landingpagecalculadora', 'index.html');
    const appIndex = path.join(distPath, 'frontend-app', 'index.html');

    // Se vier pelo domínio oficial, mostra a Landing Page
    if (host.includes('tradingprobrasil.com')) {
        if (fs.existsSync(landingIndex)) {
            console.log("[SERVER] Servindo Landing Page para:", host);
            return res.sendFile(landingIndex);
        }
    }

    // Caso contrário, serve a Calculadora
    if (fs.existsSync(appIndex)) {
        return res.sendFile(appIndex);
    }
    
    res.status(404).send("Erro: Arquivos de build não encontrados na pasta dist.");
});

// 2. ROTA /APP: Força a abertura da calculadora
app.get(['/app', '/app/*'], (req: Request, res: Response) => {
    const appIndex = path.join(distPath, 'frontend-app', 'index.html');
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
        const { ticker, preco, lote } = req.query;
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
            console.log(`🔗 DOMÍNIO: tradingprobrasil.com -> Landing Page`);
            console.log(`📱 APP: /app -> Calculadora`);
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