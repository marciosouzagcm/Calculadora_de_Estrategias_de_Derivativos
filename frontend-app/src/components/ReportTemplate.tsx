import React, { useMemo } from 'react';
import { BookOpen, TrendingUp, Clock, ShieldAlert } from 'lucide-react';

const formatCurrencyLocal = (value: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export const ReportTemplate = ({ est, metricas, ticker, lote, logoUrl, taxasIdaVolta = 0 }: any) => {
  if (!est || !metricas || !ticker) return null;

  // --- LÓGICA MIGRADA DO PAYOFFCHART.TSX ---
  const chartData = useMemo(() => {
    const spotPrice = metricas.asset_price || metricas.assetPrice || 0;
    const pernas = est.pernas || [];
    
    // Normalização das pernas para o cálculo
    const pernasNorm = pernas.map((p: any) => ({
      strike: p.strike || 0,
      premio: p.premio || 0,
      tipo: (p.tipo || '').toUpperCase(),
      direcao: (p.direction || '').toUpperCase()
    }));

    const strikes = pernasNorm.map((p: any) => p.strike).filter((s: any) => s > 0);
    const minS = Math.min(...strikes, spotPrice) * 0.85;
    const maxS = Math.max(...strikes, spotPrice) * 1.15;
    const steps = 60; // Menos passos para o SVG do PDF ser mais rápido
    const stepSize = (maxS - minS) / steps;

    const points = [];
    for (let i = 0; i <= steps; i++) {
      const precoSimulado = minS + (i * stepSize);
      let pnlUnitario = 0;

      pernasNorm.forEach((p: any) => {
        let payoffPerna = 0;
        if (p.tipo === 'CALL') payoffPerna = Math.max(0, precoSimulado - p.strike);
        else if (p.tipo === 'PUT') payoffPerna = Math.max(0, p.strike - precoSimulado);

        const isLong = ['COMPRA', 'BUY', 'C'].includes(p.direcao);
        pnlUnitario += isLong ? (payoffPerna - p.premio) : (p.premio - payoffPerna);
      });

      points.push({
        x: precoSimulado,
        y: (pnlUnitario * lote) - taxasIdaVolta
      });
    }
    return points;
  }, [est, metricas, lote, taxasIdaVolta]);

  const renderNativePayoff = () => {
    const width = 740;
    const height = 280;
    const padding = { top: 20, right: 20, bottom: 40, left: 70 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const xs = chartData.map(d => d.x);
    const ys = chartData.map(d => d.y);
    const minX = Math.min(...xs); const maxX = Math.max(...xs);
    const minY = Math.min(...ys, -100); const maxY = Math.max(...ys, 100);

    const getX = (val: number) => padding.left + ((val - minX) / (maxX - minX)) * chartW;
    const getY = (val: number) => padding.top + chartH - ((val - minY) / (maxY - minY)) * chartH;
    const zeroY = getY(0);

    const pathData = chartData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d.x)} ${getY(d.y)}`).join(' ');

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: '#f8fafc', borderRadius: '8px' }}>
        {/* Linha de Breakeven */}
        <line x1={padding.left} y1={zeroY} x2={width - padding.right} y2={zeroY} stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4" />
        
        {/* Áreas de Lucro/Prejuízo */}
        {chartData.map((d, i) => {
          if (i === chartData.length - 1) return null;
          const next = chartData[i+1];
          const isProfit = (d.y + next.y) / 2 >= 0;
          return (
            <polygon 
              key={i} 
              points={`${getX(d.x)},${zeroY} ${getX(d.x)},${getY(d.y)} ${getX(next.x)},${getY(next.y)} ${getX(next.x)},${zeroY}`}
              fill={isProfit ? '#22c55e' : '#ef4444'} 
              fillOpacity="0.1" 
            />
          );
        })}

        {/* Linha do Gráfico */}
        <path d={pathData} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round" />

        {/* Labels de Eixo */}
        <text x={padding.left - 5} y={getY(maxY)} textAnchor="end" fontSize="10" fill="#64748b">{formatCurrencyLocal(maxY)}</text>
        <text x={padding.left - 5} y={getY(minY)} textAnchor="end" fontSize="10" fill="#64748b">{formatCurrencyLocal(minY)}</text>
        <text x={getX(minX)} y={height - 10} fontSize="10" fill="#64748b">R$ {minX.toFixed(2)}</text>
        <text x={getX(maxX)} y={height - 10} textAnchor="end" fontSize="10" fill="#64748b">R$ {maxX.toFixed(2)}</text>
      </svg>
    );
  };

  return (
    <div id="report-pdf-template" style={{ width: '850px', backgroundColor: '#fff', color: '#000', fontFamily: 'Arial' }}>
      <div style={{ padding: '50px', minHeight: '1120px', display: 'flex', flexDirection: 'column' }}>
        {/* Header, Métricas e Tabela aqui... */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold' }}>PROJEÇÃO DE PAYOFF NO VENCIMENTO</h3>
          <div style={{ border: '1px solid #e2e8f0', padding: '15px', borderRadius: '12px' }}>
            {renderNativePayoff()}
          </div>
        </div>
        {/* Restante do Template... */}
      </div>
    </div>
  );
};