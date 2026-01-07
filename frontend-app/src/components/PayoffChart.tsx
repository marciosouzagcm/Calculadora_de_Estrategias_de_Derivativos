import {
    Area,
    CartesianGrid,
    ComposedChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis, YAxis,
    Label,
    ReferenceDot
} from 'recharts';
import { StrategyMetrics } from '../../../src/interfaces/Types';

interface PayoffProps {
  strategy: StrategyMetrics;
  lote: number;
  taxasIdaVolta: number;
}

export const PayoffChart = ({ strategy, lote, taxasIdaVolta }: PayoffProps) => {
  const spotPrice = Number(strategy.asset_price) || 0;
  
  const generateData = () => {
    const data = [];
    const strikes = strategy.pernas.map(p => {
        const s = Number(p.derivative.strike);
        return s > 500 ? s / 100 : s; 
    });
    
    const minStrike = Math.min(...strikes, spotPrice);
    const maxStrike = Math.max(...strikes, spotPrice);
    const min = minStrike * 0.85;
    const max = maxStrike * 1.15;
    
    const steps = 150; 
    const stepSize = (max - min) / steps;

    for (let i = 0; i <= steps; i++) {
      const precoSimulado = min + (i * stepSize);
      let pnlUnitarioTotal = 0;
      
      strategy.pernas.forEach(perna => {
        const strike = Number(perna.derivative.strike) > 500 ? Number(perna.derivative.strike) / 100 : Number(perna.derivative.strike);
        const premio = Number(perna.derivative.premio) > 50 ? Number(perna.derivative.premio) / 100 : Number(perna.derivative.premio);
        
        let payoff = 0;
        if (perna.derivative.tipo === 'CALL') payoff = Math.max(0, precoSimulado - strike);
        else if (perna.derivative.tipo === 'PUT') payoff = Math.max(0, strike - precoSimulado);
        
        const pnlUnidade = perna.direction === 'COMPRA' ? (payoff - premio) : (premio - payoff);
        pnlUnitarioTotal += pnlUnidade;
      });

      const lucroFinanceiroLiquido = (pnlUnitarioTotal * lote) - taxasIdaVolta;
      data.push({ 
        preco: parseFloat(precoSimulado.toFixed(2)), 
        lucro: parseFloat(lucroFinanceiroLiquido.toFixed(2)) 
      });
    }
    return data;
  };

  const chartData = generateData();

  // Detecção de Pontos de Breakeven
  const breakevens = [];
  for (let i = 0; i < chartData.length - 1; i++) {
    const atual = chartData[i];
    const proximo = chartData[i + 1];
    if ((atual.lucro <= 0 && proximo.lucro > 0) || (atual.lucro >= 0 && proximo.lucro < 0)) {
      const bePrice = atual.preco + (0 - atual.lucro) * (proximo.preco - atual.preco) / (proximo.lucro - atual.lucro);
      breakevens.push(parseFloat(bePrice.toFixed(2)));
    }
  }

  return (
    <div style={{ width: '100%', height: '400px', backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <defs>
            <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
              <stop offset="50%" stopColor="#10b981" stopOpacity={0.1}/>
              <stop offset="51%" stopColor="#ef4444" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.6}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="preco" type="number" domain={['dataMin', 'dataMax']} stroke="#94a3b8" fontSize={10} />
          <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `R$${v}`} />
          <Tooltip 
             contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
             formatter={(v: any) => [`R$ ${v}`, 'Resultado']}
          />
          <ReferenceLine y={0} stroke="#f1f5f9" strokeWidth={2} strokeOpacity={0.5} />
          <ReferenceLine x={spotPrice} stroke="#3b82f6" strokeWidth={1} strokeDasharray="3 3">
            <Label value="PREÇO ATUAL" position="top" fill="#3b82f6" fontSize={8} />
          </ReferenceLine>
          {breakevens.map((be, idx) => (
            <ReferenceDot key={idx} x={be} y={0} r={4} fill="#fbbf24" stroke="#0f172a" />
          ))}
          <Area type="monotone" dataKey="lucro" stroke="#38bdf8" fill="url(#pnlGrad)" strokeWidth={3} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};