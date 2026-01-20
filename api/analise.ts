import { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';

// IMPORTANTE: Adicionadas extensões .js para compatibilidade com ESM na Vercel
import { DatabaseService, pool } from '../src/config/database.js';
import { PayoffCalculator } from '../src/services/PayoffCalculator.js';
// Interfaces não precisam de .js se forem apenas tipos, mas por segurança mantemos o padrão
import { StrategyMetrics } from '../src/interfaces/Types.js';

// Carrega variáveis de ambiente
dotenv.config();

// Configuração de taxas (B3 + Corretagem estimada)
const FEE_PER_LEG = 22.00;

// Helper para formatar moeda brasileira
const fmtBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

/**
 * Prepara a estratégia para o consumo do Frontend (Dashboard)
 */
function prepareStrategyForFrontend(metrics: StrategyMetrics, lot: number): any {
    const isExplosion = metrics.name.toLowerCase().includes('str');
    const numPernas = metrics.pernas.length;
    const feesOpen = numPernas * FEE_PER_LEG;
    
    // Filtro para evitar valores infinitos do modelo matemático no gráfico
    const maxProfitNum = (typeof metrics.max_profit === 'number' && metrics.max_profit < 900000) ? metrics.max_profit : null;
    const maxLossNum = (typeof metrics.max_loss === 'number' && metrics.max_loss < 900000) ? metrics.max_loss : null;

    const profitFinanceiro = maxProfitNum !== null ? (maxProfitNum * lot) - feesOpen : "Ilimitado";
    const totalRiskFinanceiro = maxLossNum !== null ? (Math.abs(maxLossNum) * lot) + feesOpen : (isExplosion ? 0 : "Sob Consulta");

    return {
        ...metrics,
        exibir_roi: (typeof profitFinanceiro === 'number' && typeof totalRiskFinanceiro === 'number' && totalRiskFinanceiro > 0)
            ? ((profitFinanceiro / totalRiskFinanceiro) * 100).toFixed(2) + '%'
            : 'Variável',
        exibir_risco: typeof totalRiskFinanceiro === 'number' ? fmtBRL(totalRiskFinanceiro) : totalRiskFinanceiro,
        exibir_lucro: typeof profitFinanceiro === 'number' ? fmtBRL(profitFinanceiro) : profitFinanceiro,
        pernas: metrics.pernas.map(p => ({
            ...p,
            side_display: p.direction === 'COMPRA' ? '[C]' : '[V]'
        }))
    };
}

/**
 * Handler Principal da Vercel
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // 1. Configuração de CORS para permitir chamadas do seu domínio Frontend
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // 2. Garantir conexão com o Banco TiDB Cloud
        await pool.query('SELECT 1');

        // 3. Extrair e validar parâmetros da URL
        const ticker = (req.query.ticker as string || 'ABEV3').toUpperCase().trim();
        const inputLot = parseInt(req.query.lote as string || '1000');

        // 4. Buscar Dados de Mercado
        const currentPrice = await DatabaseService.getSpotPrice(ticker);
        
        if (currentPrice === 0) {
            return res.status(404).json({ 
                status: "error", 
                message: `Cotação não encontrada para ${ticker}. Verifique se o ativo está no banco.` 
            });
        }

        const options = await DatabaseService.getOptionsByTicker(ticker);
        
        if (!options || options.length === 0) {
            return res.status(404).json({ 
                status: "error", 
                message: `Nenhuma opção encontrada para ${ticker} com vencimento futuro.` 
            });
        }

        // 5. Executar o Scanner de Estratégias
        // A PayoffCalculator utiliza a StrategyFactory internamente
        const calculator = new PayoffCalculator(options, FEE_PER_LEG, inputLot);
        const results = calculator.findAndCalculateSpreads(currentPrice, 0.25); // 0.25 = 25% de margem de busca
        
        // 6. Formatação Final
        const estruturadas = results.map(s => prepareStrategyForFrontend(s, inputLot));

        return res.status(200).json({ 
            status: "success", 
            metadata: {
                ticker,
                spot: currentPrice,
                lote: inputLot,
                timestamp: new Date().toISOString()
            },
            count: estruturadas.length,
            data: estruturadas 
        });

    } catch (e: any) {
        console.error('❌ [API ERROR]:', e.message);
        return res.status(500).json({ 
            status: "error", 
            message: "Erro interno no processamento da análise.",
            details: e.message 
        });
    }
}