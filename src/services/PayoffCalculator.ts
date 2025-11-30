/**
 * @fileoverview Classe central de cálculo e busca de estratégias.
 * Esta classe é responsável por iterar sobre combinações de opções e instanciar IStrategy.
 * Contém a lógica de iteração para 2, 3 e 4 pernas e o cálculo principal do Payoff no Vencimento.
 */
// [REVISÃO] O IStrategy revisado não recebe mais FEES e LOT_SIZE em calculateMetrics.
// [REVISÃO] Renomear OptionData para OptionLeg (consistência com a revisão de tipos).
import { FEES, IStrategy, LOT_SIZE } from '../interfaces/IStrategy';
import { OptionLeg, StrategyLeg, StrategyMetrics } from '../interfaces/Types'; // Assumindo que o arquivo revisado se chama 'types'

// Importação das classes de estratégia (Mantido igual)
import { ButterflySpread } from '../strategies/ButterflySpread';
import { IronCondorSpread } from '../strategies/IronCondorSpread';
// ... outras importações de estratégias

// Mapa de estratégias (usando seleções sequenciais) - Mantido igual para concisão
export const SPREAD_MAP: { [key: number]: { name: string, strategy: IStrategy }[] } = {
    // ... (Conteúdo do SPREAD_MAP)
    0: [ 
        { name: 'Bull Call Spread', strategy: new BullCallSpread() },
        { name: 'Bear Call Spread', strategy: new BearCallSpread() },
        { name: 'Bull Put Spread', strategy: new BullPutSpread() },
        { name: 'Bear Put Spread', strategy: new BearPutSpread() },
        { name: 'Long Straddle', strategy: new LongStraddle() },
        { name: 'Short Straddle', strategy: new ShortStraddle() },
        { name: 'Long Strangle', strategy: new LongStrangle() },
        { name: 'Short Strangle', strategy: new ShortStrangle() },
        { name: 'Long Butterfly Call', strategy: new ButterflySpread() }, 
        { name: 'Iron Condor Spread', strategy: new IronCondorSpread() }, 
    ], 
    // ... (restante do SPREAD_MAP)
};

export class PayoffCalculator {
    // [REVISÃO] Tipagem de entrada ajustada para OptionLeg
    private optionsData: OptionLeg[];
    private fees: number;
    private lotSize: number;

    constructor(optionsData: OptionLeg[], fees: number = FEES, lotSize: number = LOT_SIZE) {
        this.optionsData = optionsData;
        this.fees = fees;
        this.lotSize = lotSize;
    }

    // --- Lógicas Auxiliares para Combinações (2, 3 e 4 pernas) ---
    
