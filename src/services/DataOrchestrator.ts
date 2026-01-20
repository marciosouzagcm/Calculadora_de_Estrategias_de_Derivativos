import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
// Mantendo as extensões .js para compatibilidade com o motor ESM da Vercel
import { processarDadosOpcoes } from './ExcelProcessor.js'; 
import { DatabaseService } from '../config/database.js';  

/**
 * BOARDPRO V40.0 - Orchestrator
 * Responsável por conectar ao TiDB e, se estiver em ambiente local, monitorar arquivos.
 */
export class DataOrchestrator {
    private static UPLOADS_DIR = path.join(process.cwd(), 'uploads');
    private static DOWNLOADS_DIR = path.join(process.env.USERPROFILE || '', 'Downloads');

    /**
     * Inicialização Híbrida:
     * 1. Testa conexão com TiDB (Nuvem e Local)
     * 2. Ativa Watcher de arquivos (Apenas Local)
     */
    public static async init() {
        try {
            // 1. Garantir conexão com o TiDB antes de subir a API
            console.log("📡 [DATABASE] Validando conexão com TiDB Cloud...");
            await DatabaseService.testConnection(); 

            // 2. Criar diretório de logs se necessário (Apenas se tiver permissão de escrita)
            if (process.env.NODE_ENV !== 'production') {
                if (!fs.existsSync(this.UPLOADS_DIR)) {
                    fs.mkdirSync(this.UPLOADS_DIR, { recursive: true });
                }
            }

            // 3. Ativar o Monitor de Arquivos APENAS em ambiente de desenvolvimento local
            // Evita erro de 'permission denied' em sistemas serverless (Vercel/AWS)
            const isLocal = process.env.NODE_ENV !== 'production' && !process.env.VERCEL;
            
            if (isLocal && fs.existsSync(this.DOWNLOADS_DIR)) {
                this.startWatcher();
            } else {
                console.log("☁️ [ORCHESTRATOR] Rodando em modo CLOUD/PROD. Watcher de arquivos desativado.");
            }

        } catch (error: any) {
            console.error("❌ [ORCHESTRATOR ERROR] Falha no startup:", error.message);
            // Em ambiente serverless, não queremos que o init trave a execução se for apenas o watcher
            if (process.env.NODE_ENV === 'production') {
                console.warn("⚠️ Continuando execução em modo Cloud apesar do erro de init.");
            } else {
                throw error;
            }
        }
    }

    /**
     * MÉTODO PARA API: Busca dados de opções no banco.
     */
    public static async getOptionsData(ticker: string) {
        return await DatabaseService.getOptionsByTicker(ticker);
    }

    /**
     * MÉTODO PARA API: Busca preço spot (underlying) no banco.
     */
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
                console.log(`\n✨ [DETECTADO] Novo arquivo: ${fileName}`);
                
                try {
                    console.log(`⏳ [SYNC] Enviando dados para TiDB Cloud...`);
                    await processarDadosOpcoes(filePath);
                    console.log(`✅ [SUCESSO] TiDB atualizado.`);

                    this.moveToProcessed(filePath, fileName);
                } catch (err: any) {
                    console.error(`❌ [SYNC ERROR]:`, err.message);
                }
            }
        });

        watcher.on('error', error => console.error(`[WATCHER ERROR]: ${error}`));
    }

    private static moveToProcessed(oldPath: string, fileName: string) {
        // No serverless, 'uploads' não é persistente, então essa lógica é para uso LOCAL
        const processedDir = path.join(this.UPLOADS_DIR, 'processados');
        if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });
        
        const timestamp = new Date().getTime();
        const newPath = path.join(processedDir, `${timestamp}_${fileName}`);
        
        try {
            if (fs.existsSync(oldPath)) {
                fs.copyFileSync(oldPath, newPath);
                fs.unlinkSync(oldPath);
                console.log(`📦 [BACKUP] Arquivo movido para /uploads/processados`);
            }
        } catch (e: any) {
            console.warn(`⚠️ [BACKUP WARNING] ${e.message}`);
        }
    }
}