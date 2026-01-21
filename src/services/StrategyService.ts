// Atualizado com extensões .js para compatibilidade ESM na Vercel
import { DatabaseService } from '../config/database.js';
import { StrategyFactory } from '../factories/StrategyFactory.js';
import { OptionLeg, StrategyMetrics } from '../interfaces/Types.js';

/**
 * BOARDPRO V40.0 - Strategy Orchestrator
 * Responsável por buscar, limpar e processar os modelos matemáticos.
 */
export class StrategyService {
    // Custo operacional por perna (Corretagem + Emolumentos estimativos)
    private static readonly FEE_PER_LEG = 22.00; 

    /**
     * Engine Principal: Retorna as melhores oportunidades filtradas entre os modelos.
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

        // 2. Normalização e Higienização dos Dados
        const options: OptionLeg[] = rawOptions.map((opt: any) => {
            const cleanAtivo = opt.ativo_subjacente.replace(/^\d+/, '');
            let correctedStrike = parseFloat(opt.strike);
            
            // Correção de escala para o ETF BOVA11 e ativos com erro de decimal
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

        // 3. Execução dos Modelos Matemáticos via Factory
        const allStrategies = StrategyFactory.getAllStrategies();
        const bestOfEach = new Map<string, StrategyMetrics>();

        for (const strategy of allStrategies) {
            try {
                // Passamos o FEE_PER_LEG para que a estratégia possa considerar no BE unitário se necessário
                const combinations = strategy.calculateMetrics(options, spotPrice, this.FEE_PER_LEG);
                
                if (Array.isArray(combinations)) {
                    combinations.forEach(m => {
                        const formatted = this.formatForFrontend(m, lot);
                        
                        const currentROI = Number(formatted.roi) || -999;
                        const existing = bestOfEach.get(formatted.name);

                        // Mantemos a melhor variação (maior ROI) de cada tipo de estratégia
                        if (!existing || currentROI > (Number(existing.roi) || -999)) {
                            bestOfEach.set(formatted.name, formatted);
                        }
                    });
                }
            } catch (err) {
                console.error(`❌ [ENGINE_ERROR] Falha no modelo ${strategy.name}:`, err);
            }
        }

        // 4. Ordenação Final por ROI
        return Array.from(bestOfEach.values())
            .sort((a, b) => (Number(b.roi) || 0) - (Number(a.roi) || 0));
    }

    /**
     * Transforma métricas brutas em valores monetários e formatados para o Dashboard.
     * Foca na "Fricção Operacional" (Taxas) e no impacto real sobre o capital (Lote).
     */
    private static formatForFrontend(s: StrategyMetrics, lot: number): StrategyMetrics {
        // Custos de Entrada e Saída (2 taxas por perna)
        const feesTotal = s.pernas.length * this.FEE_PER_LEG;
        const checkIlimitado = (val: any) => val === 'Ilimitado' || (typeof val === 'number' && val > 900000);

        // Valores Unitários (Vindos da StrategyFactory)
        let unitProfit = checkIlimitado(s.max_profit) ? 0 : Number(s.max_profit);
        let unitLoss = checkIlimitado(s.max_loss) ? 0 : Math.abs(Number(s.max_loss));

        // Cálculo Financeiro Total (Multiplicado pelo Lote)
        const netProfitValue = checkIlimitado(s.max_profit) ? 'Ilimitado' : (unitProfit * lot) - feesTotal;
        const netRiskValue = checkIlimitado(s.max_loss) ? 'Ilimitado' : (unitLoss * lot) + feesTotal;
        
        // ROI Realista: (Lucro Líquido / Risco Total Empenhado)
        let finalROI = 0;
        if (typeof netProfitValue === 'number' && typeof netRiskValue === 'number' && netRiskValue > 0) {
            finalROI = (netProfitValue / netRiskValue);
        }

        // Validação de Break-even (Garante que pontos de equilíbrio façam sentido)
        const validBE = s.breakEvenPoints ? s.breakEvenPoints.map(p => {
            const val = Number(p);
            return val > 0.01 ? Number(val.toFixed(2)) : val;
        }) : [];

        return {
            ...s,
            roi: finalROI,
            exibir_roi: checkIlimitado(s.max_profit) ? 'ILIMITADO' : (finalROI * 100).toFixed(2) + '%',
            
            exibir_lucro: typeof netProfitValue === 'string' ? 'ILIMITADO' : 
                `R$ ${netProfitValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                
            exibir_risco: typeof netRiskValue === 'string' ? 'ILIMITADO' : 
                `R$ ${netRiskValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            
            // Dados brutos atualizados para uso no PayoffChart e PDF
            taxas_ciclo: feesTotal, 
            max_profit: netProfitValue,
            max_loss: netRiskValue,
            lucro_maximo: netProfitValue,
            risco_maximo: netRiskValue,
            
            initialCashFlow: Number((s.initialCashFlow * lot).toFixed(2)),
            net_premium: Number((s.net_premium * lot).toFixed(2)),
            
            // Consolidação de Gregas (Portfolio Greeks - Exposição total em unidades do ativo)
            greeks: {
                delta: Number((s.greeks?.delta * lot || 0).toFixed(2)),
                gamma: Number((s.greeks?.gamma * lot || 0).toFixed(4)),
                theta: Number((s.greeks?.theta * lot || 0).toFixed(2)),
                vega: Number((s.greeks?.vega * lot || 0).toFixed(2))
            },
            breakEvenPoints: validBE
        };
    }
}