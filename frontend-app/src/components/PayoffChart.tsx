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

// Adicionei 'lote' e 'taxas' como props para o gráfico ser fiel à realidade financeira
interface PayoffProps {
  strategy: StrategyMetrics;
  lote: number;
  taxasIdaVolta: number;
}

export const PayoffChart = ({ strategy, lote, taxasIdaVolta }: PayoffProps) => {
  const spotPrice = Number(strategy.asset_price) || 0;
  const bePoints = strategy.breakEvenPoints || [];

  const generateData = () => {
    const data = [];
    // Define a margem do gráfico com base no Spot
    const min = spotPrice * 0.85;
    const max = spotPrice * 1.15;
    
    const steps = 80; 
    const stepSize = (max - min) / steps;

    for (let i = 0; i <= steps; i++) {
      const precoSimulado = min + (i * stepSize);
      let pnlUnitarioTotal = 0;
      
      if (strategy.pernas && Array.isArray(strategy.pernas)) {
        strategy.pernas.forEach(perna => {
          const strike = Number(perna.derivative.strike) || 0;
          const premio = Number(perna.derivative.premio) || 0;
          
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

      // CÁLCULO LÍQUIDO: (P&L das opções * Lote) - Taxas Totais
      const lucroFinanceiroLíquido = (pnlUnitarioTotal * lote) - taxasIdaVolta;

      data.push({ 
        preco: parseFloat(precoSimulado.toFixed(2)), 
        lucro: parseFloat(lucroFinanceiroLíquido.toFixed(2)) 
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
          
          <ReferenceLine 
            x={spotPrice} 
            stroke="#3b82f6" 
            strokeWidth={2}
            strokeDasharray="3 3" 
            label={{ value: 'SPOT', position: 'top', fill: '#3b82f6', fontSize: 10, fontWeight: 'bold' }} 
          />

          {bePoints.map((be, index) => (
            <ReferenceLine 
              key={`be-${index}`}
              x={be} 
              stroke="#64748b" 
              strokeDasharray="5 5"
              label={{ value: `B.E.`, position: 'insideBottomRight', fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} 
            />
          ))}
          
          <Area 
            type="monotone" 
            dataKey="lucro" 
            stroke="#1e293b"
            fill="url(#pnlGrad)" 
            strokeWidth={2} 
            isAnimationActive={false} 
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};