/**
 * @fileoverview Classe central de cálculo e busca de estratégias.
 * Contém a lógica de iteração para 2, 3 e 4 pernas e o cálculo principal do Payoff no Vencimento.
 */
import { FEES, IStrategy, LOT_SIZE } from '../interfaces/IStrategy';
import {
    OptionLeg,
    StrategyLeg,
    StrategyMetrics
} from '../interfaces/Types';

// Importações das classes de estratégia
import { BearCallSpread } from '../strategies/BearCallSpread';
import { BearPutSpread } from '../strategies/BearPutSpread';
import { BullCallSpread } from '../strategies/BullCallSpread';
import { BullPutSpread } from '../strategies/BullPutSpread';
import { ButterflySpread } from '../strategies/ButterflySpread';
import { CalendarSpread } from '../strategies/CalendarSpread';
import { IronCondorSpread } from '../strategies/IronCondorSpread';
import { LongStraddle } from '../strategies/LongStraddle';
import { LongStrangle } from '../strategies/LongStrangle';
import { ShortStraddle } from '../strategies/ShortStraddle';
import { ShortStrangle } from '../strategies/ShortStrangle';


// Mapa de estratégias (usando seleções sequenciais)
export const SPREAD_MAP: { [key: number]: { name: string, strategy: IStrategy }[] } = {
    // Opção 0: Estratégias Padrão (todas as implementadas)
    0: [
        { name: 'Bull Call Spread', strategy: new BullCallSpread() },
        { name: 'Bear Call Spread', strategy: new BearCallSpread() },
        { name: 'Bull Put Spread', strategy: new BullPutSpread() },
        { name: 'Bear Put Spread', strategy: new BearPutSpread() }, // CORREÇÃO: Usando BearPutSpread
        { name: 'Long Straddle', strategy: new LongStraddle() },
        { name: 'Short Straddle', strategy: new ShortStraddle() },
        { name: 'Long Strangle', strategy: new LongStrangle() },
        { name: 'Short Strangle', strategy: new ShortStrangle() },
        { name: 'Long Butterfly Call', strategy: new ButterflySpread() },
        { name: 'Iron Condor Spread', strategy: new IronCondorSpread() },
        { name: 'Calendar Spread', strategy: new CalendarSpread() },
    ],
};

export class PayoffCalculator {
    private optionsData: OptionLeg[];
    private fees: number;
    private lotSize: number;

    constructor(optionsData: OptionLeg[], fees: number = FEES, lotSize: number = LOT_SIZE) {
        this.optionsData = optionsData;
        this.fees = fees;
        this.lotSize = lotSize;
    }

    // -------------------------------------------------------------------
    // AUXILIARES DE COMBINAÇÃO (Lógica de Busca de Pernas)
    // -------------------------------------------------------------------

