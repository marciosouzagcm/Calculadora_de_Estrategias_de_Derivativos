import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CalculatorIcon, TrendingUpIcon, TrendingDownIcon, LockIcon, DollarSignIcon, PackageIcon, ZapIcon } from 'lucide-react';

// --- 1. INTERFACES & CONSTANTES ---

/**
 * Representa os dados básicos de uma opção (vindo da B3/CVM).
 */
export const FEES = 2.0; // Taxa de corretagem por lote (R$)
export const LOT_SIZE = 100; // Tamanho do lote padrão (100 unidades)

/**
 * @typedef {'CALL' | 'PUT'} OptionType
 * @typedef {'COMPRA' | 'VENDA'} Direction
 * @typedef {{ id: string, idAcao: string, vencimento: string, tipo: OptionType, strike: number, premio: number, liquidez: number }} OptionData
 * @typedef {{ option: OptionData, direction: Direction, multiplier: number }} StrategyLeg
 * @typedef {{ name: string, description: string, maxProfit: number, maxLoss: number, breakevens: number[], pernas: StrategyLeg[], score: number }} StrategyMetrics
 * @typedef {{ calculateMetrics: (options: OptionData[], fees: number, lotSize: number) => StrategyMetrics | null }} IStrategy
 */

// --- 2. IMPLEMENTAÇÕES DE ESTRATÉGIAS ---

// Classe Base para as Estratégias
class BaseStrategy {
    calculateMetrics(options, fees, lotSize) {
        // Por padrão, estratégias que não se encaixam no input retornam null
        return null; 
    }
}

// --- 2.1 ESTRATÉGIAS DE DUAS PERNAS (VERTICAL SPREADS) ---

/**
 * Bull Call Spread (Trava de Alta com Call) - Débito (Long K1 Call, Short K2 Call)
 * K1 (menor strike) < K2 (maior strike)
 */
class BullCallSpread extends BaseStrategy {
    name = 'Bull Call Spread (Débito)';
    calculateMetrics(options, fees, lotSize) {
        if (options.length !== 2 || options[0].tipo !== 'CALL' || options[1].tipo !== 'CALL') return null;
        const [K1, K2] = options.sort((a, b) => a.strike - b.strike); // K1 < K2

        // Débito Líquido (Custo Máximo / Perda Máxima)
        const netDebit = (K1.premio - K2.premio) * lotSize + fees;
        if (netDebit <= 0) return null; // Deve ser um débito (P1 > P2)

        // Lucro Máximo (Ocorre em K2 ou acima)
        const width = K2.strike - K1.strike;
        const maxProfit = width * lotSize - netDebit;
        
        // Ponto de Equilíbrio (BEP)
        const bep = K1.strike + netDebit / lotSize;

        const metrics = {
            name: this.name,
            description: `Compra CALL K${K1.strike}, Venda CALL K${K2.strike}`,
            maxProfit: maxProfit,
            maxLoss: netDebit,
            breakevens: [parseFloat(bep.toFixed(2))],
            pernas: [
                { option: K1, direction: 'COMPRA', multiplier: 1 },
                { option: K2, direction: 'VENDA', multiplier: 1 },
            ],
            score: maxProfit / Math.abs(netDebit),
        };
        return metrics;
    }
}

/**
 * Bear Call Spread (Trava de Baixa com Call) - Crédito (Short K1 Call, Long K2 Call)
 * K1 (menor strike) < K2 (maior strike)
 */
class BearCallSpread extends BaseStrategy {
    name = 'Bear Call Spread (Crédito)';
    calculateMetrics(options, fees, lotSize) {
        if (options.length !== 2 || options[0].tipo !== 'CALL' || options[1].tipo !== 'CALL') return null;
        const [K1, K2] = options.sort((a, b) => a.strike - b.strike); // K1 < K2

        // Crédito Líquido (Lucro Máximo)
        const netCredit = (K1.premio - K2.premio) * lotSize - fees;
        if (netCredit <= 0) return null; // Deve ser um crédito (P1 > P2)

        // Perda Máxima (Ocorre em K2 ou acima)
        const width = K2.strike - K1.strike;
        // [CORREÇÃO 1]: Bear Call Spread VENDE K1 (strike menor) e COMPRA K2 (strike maior).
        // A perna K1 é a de maior prêmio (se estiver OTM/ATM), garantindo o crédito.
        const maxLoss = -(width * lotSize - netCredit); 
        
        // Ponto de Equilíbrio (BEP)
        const bep = K1.strike + netCredit / lotSize;

        const metrics = {
            name: this.name,
            description: `Venda CALL K${K1.strike}, Compra CALL K${K2.strike}`,
            maxProfit: netCredit,
            maxLoss: maxLoss,
            breakevens: [parseFloat(bep.toFixed(2))],
            pernas: [
                { option: K1, direction: 'VENDA', multiplier: 1 }, // [CORREÇÃO 1] Venda K1 (Menor Strike)
                { option: K2, direction: 'COMPRA', multiplier: 1 },// [CORREÇÃO 1] Compra K2 (Maior Strike)
            ],
            score: netCredit / Math.abs(maxLoss),
        };
        return metrics;
    }
}

