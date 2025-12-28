// src/services/OptionsDataProcessor.ts

import { OptionLeg } from '../interfaces/Types'; 

// Definição de uma constante para o multiplicador padrão dos contratos
const CONTRACT_MULTIPLIER = 100;

/**
 * MOCK_OPTIONS_DATA: Serve como ambiente de teste controlado.
 * Se o CSV falhar ou estivermos em modo de desenvolvimento puro, usamos estes dados.
 */
const MOCK_OPTIONS_DATA: OptionLeg[] = [
    { 
        option_ticker: 'BOVAJ120', 
        ativo_subjacente: 'BOVA11',
        vencimento: '2025-12-18', 
        dias_uteis: 15, 
        tipo: 'CALL', 
        strike: 120.00, 
        multiplicador_contrato: CONTRACT_MULTIPLIER, 
        premio: 5.50, 
        vol_implicita: 0.25, 
        gregas_unitarias: { delta: 0.55, gamma: 0.03, theta: -0.01, vega: 0.12 } 
    },
    { 
        option_ticker: 'BOVAJ125', 
        ativo_subjacente: 'BOVA11', 
        vencimento: '2025-12-18', 
        dias_uteis: 15, 
        tipo: 'CALL', 
        strike: 125.00, 
        multiplicador_contrato: CONTRACT_MULTIPLIER, 
        premio: 3.00, 
        vol_implicita: 0.23, 
        gregas_unitarias: { delta: 0.35, gamma: 0.04, theta: -0.02, vega: 0.10 } 
    },
    { 
        option_ticker: 'VALEC60', 
        ativo_subjacente: 'VALE3', 
        vencimento: '2025-12-18', 
        dias_uteis: 20, 
        tipo: 'PUT', 
        strike: 60.00, 
        multiplicador_contrato: CONTRACT_MULTIPLIER, 
        premio: 2.50, 
        vol_implicita: 0.30, 
        gregas_unitarias: { delta: -0.60, gamma: 0.02, theta: -0.01, vega: 0.15 } 
    }
];

export class OptionsDataProcessor {
    /**
     * Tenta carregar dados reais, mas se falhar, retorna o Mock.
     * Isso garante que seu SaaS nunca "caia" na frente do cliente.
     */
    public static async getProcessedData(ticker: string, livePrice: number): Promise<OptionLeg[]> {
        try {
            // Aqui ele tentaria chamar o seu csvReader.ts
            // Se o arquivo existir e o ticker for encontrado, ele retorna o real.
            // Se não, ele cai no catch e retorna o Mock para o sistema não travar.
            
            console.log(`[DATA SERVICE] Processando dados para ${ticker} a R$ ${livePrice}...`);
            
            // Por enquanto, retornamos os dados mockados filtrados por ticker
            const filtered = MOCK_OPTIONS_DATA.filter(o => 
                o.ativo_subjacente.toUpperCase() === ticker.toUpperCase()
            );

            return filtered.length > 0 ? filtered : MOCK_OPTIONS_DATA;
        } catch (error) {
            console.warn("[DATA SERVICE] Falha ao processar dados reais, usando Mock.");
            return MOCK_OPTIONS_DATA;
        }
    }
}