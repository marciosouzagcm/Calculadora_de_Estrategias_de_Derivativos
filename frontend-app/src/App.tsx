import React, { useState, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Target, TrendingUp, TrendingDown, Scale, Plus, Minus, X, Trash2, Zap, Clock, DollarSign, Activity } from 'lucide-react';

// =========================================================================
// 1. Tipos e Interfaces (TypeScript)
// =========================================================================

// Tipos de Opções (CALL = Compra do Ativo, PUT = Venda do Ativo)
type OptionType = "CALL" | "PUT";
// Tipos de Ação (Aberto: Compra (Long), Fechado: Venda (Short))
type ActionType = "Compra" | "Venda";
// Tipos de Análise no Seletor
type AnalysisType =
    | "Otimização Geral (Todos os Spreads)"
    | "Bull Call Spread (Débito)"
    | "Bear Call Spread (Crédito)"
    | "Bull Put Spread (Crédito)"
    | "Bear Put Spread (Débito)"
    | "Long Straddle (Débito)"
    | "Short Straddle (Crédito)"
    | "Long Strangle (Débito)"
    | "Short Strangle (Crédito)"
    | "Long Butterfly Call (Débito)";


// Interface para cada perna da estratégia (uma opção)
interface OptionLeg {
    id: string | number;
    type: OptionType;
    action: ActionType;
    strike: number;
    premium: number;
    quantity: number; // Positivo para compra (+100), negativo para venda (-100). Usaremos +/-1 no cálculo por estratégia unitária
    label?: string; // Ex: K120
}

// Interface para a estratégia completa (usada no otimizador)
interface StrategyResult {
    id: number;
    name: string;
    legs: OptionLeg[];
    maxLoss: number | "Ilimitada";
    maxProfit: number | "Ilimitado";
    netCost: number;
    riskRewardScore: number;
    label: string;
    breakEvenPoints: number[];
}

// =========================================================================
// 2. Funções de Precificação - Estrutura Black-Scholes (Simplificada/Simulada)
// =========================================================================

// Esta função SIMULADA deve ser substituída pela implementação Black-Scholes.
// Os parâmetros de entrada já estão prontos para Black-Scholes (S, K, T, r, sigma)
const calculateBlackScholesPremium = (
    type: OptionType,
    spot: number,
    strike: number,
    T: number, // Dias para o vencimento / 365
    r: number, // Taxa livre de risco
    sigma: number // Volatilidade
): number => {
    // --- IMPLEMENTAÇÃO SIMULADA (Manter a funcionalidade) ---
    // Spot é o preço atual do subjacente (S)
    // Strike é o preço de exercício (K)

    // Fator de ajuste simplificado para Vol/Tempo (sigma/r)
    const factor = sigma * 0.5 + T * 0.05;

    let premium = 0;
    if (type === 'CALL') {
        // Retorna o valor intrínseco mais um valor temporal simplificado
        premium = Math.max(0, spot - strike) + (strike * factor * 0.5);
    } else { // PUT
        // Retorna o valor intrínseco mais um valor temporal simplificado
        premium = Math.max(0, strike - spot) + (strike * factor * 0.5);
    }

    // Garante que o prêmio seja positivo e com um mínimo de 1.0 (ajuste arbitrário de simulação)
    return Math.max(1.0, premium);
};

// =========================================================================
// 3. Lógica Principal de Cálculo
// =========================================================================

// Calcula o Payoff (Lucro/Prejuízo) de uma única perna de opção no vencimento (T)
const calculateOptionPayoff = (leg: OptionLeg, spotAtT: number): number => {
    const { type, strike, premium, action, quantity } = leg;

    // Fator de ajuste para Compra (1) ou Venda (-1) e considera a quantidade (+/-)
    const multiplier = quantity > 0 ? 1 : -1;
    const absQuantity = Math.abs(quantity);

    let intrinsicValue = 0;

    if (type === 'CALL') {
        // Opção de Compra (Call): Lucro se o Spot for > Strike
        intrinsicValue = Math.max(0, spotAtT - strike);
    } else {
        // Opção de Venda (Put): Lucro se o Spot for < Strike
        intrinsicValue = Math.max(0, strike - spotAtT);
    }

    // Payoff = (Valor Intrínseco - Prêmio) * Multiplicador * Quantidade
    // O prêmio é sempre subtraído para a Compra, e adicionado para a Venda (Crédito)
    // Payoff Unitário = (Valor Intrínseco - Prêmio para Compra) ou (Prêmio - Valor Intrínseco para Venda)
    const payoffUnit = (action === 'Compra') ? (intrinsicValue - premium) : (premium - intrinsicValue);
    
    return payoffUnit * absQuantity;
};

