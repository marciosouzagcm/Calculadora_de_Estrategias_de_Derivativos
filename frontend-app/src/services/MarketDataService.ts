// src/services/MarketDataService.ts
import axios from 'axios';

export interface MarketData {
    symbol: string;
    price: number;
    updatedAt: Date;
    changePercent: number;
}

export class MarketDataService {
    private readonly API_KEY = 'uwKJhawCxugzzGcMbRgNsd'; 
    private readonly BASE_URL = 'https://brapi.dev/api';

    /**
     * Busca o preço atual do ativo (SPOT) com tratamento de erro e formatação
     */
    async getAssetPrice(ticker: string): Promise<MarketData> {
        try {
            // Remove espaços e garante caixa alta
            const cleanTicker = ticker.trim().toUpperCase();
            
            const response = await axios.get(`${this.BASE_URL}/quote/${cleanTicker}`, {
                params: { token: this.API_KEY }
            });

            const result = response.data.results[0];

            if (!result || !result.regularMarketPrice) {
                throw new Error(`Ativo ${cleanTicker} não encontrado na base de dados.`);
            }

            return {
                symbol: result.symbol,
                price: result.regularMarketPrice,
                changePercent: result.regularMarketChangePercent,
                updatedAt: new Date(result.regularMarketTime)
            };
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.message;
            console.error(`[MarketDataService] Erro em ${ticker}:`, errorMsg);
            throw new Error(`Falha ao obter cotação: ${errorMsg}`);
        }
    }

    /**
     * getOptionsList (Fase Futura): 
     * Para um SaaS completo, aqui buscaríamos a volatilidade implícita (IV) 
     * da Brapi para alimentar o Black-Scholes de forma 100% automática.
     */
    async getOptionsVolatility(ticker: string): Promise<number> {
        // Atualmente, a Brapi fornece IV em planos específicos.
        // Por enquanto, usaremos a IV calculada do seu arquivo .xlms
        return 0.35; // Valor de fallback (35%)
    }
}