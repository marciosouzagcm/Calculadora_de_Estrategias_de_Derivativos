import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'seguRa1$', 
    database: 'trading_options',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

export class DatabaseService {
    
    static async getSpotPrice(ticker: string): Promise<number> {
        try {
            const cleanTicker = ticker.toUpperCase().trim();
            // Usamos LIKE para encontrar o preço mesmo que o ticker no banco tenha prefixos
            const [rows]: any = await pool.execute(
                'SELECT preco_atual FROM ativos WHERE ticker LIKE ? LIMIT 1',
                [`%${cleanTicker}%`]
            );
            
            if (rows && rows.length > 0) {
                return Number(rows[0].preco_atual);
            }
            
            console.warn(`⚠️ Preço spot não encontrado para: ${cleanTicker}`);
            return 0;
        } catch (error) {
            console.error('❌ Erro ao buscar preço spot:', error);
            return 0;
        }
    }

    static async getOptionsByTicker(ticker: string): Promise<any[]> {
        try {
            const cleanTicker = ticker.toUpperCase().trim();

            /**
             * AJUSTE CRÍTICO: 
             * Mudamos "idAcao = ?" para "idAcao LIKE ?" para capturar "1BOVA11", "2BOVA11", etc.
             */
            const query = `
                SELECT 
                    id, idAcao, ticker, vencimento, diasUteis, tipo, 
                    strike, premioPct, volImplicita, delta, gamma, 
                    theta, vega, dataHora 
                FROM opcoes 
                WHERE idAcao LIKE ? 
                AND vencimento >= CURDATE()
            `;

            const [rows]: any = await pool.execute(query, [`%${cleanTicker}%`]);

            console.log(`📡 DB: ${rows.length} linhas brutas encontradas para filtro: %${cleanTicker}%`);

            return rows.map((row: any) => {
                // Remove prefixos numéricos do idAcao (ex: "1BOVA11" -> "BOVA11")
                const normalizedAtivo = row.idAcao.replace(/^\d+/, '');

                return {
                    id: row.id,
                    option_ticker: row.ticker,
                    ativo_subjacente: normalizedAtivo,
                    tipo: row.tipo.toUpperCase(), 
                    strike: Number(row.strike),
                    premio: Number(row.premioPct), 
                    vencimento: row.vencimento, 
                    dias_uteis: Number(row.diasUteis || 0),
                    vol_implicita: Number(row.volImplicita || 0),
                    // O motor de estratégias espera as gregas dentro de 'gregas_unitarias' ou direto?
                    // Ajustamos para o padrão que o StrategyService que te enviei espera:
                    delta: Number(row.delta || 0),
                    gamma: Number(row.gamma || 0),
                    theta: Number(row.theta || 0),
                    vega: Number(row.vega || 0)
                };
            });
        } catch (error) {
            console.error('❌ Erro ao buscar opções no banco:', error);
            return [];
        }
    }
}