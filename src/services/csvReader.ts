// src/services/csvReader.ts

import * as fs from 'fs';
import * as path from 'path';
import { OptionLeg, Greeks } from '../interfaces/Types'; 

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

const parsePtBrFloat = (str: string): number => {
    if (!str) return 0;
    // Remove espaços e substitui vírgula por ponto para o parseFloat padrão
    const cleanStr = str.trim().replace(',', '.');
    const value = parseFloat(cleanStr);
    return isNaN(value) ? 0 : value;
};

export async function readOptionsDataFromCSV(filePath: string, currentAssetPrice: number): Promise<OptionLeg[]> {
    const fullPath = path.resolve(filePath);
    
    if (!fs.existsSync(fullPath)) {
        throw new Error(`Arquivo não encontrado: ${fullPath}`);
    }

    const csvContent = fs.readFileSync(fullPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    const dataLines = lines.slice(1);
    
    // Detecta o delimitador (comum em CSVs brasileiros ser ';' ou ',')
    const firstLine = dataLines[0] || "";
    const DELIMITER = firstLine.includes(';') ? ';' : ','; 
    
    const optionsData: (OptionLeg | null)[] = dataLines.map((line) => {
        const columns = line.split(DELIMITER); 
        if (columns.length < 12) return null; 

        const row: CsvRow = {
            idAcao: columns[0]?.trim(), 
            ticker: columns[1]?.trim(),
            vencimento: columns[2]?.trim(),
            diasUteis: columns[3]?.trim(),
            tipo: columns[4]?.trim().toUpperCase() as 'CALL' | 'PUT',
            strike: columns[5]?.trim(),
            premioPct: columns[6]?.trim(), 
            volImplicita: columns[7]?.trim(),
            delta: columns[8]?.trim(),
            gamma: columns[9]?.trim(),
            theta: columns[10]?.trim(),
            vega: columns[11]?.trim(),
            dataHora: columns[12]?.trim() || '',
        };
        
        let strikeValue = parsePtBrFloat(row.strike);
        
        // --- NORMALIZAÇÃO DE ESCALA DO STRIKE ---
        if (strikeValue > 0 && currentAssetPrice > 0) {
            while (strikeValue < (currentAssetPrice / 5)) {
                strikeValue *= 10;
            }
        }

        const premioValue = parsePtBrFloat(row.premioPct); 
        const diasUteisValue = parseInt(row.diasUteis.replace(/\D/g, '')); // Garante apenas números
        const volValue = parsePtBrFloat(row.volImplicita);

        // Mapeia as gregas do CSV
        const greeks: Greeks = {
            delta: parsePtBrFloat(row.delta),
            gamma: parsePtBrFloat(row.gamma),
            theta: parsePtBrFloat(row.theta),
            vega: parsePtBrFloat(row.vega),
        };

        // Filtro de sanidade: remove linhas com dados essenciais corrompidos
        if (strikeValue <= 0 || premioValue <= 0 || isNaN(diasUteisValue)) {
            return null;
        }

        return {
            ativo_subjacente: row.idAcao.toUpperCase(), 
            tipo: row.tipo,
            strike: strikeValue, 
            premio: premioValue, 
            vencimento: row.vencimento,
            dias_uteis: diasUteisValue,
            gregas_unitarias: greeks, // Se vier 0, o PayoffCalculator recalculada usando Black-Scholes
            option_ticker: row.ticker,
            multiplicador_contrato: 100, 
            vol_implicita: volValue > 0 ? volValue : 0.35, // Se a vol for 0 no CSV, assume 35% para as gregas existirem
        } as OptionLeg;
    });

    return optionsData.filter((data): data is OptionLeg => data !== null);
}