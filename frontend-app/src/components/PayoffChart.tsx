import React, { useMemo } from 'react';
import {
    Area,
    CartesianGrid,
    ComposedChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis, 
    YAxis,
    ReferenceDot,
    Label
} from 'recharts'; 
import { StrategyMetrics } from '../interfaces/Types';

interface PayoffProps {
    strategy: StrategyMetrics;
    lote: number;
    taxasIdaVolta: number;
}

export const PayoffChart = ({ strategy, lote, taxasIdaVolta }: PayoffProps) => {
    
    const toNum = (val: any) => {
        if (val === undefined || val === null) return 0;
        if (typeof val === 'number') return val;
        const clean = String(val).replace(',', '.').replace(/[^\d.-]/g, '');
        return parseFloat(clean) || 0;
    };

    const spotPrice = useMemo(() => toNum(strategy.asset_price || strategy.preco_ativo), [strategy.asset_price, strategy.preco_ativo]);

    const chartData = useMemo(() => {
        if (!strategy.pernas || strategy.pernas.length === 0) return [];

        const pernasNormalizadas = strategy.pernas.map(p => ({
            strike: toNum(p.derivative?.strike || p.strike),
            premio: toNum(p.derivative?.premio || p.premio),
            tipo: (p.derivative?.tipo || p.tipo || '').toUpperCase(),
            direcao: (p.direction || '').toUpperCase()
        }));

        const strikes = pernasNormalizadas.map(p => p.strike).filter(s => s > 0);
        const minS = Math.min(...strikes, spotPrice);
        const maxS = Math.max(...strikes, spotPrice);
        
        // Margem de 15% para as extremidades para visualização da cauda
        const minRange = minS * 0.90; 
        const maxRange = maxS * 1.10;
        const steps = 80; // Aumentado para maior suavidade
        const stepSize = (maxRange - minRange) / steps;

        const data = [];
        for (let i = 0; i <= steps; i++) {
            const precoSimulado = minRange + (i * stepSize);
            let pnlUnitarioTotal = 0;
            
            pernasNormalizadas.forEach((p) => {
                let payoffPerna = 0;
                if (p.tipo === 'CALL') payoffPerna = Math.max(0, precoSimulado - p.strike);
                else if (p.tipo === 'PUT') payoffPerna = Math.max(0, p.strike - precoSimulado);

                const pnlUnidade = p.direcao === 'COMPRA' 
                    ? (payoffPerna - p.premio) 
                    : (p.premio - payoffPerna);
                pnlUnitarioTotal += pnlUnidade;
            });

            const lucroFinanceiroLiquido = (pnlUnitarioTotal * lote) - taxasIdaVolta;
            
            data.push({ 
                preco: parseFloat(precoSimulado.toFixed(2)), 
                lucro: parseFloat(lucroFinanceiroLiquido.toFixed(2)),
                // Campos para coloração condicional
                lucroPositivo: lucroFinanceiroLiquido >= 0 ? lucroFinanceiroLiquido : 0,
                lucroNegativo: lucroFinanceiroLiquido < 0 ? lucroFinanceiroLiquido : 0
            });
        }
        return data;
    }, [strategy, lote, taxasIdaVolta, spotPrice]);

    const breakevens = useMemo(() => {
        const pts: number[] = [];
        for (let i = 0; i < chartData.length - 1; i++) {
            const p1 = chartData[i];
            const p2 = chartData[i+1];
            if ((p1.lucro < 0 && p2.lucro > 0) || (p1.lucro > 0 && p2.lucro < 0)) {
                const be = p1.preco + (0 - p1.lucro) * (p2.preco - p1.preco) / (p2.lucro - p1.lucro);
                pts.push(parseFloat(be.toFixed(2)));
            }
        }
        return pts;
    }, [chartData]);

    if (chartData.length === 0) return null;

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 30, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                        <linearGradient id="pnlGreen" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="pnlRed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3}/>
                        </linearGradient>
                    </defs>
                    
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    
                    <XAxis 
                        dataKey="preco" 
                        type="number" 
                        domain={['dataMin', 'dataMax']} 
                        stroke="#64748b" 
                        fontSize={10}
                        tick={{fill: '#94a3b8'}}
                        tickFormatter={(v) => `R$${v}`} 
                    />
                    
                    <YAxis 
                        stroke="#64748b" 
                        fontSize={10}
                        tick={{fill: '#94a3b8'}}
                        tickFormatter={(v) => `R$${v}`}
                        width={60}
                    />

                    <Tooltip 
                        contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px' }}
                        labelStyle={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '4px' }}
                        labelFormatter={(v) => `Preço no Vencimento: R$ ${v}`}
                        formatter={(value: number) => [
                            <span style={{ color: value >= 0 ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                                R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>, 
                            'Resultado Estimado'
                        ]}
                    />

                    {/* Áreas de Cor */}
                    <Area type="monotone" dataKey="lucroPositivo" fill="url(#pnlGreen)" stroke="none" isAnimationActive={false} connectNulls />
                    <Area type="monotone" dataKey="lucroNegativo" fill="url(#pnlRed)" stroke="none" isAnimationActive={false} connectNulls />
                    
                    {/* Linha Principal do Payoff */}
                    <Area type="monotone" dataKey="lucro" stroke="#0ea5e9" strokeWidth={3} fill="none" isAnimationActive={false} />

                    {/* Preço de Mercado Atual (SPOT) */}
                    <ReferenceLine x={spotPrice} stroke="#38bdf8" strokeDasharray="3 3">
                        <Label value="SPOT" position="top" fill="#38bdf8" fontSize={10} fontWeight="bold" />
                    </ReferenceLine>

                    {/* Pontos de Breakeven */}
                    {breakevens.map((be, idx) => (
                        <ReferenceLine key={`be-line-${idx}`} x={be} stroke="#fbbf24" strokeWidth={1} strokeDasharray="2 2" />
                    ))}
                    {breakevens.map((be, idx) => (
                        <ReferenceDot key={`be-dot-${idx}`} x={be} y={0} r={5} fill="#fbbf24" stroke="#020617" strokeWidth={2} />
                    ))}

                    {/* Strikes da Estratégia */}
                    {strategy.pernas.map((p, idx) => (
                        <ReferenceLine 
                            key={`strike-${idx}`} 
                            x={toNum(p.strike || p.derivative?.strike)} 
                            stroke="#475569" 
                            strokeWidth={1}
                        >
                             <Label value={`K:${toNum(p.strike || p.derivative?.strike)}`} position="bottom" fill="#475569" fontSize={9} />
                        </ReferenceLine>
                    ))}

                    <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};