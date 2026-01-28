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
    isLightMode?: boolean;
}

/**
 * BOARDPRO V2026.1 - Payoff Engine
 * FIXED: Estabilização de renderização para exportação PDF (No-Animation Mode)
 */
export const PayoffChart = ({ strategy, lote, taxasIdaVolta, isLightMode = false }: PayoffProps) => {
    
    const toNum = (val: any) => {
        if (val === undefined || val === null) return 0;
        if (typeof val === 'number') return val;
        const clean = String(val).replace(',', '.').replace(/[^\d.-]/g, '');
        return parseFloat(clean) || 0;
    };

    const colors = {
        grid: isLightMode ? '#f1f5f9' : '#1e293b',
        text: isLightMode ? '#334155' : '#94a3b8',
        axis: isLightMode ? '#cbd5e1' : '#64748b',
        line: isLightMode ? '#2563eb' : '#0ea5e9', // Azul mais forte para o PDF
        tooltipBg: isLightMode ? '#ffffff' : '#020617',
        tooltipBorder: isLightMode ? '#e2e8f0' : '#1e293b'
    };

    const spotPrice = useMemo(() => toNum(strategy.asset_price || strategy.preco_ativo), [strategy.asset_price, strategy.preco_ativo]);

    const chartData = useMemo(() => {
        if (!strategy.pernas || strategy.pernas.length === 0) return [];

        const pernasNormalizadas = strategy.pernas.map(p => ({
            strike: toNum(p.strike || p.derivative?.strike),
            premio: toNum(p.premio || p.derivative?.premio),
            tipo: (p.tipo || p.derivative?.tipo || '').toUpperCase(),
            direcao: (p.direction || p.direcao || '').toUpperCase()
        }));

        const strikes = pernasNormalizadas.map(p => p.strike).filter(s => s > 0);
        const minS = Math.min(...strikes, spotPrice);
        const maxS = Math.max(...strikes, spotPrice);
        
        // Margem de 15% para visualização confortável
        const minRange = minS * 0.85; 
        const maxRange = maxS * 1.15;
        const steps = 80; 
        const stepSize = (maxRange - minRange) / steps;

        const data = [];
        for (let i = 0; i <= steps; i++) {
            const precoSimulado = minRange + (i * stepSize);
            let pnlUnitarioTotal = 0;
            
            pernasNormalizadas.forEach((p) => {
                let payoffPerna = 0;
                if (p.tipo === 'CALL') payoffPerna = Math.max(0, precoSimulado - p.strike);
                else if (p.tipo === 'PUT') payoffPerna = Math.max(0, p.strike - precoSimulado);

                const pnlUnidade = (p.direcao === 'COMPRA' || p.direcao === 'BUY') 
                    ? (payoffPerna - p.premio) 
                    : (p.premio - payoffPerna);
                pnlUnitarioTotal += pnlUnidade;
            });

            const lucroFinanceiroLiquido = (pnlUnitarioTotal * lote) - taxasIdaVolta;
            
            data.push({ 
                preco: parseFloat(precoSimulado.toFixed(2)), 
                lucro: parseFloat(lucroFinanceiroLiquido.toFixed(2)),
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
        <div style={{ width: '100%', height: '100%', minHeight: '280px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                        <linearGradient id="pnlGreen" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={isLightMode ? 0.3 : 0.2}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="pnlRed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={isLightMode ? 0.3 : 0.2}/>
                        </linearGradient>
                    </defs>
                    
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                    
                    <XAxis 
                        dataKey="preco" 
                        type="number" 
                        domain={['dataMin', 'dataMax']} 
                        stroke={colors.axis} 
                        fontSize={9}
                        tick={{fill: colors.text}}
                        tickFormatter={(v) => `R$${v}`} 
                    />
                    
                    <YAxis 
                        stroke={colors.axis} 
                        fontSize={9}
                        tick={{fill: colors.text}}
                        tickFormatter={(v) => `R$${v}`}
                        width={50}
                    />

                    <Tooltip 
                        isAnimationActive={false}
                        contentStyle={{ 
                            backgroundColor: colors.tooltipBg, 
                            border: `1px solid ${colors.tooltipBorder}`, 
                            borderRadius: '4px', 
                            fontSize: '10px'
                        }}
                    />

                    {/* Áreas de Lucro/Prejuízo */}
                    <Area type="monotone" dataKey="lucroPositivo" fill="url(#pnlGreen)" stroke="none" isAnimationActive={false} />
                    <Area type="monotone" dataKey="lucroNegativo" fill="url(#pnlRed)" stroke="none" isAnimationActive={false} />
                    
                    {/* Linha Principal de Payoff */}
                    <Area 
                        type="monotone" 
                        dataKey="lucro" 
                        stroke={colors.line} 
                        strokeWidth={2.5} 
                        fill="none" 
                        isAnimationActive={false} 
                    />

                    {/* Referência do Preço Atual (SPOT) */}
                    <ReferenceLine x={spotPrice} stroke="#6366f1" strokeDasharray="5 5">
                        <Label value="PREÇO ATUAL" position="top" fill="#6366f1" fontSize={8} fontWeight="bold" />
                    </ReferenceLine>

                    {/* Pontos de Breakeven */}
                    {breakevens.map((be, idx) => (
                        <ReferenceDot 
                            key={`be-dot-${idx}`} 
                            x={be} 
                            y={0} 
                            r={3} 
                            fill="#f59e0b" 
                            stroke={isLightMode ? "#fff" : "#020617"} 
                            strokeWidth={1} 
                            isAnimationActive={false} 
                        />
                    ))}

                    {/* Marcação de Strikes */}
                    {strategy.pernas.map((p, idx) => {
                        const k = toNum(p.strike || p.derivative?.strike);
                        return (
                            <ReferenceLine key={`k-${idx}`} x={k} stroke={colors.axis} strokeWidth={0.5} strokeDasharray="2 2">
                                <Label value={`K:${k}`} position="bottom" fill={colors.text} fontSize={8} />
                            </ReferenceLine>
                        );
                    })}

                    <ReferenceLine y={0} stroke={isLightMode ? "#94a3b8" : "#475569"} strokeWidth={1} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};