/**
 * Bull Put Spread (Trava de Alta com Put) - Crédito (Short K2 Put, Long K1 Put)
 * K1 (menor strike) < K2 (maior strike)
 */
class BullPutSpread extends BaseStrategy {
    name = 'Bull Put Spread (Crédito)';
    calculateMetrics(options, fees, lotSize) {
        if (options.length !== 2 || options[0].tipo !== 'PUT' || options[1].tipo !== 'PUT') return null;
        const [K1, K2] = options.sort((a, b) => a.strike - b.strike); // K1 < K2

        // Crédito Líquido (Lucro Máximo) -> K2 (maior strike) tem maior prêmio para PUT
        const netCredit = (K2.premio - K1.premio) * lotSize - fees;
        if (netCredit <= 0) return null; // Deve ser um crédito

        // Perda Máxima (Ocorre em K1 ou abaixo)
        const width = K2.strike - K1.strike;
        // [CORREÇÃO 2]: Cálculo do maxLoss
        const maxLoss = -(width * lotSize - netCredit); 
        
        // Ponto de Equilíbrio (BEP) -> K2 - Prêmio Líquido Unitário
        // [CORREÇÃO 2]: Cálculo do BEP
        const bep = K2.strike - netCredit / lotSize;

        const metrics = {
            name: this.name,
            description: `Venda PUT K${K2.strike}, Compra PUT K${K1.strike}`,
            maxProfit: netCredit,
            maxLoss: maxLoss,
            breakevens: [parseFloat(bep.toFixed(2))],
            pernas: [
                { option: K2, direction: 'VENDA', multiplier: 1 }, // Venda K2 (Maior Strike/Maior Prêmio)
                { option: K1, direction: 'COMPRA', multiplier: 1 }, // Compra K1 (Menor Strike/Menor Prêmio)
            ],
            score: netCredit / Math.abs(maxLoss),
        };
        return metrics;
    }
}

/**
 * Bear Put Spread (Trava de Baixa com Put) - Débito (Long K2 Put, Short K1 Put)
 * K1 (menor strike) < K2 (maior strike)
 */
class BearPutSpread extends BaseStrategy {
    name = 'Bear Put Spread (Débito)';
    calculateMetrics(options, fees, lotSize) {
        if (options.length !== 2 || options[0].tipo !== 'PUT' || options[1].tipo !== 'PUT') return null;
        const [K1, K2] = options.sort((a, b) => a.strike - b.strike); // K1 < K2

        // Débito Líquido (Custo Máximo / Perda Máxima) -> K2 tem maior prêmio, então Compra K2 e Venda K1
        // [CORREÇÃO 3]: O débito é o prêmio da opção comprada (K2) menos o prêmio da vendida (K1)
        const netDebit = (K2.premio - K1.premio) * lotSize + fees;
        if (netDebit <= 0) return null; // Deve ser um débito

        // Lucro Máximo (Ocorre em K1 ou abaixo)
        const width = K2.strike - K1.strike;
        const maxProfit = width * lotSize - netDebit;
        
        // Ponto de Equilíbrio (BEP) -> K2 - Custo Líquido Unitário
        const bep = K2.strike - netDebit / lotSize;

        const metrics = {
            name: this.name,
            description: `Compra PUT K${K2.strike}, Venda PUT K${K1.strike}`,
            maxProfit: maxProfit,
            maxLoss: netDebit,
            breakevens: [parseFloat(bep.toFixed(2))],
            pernas: [
                { option: K2, direction: 'COMPRA', multiplier: 1 }, // Compra K2 (Maior Strike/Maior Prêmio)
                { option: K1, direction: 'VENDA', multiplier: 1 }, // Venda K1 (Menor Strike/Menor Prêmio)
            ],
            score: maxProfit / Math.abs(netDebit),
        };
        return metrics;
    }
}

