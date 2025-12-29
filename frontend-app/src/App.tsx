import { useMemo, useState } from 'react';
import { PayoffChart } from './components/PayoffChart';
import { StrategyMetrics } from './interfaces/Types';

const App = () => {
  const [ticker, setTicker] = useState('PETR4');
  const [preco, setPreco] = useState('30.50');
  const [lote, setLote] = useState(1000); 
  const [filtroRisco, setFiltroRisco] = useState<string>('0.30'); 

  const [estrategias, setEstrategias] = useState<StrategyMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [selecionada, setSelecionada] = useState<StrategyMetrics | null>(null);

  const buscarEstrategias = async () => {
    setLoading(true);
    try {
      const url = `http://localhost:3001/api/analise?ticker=${ticker.trim().toUpperCase()}&preco=${preco}&risco_max=${filtroRisco}&t=${Date.now()}`;
      const resp = await fetch(url);
      const result = await resp.json();
      if (result.status === "success") {
        setEstrategias(result.data);
        setSelecionada(result.data[0] || null);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const analise = useMemo(() => {
    if (!selecionada) return null;

    // --- RECALCULO UNITÁRIO REAL VIA PERNAS PARA EVITAR ERRO DE ESCALA ---
    const precoUnitarioCalculado = selecionada.pernas.reduce((acc, p) => {
        const valor = p.derivative.premio;
        const valorNormalizado = valor > 50 ? valor / 100 : valor; 
        return p.direction === 'COMPRA' ? acc + valorNormalizado : acc - valorNormalizado;
    }, 0);

    const precoMercado = Math.abs(precoUnitarioCalculado);
    
    const nPernas = selecionada.pernas.length;
    const taxaEntrada = nPernas * 22.00;
    const taxaSaida = nPernas * 22.00;
    const taxasTotais = taxaEntrada + taxaSaida;

    const custoOpcoesReal = precoMercado * lote;
    const riscoRealTotal = custoOpcoesReal + taxaEntrada;
    const alvoBeUnitario = lote > 0 ? (custoOpcoesReal + taxasTotais) / lote : 0;

    const strikeA = selecionada.pernas[0].derivative.strike;
    const strikeB = selecionada.pernas[1].derivative.strike;
    const largura = Math.abs(strikeB - strikeA);
    
    let lucroLiquido = 0;
    
    // Lógica para Estratégias de Volatilidade vs Travas de Crédito/Débito
    if (selecionada.name.toLowerCase().includes("strangle") || 
        selecionada.name.toLowerCase().includes("calendar") || 
        largura < 0.10) {
        const roiAlvo = parseFloat(selecionada.exibir_roi) / 100;
        lucroLiquido = (riscoRealTotal * roiAlvo);
    } else {
        lucroLiquido = (largura - precoMercado) * lote - taxasTotais;
    }

    return {
      lote,
      precoUnitario: precoMercado,
      riscoReal: riscoRealTotal,
      taxasTotais,
      alvoRecompra: alvoBeUnitario,
      lucroLiquido,
      roi: riscoRealTotal > 0 ? ((lucroLiquido / riscoRealTotal) * 100).toFixed(2) + '%' : '0%'
    };
  }, [selecionada, lote]);

  return (
    <div style={{ padding: '30px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', color: '#1e293b' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '25px' }}>Trading Board <span style={{color: '#2563eb'}}>Pro</span></h1>

      <div style={topBarStyle}>
        <div style={inputGroup}><label style={labelStyle}>ATIVO</label><input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} style={inputStyle} /></div>
        <div style={inputGroup}><label style={labelStyle}>PREÇO SPOT</label><input type="number" value={preco} onChange={e => setPreco(e.target.value)} style={inputStyle} /></div>
        <div style={inputGroup}>
          <label style={labelStyle}>LOTE DESEJADO</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="number" value={lote} onChange={e => setLote(Number(e.target.value))} style={{...inputStyle, width: '80px'}} />
            {[100, 500, 1000].map(v => (<button key={v} onClick={() => setLote(v)} style={lote === v ? btnActive : btn}>{v}</button>))}
          </div>
        </div>
        <div style={inputGroup}>
          <label style={{...labelStyle, color: '#2563eb'}}>FILTRAR RISCO ATÉ (R$)</label>
          <input type="number" step="0.01" value={filtroRisco} onChange={e => setFiltroRisco(e.target.value)} style={{...inputStyle, borderColor: '#2563eb', width: '120px'}} />
        </div>
        <button onClick={buscarEstrategias} style={btnEscanear}>{loading ? '...' : 'ESCANEAR'}</button>
      </div>

      {selecionada && analise && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '30px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            {/* BOLETA */}
            <div style={boletaCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px' }}>🛠️ {selecionada.name}</h2>
                  <small style={{ color: '#64748b' }}>VENCIMENTO: <strong>{selecionada.expiration}</strong> | LOTE: <strong>{analise.lote}</strong></small>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div style={badgeStyle('#eff6ff', '#2563eb')}>
                    <small style={bLabel}>PRÊMIO UNIT. (REAL)</small>
                    <div style={bVal}>R$ {analise.precoUnitario.toFixed(2)}</div>
                  </div>
                  <div style={badgeStyle('#fff7ed', '#ea580c')}>
                    <small style={bLabel}>SAIR NO 0 A 0 (UNIT.)</small>
                    <div style={bVal}>R$ {analise.alvoRecompra.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={tableHeader}>
                  <tr><th>LADO</th><th>TIPO</th><th>TICKER</th><th>STRIKE</th><th>PRÊMIO</th><th>QTD</th></tr>
                </thead>
                <tbody>
                  {selecionada.pernas.map((p, i) => {
                    const pPremio = p.derivative.premio > 50 ? p.derivative.premio / 100 : p.derivative.premio;
                    return (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '15px 0', color: p.direction === 'COMPRA' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{p.direction}</td>
                      <td style={{fontWeight: 'bold', color: '#64748b'}}>{p.derivative.tipo}</td>
                      <td style={{ fontWeight: 'bold' }}>{p.derivative.option_ticker}</td>
                      <td>R$ {p.derivative.strike.toFixed(2)}</td>
                      <td>R$ {pPremio.toFixed(2)}</td>
                      <td style={{ fontWeight: 'bold' }}>{p.multiplier * analise.lote}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>

            {/* IMPACTO FINANCEIRO */}
            <div style={darkCard}>
              <h4 style={dTitle}>📊 IMPACTO FINANCEIRO REAL (LOTE {analise.lote} @ R$ {analise.precoUnitario.toFixed(2)})</h4>
              <div style={mGrid}>
                <div><small style={mLabel}>LUCRO LÍQUIDO REAL</small><div style={{...mVal, color: '#4ade80'}}>R$ {analise.lucroLiquido.toFixed(2)}</div></div>
                <div><small style={mLabel}>RISCO REAL (OPÇÕES + TAXAS)</small><div style={{...mVal, color: '#f87171'}}>R$ {analise.riscoReal.toFixed(2)}</div></div>
                <div><small style={mLabel}>ALVO BE (SAÍDA UNIT.)</small><div style={mVal}>R$ {analise.alvoRecompra.toFixed(2)}</div></div>
                <div><small style={mLabel}>ROI REAL</small><div style={{...mVal, color: '#4ade80'}}>{analise.roi}</div></div>
              </div>
            </div>

            {/* GRÁFICO DE PAYOFF REINSTALADO */}
            <div style={chartCard}>
               <PayoffChart strategy={selecionada} lote={analise.lote} taxasIdaVolta={analise.taxasTotais} />
            </div>
          </div>
          
          <div style={sidebar}>
            <h3 style={{ fontSize: '16px', marginBottom: '15px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>Estratégias Encontradas</h3>
            {estrategias.map((est, idx) => (
              <div key={idx} onClick={() => setSelecionada(est)} style={{ ...estCard, borderColor: selecionada?.name === est.name ? '#2563eb' : '#e2e8f0', backgroundColor: selecionada?.name === est.name ? '#eff6ff' : '#fff' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{est.name}</div>
                <div style={{ color: '#2563eb', fontSize: '11px' }}>Venc: {est.expiration}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Estilos
const topBarStyle = { display: 'flex', gap: '15px', backgroundColor: '#fff', padding: '20px', borderRadius: '15px', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', alignItems: 'flex-end' };
const inputGroup = { display: 'flex', flexDirection: 'column' as const, gap: '5px' };
const labelStyle = { fontSize: '10px', fontWeight: 'bold', color: '#64748b' };
const inputStyle = { padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100px' };
const btn = { padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 'bold' as const };
const btnActive = { ...btn, backgroundColor: '#0f172a', color: '#fff' };
const btnEscanear = { backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' as const };
const boletaCard = { backgroundColor: '#fff', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderLeft: '6px solid #2563eb' };
const badgeStyle = (bg: string, col: string) => ({ backgroundColor: bg, color: col, padding: '12px 18px', borderRadius: '12px', textAlign: 'right' as const });
const bLabel = { fontSize: '9px', fontWeight: 'bold', display: 'block', marginBottom: '4px' };
const bVal = { fontSize: '20px', fontWeight: '800' };
const tableHeader = { textAlign: 'left' as const, fontSize: '11px', color: '#94a3b8', borderBottom: '2px solid #f1f5f9' };
const darkCard = { backgroundColor: '#0f172a', color: '#fff', padding: '25px', borderRadius: '15px' };
const dTitle = { color: '#38bdf8', fontSize: '10px', fontWeight: 'bold', marginTop: 0, marginBottom: '20px' };
const mGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' };
const mLabel = { fontSize: '9px', color: '#94a3b8' };
const mVal = { fontSize: '16px', fontWeight: 'bold' };
const sidebar = { backgroundColor: '#fff', padding: '20px', borderRadius: '15px', height: 'fit-content', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' };
const estCard = { padding: '15px', borderRadius: '12px', border: '2px solid', marginBottom: '12px', cursor: 'pointer' };
const chartCard = { backgroundColor: '#fff', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' };

export default App;