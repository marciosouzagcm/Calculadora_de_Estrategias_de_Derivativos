import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { processarDadosOpcoes } from './ExcelProcessor';

export class DataOrchestrator {
    // Detecta a pasta de Downloads do Windows de forma segura
    private static DOWNLOADS_DIR = path.join(process.env.USERPROFILE || '', 'Downloads');
    
    // Pasta de trabalho dentro do projeto
    private static UPLOADS_DIR = path.join(process.cwd(), 'uploads');

    public static init() {
        // 1. Garante que a pasta uploads existe
        if (!fs.existsSync(this.UPLOADS_DIR)) {
            fs.mkdirSync(this.UPLOADS_DIR, { recursive: true });
            console.log(`📁 [SYSTEM] Pasta /uploads criada.`);
        }

        console.log(`📡 [WATCHER] Monitorando pasta de Downloads: ${this.DOWNLOADS_DIR}`);
        console.log(`🎯 [FILTER] Buscando por novos arquivos: "Opções *.xlsx"`);

        // 2. Configuração do Watcher
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

        // 3. Evento de novo arquivo
        watcher.on('add', async (filePath) => {
            const fileName = path.basename(filePath);

            if (fileName.startsWith('Opções') && fileName.endsWith('.xlsx')) {
                console.log(`\n✨ [DETECTADO] Novo arquivo de opções: ${fileName}`);
                
                try {
                    console.log(`⏳ [PROCESSANDO] Iniciando extração e atualização do Banco de Dados...`);
                    
                    // Chama o processador que agora corrige a data automaticamente
                    await processarDadosOpcoes(filePath);
                    
                    console.log(`✅ [SUCESSO] Banco de Dados atualizado com os dados de ${fileName}.`);

                    // Move para a pasta de processados para backup
                    this.moveToProcessed(filePath, fileName);

                } catch (err: any) {
                    console.error(`❌ [ERRO NO PROCESSAMENTO]:`, err.message);
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
                console.log(`📦 [BACKUP] Arquivo original movido para /uploads/processados`);
            }
        } catch (e: any) {
            console.warn(`⚠️ [BACKUP] Erro ao mover arquivo: ${e.message}`);
        }
    }
}