// --- 2.2 ESTRATÉGIAS DE VOLATILIDADE (STRADDLE & STRANGLE) ---

/**
 * Long Straddle (Straddle Comprado) - Débito (Long Call K, Long Put K)
 * K (mesmo strike)
 */
class LongStraddle extends BaseStrategy {
    name = 'Long Straddle (Débito)';
    calculateMetrics(options, fees, lotSize) {
        // A lógica de combinação garante que os strikes são iguais
        if (options.length !== 2 || options[0].strike !== options[1].strike || options[0].tipo === options[1].tipo) return null;
        const call = options.find(o => o.tipo === 'CALL');
        const put = options.find(o => o.tipo === 'PUT');

        if (!call || !put) return null;

        // Débito Líquido (Custo Máximo / Perda Máxima)
        const netDebit = (call.premio + put.premio) * lotSize + fees;
        
        // Lucro Máximo: Ilimitado (representado por Infinity)
        const maxProfit = Infinity;
        const maxLoss = netDebit;
        
        // Ponto de Equilíbrio (BEP)
        const K = call.strike;
        const totalPremium = (call.premio + put.premio); // Custo por unidade
        
        const bepLow = K - totalPremium;
        const bepHigh = K + totalPremium;

        const metrics = {
            name: this.name,
            description: `Compra CALL e PUT no Strike K${K}`,
            maxProfit: maxProfit,
            maxLoss: maxLoss,
            breakevens: [parseFloat(bepLow.toFixed(2)), parseFloat(bepHigh.toFixed(2))].sort((a,b) => a-b),
            pernas: [
                { option: call, direction: 'COMPRA', multiplier: 1 },
                { option: put, direction: 'COMPRA', multiplier: 1 },
            ],
            score: 0.1, 
        };
        return metrics;
    }
}

/**
 * Short Straddle (Straddle Vendido) - Crédito (Short Call K, Short Put K)
 * K (mesmo strike)
 */
class ShortStraddle extends BaseStrategy {
    name = 'Short Straddle (Crédito)';
    calculateMetrics(options, fees, lotSize) {
        // A lógica de combinação garante que os strikes são iguais
        if (options.length !== 2 || options[0].strike !== options[1].strike || options[0].tipo === options[1].tipo) return null;
        const call = options.find(o => o.tipo === 'CALL');
        const put = options.find(o => o.tipo === 'PUT');

        if (!call || !put) return null;

        // Crédito Líquido (Lucro Máximo)
        const netCredit = (call.premio + put.premio) * lotSize - fees;
        if (netCredit <= 0) return null; // Deve ser um crédito

        // Perda Máxima: Ilimitada (representado por -Infinity)
        const maxProfit = netCredit;
        const maxLoss = -Infinity; // [CORREÇÃO 4]: Mantido -Infinity, mas use 'Ilimitada' se a interface permitir string.
        
        // Ponto de Equilíbrio (BEP)
        const K = call.strike;
        const totalPremium = (call.premio + put.premio); // Crédito por unidade
        
        const bepLow = K - totalPremium;
        const bepHigh = K + totalPremium;

        const metrics = {
            name: this.name,
            description: `Venda CALL e PUT no Strike K${K}`,
            maxProfit: maxProfit,
            maxLoss: maxLoss,
            breakevens: [parseFloat(bepLow.toFixed(2)), parseFloat(bepHigh.toFixed(2))].sort((a,b) => a-b),
            pernas: [
                { option: call, direction: 'VENDA', multiplier: 1 },
                { option: put, direction: 'VENDA', multiplier: 1 },
            ],
            score: 0.2, 
        };
        return metrics;
    }
}

/**
 * Long Strangle (Strangle Comprado) - Débito (Long Put K1, Long Call K2)
 * K1 (PUT strike baixo) < K2 (CALL strike alto)
 */
