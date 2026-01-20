// src/services/OptionsDataProcessor.ts

// Atualizado com .js para compatibilidade ESM na Vercel
import { OptionLeg } from '../interfaces/Types.js'; 

const CONTRACT_MULTIPLIER = 100;

export class OptionsDataProcessor {
    /**
     * Função privada para corrigir strikes divergentes (ex: BOVA11 vindo como 15.50)
     */
    private static normalizeStrike(ticker: string, strike: number): number {
        const t = ticker.toUpperCase();
        // Se for BOVA11 e o strike estiver abaixo de 50, está claramente errado (deveria ser > 100)
        if (t === 'BOVA11' && strike < 50) {
            return strike * 10;
        }
        // Adicione aqui outros ativos se notar divergência (ex: IVVB11)
        return strike;
    }

    public static async getProcessedData(ticker: string, livePrice: number): Promise<OptionLeg[]> {
        try {
            console.log(`[DATA SERVICE] Processando dados para ${ticker} a R$ ${livePrice}...`);
            
            // 1. Aqui você deve estar chamando seu banco ou CSV. 
            // Supondo que 'dataFromSource' seja o que vem do seu MySQL/CSV:
            let dataFromSource: OptionLeg[] = []; 
            
            /* IMPORTANTE: Quando você buscar os dados do Banco, 
               precisamos passar pelo normalizeStrike. 
            */
            
            const processedData = dataFromSource.map(option => ({
                ...option,
                strike: this.normalizeStrike(option.ativo_subjacente, option.strike)
            }));

            // Se o dado real existir, retorna ele processado
            if (processedData.length > 0) return processedData;

            // --- SE NÃO HOUVER DADOS REAIS, USA O MOCK ABAIXO ---
            return MOCK_OPTIONS_DATA.map(o => ({
                ...o,
                strike: this.normalizeStrike(o.ativo_subjacente, o.strike)
            })).filter(o => o.ativo_subjacente.toUpperCase() === ticker.toUpperCase());

        } catch (error: any) {
            console.warn(`[DATA SERVICE] Falha ao processar dados reais para ${ticker}: ${error.message}`);
            return MOCK_OPTIONS_DATA.filter(o => o.ativo_subjacente.toUpperCase() === ticker.toUpperCase());
        }
    }
}

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
    }
    // ... restante do mock
];