// src/services/csvReader.ts

import * as fs from 'fs';
import * as path from 'path';
// Assumindo que suas interfaces estão em '../interfaces/Types'
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
    
    // O retorno do map será um array de OptionLeg ou null
    const optionsData: (OptionLeg | null)[] = dataLines.map((line) => {
        const columns = line.split(',');
        
        if (columns.length < 12) {
            return null; 
        }

        const row: CsvRow = {
            idAcao: columns[0],
            ticker: columns[1],
            vencimento: columns[2],
            diasUteis: columns[3],
            tipo: columns[4] as 'CALL' | 'PUT',
            strike: columns[5],
            premioPct: columns[6],
            volImplicita: columns[7],
            delta: columns[8],
            gamma: columns[9],
            theta: columns[10],
            vega: columns[11],
            dataHora: columns[12],
        };
        
        // Conversão de tipos e tratamento de NaN
        const strikeValue = parseFloat(row.strike);
        const premioPctValue = parseFloat(row.premioPct);
        const diasUteisValue = parseInt(row.diasUteis);

        const premioReal = (premioPctValue / 100) * currentAssetPrice; 
        
        const greeks: Greeks = {
            delta: parseFloat(row.delta),
            gamma: parseFloat(row.gamma),
            theta: parseFloat(row.theta),
            vega: parseFloat(row.vega),
        };

        // --- VERIFICAÇÃO CRÍTICA (Novo) ---
        // Retorna null se valores críticos (strike, premio, dias_uteis) forem inválidos.
        if (isNaN(strikeValue) || isNaN(premioReal) || isNaN(diasUteisValue) || premioReal <= 0) {
            return null;
        }

        return {
            ativo_subjacente: row.idAcao,
            tipo: row.tipo,
            strike: strikeValue,
            premio: premioReal,
            vencimento: row.vencimento,
            dias_uteis: diasUteisValue,
            gregas_unitarias: greeks,
            option_ticker: row.ticker,
            multiplicador_contrato: 1, 
            vol_implicita: parseFloat(row.volImplicita),
        } as OptionLeg;
    });

    // --- FILTRAGEM CORRIGIDA (Linha 95 no seu erro) ---
    // Remove todos os valores 'null' com segurança, garantindo que o array de saída seja OptionLeg[].
    // A verificação é simples e não precisa mais checar NaN, pois já foi feita dentro do map.
    return optionsData.filter((data): data is OptionLeg => data !== null);
}