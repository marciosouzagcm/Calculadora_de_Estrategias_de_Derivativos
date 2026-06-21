import * as path from 'path';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import { pool } from '../config/database.js';

const lib = (XLSX as any).default || XLSX;
const { readFile, utils } = lib;

const COLUNAS_MAP: { [key: string]: string[] } = {
    'ticker': ['Ticker'], 
    'vencimento': ['Vencimento'],
    'diasUteis': ['Dias úteis'],
    'tipo': ['Tipo', 'TipoF.M.'],
    'strike': ['Strike'], 
    'premioPct': ['Prêmio', 'Último', 'Último '],
    'volImplicita': ['Vol. Implícita (%)', 'Vol. Impl.', 'Vol. Implícita'], 
    'delta': ['Delta'],
    'gamma': ['Gamma'],
    'theta': ['Theta ($)', 'Theta (%)', 'Theta'],
    'vega': ['Vega'],
};

const FATOR_CORRECAO_ESCALA_PRECO = 100.0;
const FATOR_CORRECAO_ESCALA_GREGA = 10000.0;
const FATOR_CORRECAO_ESCALA_VI = 100.0;

function cleanAndParseNumber(value: any): number {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === 'number') return value;
    try {
        const strValue = String(value).trim();
        const cleaned = strValue.replace(/\./g, '').replace(/,/g, '.');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    } catch { return 0; }
}

/**
 * Função corrigida para converter datas do Excel (serial ou string) para YYYY-MM-DD
 */
function formatVencimento(value: any): string {
    if (!value || String(value).trim() === '') return '2099-12-31';
    
    try {
        let date: Date;

        // Se for número (Serial do Excel)
        if (typeof value === 'number' || (!isNaN(Number(value)) && String(value).trim() !== '')) {
            const serial = Number(value);
            // 25569 é o offset para a base 1970 do Unix
            date = new Date(Math.round((serial - 25569) * 86400 * 1000));
        } else {
            const str = String(value).trim();
            // Tenta capturar DD/MM/YYYY ou DD-MM-YYYY
            const match = str.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
            if (match) {
                // match[1]=dia, match[2]=mes, match[3]=ano
                date = new Date(`${match[3]}-${match[2]}-${match[1]}`);
            } else {
                date = new Date(str);
            }
        }
        
        return isNaN(date.getTime()) ? '2099-12-31' : date.toISOString().split('T')[0];
    } catch { 
        return '2099-12-31'; 
    }
}

export async function processarDadosOpcoes(nomeArquivoExcel: string): Promise<void> {
    try {
        const nomeBase = path.basename(nomeArquivoExcel);
        const match = nomeBase.match(/Opções\s+(\w+)/i);
        const ativoBase = match ? match[1].toUpperCase() : 'ATIVO';

        console.log(`[TiDB PROCESSOR] 📑 Iniciando processamento: ${nomeBase}`);

        if (!fs.existsSync(nomeArquivoExcel)) {
            throw new Error(`Arquivo não encontrado: ${nomeArquivoExcel}`);
        }

        const workbook = readFile(nomeArquivoExcel);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const sheetAsArray: any[][] = utils.sheet_to_json(worksheet, { header: 1, raw: false });

        if (sheetAsArray.length < 3) {
            console.warn(`[PROCESSOR] ⚠️ Arquivo insuficiente ou vazio: ${nomeBase}`);
            return;
        }

        const headerOriginal = sheetAsArray[1].map(h => String(h || '').trim());
        const dataRows = sheetAsArray.slice(2);
        const valoresParaInserir: any[][] = [];

        for (const row of dataRows) {
            const rowObj: any = {};
            headerOriginal.forEach((name, idx) => { if (name) rowObj[name] = row[idx]; });

            const getVal = (key: string) => {
                const nomesPossiveis = COLUNAS_MAP[key];
                const encontrado = headerOriginal.find(col => 
                    nomesPossiveis.some(p => col.toLowerCase().includes(p.toLowerCase()))
                );
                return encontrado ? rowObj[encontrado] : undefined;
            };

            const ticker = String(getVal('ticker') || '').trim();
            if (ticker.length < 5 || ticker.toUpperCase() === 'TICKER') continue;

            let strike = cleanAndParseNumber(getVal('strike'));
            if (strike < 15 && strike > 0) strike = strike * 10; 

            const premio = cleanAndParseNumber(getVal('premioPct')) / FATOR_CORRECAO_ESCALA_PRECO;
            const vol = cleanAndParseNumber(getVal('volImplicita')) / FATOR_CORRECAO_ESCALA_VI;

            if (premio === 0 || strike === 0) continue; 

            const tipoRaw = String(getVal('tipo') || '').toUpperCase();
            const tipo = (tipoRaw.startsWith('P') || tipoRaw.startsWith('A') || ticker.charAt(4) > 'L') ? 'PUT' : 'CALL';

            valoresParaInserir.push([
                ativoBase,
                ticker,
                formatVencimento(getVal('vencimento')),
                parseInt(getVal('diasUteis')) || 0,
                tipo,
                Number(strike.toFixed(2)),
                Number(premio.toFixed(4)),
                Number(vol.toFixed(4)),
                Number((cleanAndParseNumber(getVal('delta')) / FATOR_CORRECAO_ESCALA_GREGA).toFixed(4)),
                Number((cleanAndParseNumber(getVal('gamma')) / FATOR_CORRECAO_ESCALA_GREGA).toFixed(4)),
                Number((cleanAndParseNumber(getVal('theta')) / FATOR_CORRECAO_ESCALA_GREGA).toFixed(4)),
                Number((cleanAndParseNumber(getVal('vega')) / FATOR_CORRECAO_ESCALA_GREGA).toFixed(4)),
                new Date()
            ]);
        }

        if (valoresParaInserir.length === 0) {
            console.warn(`[PROCESSOR] ⚠️ Nenhuma linha válida encontrada em: ${nomeBase}`);
            return;
        }

        const sql = `INSERT INTO opcoes (idAcao, ticker, vencimento, diasUteis, tipo, strike, premioPct, volImplicita, delta, gamma, theta, vega, dataHora) VALUES ? ON DUPLICATE KEY UPDATE strike=VALUES(strike), premioPct=VALUES(premioPct), volImplicita=VALUES(volImplicita), diasUteis=VALUES(diasUteis), dataHora=VALUES(dataHora)`;

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.query(sql, [valoresParaInserir]);
            await connection.commit();
            console.log(`[TiDB CLOUD] ☁️ SUCESSO! ${valoresParaInserir.length} registros sincronizados.`);
        } catch (dbError: any) {
            await connection.rollback();
            throw dbError;
        } finally {
            connection.release();
        }
    } catch (error: any) {
        console.error(`[PROCESSOR ERROR] ❌ Falha na sincronização com TiDB:`, error.message);
    }
}