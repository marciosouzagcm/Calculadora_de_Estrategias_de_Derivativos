import { useMemo } from 'react';
import {
    Area,
    CartesianGrid,
    ComposedChart,
    Label,
    ReferenceDot,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
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
 * FIXED: Correção analítica de preenchimento simétrico de áreas PnL negativas e normalização de chaves de strikes.
 */
export const PayoffChart = ({ strategy, lote, taxasIdaVolta, isLightMode = false }: PayoffProps) => {
    
    const toNum = (val: any): number => {
        if (val === undefined || val === null) return 0;
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        const clean = String(val).replace(',', '.').replace(/[^\d.-]/g, '');
        const parsed = parseFloat(clean);
        return isNaN(parsed) ? 0 : parsed;
    };

    const colors = {
        grid: isLightMode ? '#f1f5f9' : '#1e293b',
        text: isLightMode ? '#334155' : '#94a3b8',
        axis: isLightMode ? '#cbd5e1' : '#64748b',
        line: isLightMode ? '#2563eb' : '#0ea5e9',
        tooltipBg: isLightMode ? '#ffffff' : '#020617',
        tooltipBorder: isLightMode ? '#e2e8f0' : '#1e293b'
    };

    const spotPrice = useMemo(() => {
        const price = toNum(strategy.asset_price || strategy.assetPrice);
        return price > 0 ? price : 1;
    }, [strategy.asset_price, strategy.assetPrice]);

    const pernasNormalizadas = useMemo(() => {
        if (!strategy.pernas || strategy.pernas.length === 0) return [];
        return strategy.pernas.map(p => ({
            strike: toNum(p.strike || p.derivative?.strike || p.derivative?.symbol || p.symbol || p.option_ticker),
            premio: toNum(p.premio || p.derivative?.premio),
            tipo: (p.tipo || p.derivative?.tipo || '').toUpperCase(),
            direcao: (p.direction || p.direcao || '').toUpperCase()
        })).filter(p => p.strike > 0);
    }, [strategy.pernas]);

    const chartData = useMemo(() => {
        if (pernasNormalizadas.length === 0) return [];

        const strikes = pernasNormalizadas.map(p => p.strike);
        const baseMin = Math.min(...strikes, spotPrice);
        const baseMax = Math.max(...strikes, spotPrice);
        
        const minRange = baseMin * 0.85; 
        const maxRange = baseMax * 1.15;
        const steps = 100; 
        const stepSize = (maxRange - minRange) / steps;

        const data = [];
        for (let i = 0; i <= steps; i++) {
            const precoSimulado = minRange + (i * stepSize);
            let pnlUnitarioTotal = 0;
            
            pernasNormalizadas.forEach((p) => {
                let payoffPerna = 0;
                if (p.tipo === 'CALL') payoffPerna = Math.max(0, precoSimulado - p.strike);
                else if (p.tipo === 'PUT') payoffPerna = Math.max(0, p.strike - precoSimulado);

                const isLong = ['COMPRA', 'BUY', 'C', 'LONG'].includes(p.direcao);
                const pnlUnidade = isLong ? (payoffPerna - p.premio) : (p.premio - payoffPerna);
                pnlUnitarioTotal += pnlUnidade;
            });

            const lucroFinanceiroLiquido = (pnlUnitarioTotal * lote) - taxasIdaVolta;
            const valorFormatado = parseFloat(lucroFinanceiroLiquido.toFixed(2));
            
            data.push({ 
                preco: parseFloat(precoSimulado.toFixed(2)), 
                lucro: valorFormatado,
                lucroPositivo: valorFormatado >= 0 ? valorFormatado : 0,
                lucroNegativo: valorFormatado < 0 ? valorFormatado : 0
            });
        }
        return data;
    }, [pernasNormalizadas, lote, taxasIdaVolta, spotPrice]);

    const breakevens = useMemo(() => {
        const pts: number[] = [];
        if (chartData.length === 0) return pts;

        for (let i = 0; i < chartData.length - 1; i++) {
            const p1 = chartData[i];
            const p2 = chartData[i+1];
            if ((p1.lucro < 0 && p2.lucro > 0) || (p1.lucro > 0 && p2.lucro < 0)) {
                const divisor = p2.lucro - p1.lucro;
                if (divisor !== 0) {
                    const be = p1.preco + (0 - p1.lucro) * (p2.preco - p1.preco) / divisor;
                    const beFinal = parseFloat(be.toFixed(2));
                    if (!isNaN(beFinal) && !pts.includes(beFinal)) pts.push(beFinal);
                }
            }
        }
        return pts;
    }, [chartData]);

    if (chartData.length === 0) return null;

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '280px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 25, right: 30, left: 10, bottom: 20 }}>
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
                        fontSize={9}
                        tick={{fill: colors.text}}
                        tickFormatter={(v) => `R$${v}`} 
                    />
                    
                    <YAxis 
                        stroke={colors.axis} 
                        fontSize={9}
                        tick={{fill: colors.text}}
                        tickFormatter={(v) => `R$${v}`}
                        width={60}
                    />

                    <Tooltip 
                        isAnimationActive={false}
                        formatter={(value: number) => [`R$ ${value}`, 'Lucro/Prejuízo']}
                        labelFormatter={(label) => `Preço: R$ ${label}`}
                        contentStyle={{ 
                            backgroundColor: colors.tooltipBg, 
                            border: `1px solid ${colors.tooltipBorder}`, 
                            borderRadius: '4px', 
                            fontSize: '10px',
                            color: colors.text
                        }}
                    />

                    <Area type="monotone" dataKey="lucroPositivo" fill="url(#pnlGreen)" stroke="none" connectNulls isAnimationActive={false} />
                    <Area type="monotone" dataKey="lucroNegativo" fill="url(#pnlRed)" stroke="none" connectNulls isAnimationActive={false} />
                    
                    <Area 
                        type="monotone" 
                        dataKey="lucro" 
                        stroke={colors.line} 
                        strokeWidth={2.5} 
                        fill="none" 
                        isAnimationActive={false} 
                    />

                    <ReferenceLine y={0} stroke={isLightMode ? "#64748b" : "#475569"} strokeWidth={1.5} />

                    {spotPrice > 0 && !isNaN(spotPrice) && (
                        <ReferenceLine x={spotPrice} stroke="#6366f1" strokeDasharray="5 5">
                            <Label value="SPOT" position="top" fill="#6366f1" fontSize={9} fontWeight="bold" />
                        </ReferenceLine>
                    )}

                    {breakevens.map((be, idx) => !isNaN(be) && be > 0 && (
                        <ReferenceDot 
                            key={`be-dot-${idx}`} 
                            x={be} 
                            y={0} 
                            r={4} 
                            fill="#f59e0b" 
                            stroke="#fff" 
                            strokeWidth={1.5} 
                            isAnimationActive={false} 
                        />
                    ))}

                    {pernasNormalizadas.map((p, idx) => (
                        <ReferenceLine 
                            key={`k-${idx}-${p.strike}`} 
                            x={p.strike} 
                            stroke={colors.axis} 
                            strokeWidth={0.5} 
                            strokeDasharray="3 3"
                        >
                            <Label value={`K:${p.strike}`} position="insideBottom" fill={colors.text} fontSize={8} />
                        </ReferenceLine>
                    ))}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};