// Calcula o Payoff Total da Estratégia
const calculateStrategyPayoff = (legs: OptionLeg[], spotAtT: number): number => {
    return legs.reduce((total, leg) => {
        return total + calculateOptionPayoff(leg, spotAtT);
    }, 0);
};

// Calcula as métricas de risco/retorno e custo líquido para uma estratégia
const calculateStrategyMetrics = (legs: OptionLeg[], spotPrices: number[]): { maxLoss: number | "Ilimitada", maxProfit: number | "Ilimitado", netCost: number, riskRewardScore: number } => {

    // 1. Custo Líquido (Débito ou Crédito)
    const netCost = legs.reduce((total, leg) => {
        // Débito (Compra) = -Prêmio * Quantidade
        // Crédito (Venda) = +Prêmio * Quantidade
        const sign = leg.action === 'Compra' ? -1 : 1;
        // Consideramos a quantidade como positiva no cálculo do custo, pois 'leg.quantity' é a unidade do lote
        return total + (leg.premium * sign * Math.abs(leg.quantity));
    }, 0);

    // 2. Payoff Máximo e Perda Máxima
    // Para estratégias complexas, precisamos simular em um range de preços.
    const payoffs = spotPrices.map(spot => calculateStrategyPayoff(legs, spot));

    // Assumindo que a perda e o lucro máximo ocorrerão dentro do range analisado.
    const simulatedMaxProfit = Math.max(...payoffs);
    const simulatedMaxLoss = Math.min(...payoffs);

    // Tentativa de definir risco/retorno como Ilimitado para estratégias abertas (e.g., Long Call/Put, Short Straddle)
    let maxProfit: number | "Ilimitado" = simulatedMaxProfit;
    let maxLoss: number | "Ilimitada" = simulatedMaxLoss;

    // Se o último payoff for positivo e crescente (Long Call/Long Straddle)
    if (legs.some(leg => (leg.type === 'CALL' && leg.action === 'Compra' && leg.quantity > 0))) {
        // Se a estratégia incluir uma Long Call desprotegida (que não foi compensada por uma Short Call de strike maior)
        const hasUncappedProfit = legs.filter(l => l.type === 'CALL' && l.action === 'Compra').length > legs.filter(l => l.type === 'CALL' && l.action === 'Venda').length;
        if (hasUncappedProfit && payoffs[payoffs.length - 1] > payoffs[payoffs.length - 2]) {
             maxProfit = "Ilimitado";
        }
    }

    // Se o primeiro payoff for positivo/negativo e decrescente (Short Put/Short Straddle)
    if (legs.some(leg => (leg.type === 'PUT' && leg.action === 'Venda' && leg.quantity < 0))) {
        // Se a estratégia incluir uma Short Put desprotegida (que não foi compensada por uma Long Put de strike menor)
        const hasUncappedLoss = legs.filter(l => l.type === 'PUT' && l.action === 'Venda').length > legs.filter(l => l.type === 'PUT' && l.action === 'Compra').length;
        if (hasUncappedLoss && payoffs[0] < payoffs[1]) {
             maxLoss = "Ilimitada";
        }
    }


    // 3. Score Risco/Retorno
    let score = 0;
    const profitValue = typeof maxProfit === 'number' ? maxProfit : (simulatedMaxProfit > 0 ? simulatedMaxProfit : 1);
    const lossValue = typeof maxLoss === 'number' ? Math.abs(maxLoss) : (Math.abs(simulatedMaxLoss) > 0 ? Math.abs(simulatedMaxLoss) : 1);

    if (maxProfit === "Ilimitado" && lossValue > 0) {
        score = Infinity;
    } else if (profitValue > 0 && lossValue > 0) {
        score = profitValue / lossValue;
    }

    return { maxLoss, maxProfit, netCost, riskRewardScore: parseFloat(score.toFixed(2)) };
};

// =========================================================================
// 4. Componente Principal
// =========================================================================

