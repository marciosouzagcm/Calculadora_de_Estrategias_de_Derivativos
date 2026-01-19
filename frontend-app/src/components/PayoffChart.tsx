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

/**
 * Interface de Propriedades do Gráfico de Payoff
 * BOARDPRO V38.5 - Engine de Visualização de Derivativos
 */
interface PayoffProps {
  strategy: StrategyMetrics;
  lote: number;
  taxasIdaVolta: number;
}

export const PayoffChart = ({ strategy, lote, taxasIdaVolta }: PayoffProps) => {
  // Preço spot atual para referência visual (Linha Azul)
  const spotPrice = Number(strategy.asset_price) || 0;
  
  /**
   * Gera os pontos do gráfico calculando o PnL para cada variação de preço
   */
  const generateData = () => {
    const data = [];
    const strikes = strategy.pernas.map(p => Number(p.derivative.strike) || 0);
    
    // Define o range do eixo X baseado nos strikes e no spot atual
    const minStrike = Math.min(...strikes.filter(s => s > 0), spotPrice) || spotPrice * 0.9;
    const maxStrike = Math.max(...strikes, spotPrice) || spotPrice * 1.1;
    
    const min = minStrike * 0.85; // 15% abaixo do menor strike
    const max = maxStrike * 1.15; // 15% acima do maior strike
    const steps = 100;
    const stepSize = (max - min) / steps;

    for (let i = 0; i <= steps; i++) {
      const precoSimulado = min + (i * stepSize);
      let pnlUnitarioTotal = 0;
      
      // Cálculo do Payoff no Vencimento para cada "perna" da estratégia
      strategy.pernas.forEach(perna => {
        const strike = Number(perna.derivative.strike);
        const premio = Number(perna.derivative.premio);
        let payoff = 0;

        if (perna.derivative.tipo === 'CALL') {
          payoff = Math.max(0, precoSimulado - strike);
        } else if (perna.derivative.tipo === 'PUT') {
          payoff = Math.max(0, strike - precoSimulado);
        }

        // Se comprou, recebe o payoff e paga o prêmio. Se vendeu, recebe o prêmio e paga o payoff.
        const pnlUnidade = perna.direction === 'COMPRA' ? (payoff - premio) : (premio - payoff);
        pnlUnitarioTotal += pnlUnidade;
      });

      // Aplica o lote e desconta taxas operacionais
      const lucroFinanceiroLiquido = (pnlUnitarioTotal * lote) - taxasIdaVolta;
      
      data.push({ 
        preco: parseFloat(precoSimulado.toFixed(2)), 
        lucro: parseFloat(lucroFinanceiroLiquido.toFixed(2)) 
      });
    }
    return data;
  };

  // Memoriza os dados para evitar recálculos desnecessários durante re-renders
  const chartData = useMemo(() => generateData(), [strategy, lote, taxasIdaVolta]);

  /**
   * Identifica matematicamente os pontos de Break-even (onde o lucro cruza o zero)
   */
  const breakevens = useMemo(() => {
    const pts = [];
    for (let i = 0; i < chartData.length - 1; i++) {
      const atual = chartData[i];
      const proximo = chartData[i+1];
      
      // Verifica se houve inversão de sinal no lucro entre dois pontos
      if ((atual.lucro <= 0 && proximo.lucro > 0) || (atual.lucro >= 0 && proximo.lucro < 0)) {
        // Interpolação linear para encontrar o preço exato do lucro zero
        const bePrice = atual.preco + (0 - atual.lucro) * (proximo.preco - atual.preco) / (proximo.lucro - atual.lucro);
        pts.push(parseFloat(bePrice.toFixed(2)));
      }
    }
    return pts;
  }, [chartData]);

  return (
    <div style={{ width: '100%', height: '350px', backgroundColor: '#1e293b', borderRadius: '12px', padding: '10px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 25, right: 30, left: 20, bottom: 5 }}>
          <defs>
            {/* Gradiente para diferenciar áreas de Lucro (Verde) e Prejuízo (Vermelho) */}
            <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
              <stop offset="45%" stopColor="#10b981" stopOpacity={0.2}/>
              <stop offset="55%" stopColor="#ef4444" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.8}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          
          <XAxis 
            dataKey="preco" 
            type="number" 
            domain={['dataMin', 'dataMax']} 
            stroke="#94a3b8" 
            fontSize={10} 
            tickFormatter={(v) => `R$${v}`}
          />
          
          <YAxis 
            stroke="#94a3b8" 
            fontSize={10} 
            tickFormatter={(v) => `R$${v}`} 
          />
          
          <Tooltip 
             contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
             itemStyle={{ color: '#fff' }}
             formatter={(v: any) => [`R$ ${v}`, 'Resultado Est.']}
          />
          
          {/* Linha Zero (Equilíbrio) */}
          <ReferenceLine y={0} stroke="#f1f5f9" strokeWidth={2} />
          
          {/* Indicador de Preço Atual (SPOT) */}
          <ReferenceLine x={spotPrice} stroke="#3b82f6" strokeWidth={1} strokeDasharray="5 5">
            <Label value="SPOT" position="top" fill="#3b82f6" fontSize={10} fontWeight="bold" />
          </ReferenceLine>
          
          {/* Pontos de Break-even destacados no gráfico */}
          {breakevens.map((be, idx) => (
            <ReferenceDot key={idx} x={be} y={0} r={4} fill="#fbbf24" stroke="#0f172a" strokeWidth={2} />
          ))}
          
          <Area 
            type="monotone" 
            dataKey="lucro" 
            stroke="#38bdf8" 
            fill="url(#pnlGrad)" 
            strokeWidth={3} 
            isAnimationActive={true} 
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};