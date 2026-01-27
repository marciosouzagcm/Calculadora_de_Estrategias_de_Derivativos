import { DatabaseService } from '../config/database.js';
import { StrategyFactory } from '../factories/StrategyFactory.js';
import { OptionLeg, StrategyMetrics } from '../interfaces/Types.js';

/**
 * BOARDPRO V41.10 - Strategy Orchestrator
 * FIX: Correção definitiva para escala de strikes CSAN3 (Série 500/600).
 */
export class StrategyService {
    private static readonly FEE_PER_LEG = 22.00; 

    static async getOportunidades(ticker: string, lot: number, manualPrice?: number): Promise<StrategyMetrics[]> {
        const cleanTicker = (ticker || '').trim().toUpperCase();
        if (!cleanTicker) return [];

        const spotPrice = manualPrice || await DatabaseService.getSpotPrice(cleanTicker);
        let rawOptions = await DatabaseService.getOptionsByTicker(cleanTicker);

        if ((!rawOptions || rawOptions.length === 0) && cleanTicker.length > 4) {
            const shortTicker = cleanTicker.substring(0, 4);
            rawOptions = await DatabaseService.getOptionsByTicker(shortTicker);
        }

        if (!rawOptions || rawOptions.length === 0) return [];

        // 1. MAPEAMENTO COM NORMALIZAÇÃO DE ESCALA B3
        const options: OptionLeg[] = rawOptions.map((opt: any) => {
            if (!opt) return null;

            const cleanAtivo = (opt.ativo_subjacente || '').replace(/^\d+/, '');
            let correctedStrike = parseFloat(opt.strike || 0);
            
            // --- LÓGICA DE NORMALIZAÇÃO DE STRIKE ---
            
            // Caso 1: CSAN3 (Séries 500, 600...)
            // Se strike >= 500, extraímos o final e ajustamos para a casa dos R$ 15,00 - R$ 16,00
            if (cleanAtivo.includes('CSAN') && correctedStrike >= 500) {
                const sufixo = correctedStrike % 100; // 510 -> 10, 520 -> 20
                correctedStrike = 15 + (sufixo / 100); // 15 + 0.10 = 15.10
                
                // Se o spot price estiver muito longe (ex: R$ 25), o código se ajusta
                if (spotPrice > 20) correctedStrike += 10; 
            }
            // Caso 2: BOVA11 (Strikes decimais importados como inteiros baixos)
            else if (cleanAtivo.includes('BOVA') && correctedStrike < 80 && correctedStrike > 0) {
                correctedStrike *= 10;
            }
            // Caso 3: Fallback para strikes multiplicados por 100 (ex: 1510 em vez de 15.10)
            else if (correctedStrike > (spotPrice * 10)) {
                correctedStrike = correctedStrike / 100;
            }

            // Identificação do Tipo pela letra da série (5ª posição)
            const tickerStr = opt.ticker || opt.symbol || '';
            const charSerie = tickerStr.charAt(4).toUpperCase();
            const tipoIdentificado = opt.tipo || (charSerie.match(/[A-L]/) ? 'CALL' : 'PUT');

            return {
                ...opt,
                ativo_subjacente: cleanAtivo,
                strike: correctedStrike,
                tipo: tipoIdentificado,
                premio: parseFloat(opt.premio || opt.premioPct || 0),
                vencimento: typeof opt.vencimento === 'string' ? opt.vencimento.split('T')[0] : opt.vencimento,
                gregas_unitarias: {
                    delta: parseFloat(opt.delta || 0),
                    gamma: parseFloat(opt.gamma || 0),
                    theta: parseFloat(opt.theta || 0),
                    vega: parseFloat(opt.vega || 0)
                }
            } as OptionLeg;
        }).filter(o => o !== null && o.strike > 0 && o.premio > 0) as OptionLeg[];

        const allStrategies = StrategyFactory.getAllStrategies();
        const bestOfEach = new Map<string, StrategyMetrics>();

        for (const strategy of allStrategies) {
            try {
                // Filtro pré-calculo: só tenta estratégias se houver CALLs e PUTs disponíveis
                const combinations = strategy.calculateMetrics(options, spotPrice, this.FEE_PER_LEG);
                if (Array.isArray(combinations)) {
                    combinations.forEach(m => {
                        if (m && m.name) {
                            const formatted = this.formatForFrontend(m, lot, spotPrice);
                            const existing = bestOfEach.get(formatted.name);
                            if (!existing || (formatted.roi > (existing.roi || 0))) {
                                bestOfEach.set(formatted.name, formatted);
                            }
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
        
        const unitPremium = Math.abs(Number(s.net_premium) || 0);
        const targetZeroZero = unitPremium + feePerUnit;

        const isUnlimited = s.max_profit === 'Ilimitado' || s.max_profit === Infinity || s.max_profit === 999999;
        const rawProfit = Number(s.max_profit) || 0;
        const rawLoss = Number(s.max_loss) || 0;

        const netProfit = isUnlimited ? Infinity : (rawProfit * safeLot) - feesTotal;
        const netRisk = (Math.abs(rawLoss) * safeLot) + feesTotal;

        let finalBE = s.breakEvenPoints || [];
        if (finalBE.length === 0 || finalBE.every(v => v === 0)) {
            const pivotStrike = (pernas[0] as any)?.strike || spotPrice;
            const isBull = s.name.includes('Bull') || (pernas[0] as any)?.tipo === 'CALL';
            finalBE = [isBull ? pivotStrike + targetZeroZero : pivotStrike - targetZeroZero];
        }

        return {
            ...s,
            roi: netRisk > 0 ? (Number(netProfit) / netRisk) : 0,
            exibir_lucro: isUnlimited ? 'ILIMITADO' : `R$ ${Math.abs(Number(netProfit)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            exibir_risco: `R$ ${Math.abs(netRisk).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            net_premium: Number(targetZeroZero.toFixed(4)), 
            max_profit: netProfit,
            max_loss: netRisk,
            lucro_maximo: netProfit,
            risco_maximo: netRisk,
            initialCashFlow: Math.abs(Number(((Number(s.initialCashFlow) || 0) * safeLot).toFixed(2))),
            breakEvenPoints: finalBE.map(p => Number(Math.abs(p || 0).toFixed(2))),
            greeks: {
                delta: Number(((s.greeks?.delta || 0) * safeLot).toFixed(2)),
                gamma: Number(((s.greeks?.gamma || 0) * safeLot).toFixed(4)),
                theta: Number(((s.greeks?.theta || 0) * safeLot).toFixed(2)),
                vega: Number(((s.greeks?.vega || 0) * safeLot).toFixed(2))
            },
            pernas: pernas.map(p => {
                const ticker = p.derivative?.option_ticker || p.derivative?.symbol || p.ticker || '---';
                const serie = ticker.length >= 5 ? ticker.charAt(4) : '---';
                return {
                    ...p,
                    option_ticker: ticker,
                    serie: serie,
                    qtd: safeLot * (p.multiplier || 1),
                    strike: p.strike || p.derivative?.strike || 0,
                    premio: p.premio || p.derivative?.premio || 0
                };
            })
        };
    }
}