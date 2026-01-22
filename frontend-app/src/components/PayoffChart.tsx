import React, { useMemo, useEffect } from 'react';
import {
    Area,
    CartesianGrid,
    ComposedChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis, 
    YAxis,
    ReferenceDot
} from 'recharts'; 
import { StrategyMetrics } from '../interfaces/Types';

interface PayoffProps {
    strategy: StrategyMetrics;
    lote: number;
    taxasIdaVolta: number;
}

export const PayoffChart = ({ strategy, lote, taxasIdaVolta }: PayoffProps) => {
    
    // Helper para conversão numérica segura (trata vírgulas e nulos)
    const toNum = (val: any) => {
        if (val === undefined || val === null) return 0;
        if (typeof val === 'number') return val;
        const clean = String(val).replace(',', '.').replace(/[^\d.-]/g, '');
        return parseFloat(clean) || 0;
    };

    const spotPrice = useMemo(() => toNum(strategy.asset_price), [strategy.asset_price]);

    const chartData = useMemo(() => {
        if (!strategy.pernas || strategy.pernas.length === 0) return [];

        const data = [];
        const pernasNormalizadas = strategy.pernas.map(p => ({
            strike: toNum(p.derivative?.strike || p.strike || p.derivative?.strike_price),
            premio: toNum(p.derivative?.premioPct || p.derivative?.premio || p.premioPct || p.derivative?.premium),
            tipo: (p.derivative?.tipo || p.tipo || p.derivative?.type || '').toUpperCase(),
            direcao: (p.direction || '').toUpperCase()
        }));

        const strikes = pernasNormalizadas.map(p => p.strike).filter(s => s > 0);

        // Define os limites do gráfico
        const minS = strikes.length > 0 ? Math.min(...strikes, spotPrice) : spotPrice * 0.9;
        const maxS = strikes.length > 0 ? Math.max(...strikes, spotPrice) : spotPrice * 1.1;
        
        const minRange = minS * 0.85; 
        const maxRange = maxS * 1.15;
        const steps = 60;
        const stepSize = (maxRange - minRange) / steps;

        for (let i = 0; i <= steps; i++) {
            const precoSimulado = minRange + (i * stepSize);
            let pnlUnitarioTotal = 0;
            
            pernasNormalizadas.forEach((p) => {
                let payoffPerna = 0;
                if (p.tipo === 'CALL') {
                    payoffPerna = Math.max(0, precoSimulado - p.strike);
                } else if (p.tipo === 'PUT') {
                    payoffPerna = Math.max(0, p.strike - precoSimulado);
                }

                // Cálculo de PnL: Compra (Payoff - Custo) | Venda (Receita - Payoff)
                const pnlUnidade = p.direcao === 'COMPRA' 
                    ? (payoffPerna - p.premio) 
                    : (p.premio - payoffPerna);
                    
                pnlUnitarioTotal += pnlUnidade;
            });

            const lucroFinanceiroLiquido = (pnlUnitarioTotal * lote) - taxasIdaVolta;
            
            data.push({ 
                preco: parseFloat(precoSimulado.toFixed(2)), 
                lucro: parseFloat(lucroFinanceiroLiquido.toFixed(2)),
                areaLucro: lucroFinanceiroLiquido > 0 ? lucroFinanceiroLiquido : 0,
                areaPrejuizo: lucroFinanceiroLiquido < 0 ? lucroFinanceiroLiquido : 0
            });
        }
        return data;
    }, [strategy, lote, taxasIdaVolta, spotPrice]);

    const breakevens = useMemo(() => {
        const pts: number[] = [];
        if (!chartData.length) return pts;
        for (let i = 0; i < chartData.length - 1; i++) {
            const p1 = chartData[i];
            const p2 = chartData[i+1];
            if ((p1.lucro <= 0 && p2.lucro > 0) || (p1.lucro >= 0 && p2.lucro < 0)) {
                const be = p1.preco + (0 - p1.lucro) * (p2.preco - p1.preco) / (p2.lucro - p1.lucro);
                pts.push(parseFloat(be.toFixed(2)));
            }
        }
        return pts;
    }, [chartData]);

    if (chartData.length === 0) {
        return <div style={{ color: '#475569', textAlign: 'center', padding: '50px', fontSize: '12px' }}>Aguardando dados das pernas...</div>;
    }

    return (
        <div style={{ width: '100%', height: '350px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <defs>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.4}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                        dataKey="preco" 
                        type="number" 
                        domain={['dataMin', 'dataMax']} 
                        stroke="#475569" 
                        fontSize={10} 
                        tickFormatter={(v) => `R$${v}`} 
                    />
                    <YAxis 
                        stroke="#475569" 
                        fontSize={10} 
                        tickFormatter={(v) => `R$${v}`} 
                        width={70} 
                    />
                    <Tooltip 
                         contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px' }}
                         itemStyle={{ fontSize: '12px' }}
                         labelFormatter={(v) => `Preço Ativo: R$ ${v}`}
                         formatter={(v: any) => [`R$ ${v}`, 'PnL Estimado']}
                    />
                    <ReferenceLine y={0} stroke="#64748b" />
                    <ReferenceLine x={spotPrice} stroke="#38bdf8" strokeDasharray="4 4" label={{ position: 'top', value: 'SPOT', fill: '#38bdf8', fontSize: 10 }} />
                    
                    <Area type="monotone" dataKey="areaLucro" stroke="none" fill="url(#colorProfit)" isAnimationActive={false} />
                    <Area type="monotone" dataKey="areaPrejuizo" stroke="none" fill="url(#colorLoss)" isAnimationActive={false} />
                    <Area type="monotone" dataKey="lucro" stroke="#0ea5e9" fill="transparent" strokeWidth={2} dot={false} isAnimationActive={false} />
                    
                    {breakevens.map((be, idx) => (
                        <ReferenceDot key={idx} x={be} y={0} r={4} fill="#fbbf24" stroke="#020617" />
                    ))}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};