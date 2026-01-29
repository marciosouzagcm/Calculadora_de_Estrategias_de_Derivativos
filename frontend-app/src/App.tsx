import React, { useMemo, useState } from 'react';
import { PayoffChart } from './components/PayoffChart';
import { StrategyMetrics } from './interfaces/Types';
import { MarketDataService } from './services/MarketDataService';
import { exportarPDF } from './services/pdfService';
import { ReportTemplate } from './components/ReportTemplate'; 
import { 
  FileDown, 
  BookOpen, 
  ShieldCheck, 
  Zap
} from 'lucide-react';

const marketService = new MarketDataService();
const LOGO_SRC = "/saiba-mais/Logo.png";

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
  const [ticker, setTicker] = useState('VALE3');
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
      return partes.length === 3 ? `${partes[2].slice(-2)}/${partes[1]}/${partes[0].slice(-2)}` : val;
    } catch { return '---'; }
  };

  const getManualDescription = (name: string) => {
    const n = name.toUpperCase();
    if (n.includes('BULL CALL')) return "Trava de Alta com Call: Estratégia de débito para cenários de alta moderada.";
    if (n.includes('BULL PUT')) return "Trava de Alta com Put: Estratégia de crédito que visa a retenção do prêmio.";
    if (n.includes('BEAR CALL')) return "Trava de Baixa com Call: Operação de crédito que se beneficia da queda ou lateralização.";
    if (n.includes('BEAR PUT')) return "Trava de Baixa com Put: Compra de proteção financiada pela venda de strike inferior.";
    return "Análise técnica institucional baseada em Black-Scholes processada pelo motor BoardPRO.";
  };

  const handleExportPDF = async () => {
    if (!selecionada) {
      alert("Selecione uma estratégia para exportar o relatório.");
      return;
    }
    // Pequeno log para debug interno
    console.log("Iniciando exportação para:", selecionada.name);
    const sucesso = await exportarPDF(selecionada.name || 'Estrategia_BoardPro');
    if (!sucesso) alert("Erro ao gerar PDF. Verifique o console.");
  };

  const calcularMetricasCompletas = (est: StrategyMetrics | null) => {
    if (!est || !est.pernas) return null;
    const nPernas = est.pernas.length;
    const taxasMontagem = nPernas * taxaPorPerna;
    const taxasTotais = taxasMontagem * 2; 
    const pRefAtivo = toNum(precoSlot);
    
    let fluxoCaixaUnit = 0;
    let strikes: number[] = [];
    let possuiVendaSeca = false;
    let dataDistorcido = false;

    est.pernas.forEach(p => {
      let prm = toNum(p.derivative?.premio || p.premio || 0);
      const strike = toNum(p.strike || p.derivative?.strike);
      if (prm >= pRefAtivo && pRefAtivo > 0) { dataDistorcido = true; prm = 0.01; }
      if (strike > 0) strikes.push(strike);
      const isCompra = (p.direction || '').toUpperCase() === 'COMPRA';
      fluxoCaixaUnit += isCompra ? -prm : prm;
      if (!isCompra) {
        const temProtecao = est.pernas?.some(prot => 
          (prot.direction || '').toUpperCase() === 'COMPRA' && 
          (prot.derivative?.tipo || prot.tipo) === (p.derivative?.tipo || p.tipo)
        );
        if (!temProtecao) possuiVendaSeca = true;
      }
    });

    const isCredito = fluxoCaixaUnit > 0;
    const premioAbsoluto = Math.abs(fluxoCaixaUnit);
    const taxasPorLoteUnit = taxasTotais / lote;
    const targetAjustado = isCredito ? (premioAbsoluto - taxasPorLoteUnit) : (premioAbsoluto + taxasPorLoteUnit);

    let riscoRealCalculado = 0;
    if (nPernas === 2 && strikes.length === 2 && !possuiVendaSeca) {
      const diffStrikes = Math.abs(strikes[0] - strikes[1]);
      riscoRealCalculado = isCredito ? (diffStrikes - premioAbsoluto) * lote : premioAbsoluto * lote;
    } else if (possuiVendaSeca) {
      riscoRealCalculado = Math.max((pRefAtivo * 0.20) * lote, (riscoMaximoInput * lote));
    } else {
      riscoRealCalculado = toNum(est.max_loss || est.risco_maximo) || (riscoMaximoInput * lote);
    }

    const capitalEmRiscoTotal = riscoRealCalculado + taxasMontagem;
    const lucroBrutoAPI = dataDistorcido ? 0 : toNum(est.max_profit || est.lucro_maximo || (isCredito ? premioAbsoluto * lote : 0));
    const resultadoLiquidoReal = lucroBrutoAPI - taxasTotais;
    const roiCalculado = capitalEmRiscoTotal > 0 ? (resultadoLiquidoReal / capitalEmRiscoTotal) * 100 : 0;
    
    return { 
      totalLiquido: resultadoLiquidoReal, 
      riscoReal: capitalEmRiscoTotal, 
      roi: roiCalculado, 
      ur: capitalEmRiscoTotal / lote, 
      target: Math.max(0, Math.floor(targetAjustado * 100) / 100), 
      taxas: taxasMontagem, 
      isCredito, 
      be: toNum(est.breakEvenPoints ? est.breakEvenPoints[0] : est.be),
      isDistorcido: dataDistorcido || roiCalculado > 1500 || resultadoLiquidoReal <= 0
    };
  };

  const selecionadaMetricas = useMemo(() => calcularMetricasCompletas(selecionada), [selecionada, taxaPorPerna, lote, riscoMaximoInput, precoSlot]);

  const buscarEstrategias = async () => {
    setLoading(true);
    try {
      const marketData = await marketService.getAssetPrice(ticker.toUpperCase());
      const pRef = precoSlot || marketData.price.toFixed(2);
      if (!precoSlot) setPrecoSlot(pRef);
      setLastUpdate(marketData.updatedAt.toLocaleTimeString());
      const limiteUR = toNum(riscoMaximoInput);
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:10000' : window.location.origin;
      const url = `${baseUrl}/api/analise?ticker=${ticker.toUpperCase()}&lote=${lote}&risco=${limiteUR * lote}&slot=${pRef}`;
      const resp = await fetch(url);
      const result = await resp.json();
      if (result.status === "success") {
        const filtradas = result.data.filter((est: any) => {
          const m = calcularMetricasCompletas(est);
          return m && m.totalLiquido > 0 && m.ur <= (limiteUR + 0.001) && !m.isDistorcido;
        });
        setEstrategias(filtradas);
        if (filtradas.length > 0) setSelecionada(filtradas[0]);
        else setSelecionada(null);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  return (
    <div style={containerStyle}>
      <style>{`
        .app-logo { height: 32px; width: auto; margin-right: 12px; filter: drop-shadow(0 0 8px rgba(14, 165, 233, 0.3)); }
        .btn-header-action { color: white; border: none; padding: 6px 14px; border-radius: 4px; font-weight: 800; cursor: pointer; font-size: 10px; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
        .btn-export-top { background-color: #16a34a; }
        .btn-export-top:hover { background-color: #15803d; transform: translateY(-1px); }
        .btn-header-action:disabled { background-color: #1e293b; color: #475569; cursor: not-allowed; transform: none; }
        .nav-doc-link { display: flex; align-items: center; gap: 5px; color: #94a3b8; font-size: 10px; text-decoration: none; font-weight: 600; padding: 5px 10px; border-radius: 4px; transition: all 0.2s; }
        .nav-doc-link:hover { color: #0ea5e9; background: rgba(14, 165, 233, 0.1); }
        .nav-divider { width: 1px; height: 16px; background: #334155; margin: 0 8px; }
      `}</style>

      {/* --- MOTOR DE PDF: Renderizado mas oculto para o usuário --- */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        zIndex: -9999, 
        visibility: 'hidden', 
        pointerEvents: 'none' 
      }}>
        {selecionada && selecionadaMetricas && (
          <div id="report-pdf-template" style={{ 
            width: '1200px', 
            backgroundColor: '#ffffff', 
            color: '#000000', 
            padding: '40px' 
          }}>
            <ReportTemplate 
              est={{
                ...selecionada,
                officialDescription: getManualDescription(selecionada.name)
              }} 
              metricas={selecionadaMetricas} 
              ticker={ticker} 
              spot={toNum(precoSlot)} 
              lote={lote} 
              logoUrl={LOGO_SRC}
            />
          </div>
        )}
      </div>

      <header style={headerStyle}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '18px', flexWrap: 'wrap', borderBottom: '1px solid #1e293b', paddingBottom: '12px'}}>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <img src={LOGO_SRC} alt="BoardPRO" className="app-logo" />
            <div>
              <h1 style={logoStyle}>TRADING BOARD PRO <span style={{color:'#0ea5e9', fontSize: '11px', opacity: 0.8}}>V2026.1</span></h1>
            </div>
            <div className="nav-divider"></div>
            <nav style={{display: 'flex', gap: '4px'}}>
              <a href="/saiba-mais/black-scholes-merton.html" target="_blank" className="nav-doc-link"><Zap size={12} /> MOTOR BSM</a>
              <a href="/saiba-mais/sistema-vigilante.html" target="_blank" className="nav-doc-link"><ShieldCheck size={12} /> VIGILANTE</a>
              <a href="/estrategias/estrategias.html" target="_blank" className="nav-doc-link"><BookOpen size={12} /> ESTRATÉGIAS</a>
            </nav>
          </div>
          
          <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
            <button onClick={handleExportPDF} className="btn-header-action btn-export-top" disabled={!selecionada}>
              <FileDown size={14} /> EXPORTAR PDF
            </button>
            <div style={badgeContainer}>
              <span style={liveBadge}>● LIVE: {lastUpdate || '--:--'}</span>
              <span style={priceBadge}>{ticker}: R$ {precoSlot || '---'}</span>
              <span style={{...priceBadge, borderColor:'#f87171'}}>LIMIT: R$ {toNum(riscoMaximoInput).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style={controlGrid}>
          <div style={inputGroup}><label style={label}>ATIVO</label><input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} style={input} /></div>
          <div style={inputGroup}><label style={label}>PREÇO REF</label><input type="number" step="0.01" value={precoSlot} onChange={e => setPrecoSlot(e.target.value)} style={input} /></div>
          <div style={inputGroup}><label style={label}>LOTE</label><input type="number" value={lote} onChange={e => setLote(Number(e.target.value))} style={input} /></div>
          <div style={inputGroup}><label style={label}>RISCO UNIT. (U.R)</label><input type="number" step="0.01" value={riscoMaximoInput} onChange={e => setRiscoMaximoInput(toNum(e.target.value))} style={{...input, color: '#f87171', borderColor: '#450a0a'}} /></div>
          <div style={inputGroup}><label style={label}>TAXA/PERNA</label><input type="number" value={taxaPorPerna} onChange={e => setTaxaPorPerna(Number(e.target.value))} style={{...input, color: '#fbbf24'}} /></div>
          <button onClick={buscarEstrategias} style={btnScan} disabled={loading}>
            {loading ? 'PROCESSANDO...' : 'EXECUTAR SCANNER'}
          </button>
        </div>
      </header>

      <main style={mainLayout}>
        <aside style={sidebar}>
          <div style={sidebarTitle}>OPORTUNIDADES IDENTIFICADAS ({estrategias.length})</div>
          <div style={listScroll}>
            {estrategias.map((est, idx) => {
              const m = calcularMetricasCompletas(est);
              return (
                <div key={idx} onClick={() => setSelecionada(est)} style={strategyCard(selecionada?.name === est.name)}>
                  <div style={{fontWeight:'800', fontSize:'11px', color: '#fff'}}>{est.name}</div>
                  <div style={{color:'#4ade80', fontSize:'14px', fontWeight:'900', margin: '4px 0'}}>R$ {m?.totalLiquido.toFixed(2)}</div>
                  <div style={{fontSize: '10px', color: '#94a3b8', marginBottom: '4px'}}>Risco Auditado: <span style={{color: '#f87171'}}>R$ {m?.riscoReal.toFixed(2)}</span></div>
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
                <div style={panelHeader}>COMPOSIÇÃO ESTRUTURAL DO SETUP</div>
                <div style={{flex: 1, overflow: 'auto'}}>
                  <table style={table}>
                    <thead>
                      <tr><th style={th}>LADO</th><th style={th}>TIPO</th><th style={th}>SÉRIE</th><th style={th}>STRIKE</th><th style={th}>PRÊMIO</th><th style={th}>VENC.</th><th style={th}>QTD</th></tr>
                    </thead>
                    <tbody>
                      {selecionada.pernas?.map((p, i) => (
                        <tr key={i} style={tr}>
                          <td style={{ color: (p.direction || p.direcao || '').toUpperCase() === 'COMPRA' ? '#4ade80' : '#f87171', padding: '10px', fontWeight: 'bold' }}>{p.direction || p.direcao}</td>
                          <td style={{ color: '#94a3b8' }}>{(p.derivative?.tipo || p.tipo || '').toUpperCase()}</td>
                          <td style={{ color: '#fff', fontWeight: 'bold' }}>{p.derivative?.symbol || p.symbol || p.option_ticker || '---'}</td>
                          <td style={{ color: '#fff' }}>R$ {toNum(p.strike || p.derivative?.strike).toFixed(2)}</td>
                          <td style={{ color: '#4ade80', fontWeight: 'bold' }}>R$ {toNum(p.premio || p.derivative?.premio).toFixed(2)}</td>
                          <td style={{ color: '#fbbf24' }}>{formatarData(p.vencimento || p.derivative?.vencimento || p.expiration)}</td>
                          <td style={{ color: '#fff' }}>{lote}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={statusFooter}>
                  <div style={{ display: 'flex', gap: '22px', flexWrap: 'wrap' }}>
                    <div style={footerBlock}><span style={label}>LUCRO LÍQUIDO</span><b style={{ color: '#4ade80' }}>R$ {selecionadaMetricas.totalLiquido.toFixed(2)}</b></div>
                    <div style={footerBlock}><span style={label}>RISCO REAL (AUDITADO)</span><b style={{ color: '#f87171' }}>R$ {selecionadaMetricas.riscoReal.toFixed(2)}</b></div>
                    <div style={footerBlock}><span style={label}>TARGET BREAKEVEN (UNIT)</span><b style={{ color: '#38bdf8' }}>R$ {selecionadaMetricas.target.toFixed(2)}</b></div>
                    <div style={footerBlock}><span style={label}>U.R. ATUAL</span><b style={{ color: '#fbbf24' }}>R$ {selecionadaMetricas.ur.toFixed(2)}</b></div>
                  </div>
                </div>
              </div>
              <div style={panel}>
                <div style={panelHeader}>MODELAGEM DE PAYOFF (VENCIMENTO)</div>
                <div style={{flex:1}}>
                  <PayoffChart 
                    strategy={selecionada} 
                    lote={lote} 
                    taxasIdaVolta={selecionadaMetricas.taxas * 2} 
                    isLightMode={false}
                  />
                </div>
              </div>
            </div>
          ) : <div style={empty}>REALIZE O SCANNER PARA AUDITORIA DE PREÇOS E RISCO.</div>}
        </section>
      </main>
    </div>
  );
};

// Estilos Preservados
const containerStyle: React.CSSProperties = { backgroundColor: '#020617', minHeight: '100vh', color: '#f1f5f9', padding: '15px', fontFamily: 'monospace' };
const headerStyle: React.CSSProperties = { backgroundColor: '#0f172a', padding: '12px 20px', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '15px' };
const logoStyle: React.CSSProperties = { margin: 0, fontSize: '16px', fontWeight: '900', letterSpacing: '-0.5px' };
const badgeContainer: React.CSSProperties = { display: 'flex', gap: '8px', flexWrap: 'wrap' };
const liveBadge: React.CSSProperties = { backgroundColor: '#064e3b', color: '#4ade80', padding: '4px 12px', borderRadius: '4px', fontSize: '10px', fontWeight:'bold' };
const priceBadge: React.CSSProperties = { backgroundColor: '#1e293b', color: '#38bdf8', padding: '4px 12px', borderRadius: '4px', fontSize: '10px', border: '1px solid #334155' };
const controlGrid: React.CSSProperties = { display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' };
const inputGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px' };
const label: React.CSSProperties = { fontSize: '9px', color: '#64748b', fontWeight: '800' };
const input: React.CSSProperties = { backgroundColor: '#020617', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', width: '85px', fontSize: '12px' };
const btnScan: React.CSSProperties = { backgroundColor: '#0ea5e9', color: '#fff', border: 'none', padding: '0 15px', borderRadius: '4px', fontWeight: '900', cursor: 'pointer', fontSize: '11px', height: '35px', transition: 'all 0.2s' };
const mainLayout: React.CSSProperties = { display: 'flex', gap: '15px', height: 'calc(100vh - 185px)' };
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
const empty: React.CSSProperties = { flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#1e293b', fontWeight:'bold', fontSize:'14px', letterSpacing:'2px' };
const roiBadge: React.CSSProperties = { backgroundColor: '#0ea5e9', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight:'bold' };
const riscoUnitBadge: React.CSSProperties = { backgroundColor: '#fbbf24', color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '800' };

export default App;