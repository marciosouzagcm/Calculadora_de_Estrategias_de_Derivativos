import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { OptionLeg } from '../interfaces/Types.js';

/**
 * Utilitário para leitura e conversão de arquivos CSV para o formato OptionLeg.
 * BOARDPRO V40.0 - CSV Engine
 */
export class CSVReader {
    public static readOptionsCSV(filePath: string): OptionLeg[] {
        try {
            if (!fs.existsSync(filePath)) {
                console.error(`[CSV READER] Arquivo não encontrado: ${filePath}`);
                return [];
            }

            const fileContent = fs.readFileSync(filePath, 'utf-8');
            
            // O parser está configurado para ler o cabeçalho e ignorar linhas vazias
            const records: any[] = parse(fileContent, {
                columns: true,
                skip_empty_lines: true,
                delimiter: ';', 
                trim: true,
                cast: false
            });

            // Filtramos aqui para garantir que o cabeçalho ou linhas sem Ticker não virem dados
            return records
                .filter(row => {
                    const ticker = row.ticker || row.Ticker;
                    return ticker && ticker.trim() !== '' && ticker.toLowerCase() !== 'ticker';
                })
                .map((row: any) => {
                    // Sanitização de data
                    const rawVencimento = (row.vencimento || row.Vencimento || '').trim();
                    let vencimentoFormatado = '2099-12-31';

                    if (rawVencimento !== '' && rawVencimento !== '2099-12-31') {
                        if (rawVencimento.includes('/')) {
                            const [d, m, y] = rawVencimento.split('/');
                            vencimentoFormatado = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                        } else {
                            vencimentoFormatado = rawVencimento;
                        }
                    }

                    return {
                        ativo_subjacente: row.ativo_subjacente || row.Ativo || '',
                        option_ticker: row.option_ticker || row.Ticker || '',
                        vencimento: vencimentoFormatado,
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
                    };
                });

        } catch (error: any) {
            console.error(`[CSV READER ERROR] Falha ao processar CSV: ${error.message}`);
            return [];
        }
    }
}