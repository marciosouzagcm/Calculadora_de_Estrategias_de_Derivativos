import * as path from 'path';
import * as XLSX from 'xlsx';
import { pool } from '../config/database';

const COLUNAS_MAP: { [key: string]: string[] } = {
    'ticker': ['Ticker', 'Ativo'], 
    'vencimento': ['Vencimento'],
    'diasUteis': ['Dias úteis', 'Dias p/ Venc.'],
    'tipo': ['Tipo', 'TipoF.M.'],
    'strike': ['Strike'], 
    'premioPct': ['Prêmio', 'Último', 'Preço'],
    'volImplicita': ['Vol. Implícita (%)', 'Vol. Impl.', 'Vol. Implícita'], 
    'delta': ['Delta'],
    'gamma': ['Gamma'],
    'theta': ['Theta'],
    'vega': ['Vega'],
};

// CONSTANTES DE CORREÇÃO DE ESCALA
const DIVISOR_STRIKE = 100.0;     // 1317 -> 13.17
const DIVISOR_PREMIO = 100.0;     // 20.00 -> 0.20 (O AJUSTE QUE FALTA!)
const DIVISOR_GREGAS = 10000.0;   // 8657 -> 0.8657
const DIVISOR_VOL    = 100.0;     // 3.16 -> 0.0316

function cleanAndParseNumber(value: any): number {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === 'number') return value;
    try {
        const strValue = String(value).trim();
        const cleaned = strValue.replace('%', '').replace(/\./g, '').replace(/,/g, '.');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    } catch { return 0; }
}

function formatVencimento(value: any): string {
    if (!value) return '';
    try {
        let date: Date;
        if (typeof value === 'number') {
            date = new Date(Math.round((value - 25569) * 86400 * 1000));
        } else {
            const str = String(value).trim();
            const parts = str.split(/[\/\-]/);
            if (parts.length === 3) {
                const d = parts[0].length === 4 ? parts[0] : parts[2];
                const m = parts[1];
                const day = parts[0].length === 4 ? parts[2] : parts[0];
                date = new Date(`${d}-${m}-${day}`);
            } else { date = new Date(str); }
        }
        return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
    } catch { return ''; }
}

export async function processarDadosOpcoes(nomeArquivoExcel: string): Promise<void> {
    const nomeBase = path.basename(nomeArquivoExcel);
    const match = nomeBase.match(/Opções\s+(\w+)/i);
    const ativoBase = match ? match[1].toUpperCase() : 'ABEV3';

    const workbook = XLSX.readFile(nomeArquivoExcel);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const sheetAsArray: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const headerRowIndex = sheetAsArray.findIndex(row => 
        row.some(cell => String(cell).toLowerCase().includes('ticker'))
    );
    if (headerRowIndex === -1) return;

    const headerOriginal = sheetAsArray[headerRowIndex].map(h => String(h || '').trim());
    const dataRows = sheetAsArray.slice(headerRowIndex + 1);
    const valoresParaInserir: any[][] = [];

    for (const row of dataRows) {
        const rowObj: any = {};
        headerOriginal.forEach((name, idx) => { if (name) rowObj[name] = row[idx]; });

        const getVal = (key: string) => {
            const nomesPossiveis = COLUNAS_MAP[key];
            const encontrado = headerOriginal.find(col => 
                nomesPossiveis.some(p => col.toLowerCase() === p.toLowerCase() || col.toLowerCase().includes(p.toLowerCase()))
            );
            return encontrado ? rowObj[encontrado] : undefined;
        };

        const ticker = String(getVal('ticker') || '').trim();
        if (ticker.length < 5 || ticker.toUpperCase() === 'TICKER') continue;

        // APLICAÇÃO DOS DIVISORES
        const strike = cleanAndParseNumber(getVal('strike')) / DIVISOR_STRIKE;
        const premio = cleanAndParseNumber(getVal('premioPct')) / DIVISOR_PREMIO; // AGORA CORRIGIDO
        const vol    = cleanAndParseNumber(getVal('volImplicita')) / DIVISOR_VOL;

        // PREMISSA: Excluir se qualquer valor fundamental for zero
        if (strike <= 0 || premio <= 0 || vol <= 0) continue;

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
            Number((cleanAndParseNumber(getVal('delta')) / DIVISOR_GREGAS).toFixed(4)),
            Number((cleanAndParseNumber(getVal('gamma')) / DIVISOR_GREGAS).toFixed(4)),
            Number((cleanAndParseNumber(getVal('theta')) / DIVISOR_GREGAS).toFixed(4)),
            Number((cleanAndParseNumber(getVal('vega')) / DIVISOR_GREGAS).toFixed(4)),
            new Date()
        ]);
    }

    if (valoresParaInserir.length === 0) return;

    const sql = `
        INSERT INTO opcoes 
        (idAcao, ticker, vencimento, diasUteis, tipo, strike, premioPct, volImplicita, delta, gamma, theta, vega, dataHora)
        VALUES ? 
        ON DUPLICATE KEY UPDATE 
        strike=VALUES(strike), premioPct=VALUES(premioPct), volImplicita=VALUES(volImplicita), 
        delta=VALUES(delta), gamma=VALUES(gamma), theta=VALUES(theta), vega=VALUES(vega), dataHora=VALUES(dataHora)
    `;

    try {
        await pool.query(sql, [valoresParaInserir]);
        console.log(`[MYSQL] ✅ TUDO CORRIGIDO! ${valoresParaInserir.length} registros para ${ativoBase}.`);
    } catch (error: any) {
        console.error(`[MYSQL ERROR]: ${error.message}`);
    }
}