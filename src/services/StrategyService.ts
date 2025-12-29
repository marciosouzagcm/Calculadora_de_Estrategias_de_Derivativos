import { DatabaseService } from '../config/database';
import { StrategyFactory } from '../factories/StrategyFactory';
import { OptionLeg, StrategyMetrics } from '../interfaces/Types';

export class StrategyService {
    // ATUALIZADO: Taxa de R$ 22,00 por perna (corretagem cheia)
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
            
            if (cleanAtivo.includes('BOVA') && correctedStrike < 80) {
                correctedStrike = correctedStrike * 10;
            }

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
                // Passamos a taxa de 22.00 para o cálculo interno da estratégia
                const combinations = strategy.calculateMetrics(options, spotPrice, this.FEE_PER_LEG);
                
                if (Array.isArray(combinations)) {
                    combinations.forEach(m => {
                        const formatted = this.formatForFrontend(m, lot);
                        
                        const currentROI = formatted.roi ?? -999;
                        const existing = bestOfEach.get(formatted.name);

                        // Garante apenas 1 estratégia de cada tipo (a melhor)
                        if (!existing || currentROI > (existing.roi ?? -999)) {
                            bestOfEach.set(formatted.name, formatted);
                        }
                    });
                }
            } catch (err) {
                console.error(`❌ Erro em ${strategy.name}:`, err);
            }
        }

        return Array.from(bestOfEach.values())
            .sort((a, b) => (Number(b.roi) || 0) - (Number(a.roi) || 0));
    }

    private static formatForFrontend(s: StrategyMetrics, lot: number): StrategyMetrics {
        // Taxa Total = R$ 22,00 * quantidade de pernas
        const feesTotal = s.pernas.length * this.FEE_PER_LEG;
        const isIlimitado = (val: any) => val === 'Ilimitado' || (typeof val === 'number' && val > 90000);

        // Ajuste financeiro baseado no Lote
        let profitRaw = isIlimitado(s.max_profit) ? 10 : Number(s.max_profit);
        let lossRaw = isIlimitado(s.max_loss) ? 50 : Math.abs(Number(s.max_loss));

        const netProfit = (profitRaw * lot) - feesTotal;
        const netRisk = (lossRaw * lot) + feesTotal;
        const finalROI = netRisk > 0 ? (netProfit / netRisk) : 0;

        return {
            ...s,
            roi: finalROI,
            exibir_roi: isIlimitado(s.max_profit) ? 'Ilimitado' : (finalROI * 100).toFixed(2) + '%',
            exibir_risco: isIlimitado(s.max_loss) ? 'Ilimitado' : Number(netRisk.toFixed(2)),
            taxas_ciclo: feesTotal, 
            max_profit: isIlimitado(s.max_profit) ? 'Ilimitado' : Number(netProfit.toFixed(2)),
            max_loss: isIlimitado(s.max_loss) ? 'Ilimitado' : Number(netRisk.toFixed(2)),
            lucro_maximo: isIlimitado(s.max_profit) ? 'Ilimitado' : Number(netProfit.toFixed(2)),
            risco_maximo: isIlimitado(s.max_loss) ? 'Ilimitado' : Number(netRisk.toFixed(2)),
            initialCashFlow: Number((s.initialCashFlow * lot).toFixed(2)),
            net_premium: Number((s.net_premium * lot).toFixed(2)),
            greeks: {
                delta: Number((s.greeks?.delta || 0).toFixed(4)),
                gamma: Number((s.greeks?.gamma || 0).toFixed(4)),
                theta: Number((s.greeks?.theta || 0).toFixed(4)),
                vega: Number((s.greeks?.vega || 0).toFixed(4))
            },
            breakEvenPoints: s.breakEvenPoints ? s.breakEvenPoints.map(p => Number(p.toFixed(2))) : []
        };
    }
}