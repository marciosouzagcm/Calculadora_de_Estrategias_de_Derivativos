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
    Label,
    ReferenceDot
} from 'recharts'; 
import { StrategyMetrics } from '../interfaces/Types';

interface PayoffProps {
    strategy: StrategyMetrics;
    lote: number;
    taxasIdaVolta: number;
}

export const PayoffChart = ({ strategy, lote, taxasIdaVolta }: PayoffProps) => {
    // 1. Normalização do Spot vinda do primeiro código
    const spotPrice = Number(strategy.asset_price) || 0;
    
    const chartData = useMemo(() => {
        const data = [];
        
        // 2. Normalização de Strikes (Trata 1076 -> 10.76)
        const strikesNormalizados = strategy.pernas.map(p => {
            const s = Number(p.derivative.strike);
            return s > 500 ? s / 100 : s; 
        });
        
        const minS = Math.min(...strikesNormalizados, spotPrice);
        const maxS = Math.max(...strikesNormalizados, spotPrice);
        
        // Define limites focados na operação (Margem de 15%)
        const minRange = minS * 0.85; 
        const maxRange = maxS * 1.15;
        const steps = 120; 
        const stepSize = (maxRange - minRange) / steps;

        for (let i = 0; i <= steps; i++) {
            const precoSimulado = minRange + (i * stepSize);
            let pnlUnitarioTotal = 0;
            
            strategy.pernas.forEach((perna, index) => {
                // Aplica a mesma normalização de strike e prêmio do código 1
                const strike = strikesNormalizados[index];
                const premio = Number(perna.derivative.premio) > 50 
                    ? Number(perna.derivative.premio) / 100 
                    : Number(perna.derivative.premio);

                let payoffPerna = 0;
                if (perna.derivative.tipo === 'CALL') {
                    payoffPerna = Math.max(0, precoSimulado - strike);
                } else if (perna.derivative.tipo === 'PUT') {
                    payoffPerna = Math.max(0, strike - precoSimulado);
                }

                const pnlUnidade = perna.direction === 'COMPRA' 
                    ? (payoffPerna - premio) 
                    : (premio - payoffPerna);
                    
                pnlUnitarioTotal += pnlUnidade;
            });

            const lucroFinanceiroLiquido = (pnlUnitarioTotal * lote) - taxasIdaVolta;
            
            data.push({ 
                preco: parseFloat(precoSimulado.toFixed(2)), 
                lucro: parseFloat(lucroFinanceiroLiquido.toFixed(2)),
                // Sombreado dinâmico do código 2
                areaLucro: lucroFinanceiroLiquido > 0 ? lucroFinanceiroLiquido : 0,
                areaPrejuizo: lucroFinanceiroLiquido < 0 ? lucroFinanceiroLiquido : 0
            });
        }
        return data;
    }, [strategy, lote, taxasIdaVolta, spotPrice]);

    // 3. Finder de Break-even (Exclusivo do Código 2)
    const breakevens = useMemo(() => {
        const pts: number[] = [];
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

    return (
        <div style={{ width: '100%', height: '380px', backgroundColor: '#0f172a', borderRadius: '12px', padding: '15px', border: '1px solid #1e293b' }}>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
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
                        fontSize={11} 
                        tickFormatter={(v) => `R$${v}`}
                    />
                    
                    <YAxis 
                        stroke="#475569" 
                        fontSize={11} 
                        tickFormatter={(v) => `R$${v}`}
                        width={80}
                    />
                    
                    <Tooltip 
                         contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
                         formatter={(v: any) => [`R$ ${v.toLocaleString('pt-BR')}`, 'PnL Estimado']}
                         labelFormatter={(v) => `Preço: R$ ${v}`}
                    />
                    
                    <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
                    
                    <ReferenceLine x={spotPrice} stroke="#38bdf8" strokeWidth={2} strokeDasharray="4 4">
                        <Label value="SPOT" position="top" fill="#38bdf8" fontSize={10} fontWeight="bold" />
                    </ReferenceLine>
                    
                    {/* Áreas coloridas do Código 2 */}
                    <Area type="monotone" dataKey="areaLucro" stroke="none" fill="url(#colorProfit)" connectNulls />
                    <Area type="monotone" dataKey="areaPrejuizo" stroke="none" fill="url(#colorLoss)" connectNulls />

                    {/* Linha principal do Payoff */}
                    <Area 
                        type="monotone" 
                        dataKey="lucro" 
                        stroke="#38bdf8" 
                        fill="transparent" 
                        strokeWidth={3} 
                        isAnimationActive={false}
                    />

                    {/* Pontos de Break-even (Código 2) */}
                    {breakevens.map((be, idx) => (
                        <ReferenceDot 
                            key={idx} x={be} y={0} r={4} 
                            fill="#fbbf24" stroke="#0f172a" strokeWidth={2}
                        >
                            <Label value={`BE: ${be}`} position="bottom" fill="#fbbf24" fontSize={9} offset={10} />
                        </ReferenceDot>
                    ))}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};