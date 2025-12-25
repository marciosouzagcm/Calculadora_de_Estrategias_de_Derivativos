import React, { useState, useMemo } from 'react';
import { StrategyMetrics } from './interfaces/Types';
import { PayoffChart } from './components/PayoffChart';

const App = () => {
  const [ticker, setTicker] = useState('ITUB4');
  const [preco, setPreco] = useState('32.50');
  const [lote, setLote] = useState(1000);
  const [riscoAlvo, setRiscoAlvo] = useState('0.70');
  const [estrategias, setEstrategias] = useState<StrategyMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [selecionada, setSelecionada] = useState<StrategyMetrics | null>(null);

  const TAXA_POR_PERNA = 22.00;

  const buscarEstrategias = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`http://localhost:3000/api/analise?ticker=${ticker}&preco=${preco}&lote=${lote}&risco=${riscoAlvo}`);
      const result = await resp.json();
      
      if (result.status === "success" && Array.isArray(result.data)) {
        // Trava redundante no Front: Remove qualquer lixo que não cubra as taxas
        const filtradas = result.data.filter((s: StrategyMetrics) => {
          const custoTaxas = s.pernas.length * TAXA_POR_PERNA;
          return (Number(s.max_profit) * lote) - custoTaxas > 0;
        });
        
        setEstrategias(filtradas);
        if (filtradas.length > 0) setSelecionada(filtradas[0]);
        else setSelecionada(null);
      }
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
      setEstrategias([]);
    } finally {
      setLoading(false);
    }
  };

  // Cálculos de Gerenciamento de Risco e Financeiro
  const analise = useMemo(() => {
    if (!selecionada) return null;

    const taxasTotais = selecionada.pernas.length * TAXA_POR_PERNA;
    const lucroLiquido = (Number(selecionada.max_profit) * lote) - taxasTotais;
    const riscoReal = (Math.abs(Number(selecionada.max_loss)) * lote) + taxasTotais;
    const roiReal = (lucroLiquido / riscoReal) * 100;

    // Margem de Segurança (Distância para o Breakeven mais próximo)
    const be = selecionada.breakEvenPoints[0];
    const spot = parseFloat(preco);
    const margem = (((be - spot) / spot) * 100).toFixed(2);

    return { taxasTotais, lucroLiquido, riscoReal, roiReal, margem, be };
  }, [selecionada, lote, preco]);

  return (
    <div style={{ padding: '20px', backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#0f172a', marginBottom: '20px' }}>Trading Board Pro: Inteligência de Opções</h1>

      {/* PAINEL DE CONTROLE */}
      <div style={controlPanelStyle}>
        <div>
          <label style={labelStyle}>ATIVO</label>
          <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>PREÇO SPOT</label>
          <input type="number" value={preco} onChange={e => setPreco(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>RISCO MÁX (R/R)</label>
          <input type="number" step="0.1" value={riscoAlvo} onChange={e => setRiscoAlvo(e.target.value)} style={{ ...inputStyle, color: '#dc2626', fontWeight: 'bold' }} />
        </div>
        <div>
          <label style={labelStyle}>LOTE PADRÃO</label>
          <div style={{ display: 'flex', gap: '5px' }}>
            {[100, 500, 1000].map(v => (
              <button key={v} onClick={() => setLote(v)} style={lote === v ? btnLoteActive : btnLote}>{v}</button>
            ))}
          </div>
        </div>
        <button onClick={buscarEstrategias} style={btnBusca}>
          {loading ? 'PROCESSANDO...' : 'ESCANEAR MERCADO'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
        
        {/* COLUNA ESQUERDA: EXECUÇÃO E PAYOFF */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* BOLETA DE MONTAGEM DETALHADA */}
          {selecionada && (
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '6px solid #2563eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#1e293b' }}>🛠️ Boleta de Montagem: {selecionada.name}</h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Vencimento: {selecionada.expiration}</span>
                </div>
                
                <div style={{ textAlign: 'right', backgroundColor: '#f0f9ff', padding: '10px 15px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                  <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: 'bold', display: 'block' }}>
                    {selecionada.natureza === 'CRÉDITO' ? 'RECEBER NO MÍNIMO' : 'PAGAR NO MÁXIMO'}
                  </span>
                  <span style={{ fontSize: '22px', color: '#0c4a6e', fontWeight: '800' }}>
                    R$ {Math.abs(Number(selecionada.max_profit)).toFixed(2)}
                  </span>
                  <small style={{ display: 'block', fontSize: '10px' }}>Valor Unitário da Estratégia</small>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px' }}>
                    <th style={tdStyle}>AÇÃO</th>
                    <th style={tdStyle}>TICKER</th>
                    <th style={tdStyle}>TIPO</th>
                    <th style={tdStyle}>STRIKE</th>
                    <th style={tdStyle}>PRÊMIO (REF)</th>
                    <th style={tdStyle}>QTD TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {selecionada.pernas.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ ...tdStyle, fontWeight: 'bold', color: p.direction === 'COMPRA' ? '#059669' : '#dc2626' }}>{p.direction}</td>
                      <td style={{ ...tdStyle, fontWeight: 'bold' }}>{p.derivative.option_ticker}</td>
                      <td style={tdStyle}>{p.derivative.tipo}</td>
                      <td style={tdStyle}>R$ {p.derivative.strike.toFixed(2)}</td>
                      <td style={{ ...tdStyle, fontWeight: 'bold' }}>R$ {p.derivative.premio.toFixed(2)}</td>
                      <td style={tdStyle}>{(p.multiplier * lote).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PARÂMETROS DE GERENCIAMENTO DE RISCO */}
          {selecionada && analise && (
            <div style={{ backgroundColor: '#0f172a', color: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}>
              <h4 style={{ color: '#38bdf8', marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
                📊 Parâmetros de Gestão de Risco
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                <div style={riskBox}>
                  <span style={riskLabel}>0 a 0 (BREAKEVEN)</span>
                  <span style={riskValue}>R$ {analise.be.toFixed(2)}</span>
                  <small style={{ color: '#94a3b8' }}>Alvo para lucro</small>
                </div>
                <div style={riskBox}>
                  <span style={riskLabel}>MARGEM %</span>
                  <span style={{ ...riskValue, color: parseFloat(analise.margem) > 0 ? '#4ade80' : '#f87171' }}>
                    {analise.margem}%
                  </span>
                  <small style={{ color: '#94a3b8' }}>Distância Spot</small>
                </div>
                <div style={riskBox}>
                  <span style={riskLabel}>LUCRO LÍQUIDO</span>
                  <span style={{ ...riskValue, color: '#4ade80' }}>R$ {analise.lucroLiquido.toFixed(2)}</span>
                  <small style={{ color: '#94a3b8' }}>Após taxas (R$ {analise.taxasTotais})</small>
                </div>
                <div style={riskBox}>
                  <span style={riskLabel}>STOP LOSS (RISCO)</span>
                  <span style={{ ...riskValue, color: '#f87171' }}>R$ {analise.riscoReal.toFixed(2)}</span>
                  <small style={{ color: '#94a3b8' }}>Perda máxima real</small>
                </div>
              </div>
            </div>
          )}

          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0 }}>Gráfico de Payoff Líquido</h3>
            {selecionada ? <PayoffChart strategy={selecionada} /> : <p style={{ color: '#64748b' }}>Selecione uma estratégia para visualizar o gráfico.</p>}
          </div>
        </div>

        {/* COLUNA DIREITA: LISTA DE OPORTUNIDADES */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0, borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>Oportunidades</h3>
          {estrategias.length > 0 ? estrategias.map((est, idx) => (
            <div 
              key={idx} 
              onClick={() => setSelecionada(est)} 
              style={{ 
                ...cardStyle, 
                backgroundColor: selecionada?.name === est.name ? '#eff6ff' : 'transparent',
                borderColor: selecionada?.name === est.name ? '#2563eb' : '#e2e8f0'
              }}
            >
              <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{est.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                <span style={{ color: '#059669', fontWeight: 'bold', fontSize: '13px' }}>ROI: {est.exibir_roi}</span>
                <span style={{ color: '#64748b', fontSize: '13px' }}>Risco: R$ {est.exibir_risco?.toFixed(0)}</span>
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8' }}>
              <p>Nenhuma oportunidade lucrativa encontrada para este perfil de risco.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- ESTILOS ---
const controlPanelStyle = { display: 'flex', flexWrap: 'wrap' as const, gap: '20px', marginBottom: '20px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' };
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' };
const inputStyle = { padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100px', outline: 'none', fontSize: '14px' };
const btnLote = { padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontWeight: 'bold', transition: 'all 0.2s' };
const btnLoteActive = { ...btnLote, backgroundColor: '#0f172a', color: '#fff', borderColor: '#0f172a' };
const btnBusca = { backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '0 25px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' };
const cardStyle = { padding: '15px', cursor: 'pointer', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '10px', transition: 'all 0.2s ease' };
const tdStyle = { padding: '12px 8px', fontSize: '13px', color: '#334155' };
const riskBox = { display: 'flex', flexDirection: 'column' as const, gap: '4px' };
const riskLabel = { fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' as const, letterSpacing: '0.05em' };
const riskValue = { fontSize: '18px', fontWeight: 'bold' as const };

export default App;