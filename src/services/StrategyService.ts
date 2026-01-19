import { DatabaseService } from '../config/database';
import { StrategyFactory } from '../factories/StrategyFactory';
import { OptionLeg, StrategyMetrics } from '../interfaces/Types';

/**
 * BOARDPRO V40.0 - Strategy Orchestrator
 * Responsável por buscar, limpar e processar os modelos matemáticos.
 */
export class StrategyService {
    // Custo operacional por perna (Corretagem + Emolumentos estimativos)
    private static readonly FEE_PER_LEG = 22.00; 

    /**
     * Engine Principal: Retorna as melhores oportunidades filtradas entre os 13 modelos.
     */
    static async getOportunidades(ticker: string, lot: number, manualPrice?: number): Promise<StrategyMetrics[]> {
        const cleanTicker = ticker.trim().toUpperCase();
        
        // 1. Obtenção de Dados de Mercado
        const spotPrice = manualPrice || await DatabaseService.getSpotPrice(cleanTicker);
        let rawOptions = await DatabaseService.getOptionsByTicker(cleanTicker);

        // Fallback para tickers de 4 dígitos (ex: PETR em vez de PETR4)
        if ((!rawOptions || rawOptions.length === 0) && cleanTicker.length > 4) {
            const shortTicker = cleanTicker.substring(0, 4);
            rawOptions = await DatabaseService.getOptionsByTicker(shortTicker);
        }

        if (!rawOptions || rawOptions.length === 0) return [];

        // 2. Normalização e Higienização dos Dados da TiDB
        const options: OptionLeg[] = rawOptions.map((opt: any) => {
            const cleanAtivo = opt.ativo_subjacente.replace(/^\d+/, '');
            let correctedStrike = parseFloat(opt.strike);
            
            // Correção de escala para o ETF BOVA11 se necessário
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

        // 3. Execução dos 13 Modelos Matemáticos via Factory
        const allStrategies = StrategyFactory.getAllStrategies();
        const bestOfEach = new Map<string, StrategyMetrics>();

        for (const strategy of allStrategies) {
            try {
                // O cálculo interno já deve receber a taxa para ajustar o Break-even
                const combinations = strategy.calculateMetrics(options, spotPrice, this.FEE_PER_LEG);
                
                if (Array.isArray(combinations)) {
                    combinations.forEach(m => {
                        const formatted = this.formatForFrontend(m, lot);
                        
                        // Lógica de Seleção: Mantemos apenas a melhor variação (maior ROI) de cada tipo de estratégia
                        const currentROI = Number(formatted.roi) || -999;
                        const existing = bestOfEach.get(formatted.name);

                        if (!existing || currentROI > (Number(existing.roi) || -999)) {
                            bestOfEach.set(formatted.name, formatted);
                        }
                    });
                }
            } catch (err) {
                console.error(`[ENGINE_ERROR] Falha no modelo ${strategy.name}:`, err);
            }
        }

        // 4. Ordenação Final por Lucratividade Relativa (ROI)
        return Array.from(bestOfEach.values())
            .sort((a, b) => (Number(b.roi) || 0) - (Number(a.roi) || 0));
    }

    /**
     * Transforma métricas brutas em valores monetários e formatados para o Dashboard.
     */
    private static formatForFrontend(s: StrategyMetrics, lot: number): StrategyMetrics {
        const feesTotal = s.pernas.length * this.FEE_PER_LEG;
        const checkIlimitado = (val: any) => val === 'Ilimitado' || (typeof val === 'number' && val > 900000);

        // Cálculo de Lucro e Risco Líquido (Pós-Taxas e Multiplicado pelo Lote)
        let rawProfit = checkIlimitado(s.max_profit) ? 0 : Number(s.max_profit);
        let rawLoss = checkIlimitado(s.max_loss) ? 0 : Math.abs(Number(s.max_loss));

        const netProfitValue = (rawProfit * lot) - feesTotal;
        const netRiskValue = (rawLoss * lot) + feesTotal;
        
        // ROI Realista: Lucro Líquido / Risco Total Empenhado
        const finalROI = netRiskValue > 0 ? (netProfitValue / netRiskValue) : 0;

        return {
            ...s,
            roi: finalROI,
            exibir_roi: checkIlimitado(s.max_profit) ? 'ILIMITADO' : (finalROI * 100).toFixed(2) + '%',
            exibir_lucro: checkIlimitado(s.max_profit) ? 'ILIMITADO' : `R$ ${netProfitValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
            exibir_risco: checkIlimitado(s.max_loss) ? 'ILIMITADO' : `R$ ${netRiskValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
            
            // Atualização de campos numéricos para o PayoffChart e PDF
            taxas_ciclo: feesTotal, 
            max_profit: checkIlimitado(s.max_profit) ? 'Ilimitado' : netProfitValue,
            max_loss: checkIlimitado(s.max_loss) ? 'Ilimitado' : netRiskValue,
            lucro_maximo: checkIlimitado(s.max_profit) ? 'Ilimitado' : netProfitValue,
            risco_maximo: checkIlimitado(s.max_loss) ? 'Ilimitado' : netRiskValue,
            
            initialCashFlow: Number((s.initialCashFlow * lot).toFixed(2)),
            net_premium: Number((s.net_premium * lot).toFixed(2)),
            
            // Consolidação de Gregas da Carteira (Portfolio Greeks)
            greeks: {
                delta: Number((s.greeks?.delta || 0).toFixed(4)),
                gamma: Number((s.greeks?.gamma || 0).toFixed(4)),
                theta: Number((s.greeks?.theta || 0).toFixed(4)),
                vega: Number((s.greeks?.vega || 0).toFixed(4))
            },
            breakEvenPoints: s.breakEvenPoints ? s.breakEvenPoints.map(p => Number(Number(p).toFixed(2))) : []
        };
    }
}