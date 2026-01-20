import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
/**
 * Configuração de conexão para o TiDB Cloud
 * Ajustado para evitar erros de sobrecarga no TypeScript
 */
const dbConfig = {
    host: process.env.TIDB_HOST,
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_NAME || 'trading_options',
    port: Number(process.env.TIDB_PORT) || 4000,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false
    }
};
// Se DATABASE_URL existir, usamos ela diretamente (string), caso contrário, o objeto de config.
export const pool = mysql.createPool(process.env.DATABASE_URL ? process.env.DATABASE_URL : dbConfig);
export class DatabaseService {
    /**
     * Valida a conexão com o banco de dados
     */
    static async testConnection() {
        try {
            const [rows] = await pool.query('SELECT 1');
            console.log('📡 [TiDB Cloud] Conexão estabelecida com sucesso.');
        }
        catch (error) {
            console.error('❌ [TiDB Cloud] Falha na conexão:', error.message);
            throw error;
        }
    }
    /**
     * Busca o preço atual do ativo (Spot)
     */
    static async getSpotPrice(ticker) {
        try {
            const cleanTicker = ticker.toUpperCase().trim();
            const [rows] = await pool.execute('SELECT preco_atual FROM ativos WHERE ticker LIKE ? LIMIT 1', [`%${cleanTicker}%`]);
            return (rows && rows.length > 0) ? Number(rows[0].preco_atual) : 0;
        }
        catch (error) {
            console.error('❌ Erro ao buscar Spot Price:', error);
            return 0;
        }
    }
    /**
     * Recupera a grade de opções filtrada por ticker
     */
    static async getOptionsByTicker(ticker) {
        try {
            const cleanTicker = ticker.toUpperCase().trim();
            const query = `
                SELECT id, idAcao, ticker, vencimento, diasUteis, tipo, 
                       strike, premioPct, volImplicita, delta, gamma, 
                       theta, vega, dataHora 
                FROM opcoes 
                WHERE idAcao LIKE ? 
                AND vencimento >= CURDATE()
            `;
            const [rows] = await pool.execute(query, [`%${cleanTicker}%`]);
            return rows.map((row) => ({
                id: row.id,
                option_ticker: row.ticker,
                ativo_subjacente: row.idAcao.replace(/^\d+/, ''),
                tipo: row.tipo.toUpperCase(),
                strike: Number(row.strike),
                premio: Number(row.premioPct),
                vencimento: row.vencimento,
                dias_uteis: Number(row.diasUteis || 0),
                vol_implicita: Number(row.volImplicita || 0),
                delta: Number(row.delta || 0),
                gamma: Number(row.gamma || 0),
                theta: Number(row.theta || 0),
                vega: Number(row.vega || 0)
            }));
        }
        catch (error) {
            console.error('❌ Erro ao buscar opções:', error);
            return [];
        }
    }
}
