import { useMemo, useState } from 'react';
// Certifique-se de que o caminho do componente e da interface estão corretos no seu projeto
import { PayoffChart } from './components/PayoffChart'; 
import { StrategyMetrics } from './interfaces/Types';

const App = () => {
  // Ajuste os padrões para o ativo que você acabou de importar (Ex: BBAS3)
  const [ticker, setTicker] = useState('BBAS3');
  const [preco, setPreco] = useState('21.50');
  const [lote, setLote] = useState(1000);
  const [riscoAlvo, setRiscoAlvo] = useState('2.0'); // Aumentado para facilitar a primeira busca
  const [estrategias, setEstrategias] = useState<StrategyMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [selecionada, setSelecionada] = useState<StrategyMetrics | null>(null);

  const TAXA_POR_PERNA = 22.00;

  const buscarEstrategias = async () => {
    setLoading(true);
    try {
      // O ticker é enviado em caixa alta e sem espaços
      const cleanTicker = ticker.trim().toUpperCase();
      const url = `http://localhost:3001/api/analise?ticker=${cleanTicker}&preco=${preco}&lote=${lote}&risco=${riscoAlvo}`;
      
      const resp = await fetch(url);
      
      if (!resp.ok) throw new Error(`Erro na requisição: ${resp.statusText}`);
      
      const result = await resp.json();
      console.log("📡 Resposta do Servidor:", result);
      
      if (result.status === "success" && Array.isArray(result.data)) {
        setEstrategias(result.data);
        if (result.data.length > 0) {
          setSelecionada(result.data[0]);
        } else {
          setSelecionada(null);
          console.warn("⚠️ Nenhuma estratégia encontrada para os filtros atuais.");
        }
      }
    } catch (err) {
      console.error("❌ Erro ao buscar dados:", err);
      alert("Erro de conexão. Verifique se o Backend (porta 3001) está ativo.");
      setEstrategias([]);
    } finally {
      setLoading(false);
    }
  };

  const analise = useMemo(() => {
    if (!selecionada) return null;

    const numPernas = selecionada.pernas.length;
    const taxasEntrada = numPernas * TAXA_POR_PERNA;
    const taxasCicloTotal = taxasEntrada * 2; // Ida e Volta

    const maxProfitNum = Number(selecionada.max_profit) || 0;
    const maxLossNum = Number(selecionada.max_loss) || 0;

    const lucroLiquido = maxProfitNum; 
    const riscoReal = Math.abs(maxLossNum);
    const roiReal = riscoReal > 0 ? (lucroLiquido / riscoReal) * 100 : 0;

    const premioNet = Math.abs(Number(selecionada.net_premium));
    const alvoRecompra = Math.abs(premioNet - (taxasCicloTotal / lote));

    const be = selecionada.breakEvenPoints ? selecionada.breakEvenPoints[0] : 0;
    const spot = parseFloat(preco);
    const margem = spot !== 0 ? (((be - spot) / spot) * 100).toFixed(2) : "0.00";

    return { 
      taxasEntrada, 
      taxasCicloTotal, 
      lucroLiquido, 
      riscoReal, 
      roiReal, 
      margem, 
      be, 
      alvoRecompra 
    };
  }, [selecionada, lote, preco]);

  return (
    <div style={{ padding: '20px', backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#0f172a', marginBottom: '20px' }}>Trading Board Pro: Inteligência de Opções</h1>

      {/* PAINEL DE CONTROLE */}
      <div style={controlPanelStyle}>
        <div><label style={labelStyle}>ATIVO</label><input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} style={inputStyle} /></div>
        <div><label style={labelStyle}>PREÇO SPOT</label><input type="number" value={preco} onChange={e => setPreco(e.target.value)} style={inputStyle} /></div>
        <div><label style={labelStyle}>RISCO MÁX (R/R)</label><input type="number" step="0.1" value={riscoAlvo} onChange={e => setRiscoAlvo(e.target.value)} style={{ ...inputStyle, color: '#dc2626', fontWeight: 'bold' }} /></div>
        <div><label style={labelStyle}>LOTE PADRÃO</label><div style={{ display: 'flex', gap: '5px' }}>{[100, 500, 1000].map(v => (<button key={v} onClick={() => setLote(v)} style={lote === v ? btnLoteActive : btnLote}>{v}</button>))}</div></div>
        <button onClick={buscarEstrategias} style={btnBusca}>{loading ? 'PROCESSANDO...' : 'ESCANEAR MERCADO'}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* BOLETA DE MONTAGEM */}
          {selecionada && analise && (
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '6px solid #2563eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#1e293b' }}>🛠️ Boleta: {selecionada.name}</h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Vencimento: {selecionada.expiration}</span>
                </div>
                
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={priceBadgeStyle('#f0f9ff', '#0369a1')}>
                        <span style={badgeLabelStyle}>MONTAR (REF)</span>
                        <span style={badgeValueStyle}>R$ {Math.abs(Number(selecionada.net_premium)).toFixed(2)}</span>
                    </div>
                    <div style={priceBadgeStyle('#fff7ed', '#9a3412')}>
                        <span style={badgeLabelStyle}>RECOMPRA (0 a 0)</span>
                        <span style={badgeValueStyle}>R$ {analise.alvoRecompra.toFixed(2)}</span>
                    </div>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px' }}>
                    <th style={tdStyle}>AÇÃO</th><th style={tdStyle}>TICKER</th><th style={tdStyle}>TIPO</th><th style={tdStyle}>STRIKE</th><th style={tdStyle}>PRÊMIO (REF)</th><th style={tdStyle}>QTD</th>
                  </tr>
                </thead>
                <tbody>
                  {selecionada.pernas.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ ...tdStyle, fontWeight: 'bold', color: p.direction === 'COMPRA' ? '#059669' : '#dc2626' }}>{p.direction}</td>
                      <td style={{ ...tdStyle, fontWeight: 'bold' }}>{p.derivative.option_ticker || p.derivative.ticker}</td>
                      <td style={tdStyle}>{p.derivative.tipo}</td>
                      <td style={tdStyle}>R$ {p.derivative.strike?.toFixed(2)}</td>
                      <td style={{ ...tdStyle, fontWeight: 'bold' }}>R$ {p.derivative.premio.toFixed(2)}</td>
                      <td style={tdStyle}>{(p.multiplier * lote).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PAINEL DE GREGAS */}
          {selecionada && analise && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={darkPanelStyle}>
                    <h4 style={panelTitleStyle}>📊 Risco & Lucro Líquido</h4>
                    <div style={riskGridStyle}>
                        <div style={riskBox}><span style={riskLabel}>LUCRO LÍQ.</span><span style={{...riskValue, color: '#4ade80'}}>R$ {analise.lucroLiquido.toFixed(2)}</span></div>
                        <div style={riskBox}><span style={riskLabel}>RISCO REAL</span><span style={{...riskValue, color: '#f87171'}}>R$ {analise.riscoReal.toFixed(2)}</span></div>
                        <div style={riskBox}><span style={riskLabel}>TAXAS CICLO</span><span style={riskValue}>R$ {analise.taxasCicloTotal.toFixed(2)}</span></div>
                        <div style={riskBox}><span style={riskLabel}>B.E.</span><span style={riskValue}>R$ {analise.be.toFixed(2)}</span></div>
                    </div>
                </div>
                <div style={{ ...darkPanelStyle, backgroundColor: '#1e293b' }}>
                    <h4 style={panelTitleStyle}>🧬 Gregas Net</h4>
                    <div style={riskGridStyle}>
                        <div style={riskBox}><span style={riskLabel}>DELTA</span><span style={{...riskValue, color: (selecionada.greeks?.delta ?? 0) >= 0 ? '#4ade80' : '#f87171'}}>{selecionada.greeks?.delta?.toFixed(4) || "0.0000"}</span></div>
                        <div style={riskBox}><span style={riskLabel}>THETA</span><span style={{...riskValue, color: (selecionada.greeks?.theta ?? 0) >= 0 ? '#4ade80' : '#f87171'}}>{selecionada.greeks?.theta?.toFixed(4) || "0.0000"}</span></div>
                        <div style={riskBox}><span style={riskLabel}>GAMMA</span><span style={riskValue}>{selecionada.greeks?.gamma?.toFixed(4) || "0.0000"}</span></div>
                        <div style={riskBox}><span style={riskLabel}>VEGA</span><span style={riskValue}>{selecionada.greeks?.vega?.toFixed(4) || "0.0000"}</span></div>
                    </div>
                </div>
            </div>
          )}

          {/* GRÁFICO */}
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0 }}>Gráfico de Payoff Líquido</h3>
            {selecionada ? <PayoffChart strategy={selecionada} /> : <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Selecione uma estratégia para visualizar o gráfico.</div>}
          </div>
        </div>

        {/* OPORTUNIDADES */}
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
              {loading ? <p>Analisando mercado...</p> : <p>Nenhuma oportunidade encontrada.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- ESTILOS CORRIGIDOS (SEM SHORTHAND CONFLICT) ---
const controlPanelStyle = { display: 'flex', flexWrap: 'wrap' as const, gap: '20px', marginBottom: '20px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' };
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' };
const inputStyle = { padding: '8px 12px', borderRadius: '8px', borderStyle: 'solid', borderWidth: '1px', borderColor: '#cbd5e1', width: '100px', outline: 'none', fontSize: '14px' };
const btnLote = { padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', borderStyle: 'solid', borderWidth: '1px', borderColor: '#cbd5e1', backgroundColor: '#fff', fontWeight: 'bold' };
const btnLoteActive = { ...btnLote, backgroundColor: '#0f172a', color: '#fff', borderColor: '#0f172a' };
const btnBusca = { backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '0 25px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' };
const cardStyle = { padding: '15px', cursor: 'pointer', borderRadius: '10px', marginBottom: '10px', borderStyle: 'solid', borderWidth: '1px', borderColor: '#e2e8f0' };
const tdStyle = { padding: '12px 8px', fontSize: '13px', color: '#334155' };
const darkPanelStyle = { backgroundColor: '#0f172a', color: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' };
const panelTitleStyle = { color: '#38bdf8', marginTop: 0, marginBottom: '15px', fontSize: '12px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' };
const riskGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' };
const riskBox = { display: 'flex', flexDirection: 'column' as const };
const riskLabel = { fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' as const };
const riskValue = { fontSize: '15px', fontWeight: 'bold' as const };
const priceBadgeStyle = (bg: string, color: string) => ({ backgroundColor: bg, color: color, padding: '10px 15px', borderRadius: '8px', borderStyle: 'solid', borderWidth: '1px', borderColor: `${color}44`, textAlign: 'right' as const });
const badgeLabelStyle = { fontSize: '10px', fontWeight: 'bold' as const, display: 'block' };
const badgeValueStyle = { fontSize: '18px', fontWeight: '800' as const };

export default App;