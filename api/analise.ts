import { VercelRequest, VercelResponse } from '@vercel/node';
import cors from 'cors';
import dotenv from 'dotenv';
import { DatabaseService, pool } from '../src/config/database';
import { PayoffCalculator } from '../src/services/PayoffCalculator';
import { StrategyMetrics } from '../src/interfaces/Types';

// Carrega variáveis de ambiente
dotenv.config();

// Configuração de taxas
const FEE_PER_LEG = 22.00;

// Helper para formatar moeda
const fmtBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

/**
 * Prepara a estratégia para o consumo do Frontend
 */
function prepareStrategyForFrontend(metrics: StrategyMetrics, lot: number): any {
    const isExplosion = metrics.name.toLowerCase().includes('str');
    const numPernas = metrics.pernas.length;
    const feesOpen = numPernas * FEE_PER_LEG;
    
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
 * Handler Principal da Vercel (Substitui o app.get)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // 1. Configuração manual de CORS (Vercel Functions não usam app.use(cors) nativamente)
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // 2. Garantir conexão com o Banco
        // O pool de conexões do mysql2 gerencia isso automaticamente, 
        // mas testamos para garantir que o TiDB está acessível.
        await pool.query('SELECT 1');

        // 3. Extrair Parâmetros
        const ticker = (req.query.ticker as string || 'ABEV3').toUpperCase();
        const inputLot = parseInt(req.query.lote as string || '1000');

        // 4. Executar Lógica de Negócio
        const currentPrice = await DatabaseService.getSpotPrice(ticker);
        if (currentPrice === 0) {
            return res.status(404).json({ status: "error", message: `Preço spot não encontrado para ${ticker}` });
        }

        const options = await DatabaseService.getOptionsByTicker(ticker);
        
        // Instancia a calculadora e processa estratégias
        const calculator = new PayoffCalculator(options, FEE_PER_LEG, inputLot);
        const results = calculator.findAndCalculateSpreads(currentPrice, 0.25);
        
        const estruturadas = results.map(s => prepareStrategyForFrontend(s, inputLot));

        // 5. Retornar Resultado
        return res.status(200).json({ 
            status: "success", 
            timestamp: new Date().toISOString(),
            count: estruturadas.length,
            data: estruturadas 
        });

    } catch (e: any) {
        console.error('❌ [API ERROR]:', e.message);
        return res.status(500).json({ 
            status: "error", 
            message: e.message 
        });
    }
}