import { Request, Response } from 'express';

/** * CORREÇÃO CRÍTICA (NodeNext): 
 * 1. O caminho aponta para fora da pasta api e entra em '../src/...'
 * 2. Adição da extensão '.js' é obrigatória para evitar o erro ERR_MODULE_NOT_FOUND
 * no ambiente de produção (Render/Vercel) usando ESM.
 */
import { pool } from '../src/config/database.js'; 
import { OptionLeg } from '../src/interfaces/Types.js';

export const getOptions = async (req: Request, res: Response) => {
    try {
        // 1. Busca os dados brutos do MySQL usando o pool exportado
        const [rows]: any = await pool.query('SELECT * FROM opcoes');

        // Se não houver dados, retorna array vazio para evitar erro no map
        if (!rows) return res.status(200).json([]);

        // 2. Mapeia e Normaliza os dados
        const normalizedData: OptionLeg[] = rows.map((row: any) => {
            // Remove o prefixo numérico do ticker (ex: "1BOVA11" -> "BOVA11")
            const ativoSubjacente = (row.ativo_subjacente || row.idAcao || '').replace(/^\d+/, '');
            
            let strike = parseFloat(row.strike || 0);
            
            // Corrige a escala do BOVA11 se necessário
            if (ativoSubjacente === 'BOVA11' && strike < 100) {
                strike = strike * 10;
            }

            return {
                id: row.id,
                option_ticker: row.ticker || row.option_ticker,
                ativo_subjacente: ativoSubjacente,
                tipo: (row.tipo || '').toUpperCase(),
                strike: strike,
                premio: parseFloat(row.premioPct || row.premio || 0),
                vencimento: row.vencimento,
                dias_uteis: Number(row.diasUteis || 0),
                vol_implicita: Number(row.volImplicita || 0),
                // Mapeamento das Gregas
                gregas_unitarias: {
                    delta: parseFloat(row.delta || 0),
                    gamma: parseFloat(row.gamma || 0),
                    theta: parseFloat(row.theta || 0),
                    vega: parseFloat(row.vega || 0)
                }
            } as OptionLeg;
        });

        // 3. Retorna os dados para o Frontend
        return res.status(200).json(normalizedData);
    } catch (error: any) {
        console.error('❌ [Controller] Erro ao buscar opções:', error.message);
        return res.status(500).json({ 
            status: "error",
            message: 'Erro interno no servidor ao processar opções' 
        });
    }
};