import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

// Carrega as variáveis do arquivo .env
dotenv.config();

export const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.DB_PASS, 
    database: process.env.DB_NAME || 'trading_options',
    port: Number(process.env.DB_PORT) || 4000,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    
    // CONFIGURAÇÕES ANTI-ECONNRESET (ESTABILIDADE)
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000, // Envia um ping a cada 10 segundos
    maxIdle: 10, // Mantém conexões prontas no pool
    idleTimeout: 60000, // Renova conexões inativas após 1 minuto
    
    // CONEXÃO SEGURA TI DB CLOUD
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
});

export class DatabaseService {
    
    static async getSpotPrice(ticker: string): Promise<number> {
        try {
            const cleanTicker = ticker.toUpperCase().trim();
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

            console.log(`📡 DB (TiDB): ${rows.length} linhas encontradas para: %${cleanTicker}%`);

            return rows.map((row: any) => {
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
                    delta: Number(row.delta || 0),
                    gamma: Number(row.gamma || 0),
                    theta: Number(row.theta || 0),
                    vega: Number(row.vega || 0)
                };
            });
        } catch (error) {
            console.error('❌ Erro ao buscar opções no banco:', error);
            // Se houver erro de conexão, o pool tentará se recuperar na próxima chamada
            return [];
        }
    }
}