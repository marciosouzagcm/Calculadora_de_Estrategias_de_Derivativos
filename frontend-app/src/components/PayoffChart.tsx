import {
  Area,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis, YAxis
} from 'recharts';
import { StrategyMetrics } from '../interfaces/Types';

interface PayoffProps {
  strategy: StrategyMetrics;
  lote: number;
  taxasIdaVolta: number;
}

export const PayoffChart = ({ strategy, lote, taxasIdaVolta }: PayoffProps) => {
  // 1. Normalização do Spot
  const spotPrice = Number(strategy.asset_price) || 0;
  
  const generateData = () => {
    const data = [];
    
    // 2. Identificar os strikes para definir os limites do gráfico
    const strikes = strategy.pernas.map(p => {
        const s = Number(p.derivative.strike);
        return s > 500 ? s / 100 : s; // Normaliza 1076 -> 10.76
    });
    
    const minStrike = Math.min(...strikes, spotPrice);
    const maxStrike = Math.max(...strikes, spotPrice);
    
    // Define a margem do gráfico focada nos strikes da operação
    const min = minStrike * 0.90;
    const max = maxStrike * 1.10;
    
    const steps = 100; 
    const stepSize = (max - min) / steps;

    for (let i = 0; i <= steps; i++) {
      const precoSimulado = min + (i * stepSize);
      let pnlUnitarioTotal = 0;
      
      if (strategy.pernas && Array.isArray(strategy.pernas)) {
        strategy.pernas.forEach(perna => {
          // 3. NORMALIZAÇÃO CRÍTICA (B3 1076 -> 10.76)
          const strike = Number(perna.derivative.strike) > 500 
            ? Number(perna.derivative.strike) / 100 
            : Number(perna.derivative.strike);
            
          const premio = Number(perna.derivative.premio) > 50 
            ? Number(perna.derivative.premio) / 100 
            : Number(perna.derivative.premio);
          
          let payoffNoVencimento = 0;
          if (perna.derivative.tipo === 'CALL') {
            payoffNoVencimento = Math.max(0, precoSimulado - strike);
          } else if (perna.derivative.tipo === 'PUT') {
            payoffNoVencimento = Math.max(0, strike - precoSimulado);
          }
          
          const pnlUnidade = perna.direction === 'COMPRA' 
            ? (payoffNoVencimento - premio) 
            : (premio - payoffNoVencimento);
            
          pnlUnitarioTotal += pnlUnidade;
        });
      }

      // 4. Cálculo Líquido Financeiro Real
      const lucroFinanceiroLiquido = (pnlUnitarioTotal * lote) - taxasIdaVolta;

      data.push({ 
        preco: parseFloat(precoSimulado.toFixed(2)), 
        lucro: parseFloat(lucroFinanceiroLiquido.toFixed(2)) 
      });
    }
    return data;
  };

  const chartData = generateData();

  return (
    <div style={{ width: '100%', height: '350px', backgroundColor: '#1e293b', borderRadius: '12px', padding: '10px', border: '1px solid #334155' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3}/>
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
            hide={false}
          />
          
          <YAxis 
            stroke="#94a3b8" 
            fontSize={10} 
            tickFormatter={(v) => `R$${v}`}
          />
          
          <Tooltip 
            formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Resultado']}
            labelFormatter={(label) => `Preço: R$ ${label}`}
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
          />
          
          <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
          
          <ReferenceLine 
            x={spotPrice} 
            stroke="#3b82f6" 
            strokeWidth={2}
            strokeDasharray="3 3" 
            label={{ value: 'SPOT', position: 'top', fill: '#3b82f6', fontSize: 10 }} 
          />

          <Area 
            type="monotone" 
            dataKey="lucro" 
            stroke="#38bdf8"
            fill="url(#pnlGrad)" 
            strokeWidth={2} 
            isAnimationActive={false} 
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};