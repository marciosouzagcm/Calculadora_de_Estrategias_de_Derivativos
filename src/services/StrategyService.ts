import { DatabaseService } from '../config/database';
import { StrategyFactory } from '../factories/StrategyFactory';
import { OptionLeg, StrategyMetrics } from '../interfaces/Types';

export class StrategyService {
    // Taxa de corretagem/B3 por perna (ajuste conforme sua realidade)
    private static readonly FEE_PER_LEG = 22.00; 

    static async getOportunidades(ticker: string, lot: number, manualPrice?: number): Promise<StrategyMetrics[]> {
        const cleanTicker = ticker.trim().toUpperCase();
        const spotPrice = manualPrice || await DatabaseService.getSpotPrice(cleanTicker);
        let rawOptions = await DatabaseService.getOptionsByTicker(cleanTicker);

        if (!rawOptions || rawOptions.length === 0) return [];

        // Normalização dos dados vindos do banco
        const options: OptionLeg[] = rawOptions.map((opt: any) => ({
            ...opt,
            strike: parseFloat(opt.strike || 0),
            premio: parseFloat(opt.premioPct || opt.premio || 0),
            tipo: (opt.tipo || '').toUpperCase(),
            vencimento: typeof opt.vencimento === 'string' ? opt.vencimento.split('T')[0] : opt.vencimento,
            dias_uteis: parseInt(opt.dias_uteis || 20),
            gregas_unitarias: {
                delta: parseFloat(opt.delta || 0),
                gamma: parseFloat(opt.gamma || 0),
                theta: parseFloat(opt.theta || 0),
                vega: parseFloat(opt.vega || 0)
            }
        }));

        const allStrategies = StrategyFactory.getAllStrategies();
        const bestOfEach = new Map<string, StrategyMetrics>();
        
        // Relatório interno para o Console
        const report = { encontradas: [] as string[], falhas: [] as string[] };

        for (const strategy of allStrategies) {
            try {
                const combinations = strategy.calculateMetrics(options, spotPrice, this.FEE_PER_LEG);
                
                if (Array.isArray(combinations) && combinations.length > 0) {
                    report.encontradas.push(strategy.name);
                    combinations.forEach(m => {
                        const formatted = this.formatForFrontend(m, lot);
                        const existing = bestOfEach.get(formatted.name);
                        
                        // Mantém apenas a melhor variação (maior ROI) de cada uma das 13 estratégias
                        if (!existing || (formatted.roi ?? -999) > (existing.roi ?? -999)) {
                            bestOfEach.set(formatted.name, formatted);
                        }
                    });
                } else {
                    report.falhas.push(`${strategy.name} (0 combinações)`);
                }
            } catch (err: any) {
                report.falhas.push(`${strategy.name} (Erro: ${err.message})`);
            }
        }

        // Exibe o diagnóstico no terminal
        console.log(`\n--- RELATÓRIO DO SCANNER ---`);
        console.log(`✅ ATIVAS (${report.encontradas.length}): ${report.encontradas.join(', ')}`);
        if (report.falhas.length > 0) {
            console.log(`⚠️ DESCARTADAS (${report.falhas.length}): ${report.falhas.join(' | ')}`);
        }
        console.log(`----------------------------\n`);

        return Array.from(bestOfEach.values())
            .sort((a, b) => (Number(b.roi) || 0) - (Number(a.roi) || 0));
    }

    private static formatForFrontend(s: StrategyMetrics, lot: number): StrategyMetrics {
        const feesTotal = s.pernas.length * this.FEE_PER_LEG;
        const isIlimitado = (val: any) => 
            val === 'Ilimitado' || val === 'Ilimitada' || (typeof val === 'number' && Math.abs(val) > 90000);

        // Nomes amigáveis para o Front-end identificar
        let finalName = s.name;
        if (s.name.includes("Rochedo")) finalName = "Rochedo";
        if (s.name.includes("Booster")) finalName = "Booster";

        // Cálculo Financeiro (Bruto Unitário -> Líquido Lote)
        const unitProfit = typeof s.max_profit === 'number' ? s.max_profit : 0;
        const unitLoss = typeof s.max_loss === 'number' ? Math.abs(s.max_loss) : 0;

        const netProfit = isIlimitado(s.max_profit) ? 'Ilimitado' : (unitProfit * lot) - feesTotal;
        const netRisk = isIlimitado(s.max_loss) ? 'Ilimitado' : (unitLoss * lot) + feesTotal;

        // Cálculo do ROI (Lucro Líquido / Risco Total)
        let finalROI = 0;
        if (isIlimitado(s.max_profit)) {
            finalROI = 999; 
        } else if (typeof netProfit === 'number' && typeof netRisk === 'number') {
            finalROI = netRisk > 0 ? (netProfit / netRisk) : 0;
        }

        return {
            ...s,
            name: finalName,
            roi: finalROI,
            exibir_roi: isIlimitado(s.max_profit) ? 'Ilimitado' : (finalROI * 100).toFixed(1) + '%',
            exibir_risco: isIlimitado(s.max_loss) ? 'Ilimitado' : Number(Number(netRisk).toFixed(2)),
            max_profit: netProfit,
            max_loss: netRisk,
            lucro_maximo: netProfit,
            risco_maximo: netRisk,
            taxas_ciclo: feesTotal,
            initialCashFlow: Number((s.initialCashFlow * lot).toFixed(2)),
            greeks: {
                delta: Number((s.greeks?.delta || 0).toFixed(4)),
                gamma: Number((s.greeks?.gamma || 0).toFixed(4)),
                theta: Number((s.greeks?.theta || 0).toFixed(4)),
                vega: Number((s.greeks?.vega || 0).toFixed(4))
            }
        };
    }
}