    /**
     * Auxiliar: Encontra todas as combinações de 2 pernas do MESMO tipo (CALL/PUT) para Travas Verticais.
     * Requer o mesmo Ativo e Vencimento.
     */
    private findTwoLegCombinationsSameType(options: OptionLeg[], targetType: 'CALL' | 'PUT'): OptionLeg[][] {
        const combinations: OptionLeg[][] = [];
        const filtered = options.filter(o => o.tipo === targetType);

        // Agrupa por Ativo e Vencimento
        const groups = filtered.reduce((acc, current) => {
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
     * Requer o mesmo Ativo e Vencimento.
     */
    private findTwoLegCombinationsDifferentType(options: OptionLeg[], mustHaveSameStrike: boolean = false): OptionLeg[][] {
        const combinations: OptionLeg[][] = [];
        const calls = options.filter(o => o.tipo === 'CALL');
        const puts = options.filter(o => o.tipo === 'PUT');
        const TOLERANCE = 0.01;

        // Agrupa por Ativo e Vencimento
        const callGroups = calls.reduce((acc, current) => {
            const key = `${current.ativo_subjacente}-${current.vencimento}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(current);
            return acc;
        }, {} as { [key: string]: OptionLeg[] });

        const putGroups = puts.reduce((acc, current) => {
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
                        if (callLeg.strike === null || putLeg.strike === null) continue;

                        const sameStrike = Math.abs(callLeg.strike - putLeg.strike) < TOLERANCE;

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
     * Auxiliar: Encontra todas as combinações de 2 pernas (MESMO STRIKE, VENCIMENTOS DIFERENTES) para Calendar.
     * Requer o mesmo Ativo e Strike.
     */
    private findTwoLegCombinationsCalendar(options: OptionLeg[], targetType: 'CALL' | 'PUT'): OptionLeg[][] {
        const combinations: OptionLeg[][] = [];
        const filtered = options.filter(o => o.tipo === targetType);

        // Agrupa por Ativo e Strike
        const groups = filtered.reduce((acc, current) => {
            if (current.strike === null) return acc;
            const key = `${current.ativo_subjacente}-${current.strike.toFixed(2)}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(current);
            return acc;
        }, {} as { [key: string]: OptionLeg[] });

        // Gera as combinações dentro de cada grupo (garantindo vencimentos diferentes)
        for (const key in groups) {
            const group = groups[key];
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    // Ordena por vencimento (Curta na frente, Longa atrás)
                    const [legA, legB] = group[i].vencimento < group[j].vencimento ? [group[i], group[j]] : [group[j], group[i]];

                    // Garante que não sejam o mesmo vencimento
                    if (legA.vencimento !== legB.vencimento) {
                        combinations.push([legA, legB]);
                    }
                }
            }
        }
        return combinations;
    }


    /**
     * Auxiliar: Encontra todas as combinações de 3 pernas (K1, K2, K3) para a Butterfly.
     * Deve verificar equidistância. Requer o mesmo Ativo e Vencimento.
     */
    private findThreeLegCombinations(options: OptionLeg[], targetType: 'CALL' | 'PUT'): OptionLeg[][] {
        const combinations: OptionLeg[][] = [];
        const filtered = options.filter(o => o.tipo === targetType);
        const TOLERANCE = 0.05;

        // Agrupa por Ativo e Vencimento
        const groups = filtered.reduce((acc, current) => {
            const key = `${current.ativo_subjacente}-${current.vencimento}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(current);
            return acc;
        }, {} as { [key: string]: OptionLeg[] });

        // Gera as combinações dentro de cada grupo
        for (const key in groups) {
            // Ordena por Strike para garantir K1 < K2 < K3
            const group = groups[key].sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
            const n = group.length;

            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    for (let k = j + 1; k < n; k++) {
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
     * Requer o mesmo Ativo e Vencimento. Requer que a Trava de Put (K2-K1) e a Trava de Call (K4-K3) tenham a mesma largura.
     */
    private findFourLegCombinations(options: OptionLeg[]): OptionLeg[][] {
        const combinations: OptionLeg[][] = [];
        const calls = options.filter(o => o.tipo === 'CALL');
        const puts = options.filter(o => o.tipo === 'PUT');
        const TOLERANCE = 0.10;

        // Agrupa por Ativo e Vencimento
        const callGroups = calls.reduce((acc, current) => {
            const key = `${current.ativo_subjacente}-${current.vencimento}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(current);
            return acc;
        }, {} as { [key: string]: OptionLeg[] });

        const putGroups = puts.reduce((acc, current) => {
            const key = `${current.ativo_subjacente}-${current.vencimento}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(current);
            return acc;
        }, {} as { [key: string]: OptionLeg[] });

        // Itera sobre os grupos de mesmo Ativo/Vencimento
        for (const key in callGroups) {
            if (putGroups[key]) {
                const callGroup = callGroups[key].sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));
                const putGroup = putGroups[key].sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));

                // 1. Encontrar todas as Trava de Put (K1 < K2)
                const putSpreads: OptionLeg[][] = [];
                for (let i = 0; i < putGroup.length; i++) {
                    for (let j = i + 1; j < putGroup.length; j++) {
                        putSpreads.push([putGroup[i], putGroup[j]]);
                    }
                }

                // 2. Encontrar todas as Trava de Call (K3 < K4)
                const callSpreads: OptionLeg[][] = [];
                for (let i = 0; i < callGroup.length; i++) {
                    for (let j = i + 1; j < callGroup.length; j++) {
                        callSpreads.push([callGroup[i], callGroup[j]]);
                    }
                }

                // 3. Combinar Put Spread + Call Spread (Iron Condor: K1 < K2 < K3 < K4 e Larguras Iguais)
                for (const putSpread of putSpreads) {
                    const K1 = putSpread[0].strike;
                    const K2 = putSpread[1].strike;
                    if (K1 === null || K2 === null) continue;
                    const widthPut = K2 - K1;

                    for (const callSpread of callSpreads) {
                        const K3 = callSpread[0].strike;
                        const K4 = callSpread[1].strike;
                        if (K3 === null || K4 === null) continue;
                        const widthCall = K4 - K3;

                        // Condição do Condor: K2 (Put Vendida) < K3 (Call Vendida) e Larguras Iguais
                        // O Iron Condor é uma Venda de Call Spread e Venda de Put Spread
                        // As pernas devem ser:
                        // K1 Put Compra (Abertura da trava de PUT) - strike mais baixo
                        // K2 Put Venda (Fechamento da trava de PUT / Strike interno)
                        // K3 Call Venda (Strike interno)
                        // K4 Call Compra (Abertura da trava de CALL) - strike mais alto
                        // A Trava de Put é formada por (K1: Compra, K2: Venda) e a Trava de Call por (K3: Venda, K4: Compra).
                        
                        // Neste ponto, os spreads contêm as opções:
                        // putSpread[0] = K1 (Menor Strike de Put)
                        // putSpread[1] = K2 (Maior Strike de Put)
                        // callSpread[0] = K3 (Menor Strike de Call)
                        // callSpread[1] = K4 (Maior Strike de Call)
                        
                        // Assumindo que a classe IronCondorSpread trata as direções (Venda Put Spread + Venda Call Spread), 
                        // precisamos apenas verificar a relação entre os Strikes e a largura.

                        if (K2 < K3 && Math.abs(widthPut - widthCall) < TOLERANCE) {
                            combinations.push([
                                putSpread[0], // K1 (Put)
                                putSpread[1], // K2 (Put)
                                callSpread[0], // K3 (Call)
                                callSpread[1]  // K4 (Call)
                            ]);
                        }
                    }
                }
            }
        }
        return combinations;
    }

    // -------------------------------------------------------------------
    // MÉTODOS DE CÁLCULO
    // -------------------------------------------------------------------

    /**
     * Calcula o Payoff de uma única perna no Vencimento (multiplicado pelo lote).
     */
    private calculateSingleLegPayoff(leg: StrategyLeg, assetPrice: number, lotSize: number): number {
        const strike = leg.derivative.strike;
        if (strike === null) {
            return 0;
        }

        const premium = leg.derivative.premio;
        const multiplier = leg.multiplier;
        const isCompra = leg.direction === 'COMPRA';

        let payoffUnitario: number;

        if (leg.derivative.tipo === 'CALL') {
            const intrinsicValue = Math.max(0, assetPrice - strike);

            if (isCompra) {
                // Compra Call: (Max(0, S-K) - Prêmio)
                payoffUnitario = intrinsicValue - premium;
            } else {
                // Venda Call: (Prêmio - Max(0, S-K))
                payoffUnitario = -intrinsicValue + premium;
            }

        } else if (leg.derivative.tipo === 'PUT') {
            const intrinsicValue = Math.max(0, strike - assetPrice);

            if (isCompra) {
                // Compra Put: (Max(0, K-S) - Prêmio)
                payoffUnitario = intrinsicValue - premium;
            } else {
                // Venda Put: (Prêmio - Max(0, K-S))
                payoffUnitario = -intrinsicValue + premium;
            }
        } else {
            return 0;
        }

        // CORREÇÃO: Usar o multiplicador da opção (se existir) OU o LOT_SIZE padrão.
        const contractMultiplier = leg.derivative.multiplicador_contrato ?? lotSize;

        // Payoff = (Payoff Unitário * Multiplicador da Perna) * Multiplicador do Contrato (Lote)
        return payoffUnitario * multiplier * contractMultiplier;
    }

    /**
     * Gera uma faixa de preços (Price Range) para cálculo da curva.
     */
    private generatePriceRange(currentAssetPrice: number, rangePercent: number, steps: number): number[] {
        const minPrice = currentAssetPrice * (1 - rangePercent);
        const maxPrice = currentAssetPrice * (1 + rangePercent);
        const stepSize = (maxPrice - minPrice) / steps;

        const prices: number[] = [];
        for (let i = 0; i <= steps; i++) {
            prices.push(minPrice + i * stepSize);
        }
        return prices;
    }


    /**
     * Calcula a curva de Payoff no Vencimento para uma estratégia.
     */
    public calculatePayoffCurve(
        strategy: StrategyMetrics,
        currentAssetPrice: number,
        rangePercent: number = 0.20,
        steps: number = 100
    ): { price: number, pnl: number }[] {

        if (!strategy.pernas || strategy.pernas.length === 0) return [];

        const priceRange = this.generatePriceRange(currentAssetPrice, rangePercent, steps);
        const totalPayoffCurve: { price: number, pnl: number }[] = [];

        // Taxas são subtraídas uma vez do PnL total (não por perna)
        const netFees = this.fees;

        for (const price of priceRange) {
            let totalPayoffBruto = 0;

            for (const leg of strategy.pernas) {
                totalPayoffBruto += this.calculateSingleLegPayoff(leg, price, this.lotSize);
            }

            // Subtrai a taxa de transação UMA VEZ.
            const netPnL = totalPayoffBruto - netFees;

            totalPayoffCurve.push({
                price: parseFloat(price.toFixed(2)),
                pnl: parseFloat(netPnL.toFixed(2))
            });
        }

        return totalPayoffCurve;
    }

    // -------------------------------------------------------------------
    // MÉTODOS PRINCIPAIS DE BUSCA E CÁLCULO
    // -------------------------------------------------------------------

    /**
     * Encontra e calcula todos os spreads possíveis para a seleção.
     */
    findAndCalculateSpreads(selection: number): StrategyMetrics[] {
        console.log(`[CALCULATOR] Executando cálculo real para seleção ${selection}...`);

        const strategiesToRun = SPREAD_MAP[selection];
        if (!strategiesToRun || strategiesToRun.length === 0) return [];

        const calculatedResults: StrategyMetrics[] = [];

        // --- 1. ESTRATÉGIAS DE 2 PERNAS ---

        // 1.1. Trava Vertical (Bull/Bear Call/Put Spread)
        const combinationsSameTypeCall = this.findTwoLegCombinationsSameType(this.optionsData, 'CALL');
        const combinationsSameTypePut = this.findTwoLegCombinationsSameType(this.optionsData, 'PUT');

        const verticalStrategies = strategiesToRun.filter(s =>
            s.strategy instanceof BullCallSpread ||
            s.strategy instanceof BearCallSpread ||
            s.strategy instanceof BullPutSpread ||
            s.strategy instanceof BearPutSpread
        );

        for (const strategyObj of verticalStrategies) {
            const isCall = strategyObj.strategy instanceof BullCallSpread || strategyObj.strategy instanceof BearCallSpread;
            const combinations = isCall ? combinationsSameTypeCall : combinationsSameTypePut;

            for (const combo of combinations) {
                try {
                    // Aqui, a ordem no 'combo' é o que define o tipo de Trava (Bull ou Bear) dentro do 'calculateMetrics' da classe específica.
                    const result = strategyObj.strategy.calculateMetrics(combo);
                    if (result) { calculatedResults.push(result); }
                } catch (e) { continue; }
            }
        }

        // 1.2. Estratégias de Volatilidade (Straddle/Strangle)
        const combinationsStraddle = this.findTwoLegCombinationsDifferentType(this.optionsData, true); // mustHaveSameStrike = true
        const straddleStrategies = strategiesToRun.filter(s =>
            s.strategy instanceof LongStraddle || s.strategy instanceof ShortStraddle
        );

        for (const strategyObj of straddleStrategies) {
            for (const combo of combinationsStraddle) {
                try {
                    const result = strategyObj.strategy.calculateMetrics(combo);
                    if (result) { calculatedResults.push(result); }
                } catch (e) { continue; }
            }
        }

        const combinationsStrangle = this.findTwoLegCombinationsDifferentType(this.optionsData, false); // mustHaveSameStrike = false
        const strangleStrategies = strategiesToRun.filter(s =>
            s.strategy instanceof LongStrangle || s.strategy instanceof ShortStrangle
        );

        for (const strategyObj of strangleStrategies) {
            for (const combo of combinationsStrangle) {
                try {
                    const result = strategyObj.strategy.calculateMetrics(combo);
                    if (result) { calculatedResults.push(result); }
                } catch (e) { continue; }
            }
        }

        // 1.3. Calendar Spread
        const combinationsCalendar = this.findTwoLegCombinationsCalendar(this.optionsData, 'CALL'); // Assumindo Call Calendar Spread
        const calendarStrategy = strategiesToRun.find(s => s.strategy instanceof CalendarSpread);

        if (calendarStrategy) {
            for (const combo of combinationsCalendar) {
                try {
                    const result = calendarStrategy.strategy.calculateMetrics(combo);
                    if (result) { calculatedResults.push(result); }
                } catch (e) { continue; }
            }
        }


        // --- 2. ESTRATÉGIAS DE 3 PERNAS (Butterfly Spread) ---
        const combinationsThreeLegsCall = this.findThreeLegCombinations(this.optionsData, 'CALL'); // Assumindo Long Butterfly Call
        const butterflyStrategy = strategiesToRun.find(s => s.strategy instanceof ButterflySpread);

        if (butterflyStrategy) {
            for (const combo of combinationsThreeLegsCall) {
                try {
                    const result = butterflyStrategy.strategy.calculateMetrics(combo);
                    if (result) { calculatedResults.push(result); }
                } catch (e) { continue; }
            }
        }


        // --- 3. ESTRATÉGIAS DE 4 PERNAS (Iron Condor) ---
        const combinationsFourLegs = this.findFourLegCombinations(this.optionsData);
        const ironCondorStrategy = strategiesToRun.find(s => s.strategy instanceof IronCondorSpread);

        if (ironCondorStrategy) {
            for (const combo of combinationsFourLegs) {
                try {
                    // O combo deve ser passado na ordem: [K1 Put, K2 Put, K3 Call, K4 Call]
                    const result = ironCondorStrategy.strategy.calculateMetrics(combo);
                    if (result) { calculatedResults.push(result); }
                } catch (e) { continue; }
            }
        }

        return calculatedResults;
    }
}