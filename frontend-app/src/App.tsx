import React, { useMemo, useState } from 'react';
import { PayoffChart } from './components/PayoffChart';
import { StrategyMetrics } from './interfaces/Types';
import { MarketDataService } from './services/MarketDataService';

const marketService = new MarketDataService();

const strategyCard = (active: boolean): React.CSSProperties => ({
  padding: '12px',
  borderBottom: '1px solid #1e293b',
  cursor: 'pointer',
  backgroundColor: active ? '#1e293b' : 'transparent',
  borderLeft: active ? '4px solid #0ea5e9' : '4px solid transparent',
  transition: 'all 0.2s ease-in-out',
  display: 'flex',
  flexDirection: 'column'
});

const App: React.FC = () => {
  const [ticker, setTicker] = useState('WEGE3');
  const [precoSlot, setPrecoSlot] = useState(''); 
  const [lote, setLote] = useState(1000);
  const [riscoMaximoInput, setRiscoMaximoInput] = useState(0.70); 
  const [taxaPorPerna, setTaxaPorPerna] = useState(22.00); 
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [estrategias, setEstrategias] = useState<StrategyMetrics[]>([]);
  const [selecionada, setSelecionada] = useState<StrategyMetrics | null>(null);

  const toNum = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    const n = parseFloat(String(val).replace(',', '.').replace(/[^\d.-]/g, ''));
    return isNaN(n) ? 0 : n;
  };

  const formatarData = (val: any) => {
    if (!val || val === '---') return '---';
    try {
      const dataStr = typeof val === 'string' ? val.split('T')[0] : val;
      const partes = dataStr.includes('-') ? dataStr.split('-') : dataStr.split('/');
      return partes.length === 3 ? `${partes[2].slice(-2)}/${partes[1]}/${partes[0].slice(-2)}` : '---';
    } catch { return '---'; }
  };

  const calcularMetricasCompletas = (est: StrategyMetrics | null) => {
    if (!est) return null;

    const nPernas = est.pernas?.length || 0;
    const taxasMontagem = nPernas * taxaPorPerna;
    const taxasDesmontagem = nPernas * taxaPorPerna;
    const taxasTotais = taxasMontagem + taxasDesmontagem;
    
    const fluxoMontagemUnit = est.pernas?.reduce((acc, p) => {
      const prm = toNum(p.derivative?.premio || p.premio || 0);
      return (p.direction || '').toUpperCase() === 'COMPRA' ? acc - prm : acc + prm;
    }, 0) || 0;

    const isCredito = fluxoMontagemUnit > 0;
    const premioAbsoluto = Math.abs(fluxoMontagemUnit);
    const custoTaxasUnit = taxasTotais / lote;

    const targetBruto = isCredito ? premioAbsoluto - custoTaxasUnit : premioAbsoluto + custoTaxasUnit;
    const targetFinal = Math.floor(targetBruto * 100) / 100;

    const lucroBrutoAPI = toNum(est.max_profit || est.lucro_maximo);
    const riscoBaseAPI = toNum(est.max_loss || est.risco_maximo);
    const capitalEmRiscoTotal = (riscoBaseAPI <= 0 ? (riscoMaximoInput * lote) : riscoBaseAPI) + taxasMontagem;
    
    const resultadoLiquidoReal = lucroBrutoAPI - taxasTotais;
    const roiReal = capitalEmRiscoTotal > 0 ? (resultadoLiquidoReal / capitalEmRiscoTotal) * 100 : 0;
    const beBase = toNum(est.breakEvenPoints ? est.breakEvenPoints[0] : est.be);

    return { 
      totalLiquido: resultadoLiquidoReal, 
      riscoReal: capitalEmRiscoTotal, 
      roi: roiReal, 
      ur: (capitalEmRiscoTotal / lote), 
      target: targetFinal, 
      taxas: taxasMontagem, 
      isCredito, 
      be: beBase 
    };
  };

  const selecionadaMetricas = useMemo(() => calcularMetricasCompletas(selecionada), [selecionada, taxaPorPerna, lote, riscoMaximoInput]);

  const buscarEstrategias = async () => {
    setLoading(true);
    try {
      const marketData = await marketService.getAssetPrice(ticker.toUpperCase());
      const pRef = precoSlot || marketData.price.toFixed(2);
      if (!precoSlot) setPrecoSlot(pRef);
      setLastUpdate(marketData.updatedAt.toLocaleTimeString());
      
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:10000' : window.location.origin;
      const url = `${baseUrl}/api/analise?ticker=${ticker.toUpperCase()}&lote=${lote}&risco=${riscoMaximoInput * lote}&slot=${pRef}`;
      
      const resp = await fetch(url);
      const result = await resp.json();
      if (result.status === "success") {
        const filtradas = result.data.filter((est: any) => {
          const m = calcularMetricasCompletas(est);
          return m && m.totalLiquido > 0 && m.ur <= (riscoMaximoInput * 1.5);
        });
        setEstrategias(filtradas);
        if (filtradas.length > 0) setSelecionada(filtradas[0]);
        else setSelecionada(null);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const exportarPDF = () => window.print();

  return (
    <div style={containerStyle}>
      {/* Estilo para Impressão */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          header, aside { display: none !important; }
          main { display: block !important; height: auto !important; }
          section { width: 100% !important; margin: 0 !important; }
        }
      `}</style>

      <header style={headerStyle} className="no-print">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '15px', flexWrap: 'wrap'}}>
          <h1 style={logoStyle}>TRADING BOARD PRO <span style={{color:'#0ea5e9'}}>V2026.1</span></h1>
          <div style={badgeContainer}>
            <span style={liveBadge}>● LIVE: {lastUpdate || '--:--'}</span>
            <span style={priceBadge}>{ticker}: R$ {precoSlot || '---'}</span>
            <span style={{...priceBadge, borderColor:'#f87171'}}>LIMIT: R$ {(riscoMaximoInput * lote).toFixed(2)}</span>
          </div>
        </div>

        <div style={controlGrid}>
          <div style={inputGroup}><label style={label}>ATIVO</label><input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} style={input} /></div>
          <div style={inputGroup}><label style={label}>PREÇO REF</label><input type="number" step="0.01" value={precoSlot} onChange={e => setPrecoSlot(e.target.value)} style={input} /></div>
          <div style={inputGroup}><label style={label}>LOTE</label><input type="number" value={lote} onChange={e => setLote(Number(e.target.value))} style={input} /></div>
          <div style={inputGroup}><label style={label}>RISCO UNIT.</label><input type="number" step="0.01" value={riscoMaximoInput} onChange={e => setRiscoMaximoInput(Number(e.target.value))} style={{...input, color: '#f87171'}} /></div>
          <div style={inputGroup}><label style={label}>TAXA/PERNA</label><input type="number" value={taxaPorPerna} onChange={e => setTaxaPorPerna(Number(e.target.value))} style={{...input, color: '#fbbf24'}} /></div>
          <button onClick={buscarEstrategias} style={btnScan} disabled={loading}>{loading ? '...' : 'SCAN'}</button>
        </div>
      </header>

      <main style={mainLayout}>
        <aside style={sidebar} className="no-print">
          <div style={sidebarTitle}>OPORTUNIDADES FILTRADAS ({estrategias.length})</div>
          <div style={listScroll}>
            {estrategias.map((est, idx) => {
              const m = calcularMetricasCompletas(est);
              return (
                <div key={idx} onClick={() => setSelecionada(est)} style={strategyCard(selecionada?.name === est.name)}>
                  <div style={{fontWeight:'800', fontSize:'11px', color: '#fff'}}>{est.name}</div>
                  <div style={{color:'#4ade80', fontSize:'14px', fontWeight:'900', margin: '4px 0'}}>R$ {toNum(est.max_profit || est.lucro_maximo).toFixed(2)}</div>
                  <div style={{fontSize: '10px', color: '#94a3b8', marginBottom: '4px'}}>✅ Risco Real: <span style={{color: '#f87171'}}>R$ {m?.riscoReal.toFixed(2)}</span></div>
                  <div style={{display: 'flex', gap: '5px'}}>
                    <div style={roiBadge}>ROI: {m?.roi.toFixed(1) || '0.0'}%</div>
                    <div style={riscoUnitBadge}>U.R: R$ {m?.ur.toFixed(2) || '0.00'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <section style={workspace}>
          {selecionada && selecionadaMetricas ? (
            <div style={detailGrid}>
              <div style={panel}>
                <div style={{...panelHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <span>COMPOSIÇÃO DETALHADA DO SETUP</span>
                  <button onClick={exportarPDF} style={btnPDF} className="no-print">EXPORTAR PDF</button>
                </div>
                <div style={{flex: 1, overflow: 'auto'}}>
                  <table style={table}>
                    <thead>
                      <tr><th style={th}>LADO</th><th style={th}>TIPO</th><th style={th}>SÉRIE</th><th style={th}>STRIKE</th><th style={th}>PRÊMIO</th><th style={th}>VENC.</th><th style={th}>QTD</th></tr>
                    </thead>
                    <tbody>
                      {selecionada.pernas?.map((p, i) => (
                        <tr key={i} style={tr}>
                          <td style={{ color: (p.direction || '').toUpperCase() === 'COMPRA' ? '#4ade80' : '#f87171', padding: '10px', fontWeight: 'bold' }}>{p.direction}</td>
                          <td style={{ color: '#94a3b8' }}>{(p.derivative?.tipo || p.tipo || '').toUpperCase()}</td>
                          <td style={{ color: '#fff', fontWeight: 'bold' }}>{p.ticker || p.option_ticker || '---'}</td>
                          <td style={{ color: '#fff' }}>R$ {toNum(p.strike).toFixed(2)}</td>
                          <td style={{ color: '#4ade80', fontWeight: 'bold' }}>R$ {toNum(p.premio).toFixed(2)}</td>
                          <td style={{ color: '#fbbf24' }}>{formatarData(p.vencimento)}</td>
                          <td style={{ color: '#fff' }}>{lote}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={statusFooter}>
                  <div style={{ display: 'flex', gap: '22px', flexWrap: 'wrap' }}>
                    <div style={footerBlock}>
                      <span style={label}>LUCRO LÍQUIDO</span>
                      <b style={{ color: '#4ade80' }}>R$ {selecionadaMetricas.totalLiquido.toFixed(2)}</b>
                    </div>
                    <div style={footerBlock}>
                      <span style={label}>RISCO (CAPITAL)</span>
                      <b style={{ color: '#f87171' }}>R$ {selecionadaMetricas.riscoReal.toFixed(2)}</b>
                    </div>
                    <div style={footerBlock}>
                      <span style={label}>TARGET (0x0)</span>
                      <b style={{ color: '#38bdf8' }}>R$ {selecionadaMetricas.target.toFixed(2)}</b>
                    </div>
                    <div style={footerBlock}>
                      <span style={label}>U.R.</span>
                      <b style={{ color: '#fbbf24' }}>R$ {selecionadaMetricas.ur.toFixed(2)}</b>
                    </div>
                  </div>
                </div>
              </div>
              <div style={panel} className="no-print">
                <div style={panelHeader}>CURVA DE PAYOFF (VENCIMENTO)</div>
                <div style={{flex:1}}><PayoffChart strategy={selecionada} lote={lote} taxasIdaVolta={selecionadaMetricas.taxas * 2} /></div>
              </div>
            </div>
          ) : <div style={empty}>REALIZE O SCANNER PARA VER DETALHES...</div>}
        </section>
      </main>
    </div>
  );
};

const containerStyle: React.CSSProperties = { backgroundColor: '#020617', minHeight: '100vh', color: '#f1f5f9', padding: '15px', fontFamily: 'monospace' };
const headerStyle: React.CSSProperties = { backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '15px' };
const logoStyle: React.CSSProperties = { margin: 0, fontSize: '18px', fontWeight: '900' };
const badgeContainer: React.CSSProperties = { display: 'flex', gap: '8px', flexWrap: 'wrap' };
const liveBadge: React.CSSProperties = { backgroundColor: '#064e3b', color: '#4ade80', padding: '4px 12px', borderRadius: '4px', fontSize: '10px', fontWeight:'bold' };
const priceBadge: React.CSSProperties = { backgroundColor: '#1e293b', color: '#38bdf8', padding: '4px 12px', borderRadius: '4px', fontSize: '10px', border: '1px solid #334155' };
const controlGrid: React.CSSProperties = { display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' };
const inputGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px' };
const label: React.CSSProperties = { fontSize: '9px', color: '#64748b', fontWeight: '800' };
const input: React.CSSProperties = { backgroundColor: '#020617', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', width: '85px', fontSize: '12px' };
const btnScan: React.CSSProperties = { backgroundColor: '#0ea5e9', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', fontWeight: '900', cursor: 'pointer', fontSize: '11px', height: '35px', minWidth: '60px' };
const btnPDF: React.CSSProperties = { backgroundColor: '#334155', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer' };
const mainLayout: React.CSSProperties = { display: 'flex', gap: '15px', height: 'calc(100vh - 200px)' };
const sidebar: React.CSSProperties = { width: '250px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', display:'flex', flexDirection:'column' };
const sidebarTitle: React.CSSProperties = { padding: '12px', fontSize: '10px', fontWeight: 'bold', color:'#64748b', borderBottom:'1px solid #1e293b' };
const listScroll: React.CSSProperties = { overflowY: 'auto', flex: 1 };
const workspace: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' };
const detailGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '15px', flex: 1 };
const panel: React.CSSProperties = { backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', display:'flex', flexDirection:'column' };
const panelHeader: React.CSSProperties = { backgroundColor: '#1e293b', padding: '10px', fontSize: '11px', fontWeight: 'bold', color:'#38bdf8' };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '11px' };
const th: React.CSSProperties = { textAlign: 'left', padding: '10px', color: '#475569', fontSize:'9px' };
const tr: React.CSSProperties = { borderBottom: '1px solid #1e293b' };
const statusFooter: React.CSSProperties = { padding:'12px 15px', backgroundColor:'#020617', borderTop:'1px solid #1e293b' };
const footerBlock: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const empty: React.CSSProperties = { flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#334155' };
const roiBadge: React.CSSProperties = { backgroundColor: '#0ea5e9', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight:'bold' };
const riscoUnitBadge: React.CSSProperties = { backgroundColor: '#fbbf24', color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '800' };

export default App;