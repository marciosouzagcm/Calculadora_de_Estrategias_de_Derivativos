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
    isLightMode?: boolean; // Nova prop para detectar se está no PDF
}

export const PayoffChart = ({ strategy, lote, taxasIdaVolta, isLightMode = false }: PayoffProps) => {
    
    const toNum = (val: any) => {
        if (val === undefined || val === null) return 0;
        if (typeof val === 'number') return val;
        const clean = String(val).replace(',', '.').replace(/[^\d.-]/g, '');
        return parseFloat(clean) || 0;
    };

    // Definição de cores baseada no modo (Tela vs PDF)
    const colors = {
        grid: isLightMode ? '#e2e8f0' : '#1e293b',
        text: isLightMode ? '#475569' : '#94a3b8',
        axis: isLightMode ? '#94a3b8' : '#64748b',
        tooltipBg: isLightMode ? '#ffffff' : '#020617',
        tooltipBorder: isLightMode ? '#e2e8f0' : '#1e293b'
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
        
        const minRange = minS * 0.90; 
        const maxRange = maxS * 1.10;
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

                const pnlUnidade = p.direcao === 'COMPRA' 
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
        <div style={{ width: '100%', height: '100%', minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 30, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                        <linearGradient id="pnlGreen" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={isLightMode ? 0.4 : 0.3}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="pnlRed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={isLightMode ? 0.4 : 0.3}/>
                        </linearGradient>
                    </defs>
                    
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                    
                    <XAxis 
                        dataKey="preco" 
                        type="number" 
                        domain={['dataMin', 'dataMax']} 
                        stroke={colors.axis} 
                        fontSize={10}
                        tick={{fill: colors.text}}
                        tickFormatter={(v) => `R$${v}`} 
                    />
                    
                    <YAxis 
                        stroke={colors.axis} 
                        fontSize={10}
                        tick={{fill: colors.text}}
                        tickFormatter={(v) => `R$${v}`}
                        width={60}
                    />

                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: colors.tooltipBg, 
                            border: `1px solid ${colors.tooltipBorder}`, 
                            borderRadius: '8px', 
                            fontSize: '11px',
                            color: isLightMode ? '#000' : '#fff'
                        }}
                        labelStyle={{ color: '#0ea5e9', fontWeight: 'bold', marginBottom: '4px' }}
                        labelFormatter={(v) => `Preço no Vencimento: R$ ${v}`}
                        formatter={(value: number) => [
                            <span style={{ color: value >= 0 ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
                                R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>, 
                            'Resultado Estimado'
                        ]}
                    />

                    <Area type="monotone" dataKey="lucroPositivo" fill="url(#pnlGreen)" stroke="none" isAnimationActive={false} connectNulls />
                    <Area type="monotone" dataKey="lucroNegativo" fill="url(#pnlRed)" stroke="none" isAnimationActive={false} connectNulls />
                    
                    <Area type="monotone" dataKey="lucro" stroke="#0ea5e9" strokeWidth={3} fill="none" isAnimationActive={false} />

                    <ReferenceLine x={spotPrice} stroke="#0ea5e9" strokeDasharray="3 3">
                        <Label value="SPOT" position="top" fill="#0ea5e9" fontSize={10} fontWeight="bold" />
                    </ReferenceLine>

                    {breakevens.map((be, idx) => (
                        <ReferenceLine key={`be-line-${idx}`} x={be} stroke="#f59e0b" strokeWidth={1} strokeDasharray="2 2" />
                    ))}
                    {breakevens.map((be, idx) => (
                        <ReferenceDot key={`be-dot-${idx}`} x={be} y={0} r={4} fill="#f59e0b" stroke={isLightMode ? "#fff" : "#020617"} strokeWidth={2} isAnimationActive={false} />
                    ))}

                    {strategy.pernas.map((p, idx) => (
                        <ReferenceLine 
                            key={`strike-${idx}`} 
                            x={toNum(p.strike || p.derivative?.strike)} 
                            stroke={isLightMode ? "#94a3b8" : "#475569"} 
                            strokeWidth={1}
                        >
                             <Label value={`K:${toNum(p.strike || p.derivative?.strike)}`} position="bottom" fill={colors.text} fontSize={9} />
                        </ReferenceLine>
                    ))}

                    <ReferenceLine y={0} stroke={isLightMode ? "#64748b" : "#94a3b8"} strokeWidth={1} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};