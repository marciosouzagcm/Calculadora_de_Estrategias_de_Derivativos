import { PayoffCalculator } from './PayoffCalculator';
import { readOptionsDataFromCSV } from './csvReader';
import { StrategyMetrics } from '../interfaces/Types';
import * as path from 'path';
import * as fs from 'fs';

export class StrategyService {
    private static FEE_PER_LEG = 22.00;
    
    private static getCsvPath(): string {
        const pathsToTry = [
            path.join(process.cwd(), 'src', 'opcoes_final_tratado.csv'),
            path.join(process.cwd(), 'opcoes_final_tratado.csv'),
        ];
        for (const p of pathsToTry) {
            if (fs.existsSync(p)) return p;
        }
        throw new Error(`Arquivo csv não encontrado.`);
    }

    private static calculateNumericROI(s: StrategyMetrics, lot: number): number {
        const profit = typeof s.max_profit === 'number' ? s.max_profit : 0;
        const loss = typeof s.max_loss === 'number' ? s.max_loss : 0;
        const fees = s.pernas.length * this.FEE_PER_LEG;
        const lucroLiquido = (profit * lot) - fees;
        const riscoTotal = (Math.abs(loss) * lot) + fees;
        return riscoTotal <= 0 ? -1 : (lucroLiquido / riscoTotal);
    }

    private static formatForFrontend(s: StrategyMetrics, lot: number): StrategyMetrics {
        const profit = typeof s.max_profit === 'number' ? s.max_profit : 0;
        const loss = typeof s.max_loss === 'number' ? s.max_loss : 0;
        const fees = s.pernas.length * this.FEE_PER_LEG;
        const lucroLiquido = (profit * lot) - fees;
        const riscoTotal = (Math.abs(loss) * lot) + fees;

        // CRÍTICO: Garantimos que o objeto greeks retornado pelo PayoffCalculator seja preservado
        return {
            ...s,
            exibir_roi: ((lucroLiquido / riscoTotal) * 100).toFixed(2) + '%',
            exibir_risco: riscoTotal,
            max_profit: profit, 
            max_loss: loss,
            // Preserva as gregas calculadas anteriormente
            greeks: s.greeks ? {
                delta: s.greeks.delta,
                gamma: s.greeks.gamma,
                theta: s.greeks.theta,
                vega: s.greeks.vega
            } : { delta: 0, gamma: 0, theta: 0, vega: 0 },
            pernas: s.pernas.map(p => ({
                ...p,
                derivative: { 
                    ...p.derivative, 
                    strike: p.derivative.strike ?? 0, 
                    premio: p.derivative.premio ?? 0,
                    tipo: p.derivative.tipo,
                    // Garante que dados de volatilidade e tempo também sigam para o front se necessário
                    vol_implicita: p.derivative.vol_implicita ?? 0,
                    dias_uteis: p.derivative.dias_uteis ?? 0
                }
            }))
        };
    }

    static async getOportunidades(ticker: string, price: number, maxRR: number, lot: number): Promise<StrategyMetrics[]> {
        const csvPath = this.getCsvPath();
        
        // 1. Lê os dados do CSV
        const options = await readOptionsDataFromCSV(csvPath, price);
        
        // 2. Filtra pelo ativo desejado
        const filtered = options.filter(o => 
            o.ativo_subjacente.trim().toUpperCase() === ticker.trim().toUpperCase()
        );
        
        if (filtered.length === 0) return [];

        // 3. O PayoffCalculator agora é responsável por gerar as Gregas Net dentro de cada StrategyMetrics
        const calculator = new PayoffCalculator(filtered, this.FEE_PER_LEG, lot);
        const allResults = calculator.findAndCalculateSpreads(price, maxRR);

        // 4. Filtra estratégias que não pagam nem as taxas
        const validResults = allResults.filter(s => {
            const fees = s.pernas.length * this.FEE_PER_LEG;
            const profitValue = typeof s.max_profit === 'number' ? s.max_profit : 0;
            return (profitValue * lot) - fees > 0;
        });

        // 5. Seleciona a melhor variação de cada tipo de estratégia (Ex: a melhor Bull Call Spread)
        const bestPerStrategy = new Map<string, StrategyMetrics>();
        validResults.forEach(current => {
            const existing = bestPerStrategy.get(current.name);
            const currentROI = this.calculateNumericROI(current, lot);
            const existingROI = existing ? this.calculateNumericROI(existing, lot) : -Infinity;

            if (!existing || currentROI > existingROI) {
                bestPerStrategy.set(current.name, current);
            }
        });

        // 6. Formata e preserva as Gregas Net para o Frontend
        return Array.from(bestPerStrategy.values())
            .sort((a, b) => this.calculateNumericROI(b, lot) - this.calculateNumericROI(a, lot))
            .map(s => this.formatForFrontend(s, lot));
    }
}