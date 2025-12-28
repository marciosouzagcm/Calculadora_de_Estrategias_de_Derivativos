import * as path from 'path';
import * as XLSX from 'xlsx';
import { pool } from '../config/database';

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

function formatVencimento(value: any): string {
    if (!value) return '';
    try {
        let date: Date;
        if (typeof value === 'number') {
            date = new Date(Math.round((value - 25569) * 86400 * 1000));
        } else {
            const str = String(value).trim();
            const parts = str.split(/[\/\-]/);
            date = parts.length === 3 ? new Date(`${parts[2]}-${parts[1]}-${parts[0]}`) : new Date(str);
        }
        return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
    } catch { return ''; }
}

export async function processarDadosOpcoes(nomeArquivoExcel: string): Promise<void> {
    const nomeBase = path.basename(nomeArquivoExcel);
    const match = nomeBase.match(/Opções\s+(\w+)/i);
    const ativoBase = match ? match[1].toUpperCase() : 'BBAS3';

    const workbook = XLSX.readFile(nomeArquivoExcel);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const sheetAsArray: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

    if (sheetAsArray.length < 2) return;

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

        // --- CORREÇÃO DO STRIKE (Multiplicando por 10 para ajustar a escala de 2.07 para 20.70) ---
        let strike = cleanAndParseNumber(getVal('strike'));
        if (strike < 10) strike = strike * 10; // Ajuste dinâmico de escala

        const premio = cleanAndParseNumber(getVal('premioPct')) / FATOR_CORRECAO_ESCALA_PRECO;
        const vol = cleanAndParseNumber(getVal('volImplicita')) / FATOR_CORRECAO_ESCALA_VI;

        // --- REGRA DE DESCARTE: Se Prêmio ou Strike ou Vol forem 0, ignora a linha ---
        if (premio === 0 || strike === 0 || vol === 0) {
            continue; 
        }

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

    if (valoresParaInserir.length === 0) return;

    const sql = `
        INSERT INTO opcoes 
        (idAcao, ticker, vencimento, diasUteis, tipo, strike, premioPct, volImplicita, delta, gamma, theta, vega, dataHora)
        VALUES ? 
        ON DUPLICATE KEY UPDATE 
        strike=VALUES(strike), premioPct=VALUES(premioPct), volImplicita=VALUES(volImplicita), dataHora=VALUES(dataHora)
    `;

    try {
        await pool.query(sql, [valoresParaInserir]);
        console.log(`[MYSQL] ✅ SUCESSO! ${valoresParaInserir.length} registros válidos inseridos (Zeros descartados).`);
    } catch (error: any) {
        console.error(`[MYSQL ERROR]: ${error.message}`);
    }
}