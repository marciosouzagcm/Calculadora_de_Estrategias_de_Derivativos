import { DatabaseService } from '../config/database.js';
import { StrategyFactory } from '../factories/StrategyFactory.js';
import { OptionLeg, StrategyMetrics } from '../interfaces/Types.js';

/**
 * BOARDPRO V41.50 - Strategy Orchestrator
 * FIXED: Correção definitiva de escala decimal para strikes fracionados (Ex: BBAS3 0.25 -> 25.00)
 * BASE: V41.45 com reforço na lógica de magnitude proporcional ao Spot.
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

        // 1. MAPEAMENTO COM NORMALIZAÇÃO DE MAGNITUDE ABSOLUTA
        const options: OptionLeg[] = rawOptions.map((opt: any) => {
            if (!opt) return null;

            const cleanAtivo = (opt.ativo_subjacente || '').replace(/^\d+/, '');
            let strike = parseFloat(opt.strike || 0);
            
            // --- LÓGICA DE CORREÇÃO DE ESCALA (MAGNITUDE) ---
            if (strike > 0 && spotPrice > 0) {
                // Caso A: Strike vindo como 0.25 para spot 24.69 (Erro de centavos/escala)
                // Se o strike for menor que 5% do valor da ação, é um erro de escala.
                if (strike < (spotPrice * 0.05)) {
                    strike = strike * 100;
                }
                // Caso B: Strike vindo como 590 para spot 5.82 (Erro de escala inflada)
                else if (strike > (spotPrice * 10)) {
                    strike = strike / 100;
                }
                // Caso C: Ajuste para ativos de dezena (Ex: 2.50 para spot 25.00)
                else if (strike < (spotPrice / 5) && spotPrice > 10) {
                    strike = strike * 10;
                }
            }

            const tickerStr = opt.ticker || opt.symbol || '';
            const charSerie = tickerStr.charAt(4).toUpperCase();
            const tipoIdentificado = opt.tipo || (charSerie.match(/[A-L]/) ? 'CALL' : 'PUT');

            return {
                ...opt,
                ativo_subjacente: cleanAtivo,
                strike: strike,
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
        }).filter(o => o !== null && o.strike > (spotPrice * 0.1) && o.premio > 0) as OptionLeg[];

        const allStrategies = StrategyFactory.getAllStrategies();
        const bestOfEach = new Map<string, StrategyMetrics>();

        for (const strategy of allStrategies) {
            try {
                const combinations = strategy.calculateMetrics(options, spotPrice, this.FEE_PER_LEG);
                if (Array.isArray(combinations)) {
                    combinations.forEach(m => {
                        if (m && m.name && m.pernas) {
                            
                            const isArbitrageClean = this.validateDataIntegrity(m.pernas);

                            const seriesNoSetup = new Set(m.pernas.map(p => {
                                const t = p.derivative?.option_ticker || p.ticker || '';
                                return t.charAt(4);
                            }));

                            const isCalendarType = m.name.toLowerCase().includes('calendário') || 
                                                 m.name.toLowerCase().includes('calendar') ||
                                                 m.name.toLowerCase().includes('horizontal');

                            const isValidTemporal = isCalendarType ? seriesNoSetup.size > 1 : seriesNoSetup.size === 1;

                            if (isValidTemporal && isArbitrageClean) {
                                const formatted = this.formatForFrontend(m, lot, spotPrice);
                                
                                // Filtro de ROI Realista para evitar erros de prêmio (Vigilante)
                                if (formatted.roi < 15) { 
                                    const existing = bestOfEach.get(formatted.name);
                                    if (!existing || (formatted.roi > (existing.roi || 0))) {
                                        bestOfEach.set(formatted.name, formatted);
                                    }
                                }
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

    private static validateDataIntegrity(pernas: any[]): boolean {
        for (const p1 of pernas) {
            for (const p2 of pernas) {
                if (p1.tipo === 'CALL' && p2.tipo === 'CALL') {
                    if (p1.strike < p2.strike && p1.premio < p2.premio) return false;
                }
                if (p1.tipo === 'PUT' && p2.tipo === 'PUT') {
                    if (p1.strike > p2.strike && p1.premio < p2.premio) return false;
                }
            }
        }
        return true;
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
            breakEvenPoints: (s.breakEvenPoints || []).map(p => Number(Math.abs(p || 0).toFixed(2))),
            greeks: {
                delta: Number(((s.greeks?.delta || 0) * safeLot).toFixed(2)),
                gamma: Number(((s.greeks?.gamma || 0) * safeLot).toFixed(4)),
                theta: Number(((s.greeks?.theta || 0) * safeLot).toFixed(2)),
                vega: Number(((s.greeks?.vega || 0) * safeLot).toFixed(2))
            },
            pernas: pernas.map(p => {
                const ticker = p.derivative?.option_ticker || p.derivative?.symbol || p.ticker || '---';
                return {
                    ...p,
                    option_ticker: ticker,
                    serie: ticker.charAt(4),
                    qtd: safeLot * (p.multiplier || 1),
                    strike: p.strike || 0,
                    premio: p.premio || 0
                };
            })
        };
    }
}