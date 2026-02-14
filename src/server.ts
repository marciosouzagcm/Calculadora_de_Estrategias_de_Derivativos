import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// --- IMPORTS DE SEGURANÇA E NEGÓCIO ---
import { DataOrchestrator } from './services/DataOrchestrator.js';
import apiRoutes from './api/index.js'; 
// Ajustado para o caminho real que você enviou:
import { globalLimiter, apiLimiter } from './middlewares/rateLimiter.js'; // O arquivo de limite que você mostrou

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootPath = process.cwd();
const distPath = path.join(rootPath, 'dist');
const landingDist = path.join(rootPath, 'landingpagecalculadora', 'dist');
const publicPath = path.join(rootPath, 'public');

const app = express();

// --- APLICAÇÃO DE MIDDLEWARES ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Proteção Global (100 req / 15 min)
app.use(globalLimiter);

// 2. Proteção Específica para a API de Cálculos (10 req / 1 min)
app.use('/api', apiLimiter);

// CSP - Segurança
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline';");
  next();
});

// Registra rotas de API
app.use('/api', apiRoutes);

// Servir arquivos estáticos
app.use(express.static(publicPath, { index: false }));
app.use(express.static(distPath, { index: false }));
if (fs.existsSync(landingDist)) {
  app.use(express.static(landingDist, { index: false }));
}

// --- ROTEAMENTO ---

app.get('/', (req, res) => {
  const candidates = [
    path.join(rootPath, 'public', 'index.html'),
    path.join(landingDist, 'index.html'),
    path.join(distPath, 'landingpagecalculadora', 'index.html'),
    path.join(distPath, 'index.html'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return res.sendFile(p);
  }
  res.status(404).send('Landing page não encontrada. Verifique o build.');
});

app.get(['/app', '/app/*'], (req, res) => {
  const appIndex = path.join(distPath, 'index.html');
  if (fs.existsSync(appIndex)) return res.sendFile(appIndex);
  res.status(404).send('Calculadora não encontrada no diretório dist.');
});

// Fallback Final
app.get('*', (req, res) => {
  const landingIndex = path.join(landingDist, 'index.html');
  if (fs.existsSync(landingIndex)) return res.sendFile(landingIndex);
  res.sendFile(path.join(distPath, 'index.html'));
});

export default app;

// --- INICIALIZAÇÃO LOCAL (WATCHER + TIDB) ---
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = process.env.PORT || 10000;
  const startLocalServer = async () => {
    try {
      console.log("\n⏳ [STARTUP] Inicializando serviços BoardPro...");
      await DataOrchestrator.init();
      app.listen(PORT, () => {
        console.log("--------------------------------------------------");
        console.log(`🚀 SERVIDOR LOCAL ATIVO NA PORTA: ${PORT}`);
        console.log(`🛡️  SEGURANÇA: Rate Limit e Validação Zod Ativos`);
        console.log(`👁️  WATCHER: Monitorando Downloads para o TiDB Cloud`);
        console.log("--------------------------------------------------");
      });
    } catch (err: any) {
      console.error("❌ [ERRO] Falha ao iniciar serviços locais:", err.message);
    }
  };
  startLocalServer();
}