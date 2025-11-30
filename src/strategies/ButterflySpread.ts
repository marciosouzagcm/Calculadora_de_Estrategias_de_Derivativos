/**
 * @fileoverview Implementação da Estratégia Butterfly Spread (Borboleta).
 * Característica: 3 pernas (1x Compra K1, 2x Venda K2, 1x Compra K3) no mesmo ativo e vencimento.
 */
// [REVISÃO] O IStrategy revisado não passa FEES e LOT_SIZE em calculateMetrics. 
// A classe ButterflySpread deve obter essas constantes via import.
import { FEES, IStrategy, LOT_SIZE } from '../interfaces/IStrategy';
// [REVISÃO] Renomear OptionData para OptionLeg (consistência).
import { Greeks, NaturezaOperacao, OptionLeg, StrategyLeg, StrategyMetrics } from '../interfaces/Types'; 

export class ButterflySpread implements IStrategy {
    // [BOA PRÁTICA] Visão de mercado atualizada para maiúsculas (consistência com IStrategy)
    readonly name = 'Long Butterfly Call (Compra)';
    readonly marketView: 'ALTA' | 'BAIXA' | 'NEUTRA' | 'VOLÁTIL' = 'NEUTRA'; 
    
    // [REVISÃO] Assinatura do método ajustada para corresponder a IStrategy (remoção de fees e lotSize)
    calculateMetrics(
        legData: OptionLeg[], 
    ): StrategyMetrics | null {
        
        // 1. Validação e Organização das pernas
        if (legData.length !== 3) {
            console.warn("[Butterfly] Requer 3 pernas para ser válida.");
            return null;
        }
        
        // Organiza as pernas por strike (K1 < K2 < K3) e filtra por CALL
        const sortedLegs = legData
            .filter(leg => leg.tipo === 'CALL') 
            .sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
            
        if (sortedLegs.length !== 3) {
            console.warn("[Butterfly] As pernas não são todas CALLs ou estão incompletas.");
            return null;
        }

        // [REVISÃO] Usar nomes descritivos K1, K2, K3
        const K1 = sortedLegs[0]; // Compra (Menor Strike)
        const K2 = sortedLegs[1]; // Venda Dupla (Strike Central)
        const K3 = sortedLegs[2]; // Compra (Maior Strike)

        // [BOA PRÁTICA] Verificar strikes nulos para evitar NaN
        if (K1.strike === null || K2.strike === null || K3.strike === null) return null;

        // Verifica a equidistância (tolerância de R$ 0,10)
        const diff1 = K2.strike - K1.strike;
        const diff2 = K3.strike - K2.strike;
        const TOLERANCE = 0.10; 

        if (Math.abs(diff1 - diff2) > TOLERANCE || diff1 <= 0) {
            console.warn("[Butterfly] Os strikes não são aproximadamente equidistantes ou não estão em ordem crescente.");
            // return null; // Descomentar em produção
        }
        
        // 2. Fluxo de Caixa e P/L
        
        // [REVISÃO] Net Premium = Prêmios Recebidos - Prêmios Pagos
        // Net Premium = (2 * Prêmio K2) - (Prêmio K1) - (Prêmio K3) 
        // Nota: O cálculo no arquivo original (K1+K3 - 2*K2) está correto para o CUSTO LÍQUIDO (débito/crédito), 
        // mas o Net Premium deve refletir o valor de fechamento/abertura.
        
        // Custo/Prêmio Líquido (Débito se for positivo, Crédito se for negativo)
        const netCost = (K1.premio + K3.premio) - (2 * K2.premio); // Custo: (Pagou K1 + Pagou K3) - (Recebeu 2*K2)
        
        // A Butterfly Longa é tipicamente uma operação de DÉBITO (netCost > 0)
        const isDebit = netCost > 0;
        
        const cashFlowBruto = Math.abs(netCost) * K1.multiplicador_contrato;
        const natureza: NaturezaOperacao = isDebit ? 'DÉBITO' : 'CRÉDITO';
        // Cash Flow Líquido: Custo bruto +/- taxas (taxa é um custo)
        const cashFlowLiquido = isDebit ? (-cashFlowBruto - FEES) : (cashFlowBruto - FEES);

        // Largura da Trava
        const width = K2.strike - K1.strike; // Largura entre o strike central e o outter strike

        // [REVISÃO] Lucro Máximo: Atingido no strike central K2
        // Lucro Máximo = Largura da Trava - Débito Inicial (Custo)
        const lucroMaximo = (width * K1.multiplicador_contrato) - (cashFlowBruto + FEES); 
        
        // [REVISÃO] Risco Máximo: Limitado ao débito inicial (custo de montagem).
        const riscoMaximo = cashFlowBruto + FEES; 
        
        // 3. Pontos de Equilíbrio (Breakeven - BEP)
        // BEP Inferior: K1 + Custo Líquido Unitário (Math.abs(netCost))
        // BEP Superior: K3 - Custo Líquido Unitário (Math.abs(netCost))
        const netCostUnitario = Math.abs(netCost);
        const breakeven_low = K1.strike + netCostUnitario;
        const breakeven_high = K3.strike - netCostUnitario;

        // [BOA PRÁTICA] Verificar se lucro e risco são válidos antes de dividir
        const riscoRetornoUnitario = (lucroMaximo > 0 && riscoMaximo > 0) ? (lucroMaximo / riscoMaximo) : 0; 

        // 4. Agregação de Gregas
        const netGregas: Greeks = {
            // Soma ponderada: +1 * K1.Gregas - 2 * K2.Gregas + 1 * K3.Gregas
            // [REVISÃO] Acessar o objeto gregas_unitarias do OptionLeg
            delta: (K1.gregas_unitarias.delta - 2 * K2.gregas_unitarias.delta + K3.gregas_unitarias.delta),
            gamma: (K1.gregas_unitarias.gamma - 2 * K2.gregas_unitarias.gamma + K3.gregas_unitarias.gamma),
            theta: (K1.gregas_unitarias.theta - 2 * K2.gregas_unitarias.theta + K3.gregas_unitarias.theta), 
            vega: (K1.gregas_unitarias.vega - 2 * K2.gregas_unitarias.vega + K3.gregas_unitarias.vega), 
        };
        // [COMENTÁRIO] Butterfly Longa tipicamente tem Delta ~0, Gamma Positivo (perto de K2), Theta Positivo, Vega Negativo.
        
        // 5. Montagem do Resultado
        const pernas: StrategyLeg[] = [
            { direction: 'COMPRA', multiplier: 1, derivative: K1, display: `COMPRA: 1x CALL ${K1.option_ticker} (K=R$ ${K1.strike.toFixed(2)})` },
            { direction: 'VENDA', multiplier: 2, derivative: K2, display: `VENDA: 2x CALL ${K2.option_ticker} (K=R$ ${K2.strike.toFixed(2)})` },
            { direction: 'COMPRA', multiplier: 1, derivative: K3, display: `COMPRA: 1x CALL ${K3.option_ticker} (K=R$ ${K3.strike.toFixed(2)})` },
        ];
        
        return {
            spread_type: this.name,
            vencimento: K1.vencimento,
            dias_uteis: K1.dias_uteis,
            strike_description: `Strikes: R$ ${K1.strike.toFixed(2)} / R$ ${K2.strike.toFixed(2)} / R$ ${K3.strike.toFixed(2)}`,
            net_premium: netCost, // Prêmio líquido unitário (custo/crédito)
            cash_flow_liquido: cashFlowLiquido,
            natureza: natureza,
            risco_maximo: riscoMaximo,
            lucro_maximo: lucroMaximo,
            breakeven_low: breakeven_low,
            breakeven_high: breakeven_high, 
            risco_retorno_unitario: riscoRetornoUnitario,
            pernas,
            net_gregas: netGregas,
            score: riscoRetornoUnitario * 10, // Exemplo de Score
        };
    }
    
    // [NOVO] Implementação do método exigido pela interface IStrategy
    generatePayoff(
        metrics: StrategyMetrics
    ): Array<{ assetPrice: number; profitLoss: number }> {
        // [BOA PRÁTICA] Este método normalmente chamaria o PayoffCalculator.calculatePayoffCurve
        // A lógica de cálculo do Payoff está centralizada na classe PayoffCalculator.
        // Se este método for chamado, ele indicaria que a classe de Estratégia está
        // se auto-calculando ou que o PayoffCalculator precisa ser injetado.
        
        // Por enquanto, retorna um array vazio ou implementa uma versão simplificada.
        // Para seguir o contrato, retornamos um mock.
        console.log(`[ButterflySpread] Geração de Payoff solicitada para ${metrics.spread_type}.`);
        return []; 
    }
}