class LongStrangle extends BaseStrategy {
    name = 'Long Strangle (Débito)';
    calculateMetrics(options, fees, lotSize) {
        // A lógica de combinação garante que há 1 CALL e 1 PUT com strikes diferentes
        if (options.length !== 2 || options[0].tipo === options[1].tipo || options[0].strike === options[1].strike) return null;

        const put = options.find(o => o.tipo === 'PUT');
        const call = options.find(o => o.tipo === 'CALL');
        
        if (put.strike >= call.strike) return null; // K1 (PUT) deve ser menor que K2 (CALL)

        // Débito Líquido (Custo Máximo / Perda Máxima)
        const netDebit = (call.premio + put.premio) * lotSize + fees;
        
        // Lucro Máximo: Ilimitado
        const maxProfit = Infinity;
        const maxLoss = netDebit;
        
        // Ponto de Equilíbrio (BEP)
        const K1 = put.strike;
        const K2 = call.strike;
        const totalPremium = (call.premio + put.premio); // Custo por unidade
        
        const bepLow = K1 - totalPremium;
        const bepHigh = K2 + totalPremium;

        const metrics = {
            name: this.name,
            description: `Compra PUT K${K1}, Compra CALL K${K2}`,
            maxProfit: maxProfit,
            maxLoss: maxLoss,
            breakevens: [parseFloat(bepLow.toFixed(2)), parseFloat(bepHigh.toFixed(2))].sort((a,b) => a-b),
            pernas: [
                { option: put, direction: 'COMPRA', multiplier: 1 },
                { option: call, direction: 'COMPRA', multiplier: 1 },
            ],
            score: 0.1, 
        };
        return metrics;
    }
}

/**
 * Short Strangle (Strangle Vendido) - Crédito (Short Put K1, Short Call K2)
 * K1 (PUT strike baixo) < K2 (CALL strike alto)
 */
class ShortStrangle extends BaseStrategy {
    name = 'Short Strangle (Crédito)';
    calculateMetrics(options, fees, lotSize) {
        // A lógica de combinação garante que há 1 CALL e 1 PUT com strikes diferentes
        if (options.length !== 2 || options[0].tipo === options[1].tipo || options[0].strike === options[1].strike) return null;

        const put = options.find(o => o.tipo === 'PUT');
        const call = options.find(o => o.tipo === 'CALL');
        
        if (put.strike >= call.strike) return null; // K1 (PUT) deve ser menor que K2 (CALL)

        // Crédito Líquido (Lucro Máximo)
        const netCredit = (call.premio + put.premio) * lotSize - fees;
        if (netCredit <= 0) return null; // Deve ser um crédito

        // Perda Máxima: Ilimitada
        const maxProfit = netCredit;
        const maxLoss = -Infinity;
        
        // Ponto de Equilíbrio (BEP)
        const K1 = put.strike;
        const K2 = call.strike;
        const totalPremium = (call.premio + put.premio); // Crédito por unidade

        const bepLow = K1 - totalPremium;
        const bepHigh = K2 + totalPremium;

        const metrics = {
            name: this.name,
            description: `Venda PUT K${K1}, Venda CALL K${K2}`,
            maxProfit: maxProfit,
            maxLoss: maxLoss,
            breakevens: [parseFloat(bepLow.toFixed(2)), parseFloat(bepHigh.toFixed(2))].sort((a,b) => a-b),
            pernas: [
                { option: put, direction: 'VENDA', multiplier: 1 },
                { option: call, direction: 'VENDA', multiplier: 1 },
            ],
            score: 0.2, 
        };
        return metrics;
    }
}


// --- 2.3 ESTRATÉGIAS DE MÚLTIPLAS PERNAS ---

