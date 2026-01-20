import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { processarDadosOpcoes } from './ExcelProcessor';
import { DatabaseService } from '../config/database';
/**
 * BOARDPRO V40.0 - Orchestrator
 * Responsável por conectar ao TiDB e, se estiver em ambiente local, monitorar arquivos.
 */
export class DataOrchestrator {
    /**
     * Inicialização Híbrida:
     * 1. Testa conexão com TiDB (Nuvem e Local)
     * 2. Ativa Watcher de arquivos (Apenas Local)
     */
    static async init() {
        try {
            // 1. Garantir conexão com o TiDB antes de subir a API
            console.log("📡 [DATABASE] Validando conexão com TiDB Cloud...");
            await DatabaseService.testConnection();
            // 2. Criar diretório de logs se necessário
            if (!fs.existsSync(this.UPLOADS_DIR)) {
                fs.mkdirSync(this.UPLOADS_DIR, { recursive: true });
            }
            // 3. Ativar o Monitor de Arquivos APENAS em ambiente de desenvolvimento/local
            // No Render, process.env.NODE_ENV costuma ser 'production'
            if (process.env.NODE_ENV !== 'production' && fs.existsSync(this.DOWNLOADS_DIR)) {
                this.startWatcher();
            }
            else {
                console.log("☁️ [ORCHESTRATOR] Rodando em modo CLOUD. Watcher de arquivos desativado.");
            }
        }
        catch (error) {
            console.error("❌ [ORCHESTRATOR ERROR] Falha no startup:", error);
            throw error; // Repassa o erro para o server.ts interromper o boot se necessário
        }
    }
    static startWatcher() {
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
                }
                catch (err) {
                    console.error(`❌ [SYNC ERROR]:`, err.message);
                }
            }
        });
        watcher.on('error', error => console.error(`[WATCHER ERROR]: ${error}`));
    }
    static moveToProcessed(oldPath, fileName) {
        const processedDir = path.join(this.UPLOADS_DIR, 'processados');
        if (!fs.existsSync(processedDir))
            fs.mkdirSync(processedDir, { recursive: true });
        const timestamp = new Date().getTime();
        const newPath = path.join(processedDir, `${timestamp}_${fileName}`);
        try {
            if (fs.existsSync(oldPath)) {
                fs.copyFileSync(oldPath, newPath);
                fs.unlinkSync(oldPath);
                console.log(`📦 [BACKUP] Arquivo movido para /uploads/processados`);
            }
        }
        catch (e) {
            console.warn(`⚠️ [BACKUP WARNING] ${e.message}`);
        }
    }
}
DataOrchestrator.UPLOADS_DIR = path.join(process.cwd(), 'uploads');
DataOrchestrator.DOWNLOADS_DIR = path.join(process.env.USERPROFILE || '', 'Downloads');
