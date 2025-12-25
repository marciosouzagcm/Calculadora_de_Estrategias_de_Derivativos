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

        return {
            ...s,
            exibir_roi: ((lucroLiquido / riscoTotal) * 100).toFixed(2) + '%',
            exibir_risco: riscoTotal,
            max_profit: profit, // Valor unitário para a boleta
            max_loss: loss,
            pernas: s.pernas.map(p => ({
                ...p,
                derivative: { 
                    ...p.derivative, 
                    strike: p.derivative.strike ?? 0, 
                    premio: p.derivative.premio ?? 0,
                    tipo: p.derivative.tipo // CALL ou PUT
                }
            }))
        };
    }

    static async getOportunidades(ticker: string, price: number, maxRR: number, lot: number): Promise<StrategyMetrics[]> {
        const csvPath = this.getCsvPath();
        const options = await readOptionsDataFromCSV(csvPath, price);
        const filtered = options.filter(o => o.ativo_subjacente.trim().toUpperCase() === ticker.trim().toUpperCase());
        
        if (filtered.length === 0) return [];

        const calculator = new PayoffCalculator(filtered, this.FEE_PER_LEG, lot);
        const allResults = calculator.findAndCalculateSpreads(price, maxRR);

        // FILTRO DE SEGURANÇA: Remove o que não cobre taxas
        const validResults = allResults.filter(s => {
            const fees = s.pernas.length * this.FEE_PER_LEG;
            return (Number(s.max_profit) * lot) - fees > 0;
        });

        const bestPerStrategy = new Map<string, StrategyMetrics>();
        validResults.forEach(current => {
            const existing = bestPerStrategy.get(current.name);
            if (!existing || this.calculateNumericROI(current, lot) > this.calculateNumericROI(existing, lot)) {
                bestPerStrategy.set(current.name, current);
            }
        });

        return Array.from(bestPerStrategy.values())
            .sort((a, b) => this.calculateNumericROI(b, lot) - this.calculateNumericROI(a, lot))
            .map(s => this.formatForFrontend(s, lot));
    }
}