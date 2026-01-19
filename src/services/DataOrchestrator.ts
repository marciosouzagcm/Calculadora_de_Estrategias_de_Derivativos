import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { processarDadosOpcoes } from './ExcelProcessor';

export class DataOrchestrator {
    // Detecta a pasta de Downloads do Windows de forma segura usando variáveis de ambiente
    private static DOWNLOADS_DIR = path.join(process.env.USERPROFILE || '', 'Downloads');
    
    // Pasta de trabalho dentro do projeto para manter histórico
    private static UPLOADS_DIR = path.join(process.cwd(), 'uploads');

    public static init() {
        // 1. Garante que a infraestrutura de pastas locais existe
        if (!fs.existsSync(this.UPLOADS_DIR)) {
            fs.mkdirSync(this.UPLOADS_DIR, { recursive: true });
            console.log(`📁 [SYSTEM] Pasta /uploads criada para logs locais.`);
        }

        console.log(`📡 [WATCHER] Monitorando Downloads para TiDB Sync: ${this.DOWNLOADS_DIR}`);
        console.log(`🎯 [FILTER] Ativo: Aguardando arquivos "Opções *.xlsx"`);

        // 2. Configuração do Watcher (Chokidar)
        // Otimizado para ignorar arquivos temporários do navegador enquanto o download acontece
        const watcher = chokidar.watch(this.DOWNLOADS_DIR, {
            ignored: /(^|[\/\\])\..|.*\.crdownload$|.*\.tmp$/,
            persistent: true,
            ignoreInitial: true, 
            depth: 0,
            awaitWriteFinish: {
                stabilityThreshold: 3000, // Espera 3 segundos sem mudanças para garantir que o download acabou
                pollInterval: 500
            }
        });

        // 3. Evento de novo arquivo detectado
        watcher.on('add', async (filePath) => {
            const fileName = path.basename(filePath);

            // Filtro específico para o padrão de exportação de opções (ABEV3, PETR4, etc)
            if (fileName.startsWith('Opções') && fileName.endsWith('.xlsx')) {
                console.log(`\n✨ [DETECTADO] Novo arquivo de opções identificado: ${fileName}`);
                
                try {
                    console.log(`⏳ [TiDB SYNC] Iniciando extração e upload para a nuvem...`);
                    
                    // Chama o processador que agora usa transações seguras no TiDB
                    await processarDadosOpcoes(filePath);
                    
                    console.log(`✅ [SUCESSO] TiDB Cloud atualizado com sucesso via ${fileName}.`);

                    // Move para a pasta de processados para evitar re-processamento
                    this.moveToProcessed(filePath, fileName);

                } catch (err: any) {
                    console.error(`❌ [SYNC ERROR]: Falha ao processar arquivo ${fileName}:`, err.message);
                }
            }
        });

        watcher.on('error', error => console.error(`[WATCHER CRITICAL ERROR]: ${error}`));
    }

    /**
     * Move o arquivo processado para uma pasta de backup dentro do projeto.
     * Isso limpa sua pasta de Downloads e mantém um histórico organizado.
     */
    private static moveToProcessed(oldPath: string, fileName: string) {
        const processedDir = path.join(this.UPLOADS_DIR, 'processados');
        if (!fs.existsSync(processedDir)) {
            fs.mkdirSync(processedDir, { recursive: true });
        }
        
        const timestamp = new Date().getTime();
        const newPath = path.join(processedDir, `${timestamp}_${fileName}`);
        
        try {
            if (fs.existsSync(oldPath)) {
                fs.copyFileSync(oldPath, newPath);
                fs.unlinkSync(oldPath);
                console.log(`📦 [BACKUP] Arquivo original movido para: /uploads/processados`);
            }
        } catch (e: any) {
            console.warn(`⚠️ [BACKUP WARNING] Não foi possível mover o arquivo: ${e.message}`);
        }
    }
}