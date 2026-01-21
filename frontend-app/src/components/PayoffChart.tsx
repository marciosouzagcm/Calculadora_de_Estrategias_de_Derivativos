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
    ReferenceDot
} from 'recharts'; 
import { StrategyMetrics } from '../interfaces/Types';

interface PayoffProps {
    strategy: StrategyMetrics;
    lote: number;
    taxasIdaVolta: number;
}

export const PayoffChart = ({ strategy, lote, taxasIdaVolta }: PayoffProps) => {
    // Garantir que temos o preço atual do ativo como número
    const spotPrice = Number(String(strategy.asset_price || 0).replace(',', '.')) || 0;
    
    // Trava de segurança: se não houver dados de pernas, exibe placeholder
    if (!strategy.pernas || strategy.pernas.length === 0) {
        return (
            <div style={{ color: '#475569', fontSize: '11px', textAlign: 'center', paddingTop: '100px', height: '100%' }}>
                AGUARDANDO COMPOSIÇÃO DAS OPÇÕES...
            </div>
        );
    }

    const chartData = useMemo(() => {
        const data = [];
        
        // Extração segura dos strikes para definir o range do gráfico
        const strikes = strategy.pernas
            .map(p => {
                const s = p.derivative?.strike || p.derivative?.strike_price;
                return s ? Number(String(s).replace(',', '.')) : null;
            })
            .filter((s): s is number => s !== null && !isNaN(s));

        if (strikes.length === 0 && spotPrice === 0) return [];

        const minS = strikes.length > 0 ? Math.min(...strikes, spotPrice) : spotPrice * 0.9;
        const maxS = strikes.length > 0 ? Math.max(...strikes, spotPrice) : spotPrice * 1.1;
        
        // Margem de 15% para visualização da curva além dos strikes
        const minRange = minS * 0.85; 
        const maxRange = maxS * 1.15;
        const steps = 100; // Aumentado para maior suavidade da curva
        const stepSize = (maxRange - minRange) / steps;

        for (let i = 0; i <= steps; i++) {
            const precoSimulado = minRange + (i * stepSize);
            let pnlUnitarioTotal = 0;
            
            strategy.pernas.forEach((perna) => {
                const strike = Number(String(perna.derivative?.strike || perna.derivative?.strike_price || 0).replace(',', '.'));
                // Busca prêmio em múltiplos campos possíveis (mapping flexível)
                const premio = Number(String(perna.derivative?.premio || perna.derivative?.premium || perna.derivative?.last_price || 0).replace(',', '.'));
                const tipo = perna.derivative?.tipo || perna.derivative?.type;

                let payoffPerna = 0;
                if (tipo?.toUpperCase() === 'CALL') {
                    payoffPerna = Math.max(0, precoSimulado - strike);
                } else if (tipo?.toUpperCase() === 'PUT') {
                    payoffPerna = Math.max(0, strike - precoSimulado);
                }

                // Cálculo do PnL: Se COMPRA, (Payoff - Custo). Se VENDA, (Recebido - Payoff)
                const pnlUnidade = perna.direction?.toUpperCase() === 'COMPRA' 
                    ? (payoffPerna - premio) 
                    : (premio - payoffPerna);
                    
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

    // Cálculo dinâmico dos pontos de Breakeven no gráfico
    const breakevens = useMemo(() => {
        const pts: number[] = [];
        if (!chartData.length) return pts;
        for (let i = 0; i < chartData.length - 1; i++) {
            const p1 = chartData[i];
            const p2 = chartData[i+1];
            // Verifica cruzamento da linha de lucro com o zero
            if ((p1.lucro <= 0 && p2.lucro > 0) || (p1.lucro >= 0 && p2.lucro < 0)) {
                const be = p1.preco + (0 - p1.lucro) * (p2.preco - p1.preco) / (p2.lucro - p1.lucro);
                pts.push(parseFloat(be.toFixed(2)));
            }
        }
        return pts;
    }, [chartData]);

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
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
                        domain={['auto', 'auto']} 
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
                         labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                         labelFormatter={(v) => `Preço Ativo: R$ ${v}`}
                         formatter={(v: any) => [`R$ ${Number(v).toLocaleString('pt-BR')}`, 'PnL Estimado']}
                    />
                    <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} />
                    
                    {/* Linha indicando o preço atual do mercado */}
                    <ReferenceLine x={spotPrice} stroke="#38bdf8" strokeDasharray="4 4">
                        {/* Removido o Label para evitar sobreposição, Tooltip já informa */}
                    </ReferenceLine>
                    
                    {/* Áreas de Cor para Lucro e Prejuízo */}
                    <Area type="monotone" dataKey="areaLucro" stroke="none" fill="url(#colorProfit)" connectNulls isAnimationActive={false} />
                    <Area type="monotone" dataKey="areaPrejuizo" stroke="none" fill="url(#colorLoss)" connectNulls isAnimationActive={false} />
                    
                    {/* Linha principal do Payoff */}
                    <Area 
                        type="monotone" 
                        dataKey="lucro" 
                        stroke="#0ea5e9" 
                        fill="transparent" 
                        strokeWidth={2} 
                        dot={false} 
                        isAnimationActive={false} 
                    />
                    
                    {/* Pontos Amarelos nos Breakevens */}
                    {breakevens.map((be, idx) => (
                        <ReferenceDot 
                            key={idx} 
                            x={be} 
                            y={0} 
                            r={4} 
                            fill="#fbbf24" 
                            stroke="#020617" 
                            strokeWidth={1} 
                        />
                    ))}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};