/**
 * @fileoverview Implementação consolidada das Estratégias Straddle.
 * Característica: 1 CALL e 1 PUT no mesmo STRIKE e VENCIMENTO.
 */
import { IStrategy } from '../interfaces/IStrategy';
import { Greeks, NaturezaOperacao, OptionLeg, StrategyLeg, StrategyMetrics, ProfitLossValue } from '../interfaces/Types'

const LOT_SIZE = 100;

function generateDisplay(leg: OptionLeg, direction: 'COMPRA' | 'VENDA', K: number): string {
    const typeInitial = leg.tipo === 'CALL' ? 'C' : 'P';
    const action = direction === 'COMPRA' ? 'C' : 'V';
    return `${action}-${typeInitial} ${leg.ativo_subjacente} K${K.toFixed(2)}`;
}

abstract class StraddleBase implements IStrategy {
    abstract readonly name: string;
    abstract readonly isLong: boolean;
    readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL';

    constructor() {
        // A visão de mercado é definida na inicialização baseada na direção
        this.marketView = this.isLong ? 'VOLÁTIL' : 'NEUTRA';
    }

    getDescription(): string {
        return this.isLong 
            ? 'Compra de Call e Put (mesmo strike). Lucra com movimentos fortes para qualquer lado.'
            : 'Venda de Call e Put (mesmo strike). Lucra se o ativo permanecer estável.';
    }

    getLegCount(): number { return 2; }

    calculateMetrics(legData: OptionLeg[], assetPrice: number, feePerLeg: number = 0.50): StrategyMetrics | null {
        if (legData.length !== 2) return null;
        
        const callLeg = legData.find(leg => leg.tipo === 'CALL');
        const putLeg = legData.find(leg => leg.tipo === 'PUT');

        if (!callLeg || !putLeg || callLeg.strike !== putLeg.strike || callLeg.vencimento !== putLeg.vencimento) {
            return null;
        }

        const K = callLeg.strike!;
        const netPremiumUnitario = callLeg.premio + putLeg.premio;
        const totalFeesUnitario = (feePerLeg * 2) / LOT_SIZE; 
        
        let cashFlowLiquidoUnitario: number;
        let natureza: NaturezaOperacao;
        const multiplier = this.isLong ? 1 : -1;

        if (this.isLong) {
            cashFlowLiquidoUnitario = -(netPremiumUnitario + totalFeesUnitario);
            natureza = 'DÉBITO';
        } else {
            cashFlowLiquidoUnitario = netPremiumUnitario - totalFeesUnitario;
            natureza = 'CRÉDITO';
        }

        const breakeven_high = K + netPremiumUnitario;
        const breakeven_low = K - netPremiumUnitario;

        // Cálculo de Gregas (Invertendo o sinal para posições vendidas)
        const netGregas: Greeks = {
            delta: multiplier * ((callLeg.gregas_unitarias.delta ?? 0) + (putLeg.gregas_unitarias.delta ?? 0)),
            gamma: multiplier * ((callLeg.gregas_unitarias.gamma ?? 0) + (putLeg.gregas_unitarias.gamma ?? 0)),
            theta: multiplier * ((callLeg.gregas_unitarias.theta ?? 0) + (putLeg.gregas_unitarias.theta ?? 0)), 
            vega: multiplier * ((callLeg.gregas_unitarias.vega ?? 0) + (putLeg.gregas_unitarias.vega ?? 0)), 
        };

        const pernas: StrategyLeg[] = [
            { direction: this.isLong ? 'COMPRA' : 'VENDA', multiplier: 1, derivative: callLeg, display: generateDisplay(callLeg, this.isLong ? 'COMPRA' : 'VENDA', K) },
            { direction: this.isLong ? 'COMPRA' : 'VENDA', multiplier: 1, derivative: putLeg, display: generateDisplay(putLeg, this.isLong ? 'COMPRA' : 'VENDA', K) },
        ];

        return {
            name: this.name,
            asset: callLeg.ativo_subjacente,
            asset_price: assetPrice,
            spread_type: 'STRADDLE',
            expiration: callLeg.vencimento,
            dias_uteis: callLeg.dias_uteis ?? 0,
            strike_description: `K: R$ ${K.toFixed(2)}`,
            
            net_premium: multiplier * netPremiumUnitario,
            cash_flow_bruto: multiplier * netPremiumUnitario * LOT_SIZE,
            cash_flow_liquido: cashFlowLiquidoUnitario * LOT_SIZE,
            initialCashFlow: cashFlowLiquidoUnitario * LOT_SIZE,
            natureza: natureza,
            
            risco_maximo: this.isLong ? Math.abs(cashFlowLiquidoUnitario) : Infinity,
            lucro_maximo: this.isLong ? Infinity : cashFlowLiquidoUnitario,
            
            breakEvenPoints: [breakeven_low, breakeven_high],
            breakeven_low,
            breakeven_high, 
            
            minPriceToMaxProfit: K, 
            maxPriceToMaxProfit: K, 
            
            pernas,
            greeks: netGregas,
            score: this.isLong ? (1 / netPremiumUnitario) * 100 : (cashFlowLiquidoUnitario / K) * 1000,
        } as StrategyMetrics;
    }
    
    generatePayoff(metrics: StrategyMetrics): Array<{ assetPrice: number; profitLoss: number }> {
        const K = metrics.pernas[0].derivative.strike as number;
        const payoffData: Array<{ assetPrice: number; profitLoss: number }> = [];
        
        // Define o range do gráfico baseado nos Breakevens (40% de margem extra)
        const rangeWidth = (metrics.breakeven_high! - metrics.breakeven_low!) * 1.4;
        const startPrice = Math.max(0, metrics.breakeven_low! - rangeWidth / 2);
        const endPrice = metrics.breakeven_high! + rangeWidth / 2;
        const step = (endPrice - startPrice) / 60;

        for (let sT = startPrice; sT <= endPrice; sT += step) {
            let totalIntrinsic = 0;
            for (const perna of metrics.pernas) {
                const isCall = perna.derivative.tipo === 'CALL';
                const val = isCall ? Math.max(0, sT - K) : Math.max(0, K - sT);
                totalIntrinsic += (perna.direction === 'COMPRA' ? 1 : -1) * val;
            }
            
            // P/L = (Valor Intrínseco + Fluxo de Caixa Unitário) * Lote
            const plTotal = (totalIntrinsic + (metrics.initialCashFlow! / LOT_SIZE)) * LOT_SIZE;
            payoffData.push({ assetPrice: sT, profitLoss: plTotal });
        }
        return payoffData; 
    }
}

export class LongStraddle extends StraddleBase {
    readonly name = 'Long Straddle (Compra de Volatilidade)';
    readonly isLong = true;
}

export class ShortStraddle extends StraddleBase {
    readonly name = 'Short Straddle (Venda de Volatilidade)';
    readonly isLong = false;
}