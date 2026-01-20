import mysql, { Pool, PoolOptions } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig: PoolOptions = {
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

// Forçamos a tipagem aqui para evitar o erro de Overload TS2769
export const pool: Pool = process.env.DATABASE_URL 
    ? mysql.createPool(process.env.DATABASE_URL as string) 
    : mysql.createPool(dbConfig);

export class DatabaseService {
    static async testConnection(): Promise<void> {
        try {
            await pool.query('SELECT 1');
            console.log('📡 [TiDB Cloud] Conexão estabelecida com sucesso.');
        } catch (error: any) {
            console.error('❌ [TiDB Cloud] Falha na conexão:', error.message);
            throw error;
        }
    }

    static async getSpotPrice(ticker: string): Promise<number> {
        try {
            const cleanTicker = ticker.toUpperCase().trim();
            const [rows]: any = await pool.execute(
                'SELECT preco_atual FROM ativos WHERE ticker LIKE ? LIMIT 1',
                [`%${cleanTicker}%`]
            );
            return (rows && rows.length > 0) ? Number(rows[0].preco_atual) : 0;
        } catch (error) {
            return 0;
        }
    }

    static async getOptionsByTicker(ticker: string): Promise<any[]> {
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
            const [rows]: any = await pool.execute(query, [`%${cleanTicker}%`]);
            return rows.map((row: any) => ({
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
        } catch (error) {
            return [];
        }
    }
}