const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createObjectCsvWriter } = require('csv-writer');

// =========================================================================
// 1. Configurações
// =========================================================================

const COLUNAS_MAP = {
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
    'dataHora': ['Data/Hora'],
};

const COLUNAS_FINAIS = [
    'idAcao', 'ticker', 'vencimento', 'diasUteis', 'tipo', 
    'strike', 'premioPct', 'volImplicita', 'delta', 'gamma', 
    'theta', 'vega', 'dataHora'
];

const FATOR_CORRECAO_ESCALA_PRECO = 100.0;
const FATOR_CORRECAO_ESCALA_GREGA = 10000.0;
const FATOR_CORRECAO_ESCALA_VI = 100.0;

const CAMINHO_PADRAO = String.raw`C:\Users\DELL\Downloads\Opções BOVA11 - CALLs e PUTs - lista, pesquisa e cotações.xlsx`;

// =========================================================================
// Funções Auxiliares
// =========================================================================

function extrairAtivoBase(nomeArquivo) {
    try {
        const match = path.basename(nomeArquivo).match(/Opções\s+(\w+)/i);
        return match ? match[1].toUpperCase() : 'BOVA11';
    } catch (e) {
        return 'BOVA11';
    }
}

function cleanAndParseNumber(value) {
    if (value === null || value === undefined || value === "") return NaN;
    try {
        const strValue = String(value).trim();
        const cleaned = strValue.replace(/\./g, '').replace(/,/g, '.');
        return parseFloat(cleaned);
    } catch {
        return NaN;
    }
}

function formatVencimento(value) {
    // Fallback absoluto para evitar strings vazias ou nulas
    if (value === null || value === undefined || String(value).trim() === "") {
        return '2099-12-31';
    }

    try {
        let date;
        if (typeof value === 'number') {
            date = new Date(XLSX.SSF.parse_date_code(value));
        } else {
            const str = String(value).trim();
            const parts = str.split(/[\/\-]/);
            if (parts.length === 3) {
                date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            } else {
                date = new Date(str);
            }
        }

        if (isNaN(date.getTime())) return '2099-12-31';
        return date.toISOString().split('T')[0];
    } catch {
        return '2099-12-31';
    }
}

// =========================================================================
// Processamento Principal
// =========================================================================

async function processarDadosOpcoes(nomeArquivoExcel, nomeArquivoSaida) {
    const ativoBase = extrairAtivoBase(nomeArquivoExcel);
    console.log(`[INÍCIO] Ativo Base: ${ativoBase}`);

    if (!fs.existsSync(nomeArquivoExcel)) {
        console.error(`ERRO: Arquivo não encontrado: ${nomeArquivoExcel}`);
        return;
    }

    const workbook = XLSX.readFile(nomeArquivoExcel);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const sheetAsArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

    const headerOriginal = sheetAsArray[1].map(h => String(h || '').trim());
    const colunasMapeadas = {};

    for (const nome_final in COLUNAS_MAP) {
        for (const nome_excel of COLUNAS_MAP[nome_final]) {
            const encontrado = headerOriginal.find(col => col.toLowerCase().includes(nome_excel.toLowerCase()));
            if (encontrado && !colunasMapeadas[encontrado]) {
                colunasMapeadas[encontrado] = nome_final;
            }
        }
    }

    const df_final = sheetAsArray.slice(2).map(row => {
        let finalRow = { idAcao: ativoBase };
        row.forEach((value, index) => {
            const originalName = headerOriginal[index];
            const newName = colunasMapeadas[originalName];
            if (newName) {
                finalRow[newName] = ['ticker', 'tipo', 'dataHora', 'vencimento'].includes(newName) 
                    ? String(value || '').trim() 
                    : cleanAndParseNumber(value);
            }
        });

        if (!isNaN(finalRow.strike)) finalRow.strike = Number((finalRow.strike / FATOR_CORRECAO_ESCALA_PRECO).toFixed(4));
        if (!isNaN(finalRow.premioPct)) finalRow.premioPct = Number((finalRow.premioPct / FATOR_CORRECAO_ESCALA_PRECO).toFixed(4));
        
        finalRow.vencimento = formatVencimento(finalRow.vencimento);
        
        return finalRow;
    }).filter(row => row.ticker && row.strike > 0);

    // Tentativa de escrita com fallback de caminho
    try {
        const csvWriter = createObjectCsvWriter({
            path: nomeArquivoSaida,
            header: COLUNAS_FINAIS.map(name => ({ id: name, title: name })),
        });
        await csvWriter.writeRecords(df_final);
        console.log(`[SUCESSO] Arquivo gerado: ${nomeArquivoSaida}`);
    } catch (err) {
        console.error(`[ERRO] Falha ao gravar em ${nomeArquivoSaida}. Tentando salvar localmente...`);
        const fallbackPath = path.join(process.cwd(), 'fallback_opcoes.csv');
        const csvWriter = createObjectCsvWriter({ path: fallbackPath, header: COLUNAS_FINAIS.map(name => ({ id: name, title: name })) });
        await csvWriter.writeRecords(df_final);
        console.log(`[AVISO] Arquivo salvo como fallback em: ${fallbackPath}`);
    }
}

// Execução
const args = process.argv.slice(2);
const input = args.find((_, i) => args[i-1] === '--input') || CAMINHO_PADRAO;
const output = args.find((_, i) => args[i-1] === '--output') || 'opcoes_final_tratado.csv';

processarDadosOpcoes(input, output).catch(console.error);