// src/services/csvReader.ts (CÓDIGO FINAL CORRIGIDO PARA VALORES EM R$)

import * as fs from 'fs';
import * as path from 'path';
// ✅ CORREÇÃO: Usando o caminho relativo CORRETO para Types.ts (dentro de src/interfaces)
import { OptionLeg, Greeks } from '../interfaces/Types'; 

// Define a estrutura das colunas do seu CSV
interface CsvRow {
    idAcao: string;
    ticker: string;
    vencimento: string;
    diasUteis: string;
    tipo: 'CALL' | 'PUT';
    strike: string;
    premioPct: string;
    volImplicita: string;
    delta: string;
    gamma: string;
    theta: string;
    vega: string;
    dataHora: string;
}

/**
 * Auxiliar: Converte string numérica do formato Pt-BR (vírgula) para float.
 * Mantém esta função para garantir a leitura correta de números decimais.
 */
const parsePtBrFloat = (str: string): number => {
    // 1. Substitui vírgula por ponto. 2. Tenta fazer o parsing.
    const value = parseFloat(str.replace(',', '.'));
    return isNaN(value) ? 0 : value;
};


/**
 * Lê um arquivo CSV de opções e mapeia os dados para a interface OptionLeg.
 */
export async function readOptionsDataFromCSV(filePath: string, currentAssetPrice: number): Promise<OptionLeg[]> {
    const fullPath = path.resolve(filePath);
    
    if (!fs.existsSync(fullPath)) {
        throw new Error(`Arquivo não encontrado: ${fullPath}. Verifique o caminho e a existência do arquivo.`);
    }

    const csvContent = fs.readFileSync(fullPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    // Ignora a primeira linha (cabeçalho)
    const dataLines = lines.slice(1);
    
    // ❌ CORREÇÃO CRÍTICA: O delimitador no CSV da amostra é a VÍRGULA (,) no cabeçalho.
    // O código anterior usava ponto e vírgula (;). Ajustamos para vírgula.
    const DELIMITER = ','; 
    
    const optionsData: (OptionLeg | null)[] = dataLines.map((line) => {
        const columns = line.split(DELIMITER); 
        
        // Se o seu CSV usa PONTO E VÍRGULA, troque a linha acima por: line.split(';');
        
        if (columns.length < 13) {
            return null; 
        }

        const row: CsvRow = {
            idAcao: columns[0].trim(), 
            ticker: columns[1].trim(),
            vencimento: columns[2].trim(),
            diasUteis: columns[3].trim(),
            tipo: columns[4].trim() as 'CALL' | 'PUT',
            strike: columns[5].trim(),
            premioPct: columns[6].trim(), 
            volImplicita: columns[7].trim(),
            delta: columns[8].trim(),
            gamma: columns[9].trim(),
            theta: columns[10].trim(),
            vega: columns[11].trim(),
            dataHora: columns[12].trim(),
        };
        
        // Conversão de tipos
        // ✅ CORREÇÃO CRÍTICA 1: Multiplica o Strike por 1000 para corrigir a escala (e.g., 0.0192 -> 19.20)
        const strikeValue = parsePtBrFloat(row.strike) * 1000; 
        
        // ✅ CORREÇÃO CRÍTICA 2: Multiplica o Prêmio por 1 para garantir que ele é um float válido.
        // Se a coluna premioPct estiver em outra escala, ajuste a multiplicação aqui.
        const premioValue = parsePtBrFloat(row.premioPct); 
        
        const diasUteisValue = parseInt(row.diasUteis.trim());
        
        const greeks: Greeks = {
            delta: parsePtBrFloat(row.delta),
            gamma: parsePtBrFloat(row.gamma),
            theta: parsePtBrFloat(row.theta),
            vega: parsePtBrFloat(row.vega),
        };

        // --- VERIFICAÇÃO CRÍTICA ---
        // Agora o strikeValue deve ser > 0 após a correção de escala.
        if (strikeValue <= 0 || premioValue <= 0 || isNaN(diasUteisValue) || diasUteisValue < 0) {
            return null;
        }

        return {
            // ✅ CORREÇÃO CRÍTICA 3: Converte para MAIÚSCULAS para garantir que o filtro no index.ts funcione.
            ativo_subjacente: row.idAcao.toUpperCase(), 
            tipo: row.tipo,
            strike: strikeValue, 
            premio: premioValue, 
            vencimento: row.vencimento,
            dias_uteis: diasUteisValue,
            gregas_unitarias: greeks,
            option_ticker: row.ticker,
            multiplicador_contrato: 100, 
            vol_implicita: parsePtBrFloat(row.volImplicita),
        } as OptionLeg;
    });

    // Filtra e retorna apenas os dados válidos
    return optionsData.filter((data): data is OptionLeg => data !== null);
}