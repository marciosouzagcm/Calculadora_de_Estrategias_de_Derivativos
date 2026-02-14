import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';

// --- IMPORTS DE SEGURANÇA E NEGÓCIO ---
import { DataOrchestrator } from './services/DataOrchestrator.js';
import apiRoutes from './api/index.js'; 
import { globalLimiter, apiLimiter } from './middlewares/rateLimiter.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootPath = process.cwd();
const distPath = path.join(rootPath, 'dist');
const landingDist = path.join(rootPath, 'landingpagecalculadora', 'dist');
const frontendDist = path.join(distPath, 'frontend-app'); 
const publicPath = path.join(rootPath, 'public');

const app = express();

// --- CONFIGURAÇÃO DE PROXY E CORS (Essencial para Nuvem) ---
app.set('trust proxy', 1); 

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- MIDDLEWARES DE PROTEÇÃO ---
app.use(globalLimiter);

// --- REGISTRO DE ROTAS DE API ---
// O apiLimiter protege todas as rotas que começam com /api
app.use('/api', apiLimiter, apiRoutes);

// --- SERVIR ARQUIVOS ESTÁTICOS ---
app.use(express.static(publicPath, { index: false }));
app.use(express.static(distPath, { index: false }));
app.use(express.static(frontendDist, { index: false }));
if (fs.existsSync(landingDist)) {
  app.use(express.static(landingDist, { index: false }));
}

// --- ROTEAMENTO DE PÁGINAS (FRONTEND) ---

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
  res.status(404).send('Landing page não encontrada.');
});

app.get(['/app', '/app/*'], (req, res) => {
  const candidates = [
    path.join(frontendDist, 'index.html'),
    path.join(distPath, 'index.html')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return res.sendFile(p);
  }
  res.status(404).send('Calculadora não encontrada.');
});

// Fallback Final: Impede que erro de API retorne HTML
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: "Rota de API inexistente" });
  }
  const landingIndex = path.join(landingDist, 'index.html');
  if (fs.existsSync(landingIndex)) return res.sendFile(landingIndex);
  res.sendFile(path.join(distPath, 'index.html'));
});

export default app;

// --- INICIALIZAÇÃO HÍBRIDA (LOCAL vs CLOUD) ---
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;

if (!process.env.VERCEL) { // Se não for Vercel, precisamos do listen
  const PORT = process.env.PORT || 10000;
  
  const startServer = async () => {
    try {
      console.log(`\n⏳ [STARTUP] Modo: ${isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);
      
      // Conecta ao banco em ambos os ambientes
      await DataOrchestrator.init();

      app.listen(PORT, () => {
        console.log("--------------------------------------------------");
        console.log(`🚀 SERVIDOR ATIVO NA PORTA: ${PORT}`);
        if (!isProduction) {
          console.log(`👁️  WATCHER ATIVO: Monitorando pasta Downloads`);
        }
        console.log("--------------------------------------------------");
      });
    } catch (err: any) {
      console.error("❌ [ERRO CRÍTICO]:", err.message);
    }
  };
  startServer();
}