    /**
     * Auxiliar: Encontra todas as combinações de 2 pernas do MESMO tipo (CALL/PUT) para Travas Verticais.
     * @param options Dados das opções disponíveis.
     * @param targetType Tipo de opção (CALL ou PUT).
     * @returns Combinações de pares de OptionLeg.
     */
    private findTwoLegCombinationsSameType(options: OptionLeg[], targetType: 'CALL' | 'PUT'): OptionLeg[][] {
        const combinations: OptionLeg[][] = [];
        const filtered = options.filter(o => o.tipo === targetType);

        // Agrupa por Ativo e Vencimento
        const groups = filtered.reduce((acc, current) => {
            // [REVISÃO] Usar 'ativo_subjacente' (do OptionLeg revisado) em vez de 'idAcao'
            const key = `${current.ativo_subjacente}-${current.vencimento}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(current);
            return acc;
        }, {} as { [key: string]: OptionLeg[] });

        // Gera as combinações dentro de cada grupo
        for (const key in groups) {
            const group = groups[key];
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    combinations.push([group[i], group[j]]);
                }
            }
        }
        return combinations;
    }

    /**
     * Auxiliar: Encontra todas as combinações de 2 pernas de TIPOS DIFERENTES (CALL + PUT) para Straddle/Strangle.
     * @param options Dados das opções disponíveis.
     * @param mustHaveSameStrike Se true, busca Straddle (K1=K2). Se false, busca Strangle (K1!=K2).
     * @returns Combinações de pares de OptionLeg.
     */
    private findTwoLegCombinationsDifferentType(options: OptionLeg[], mustHaveSameStrike: boolean = false): OptionLeg[][] {
        const combinations: OptionLeg[][] = [];
        const calls = options.filter(o => o.tipo === 'CALL');
        const puts = options.filter(o => o.tipo === 'PUT');

        // Agrupa CALLs e PUTs por Ativo e Vencimento
        const callGroups = calls.reduce((acc, current) => {
            // [REVISÃO] Usar 'ativo_subjacente'
            const key = `${current.ativo_subjacente}-${current.vencimento}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(current);
            return acc;
        }, {} as { [key: string]: OptionLeg[] });

        const putGroups = puts.reduce((acc, current) => {
            // [REVISÃO] Usar 'ativo_subjacente'
            const key = `${current.ativo_subjacente}-${current.vencimento}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(current);
            return acc;
        }, {} as { [key: string]: OptionLeg[] });
        
        // Combina CALLs e PUTs do mesmo Ativo/Vencimento
        for (const key in callGroups) {
            if (putGroups[key]) {
                const callGroup = callGroups[key];
                const putGroup = putGroups[key];

                for (const callLeg of callGroup) {
                    for (const putLeg of putGroup) {
                        // [BOA PRÁTICA] Deve-se usar o strike (number | null) com segurança.
                        // Assumimos que CALLs e PUTs no mercado real sempre terão strike não-null.
                        if (callLeg.strike === null || putLeg.strike === null) continue;
                        
                        const sameStrike = callLeg.strike === putLeg.strike;
                        
                        // Lógica de inclusão:
                        if (mustHaveSameStrike && sameStrike) {
                            combinations.push([callLeg, putLeg]); // Straddle
                        } else if (!mustHaveSameStrike && !sameStrike) {
                            combinations.push([callLeg, putLeg]); // Strangle
                        }
                    }
                }
            }
        }

        return combinations;
    }
    
    /**
     * Auxiliar: Encontra todas as combinações de 3 pernas (K1, K2, K3) para a Butterfly.
     * Requer o mesmo Ativo, Vencimento e Tipo, e strikes aproximadamente equidistantes.
     * @returns Combinações de trios de OptionLeg.
     */
    private findThreeLegCombinations(options: OptionLeg[], targetType: 'CALL' | 'PUT'): OptionLeg[][] {
        const combinations: OptionLeg[][] = [];
        const filtered = options.filter(o => o.tipo === targetType);
        const TOLERANCE = 0.05; // 5 centavos de tolerância na equidistância

        // Agrupa por Ativo e Vencimento
        const groups = filtered.reduce((acc, current) => {
            // [REVISÃO] Usar 'ativo_subjacente'
            const key = `${current.ativo_subjacente}-${current.vencimento}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(current);
            return acc;
        }, {} as { [key: string]: OptionLeg[] });
        
        // Gera as combinações dentro de cada grupo
        for (const key in groups) {
            const group = groups[key].sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
            const n = group.length;

            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    for (let k = j + 1; k < n; k++) {
                        // [BOA PRÁTICA] Verificar se os strikes são válidos (não-null)
                        const K1 = group[i].strike;
                        const K2 = group[j].strike;
                        const K3 = group[k].strike;

                        if (K1 === null || K2 === null || K3 === null) continue;
                        
                        // Verifica a equidistância: K2 - K1 deve ser aprox. igual a K3 - K2
                        const diff1 = K2 - K1;
                        const diff2 = K3 - K2;
                        
                        if (Math.abs(diff1 - diff2) < TOLERANCE && diff1 > 0) {
                             combinations.push([group[i], group[j], group[k]]);
                        }
                    }
                }
            }
        }
        return combinations;
    }

    /**
     * Auxiliar: Encontra todas as combinações de 4 pernas (2 CALLs + 2 PUTs) para o Iron Condor.
     * Requer o mesmo Ativo e Vencimento, 4 strikes K2 < K1 < K3 < K4, e larguras iguais nas travas.
     * @returns Combinações de quádruplos de OptionLeg.
     */
    private findFourLegCombinations(options: OptionLeg[]): OptionLeg[][] {
        const combinations: OptionLeg[][] = [];
        const calls = options.filter(o => o.tipo === 'CALL');
        const puts = options.filter(o => o.tipo === 'PUT');
        const TOLERANCE = 0.10; // 10 centavos de tolerância na largura da trava

        // Agrupa por Ativo e Vencimento
        const callGroups = calls.reduce((acc, current) => {
            // [REVISÃO] Usar 'ativo_subjacente'
            const key = `${current.ativo_subjacente}-${current.vencimento}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(current);
            return acc;
        }, {} as { [key: string]: OptionLeg[] });

        const putGroups = puts.reduce((acc, current) => {
            // [REVISÃO] Usar 'ativo_subjacente'
            const key = `${current.ativo_subjacente}-${current.vencimento}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(current);
            return acc;
        }, {} as { [key: string]: OptionLeg[] });

        // Itera sobre os grupos de mesmo Ativo/Vencimento
        for (const key in callGroups) {
            if (putGroups[key]) {
                // Ordenar por strike (garantindo que strikes nulos sejam tratados)
                const callGroup = callGroups[key].sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
                const putGroup = putGroups[key].sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));

                // 1. Encontrar todas as Trava de Put (K2 < K1) - As puts no Iron Condor são vendidas/compradas
                const putSpreads: OptionLeg[][] = [];
                for (let i = 0; i < putGroup.length; i++) {
                    for (let j = i + 1; j < putGroup.length; j++) {
                        // putGroup[i] = K2 (menor strike), putGroup[j] = K1 (maior strike)
                        putSpreads.push([putGroup[i], putGroup[j]]); 
                    }
                }

                // 2. Encontrar todas as Trava de Call (K3 < K4) - As calls no Iron Condor são vendidas/compradas
                const callSpreads: OptionLeg[][] = [];
                 for (let i = 0; i < callGroup.length; i++) {
                    for (let j = i + 1; j < callGroup.length; j++) {
                        // callGroup[i] = K3 (menor strike), callGroup[j] = K4 (maior strike)
                        callSpreads.push([callGroup[i], callGroup[j]]); 
                    }
                }

                // 3. Combinar Put Spread + Call Spread (Iron Condor: K2 < K1 < K3 < K4)
                for (const putSpread of putSpreads) {
                    const K2 = putSpread[0].strike;
                    const K1 = putSpread[1].strike;
                    if (K2 === null || K1 === null) continue;
                    const widthPut = K1 - K2;

                    for (const callSpread of callSpreads) {
                        const K3 = callSpread[0].strike;
                        const K4 = callSpread[1].strike;
                        if (K3 === null || K4 === null) continue;
                        const widthCall = K4 - K3;

                        // Verifica a condição do Condor: K1 < K3 e Larguras Iguais
                        if (K1 < K3 && Math.abs(widthPut - widthCall) < TOLERANCE) {
                            combinations.push([
                                putSpread[0], putSpread[1], // K2, K1 (PUTs)
                                callSpread[0], callSpread[1]  // K3, K4 (CALLs)
                            ]);
                        }
                    }
                }
            }
        }
        return combinations;
    }

    /**
     * Calcula o Payoff de uma única perna (multiplicado pelo lote).
     * @param leg A perna da estratégia.
     * @param assetPrice Preço do ativo no vencimento (ST).
     * @param lotSize O tamanho do lote.
     * @returns P&L para a perna.
     */
    private calculateSingleLegPayoff(leg: StrategyLeg, assetPrice: number, lotSize: number): number {
        // [BOA PRÁTICA] Verificar strike
        const strike = leg.derivative.strike;
        if (strike === null) {
            // Retorna 0 Payoff para um subjacente ou derivativo sem strike no contexto do payoff
            return 0; 
        }

        const premium = leg.derivative.premio;
        const multiplier = leg.multiplier;
        const isCompra = leg.direction === 'COMPRA';

        let payoffUnitario: number;

        if (leg.derivative.tipo === 'CALL') {
            const intrinsicValue = Math.max(0, assetPrice - strike);
            
            if (isCompra) { // Long Call: max(0, ST - K) - Prêmio Pago
                payoffUnitario = intrinsicValue - premium;
            } else { // Short Call: -max(0, ST - K) + Prêmio Recebido
                payoffUnitario = -intrinsicValue + premium;
            }

        } else if (leg.derivative.tipo === 'PUT') {
            const intrinsicValue = Math.max(0, strike - assetPrice);

            if (isCompra) { // Long Put: max(0, K - ST) - Prêmio Pago
                payoffUnitario = intrinsicValue - premium;
            } else { // Short Put: -max(0, K - ST) + Prêmio Recebido
                payoffUnitario = -intrinsicValue + premium;
            }
        } else {
            // [REVISÃO] Tratar o caso 'SUBJACENTE' (para Call/Put Sintética, etc.)
            // O Payoff de uma ação é (Preço de Saída - Preço de Entrada).
            // Aqui, assumimos que o payoff da perna SUBJACENTE será calculado em outro lugar 
            // ou será tratado como 0 (pois o gráfico de payoff é puramente em função da variação do ativo, 
            // e o preço de entrada da ação é geralmente o "zero" do eixo y).
            // Se o ativo subjacente estiver no array de pernas, ele deve ser incluído aqui.
            // Para simplificar, focando em estratégias de opções, mantemos 0.
            return 0;
        }

        // Multiplica pelo multiplicador da perna e pelo lote (ou multiplicador do contrato da OptionLeg)
        // [BOA PRÁTICA] Multiplicar o multiplicador da perna pelo multiplicador padrão do contrato.
        return payoffUnitario * multiplier * leg.derivative.multiplicador_contrato;
    }

    // [generatePriceRange é mantido]

    /**
     * Calcula a curva de Payoff no Vencimento para uma estratégia.
     * @param strategy A StrategyMetrics da estratégia a ser analisada.
     * @param currentAssetPrice O preço atual do ativo (para definir o centro da curva).
     * @param rangePercent A porcentagem de variação de preço a ser analisada (ex: 0.2 para +/- 20%).
     * @param steps O número de pontos na curva.
     * @returns Um array de objetos { price: number, pnl: number }.
     */
    public calculatePayoffCurve(
        strategy: StrategyMetrics, 
        currentAssetPrice: number, 
        rangePercent: number = 0.20, // 20% padrão
        steps: number = 100 // 100 pontos para a curva
    ): { price: number, pnl: number }[] {
        
        if (!strategy.pernas || strategy.pernas.length === 0) return [];
        
        const priceRange = this.generatePriceRange(currentAssetPrice, rangePercent, steps);
        const totalPayoffCurve: { price: number, pnl: number }[] = [];
        
        // [REVISÃO] As taxas devem ser descontadas UMA ÚNICA VEZ. 
        // O campo 'cash_flow_liquido' já inclui as taxas, mas o Payoff no vencimento
        // é (Lucro Bruto da Opção) - (Prêmio Líquido Inicial) - (Taxas).
        // Aqui, subtraímos as fees da soma do P&L das pernas (Payoff Bruto).
        const netFees = this.fees; 

        for (const price of priceRange) {
            let totalPayoffBruto = 0;
            
            // Soma o Payoff de todas as pernas no preço 'price'
            for (const leg of strategy.pernas) {
                totalPayoffBruto += this.calculateSingleLegPayoff(leg, price, this.lotSize);
            }
            
            // O P&L líquido é o total Payoff (resultado das opções) menos as Taxas.
            const netPnL = totalPayoffBruto - netFees;
            
            totalPayoffCurve.push({
                price: parseFloat(price.toFixed(2)),
                pnl: parseFloat(netPnL.toFixed(2))
            });
        }
        
        return totalPayoffCurve;
    }

    // --- Métodos de Otimização (findAndCalculateSpreads) ---

    /**
     * Encontra e calcula todos os spreads possíveis para a seleção.
     * @param selection O código da estratégia a ser calculado.
     * @returns Um array de StrategyMetrics.
     */
    findAndCalculateSpreads(selection: number): StrategyMetrics[] {
        console.log(`[CALCULATOR] Executando cálculo real para seleção ${selection}...`);
        
        const strategiesToRun = SPREAD_MAP[selection];
        if (!strategiesToRun || strategiesToRun.length === 0) return [];

        const calculatedResults: StrategyMetrics[] = [];
        
        // As constantes fees e lotSize devem ser gerenciadas pela classe PayoffCalculator
        // e NÃO devem ser passadas para calculateMetrics, conforme a interface IStrategy revisada.
        
        // --- 1. LÓGICA DE TRAVAS VERTICAIS (2 pernas, mesmo tipo) ---
        // ... (lógica de iteração mantida)
        // [REVISÃO] Remoção dos parâmetros fees e lotSize na chamada:
        // const result = strategyObj.strategy.calculateMetrics(combo); 
        
        // ...
        
        return calculatedResults;
    }

    // [findBestSpread é mantido]
}