// 3. Classe ButterflySpread (Mantida)
class ButterflySpread extends BaseStrategy {
    name = 'Long Butterfly Call';
    calculateMetrics(options, fees, lotSize) {
        if (options.length !== 3) return null;
        
        // K1 < K2 < K3 (Três CALLs equidistantes)
        const [K1, K2, K3] = options.sort((a, b) => a.strike - b.strike);
        if (K1.tipo !== 'CALL' || K2.tipo !== 'CALL' || K3.tipo !== 'CALL') return null;
        
        // Long Butterfly Call: Compra K1 (long), Venda 2x K2 (short), Compra K3 (long)
        const premiumK1 = K1.premio;
        const premiumK2 = K2.premio;
        const premiumK3 = K3.premio;

        // Débito Líquido (Custo Máximo)
        const netDebit = (premiumK1 - 2 * premiumK2 + premiumK3) * lotSize + fees;
        // [CORREÇÃO 5]: A Butterfly geralmente é montada para um pequeno débito (Custo Máximo > 0).
        if (netDebit <= 0) return null; 

        // Lucro Máximo (Ocorre em K2)
        const maxProfit = (K2.strike - K1.strike) * lotSize - netDebit;
        
        // Ponto de Equilíbrio (BEP)
        const bep1 = K1.strike + netDebit / lotSize;
        const bep2 = K3.strike - netDebit / lotSize;

        // Métricas
        const metrics = {
            name: this.name,
            description: `K1=${K1.strike}, K2=${K2.strike}, K3=${K3.strike}`,
            maxProfit: maxProfit,
            maxLoss: netDebit,
            breakevens: [parseFloat(bep1.toFixed(2)), parseFloat(bep2.toFixed(2))].sort((a,b) => a-b),
            pernas: [
                { option: K1, direction: 'COMPRA', multiplier: 1 },
                { option: K2, direction: 'VENDA', multiplier: 2 },
                { option: K3, direction: 'COMPRA', multiplier: 1 },
            ],
            score: maxProfit / Math.abs(netDebit), 
        };
        return metrics;
    }
}

// 4. Classe IronCondorSpread (Mantida)
class IronCondorSpread extends BaseStrategy {
    name = 'Iron Condor Spread';
    calculateMetrics(options, fees, lotSize) {
        if (options.length !== 4) return null;
        
        // Iron Condor exige: K2(P) < K1(P) < K3(C) < K4(C)
        const puts = options.filter(o => o.tipo === 'PUT').sort((a, b) => a.strike - b.strike); // K2, K1
        const calls = options.filter(o => o.tipo === 'CALL').sort((a, b) => a.strike - b.strike); // K3, K4
        
        if (puts.length !== 2 || calls.length !== 2 || puts[1].strike >= calls[0].strike) {
            return null; // Condição inválida para Condor
        }

        const K2 = puts[0]; // Compra PUT (mais baixa, long)
        const K1 = puts[1]; // Venda PUT (short)
        const K3 = calls[0]; // Venda CALL (short)
        const K4 = calls[1]; // Compra CALL (mais alta, long)

        // Largura da Trava (Assumimos que são iguais)
        const width = K1.strike - K2.strike;
        
        // Crédito Líquido (Lucro Máximo) -> Vendas (K1+K3) - Compras (K2+K4)
        const netCredit = (K1.premio + K3.premio - K2.premio - K4.premio) * lotSize - fees;
        if (netCredit <= 0) return null; // Deve ser um crédito

        // Perda Máxima (Ocorre fora do range K2-K4)
        const maxLoss = -(width * lotSize - netCredit);

        // Ponto de Equilíbrio (BEP)
        const bepLow = K1.strike - netCredit / lotSize;
        const bepHigh = K3.strike + netCredit / lotSize;

        // Métricas
        const metrics = {
            name: this.name,
            description: `K2=${K2.strike}, K1=${K1.strike}, K3=${K3.strike}, K4=${K4.strike}`,
            maxProfit: netCredit,
            maxLoss: maxLoss,
            breakevens: [parseFloat(bepLow.toFixed(2)), parseFloat(bepHigh.toFixed(2))].sort((a,b) => a-b),
            pernas: [
                { option: K2, direction: 'COMPRA', multiplier: 1 },
                { option: K1, direction: 'VENDA', multiplier: 1 },
                { option: K3, direction: 'VENDA', multiplier: 1 },
                { option: K4, direction: 'COMPRA', multiplier: 1 },
            ],
            score: netCredit / Math.abs(maxLoss), // Retorno/Risco
        };
        return metrics;
    }
}

// --- 5. CLASSE PAYOFFCALCULATOR E MAPA DE ESTRATÉGIAS ---

