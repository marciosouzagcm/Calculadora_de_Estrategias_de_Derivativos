// src/services/MarketDataService.ts
import axios from 'axios';

export interface MarketData {
    symbol: string;
    price: number;
    updatedAt: Date;
}

export class MarketDataService {
    private readonly API_KEY = 'uwKJhawCxugzzGcMbRgNsd'; // Substitua pela sua chave da Brapi
    private readonly BASE_URL = 'https://brapi.dev/api';

    /**
     * Busca o preço atual do ativo subjacente (Ação)
     */
    async getAssetPrice(ticker: string): Promise<number> {
        try {
            const response = await axios.get(`${this.BASE_URL}/quote/${ticker}`, {
                params: { token: this.API_KEY }
            });

            const price = response.data.results[0]?.regularMarketPrice;
            if (!price) throw new Error("Preço não encontrado");
            
            return price;
        } catch (error) {
            console.error(`Erro ao buscar cotação de ${ticker}:`, error);
            throw error;
        }
    }

    /**
     * Busca dados básicos de opções (se disponível no seu plano da API)
     * Nota: Muitas APIs exigem planos pagos para derivativos em tempo real.
     */
    async getOptionsList(ticker: string) {
        // Implementação futura para buscar strikes e vencimentos reais
    }
}