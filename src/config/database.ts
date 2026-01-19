import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Configuração do Pool otimizada para TiDB Cloud.
 * Priorizamos a DATABASE_URL para garantir que parâmetros de SSL complexos 
 * e prefixos de usuário com caracteres especiais sejam lidos corretamente.
 */
export const pool = mysql.createPool(process.env.DATABASE_URL || {
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
        rejectUnauthorized: false // Ajustado para false para compatibilidade com o Free Tier
    }
});

export class DatabaseService {
    
    /**
     * Busca o preço spot do ativo na tabela 'ativos'
     */
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
            
            console.warn(`⚠️ [TiDB] Preço spot não encontrado para: ${cleanTicker}`);
            return 0;
        } catch (error) {
            console.error('❌ [TiDB ERROR] Erro ao buscar preço spot:', error);
            return 0;
        }
    }

    /**
     * Busca todas as opções disponíveis para um ticker, filtrando por vencimento
     */
    static async getOptionsByTicker(ticker: string): Promise<any[]> {
        try {
            const cleanTicker = ticker.toUpperCase().trim();

            // Consulta otimizada para o TiDB
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

            console.log(`📡 [TiDB Cloud] ${rows.length} opções encontradas para: ${cleanTicker}`);

            return rows.map((row: any) => {
                // Remove prefixos numéricos do idAcao (ex: "1ABEV3" -> "ABEV3")
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
                    // Mapeamento direto das Gregas extraídas do Excel
                    delta: Number(row.delta || 0),
                    gamma: Number(row.gamma || 0),
                    theta: Number(row.theta || 0),
                    vega: Number(row.vega || 0)
                };
            });
        } catch (error) {
            console.error('❌ [TiDB ERROR] Erro ao buscar opções:', error);
            return [];
        }
    }
}