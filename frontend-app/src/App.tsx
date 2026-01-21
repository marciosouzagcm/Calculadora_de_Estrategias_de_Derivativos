import React, { useMemo, useState } from 'react';
import { PayoffChart } from './components/PayoffChart';
import { StrategyMetrics } from './interfaces/Types';
import { MarketDataService } from './services/MarketDataService';

const marketService = new MarketDataService();

const App: React.FC = () => {
  const [ticker, setTicker] = useState('BOVA11');
  const [precoSlot, setPrecoSlot] = useState('120.00'); 
  const [lote, setLote] = useState(1000);
  const [riscoMaximoInput, setRiscoMaximoInput] = useState(3.00); 
  const [taxaPorPerna, setTaxaPorPerna] = useState(22.00); 
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [estrategias, setEstrategias] = useState<StrategyMetrics[]>([]);
  const [selecionada, setSelecionada] = useState<StrategyMetrics | null>(null);

  const riscoFinanceiroLimite = useMemo(() => riscoMaximoInput * lote, [riscoMaximoInput, lote]);

  // Cálculo de Taxas: Montagem (Ida) + Desmontagem (Volta)
  const taxasOperacionaisTotais = useMemo(() => {
    if (!selecionada || !selecionada.pernas) return 0;
    return (selecionada.pernas.length * taxaPorPerna) * 2; 
  }, [selecionada, taxaPorPerna]);

  // Target 0x0: Quanto a estrutura deve valer na saída para cobrir custos e taxas
  const targetZeroAZero = useMemo(() => {
    if (!selecionada) return 0;
    const custoBruto = selecionada.custo_inicial || selecionada.total_cost || "0";
    const custoFixo = Math.abs(typeof custoBruto === 'string' 
      ? parseFloat(custoBruto.replace(/[^\d,.-]/g, '').replace(',', '.')) 
      : custoBruto);
    
    const totalParaRecuperar = custoFixo + taxasOperacionaisTotais;
    return totalParaRecuperar / lote;
  }, [selecionada, taxasOperacionaisTotais, lote]);

  const buscarEstrategias = async () => {
    setLoading(true);
    try {
      const marketData = await marketService.getAssetPrice(ticker.trim().toUpperCase());
      const pSlot = (precoSlot === '0.00' || !precoSlot) ? marketData.price.toFixed(2) : precoSlot;
      setLastUpdate(marketData.updatedAt.toLocaleTimeString());

      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:10000' : window.location.origin;
      const url = `${baseUrl}/api/analise?ticker=${ticker.toUpperCase()}&lote=${lote}&risco=${riscoFinanceiroLimite}&slot=${pSlot}`;
      
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Falha na resposta do servidor");
      
      const result = await resp.json();
      
      if (result.status === "success" && result.data.length > 0) {
        setEstrategias(result.data);
        setSelecionada(result.data[0]);
      } else {
        alert("Nenhuma estratégia encontrada para os parâmetros atuais.");
        setEstrategias([]);
        setSelecionada(null);
      }
    } catch (err) {
      console.error("Erro na busca:", err);
      alert("Erro ao conectar com a API. Verifique se o backend está rodando.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '15px'}}>
          <h1 style={logoStyle}>BOARDPRO <span style={{color:'#0ea5e9'}}>V40.0</span></h1>
          <div style={badgeContainer}>
            <span style={liveBadge}>● LIVE: {lastUpdate || '--:--'}</span>
            <span style={priceBadge}>{ticker}: R$ {precoSlot}</span>
            <span style={{...priceBadge, borderColor:'#f87171'}}>LIMIT RISK: R$ {riscoFinanceiroLimite.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
          </div>
        </div>

        <div style={controlGrid}>
          <div style={inputGroup}><label style={label}>ATIVO</label>
            <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} style={input} />
          </div>
          <div style={inputGroup}><label style={label}>PREÇO REF</label>
            <input type="number" step="0.01" value={precoSlot} onChange={e => setPrecoSlot(e.target.value)} style={input} />
          </div>
          <div style={inputGroup}><label style={label}>LOTE</label>
            <input type="number" value={lote} onChange={e => setLote(Number(e.target.value))} style={input} />
          </div>
          <div style={inputGroup}><label style={label}>RISCO UNIT.</label>
            <input type="number" step="0.01" value={riscoMaximoInput} onChange={e => setRiscoMaximoInput(Number(e.target.value))} style={{...input, color: '#f87171'}} />
          </div>
          <div style={inputGroup}><label style={label}>TAXA/PERNA (R$)</label>
            <input type="number" step="1" value={taxaPorPerna} onChange={e => setTaxaPorPerna(Number(e.target.value))} style={{...input, color: '#fbbf24'}} />
          </div>
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
              const riscoRaw = est.exibir_risco || "0";
              const riscoNum = typeof riscoRaw === 'string' 
                ? parseFloat(riscoRaw.replace(/[^\d,]/g, '').replace(',', '.')) 
                : riscoRaw;
              const dentroDoRisco = riscoNum <= riscoFinanceiroLimite;
              
              return (
                <div key={idx} onClick={() => setSelecionada(est)} style={strategyCard(selecionada?.name === est.name, dentroDoRisco)}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                    <span style={{fontWeight:'bold', fontSize:'11px'}}>{est.name}</span>
                    <span style={{color:'#4ade80', fontSize:'11px'}}>{est.exibir_lucro}</span>
                  </div>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:'10px'}}>
                    <span style={{color: dentroDoRisco ? '#94a3b8' : '#f87171'}}>
                        {dentroDoRisco ? '✅' : '⚠️'} Risco: {est.exibir_risco}
                    </span>
                    <span style={{color:'#0ea5e9'}}>ROI: {est.exibir_roi}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <section style={workspace}>
          {selecionada ? (
            <>
              <div style={metricsRow}>
                <div style={card}><small style={label}>LUCRO LÍQUIDO</small><div style={{...val, color:'#4ade80'}}>{selecionada.exibir_lucro}</div></div>
                <div style={card}><small style={label}>RISCO TOTAL</small><div style={{...val, color: '#f87171'}}>{selecionada.exibir_risco}</div></div>
                <div style={card}><small style={label}>TARGET (SAÍDA 0x0)</small><div style={{...val, color:'#fbbf24'}}>R$ {targetZeroAZero.toFixed(2)}</div></div>
                <div style={card}><small style={label}>TAXAS IDA/VOLTA</small><div style={{...val, color:'#94a3b8'}}>R$ {taxasOperacionaisTotais.toFixed(2)}</div></div>
              </div>

              <div style={detailGrid}>
                <div style={panel}>
                  <div style={panelHeader}>COMPOSIÇÃO DETALHADA DO SETUP</div>
                  <div style={{flex: 1, overflow: 'auto'}}>
                    <table style={table}>
                        <thead>
                        <tr>
                            <th style={th}>LADO</th>
                            <th style={th}>TIPO</th>
                            <th style={th}>SÉRIE</th>
                            <th style={th}>STRIKE</th>
                            <th style={th}>VENC.</th>
                            <th style={th}>QTD</th>
                        </tr>
                        </thead>
                        <tbody>
                        {selecionada.pernas?.map((p, i) => {
                            const serie = p.derivative?.option_ticker || p.derivative?.ticker || '---';
                            const tipo = p.derivative?.tipo || p.derivative?.type || '---';
                            const strike = p.derivative?.strike || p.derivative?.strike_price || 0;
                            const vencimento = p.derivative?.expiry_date || p.derivative?.expiration || null;

                            return (
                                <tr key={i} style={tr}>
                                    <td style={{ color: p.direction === 'COMPRA' ? '#4ade80' : '#f87171', padding: '12px', fontWeight: '800' }}>
                                        {p.direction}
                                    </td>
                                    <td style={{ color: '#94a3b8' }}>{tipo}</td>
                                    <td style={{ color: '#fff', fontWeight: 'bold' }}>{serie}</td>
                                    <td style={{ color: '#fff' }}>R$ {Number(strike).toFixed(2)}</td>
                                    <td style={{ color: '#94a3b8' }}>
                                        {vencimento ? new Date(vencimento).toLocaleDateString('pt-BR') : '---'}
                                    </td>
                                    <td style={{ color: '#fff' }}>{lote}</td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                  </div>
                  <div style={statusFooter}>
                     <div style={{display:'flex', gap:'20px'}}>
                        <span>NATUREZA: <b style={{color:'#0ea5e9'}}>{selecionada.natureza || (parseFloat(selecionada.custo_inicial || "0") < 0 ? 'DÉBITO' : 'CRÉDITO')}</b></span>
                        <span>CUSTO INICIAL: <b style={{color:'#fff'}}>{selecionada.custo_inicial || `R$ ${selecionada.total_cost?.toFixed(2)}`}</b></span>
                     </div>
                     <span>BE: <b style={{color:'#fbbf24'}}>R$ {selecionada.breakEvenPoints?.[0]?.toFixed(2) || '---'}</b></span>
                  </div>
                </div>

                <div style={panel}>
                    <div style={panelHeader}>CURVA DE PAYOFF (VENCIMENTO)</div>
                    <div style={{flex:1, padding:'10px'}}>
                       <PayoffChart strategy={selecionada} lote={lote} taxasIdaVolta={taxasOperacionaisTotais} />
                    </div>
                </div>
              </div>
            </>
          ) : (
            <div style={empty}>
                {loading ? 'CARREGANDO DADOS DO MERCADO...' : 'EXECUTAR SCANNER PARA VER DETALHES'}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

// --- ESTILOS (Mantidos conforme original) ---
const containerStyle: React.CSSProperties = { backgroundColor: '#020617', minHeight: '100vh', color: '#f1f5f9', padding: '15px', fontFamily: 'JetBrains Mono, monospace' };
const headerStyle: React.CSSProperties = { backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '15px' };
const logoStyle: React.CSSProperties = { margin: 0, fontSize: '18px', fontWeight: '900' };
const badgeContainer: React.CSSProperties = { display: 'flex', gap: '8px' };
const liveBadge: React.CSSProperties = { backgroundColor: '#064e3b', color: '#4ade80', padding: '4px 12px', borderRadius: '4px', fontSize: '10px', fontWeight:'bold' };
const priceBadge: React.CSSProperties = { backgroundColor: '#1e293b', color: '#38bdf8', padding: '4px 12px', borderRadius: '4px', fontSize: '10px', border: '1px solid #334155', fontWeight:'bold' };
const controlGrid: React.CSSProperties = { display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' };
const inputGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px' };
const label: React.CSSProperties = { fontSize: '9px', color: '#64748b', fontWeight: '800' };
const input: React.CSSProperties = { backgroundColor: '#020617', border: '1px solid #334155', color: '#fff', padding: '8px 12px', borderRadius: '4px', width: '105px', outline: 'none', fontSize: '12px' };
const btnScan: React.CSSProperties = { backgroundColor: '#0ea5e9', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', fontWeight: '900', cursor: 'pointer', fontSize: '11px' };
const mainLayout: React.CSSProperties = { display: 'flex', gap: '15px', height: 'calc(100vh - 180px)' };
const sidebar: React.CSSProperties = { width: '280px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', display:'flex', flexDirection:'column' };
const sidebarTitle: React.CSSProperties = { padding: '12px', fontSize: '10px', fontWeight: 'bold', borderBottom: '1px solid #1e293b', color:'#64748b' };
const listScroll: React.CSSProperties = { overflowY: 'auto', flex: 1 };
const workspace: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' };
const metricsRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' };
const card: React.CSSProperties = { backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #1e293b' };
const val: React.CSSProperties = { fontSize: '20px', fontWeight: '900', marginTop:'5px' };
const detailGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '15px', flex: 1 };
const panel: React.CSSProperties = { backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', overflow: 'hidden', display:'flex', flexDirection:'column' };
const panelHeader: React.CSSProperties = { backgroundColor: '#1e293b', padding: '10px 15px', fontSize: '11px', fontWeight: 'bold', color:'#38bdf8' };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '11px' };
const th: React.CSSProperties = { textAlign: 'left', padding: '12px', color: '#475569', borderBottom:'1px solid #1e293b', fontSize:'9px' };
const tr: React.CSSProperties = { borderBottom: '1px solid #1e293b' };
const statusFooter: React.CSSProperties = { padding:'12px 15px', backgroundColor:'#020617', borderTop:'1px solid #1e293b', display:'flex', justifyContent:'space-between', fontSize:'11px', color:'#64748b' };
const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontWeight:'bold', textAlign: 'center' };

const strategyCard = (active: boolean, dentroDoRisco: boolean): React.CSSProperties => ({
  padding: '12px 15px', borderBottom: '1px solid #1e293b', cursor: 'pointer',
  backgroundColor: active ? '#1e293b' : 'transparent',
  borderLeft: active ? '4px solid #0ea5e9' : '4px solid transparent',
  opacity: dentroDoRisco ? 1 : 0.6,
  transition: 'all 0.2s ease'
});

export default App;