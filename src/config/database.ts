import mysql from 'mysql2/promise';

/**
 * Configuração do Pool de Conexões.
 * O Pool gerencia múltiplas conexões simultâneas de forma eficiente.
 */
export const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'seguRa1$', // Sua senha definida
    database: 'trading_options',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

export class DatabaseService {
    /**
     * Busca o preço atual do ativo (Spot) na tabela 'ativos'
     * @param ticker Ex: 'BBAS3'
     */
    static async getSpotPrice(ticker: string): Promise<number> {
        try {
            const [rows]: any = await pool.execute(
                'SELECT preco_atual FROM ativos WHERE ticker = ? LIMIT 1',
                [ticker.toUpperCase()]
            );
            
            if (rows && rows.length > 0) {
                return Number(rows[0].preco_atual);
            }
            
            console.warn(`⚠️ Preço spot não encontrado para: ${ticker}`);
            return 0;
        } catch (error) {
            console.error('❌ Erro ao buscar preço spot:', error);
            return 0;
        }
    }

    /**
     * Busca todas as opções disponíveis para um ativo.
     * Mapeia a estrutura do seu banco para a interface OptionLeg usada no sistema.
     * @param ticker Ex: 'BBAS3'
     */
    static async getOptionsByTicker(ticker: string): Promise<any[]> {
        try {
            const cleanTicker = ticker.toUpperCase();

            // Query otimizada: Busca exata pelo idAcao e apenas opções não vencidas
            const query = `
                SELECT 
                    id, idAcao, ticker, vencimento, diasUteis, tipo, 
                    strike, premioPct, volImplicita, delta, gamma, 
                    theta, vega, dataHora 
                FROM opcoes 
                WHERE idAcao = ? 
                AND vencimento >= CURDATE()
            `;

            const [rows]: any = await pool.execute(query, [cleanTicker]);

            console.log(`📡 DB: ${rows.length} opções encontradas para ${cleanTicker}`);

            // Mapeamento de dados para garantir consistência com o motor de estratégias
            return rows.map((row: any) => ({
                id: row.id,
                option_ticker: row.ticker,
                ativo_subjacente: row.idAcao,
                tipo: row.tipo, // 'CALL' ou 'PUT'
                strike: Number(row.strike),
                premio: Number(row.premioPct), // Tradução de premioPct para premio
                dataVencimento: row.vencimento, // Tradução de vencimento para dataVencimento
                dias_uteis: row.diasUteis || 0,
                volImplicita: Number(row.volImplicita || 0),
                // Gregas unitárias (essenciais para o gráfico e análise de risco)
                delta: Number(row.delta || 0),
                gamma: Number(row.gamma || 0),
                theta: Number(row.theta || 0),
                vega: Number(row.vega || 0)
            }));
        } catch (error) {
            console.error('❌ Erro ao buscar opções no banco:', error);
            return [];
        }
    }
}