const OptionStrategyAnalyzer: React.FC = () => {
    // === States Principais ===
    const [spotPrice, setSpotPrice] = useState<number>(100.00);
    const [analysisType, setAnalysisType] = useState<AnalysisType>("Otimização Geral (Todos os Spreads)");
    const [selectedStrategyId, setSelectedStrategyId] = useState<number | null>(null);

    // Parâmetros Black-Scholes
    const [volatility, setVolatility] = useState<number>(0.20); // 20%
    const [riskFreeRate, setRiskFreeRate] = useState<number>(0.10); // 10%
    const [daysToExpiry, setDaysToExpiry] = useState<number>(30); // 30 dias

    // Range de strikes de simulação
    const simulatedStrikes = useMemo(() => [80, 90, 100, 110, 120, 130], []);
    const T = daysToExpiry / 365; // Tempo em anos

    // Estratégia Manual
    const [manualLegs, setManualLegs] = useState<OptionLeg[]>([]);
    const [isManualMode, setIsManualMode] = useState<boolean>(false);

    // === Lógica de Geração de Opções (Simulação de Mercados) ===
    const simulatedOptions = useMemo(() => {
        const options: OptionLeg[] = [];

        simulatedStrikes.forEach((strike) => {
            const label = `K${strike}`;

            const callPremium = calculateBlackScholesPremium('CALL', spotPrice, strike, T, riskFreeRate, volatility);
            const putPremium = calculateBlackScholesPremium('PUT', spotPrice, strike, T, riskFreeRate, volatility);

            // Call
            options.push({
                id: `C${strike}`,
                type: 'CALL',
                action: 'Venda', // Placeholder action
                strike,
                premium: parseFloat(callPremium.toFixed(2)),
                quantity: 1, // Unidade
                label
            });

            // Put
            options.push({
                id: `P${strike}`,
                type: 'PUT',
                action: 'Venda', // Placeholder action
                strike,
                premium: parseFloat(putPremium.toFixed(2)),
                quantity: 1, // Unidade
                label
            });
        });
        return options;
    }, [spotPrice, simulatedStrikes, volatility, riskFreeRate, T]);


    // === Lógica de Otimização e Geração de Estratégias ===
    const allStrategies = useMemo(() => {
        const results: StrategyResult[] = [];
        let idCounter = 1000;
        const spotRange = Array.from({ length: 201 }, (_, i) => spotPrice - 100 + i * 1); // Range expandido

        // Helper para gerar um par de pernas de spread
        const generateStrategy = (name: string, legs: { type: OptionType, strike: number, action: ActionType, quantity: number }[]) => {

            const finalLegs: OptionLeg[] = legs.map((leg, index) => {
                const simulatedLeg = simulatedOptions.find(opt => opt.strike === leg.strike && opt.type === leg.type);
                if (!simulatedLeg) throw new Error(`Opção simulada K${leg.strike} ${leg.type} não encontrada.`);

                return {
                    ...simulatedLeg,
                    id: `${simulatedLeg.id}-${idCounter}-${index}`,
                    action: leg.action,
                    quantity: leg.action === 'Compra' ? leg.quantity : -leg.quantity,
                    label: `K${leg.strike}`
                };
            });
            
            // Recalcula o Label de Custo (Débito/Crédito)
            const metrics = calculateStrategyMetrics(finalLegs, spotRange);
            const debitCredit = metrics.netCost > 0 ? 'Crédito' : 'Débito';
            const strategyName = `${name} (${debitCredit})`;
            
            // Aplica filtro básico
            if (metrics.maxProfit !== 'Ilimitado' || metrics.maxLoss !== 'Ilimitada') {
                results.push({
                    id: idCounter++,
                    name: strategyName,
                    legs: finalLegs,
                    ...metrics,
                    label: strategyName,
                    breakEvenPoints: [],
                });
            }
        };

        // --- Geração de Spreads (Bull/Bear) ---
        const strikes = simulatedStrikes;
        
        for (let i = 0; i < strikes.length; i++) {
            for (let j = i + 1; j < strikes.length; j++) {
                const strikeA = strikes[i];
                const strikeB = strikes[j];

                // Bull Call Spread (Débito) - Compra K(A) / Vende K(B). A < B.
                generateStrategy(`Bull Call Spread K${strikeA}/K${strikeB}`, [
                    { type: 'CALL', strike: strikeA, action: 'Compra', quantity: 1 },
                    { type: 'CALL', strike: strikeB, action: 'Venda', quantity: 1 },
                ]);

                // Bear Call Spread (Crédito) - Vende K(A) / Compra K(B). A < B.
                generateStrategy(`Bear Call Spread K${strikeA}/K${strikeB}`, [
                    { type: 'CALL', strike: strikeA, action: 'Venda', quantity: 1 },
                    { type: 'CALL', strike: strikeB, action: 'Compra', quantity: 1 },
                ]);
                
                // Bull Put Spread (Crédito) - Vende K(B) / Compra K(A). A < B.
                generateStrategy(`Bull Put Spread K${strikeB}/K${strikeA}`, [
                    { type: 'PUT', strike: strikeB, action: 'Venda', quantity: 1 },
                    { type: 'PUT', strike: strikeA, action: 'Compra', quantity: 1 },
                ]);
                
                // Bear Put Spread (Débito) - Compra K(B) / Vende K(A). A < B.
                generateStrategy(`Bear Put Spread K${strikeB}/K${strikeA}`, [
                    { type: 'PUT', strike: strikeB, action: 'Compra', quantity: 1 },
                    { type: 'PUT', strike: strikeA, action: 'Venda', quantity: 1 },
                ]);
            }
        }

        // --- Geração de Estratégias Neutras (ATM e OTM) ---
        const ATMStrike = strikes.find(s => s >= spotPrice) || strikes[Math.floor(strikes.length / 2)];

        // Long Straddle (Débito) - Compra Call e Put no mesmo Strike (ATM)
        generateStrategy(`Long Straddle K${ATMStrike}`, [
            { type: 'CALL', strike: ATMStrike, action: 'Compra', quantity: 1 },
            { type: 'PUT', strike: ATMStrike, action: 'Compra', quantity: 1 },
        ]);

        // Long Butterfly Call (3 pernas, ATM)
        // Compra K(A), Vende 2x K(B), Compra K(C). A < B < C. B é o strike central (ATM).
        const middleIndex = strikes.indexOf(ATMStrike);
        if (middleIndex > 0 && middleIndex < strikes.length - 1) {
            const strikeA = strikes[middleIndex - 1]; // Lower
            const strikeC = strikes[middleIndex + 1]; // Higher

            generateStrategy(`Long Call Butterfly K${strikeA}/K${ATMStrike}/K${strikeC}`, [
                { type: 'CALL', strike: strikeA, action: 'Compra', quantity: 1 },
                { type: 'CALL', strike: ATMStrike, action: 'Venda', quantity: 2 },
                { type: 'CALL', strike: strikeC, action: 'Compra', quantity: 1 },
            ]);
        }
        
        // --- ADICIONA ESTRATÉGIA MANUAL se no modo manual ---
        if(isManualMode && manualLegs.length > 0) {
            const metrics = calculateStrategyMetrics(manualLegs, spotRange);
            const debitCredit = metrics.netCost > 0 ? 'Crédito' : 'Débito';
            results.push({
                id: 9999, // ID Fixo para Estratégia Manual
                name: `Estratégia Manual (${debitCredit})`,
                legs: manualLegs,
                ...metrics,
                label: `Estratégia Manual (${debitCredit})`,
                breakEvenPoints: [],
            });
        }


        return results;

    }, [simulatedOptions, spotPrice, simulatedStrikes, isManualMode, manualLegs]); // Recalcula quando o preço Spot muda

    // === Filtros e Ordenação ===
    const filteredStrategies = useMemo(() => {
        let list = allStrategies.filter(s => s.id !== 9999); // Exclui a manual do ranking
        
        // 1. Filtro por Tipo de Análise
        if (analysisType !== "Otimização Geral (Todos os Spreads)") {
            list = list.filter(s => s.name.includes(analysisType.replace(/\s+\(.*\)/, '')));
        }
        
        // 2. Ordenação para o Ranking (Melhor Risco/Retorno)
        list.sort((a, b) => b.riskRewardScore - a.riskRewardScore);
        
        // 3. Adiciona a estratégia manual no topo se estiver no modo manual e houver pernas
        if (isManualMode && allStrategies.find(s => s.id === 9999)) {
            return [allStrategies.find(s => s.id === 9999)!, ...list];
        }

        return list;

    }, [allStrategies, analysisType, isManualMode]);


    // === Estratégia Selecionada e Dados do Gráfico ===
    const selectedStrategy = useMemo(() => {
        if (selectedStrategyId === null && filteredStrategies.length > 0) {
            // Seleciona a melhor ranqueada por padrão (ou a manual se for a primeira)
            return filteredStrategies[0];
        }
        return filteredStrategies.find(s => s.id === selectedStrategyId) || null;
    }, [selectedStrategyId, filteredStrategies]);


    // Cria os dados para o gráfico de Payoff
    const payoffChartData = useMemo(() => {
        if (!selectedStrategy) return [];

        // Define o range do eixo X (Preço do Ativo)
        const range = Array.from({ length: 201 }, (_, i) => spotPrice - 100 + i * 1);

        return range.map(spot => ({
            spot: spot,
            payoff: calculateStrategyPayoff(selectedStrategy.legs, spot),
        }));
    }, [selectedStrategy, spotPrice]);


    // Calcula os pontos de equilíbrio (Breakeven Points)
    const breakEvenPoints = useMemo(() => {
        if (!selectedStrategy || payoffChartData.length === 0) return [];

        const points: number[] = [];

        for (let i = 1; i < payoffChartData.length; i++) {
            const current = payoffChartData[i];
            const previous = payoffChartData[i - 1];

            // Verifica a mudança de sinal (onde o Payoff cruza zero)
            if ((previous.payoff <= 0 && current.payoff > 0) || (previous.payoff >= 0 && current.payoff < 0)) {
                // Cálculo de interpolação linear para encontrar o ponto exato de cruzamento
                const spotDifference = current.spot - previous.spot;
                const payoffDifference = current.payoff - previous.payoff;
                // Spot = previous.spot - (previous.payoff * spotDifference) / payoffDifference
                const breakEven = previous.spot - (previous.payoff * spotDifference) / payoffDifference;
                
                points.push(parseFloat(breakEven.toFixed(2)));
            }
        }
        
        return points;
    }, [selectedStrategy, payoffChartData]);

    // === Manipulação da Estratégia Manual ===
    const handleAddManualLeg = (newLeg: Omit<OptionLeg, 'id' | 'premium' | 'label'>) => {
        const simulatedLeg = simulatedOptions.find(opt => opt.strike === newLeg.strike && opt.type === newLeg.type);
        if (!simulatedLeg) {
            alert(`Opção K${newLeg.strike} ${newLeg.type} não encontrada na simulação. Adicione o strike na lista de simulatedStrikes.`);
            return;
        }

        const legToAdd: OptionLeg = {
            id: Date.now() + Math.random(),
            ...newLeg,
            premium: simulatedLeg.premium,
            quantity: newLeg.action === 'Compra' ? newLeg.quantity : -newLeg.quantity,
            label: `K${newLeg.strike}`
        };

        setManualLegs(prev => [...prev, legToAdd]);
        setIsManualMode(true);
        setSelectedStrategyId(9999); // Seleciona a manual
    };

    const handleRemoveManualLeg = (id: string | number) => {
        setManualLegs(prev => prev.filter(leg => leg.id !== id));
    };


    // === Renderização ===

    // Formata valores monetários
    const formatCurrency = useCallback((value: number | "Ilimitado" | "Ilimitada"): string => {
        if (value === "Ilimitado" || value === "Ilimitada") return value;
        if (value === Infinity || value === -Infinity) return "Ilimitado";

        const sign = value < 0 ? 'R$ -' : 'R$ ';
        const absValue = Math.abs(value);
        
        return `${sign}${absValue.toFixed(2).replace('.', ',')}`;
    }, []);
    
    // Formata o valor do Payoff no Tooltip do gráfico
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-800 text-white p-2 border border-gray-700 shadow-lg rounded-lg text-sm">
                    <p className="font-bold">{`Preço (Spot): R$ ${label.toFixed(2)}`}</p>
                    <p className="text-sm">
                        {`Payoff: `}
                        <span className={payload[0].value >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {formatCurrency(payload[0].value)}
                        </span>
                    </p>
                </div>
            );
        }
        return null;
    };


    // --- Sub-componente para Adicionar Pernas Manuais ---
    const ManualLegInput: React.FC = () => {
        const [strike, setStrike] = useState(simulatedStrikes[2]);
        const [type, setType] = useState<OptionType>('CALL');
        const [action, setAction] = useState<ActionType>('Compra');
        const [quantity, setQuantity] = useState(100);

        const handleAdd = () => {
            handleAddManualLeg({ strike, type, action, quantity });
        };

        return (
            <div className="p-4 border border-indigo-200 bg-indigo-50 rounded-lg">
                <h3 className="font-bold text-indigo-800 mb-3 flex items-center"><Plus className="w-4 h-4 mr-2" /> Adicionar Perna Manual</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    
                    <div>
                        <label className="block text-xs font-medium text-gray-700">Strike</label>
                        <select
                            value={strike}
                            onChange={(e) => setStrike(parseFloat(e.target.value))}
                            className="mt-1 block w-full py-1 px-2 border border-gray-300 bg-white rounded-md shadow-sm text-sm"
                        >
                            {simulatedStrikes.map(s => <option key={s} value={s}>{`K${s}`}</option>)}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-medium text-gray-700">Tipo</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as OptionType)}
                            className="mt-1 block w-full py-1 px-2 border border-gray-300 bg-white rounded-md shadow-sm text-sm"
                        >
                            <option value="CALL">CALL</option>
                            <option value="PUT">PUT</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-medium text-gray-700">Ação</label>
                        <select
                            value={action}
                            onChange={(e) => setAction(e.target.value as ActionType)}
                            className="mt-1 block w-full py-1 px-2 border border-gray-300 bg-white rounded-md shadow-sm text-sm"
                        >
                            <option value="Compra">Compra (Long)</option>
                            <option value="Venda">Venda (Short)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700">Qtd.</label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                            min="1"
                            className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm"
                        />
                    </div>
                    
                    <div className="flex items-end">
                        <button
                            onClick={handleAdd}
                            className="w-full bg-indigo-600 text-white py-1 px-2 rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
                        >
                            Adicionar
                        </button>
                    </div>
                </div>

                {/* Lista de Legs Manuais */}
                {manualLegs.length > 0 && (
                    <div className="mt-4">
                        <h4 className="text-sm font-semibold text-indigo-700 mb-2">Pernas Atuais:</h4>
                        <div className="space-y-1">
                            {manualLegs.map(leg => (
                                <div key={leg.id} className="flex justify-between items-center bg-white p-2 border border-indigo-100 rounded-md text-sm">
                                    <span className="font-medium text-gray-900">
                                        {leg.action === 'Compra' ? <Plus className="w-3 h-3 inline mr-1 text-green-600" /> : <Minus className="w-3 h-3 inline mr-1 text-red-600" />}
                                        {Math.abs(leg.quantity)}x {leg.type} @ K{leg.strike} (Prêmio: {formatCurrency(leg.premium)})
                                    </span>
                                    <button onClick={() => handleRemoveManualLeg(leg.id)} className="text-red-500 hover:text-red-700 p-1">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };


    return (
        <div className="p-8 bg-white shadow-2xl rounded-xl w-full max-w-7xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 flex items-center">
                    <Target className="mr-3 text-indigo-600 w-8 h-8" />
                    Analisador de Estratégias de Opções
                </h1>
                <p className="text-gray-500 mt-1">
                    Calcule e Otimize as métricas de risco/retorno e o Payoff no vencimento usando a **estrutura Black-Scholes**.
                </p>
            </header>

            {/* --- Dados de Entrada e Seleção --- */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
                
                {/* Ativo Subjacente */}
                <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Ativo Subjacente</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-100 text-gray-500 sm:text-sm">
                            <TrendingUp className="w-4 h-4" />
                        </span>
                        <input
                            type="text"
                            value="BOVA11 (Simulação)"
                            readOnly
                            className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white font-semibold text-gray-900"
                        />
                    </div>
                </div>

                {/* Preço Atual (Spot) */}
                <div className="col-span-1">
                    <label htmlFor="spot-price" className="block text-sm font-medium text-gray-700">Preço Atual (Spot)</label>
                    <input
                        type="number"
                        id="spot-price"
                        value={spotPrice}
                        onChange={(e) => setSpotPrice(parseFloat(e.target.value) || 0)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="100.00"
                    />
                </div>

                {/* Parâmetros BS */}
                <div className="col-span-2 grid grid-cols-3 gap-3">
                    <div>
                        <label htmlFor="volatility" className="block text-sm font-medium text-gray-700 flex items-center"><Activity className='w-3 h-3 mr-1' /> Volatilidade (%)</label>
                        <input
                            type="number"
                            id="volatility"
                            value={volatility * 100}
                            onChange={(e) => setVolatility(parseFloat(e.target.value) / 100 || 0)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                            step="0.01"
                        />
                    </div>
                    <div>
                        <label htmlFor="rate" className="block text-sm font-medium text-gray-700 flex items-center"><DollarSign className='w-3 h-3 mr-1' /> Taxa Livre de Risco (%)</label>
                        <input
                            type="number"
                            id="rate"
                            value={riskFreeRate * 100}
                            onChange={(e) => setRiskFreeRate(parseFloat(e.target.value) / 100 || 0)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                            step="0.01"
                        />
                    </div>
                    <div>
                        <label htmlFor="days" className="block text-sm font-medium text-gray-700 flex items-center"><Clock className='w-3 h-3 mr-1' /> Dias para o Vencimento</label>
                        <input
                            type="number"
                            id="days"
                            value={daysToExpiry}
                            onChange={(e) => setDaysToExpiry(parseInt(e.target.value) || 0)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                            min="1"
                        />
                    </div>
                </div>

            </div>

            {/* --- Modo Manual / Otimizador --- */}
            <div className='mb-6'>
                <ManualLegInput />
                <div className="flex items-center justify-between mt-4">
                    <button
                        onClick={() => { setIsManualMode(false); setAnalysisType("Otimização Geral (Todos os Spreads)"); setSelectedStrategyId(null); }}
                        className={`py-2 px-4 rounded-lg font-semibold transition-colors duration-150 ${!isManualMode ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-indigo-600 border border-indigo-600 hover:bg-indigo-50'}`}
                    >
                        {isManualMode && <X className="w-4 h-4 inline mr-1" />}
                        {isManualMode ? 'Sair do Modo Manual e Ver Otimizador' : 'Modo Otimizador Ativo'}
                    </button>
                    {isManualMode && (
                         <button
                            onClick={() => { setManualLegs([]); setSelectedStrategyId(null); }}
                            className="text-red-500 hover:text-red-700 font-medium flex items-center"
                        >
                            <Trash2 className="w-4 h-4 mr-1" /> Limpar Pernas Manuais
                        </button>
                    )}
                </div>
            </div>

            {/* --- Resultados: Ranking e Detalhes --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Coluna 1: Ranking do Otimizador / Seletor */}
                <div className="lg:col-span-1">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <Zap className="w-5 h-5 mr-2 text-yellow-600" />
                        {isManualMode ? 'Estratégia Manual' : 'Ranking Otimizador (Top 5 por R/R)'}
                    </h2>
                    
                    {!isManualMode && (
                        <div className="mb-4">
                            <label htmlFor="analysis-type" className="block text-sm font-medium text-gray-700">Filtrar por Tipo</label>
                            <select
                                id="analysis-type"
                                value={analysisType}
                                onChange={(e) => {
                                    setAnalysisType(e.target.value as AnalysisType);
                                    setSelectedStrategyId(null); // Reseta a seleção
                                }}
                                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="Otimização Geral (Todos os Spreads)">Otimização Geral (Todos os Spreads)</option>
                                <option disabled>--- Spreads de Call ---</option>
                                <option value="Bull Call Spread (Débito)">Bull Call Spread (Débito)</option>
                                <option value="Bear Call Spread (Crédito)">Bear Call Spread (Crédito)</option>
                                <option disabled>--- Spreads de Put ---</option>
                                <option value="Bull Put Spread (Crédito)">Bull Put Spread (Crédito)</option>
                                <option value="Bear Put Spread (Débito)">Bear Put Spread (Débito)</option>
                                <option disabled>--- Estratégias Neutras ---</option>
                                <option value="Long Straddle (Débito)">Long Straddle (Débito)</option>
                                <option value="Short Straddle (Crédito)">Short Straddle (Crédito)</option>
                                <option value="Long Strangle (Débito)">Long Strangle (Débito)</option>
                                <option value="Short Strangle (Crédito)">Short Strangle (Crédito)</option>
                                <option value="Long Butterfly Call (Débito)">Long Butterfly Call (Débito)</option>
                            </select>
                        </div>
                    )}

                    
                    <ul className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                        {filteredStrategies.slice(0, isManualMode ? 1 : 5).map((strategy) => (
                            <li
                                key={strategy.id}
                                onClick={() => setSelectedStrategyId(strategy.id)}
                                className={`p-4 rounded-lg cursor-pointer transition-all duration-200 
                                    ${selectedStrategy?.id === strategy.id 
                                        ? 'bg-indigo-100 border-2 border-indigo-600 shadow-md' 
                                        : 'bg-white border border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                <p className="text-md font-semibold text-gray-900">
                                    {isManualMode ? 'ID 9999' : strategy.id}.&nbsp;
                                    {strategy.label}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                    <span className="font-medium text-green-600">L. Máx: {formatCurrency(strategy.maxProfit)}</span> / 
                                    <span className="font-medium text-red-600"> P. Máx: {formatCurrency(strategy.maxLoss)}</span>
                                </p>
                                <p className="text-xs text-gray-500">R/R Score: {strategy.riskRewardScore.toFixed(2)}</p>
                            </li>
                        ))}
                    </ul>
                    {filteredStrategies.length === 0 && (
                        <p className="text-sm text-gray-500 mt-4 p-4 border rounded-md">
                            Nenhuma estratégia encontrada para o filtro atual.
                        </p>
                    )}
                </div>

                {/* Coluna 2 e 3: Gráfico e Detalhes da Estratégia Selecionada */}
                <div className="lg:col-span-2">
                    {selectedStrategy ? (
                        <div className="space-y-6">
                            
                            {/* Título do Gráfico */}
                            <h2 className="text-xl font-bold text-gray-800 flex items-center">
                                <Scale className="w-5 h-5 mr-2 text-indigo-600" />
                                Payoff no Vencimento (Custo: <span className="text-indigo-600">{formatCurrency(Math.abs(selectedStrategy.netCost))}</span>) de:&nbsp;
                                <span className="text-indigo-600">{selectedStrategy.label}</span>
                            </h2>
                            
                            {/* Área do Gráfico */}
                            <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg h-[450px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={payoffChartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                        <XAxis 
                                            dataKey="spot" 
                                            label={{ value: 'Preço do Ativo Subjacente (R$)', position: 'bottom', dy: 10, fill: '#4b5563', fontSize: 13 }}
                                            domain={['dataMin', 'dataMax']}
                                            type="number"
                                            tickFormatter={(value) => `R$ ${value.toFixed(0)}`}
                                            tick={{ fill: '#4b5563', fontSize: 12 }}
                                        />
                                        <YAxis 
                                            label={{ value: 'Payoff (R$)', angle: -90, position: 'left', dx: -5, fill: '#4b5563', fontSize: 13 }}
                                            tickFormatter={(value) => formatCurrency(value)}
                                            domain={['auto', 'auto']}
                                            tick={{ fill: '#4b5563', fontSize: 12 }}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        
                                        {/* Linha do Payoff */}
                                        <Line 
                                            type="monotone" 
                                            dataKey="payoff" 
                                            stroke="#4f46e5" 
                                            strokeWidth={3} 
                                            dot={false}
                                        />
                                        
                                        {/* Linha de Payoff Zero (Break-Even) */}
                                        <ReferenceLine y={0} stroke="#10b981" strokeDasharray="5 5" />
                                        
                                        {/* Linha do Preço Spot Atual */}
                                        <ReferenceLine x={spotPrice} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: `Spot: R$${spotPrice.toFixed(2)}`, position: 'top', fill: '#f59e0b', fontSize: 12, dx: 10 }} />
                                        
                                        {/* Linhas de Strikes (Opcional, mas útil para visualização) */}
                                        {selectedStrategy.legs.map(leg => (
                                            <ReferenceLine 
                                                key={leg.id}
                                                x={leg.strike} 
                                                stroke={leg.action === 'Compra' ? '#3b82f6' : '#ef4444'} 
                                                strokeDasharray="2 2" 
                                                isFront={true}
                                                label={{ 
                                                    value: `${leg.type.charAt(0)}@${leg.strike}`, 
                                                    position: 'top', 
                                                    fill: leg.action === 'Compra' ? '#3b82f6' : '#ef4444', 
                                                    fontSize: 10,
                                                    dx: -5,
                                                    dy: -5,
                                                }} 
                                            />
                                        ))}

                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            
                            {/* Detalhes e Métricas */}
                            <div className="grid grid-cols-2 gap-4 bg-white p-4 border border-gray-200 rounded-lg shadow-inner">
                                <div>
                                    <p className="text-md font-medium text-gray-500">Lucro Máximo</p>
                                    <p className={`text-2xl font-bold ${selectedStrategy.maxProfit === 'Ilimitado' ? 'text-blue-600' : (selectedStrategy.maxProfit as number) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(selectedStrategy.maxProfit)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-md font-medium text-gray-500">Perda Máxima</p>
                                    <p className={`text-2xl font-bold ${selectedStrategy.maxLoss === 'Ilimitada' ? 'text-red-600' : (selectedStrategy.maxLoss as number) <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {formatCurrency(selectedStrategy.maxLoss)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-md font-medium text-gray-500">Custo Líquido</p>
                                    <p className="text-2xl font-bold text-indigo-600">
                                        {formatCurrency(Math.abs(selectedStrategy.netCost))} ({selectedStrategy.netCost >= 0 ? 'Crédito' : 'Débito'})
                                    </p>
                                </div>
                                <div>
                                    <p className="text-md font-medium text-gray-500">Score Risco/Retorno</p>
                                    <p className="text-2xl font-bold text-gray-800">
                                        {selectedStrategy.riskRewardScore === Infinity ? 'Ilimitado' : selectedStrategy.riskRewardScore.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Pontos de Equilíbrio */}
                            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <h3 className="font-semibold text-yellow-800 flex items-center">
                                    <Target className="w-4 h-4 mr-2" />
                                    Pontos de Equilíbrio (Break-Even)
                                </h3>
                                <p className="text-lg font-bold text-yellow-900 mt-1">
                                    {breakEvenPoints.length > 0 
                                        ? breakEvenPoints.map(p => formatCurrency(p)).join(' / ')
                                        : 'N/A ou Múltiplos pontos (foram considerados apenas os cruzamentos de zero no range).'
                                    }
                                </p>
                            </div>
                            
                            {/* Tabela de Pernas */}
                            <div className="mt-6">
                                <h3 className="text-lg font-bold text-gray-800 mb-3">Pernas da Estratégia</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strike</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prêmio Unitário</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd. (Lotes)</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Custo/Receita Líq.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {selectedStrategy.legs.map((leg, index) => (
                                                <tr key={index}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{leg.type}</td>
                                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${leg.action === 'Compra' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {leg.action} ({leg.action === 'Compra' ? 'Débito' : 'Crédito'})
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">R$ {leg.strike.toFixed(2)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatCurrency(leg.premium)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{Math.abs(leg.quantity)}</td>
                                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${leg.action === 'Compra' ? 'text-red-600' : 'text-green-600'}`}>
                                                        {formatCurrency(leg.premium * Math.abs(leg.quantity) * (leg.action === 'Compra' ? -1 : 1))}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="p-10 text-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg h-full flex flex-col justify-center items-center">
                            <Zap className="w-10 h-10 text-gray-400 mb-3" />
                            <p className="text-lg text-gray-600 font-semibold">
                                Analisador de Estratégias
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                Selecione uma estratégia no ranking otimizado ou crie uma no painel manual para visualizar os detalhes e o gráfico de Payoff.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OptionStrategyAnalyzer;
