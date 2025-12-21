/**
 * @fileoverview Implementação das 4 Estratégias Verticais (Bull Call, Bear Call, Bull Put, Bear Put).
 * Centraliza o cálculo de risco limitado e lucro limitado.
 */
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, StrategyLeg, StrategyMetrics, ProfitLossValue } from '../interfaces/Types'

const LOT_SIZE = 100;
const FEES_PER_LEG_TOTAL = 0.50; 

abstract class VerticalSpreadBase implements IStrategy {
    abstract readonly name: string;
    abstract readonly isBull: boolean; 
    abstract readonly isCall: boolean; 
    readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL'; 
    
    constructor() {
        this.marketView = this.isBull ? 'ALTA' : 'BAIXA';
    }

    getDescription(): string {
        const type = this.isCall ? 'CALL' : 'PUT';
        const direction = this.isBull ? 'ALTA' : 'BAIXA';
        const nature = this.isBull === this.isCall ? 'DÉBITO' : 'CRÉDITO';
        return `Trava de ${type} (${direction}). Operação de ${nature} com risco e lucro definidos pela largura entre strikes.`;
    }
    
    getLegCount(): number { return 2; }
    
    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number = FEES_PER_LEG_TOTAL): StrategyMetrics | null {
        if (legData.length !== 2) return null;

        const expectedType = this.isCall ? 'CALL' : 'PUT';
        const validLegs = legData
            .filter(leg => leg.tipo === expectedType && leg.strike !== null)
            .sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0)); 

        if (validLegs.length !== 2) return null;

        const [Leg1_K_low, Leg2_K_high] = validLegs;
        const width = Leg2_K_high.strike! - Leg1_K_low.strike!;

        // Determinar pernas baseadas na estratégia
        let kCompra: OptionLeg, kVenda: OptionLeg;
        
        if (this.isBull) {
            // Bull: Compra o menor strike (Call) ou Vende o maior strike (Put)
            [kCompra, kVenda] = this.isCall ? [Leg1_K_low, Leg2_K_high] : [Leg1_K_low, Leg2_K_high];
        } else {
            // Bear: Vende o menor strike (Call) ou Compra o maior strike (Put)
            [kCompra, kVenda] = this.isCall ? [Leg2_K_high, Leg1_K_low] : [Leg2_K_high, Leg1_K_low];
        }

        const netPremiumBruto = kCompra.premio - kVenda.premio;
        const natureza: NaturezaOperacao = netPremiumBruto > 0 ? 'DÉBITO' : 'CRÉDITO';
        const totalFeesUnitario = (feePerLeg * 2) / LOT_SIZE;

        // Cálculos de Risco/Lucro
        let lucroMaximo: number, riscoMaximo: number;
        if (natureza === 'DÉBITO') {
            riscoMaximo = netPremiumBruto + totalFeesUnitario;
            lucroMaximo = width - netPremiumBruto;
        } else {
            lucroMaximo = Math.abs(netPremiumBruto) - totalFeesUnitario;
            riscoMaximo = width - Math.abs(netPremiumBruto);
        }

        // Breakeven
        // Call: Strike Baixo + Prêmio Bruto | Put: Strike Alto - Prêmio Bruto
        const breakeven = this.isCall ? Leg1_K_low.strike! + netPremiumBruto : Leg2_K_high.strike! + netPremiumBruto;

        const greeks: Greeks = {
            delta: (kCompra.gregas_unitarias.delta ?? 0) - (kVenda.gregas_unitarias.delta ?? 0),
            gamma: (kCompra.gregas_unitarias.gamma ?? 0) - (kVenda.gregas_unitarias.gamma ?? 0),
            theta: (kCompra.gregas_unitarias.theta ?? 0) - (kVenda.gregas_unitarias.theta ?? 0), 
            vega: (kCompra.gregas_unitarias.vega ?? 0) - (kVenda.gregas_unitarias.vega ?? 0), 
        };

        return {
            name: this.name,
            asset: kCompra.ativo_subjacente,
            asset_price: assetPrice,
            spread_type: this.isCall ? 'VERTICAL_CALL' : 'VERTICAL_PUT',
            expiration: kCompra.vencimento,
            dias_uteis: kCompra.dias_uteis ?? 0,
            strike_description: `Strikes: ${Leg1_K_low.strike?.toFixed(2)} / ${Leg2_K_high.strike?.toFixed(2)}`,
            
            net_premium: netPremiumBruto,
            cash_flow_liquido: (natureza === 'DÉBITO' ? -riscoMaximo : lucroMaximo) * LOT_SIZE,
            initialCashFlow: (natureza === 'DÉBITO' ? -netPremiumBruto : Math.abs(netPremiumBruto)) * LOT_SIZE,
            natureza,
            
            risco_maximo: riscoMaximo,
            lucro_maximo: lucroMaximo,
            max_profit: lucroMaximo,
            max_loss: -riscoMaximo,

            breakEvenPoints: [breakeven],
            breakeven_low: breakeven,
            breakeven_high: breakeven,
            width,
            
            pernas: [
                { direction: 'COMPRA', multiplier: 1, derivative: kCompra, display: `C K${kCompra.strike}` },
                { direction: 'VENDA', multiplier: 1, derivative: kVenda, display: `V K${kVenda.strike}` }
            ],
            greeks,
            score: (lucroMaximo / riscoMaximo) * 10
        } as StrategyMetrics;
    }

    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        const strikes = metrics.pernas.map(p => p.derivative.strike!).sort((a,b) => a - b);
        const [kLow, kHigh] = strikes;
        const range = kHigh - kLow;
        const start = kLow - range;
        const end = kHigh + range;
        
        const data = [];
        for (let sT = start; sT <= end; sT += range / 20) {
            let pnl = 0;
            for (const p of metrics.pernas) {
                const val = p.derivative.tipo === 'CALL' ? Math.max(0, sT - p.derivative.strike!) : Math.max(0, p.derivative.strike! - sT);
                pnl += (p.direction === 'COMPRA' ? 1 : -1) * val;
            }
            // Adiciona o cash flow inicial unitário e multiplica pelo lote
            const finalPnl = (pnl + (metrics.initialCashFlow! / LOT_SIZE)) * LOT_SIZE;
            data.push({ assetPrice: sT, profitLoss: finalPnl });
        }
        return data;
    }
}

export class BullCallSpread extends VerticalSpreadBase { readonly name = 'Bull Call Spread'; readonly isBull = true; readonly isCall = true; }
export class BearCallSpread extends VerticalSpreadBase { readonly name = 'Bear Call Spread'; readonly isBull = false; readonly isCall = true; }
export class BullPutSpread extends VerticalSpreadBase { readonly name = 'Bull Put Spread'; readonly isBull = true; readonly isCall = false; }
export class BearPutSpread extends VerticalSpreadBase { readonly name = 'Bear Put Spread'; readonly isBull = false; readonly isCall = false; }