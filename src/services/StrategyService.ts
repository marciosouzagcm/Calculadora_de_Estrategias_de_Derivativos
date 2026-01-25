import { DatabaseService } from '../config/database.js';
import { StrategyFactory } from '../factories/StrategyFactory.js';
import { OptionLeg, StrategyMetrics } from '../interfaces/Types.js';

/**
 * BOARDPRO V41.8 - Strategy Orchestrator
 * UPDATED: Sanitização rigorosa de nulos, proteção de tipos e correção de roteamento de dados.
 */
export class StrategyService {
    private static readonly FEE_PER_LEG = 22.00; 

    static async getOportunidades(ticker: string, lot: number, manualPrice?: number): Promise<StrategyMetrics[]> {
        const cleanTicker = (ticker || '').trim().toUpperCase();
        if (!cleanTicker) return [];

        const spotPrice = manualPrice || await DatabaseService.getSpotPrice(cleanTicker);
        let rawOptions = await DatabaseService.getOptionsByTicker(cleanTicker);

        // Fallback para tickers de 4 letras caso o de 5 não retorne nada
        if ((!rawOptions || rawOptions.length === 0) && cleanTicker.length > 4) {
            const shortTicker = cleanTicker.substring(0, 4);
            rawOptions = await DatabaseService.getOptionsByTicker(shortTicker);
        }

        if (!rawOptions || rawOptions.length === 0) return [];

        // Mapeamento com proteção contra valores nulos/undefined (causa dos erros no log)
        const options: OptionLeg[] = rawOptions.map((opt: any) => {
            if (!opt) return null;

            const cleanAtivo = (opt.ativo_subjacente || '').replace(/^\d+/, '');
            let correctedStrike = parseFloat(opt.strike || 0);
            
            // Ajuste específico para BOVA11
            if (cleanAtivo.includes('BOVA') && correctedStrike < 80 && correctedStrike > 0) {
                correctedStrike *= 10;
            }

            return {
                ...opt,
                ativo_subjacente: cleanAtivo,
                strike: correctedStrike,
                // Lógica de fallback para tipo (CALL/PUT) baseada no símbolo B3
                tipo: opt.tipo || (opt.symbol && opt.symbol.charAt(4).match(/[A-L]/) ? 'CALL' : 'PUT'),
                premio: parseFloat(opt.premio || opt.premioPct || 0),
                vencimento: typeof opt.vencimento === 'string' ? opt.vencimento.split('T')[0] : opt.vencimento,
                gregas_unitarias: {
                    delta: parseFloat(opt.delta || 0),
                    gamma: parseFloat(opt.gamma || 0),
                    theta: parseFloat(opt.theta || 0),
                    vega: parseFloat(opt.vega || 0)
                }
            } as OptionLeg;
        }).filter(Boolean) as OptionLeg[];

        const allStrategies = StrategyFactory.getAllStrategies();
        const bestOfEach = new Map<string, StrategyMetrics>();

        for (const strategy of allStrategies) {
            try {
                const combinations = strategy.calculateMetrics(options, spotPrice, this.FEE_PER_LEG);
                if (Array.isArray(combinations)) {
                    combinations.forEach(m => {
                        if (m && m.name) {
                            const formatted = this.formatForFrontend(m, lot, spotPrice);
                            bestOfEach.set(formatted.name, formatted);
                        }
                    });
                }
            } catch (err) {
                console.error(`❌ [ENGINE_ERROR] ${strategy.name}:`, err);
            }
        }

        return Array.from(bestOfEach.values()).sort((a, b) => (Number(b.roi) || 0) - (Number(a.roi) || 0));
    }

    private static formatForFrontend(s: StrategyMetrics, lot: number, spotPrice: number): StrategyMetrics {
        const pernas = s.pernas || [];
        const feesTotal = pernas.length * this.FEE_PER_LEG;
        const safeLot = lot > 0 ? lot : 100;
        const feePerUnit = feesTotal / safeLot;
        
        // 1. CÁLCULO DO TARGET REAL (Saída 0x0)
        const unitPremium = Math.abs(s.net_premium || 0);
        const targetZeroZero = unitPremium + feePerUnit;

        // 2. FINANCEIRO TOTAL
        const isUnlimited = s.max_profit === 'Ilimitado' || s.max_profit === Infinity;
        const rawProfit = Number(s.max_profit) || 0;
        const rawLoss = Number(s.max_loss) || 0;

        const netProfit = isUnlimited ? Infinity : (rawProfit * safeLot) - feesTotal;
        const netRisk = (Math.abs(rawLoss) * safeLot) + feesTotal;

        // 3. BREAK-EVEN (B.E.) ANCORADO
        let finalBE = s.breakEvenPoints || [];
        if (finalBE.length === 0 || finalBE.every(v => v === 0)) {
            const pivotStrike = (pernas[0] as any)?.strike || spotPrice;
            const isBull = s.name.includes('Bull') || (pernas[0] as any)?.tipo === 'CALL';
            finalBE = [isBull ? pivotStrike + targetZeroZero : pivotStrike - targetZeroZero];
        }

        return {
            ...s,
            roi: netRisk > 0 ? (Number(netProfit) / netRisk) : 0,
            
            exibir_lucro: isUnlimited ? 'ILIMITADO' : 
                `R$ ${Math.abs(Number(netProfit)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                
            exibir_risco: `R$ ${Math.abs(netRisk).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            
            net_premium: Number(targetZeroZero.toFixed(4)), 
            
            max_profit: netProfit,
            max_loss: netRisk,
            lucro_maximo: netProfit,
            risco_maximo: netRisk,
            
            initialCashFlow: Math.abs(Number(((s.initialCashFlow || 0) * safeLot).toFixed(2))),
            breakEvenPoints: finalBE.map(p => Number(Math.abs(p || 0).toFixed(2))),
            
            greeks: {
                delta: Number(((s.greeks?.delta || 0) * safeLot).toFixed(2)),
                gamma: Number(((s.greeks?.gamma || 0) * safeLot).toFixed(4)),
                theta: Number(((s.greeks?.theta || 0) * safeLot).toFixed(2)),
                vega: Number(((s.greeks?.vega || 0) * safeLot).toFixed(2))
            }
        };
    }
}