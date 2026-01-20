import React, { useRef, useState, useMemo } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StrategyMetrics } from './interfaces/Types'; 
import { PayoffChart } from './components/PayoffChart';
import { MarketDataService } from './services/MarketDataService';

const marketService = new MarketDataService();

const App = () => {
  const [ticker, setTicker] = useState('PETR4');
  const [precoSlot, setPrecoSlot] = useState('0.00'); 
  const [lote, setLote] = useState(1000);
  const [taxaInformada, setTaxaInformada] = useState('0.00'); 
  const [riscoMaximo, setRiscoMaximo] = useState(1000); 
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [estrategias, setEstrategias] = useState<StrategyMetrics[]>([]);
  const [selecionada, setSelecionada] = useState<StrategyMetrics | null>(null);
  
  const chartRef = useRef<HTMLDivElement>(null);

  // --- LÓGICA DE MÉTRICAS AVANÇADAS ---
  const analiseAvancada = useMemo(() => {
    if (!selecionada) return null;
    const est = selecionada;
    const taxasTotais = est.pernas.length * (parseFloat(taxaInformada) || 0) * 2;
    
    let financeiroNet = 0;
    est.pernas.forEach(p => {
        const sinal = p.direction === 'VENDA' ? 1 : -1;
        financeiroNet += sinal * (p.derivative.premio || 0);
    });

    const custoEfetivo = (financeiroNet * lote) - (taxasTotais / 2);
    const lucroMax = parseFloat(est.exibir_lucro.replace(/[^0-9.-]+/g,"")) || 0;
    const breakEven = Math.abs(custoEfetivo / lote);

    return {
      isDebito: financeiroNet < 0,
      custoEfetivo,
      taxasTotais,
      lucroMax,
      roi: ((lucroMax / Math.abs(custoEfetivo)) * 100).toFixed(1) + '%',
      breakEven
    };
  }, [selecionada, lote, taxaInformada]);

  const buscarEstrategias = async () => {
    setLoading(true);
    try {
      const marketData = await marketService.getAssetPrice(ticker.trim().toUpperCase());
      
      // Se o precoSlot for 0.00, atualizamos com o valor de mercado real
      if (precoSlot === '0.00') {
        setPrecoSlot(marketData.price.toFixed(2));
      }
      setLastUpdate(marketData.updatedAt.toLocaleTimeString());

      const baseUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://calculadora-de-estrategias-de-derivativos.onrender.com';

      // Montagem da URL com todos os parâmetros quantitativos
      const url = `${baseUrl}/api/analise?ticker=${ticker.toUpperCase()}&lote=${lote}&risco=${riscoMaximo}&slot=${precoSlot}`;
      
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Erro na comunicação com o servidor.");

      const result = await resp.json();
      if (result.status === "success" && result.data.length > 0) {
        setEstrategias(result.data);
        setSelecionada(result.data[0]);
      } else {
        alert("Nenhuma oportunidade encontrada para os parâmetros informados.");
        setEstrategias([]);
        setSelecionada(null);
      }
    } catch (err) {
      console.error("❌ Falha no Scanner:", err);
      alert("ERRO DE CONEXÃO: Certifique-se que o BACKEND está rodando na porta 3001.");
    } finally {
      setLoading(false);
    }
  };

  const gerarPDF = async () => {
    if (!selecionada || !analiseAvancada) return;
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text(`Relatório de Estratégia: ${selecionada.name}`, 14, 25);
    doc.save(`Analise_${ticker}_${selecionada.name}.pdf`);
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '15px'}}>
          <h1 style={logoStyle}>TRADING BOARD <span style={{color:'#0ea5e9'}}>PRO V4.0</span></h1>
          <div style={badgeContainer}>
            {selecionada && <button onClick={gerarPDF} style={btnPdf}>EXPORTAR PDF</button>}
            <span style={liveBadge}>● SERVER 3001</span>
            <span style={priceBadge}>REF {ticker}: R$ {precoSlot}</span>
          </div>
        </div>

        <div style={controlGrid}>
          <div style={inputGroup}><label style={label}>ATIVO</label>
            <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} style={input} />
          </div>
          <div style={inputGroup}><label style={label}>VALOR SLOT (REF)</label>
            <input type="number" value={precoSlot} onChange={e => setPrecoSlot(e.target.value)} style={input} />
          </div>
          <div style={inputGroup}><label style={label}>LOTE</label>
            <input type="number" value={lote} onChange={e => setLote(Number(e.target.value))} style={input} />
          </div>
          <div style={inputGroup}><label style={label}>RISCO MÁX (R$)</label>
            <input type="number" value={riscoMaximo} onChange={e => setRiscoMaximo(Number(e.target.value))} style={{...input, color: '#f87171'}} />
          </div>
          <div style={inputGroup}><label style={label}>TAXA/PERNA</label>
            <input type="number" value={taxaInformada} onChange={e => setTaxaInformada(e.target.value)} style={input} />
          </div>
          <button onClick={buscarEstrategias} style={btnScan} disabled={loading}>
            {loading ? 'ANALISANDO MERCADO...' : 'EXECUTAR SCANNER QUANT'}
          </button>
        </div>
      </header>

      <main style={mainLayout}>
        <aside style={sidebar}>
          <div style={sidebarTitle}>SINAIS DE VOLATILIDADE</div>
          <div style={listScroll}>
            {estrategias.map((est, idx) => (
              <div key={idx} onClick={() => setSelecionada(est)} style={strategyCard(selecionada?.name === est.name)}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <span style={{fontWeight:'bold', fontSize:'13px'}}>{est.name}</span>
                  <span style={{color:'#4ade80', fontSize:'12px'}}>{est.exibir_roi}</span>
                </div>
                <div style={{fontSize:'10px', color:'#64748b', marginTop:'4px'}}>Risco Estimado: {est.exibir_risco}</div>
              </div>
            ))}
          </div>
        </aside>

        <section style={workspace}>
          {selecionada && analiseAvancada ? (
            <>
              <div style={metricsRow}>
                <div style={card}><small style={label}>LUCRO MÁXIMO</small><div style={{...val, color:'#4ade80'}}>R$ {analiseAvancada.lucroMax.toFixed(2)}</div></div>
                <div style={card}><small style={label}>CUSTO/CRÉDITO LÍQUIDO</small><div style={{...val, color: analiseAvancada.isDebito ? '#f87171' : '#4ade80'}}>R$ {Math.abs(analiseAvancada.custoEfetivo).toFixed(2)}</div></div>
                <div style={card}><small style={label}>PROJEÇÃO DE ROI</small><div style={{...val, color:'#0ea5e9'}}>{analiseAvancada.roi}</div></div>
                <div style={card}><small style={label}>PONTO DE EQUILÍBRIO</small><div style={val}>R$ {analiseAvancada.breakEven.toFixed(2)}</div></div>
              </div>

              <div style={detailGrid}>
                <div style={panel}>
                  <div style={panelHeader}>MODELAGEM DA ESTRUTURA</div>
                  <table style={table}>
                    <thead>
                      <tr><th style={th}>OPERAÇÃO</th><th style={th}>TIPO</th><th style={th}>TICKER</th><th style={th}>STRIKE</th><th style={th}>QUANT</th></tr>
                    </thead>
                    <tbody>
                      {selecionada.pernas.map((p:any, i:number) => (
                        <tr key={i} style={tr}>
                          <td style={{color: p.direction === 'COMPRA' ? '#4ade80' : '#f87171', fontWeight:'bold', padding:'12px'}}>{p.direction}</td>
                          <td>{p.derivative.tipo}</td>
                          <td style={{color:'#fff'}}>{p.derivative.option_ticker}</td>
                          <td>R$ {p.derivative.strike.toFixed(2)}</td>
                          <td>{Math.abs(p.multiplier) * lote}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={panel}>
                  <div style={panelHeader}>CURVA DE PAYOFF ESTIMADA</div>
                  <div ref={chartRef} style={{flex:1, padding:'15px', display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <PayoffChart strategy={selecionada} lote={lote} taxasIdaVolta={analiseAvancada.taxasTotais} />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={empty}>
               <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'40px', marginBottom:'10px'}}>📡</div>
                  Aguardando input do Scanner para processar dados do TiDB...
               </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

// --- DESIGN SYSTEM (CSS-IN-JS) ---
const containerStyle: React.CSSProperties = { backgroundColor: '#020617', minHeight: '100vh', color: '#f1f5f9', padding: '15px', fontFamily: '"JetBrains Mono", monospace' };
const headerStyle: React.CSSProperties = { backgroundColor: '#0f172a', padding: '20px', borderRadius: '10px', border: '1px solid #1e293b', marginBottom: '15px' };
const logoStyle: React.CSSProperties = { margin: 0, fontSize: '20px', fontWeight: '900', letterSpacing: '-1px' };
const badgeContainer: React.CSSProperties = { display: 'flex', gap: '10px', alignItems:'center' };
const liveBadge: React.CSSProperties = { backgroundColor: '#052e16', color: '#4ade80', padding: '5px 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 'bold' };
const priceBadge: React.CSSProperties = { backgroundColor: '#1e293b', color: '#38bdf8', padding: '5px 12px', borderRadius: '5px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #334155' };
const btnPdf: React.CSSProperties = { backgroundColor: '#334155', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight:'bold' };
const controlGrid: React.CSSProperties = { display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' };
const inputGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '5px' };
const label: React.CSSProperties = { fontSize: '10px', color: '#64748b', fontWeight: '800' };
const input: React.CSSProperties = { backgroundColor: '#020617', border: '1px solid #334155', color: '#fff', padding: '8px 12px', borderRadius: '5px', width: '130px', outline: 'none', fontWeight: 'bold' };
const btnScan: React.CSSProperties = { backgroundColor: '#0ea5e9', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '5px', fontWeight: '900', cursor: 'pointer', flexGrow: 1, textTransform:'uppercase' };
const mainLayout: React.CSSProperties = { display: 'flex', gap: '15px', height: 'calc(100vh - 200px)' };
const sidebar: React.CSSProperties = { width: '320px', backgroundColor: '#0f172a', borderRadius: '10px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column' };
const sidebarTitle: React.CSSProperties = { padding: '15px', fontSize: '11px', fontWeight: 'bold', borderBottom: '1px solid #1e293b', color: '#94a3b8', textTransform:'uppercase' };
const listScroll: React.CSSProperties = { overflowY: 'auto', flex: 1 };
const workspace: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' };
const metricsRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' };
const card: React.CSSProperties = { backgroundColor: '#0f172a', padding: '15px', borderRadius: '10px', border: '1px solid #1e293b' };
const val: React.CSSProperties = { fontSize: '24px', fontWeight: '900', marginTop: '5px' };
const detailGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '15px', flex: 1 };
const panel: React.CSSProperties = { backgroundColor: '#0f172a', borderRadius: '10px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const panelHeader: React.CSSProperties = { backgroundColor: '#1e293b', padding: '10px 15px', fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '12px' };
const th: React.CSSProperties = { textAlign: 'left', padding: '12px', color: '#475569', borderBottom: '1px solid #1e293b', fontSize:'11px' };
const tr: React.CSSProperties = { borderBottom: '1px solid #020617' };
const empty: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontWeight: 'bold', fontSize: '18px', backgroundColor:'#0f172a', borderRadius:'10px', border:'1px dashed #1e293b' };

const strategyCard = (active: boolean): React.CSSProperties => ({
  padding: '15px', borderBottom: '1px solid #1e293b', cursor: 'pointer',
  backgroundColor: active ? '#1e293b' : 'transparent',
  borderLeft: active ? '4px solid #0ea5e9' : '4px solid transparent',
  transition: '0.2s'
});

export default App;