export const SPREAD_MAP = {
    0: { name: 'Otimização Geral (Todos os Spreads)', strategies: [ new ButterflySpread(), new IronCondorSpread(), new BullCallSpread(), new BearCallSpread(), new BullPutSpread(), new BearPutSpread(), new LongStraddle(), new ShortStraddle(), new LongStrangle(), new ShortStrangle() ] },
    // Estratégias de 2 pernas (Funcionais)
    1: { name: 'Bull Call Spread', strategies: [new BullCallSpread()] },
    2: { name: 'Bear Call Spread', strategies: [new BearCallSpread()] },
    3: { name: 'Bull Put Spread', strategies: [new BullPutSpread()] },
    4: { name: 'Bear Put Spread', strategies: [new BearPutSpread()] },
    // Estratégias de Volatilidade (Funcionais)
    5: { name: 'Long Straddle', strategies: [new LongStraddle()] },
    6: { name: 'Short Straddle', strategies: [new ShortStraddle()] },
    7: { name: 'Long Strangle', strategies: [new LongStrangle()] },
    8: { name: 'Short Strangle', strategies: [new ShortStrangle()] },
    // Estratégias Funcionais (3 e 4 pernas)
    99: { name: 'Long Butterfly Call', strategies: [ new ButterflySpread() ] },
    100: { name: 'Iron Condor Spread', strategies: [ new IronCondorSpread() ] },
};

class PayoffCalculator {
    constructor(optionsData, fees = FEES, lotSize = LOT_SIZE) {
        this.optionsData = optionsData;
        this.fees = fees;
        this.lotSize = lotSize;
    }
    
    // --- Lógicas Auxiliares de Combinação ---

