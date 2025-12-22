// Substituição: usar require() para compatibilidade com Node (CommonJS)
declare var require: any;
const fs: any = require('fs');
const path: any = require('path');
const XLSX: any = require('xlsx');
const { createObjectCsvWriter }: any = require('csv-writer');

// =========================================================================
// 1. Configurações e Tipagem
// =========================================================================

type ColunasMap = { [key: string]: string[] };

// Interface para garantir a tipagem dos dados processados (melhora a segurança de tipos)
interface ProcessedOptionData {
    idAcao: string;
    ticker: string;
    vencimento: string;
    diasUteis: number;
    tipo: 'CALL' | 'PUT' | string;
    strike: number;
    premioPct: number;
    volImplicita: number;
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    dataHora: string;
    [key: string]: any; // Permite flexibilidade durante o mapeamento
}

// Dicionário de mapeamento de colunas
const COLUNAS_MAP: ColunasMap = {
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

// Colunas que serão processadas e salvas no CSV FINAL (Nomes padronizados)
const COLUNAS_FINAIS: string[] = [
    'idAcao', 'ticker', 'vencimento', 'diasUteis', 'tipo', 
    'strike', 'premioPct', 'volImplicita', 'delta', 'gamma', 
    'theta', 'vega', 'dataHora'
];

// Fatores de Correção
const FATOR_CORRECAO_ESCALA_PRECO: number = 100.0;
const FATOR_CORRECAO_ESCALA_GREGA: number = 10000.0;
const FATOR_CORRECAO_ESCALA_VI: number = 100.0;

// Caminho padrão (corrigido: barras escapadas e uso de path.resolve)
const CAMINHO_PADRAO = String.raw`C:\Users\DELL\Downloads\Opções ITUB4 - CALLs e PUTs - lista, pesquisa e cotações.xlsx`;
// ========================================================================================================================

/**
 * Tenta inferir o ticker base do nome do arquivo.
 * @param nomeArquivo Nome do arquivo.
 * @returns O ticker base encontrado ou 'BOVA11' como padrão.
 */
function extrairAtivoBase(nomeArquivo: string): string {
    try {
        const match = path.basename(nomeArquivo).match(/Opções\s+(\w+)/i);
        return match ? match[1].toUpperCase() : 'BOVA11';
    } catch (e) {
        return 'BOVA11';
    }
}

/**
 * Converte strings numéricas em formato brasileiro (ex: "1.000,50") para number (1000.50).
 * @param value O valor string a ser limpo e convertido.
 * @returns O valor numérico ou NaN se a conversão falhar.
 */
function cleanAndParseNumber(value: any): number {
    if (value === null || value === undefined || value === "") return NaN;
    try {
        const strValue = String(value).trim();
        // Remove ponto de milhar e substitui vírgula decimal por ponto
        const cleaned = strValue.replace(/\./g, '').replace(/,/g, '.');
        return parseFloat(cleaned);
    } catch {
        return NaN;
    }
}

/**
 * Formata datas do Excel (números de série ou strings) para YYYY-MM-DD.
 * @param value O valor da data lido do Excel.
 * @returns A data formatada ou uma string vazia.
 */
function formatVencimento(value: any): string {
    if (value === null || value === undefined || value === "") return '';

    try {
        let date: Date;

        if (typeof value === 'number') {
            // Se for um número de série do Excel, use a função nativa do SheetJS
            // O cast é necessário para contornar a tipagem incompleta do @types/xlsx
            date = (XLSX.utils as any).numberToDate(value);
        } else {
            // Tenta analisar a string. Assume dia/mês/ano se for necessário.
            const str = String(value).trim();
            const parts = str.split(/[\/\-]/);
            if (parts.length === 3) {
                // Tenta dia/mês/ano (dayfirst)
                date = new Date(`${parts[1]}/${parts[0]}/${parts[2]}`);
            } else {
                date = new Date(str);
            }
        }

        if (isNaN(date.getTime())) return '';
        
        // Retorna no formato YYYY-MM-DD (ISO date string)
        return date.toISOString().split('T')[0];
    } catch {
        return '';
    }
}


/**
 * Função principal que carrega, limpa e formata os dados de opções do Excel para CSV.
 * @param nomeArquivoExcel Caminho completo para o arquivo Excel de entrada.
 * @param nomeArquivoSaida Nome do arquivo CSV de saída.
 */
async function processarDadosOpcoes(nomeArquivoExcel: string, nomeArquivoSaida: string): Promise<void> {
    
    const ativoBase = extrairAtivoBase(nomeArquivoExcel);
    console.log(`Iniciando limpeza e formatação (TS - Leitura Excel). Ativo Base: ${ativoBase}`);

    if (!fs.existsSync(nomeArquivoExcel)) {
        console.error(`ERRO: Arquivo não encontrado no caminho: ${nomeArquivoExcel}`);
        console.error(`Certifique-se de que o arquivo existe e o caminho está correto.`);
        return;
    }

    let linhasValidas = 0;
    // dataExcel armazena os objetos lidos "brutos"
    let dataExcel: { [key: string]: any }[] = []; 
    let headerOriginal: string[] = [];
    
    try {
        // --- 2. LEITURA E DETECÇÃO DE DADOS (USANDO XLSX) ---
        const workbook = XLSX.readFile(nomeArquivoExcel);
        const sheetName = workbook.SheetNames[0]; 
        const worksheet = workbook.Sheets[sheetName];
        
        if (!worksheet) {
            throw new Error(`A aba '${sheetName}' não foi encontrada no arquivo Excel.`);
        }

        // Leitura da planilha como array de arrays para detectar o cabeçalho na linha 2
        const sheetAsArray: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

        if (sheetAsArray.length < 2) {
             throw new Error("O arquivo Excel tem menos de duas linhas. O cabeçalho de colunas não foi encontrado.");
        }
        
        // O cabeçalho desejado está na segunda linha lida (índice 1)
        headerOriginal = sheetAsArray[1].map(h => String(h || '').trim()).filter(h => h !== ''); // Filtra strings vazias
        
        // Mapeia os dados (a partir da linha 3 do Excel, índice 2 do array)
        dataExcel = sheetAsArray.slice(2).map(row => {
            const obj: { [key: string]: any } = {};
            row.forEach((value, index) => {
                const headerName = headerOriginal[index];
                if (headerName) {
                    obj[headerName] = value;
                }
            });
            return obj;
        });
        
    } catch (e: any) {
        console.error(`Erro ao ler ou processar o arquivo Excel: ${e.message}`);
        return;
    }

    // --- 3. Mapeamento, Limpeza e Transformação ---
    
    // Cria o mapeamento: Nome Original -> Nome Padronizado
    const colunasMapeadas: { [original: string]: string } = {};

    // Encontra o mapeamento de índices/nomes do Excel para os nomes de colunas finais
    for (const nome_final in COLUNAS_MAP) {
        const nomes_possiveis = COLUNAS_MAP[nome_final];
        for (const nome_excel of nomes_possiveis) {
            // Busca a coluna no cabeçalho original por inclusão (usando toLowerCase)
            const encontrado = headerOriginal.find(col => col.toLowerCase().includes(nome_excel.toLowerCase()));
            if (encontrado && !colunasMapeadas[encontrado]) {
                colunasMapeadas[encontrado] = nome_final;
                break;
            }
        }
    }
    
    const colunasCriticas = ['ticker', 'strike', 'premioPct'];
    if (!colunasCriticas.every(c => Object.values(colunasMapeadas).includes(c))) {
        throw new Error(`As colunas essenciais (${colunasCriticas.join(', ')}) não foram encontradas no cabeçalho mapeado. Revise o nome do cabeçalho.`);
    }

    const df_final: ProcessedOptionData[] = [];

    for (const rawRow of dataExcel) {
        let finalRow: ProcessedOptionData = { 
            'idAcao': ativoBase, 
            'ticker': '', 'vencimento': '', 'diasUteis': 0, 'tipo': '', 
            'strike': 0, 'premioPct': 0, 'volImplicita': 0, 'delta': 0, 
            'gamma': 0, 'theta': 0, 'vega': 0, 'dataHora': ''
        };
        let isValid = true;
        
        // 3.1 Renomeação e Limpeza Inicial
        for (const [originalName, newName] of Object.entries(colunasMapeadas)) {
            const value = rawRow[originalName];
            
            if (['ticker', 'tipo', 'dataHora', 'vencimento'].includes(newName)) {
                // Colunas de string
                finalRow[newName] = String(value || '').trim();
            } else {
                // Colunas numéricas (limpeza de formato BR e parsing)
                finalRow[newName] = cleanAndParseNumber(value);
            }
        }

        // 3.2. Correção de Escala (Aplicada apenas se o valor for numérico)
        
        // Preço e Strike
        if (finalRow['strike'] && !isNaN(finalRow['strike'])) {
            finalRow['strike'] = Number((finalRow['strike'] / FATOR_CORRECAO_ESCALA_PRECO).toFixed(4));
        }
        if (finalRow['premioPct'] && !isNaN(finalRow['premioPct'])) {
            finalRow['premioPct'] = Number((finalRow['premioPct'] / FATOR_CORRECAO_ESCALA_PRECO).toFixed(4));
        }
        
        // Gregas
        for (const col of ['volImplicita', 'delta', 'gamma', 'theta', 'vega']) {
            if (finalRow[col] !== undefined && !isNaN(finalRow[col])) {
                // Fator de correção adaptado
                const fator = (col === 'volImplicita') ? FATOR_CORRECAO_ESCALA_VI : FATOR_CORRECAO_ESCALA_GREGA;
                let valor = finalRow[col];

                if (col !== 'theta') {
                    // Delta, Gamma, Vega geralmente são positivos nos modelos
                    valor = Math.abs(valor); 
                }
                
                finalRow[col] = Number((valor / fator).toFixed(4));
            }
        }

        // 3.3. Formatação Final das Colunas não Numéricas
        if (finalRow['vencimento']) {
            finalRow['vencimento'] = formatVencimento(finalRow['vencimento']);
        }
            
        if (finalRow['tipo']) {
            let tipo = String(finalRow['tipo']).toUpperCase().trim()[0];
            // Mapeamento de 'C' ou 'E' (CALL) e 'P' ou 'A' (PUT) - se for o caso
            const mapeamentoTipo: { [key: string]: 'CALL' | 'PUT' } = { 'C': 'CALL', 'P': 'PUT', 'E': 'CALL', 'A': 'PUT' };
            finalRow['tipo'] = mapeamentoTipo[tipo] || tipo;
        }

        // 3.4. Substitui NaN (falhas de conversão) por 0.0
        for (const key of COLUNAS_FINAIS) {
            // Assegura que colunas numéricas tenham 0.0 se for NaN
            if (typeof finalRow[key] === 'number' && isNaN(finalRow[key])) {
                finalRow[key] = 0.0;
            }
        } 

        // --- FILTRO DE QUALIDADE FINAL ---
        if (!(
            String(finalRow['ticker'] || '').length > 5 &&
            (finalRow['strike'] > 0.0) &&
            (finalRow['premioPct'] > 0.0) &&
            (Math.abs(finalRow['delta'] || 0) > 0.0) // Garante que não é uma linha vazia (Delta > 0)
        )) {
            isValid = false;
        }
        
        if (isValid) {
            // Filtra o objeto para conter apenas as colunas finais
            const outputRow: ProcessedOptionData = {} as ProcessedOptionData;
            for (const col of COLUNAS_FINAIS) {
                if (finalRow[col] !== undefined) {
                    outputRow[col] = finalRow[col];
                }
            }
            df_final.push(outputRow);
            linhasValidas++;
        }
    }
    
    // --- 4. Salvar no CSV ---
    const colunasParaSalvar = COLUNAS_FINAIS.filter(c => df_final.some(row => row[c] !== undefined));
    
    // Configuração do CSV Writer (removida tipagem CsvWriter inexistente)
    const csvWriter = createObjectCsvWriter({
        path: nomeArquivoSaida,
        header: colunasParaSalvar.map(name => ({ id: name, title: name })),
    });

    try {
        await csvWriter.writeRecords(df_final);
    } catch (err: any) {
        console.error("Erro ao gravar o arquivo CSV:", err && err.message ? err.message : err);
        throw err;
    }

    console.log("===================================================================");
    console.log(`SUCESSO! CSV limpo e formatado gerado: ${nomeArquivoSaida}`);
    console.log(`Linhas válidas salvas: ${linhasValidas} de ${dataExcel.length} lidas.`);
    console.log(`Colunas salvas: ${colunasParaSalvar.join(', ')}`);
    console.log(`Primeiras 5 linhas do DataFrame FINAL (Apenas Log):`);
    df_final.slice(0, 5).forEach(row => console.log(JSON.stringify(row)));
    console.log("===================================================================");

}


/**
 * Função principal para lidar com argumentos de linha de comando.
 */
function main() {
    const args = process.argv.slice(2);
    let inputPath = CAMINHO_PADRAO;
    let outputPath = 'opcoes_final_tratado.csv';

    // Simples processamento de argumentos
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--input' && args[i+1]) {
            inputPath = args[i+1];
            i++;
        } else if (args[i] === '--output' && args[i+1]) {
            outputPath = args[i+1];
            i++;
        }
    }
    
    if (args.length === 0) {
        console.log(`Usando caminho padrão de entrada: ${CAMINHO_PADRAO}`);
    }

    // Chama a função principal de processamento
    processarDadosOpcoes(inputPath, outputPath).catch(err => {
        console.error("Um erro fatal ocorreu durante a execução:", err);
        if (err.message) {
             // Tratamento de erro mais robusto para a ausência de arquivo
            if (err.message.includes("File not found") || err.message.includes("no such file")) {
                console.error("DICA: Verifique se o caminho do arquivo Excel está correto.");
            } else if (err.message.includes("colunas essenciais")) {
                console.error("DICA: Os nomes das colunas 'ticker', 'strike' ou 'premioPct' não foram encontrados. Verifique se o nome está mapeado corretamente no COLUNAS_MAP.");
            }
        }
    });
}

// Execução do script
main();