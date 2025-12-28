import { DatabaseService } from '../config/database';
import { StrategyFactory } from '../factories/StrategyFactory';
import { StrategyMetrics } from '../interfaces/Types';

export class StrategyService {
    private static readonly FEE_PER_LEG = 1.10; 

    static async getOportunidades(ticker: string, lot: number, manualPrice?: number): Promise<StrategyMetrics[]> {
        const cleanTicker = ticker.trim().toUpperCase();
        
        // 1. Tenta buscar o preço spot
        const spotPrice = manualPrice || await DatabaseService.getSpotPrice(cleanTicker);
        
        // 2. Busca TODAS as opções do ativo
        let options = await DatabaseService.getOptionsByTicker(cleanTicker);

        // Fallback para Ticker de 4 dígitos (Ex: BBAS3 -> BBAS)
        if ((!options || options.length === 0) && cleanTicker.length > 4) {
            const shortTicker = cleanTicker.substring(0, 4);
            options = await DatabaseService.getOptionsByTicker(shortTicker);
        }

        console.log(`📊 DATABASE CHECK -> Ativo: ${cleanTicker} | Spot: ${spotPrice} | Opções encontradas: ${options?.length || 0}`);

        if (!options || options.length === 0) {
            console.error("❌ Erro Crítico: O Banco de Dados retornou ZERO linhas. Verifique a tabela 'opcoes'.");
            return [];
        }

        const allStrategies = StrategyFactory.getAllStrategies();
        const bestByCategory = new Map<string, StrategyMetrics>();

        for (const strategy of allStrategies) {
            try {
                // calculateMetrics é onde a mágica (e os filtros) acontecem
                const combinations = strategy.calculateMetrics(options, spotPrice, this.FEE_PER_LEG);
                
                const process = (m: StrategyMetrics) => {
                    const formatted = this.formatForFrontend(m, lot);
                    // REMOVEMOS TODOS OS FILTROS: Se a estratégia existe, ela vai para a tela
                    this.updateBestMap(bestByCategory, formatted);
                };

                if (Array.isArray(combinations)) {
                    combinations.forEach(process);
                } else if (combinations) {
                    process(combinations);
                }
            } catch (err) {
                console.error(`❌ Erro na estratégia ${strategy.constructor.name}:`, err);
            }
        }

        const finalResults = Array.from(bestByCategory.values())
            .sort((a, b) => (b.roi || 0) - (a.roi || 0));

        console.log(`✅ Resultado Final: ${finalResults.length} estratégias enviadas ao Front.`);
        return finalResults;
    }

    private static updateBestMap(map: Map<string, StrategyMetrics>, current: StrategyMetrics) {
        const existing = map.get(current.name);
        if (!existing || (current.roi || 0) > (existing.roi || 0)) {
            map.set(current.name, current);
        }
    }

    private static formatForFrontend(s: StrategyMetrics, lot: number): StrategyMetrics {
        const feesTotal = s.pernas.length * this.FEE_PER_LEG;
        const grossProfit = (Number(s.max_profit) || 0) * lot;
        const grossLoss = (Number(s.max_loss) || 0) * lot;
        
        const netProfit = grossProfit - feesTotal;
        const netRisk = Math.abs(grossLoss) + feesTotal;
        const finalROI = netRisk > 0 ? (netProfit / netRisk) : 0;

        return {
            ...s,
            roi: finalROI,
            exibir_roi: (finalROI * 100).toFixed(2) + '%',
            exibir_risco: Number(netRisk.toFixed(2)),
            max_profit: Number(netProfit.toFixed(2)),
            max_loss: Number(netRisk.toFixed(2)),
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

    private static ensureNumber(val: any): number {
        const n = parseFloat(val);
        return isNaN(n) ? 0 : n;
    }
}