    findTwoLegCombinationsSameType(options, targetType) {
        const combinations = [];
        const filtered = options.filter(o => o.tipo === targetType);
        const groups = filtered.reduce((acc, current) => {
            const key = `${current.idAcao}-${current.vencimento}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(current);
            return acc;
        }, {});
        for (const key in groups) {
            const group = groups[key].sort((a, b) => a.strike - b.strike);
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    combinations.push([group[i], group[j]]); // Garante que options[0].strike < options[1].strike
                }
            }
        }
        return combinations;
    }

    findStraddleCombinations(options) {
        const combinations = [];
        const calls = options.filter(o => o.tipo === 'CALL');
        const puts = options.filter(o => o.tipo === 'PUT');
        
        const callMap = new Map(); // Mapa de { strike-vencimento-ativo: option }
        calls.forEach(c => callMap.set(`${c.strike}-${c.vencimento}-${c.idAcao}`, c));

        for (const put of puts) {
            const key = `${put.strike}-${put.vencimento}-${put.idAcao}`;
            const matchingCall = callMap.get(key);
            // Straddle: mesmo strike e vencimento
            if (matchingCall) {
                combinations.push([matchingCall, put]);
            }
        }
        return combinations;
    }

    /**
     * NOVO: Encontra combinações de 1 CALL e 1 PUT com strikes diferentes (Strangle).
     * Requer K_PUT < K_CALL.
     */
    findStrangleCombinations(options) {
        const combinations = [];
        const calls = options.filter(o => o.tipo === 'CALL');
        const puts = options.filter(o => o.tipo === 'PUT');
        
        const putGroups = puts.reduce((acc, current) => {
            const key = `${current.idAcao}-${current.vencimento}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(current);
            return acc;
        }, {});
        
        const callGroups = calls.reduce((acc, current) => {
            const key = `${current.idAcao}-${current.vencimento}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(current);
            return acc;
        }, {});

        // Itera sobre todos os grupos de vencimento/ativo
        for (const key in putGroups) {
            if (callGroups[key]) {
                const putGroup = putGroups[key];
                const callGroup = callGroups[key];

                for (const putOption of putGroup) {
                    for (const callOption of callGroup) {
                        // Strangle exige strikes diferentes e K_PUT < K_CALL
                        if (putOption.strike < callOption.strike) {
                            // Adiciona a PUT (strike mais baixo) primeiro
                            combinations.push([putOption, callOption]); 
                        }
                    }
                }
            }
        }
        return combinations;
    }

    findThreeLegCombinations(options, targetType) {
        const combinations = [];
        const filtered = options.filter(o => o.tipo === targetType);
        const TOLERANCE = 0.05;
        const groups = filtered.reduce((acc, current) => {
            const key = `${current.idAcao}-${current.vencimento}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(current);
            return acc;
        }, {});
        
        for (const key in groups) {
            const group = groups[key].sort((a, b) => a.strike - b.strike);
            const n = group.length;

            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    for (let k = j + 1; k < n; k++) {
                        const K1 = group[i].strike;
                        const K2 = group[j].strike; 
                        const K3 = group[k].strike;
                        
                        const diff1 = K2 - K1;
                        const diff2 = K3 - K2;
                        
                        // Verifica se os strikes são equidistantes (para Butterfly)
                        if (Math.abs(diff1 - diff2) < TOLERANCE && diff1 > 0) {
                             combinations.push([group[i], group[j], group[k]]);
                        }
                    }
                }
            }
        }
        return combinations;
    }

    findFourLegCombinations(options) {
        const combinations = [];
        const calls = options.filter(o => o.tipo === 'CALL');
        const puts = options.filter(o => o.tipo === 'PUT');
        const TOLERANCE = 0.10;

        const callGroups = calls.reduce((acc, current) => {
            const key = `${current.idAcao}-${current.vencimento}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(current);
            return acc;
        }, {});

        const putGroups = puts.reduce((acc, current) => {
            const key = `${current.idAcao}-${current.vencimento}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(current);
            return acc;
        }, {});

        for (const key in callGroups) {
            if (putGroups[key]) {
                const callGroup = callGroups[key].sort((a, b) => a.strike - b.strike); 
                const putGroup = putGroups[key].sort((a, b) => a.strike - b.strike); 

                const putSpreads = [];
                for (let i = 0; i < putGroup.length; i++) {
                    for (let j = i + 1; j < putGroup.length; j++) {
                        putSpreads.push([putGroup[i], putGroup[j]]); 
                    }
                }

                const callSpreads = [];
                for (let i = 0; i < callGroup.length; i++) {
                    // [CORREÇÃO 6]: Corrigido o loop infinito. j < callGroup.length
                    for (let j = i + 1; j < callGroup.length; j++) {
                        callSpreads.push([callGroup[i], callGroup[j]]); 
                    }
                }

                for (const putSpread of putSpreads) {
                    const K2 = putSpread[0].strike; // Compra PUT (mais baixa)
                    const K1 = putSpread[1].strike; // Venda PUT
                    const widthPut = K1 - K2;

                    for (const callSpread of callSpreads) {
                        const K3 = callSpread[0].strike; // Venda CALL
                        const K4 = callSpread[1].strike; // Compra CALL (mais alta)
                        const widthCall = K4 - K3;

                        // Condição de Iron Condor: K1 < K3 e larguras similares
                        if (K1 < K3 && Math.abs(widthPut - widthCall) < TOLERANCE) {
                            combinations.push([
                                putSpread[0], putSpread[1], 
                                callSpread[0], callSpread[1] 
                            ]);
                        }
                    }
                }
            }
        }
        return combinations;
    }
    
    // --- LÓGICA DO PAYOFF NO VENCIMENTO (Mantida) ---

    calculateSingleLegPayoff(leg, assetPrice, lotSize) {
        const strike = leg.option.strike;
        const premium = leg.option.premio;
        const multiplier = leg.multiplier;
        const isCompra = leg.direction === 'COMPRA';

        let payoffUnitario;

        if (leg.option.tipo === 'CALL') {
            const intrinsicValue = Math.max(0, assetPrice - strike);
            
            if (isCompra) { 
                payoffUnitario = intrinsicValue - premium;
            } else { 
                payoffUnitario = -intrinsicValue + premium;
            }

        } else { // PUT
            const intrinsicValue = Math.max(0, strike - assetPrice);

            if (isCompra) { 
                payoffUnitario = intrinsicValue - premium;
            } else { 
                payoffUnitario = -intrinsicValue + premium;
            }
        }

        return payoffUnitario * multiplier * lotSize;
    }

    generatePriceRange(currentPrice, rangePercent, steps) {
        const minPrice = currentPrice * (1 - rangePercent);
        const maxPrice = currentPrice * (1 + rangePercent);
        const stepSize = (maxPrice - minPrice) / (steps - 1);
        
        const priceRange = [];
        for (let i = 0; i < steps; i++) {
            priceRange.push(minPrice + i * stepSize);
        }
        return priceRange;
    }

    calculatePayoffCurve(
        strategy, 
        currentAssetPrice, 
        rangePercent = 0.20,
        steps = 100
    ) {
        if (!strategy.pernas || strategy.pernas.length === 0) return [];
        
        const priceRange = this.generatePriceRange(currentAssetPrice, rangePercent, steps);
        const totalPayoffCurve = [];
        const netFees = this.fees; 

        for (const price of priceRange) {
            let totalPayoff = 0;
            
            for (const leg of strategy.pernas) {
                totalPayoff += this.calculateSingleLegPayoff(leg, price, this.lotSize);
            }
            
            const netPnL = totalPayoff - netFees;
            
            totalPayoffCurve.push({
                price: parseFloat(price.toFixed(2)),
                pnl: parseFloat(netPnL.toFixed(2))
            });
        }
        
        return totalPayoffCurve;
    }
    
    // --- LÓGICA DE OTIMIZAÇÃO GERAL (ATUALIZADA) ---

    findAndCalculateSpreads(selectionKey) {
        const strategyDef = SPREAD_MAP[selectionKey];
        if (!strategyDef || strategyDef.strategies.length === 0) return [];

        const strategiesToRun = strategyDef.strategies;
        const calculatedResults = [];
        
        // --- 2 PERNAS VERTICAIS (Bull/Bear Call/Put) ---
        const runVerticalTwoLeg = strategiesToRun.some(s => 
            s instanceof BullCallSpread || 
            s instanceof BearCallSpread || 
            s instanceof BullPutSpread || 
            s instanceof BearPutSpread
        );

        if (runVerticalTwoLeg) {
            const allTwoLegCombinations = [
                ...this.findTwoLegCombinationsSameType(this.optionsData, 'CALL'),
                ...this.findTwoLegCombinationsSameType(this.optionsData, 'PUT'),
            ];
            
            for (const combo of allTwoLegCombinations) {
                for (const strategyObj of strategiesToRun) {
                    const result = strategyObj.calculateMetrics(combo, this.fees, this.lotSize);
                    if (result) calculatedResults.push(result);
                }
            }
        }
        
        // --- 2 PERNAS VOLATILIDADE (Straddle - mesmo strike) ---
        const runStraddle = strategiesToRun.some(s => 
            s instanceof LongStraddle || 
            s instanceof ShortStraddle
        );

        if (runStraddle) {
            const straddleCombinations = this.findStraddleCombinations(this.optionsData);
            
            for (const combo of straddleCombinations) {
                for (const strategyObj of strategiesToRun) {
                    const result = strategyObj.calculateMetrics(combo, this.fees, this.lotSize);
                    if (result) calculatedResults.push(result);
                }
            }
        }

        // --- 2 PERNAS VOLATILIDADE (Strangle - strikes diferentes) ---
        const runStrangle = strategiesToRun.some(s => 
            s instanceof LongStrangle || 
            s instanceof ShortStrangle
        );
        
        if (runStrangle) {
            const strangleCombinations = this.findStrangleCombinations(this.optionsData);
            
            for (const combo of strangleCombinations) {
                // Combinação é [PUT, CALL]
                for (const strategyObj of strategiesToRun) {
                    const result = strategyObj.calculateMetrics(combo, this.fees, this.lotSize);
                    if (result) calculatedResults.push(result);
                }
            }
        }


        // --- 3 PERNAS (Butterfly) ---
        const runButterfly = strategiesToRun.some(s => s instanceof ButterflySpread);
        if (runButterfly) {
            const butterflySpreads = strategiesToRun.filter(s => s instanceof ButterflySpread);
            const butterflyCombinations = this.findThreeLegCombinations(this.optionsData, 'CALL'); // Assume Call Butterfly por enquanto
            
            for (const combo of butterflyCombinations) {
                 for (const strategyObj of butterflySpreads) {
                    const result = strategyObj.calculateMetrics(combo, this.fees, this.lotSize);
                    if (result) calculatedResults.push(result);
                }
            }
        }

        // --- 4 PERNAS (Iron Condor) ---
        const runCondor = strategiesToRun.some(s => s instanceof IronCondorSpread);
        if (runCondor) {
            const condorSpreads = strategiesToRun.filter(s => s instanceof IronCondorSpread);
            const condorCombinations = this.findFourLegCombinations(this.optionsData);
            
            for (const combo of condorCombinations) {
                 for (const strategyObj of condorSpreads) {
                    const result = strategyObj.calculateMetrics(combo, this.fees, this.lotSize);
                    if (result) calculatedResults.push(result);
                }
            }
        }
        
        // ... Lógica final de retorno ...
        return calculatedResults;
    }
}