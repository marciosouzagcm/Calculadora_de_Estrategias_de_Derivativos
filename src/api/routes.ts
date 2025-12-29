import { Request, Response } from 'express';
import db from '../config/database'; // Ajuste o caminho para o seu arquivo de conexão
import { OptionLeg } from '../interfaces/Types';

export const getOptions = async (req: Request, res: Response) => {
    try {
        // 1. Busca os dados brutos do MySQL
        // Ajuste 'nome_da_tabela' para o nome real da sua tabela
        const [rows]: any = await db.query('SELECT * FROM opcoes');

        // 2. Mapeia e Normaliza os dados (Tratando o ID e o Strike)
        const normalizedData: OptionLeg[] = rows.map((row: any) => {
            // Remove o ID do ticker do ativo (ex: "1BOVA11" -> "BOVA11")
            const ativoSubjacente = row.ativo_subjacente.replace(/^\d+/, '');
            
            let strike = parseFloat(row.strike);
            // Corrige a escala do BOVA11 se necessário
            if (ativoSubjacente === 'BOVA11' && strike < 100) {
                strike = strike * 10;
            }

            return {
                ...row,
                ativo_subjacente: ativoSubjacente,
                strike: strike,
                premio: parseFloat(row.premio),
                // Garante que as gregas sejam números
                gregas_unitarias: {
                    delta: parseFloat(row.delta),
                    gamma: parseFloat(row.gamma),
                    theta: parseFloat(row.theta),
                    vega: parseFloat(row.vega)
                }
            };
        });

        // 3. Retorna os dados para o Frontend
        return res.status(200).json(normalizedData);
    } catch (error) {
        console.error('Erro ao buscar opções:', error);
        return res.status(500).json({ message: 'Erro interno no servidor' });
    }
};