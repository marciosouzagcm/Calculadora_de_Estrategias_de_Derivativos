/**
 * @fileoverview Simulação do serviço de carregamento e processamento de dados de opções.
 * Em um projeto real, esta classe faria a leitura, validação e cálculo de dados (dias úteis, gregas, etc.).
 * Mantemos a versão mock para focar na implementação da lógica das estratégias.
 */
// [CORREÇÃO 1]: O caminho de importação deve ser ajustado para 'OptionLeg' e 'Greeks' 
// vindo do arquivo de tipos, que assumimos estar em '../interfaces/Types'.
import { Greeks, OptionLeg } from '../interfaces/Types'; 

// Definição de uma constante para o multiplicador padrão dos contratos (geralmente 100 na B3)
const CONTRACT_MULTIPLIER = 100;

// Mock de dados de Opções para simulação
const MOCK_OPTIONS_DATA: OptionLeg[] = [
    // Mock 1: CALL - OTM (Out-The-Money)
    // [REVISÃO] Alterado para usar gregas_unitarias: Greeks e adicionado multiplicador_contrato.
    { 
        option_ticker: 'BOVAJ120', 
        ativo_subjacente: 'BOVA11', // [REVISÃO] Renomeado de id_acao para ativo_subjacente
        vencimento: '2025-10-18', 
        dias_uteis: 15, 
        tipo: 'CALL', 
        strike: 120.00, 
        multiplicador_contrato: CONTRACT_MULTIPLIER, // [NOVO] Essencial para calcular o total
        premio: 5.50, 
        vol_implicita: 0.25, 
        gregas_unitarias: { // [REVISÃO] Agrupamento de gregas
            delta: 0.55, 
            gamma: 0.03, 
            theta: -0.01, 
            vega: 0.12 
        } 
    },
    
    // Mock 2: CALL - OTM (Para o Bull Call Spread)
    { 
        option_ticker: 'BOVAJ125', 
        ativo_subjacente: 'BOVA11', 
        vencimento: '2025-10-18', 
        dias_uteis: 15, 
        tipo: 'CALL', 
        strike: 125.00, 
        multiplicador_contrato: CONTRACT_MULTIPLIER, 
        premio: 3.00, 
        vol_implicita: 0.23, 
        gregas_unitarias: { 
            delta: 0.35, 
            gamma: 0.04, 
            theta: -0.02, 
            vega: 0.10 
        } 
    },
    
    // Mock 3: CALL - Mais OTM
    { 
        option_ticker: 'BOVAJ130', 
        ativo_subjacente: 'BOVA11', 
        vencimento: '2025-10-18', 
        dias_uteis: 15, 
        tipo: 'CALL', 
        strike: 130.00, 
        multiplicador_contrato: CONTRACT_MULTIPLIER, 
        premio: 1.20, 
        vol_implicita: 0.21, 
        gregas_unitarias: { 
            delta: 0.15, 
            gamma: 0.05, 
            theta: -0.03, 
            vega: 0.08 
        } 
    },

    // Mock 4: PUT - Com outro vencimento
    { 
        option_ticker: 'BOVAI120', 
        ativo_subjacente: 'BOVA11', 
        vencimento: '2025-09-18', 
        dias_uteis: 5, 
        tipo: 'PUT', 
        strike: 120.00, 
        multiplicador_contrato: CONTRACT_MULTIPLIER, 
        premio: 1.50, 
        vol_implicita: 0.20, 
        gregas_unitarias: { 
            delta: -0.45, 
            gamma: 0.06, 
            theta: -0.04, 
            vega: 0.07 
        } 
    },

    // Mock 5: PUT - Outro Ativo
    { 
        option_ticker: 'VALEC60', 
        ativo_subjacente: 'VALE3', 
        vencimento: '2025-10-18', 
        dias_uteis: 15, 
        tipo: 'PUT', 
        strike: 60.00, 
        multiplicador_contrato: CONTRACT_MULTIPLIER, 
        premio: 2.50, 
        vol_implicita: 0.30, 
        gregas_unitarias: { 
            delta: -0.60, 
            gamma: 0.02, 
            theta: -0.01, 
            vega: 0.15 
        } 
    },
];


/**
 * Simula o carregamento e pré-processamento dos dados de um arquivo CSV.
 * Retorna dados mockados para fins de desenvolvimento, respeitando o tipo OptionLeg.
 * @param csvFilepath O caminho para o arquivo CSV de opções.
 * @returns Um array de objetos OptionLeg processados.
 */
export function loadAndProcessOptionsData(csvFilepath: string): OptionLeg[] {
    console.log(`[DATA SERVICE] Simulação: Carregando dados de ${csvFilepath}...`);
    return MOCK_OPTIONS_DATA;
}