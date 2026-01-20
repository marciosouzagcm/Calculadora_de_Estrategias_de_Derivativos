// src/services/MarketDataService.ts
import axios from 'axios';
/**
 * Serviço de integração com a API BRAPI para cotações em tempo real
 * BOARDPRO V38.5 - Gerenciamento de Dados de Mercado
 */
export class MarketDataService {
    constructor() {
        // Chave de API da BRAPI (Recuperada do Commit b492082)
        this.API_KEY = 'uwKJhawCxugzzGcMbRgNsd';
        this.BASE_URL = 'https://brapi.dev/api';
    }
    /**
     * Busca o preço atual (SPOT) de um ativo com tratamento de erro.
     * @param ticker Ex: 'PETR4', 'VALE3'
     */
    async getAssetPrice(ticker) {
        try {
            // Limpeza de string: remove espaços e garante uppercase
            const cleanTicker = ticker.trim().toUpperCase();
            // Chamada à API BRAPI
            const response = await axios.get(`${this.BASE_URL}/quote/${cleanTicker}`, {
                params: {
                    token: this.API_KEY,
                    range: '1d',
                    interval: '1m'
                }
            });
            const result = response.data.results[0];
            // Validação de existência do ativo e preço
            if (!result || typeof result.regularMarketPrice !== 'number') {
                throw new Error(`Ativo ${cleanTicker} não encontrado ou sem cotação disponível.`);
            }
            return {
                symbol: result.symbol,
                price: result.regularMarketPrice,
                changePercent: result.regularMarketChangePercent || 0,
                // Garante que a data seja um objeto Date válido
                updatedAt: new Date(result.regularMarketTime || Date.now())
            };
        }
        catch (error) {
            const errorMsg = error.response?.data?.message || error.message;
            console.error(`[MarketDataService] Erro ao buscar cotação de ${ticker}:`, errorMsg);
            // Fallback amigável em caso de erro de rede ou API
            throw new Error(`Falha na cotação real-time: ${errorMsg}`);
        }
    }
    /**
     * getOptionsVolatility (Fase Futura):
     * Retorna a Volatilidade Implícita (IV) do ativo.
     * Atualmente retorna um valor base (fallback) para alimentar o modelo Black-Scholes.
     */
    async getOptionsVolatility(ticker) {
        // Para um sistema SaaS, aqui buscaríamos a IV média das opções ATM da BRAPI
        // Valor padrão de 35% (0.35) conforme especificação técnica do projeto
        return 0.35;
    }
}
