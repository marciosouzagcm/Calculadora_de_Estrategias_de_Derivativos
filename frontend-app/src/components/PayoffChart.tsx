import React from 'react';
import { 
  CartesianGrid, Tooltip, ReferenceLine, Area, ComposedChart, XAxis, YAxis, ResponsiveContainer 
} from 'recharts';
import { StrategyMetrics } from '../interfaces/Types';

export const PayoffChart = ({ strategy }: { strategy: StrategyMetrics }) => {
  const spotPrice = Number(strategy.asset_price) || 0;
  
  // Pontos de Break-even calculados pelo Backend
  const bePoints = strategy.breakEvenPoints || [];

  const generateData = () => {
    const data = [];
    // Define a margem do gráfico: usa os BE points ou 15% de margem do spot
    const minBE = bePoints.length > 0 ? Math.min(...bePoints) * 0.95 : spotPrice * 0.85;
    const maxBE = bePoints.length > 0 ? Math.max(...bePoints) * 1.05 : spotPrice * 1.15;
    
    const min = Math.min(minBE, spotPrice * 0.90);
    const max = Math.max(maxBE, spotPrice * 1.10);
    
    const steps = 80; // Aumentado para maior precisão visual
    const stepSize = (max - min) / steps;

    for (let i = 0; i <= steps; i++) {
      const precoSimulado = min + (i * stepSize);
      let pnlTotal = 0;
      
      if (strategy.pernas && Array.isArray(strategy.pernas)) {
        strategy.pernas.forEach(perna => {
          const strike = Number(perna.derivative.strike) || 0;
          const premio = Number(perna.derivative.premio) || 0;
          const multiplicador = Number(perna.multiplier) || 1000;
          
          let payoffNoVencimento = 0;
          if (perna.derivative.tipo === 'CALL') {
            payoffNoVencimento = Math.max(0, precoSimulado - strike);
          } else if (perna.derivative.tipo === 'PUT') {
            payoffNoVencimento = Math.max(0, strike - precoSimulado);
          }
          
          const pnlUnidade = perna.direction === 'COMPRA' 
            ? (payoffNoVencimento - premio) 
            : (premio - payoffNoVencimento);
            
          pnlTotal += pnlUnidade * multiplicador;
        });
      }

      data.push({ 
        preco: parseFloat(precoSimulado.toFixed(2)), 
        lucro: parseFloat(pnlTotal.toFixed(2)) 
      });
    }
    return data;
  };

  const chartData = generateData();

  return (
    <div style={{ width: '100%', height: '400px', backgroundColor: '#ffffff', borderRadius: '12px', padding: '10px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 30, right: 30, left: 40, bottom: 20 }}>
          <defs>
            <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
              <stop offset="50%" stopColor="#10b981" stopOpacity={0.05}/>
              <stop offset="50%" stopColor="#ef4444" stopOpacity={0.05}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.4}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          
          <XAxis 
            dataKey="preco" 
            type="number" 
            domain={['auto', 'auto']} 
            stroke="#94a3b8" 
            fontSize={11}
            tickFormatter={(v) => `R$${v.toFixed(2)}`}
          />
          
          <YAxis 
            stroke="#94a3b8" 
            fontSize={11} 
            tickFormatter={(v) => `R$${v}`}
          />
          
          <Tooltip 
            formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'P&L']}
            labelFormatter={(label) => `Preço Ativo: R$ ${Number(label).toFixed(2)}`}
            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
          />
          
          <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />
          
          {/* Linha do Preço Atual */}
          <ReferenceLine 
            x={spotPrice} 
            stroke="#3b82f6" 
            strokeWidth={2}
            strokeDasharray="3 3" 
            label={{ value: 'SPOT', position: 'top', fill: '#3b82f6', fontSize: 10, fontWeight: 'bold' }} 
          />

          {/* Renderização Dinâmica dos Break-evens */}
          {bePoints.map((be, index) => (
            <ReferenceLine 
              key={`be-${index}`}
              x={be} 
              stroke="#94a3b8" 
              strokeDasharray="5 5"
              label={{ 
                value: `B.E. R$${be.toFixed(2)}`, 
                position: 'insideBottomRight', 
                fill: '#64748b', 
                fontSize: 9,
                angle: -90,
                offset: 10
              }} 
            />
          ))}
          
          <Area 
            type="monotone" 
            dataKey="lucro" 
            stroke="#1e293b"
            fill="url(#pnlGrad)" 
            strokeWidth={2} 
            isAnimationActive={true} 
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};