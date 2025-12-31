import { useMemo, useState } from 'react';
import { PayoffChart } from './components/PayoffChart';
import { StrategyMetrics } from './interfaces/Types';

const App = () => {
  const [ticker, setTicker] = useState('BBAS3');
  const [preco, setPreco] = useState('21.80');
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

  const calcularMetricas = (est: StrategyMetrics, loteAtual: number) => {
    if (!est.pernas || est.pernas.length === 0) return null;

    let unitario = 0;
    est.pernas.forEach(p => {
        const precoLimpo = p.derivative.premio > 50 ? p.derivative.premio / 100 : p.derivative.premio;
        const prêmioProporcional = precoLimpo * p.multiplier;
        if (p.direction === 'VENDA') unitario += Math.abs(prêmioProporcional);
        else unitario -= Math.abs(prêmioProporcional);
    });

    const precoMercado = Math.abs(unitario);
    const isDebito = unitario < 0; 
    const nPernas = est.pernas.length;
    const taxaEntrada = nPernas * 22.00;
    const taxaSaida = nPernas * 22.00;
    const cicloTotal = taxaEntrada + taxaSaida;
    const financeiroMontagem = (unitario * loteAtual) - taxaEntrada;

    const strikes = est.pernas.map(p => p.derivative.strike);
    const largura = Math.max(...strikes) - Math.min(...strikes);
    
    let lucroMaximo = 0;
    let riscoTotal = 0;

    // Identifica se é uma estratégia "Descoberta" (sem trava de proteção)
    const temCompra = est.pernas.some(p => p.direction === 'COMPRA');

    if (isDebito) {
        riscoTotal = Math.abs(unitario * loteAtual) + taxaEntrada;
        lucroMaximo = (largura > 0) 
            ? (largura * loteAtual) - riscoTotal - taxaSaida 
            : (precoMercado * 3 * loteAtual) - cicloTotal;
    } else {
        lucroMaximo = (unitario * loteAtual) - taxaEntrada;
        
        if (!temCompra) {
            // SEGURANÇA: Para Vendas Descobertas (Strangle/Straddle), o risco é baseado na margem (ex: 20% do Spot)
            riscoTotal = (Number(preco) * 0.20) * loteAtual;
        } else {
            // Para Travas de Crédito, Iron Condors e Borboletas
            const riscoCalculado = (largura * loteAtual) - (unitario * loteAtual) + taxaEntrada;
            riscoTotal = Math.max(riscoCalculado, taxaEntrada);
        }
    }

    const riscoUnitario = riscoTotal / loteAtual;
    const valorFiltro = isDebito ? precoMercado : riscoUnitario;
    const respeitaFiltro = valorFiltro <= (Number(filtroRisco) || 0.30);
    const alvoBe = (precoMercado * loteAtual + (isDebito ? cicloTotal : -cicloTotal)) / loteAtual;

    return {
      precoMercado, isDebito, riscoTotal, lucroMaximo, financeiroMontagem,
      taxaEntrada, taxaSaida, cicloTotal, alvoBe, respeitaFiltro,
      roi: ((lucroMaximo / riscoTotal) * 100).toFixed(1) + '%'
    };
  };

  const analise = useMemo(() => {
    if (!selecionada) return null;
    return { ...calcularMetricas(selecionada, lote), lote };
  }, [selecionada, lote, filtroRisco]);

  const listaOrdenada = useMemo(() => {
    return [...estrategias].sort((a, b) => {
        const mA = calcularMetricas(a, lote);
        const mB = calcularMetricas(b, lote);
        return parseFloat(mB?.roi || '0') - parseFloat(mA?.roi || '0');
    });
  }, [estrategias, lote, filtroRisco]);

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>TRADING BOARD <span style={{ color: '#38bdf8' }}>PRO</span></h1>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={inputGroup}><label style={labelStyle}>ATIVO</label><input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} style={inputStyle} /></div>
          <div style={inputGroup}><label style={labelStyle}>SPOT</label><input type="number" value={preco} onChange={e => setPreco(e.target.value)} style={inputStyle} /></div>
          <div style={inputGroup}><label style={labelStyle}>LOTE</label><input type="number" value={lote} onChange={e => setLote(Number(e.target.value))} style={inputStyle} /></div>
          <div style={inputGroup}><label style={{...labelStyle, color: '#38bdf8'}}>FILTRO RISCO</label><input value={filtroRisco} onChange={e => setFiltroRisco(e.target.value)} style={{...inputStyle, borderColor: '#38bdf8'}} /></div>
          <button onClick={buscarEstrategias} style={btnEscanear}>{loading ? '...' : 'EXECUTAR SCANNER'}</button>
        </div>
      </div>

      {selecionada && analise && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '25px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={terminalCard}>
              <div style={terminalHeader}>
                <div>
                  <h2 style={{ margin: 0, color: '#fff' }}>{selecionada.name}</h2>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>VENCIMENTO: {selecionada.expiration}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={typeBadge(analise.isDebito)}>{analise.isDebito ? 'DÉBITO' : 'CRÉDITO'} | ROI: {analise.roi}</div>
                  <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: 'bold', color: analise.respeitaFiltro ? '#4ade80' : '#f87171' }}>
                    {analise.respeitaFiltro ? '● DENTRO DO FILTRO' : '● FORA DO FILTRO (ALTO RISCO)'}
                  </div>
                </div>
              </div>

              <div style={infoBoxFull}>
                <div style={infoTitle}>FLUXO DE CAIXA ({selecionada.pernas.length} PERNAS)</div>
                <div style={infoRow}>
                  <span>Entrada: <b style={red}>R$ {analise.taxaEntrada.toFixed(2)}</b></span>
                  <span>Ciclo Total Taxas: <b style={red}>R$ {analise.cicloTotal.toFixed(2)}</b></span>
                  <span>Montagem Líquida: <b style={{color: analise.financeiroMontagem > 0 ? '#4ade80' : '#f87171'}}>R$ {analise.financeiroMontagem.toFixed(2)}</b></span>
                </div>
              </div>

              <table style={terminalTable}>
                <thead>
                  <tr><th>LADO</th><th>TICKER</th><th>STRIKE</th><th>PRÊMIO</th><th>QTD</th></tr>
                </thead>
                <tbody>
                  {selecionada.pernas.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ color: p.direction === 'COMPRA' ? '#4ade80' : '#f87171', padding: '12px 0', fontWeight: 'bold' }}>[{p.direction[0]}] {p.derivative.tipo}</td>
                      <td style={{ color: '#fff' }}>{p.derivative.option_ticker}</td>
                      <td>{p.derivative.strike.toFixed(2)}</td>
                      <td>R$ {(p.derivative.premio > 50 ? p.derivative.premio / 100 : p.derivative.premio).toFixed(2)}</td>
                      <td style={{ color: '#fff' }}>{Math.abs(p.multiplier) * lote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={footerMetrics}>
                <div style={metricItem}><small style={mLabel}>LUCRO ESTIMADO</small><span style={greenVal}>R$ {analise.lucroMaximo.toFixed(2)}</span></div>
                <div style={metricItem}><small style={mLabel}>RISCO REAL CALCULADO</small><span style={redVal}>R$ {analise.riscoTotal.toFixed(2)}</span></div>
                <div style={metricItem}><small style={mLabel}>RISCO UNITÁRIO</small><span style={{color: analise.respeitaFiltro ? '#4ade80' : '#f87171', fontSize: '20px', fontWeight: 'bold'}}>R$ {(analise.riscoTotal/lote).toFixed(2)}</span></div>
              </div>
            </div>
            <div style={chartContainer}><PayoffChart strategy={selecionada} lote={lote} taxasIdaVolta={analise.cicloTotal} /></div>
          </div>

          <div style={sidebarStyle}>
            <div style={sidebarHeader}>RANKING POR ROI REAL</div>
            <div style={{ padding: '10px', overflowY: 'auto', maxHeight: '80vh' }}>
              {listaOrdenada.map((est, idx) => {
                const m = calcularMetricas(est, lote);
                if (!m) return null;
                return (
                  <div key={idx} onClick={() => setSelecionada(est)} style={estCard(selecionada.name === est.name)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{est.name}</span>
                      <span style={{ color: m.respeitaFiltro ? '#4ade80' : '#f87171' }}>{m.roi}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>Risco: R$ {(m.riscoTotal/lote).toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Estilos simplificados para scannability ---
const containerStyle = { padding: '30px', backgroundColor: '#0f172a', minHeight: '100vh', fontFamily: 'JetBrains Mono, monospace', color: '#e2e8f0' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', padding: '15px 30px', borderRadius: '12px', marginBottom: '25px', border: '1px solid #334155' };
const inputGroup = { display: 'flex', flexDirection: 'column' };
const labelStyle = { fontSize: '9px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '4px' };
const inputStyle = { background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '6px', width: '100px' };
const btnEscanear = { background: '#38bdf8', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' };
const terminalCard = { backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155', padding: '25px' };
const terminalHeader = { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '20px', marginBottom: '20px' };
const typeBadge = (isDebito: boolean) => ({ backgroundColor: isDebito ? '#450a0a' : '#064e3b', color: isDebito ? '#f87171' : '#4ade80', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' });
const infoBoxFull = { backgroundColor: '#0f172a', padding: '18px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '15px' };
const infoTitle = { fontSize: '10px', color: '#94a3b8', marginBottom: '8px' };
const infoRow = { display: 'flex', justifyContent: 'space-between', fontSize: '13px' };
const terminalTable = { width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '25px' };
const footerMetrics = { display: 'flex', justifyContent: 'space-between', backgroundColor: '#0f172a', padding: '20px', borderRadius: '12px' };
const metricItem = { display: 'flex', flexDirection: 'column' };
const mLabel = { fontSize: '9px', color: '#94a3b8' };
const greenVal = { color: '#4ade80', fontSize: '20px', fontWeight: 'bold' };
const redVal = { color: '#f87171', fontSize: '20px', fontWeight: 'bold' };
const red = { color: '#f87171' };
const sidebarStyle = { backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155' };
const sidebarHeader = { padding: '15px', borderBottom: '1px solid #334155', fontSize: '12px', color: '#38bdf8' };
const estCard = (active: boolean) => ({ padding: '15px', borderBottom: '1px solid #334155', cursor: 'pointer', backgroundColor: active ? '#334155' : 'transparent' });
const chartContainer = { backgroundColor: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid #334155' };

export default App;