import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
// Mantendo as extensões .js para compatibilidade com o motor ESM
import { processarDadosOpcoes } from './ExcelProcessor.js'; 
import { DatabaseService } from '../config/database.js';  

/**
 * BOARDPRO V40.1 - Orchestrator (Segurança Reforçada)
 * Item 16.1.3: Suporte a SSL Rigoroso para TiDB Cloud.
 */
export class DataOrchestrator {
    private static UPLOADS_DIR = path.join(process.cwd(), 'uploads');
    private static DOWNLOADS_DIR = path.join(process.env.USERPROFILE || '', 'Downloads');

    /**
     * Inicialização Híbrida:
     * 1. Valida conexão Segura (SSL) com TiDB.
     * 2. Configura Watcher de arquivos (Apenas Local).
     */
    public static async init() {
        try {
            console.log("--------------------------------------------------");
            console.log("📡 [DATABASE] Iniciando Handshake SSL com TiDB Cloud...");
            
            // 1. Testa conexão. O DatabaseService deve ler a URL do .env com rejectUnauthorized: true
            await DatabaseService.testConnection(); 
            console.log("🛡️ [SECURITY] Conexão SSL verificada e autorizada.");

            // 2. Preparação de diretórios locais
            const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
            
            if (!isProduction) {
                if (!fs.existsSync(this.UPLOADS_DIR)) {
                    fs.mkdirSync(this.UPLOADS_DIR, { recursive: true });
                }
                
                // 3. Ativar Watcher apenas se o diretório de Downloads existir (Windows Local)
                if (fs.existsSync(this.DOWNLOADS_DIR)) {
                    this.startWatcher();
                }
            } else {
                console.log("☁️ [ORCHESTRATOR] Modo Produção: Watcher de arquivos suprimido.");
            }

        } catch (error: any) {
            console.error("❌ [FATAL ERROR] Erro na inicialização do Orchestrator:");
            console.error(`> Motivo: ${error.message}`);
            
            // Se o erro for SSL, alertamos especificamente sobre o item 16.1.3
            if (error.message.includes('SSL') || error.message.includes('CERT')) {
                console.error("⚠️ Alerta de Segurança: Falha na validação do certificado SSL do TiDB.");
            }

            if (process.env.NODE_ENV === 'production') {
                console.warn("⚠️ Modo Resiliência: Mantendo API ativa para diagnóstico.");
            } else {
                throw error;
            }
        }
    }

    /**
     * Pontes de dados para a API
     */
    public static async getOptionsData(ticker: string) {
        return await DatabaseService.getOptionsByTicker(ticker);
    }

    public static async getUnderlyingPrice(ticker: string) {
        return await DatabaseService.getSpotPrice(ticker);
    }

    private static startWatcher() {
        console.log(`👁️ [WATCHER] Monitorando Downloads: ${this.DOWNLOADS_DIR}`);

        const watcher = chokidar.watch(this.DOWNLOADS_DIR, {
            ignored: /(^|[\/\\])\..|.*\.crdownload$|.*\.tmp$/,
            persistent: true,
            ignoreInitial: true, 
            depth: 0,
            awaitWriteFinish: {
                stabilityThreshold: 3000,
                pollInterval: 500
            }
        });

        watcher.on('add', async (filePath) => {
            const fileName = path.basename(filePath);

            if (fileName.startsWith('Opções') && fileName.endsWith('.xlsx')) {
                console.log(`\n✨ [DETECTADO] Novo conjunto de dados: ${fileName}`);
                
                try {
                    console.log(`⏳ [SYNC] Transmitindo para TiDB Cloud via Túnel Seguro...`);
                    await processarDadosOpcoes(filePath);
                    console.log(`✅ [SUCESSO] Sincronização finalizada.`);
                    this.moveToProcessed(filePath, fileName);
                } catch (err: any) {
                    console.error(`❌ [SYNC ERROR]:`, err.message);
                }
            }
        });

        watcher.on('error', error => console.error(`[WATCHER ERROR]: ${error}`));
    }

    private static moveToProcessed(oldPath: string, fileName: string) {
        const processedDir = path.join(this.UPLOADS_DIR, 'processados');
        if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });
        
        const timestamp = new Date().getTime();
        const newPath = path.join(processedDir, `${timestamp}_${fileName}`);
        
        try {
            if (fs.existsSync(oldPath)) {
                fs.copyFileSync(oldPath, newPath);
                fs.unlinkSync(oldPath);
                console.log(`📦 [BACKUP] Arquivo arquivado localmente.`);
            }
        } catch (e: any) {
            console.warn(`⚠️ [BACKUP WARNING] ${e.message}`);
        }
    }
}