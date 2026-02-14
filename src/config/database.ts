import mysql, { Pool, PoolOptions } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

/**
 * BOARDPRO V40.2 - Database Configuration
 * Correção Crítica 16.1.3: SSL rejectUnauthorized set to TRUE.
 */
const dbConfig: PoolOptions = {
    host: process.env.TIDB_HOST,
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_NAME || 'trading_options',
    port: Number(process.env.TIDB_PORT) || 4000,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    ssl: {
        minVersion: 'TLSv1.2',
        // ITEM 16.1.3: Agora verificamos obrigatoriamente o certificado da TiDB Cloud
        rejectUnauthorized: true 
    }
};

/**
 * Singleton do Pool de Conexões.
 * Ajustado para garantir que o SSL seja aplicado mesmo via DATABASE_URL.
 */
export const pool: Pool = (() => {
    if (process.env.DATABASE_URL) {
        // Se usar URL, injetamos o SSL via opções para garantir o rejectUnauthorized: true
        return mysql.createPool({
            uri: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: true }
        } as any);
    }
    return mysql.createPool(dbConfig);
})();

export class DatabaseService {
    /**
     * Valida a saúde da conexão com o banco de dados e o handshake SSL
     */
    static async testConnection(): Promise<void> {
        try {
            const [rows] = await pool.query('SELECT 1 + 1 AS result');
            console.log('🛡️ [TiDB Cloud] Conexão SSL Segura e Saudável.');
        } catch (error: any) {
            console.error('❌ [TiDB Cloud] Erro Crítico: Falha na autenticação SSL ou Conexão.');
            console.error(`Detalhe: ${error.message}`);
            throw error;
        }
    }

    /**
     * Busca o preço do ativo subjacente (SPOT)
     */
    static async getSpotPrice(ticker: string): Promise<number> {
        try {
            const cleanTicker = ticker.toUpperCase().trim();
            const [rows]: any = await pool.execute(
                'SELECT preco_atual FROM ativos WHERE ticker LIKE ? LIMIT 1',
                [`%${cleanTicker}%`]
            );
            return (rows && rows.length > 0) ? Number(rows[0].preco_atual) : 0;
        } catch (error: any) {
            console.error(`[DB ERROR] Falha ao buscar preço de ${ticker}:`, error.message);
            return 0;
        }
    }

    /**
     * Busca a grade de opções vigente para o ticker informado
     */
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
                gregas_unitarias: {
                    delta: Number(row.delta || 0),
                    gamma: Number(row.gamma || 0),
                    theta: Number(row.theta || 0),
                    vega: Number(row.vega || 0)
                }
            }));
        } catch (error: any) {
            console.error(`[DB ERROR] Falha ao buscar opções de ${ticker}:`, error.message);
            return [];
        }
    }
}