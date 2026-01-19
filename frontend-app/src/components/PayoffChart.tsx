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
 * BOARDPRO V40.0 - Engine de Payoff de Alta Precisão
 * Este componente renderiza a curva de lucro/prejuízo no vencimento (at-the-money).
 */
interface PayoffProps {
  strategy: StrategyMetrics;
  lote: number;
  taxasIdaVolta: number;
}

export const PayoffChart = ({ strategy, lote, taxasIdaVolta }: PayoffProps) => {
  const spotPrice = Number(strategy.asset_price) || 0;
  
  /**
   * DATA ENGINE: Calcula o PnL simulado para 150 pontos de preço.
   * Utiliza cálculo vetorial para processar todas as pernas da estratégia.
   */
  const chartData = useMemo(() => {
    const data = [];
    const strikes = strategy.pernas.map(p => Number(p.derivative.strike) || 0);
    
    // Define limites inteligentes para o gráfico (Foco nos Strikes + Spot)
    const minS = Math.min(...strikes.filter(s => s > 0), spotPrice);
    const maxS = Math.max(...strikes, spotPrice);
    
    // Margem de visualização de 20% para cobrir a "cauda" do gráfico
    const minRange = minS * 0.8; 
    const maxRange = maxS * 1.2;
    const steps = 150; // Maior resolução para curvas suaves
    const stepSize = (maxRange - minRange) / steps;

    for (let i = 0; i <= steps; i++) {
      const precoSimulado = minRange + (i * stepSize);
      let pnlAcumulado = 0;
      
      strategy.pernas.forEach(perna => {
        const strike = Number(perna.derivative.strike);
        const premio = Number(perna.derivative.premio);
        let payoffPerna = 0;

        // Cálculo intrínseco de payoff por tipo de derivativo
        if (perna.derivative.tipo === 'CALL') {
          payoffPerna = Math.max(0, precoSimulado - strike);
        } else if (perna.derivative.tipo === 'PUT') {
          payoffPerna = Math.max(0, strike - precoSimulado);
        }

        // Lógica de Direção: Compra (Long) vs Venda (Short)
        const pnlUnitario = perna.direction === 'COMPRA' 
          ? (payoffPerna - premio) 
          : (premio - payoffPerna);
          
        pnlAcumulado += pnlUnitario;
      });

      // Resultado Líquido: (PnL * Lote) - Custos Operacionais
      const resultadoFinanceiro = (pnlAcumulado * lote) - taxasIdaVolta;
      
      data.push({ 
        preco: parseFloat(precoSimulado.toFixed(2)), 
        lucro: parseFloat(resultadoFinanceiro.toFixed(2)),
        // Campos auxiliares para o sombreado dinâmico do gráfico
        areaLucro: resultadoFinanceiro > 0 ? resultadoFinanceiro : 0,
        areaPrejuizo: resultadoFinanceiro < 0 ? resultadoFinanceiro : 0
      });
    }
    return data;
  }, [strategy, lote, taxasIdaVolta, spotPrice]);

  /**
   * BREAK-EVEN FINDER: Localiza os preços de equilíbrio.
   */
  const breakevens = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < chartData.length - 1; i++) {
      const p1 = chartData[i];
      const p2 = chartData[i+1];
      
      if ((p1.lucro <= 0 && p2.lucro > 0) || (p1.lucro >= 0 && p2.lucro < 0)) {
        // Interpolação linear para precisão centesimal
        const be = p1.preco + (0 - p1.lucro) * (p2.preco - p1.preco) / (p2.lucro - p1.lucro);
        pts.push(parseFloat(be.toFixed(2)));
      }
    }
    return pts;
  }, [chartData]);

  return (
    <div style={{ width: '100%', height: '380px', backgroundColor: '#0f172a', borderRadius: '8px', padding: '15px', border: '1px solid #1e293b' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
          <defs>
            {/* Gradientes de Preenchimento Profissional */}
            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.05}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          
          <XAxis 
            dataKey="preco" 
            type="number" 
            domain={['dataMin', 'dataMax']} 
            stroke="#475569" 
            fontSize={11} 
            tickFormatter={(v) => `R$ ${v}`}
            tickCount={8}
          />
          
          <YAxis 
            stroke="#475569" 
            fontSize={11} 
            tickFormatter={(v) => `R$ ${v}`}
            width={80}
          />
          
          <Tooltip 
             contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px', fontSize: '12px', color: '#f1f5f9' }}
             itemStyle={{ fontWeight: 'bold' }}
             labelFormatter={(v) => `Preço do Ativo: R$ ${v}`}
             formatter={(v: any) => [`R$ ${v}`, 'Resultado Estimado']}
          />
          
          {/* Linha de Equilíbrio (Eixo Zero) */}
          <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
          
          {/* Marcador de Preço SPOT Atual */}
          <ReferenceLine x={spotPrice} stroke="#38bdf8" strokeWidth={2} strokeDasharray="4 4">
            <Label value="SPOT ATUAL" position="top" fill="#38bdf8" fontSize={10} fontWeight="bold" />
          </ReferenceLine>
          
          {/* Áreas de Lucro e Prejuízo */}
          <Area 
            type="monotone" 
            dataKey="areaLucro" 
            stroke="none" 
            fill="url(#colorProfit)" 
            connectNulls
          />
          <Area 
            type="monotone" 
            dataKey="areaPrejuizo" 
            stroke="none" 
            fill="url(#colorLoss)" 
            connectNulls
          />

          {/* Linha Principal do Payoff */}
          <Area 
            type="monotone" 
            dataKey="lucro" 
            stroke="#38bdf8" 
            fill="transparent" 
            strokeWidth={3} 
            isAnimationActive={true}
          />

          {/* Indicadores de Break-even destacados */}
          {breakevens.map((be, idx) => (
            <ReferenceDot 
                key={idx} 
                x={be} 
                y={0} 
                r={5} 
                fill="#fbbf24" 
                stroke="#0f172a" 
                strokeWidth={2}
            >
              <Label value={`BE: ${be}`} position="bottom" fill="#fbbf24" fontSize={9} offset={10} />
            </ReferenceDot>
          ))}
          
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};