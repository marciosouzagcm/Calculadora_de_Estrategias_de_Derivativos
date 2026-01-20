import { Request, Response, Router } from 'express';

/** * CORREÇÃO CRÍTICA (NodeNext): 
 * 1. O caminho agora entra na pasta '../src/...'
 * 2. O uso de '.js' no final do import é obrigatório para ESM com NodeNext, 
 * mesmo o arquivo físico sendo '.ts'.
 */
import { pool } from '../src/config/database.js'; 
import { OptionLeg } from '../src/interfaces/Types.js';

const router = Router();

/**
 * Rota para buscar e normalizar as opções do TiDB
 */
router.get('/opcoes', async (req: Request, res: Response) => {
    try {
        // 1. Busca os dados brutos usando o pool exportado do TiDB
        const [rows]: any = await pool.query('SELECT * FROM opcoes');

        if (!rows || rows.length === 0) {
            return res.status(200).json([]);
        }

        // 2. Mapeia e Normaliza os dados (Tratando o ID e o Strike)
        const normalizedData: OptionLeg[] = rows.map((row: any) => {
            // Remove o ID do ticker do ativo (ex: "1BOVA11" -> "BOVA11")
            const tickerBruto = (row.ativo_subjacente || row.idAcao || '').toString();
            const ativoSubjacente = tickerBruto.replace(/^\d+/, '');
            
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
                gregas_unitarias: {
                    delta: parseFloat(row.delta || 0),
                    gamma: parseFloat(row.gamma || 0),
                    theta: parseFloat(row.theta || 0),
                    vega: parseFloat(row.vega || 0)
                }
            };
        });

        // 3. Retorna os dados para o Frontend
        return res.status(200).json(normalizedData);
    } catch (error: any) {
        console.error('❌ [Routes] Erro ao buscar opções:', error.message);
        return res.status(500).json({ message: 'Erro interno no servidor' });
    }
});

export default router;