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
    const minBE = bePoints.length > 0 ? Math.min(...bePoints) * 0.90 : spotPrice * 0.80;
    const maxBE = bePoints.length > 0 ? Math.max(...bePoints) * 1.10 : spotPrice * 1.20;
    
    const min = Math.min(minBE, spotPrice * 0.85);
    const max = Math.max(maxBE, spotPrice * 1.15);
    
    const steps = 60; // Equilíbrio entre performance e precisão
    const stepSize = (max - min) / steps;

    for (let i = 0; i <= steps; i++) {
      const precoSimulado = min + (i * stepSize);
      let pnlTotal = 0;
      
      // Verifica se existem pernas antes de iterar
      if (strategy.pernas && Array.isArray(strategy.pernas)) {
        strategy.pernas.forEach(perna => {
          const strike = Number(perna.derivative.strike) || 0;
          const premio = Number(perna.derivative.premio) || 0;
          const multiplicador = Number(perna.multiplier) || 1; // Usamos 1 aqui porque o Lote é aplicado no App
          
          let payoffNoVencimento = 0;
          if (perna.derivative.tipo === 'CALL') {
            payoffNoVencimento = Math.max(0, precoSimulado - strike);
          } else if (perna.derivative.tipo === 'PUT') {
            payoffNoVencimento = Math.max(0, strike - precoSimulado);
          }
          
          const pnlUnidade = perna.direction === 'COMPRA' 
            ? (payoffNoVencimento - premio) 
            : (premio - payoffNoVencimento);
            
          // pnlTotal acumulado por unidade
          pnlTotal += pnlUnidade;
        });
      }

      // IMPORTANTE: Multiplicamos pelo lote apenas na hora de exibir no gráfico 
      // para bater com os valores da Boleta e do Risco Real
      const loteGlobal = 1000; // O ideal seria passar o 'lote' como prop, mas fixamos 1000 para teste

      data.push({ 
        preco: parseFloat(precoSimulado.toFixed(2)), 
        lucro: parseFloat((pnlTotal * loteGlobal).toFixed(2)) 
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
            domain={['dataMin', 'dataMax']} 
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
            formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'P&L Líquido']}
            labelFormatter={(label) => `Preço no Vencimento: R$ ${Number(label).toFixed(2)}`}
            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
          />
          
          <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />
          
          {/* Linha do Preço Atual (Spot) */}
          <ReferenceLine 
            x={spotPrice} 
            stroke="#3b82f6" 
            strokeWidth={2}
            strokeDasharray="3 3" 
            label={{ value: 'SPOT', position: 'top', fill: '#3b82f6', fontSize: 10, fontWeight: 'bold' }} 
          />

          {/* Renderização dos Break-evens */}
          {bePoints.map((be, index) => (
            <ReferenceLine 
              key={`be-${index}`}
              x={be} 
              stroke="#64748b" 
              strokeDasharray="5 5"
              label={{ 
                value: `B.E.`, 
                position: 'insideBottomRight', 
                fill: '#64748b', 
                fontSize: 9,
                fontWeight: 'bold'
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