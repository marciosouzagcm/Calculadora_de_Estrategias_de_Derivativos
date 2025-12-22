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
    const value = parseFloat(str.replace(',', '.'));
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
    const DELIMITER = ','; 
    
    const optionsData: (OptionLeg | null)[] = dataLines.map((line) => {
        const columns = line.split(DELIMITER); 
        if (columns.length < 12) return null; 

        const row: CsvRow = {
            idAcao: columns[0]?.trim(), 
            ticker: columns[1]?.trim(),
            vencimento: columns[2]?.trim(),
            diasUteis: columns[3]?.trim(),
            tipo: columns[4]?.trim() as 'CALL' | 'PUT',
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
        
        // --- NOVA LÓGICA DE NORMALIZAÇÃO DE ESCALA ---
        // Se o strike for muito menor que o preço do ativo, ajustamos a escala.
        // Exemplo BBAS3: Spot 21.42 e Strike 2.05 -> Multiplica por 10 para virar 20.50
        // Exemplo CSAN3: Spot 5.27 e Strike 0.05 -> Multiplica por 100 para virar 5.00
        
        if (strikeValue > 0) {
            // Enquanto o strike for menos que 1/5 do preço do ativo, sobe uma casa decimal
            // Isso resolve tanto o caso de 10x quanto o de 100x automaticamente
            while (strikeValue < (currentAssetPrice / 5)) {
                strikeValue *= 10;
            }
        }

        const premioValue = parsePtBrFloat(row.premioPct); 
        const diasUteisValue = parseInt(row.diasUteis.trim());
        
        const greeks: Greeks = {
            delta: parsePtBrFloat(row.delta),
            gamma: parsePtBrFloat(row.gamma),
            theta: parsePtBrFloat(row.theta),
            vega: parsePtBrFloat(row.vega),
        };

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
            gregas_unitarias: greeks,
            option_ticker: row.ticker,
            multiplicador_contrato: 100, 
            vol_implicita: parsePtBrFloat(row.volImplicita),
        } as OptionLeg;
    });

    return optionsData.filter((data): data is OptionLeg => data !== null);
}