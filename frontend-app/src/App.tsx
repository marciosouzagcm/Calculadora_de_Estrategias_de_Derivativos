import React, { useMemo, useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StrategyMetrics } from './interfaces/Types'; 
import { PayoffChart } from './components/PayoffChart';
import { MarketDataService } from './services/MarketDataService';

const marketService = new MarketDataService();

const App = () => {
  // --- Estados ---
  const [ticker, setTicker] = useState('ABEV3');
  const [preco, setPreco] = useState('0.00');
  const [lote, setLote] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [estrategias, setEstrategias] = useState<StrategyMetrics[]>([]);
  const [selecionada, setSelecionada] = useState<any | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // --- Helpers de Formatação ---
  const formatarData = (dataStr: string | undefined) => 
    dataStr ? new Date(dataStr).toLocaleDateString('pt-BR') : 'N/A';

  // --- Ação Principal: Scanner ---
  const buscarEstrategias = async () => {
    setLoading(true);
    try {
      // 1. Busca Preço Real-Time do Ativo
      const marketData = await marketService.getAssetPrice(ticker.trim().toUpperCase());
      setPreco(marketData.price.toFixed(2));
      setLastUpdate(marketData.updatedAt.toLocaleTimeString());

      // 2. URL Dinâmica (Vercel ou Local)
      const baseUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://calculadora-de-estrategias-de-derivativos.vercel.app';

      // 3. Chamada para a API Unificada (TiDB Cloud + Análise)
      const resp = await fetch(`${baseUrl}/api/analise?ticker=${ticker.trim().toUpperCase()}&lote=${lote}`);
      const result = await resp.json();

      if (result.status === "success") {
        setEstrategias(result.data);
        setSelecionada(result.data[0] || null);
      } else {
        alert("Erro: " + result.message);
      }
    } catch (err) {
      console.error("[Scanner Error]:", err);
      alert("Falha na conexão com o servidor de dados.");
    } finally {
      setLoading(false);
    }
  };

  // --- Exportação de Relatório ---
  const gerarPDF = async () => {
    if (!selecionada) return;
    const doc = new jsPDF();
    
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("BOARDPRO ANALYTICS", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(56, 189, 248);
    doc.text(`ESTRATÉGIA: ${selecionada.name.toUpperCase()} | ATIVO: ${ticker}`, 14, 30);
    
    autoTable(doc, {
      startY: 45,
      head: [['LADO', 'TIPO', 'TICKER', 'STRIKE', 'PRÊMIO', 'QTD']],
      body: selecionada.pernas.map((p: any) => [
        p.direction, p.derivative.tipo, p.derivative.option_ticker,
        `R$ ${p.derivative.strike?.toFixed(2)}`,
        `R$ ${p.derivative.premio?.toFixed(2)}`,
        Math.abs(p.multiplier) * lote
      ]),
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] }
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("RESUMO FINANCEIRO", 14, finalY + 15);
    doc.setFontSize(10);
    doc.text(`Lucro Máximo: ${selecionada.exibir_lucro}`, 14, finalY + 25);
    doc.text(`Risco Máximo: ${selecionada.exibir_risco}`, 14, finalY + 32);
    doc.text(`Retorno (ROI): ${selecionada.exibir_roi}`, 14, finalY + 39);

    if (chartRef.current) {
        const canvas = await html2canvas(chartRef.current);
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', 14, finalY + 50, 180, 90);
    }

    doc.save(`BoardPro_${ticker}_${selecionada.name}.pdf`);
  };

  return (
    <div style={containerStyle}>
      {/* PAINEL DE CONTROLE */}
      <div style={headerStyle}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
            <h1 style={{ margin: 0, fontSize: '22px', letterSpacing: '1px' }}>
                TRADING BOARD <span style={{ color: '#38bdf8' }}>PRO</span>
            </h1>
            <div style={{display:'flex', gap: '15px', alignItems:'center'}}>
               {selecionada && <button onClick={gerarPDF} style={btnPDF}>GERAR PDF</button>}
               <span style={liveBadge}>LIVE: {lastUpdate || '--:--'}</span>
            </div>
        </div>
        
        <div style={headerInputs}>
          <div style={inputGroup}><label style={labelStyle}>ATIVO</label>
            <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} style={inputStyle} />
          </div>
          <div style={inputGroup}><label style={labelStyle}>SPOT</label>
            <input value={preco} disabled style={{...inputStyle, opacity: 0.6}} />
          </div>
          <div style={inputGroup}><label style={labelStyle}>LOTE</label>
            <input type="number" value={lote} onChange={e => setLote(Number(e.target.value))} style={inputStyle} />
          </div>
          <button onClick={buscarEstrategias} style={btnEscanear} disabled={loading}>
            {loading ? 'LENDO TiDB...' : 'SCANNER EM TEMPO REAL'}
          </button>
        </div>
      </div>

      {selecionada && (
        <div style={mainGrid}>
          {/* ÁREA ANALÍTICA */}
          <div style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={terminalCard}>
              <div style={terminalHeader}>
                <div>
                  <h2 style={{ margin: 0, color: '#f8f9fa' }}>{selecionada.name}</h2>
                  <div style={{display:'flex', gap: '8px', marginTop: '8px'}}>
                    <span style={statusBadge}>DADOS TI-DB CLOUD</span>
                    <span style={riscoBadge}>VENCIMENTO: {formatarData(selecionada.pernas[0]?.derivative.vencimento)}</span>
                  </div>
                </div>
                <div style={roiBadge}>{selecionada.exibir_roi} ROI</div>
              </div>

              <table style={terminalTable}>
                <thead>
                    <tr><th>LADO</th><th>TIPO</th><th>SÍMBOLO</th><th>STRIKE</th><th>PRÊMIO</th><th>QTD</th></tr>
                </thead>
                <tbody>
                  {selecionada.pernas.map((p: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ color: p.direction === 'COMPRA' ? '#4ade80' : '#f87171', padding: '12px 0' }}>{p.side_display}</td>
                      <td style={{color: '#38bdf8'}}>{p.derivative.tipo}</td>
                      <td style={{color: '#fff', fontWeight: 'bold'}}>{p.derivative.option_ticker}</td>
                      <td>{p.derivative.strike?.toFixed(2)}</td>
                      <td>{p.derivative.premio?.toFixed(2)}</td>
                      <td>{Math.abs(p.multiplier) * lote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={footerMetrics}>
                <div style={metricItem}><small style={metricLabel}>LUCRO MÁXIMO</small><span style={{color: '#4ade80', fontSize: '20px', fontWeight: 'bold'}}>{selecionada.exibir_lucro}</span></div>
                <div style={metricItem}><small style={metricLabel}>RISCO ESTIMADO</small><span style={{color: '#f87171', fontSize: '20px', fontWeight: 'bold'}}>{selecionada.exibir_risco}</span></div>
              </div>
            </div>

            <div ref={chartRef} style={chartContainer}>
                <h3 style={{marginTop: 0, fontSize: '14px', color: '#94a3b8'}}>PAYOFF NO VENCIMENTO (CUSTOS B3 INCLUSOS)</h3>
                <PayoffChart strategy={selecionada} lote={lote} taxasIdaVolta={0} />
            </div>
          </div>

          {/* SIDEBAR: OPORTUNIDADES DO SCANNER */}
          <div style={sidebarStyle}>
            <div style={sidebarHeader}>ESTRATÉGIAS ENCONTRADAS ({estrategias.length})</div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {estrategias.map((est, idx) => (
                <div key={idx} onClick={() => setSelecionada(est)} style={estCard(selecionada?.name === est.name)}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom: '8px'}}>
                    <span style={{fontWeight:'bold', fontSize:'12px', color: '#f1f5f9'}}>{est.name}</span>
                    <b style={{color: '#4ade80'}}>{est.exibir_roi}</b>
                  </div>
                  <div style={{fontSize: '10px', color: '#94a3b8'}}>Potencial: {est.exibir_lucro}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Estilos ---
const containerStyle: React.CSSProperties = { padding: '20px', backgroundColor: '#0f172a', minHeight: '100vh', fontFamily: 'Inter, sans-serif' };
const headerStyle: React.CSSProperties = { backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #334155' };
const headerInputs: React.CSSProperties = { display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' };
const inputGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '5px' };
const labelStyle: React.CSSProperties = { fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' };
const inputStyle: React.CSSProperties = { background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', width: '120px' };
const btnEscanear: React.CSSProperties = { background: '#38bdf8', color: '#0f172a', border: 'none', padding: '0 25px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', height: '42px' };
const btnPDF: React.CSSProperties = { background: 'transparent', color: '#38bdf8', border: '1px solid #38bdf8', padding: '6px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' };
const liveBadge: React.CSSProperties = { fontSize: '11px', color: '#4ade80', background: '#064e3b', padding: '4px 8px', borderRadius: '4px' };
const mainGrid: React.CSSProperties = { display: 'flex', gap: '20px' };
const terminalCard: React.CSSProperties = { backgroundColor: '#1e293b', borderRadius: '16px', padding: '25px', border: '1px solid #334155' };
const terminalHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' };
const statusBadge: React.CSSProperties = { fontSize: '9px', padding: '3px 8px', color: '#4ade80', border: '1px solid #4ade80', borderRadius: '4px' };
const riscoBadge: React.CSSProperties = { fontSize: '9px', padding: '3px 8px', color: '#fbbf24', border: '1px solid #fbbf24', borderRadius: '4px' };
const roiBadge: React.CSSProperties = { backgroundColor: '#064e3b', color: '#4ade80', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold' };
const terminalTable: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px', color: '#cbd5e1', marginBottom: '20px' };
const footerMetrics: React.CSSProperties = { display: 'flex', gap: '40px', backgroundColor: '#0f172a', padding: '20px', borderRadius: '12px' };
const metricItem: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const metricLabel: React.CSSProperties = { fontSize: '10px', color: '#94a3b8' };
const sidebarStyle: React.CSSProperties = { backgroundColor: '#1e293b', borderRadius: '16px', width: '300px', border: '1px solid #334155', height: '80vh', display: 'flex', flexDirection: 'column' };
const sidebarHeader: React.CSSProperties = { padding: '15px', background: '#334155', fontSize: '11px', color: '#38bdf8', borderRadius: '16px 16px 0 0' };
const estCard = (act: boolean): React.CSSProperties => ({ padding: '15px', borderBottom: '1px solid #334155', cursor: 'pointer', background: act ? '#2d3748' : 'transparent', borderLeft: act ? '4px solid #38bdf8' : '4px solid transparent' });
const chartContainer: React.CSSProperties = { backgroundColor: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155' };

export default App;