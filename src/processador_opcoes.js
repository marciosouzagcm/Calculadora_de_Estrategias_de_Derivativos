"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var csv_writer_1 = require("csv-writer");
var fs = require("fs");
var path = require("path");
var XLSX = require("xlsx");
// Dicionário de mapeamento de colunas
var COLUNAS_MAP = {
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
var COLUNAS_FINAIS = [
    'idAcao', 'ticker', 'vencimento', 'diasUteis', 'tipo',
    'strike', 'premioPct', 'volImplicita', 'delta', 'gamma',
    'theta', 'vega', 'dataHora'
];
// Fatores de Correção
var FATOR_CORRECAO_ESCALA_PRECO = 100.0;
var FATOR_CORRECAO_ESCALA_GREGA = 10000.0;
var FATOR_CORRECAO_ESCALA_VI = 100.0;
// Caminho padrão (corrigido: barras escapadas e uso de path.resolve)
var CAMINHO_PADRAO = path.resolve('C:\\Users\\DELL\\Downloads\\Opções BOVA11 - CALLs e PUTs - lista, pesquisa e cotações (6).xlsx');
// =========================================================================
/**
 * Tenta inferir o ticker base do nome do arquivo.
 * @param nomeArquivo Nome do arquivo.
 * @returns O ticker base encontrado ou 'BOVA11' como padrão.
 */
function extrairAtivoBase(nomeArquivo) {
    try {
        var match = path.basename(nomeArquivo).match(/Opções\s+(\w+)/i);
        return match ? match[1].toUpperCase() : 'BOVA11';
    }
    catch (e) {
        return 'BOVA11';
    }
}
/**
 * Converte strings numéricas em formato brasileiro (ex: "1.000,50") para number (1000.50).
 * @param value O valor string a ser limpo e convertido.
 * @returns O valor numérico ou NaN se a conversão falhar.
 */
function cleanAndParseNumber(value) {
    if (value === null || value === undefined || value === "")
        return NaN;
    try {
        var strValue = String(value).trim();
        // Remove ponto de milhar e substitui vírgula decimal por ponto
        var cleaned = strValue.replace(/\./g, '').replace(/,/g, '.');
        return parseFloat(cleaned);
    }
    catch (_a) {
        return NaN;
    }
}
/**
 * Formata datas do Excel (números de série ou strings) para YYYY-MM-DD.
 * @param value O valor da data lido do Excel.
 * @returns A data formatada ou uma string vazia.
 */
function formatVencimento(value) {
    if (value === null || value === undefined || value === "")
        return '';
    try {
        var date = void 0;
        if (typeof value === 'number') {
            // Se for um número de série do Excel, use a função nativa do SheetJS
            // O cast é necessário para contornar a tipagem incompleta do @types/xlsx
            date = XLSX.utils.numberToDate(value);
        }
        else {
            // Tenta analisar a string. Assume dia/mês/ano se for necessário.
            var str = String(value).trim();
            var parts = str.split(/[\/\-]/);
            if (parts.length === 3) {
                // Tenta dia/mês/ano (dayfirst)
                date = new Date("".concat(parts[1], "/").concat(parts[0], "/").concat(parts[2]));
            }
            else {
                date = new Date(str);
            }
        }
        if (isNaN(date.getTime()))
            return '';
        // Retorna no formato YYYY-MM-DD (ISO date string)
        return date.toISOString().split('T')[0];
    }
    catch (_a) {
        return '';
    }
}
/**
 * Função principal que carrega, limpa e formata os dados de opções do Excel para CSV.
 * @param nomeArquivoExcel Caminho completo para o arquivo Excel de entrada.
 * @param nomeArquivoSaida Nome do arquivo CSV de saída.
 */
function processarDadosOpcoes(nomeArquivoExcel, nomeArquivoSaida) {
    return __awaiter(this, void 0, void 0, function () {
        var ativoBase, linhasValidas, dataExcel, headerOriginal, workbook, sheetName, worksheet, sheetAsArray, colunasMapeadas, nome_final, nomes_possiveis, _loop_1, _i, nomes_possiveis_1, nome_excel, state_1, colunasCriticas, df_final, _a, dataExcel_1, rawRow, finalRow, isValid, _b, _c, _d, originalName, newName, value, _e, _f, col, fator, valor, tipo, mapeamentoTipo, _g, COLUNAS_FINAIS_1, key, outputRow, _h, COLUNAS_FINAIS_2, col, colunasParaSalvar, csvWriter, err_1;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    ativoBase = extrairAtivoBase(nomeArquivoExcel);
                    console.log("Iniciando limpeza e formata\u00E7\u00E3o (TS - Leitura Excel). Ativo Base: ".concat(ativoBase));
                    if (!fs.existsSync(nomeArquivoExcel)) {
                        console.error("ERRO: Arquivo n\u00E3o encontrado no caminho: ".concat(nomeArquivoExcel));
                        console.error("Certifique-se de que o arquivo existe e o caminho est\u00E1 correto.");
                        return [2 /*return*/];
                    }
                    linhasValidas = 0;
                    dataExcel = [];
                    headerOriginal = [];
                    try {
                        workbook = XLSX.readFile(nomeArquivoExcel);
                        sheetName = workbook.SheetNames[0];
                        worksheet = workbook.Sheets[sheetName];
                        if (!worksheet) {
                            throw new Error("A aba '".concat(sheetName, "' n\u00E3o foi encontrada no arquivo Excel."));
                        }
                        sheetAsArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
                        if (sheetAsArray.length < 2) {
                            throw new Error("O arquivo Excel tem menos de duas linhas. O cabeçalho de colunas não foi encontrado.");
                        }
                        // O cabeçalho desejado está na segunda linha lida (índice 1)
                        headerOriginal = sheetAsArray[1].map(function (h) { return String(h || '').trim(); }).filter(function (h) { return h !== ''; }); // Filtra strings vazias
                        // Mapeia os dados (a partir da linha 3 do Excel, índice 2 do array)
                        dataExcel = sheetAsArray.slice(2).map(function (row) {
                            var obj = {};
                            row.forEach(function (value, index) {
                                var headerName = headerOriginal[index];
                                if (headerName) {
                                    obj[headerName] = value;
                                }
                            });
                            return obj;
                        });
                    }
                    catch (e) {
                        console.error("Erro ao ler ou processar o arquivo Excel: ".concat(e.message));
                        return [2 /*return*/];
                    }
                    colunasMapeadas = {};
                    // Encontra o mapeamento de índices/nomes do Excel para os nomes de colunas finais
                    for (nome_final in COLUNAS_MAP) {
                        nomes_possiveis = COLUNAS_MAP[nome_final];
                        _loop_1 = function (nome_excel) {
                            // Busca a coluna no cabeçalho original por inclusão (usando toLowerCase)
                            var encontrado = headerOriginal.find(function (col) { return col.toLowerCase().includes(nome_excel.toLowerCase()); });
                            if (encontrado && !colunasMapeadas[encontrado]) {
                                colunasMapeadas[encontrado] = nome_final;
                                return "break";
                            }
                        };
                        for (_i = 0, nomes_possiveis_1 = nomes_possiveis; _i < nomes_possiveis_1.length; _i++) {
                            nome_excel = nomes_possiveis_1[_i];
                            state_1 = _loop_1(nome_excel);
                            if (state_1 === "break")
                                break;
                        }
                    }
                    colunasCriticas = ['ticker', 'strike', 'premioPct'];
                    if (!colunasCriticas.every(function (c) { return Object.values(colunasMapeadas).includes(c); })) {
                        throw new Error("As colunas essenciais (".concat(colunasCriticas.join(', '), ") n\u00E3o foram encontradas no cabe\u00E7alho mapeado. Revise o nome do cabe\u00E7alho."));
                    }
                    df_final = [];
                    for (_a = 0, dataExcel_1 = dataExcel; _a < dataExcel_1.length; _a++) {
                        rawRow = dataExcel_1[_a];
                        finalRow = {
                            'idAcao': ativoBase,
                            'ticker': '', 'vencimento': '', 'diasUteis': 0, 'tipo': '',
                            'strike': 0, 'premioPct': 0, 'volImplicita': 0, 'delta': 0,
                            'gamma': 0, 'theta': 0, 'vega': 0, 'dataHora': ''
                        };
                        isValid = true;
                        // 3.1 Renomeação e Limpeza Inicial
                        for (_b = 0, _c = Object.entries(colunasMapeadas); _b < _c.length; _b++) {
                            _d = _c[_b], originalName = _d[0], newName = _d[1];
                            value = rawRow[originalName];
                            if (['ticker', 'tipo', 'dataHora', 'vencimento'].includes(newName)) {
                                // Colunas de string
                                finalRow[newName] = String(value || '').trim();
                            }
                            else {
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
                        for (_e = 0, _f = ['volImplicita', 'delta', 'gamma', 'theta', 'vega']; _e < _f.length; _e++) {
                            col = _f[_e];
                            if (finalRow[col] !== undefined && !isNaN(finalRow[col])) {
                                fator = (col === 'volImplicita') ? FATOR_CORRECAO_ESCALA_VI : FATOR_CORRECAO_ESCALA_GREGA;
                                valor = finalRow[col];
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
                            tipo = String(finalRow['tipo']).toUpperCase().trim()[0];
                            mapeamentoTipo = { 'C': 'CALL', 'P': 'PUT', 'E': 'CALL', 'A': 'PUT' };
                            finalRow['tipo'] = mapeamentoTipo[tipo] || tipo;
                        }
                        // 3.4. Substitui NaN (falhas de conversão) por 0.0
                        for (_g = 0, COLUNAS_FINAIS_1 = COLUNAS_FINAIS; _g < COLUNAS_FINAIS_1.length; _g++) {
                            key = COLUNAS_FINAIS_1[_g];
                            // Assegura que colunas numéricas tenham 0.0 se for NaN
                            if (typeof finalRow[key] === 'number' && isNaN(finalRow[key])) {
                                finalRow[key] = 0.0;
                            }
                        }
                        // --- FILTRO DE QUALIDADE FINAL ---
                        if (!(String(finalRow['ticker'] || '').length > 5 &&
                            (finalRow['strike'] > 0.0) &&
                            (finalRow['premioPct'] > 0.0) &&
                            (Math.abs(finalRow['delta'] || 0) > 0.0) // Garante que não é uma linha vazia (Delta > 0)
                        )) {
                            isValid = false;
                        }
                        if (isValid) {
                            outputRow = {};
                            for (_h = 0, COLUNAS_FINAIS_2 = COLUNAS_FINAIS; _h < COLUNAS_FINAIS_2.length; _h++) {
                                col = COLUNAS_FINAIS_2[_h];
                                if (finalRow[col] !== undefined) {
                                    outputRow[col] = finalRow[col];
                                }
                            }
                            df_final.push(outputRow);
                            linhasValidas++;
                        }
                    }
                    colunasParaSalvar = COLUNAS_FINAIS.filter(function (c) { return df_final.some(function (row) { return row[c] !== undefined; }); });
                    csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
                        path: nomeArquivoSaida,
                        header: colunasParaSalvar.map(function (name) { return ({ id: name, title: name }); }),
                    });
                    _j.label = 1;
                case 1:
                    _j.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, csvWriter.writeRecords(df_final)];
                case 2:
                    _j.sent();
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _j.sent();
                    console.error("Erro ao gravar o arquivo CSV:", err_1 && err_1.message ? err_1.message : err_1);
                    throw err_1;
                case 4:
                    console.log("===================================================================");
                    console.log("SUCESSO! CSV limpo e formatado gerado: ".concat(nomeArquivoSaida));
                    console.log("Linhas v\u00E1lidas salvas: ".concat(linhasValidas, " de ").concat(dataExcel.length, " lidas."));
                    console.log("Colunas salvas: ".concat(colunasParaSalvar.join(', ')));
                    console.log("Primeiras 5 linhas do DataFrame FINAL (Apenas Log):");
                    df_final.slice(0, 5).forEach(function (row) { return console.log(JSON.stringify(row)); });
                    console.log("===================================================================");
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Função principal para lidar com argumentos de linha de comando.
 */
function main() {
    var args = process.argv.slice(2);
    var inputPath = CAMINHO_PADRAO;
    var outputPath = 'opcoes_final_tratado.csv';
    // Simples processamento de argumentos
    for (var i = 0; i < args.length; i++) {
        if (args[i] === '--input' && args[i + 1]) {
            inputPath = args[i + 1];
            i++;
        }
        else if (args[i] === '--output' && args[i + 1]) {
            outputPath = args[i + 1];
            i++;
        }
    }
    if (args.length === 0) {
        console.log("Usando caminho padr\u00E3o de entrada: ".concat(CAMINHO_PADRAO));
    }
    // Chama a função principal de processamento
    processarDadosOpcoes(inputPath, outputPath).catch(function (err) {
        console.error("Um erro fatal ocorreu durante a execução:", err);
        if (err.message) {
            // Tratamento de erro mais robusto para a ausência de arquivo
            if (err.message.includes("File not found") || err.message.includes("no such file")) {
                console.error("DICA: Verifique se o caminho do arquivo Excel está correto.");
            }
            else if (err.message.includes("colunas essenciais")) {
                console.error("DICA: Os nomes das colunas 'ticker', 'strike' ou 'premioPct' não foram encontrados. Verifique se o nome está mapeado corretamente no COLUNAS_MAP.");
            }
        }
    });
}
// Execução do script
main();
