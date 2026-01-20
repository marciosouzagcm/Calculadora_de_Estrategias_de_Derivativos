import fs from 'fs';
/**
 * Em sistemas NodeNext/ESM, a importação de submódulos sync pode ser problemática.
 * Usamos a importação do pacote principal ou o caminho direto compatível.
 */
import { parse } from 'csv-parse/sync';
import { OptionLeg } from '../interfaces/Types.js';

/**
 * Utilitário para leitura e conversão de arquivos CSV para o formato OptionLeg.
 * BOARDPRO V40.0 - CSV Engine
 */
export class CSVReader {
    /**
     * Lê um arquivo CSV e converte em um array de OptionLeg.
     * @param filePath Caminho completo do arquivo
     */
    public static readOptionsCSV(filePath: string): OptionLeg[] {
        try {
            // Verifica se o arquivo existe antes de tentar ler (evita crash em serverless)
            if (!fs.existsSync(filePath)) {
                console.error(`[CSV READER] Arquivo não encontrado: ${filePath}`);
                return [];
            }

            const fileContent = fs.readFileSync(filePath, 'utf-8');
            
            // O parser 'sync' é ideal para scripts de processamento de carga
            const records: any[] = parse(fileContent, {
                columns: true,
                skip_empty_lines: true,
                delimiter: ';', // Padrão comum em CSVs brasileiros (Excel)
                trim: true,
                cast: false // Desativamos o cast automático para tratar strings brasileiras manualmente
            });

            return records.map((row: any) => ({
                ativo_subjacente: row.ativo_subjacente || row.Ativo || '',
                option_ticker: row.option_ticker || row.Ticker || '',
                vencimento: row.vencimento || row.Vencimento || '',
                dias_uteis: parseInt(String(row.dias_uteis || row['Dias Úteis'] || 0)),
                tipo: (String(row.tipo || row.Tipo || 'CALL').toUpperCase()) as 'CALL' | 'PUT',
                strike: parseFloat(String(row.strike || row.Strike || 0).replace(',', '.')),
                premio: parseFloat(String(row.premio || row.Prêmio || 0).replace(',', '.')),
                vol_implicita: parseFloat(String(row.vol_implicita || row['Vol. Implícita'] || 0).replace(',', '.')),
                multiplicador_contrato: 100,
                gregas_unitarias: {
                    delta: parseFloat(String(row.delta || 0).replace(',', '.')),
                    gamma: parseFloat(String(row.gamma || 0).replace(',', '.')),
                    theta: parseFloat(String(row.theta || 0).replace(',', '.')),
                    vega: parseFloat(String(row.vega || 0).replace(',', '.')),
                }
            }));

        } catch (error: any) {
            console.error(`[CSV READER ERROR] Falha ao processar CSV: ${error.message}`);
            return [];
        }
    }
}