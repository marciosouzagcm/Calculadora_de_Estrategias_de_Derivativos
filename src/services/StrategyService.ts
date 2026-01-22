import { DatabaseService } from '../config/database.js';
import { StrategyFactory } from '../factories/StrategyFactory.js';
import { OptionLeg, StrategyMetrics } from '../interfaces/Types.js';

/**
 * BOARDPRO V41.7 - Strategy Orchestrator
 * FIX: Remoção de sinais, Target unitário real, B.E. ancorado e estabilidade.
 */
export class StrategyService {
    private static readonly FEE_PER_LEG = 22.00; 

    static async getOportunidades(ticker: string, lot: number, manualPrice?: number): Promise<StrategyMetrics[]> {
        const cleanTicker = ticker.trim().toUpperCase();
        const spotPrice = manualPrice || await DatabaseService.getSpotPrice(cleanTicker);
        let rawOptions = await DatabaseService.getOptionsByTicker(cleanTicker);

        if ((!rawOptions || rawOptions.length === 0) && cleanTicker.length > 4) {
            const shortTicker = cleanTicker.substring(0, 4);
            rawOptions = await DatabaseService.getOptionsByTicker(shortTicker);
        }

        if (!rawOptions || rawOptions.length === 0) return [];

        const options: OptionLeg[] = rawOptions.map((opt: any) => {
            const cleanAtivo = opt.ativo_subjacente.replace(/^\d+/, '');
            let correctedStrike = parseFloat(opt.strike);
            if (cleanAtivo.includes('BOVA') && correctedStrike < 80) correctedStrike *= 10;

            return {
                ...opt,
                ativo_subjacente: cleanAtivo,
                strike: correctedStrike,
                premio: parseFloat(opt.premio || opt.premioPct || 0),
                vencimento: typeof opt.vencimento === 'string' ? opt.vencimento.split('T')[0] : opt.vencimento,
                gregas_unitarias: {
                    delta: parseFloat(opt.delta || 0),
                    gamma: parseFloat(opt.gamma || 0),
                    theta: parseFloat(opt.theta || 0),
                    vega: parseFloat(opt.vega || 0)
                }
            };
        });

        const allStrategies = StrategyFactory.getAllStrategies();
        const bestOfEach = new Map<string, StrategyMetrics>();

        for (const strategy of allStrategies) {
            try {
                const combinations = strategy.calculateMetrics(options, spotPrice, this.FEE_PER_LEG);
                if (Array.isArray(combinations)) {
                    combinations.forEach(m => {
                        const formatted = this.formatForFrontend(m, lot, spotPrice);
                        bestOfEach.set(formatted.name, formatted);
                    });
                }
            } catch (err) {
                console.error(`❌ [ENGINE_ERROR] ${strategy.name}:`, err);
            }
        }

        return Array.from(bestOfEach.values()).sort((a, b) => (Number(b.roi) || 0) - (Number(a.roi) || 0));
    }

    private static formatForFrontend(s: StrategyMetrics, lot: number, spotPrice: number): StrategyMetrics {
        const feesTotal = s.pernas.length * this.FEE_PER_LEG;
        const feePerUnit = feesTotal / lot;
        
        // 1. CÁLCULO DO TARGET REAL (Saída 0x0)
        const unitPremium = Math.abs(s.net_premium || 0);
        const targetZeroZero = unitPremium + feePerUnit;

        // 2. FINANCEIRO TOTAL (Sem sinal negativo na exibição)
        const isUnlimited = s.max_profit === 'Ilimitado' || s.max_profit === Infinity;
        const netProfit = isUnlimited ? Infinity : (Number(s.max_profit) * lot) - feesTotal;
        const netRisk = (Math.abs(Number(s.max_loss)) * lot) + feesTotal;

        // 3. BREAK-EVEN (B.E.) FORÇADO - Resolve o problema do 0.00
        let finalBE = s.breakEvenPoints || [];
        if (finalBE.length === 0 || finalBE.every(v => v === 0)) {
            const pivotStrike = s.pernas[0]?.strike || spotPrice;
            const isBull = s.name.includes('Bull') || s.pernas[0]?.tipo === 'CALL';
            // Se for Alta: Strike + Custo Operacional | Se for Baixa: Strike - Custo Operacional
            finalBE = [isBull ? pivotStrike + targetZeroZero : pivotStrike - targetZeroZero];
        }

        return {
            ...s,
            roi: netRisk > 0 ? (Number(netProfit) / netRisk) : 0,
            
            // REMOÇÃO DO TRAÇO: Forçamos o valor absoluto na string formatada
            exibir_lucro: isUnlimited ? 'ILIMITADO' : 
                `R$ ${Math.abs(Number(netProfit)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                
            exibir_risco: `R$ ${Math.abs(netRisk).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            
            // TARGET: Valor unitário ajustado para pagar as taxas
            net_premium: Number(targetZeroZero.toFixed(4)), 
            
            max_profit: netProfit,
            max_loss: netRisk,
            lucro_maximo: netProfit,
            risco_maximo: netRisk,
            
            initialCashFlow: Math.abs(Number((s.initialCashFlow * lot).toFixed(2))),
            breakEvenPoints: finalBE.map(p => Number(Math.abs(p).toFixed(2))),
            
            greeks: {
                delta: Number((s.greeks?.delta * lot || 0).toFixed(2)),
                gamma: Number((s.greeks?.gamma * lot || 0).toFixed(4)),
                theta: Number((s.greeks?.theta * lot || 0).toFixed(2)),
                vega: Number((s.greeks?.vega * lot || 0).toFixed(2))
            }
        };
    }
}