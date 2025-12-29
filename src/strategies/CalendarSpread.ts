import { IStrategy } from '../interfaces/IStrategy';
import { NaturezaOperacao, OptionLeg, StrategyMetrics } from '../interfaces/Types';

export class CalendarSpread implements IStrategy {
    public readonly name: string = 'Calendar Spread (Horizontal)';
    public readonly marketView: 'NEUTRA' = 'NEUTRA';

    calculateMetrics(allOptions: OptionLeg[], assetPrice: number, feePerLeg: number): StrategyMetrics[] {
        const results: StrategyMetrics[] = [];
        
        for (let i = 0; i < allOptions.length; i++) {
            for (let j = 0; j < allOptions.length; j++) {
                if (i === j) continue;

                const legShort = allOptions[i]; // Opção que vence antes
                const legLong = allOptions[j];  // Opção que vence depois

                if (legShort.tipo !== legLong.tipo || legShort.tipo === 'SUBJACENTE') continue;

                // TOLERÂNCIA DE STRIKE: Aceita até 0.5% de diferença (ex: 30.12 e 30.15)
                const strikeDiff = Math.abs((legShort.strike || 0) - (legLong.strike || 0));
                if (strikeDiff > (legShort.strike! * 0.006)) continue;

                const dateShort = new Date(legShort.vencimento).getTime();
                const dateLong = new Date(legLong.vencimento).getTime();
                
                // Valida se os vencimentos são realmente diferentes e qual é a curta/longa
                if (dateShort >= dateLong) continue;

                const netCost = legLong.premio - legShort.premio;
                if (netCost <= 0.05) continue;

                results.push({
                    name: this.name,
                    asset: legLong.ativo_subjacente,
                    asset_price: assetPrice,
                    spread_type: 'CALENDAR',
                    expiration: String(legShort.vencimento).split(/[T ]/)[0],
                    strike_description: `K: ${legLong.strike?.toFixed(2)} (${legLong.tipo})`,
                    net_premium: Number((-netCost).toFixed(2)),
                    natureza: 'DÉBITO' as NaturezaOperacao,
                    max_profit: Number((netCost * 0.6).toFixed(2)), // Estimativa de valorização
                    max_loss: Number(netCost.toFixed(2)),
                    roi: 0.6,
                    pernas: [
                        { direction: 'VENDA', multiplier: 1, derivative: legShort, display: `V-${legShort.option_ticker} (${legShort.vencimento})` },
                        { direction: 'COMPRA', multiplier: 1, derivative: legLong, display: `C-${legLong.option_ticker} (${legLong.vencimento})` }
                    ]
                } as any);
            }
        }
        return results;
    }

    getLegCount(): number { return 2; }
    generatePayoff(): any[] { return []; }
    getDescription(): string { return "Trava de Linha"; }
}