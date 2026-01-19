import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StrategyMetrics } from './interfaces/Types'; 
import { PayoffChart } from './components/PayoffChart';
import { MarketDataService } from './services/MarketDataService';

const marketService = new MarketDataService();

/**
 * Componente Principal: TRADING BOARD PRO
 * Gerencia o estado das estratégias, busca de dados e renderização da interface.
 */
const App = () => {
  const [ticker, setTicker] = useState('ABEV3');
  const [preco, setPreco] = useState('0.00');
  const [lote, setLote] = useState(1000);
  const [taxas, setTaxas] = useState(0); 
  const [riscoDesejado, setRiscoDesejado] = useState(500); 
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [estrategias, setEstrategias] = useState<StrategyMetrics[]>([]);
  const [selecionada, setSelecionada] = useState<StrategyMetrics | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const formatarData = (dataStr: string | undefined) => 
    dataStr ? new Date(dataStr).toLocaleDateString('pt-BR') : 'N/A';

  /**
   * Executa a análise buscando o preço SPOT atual e as 
   * melhores estratégias calculadas pelo backend.
   */
  const buscarEstrategias = async () => {
    setLoading(true);
    try {
      // 1. Busca cotação (Com Fallback integrado no Service contra erro 500)
      const marketData = await marketService.getAssetPrice(ticker.trim().toUpperCase());
      setPreco(marketData.price.toFixed(2));
      setLastUpdate(marketData.updatedAt.toLocaleTimeString());

      // 2. Define URL do backend
      const baseUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://calculadora-de-estrategias-de-derivativos.vercel.app';

      // 3. Busca análise de opções no backend
      const resp = await fetch(
        `${baseUrl}/api/analise?ticker=${ticker.trim().toUpperCase()}&lote=${lote}&risco=${riscoDesejado}`
      );
      
      if (!resp.ok) throw new Error("Erro na resposta do servidor de estratégias.");
      
      const result = await resp.json();

      if (result.status === "success") {
        setEstrategias(result.data);
        setSelecionada(result.data[0] || null);
      } else {
        alert("Aviso do Scanner: " + result.message);
      }
    } catch (err: any) {
      console.error("[Scanner Error]:", err);
      alert("Falha ao processar dados. Verifique a conexão com o backend.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Exporta a análise atual para PDF
   */
  const gerarPDF = async () => {
    if (!selecionada) return;
    const doc = new jsPDF();
    
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("BOARDPRO ANALYTICS", 14, 25);
    
    autoTable(doc, {
      startY: 45,
      head: [['LADO', 'TIPO', 'TICKER', 'STRIKE', 'PRÊMIO', 'QTD']],
      body: selecionada.pernas.map((p: any) => [
        p.direction, 
        p.derivative.tipo, 
        p.derivative.option_ticker,
        `R$ ${p.derivative.strike?.toFixed(2)}`,
        `R$ ${p.derivative.premio?.toFixed(2)}`,
        Math.abs(p.multiplier) * lote
      ]),
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] }
    });

    if (chartRef.current) {
        const canvas = await html2canvas(chartRef.current);
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', 14, 120, 180, 90);
    }
    doc.save(`BoardPro_${ticker}_${selecionada.name}.pdf`);
  };

  return (
    <div style={containerStyle}>
      {/* SEÇÃO DE CONTROLES (HEADER) */}
      <div style={headerStyle}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
            <h1 style={{ margin: 0, fontSize: '22px', letterSpacing: '1px', color: '#fff' }}>
                TRADING BOARD <span style={{ color: '#38bdf8' }}>PRO</span>
            </h1>
            <div style={{display:'flex', gap: '15px', alignItems:'center'}}>
               {selecionada && <button onClick={gerarPDF} style={btnPDF}>EXPORTAR PDF</button>}
               <span style={liveBadge}>DATA: {lastUpdate || '--:--'}</span>
            </div>
        </div>
        
        <div style={headerInputs}>
          <div style={inputGroup}><label style={labelStyle}>ATIVO</label>
            <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} style={inputStyle} />
          </div>
          <div style={inputGroup}><label style={labelStyle}>SPOT (R$)</label>
            <input value={preco} disabled style={{...inputStyle, opacity: 0.6, cursor: 'not-allowed'}} />
          </div>
          <div style={inputGroup}><label style={labelStyle}>LOTE PADRÃO</label>
            <input type="number" value={lote} onChange={e => setLote(Number(e.target.value))} style={inputStyle} />
          </div>
          <div style={inputGroup}><label style={labelStyle}>TAXAS TOTAIS (R$)</label>
            <input type="number" value={taxas} onChange={e => setTaxas(Number(e.target.value))} style={inputStyle} />
          </div>
          <div style={inputGroup}><label style={labelStyle}>RISCO MÁX. (R$)</label>
            <input type="number" value={riscoDesejado} onChange={e => setRiscoDesejado(Number(e.target.value))} style={inputStyle} />
          </div>
          <button onClick={buscarEstrategias} style={btnEscanear} disabled={loading}>
            {loading ? 'ANALISANDO...' : 'SCANNER EM TEMPO REAL'}
          </button>
        </div>
      </div>

      {/* PAINEL DE RESULTADOS (GRID PRINCIPAL) */}
      {selecionada && (
        <div style={mainGrid}>
          {/* COLUNA ESQUERDA: DETALHES E GRÁFICO */}
          <div style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={terminalCard}>
              <div style={terminalHeader}>
                <div>
                  <h2 style={{ margin: 0, color: '#f8f9fa' }}>{selecionada.name}</h2>
                  <div style={{display:'flex', gap: '8px', marginTop: '8px'}}>
                    <span style={statusBadge}>CONEXÃO: TI-DB CLOUD</span>
                    <span style={riscoBadge}>EXPIRAÇÃO: {formatarData(selecionada.pernas[0]?.derivative.vencimento)}</span>
                  </div>
                </div>
                <div style={roiBadge}>{selecionada.exibir_roi} ROI</div>
              </div>

              <table style={terminalTable}>
                <thead>
                    <tr style={{textAlign: 'left', borderBottom: '1px solid #334155'}}>
                      <th style={{padding: '10px 0'}}>LADO</th><th>TIPO</th><th>SÍMBOLO</th><th>STRIKE</th><th>PRÊMIO</th><th>QTD</th>
                    </tr>
                </thead>
                <tbody>
                  {selecionada.pernas.map((p: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ color: p.direction === 'COMPRA' ? '#4ade80' : '#f87171', padding: '12px 0' }}>{p.direction}</td>
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
                <div style={metricItem}><small style={metricLabel}>POTENCIAL DE LUCRO</small><span style={{color: '#4ade80', fontSize: '20px', fontWeight: 'bold'}}>{selecionada.exibir_lucro}</span></div>
                <div style={metricItem}><small style={metricLabel}>RISCO DA ESTRATÉGIA</small><span style={{color: '#f87171', fontSize: '20px', fontWeight: 'bold'}}>{selecionada.exibir_risco}</span></div>
              </div>
            </div>

            <div ref={chartRef} style={chartContainer}>
                <h3 style={{marginTop: 0, fontSize: '14px', color: '#94a3b8', borderLeft: '3px solid #38bdf8', paddingLeft: '10px'}}>PAYOFF ESTIMADO NO VENCIMENTO</h3>
                <PayoffChart strategy={selecionada} lote={lote} taxasIdaVolta={taxas} />
            </div>
          </div>

          {/* COLUNA DIREITA: LISTA DE ALTERNATIVAS */}
          <div style={sidebarStyle}>
            <div style={sidebarHeader}>ESTRATÉGIAS FILTRADAS ({estrategias.length})</div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {estrategias.map((est, idx) => (
                <div key={idx} onClick={() => setSelecionada(est)} style={estCard(selecionada?.name === est.name)}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom: '8px'}}>
                    <span style={{fontWeight:'bold', fontSize:'12px', color: '#f1f5f9'}}>{est.name}</span>
                    <b style={{color: '#4ade80'}}>{est.exibir_roi}</b>
                  </div>
                  <div style={{fontSize: '10px', color: '#94a3b8'}}>Lucro: {est.exibir_lucro} | Risco: {est.exibir_risco}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Estilos BOARDPRO ---
const containerStyle: React.CSSProperties = { padding: '20px', backgroundColor: '#0f172a', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: '#fff' };
const headerStyle: React.CSSProperties = { backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #334155' };
const headerInputs: React.CSSProperties = { display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' };
const inputGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '5px' };
const labelStyle: React.CSSProperties = { fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' };
const inputStyle: React.CSSProperties = { background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', width: '120px', outline: 'none' };
const btnEscanear: React.CSSProperties = { background: '#38bdf8', color: '#0f172a', border: 'none', padding: '0 25px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', height: '42px' };
const btnPDF: React.CSSProperties = { background: 'transparent', color: '#38bdf8', border: '1px solid #38bdf8', padding: '6px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' };
const liveBadge: React.CSSProperties = { fontSize: '11px', color: '#4ade80', background: '#064e3b', padding: '4px 10px', borderRadius: '4px' };
const mainGrid: React.CSSProperties = { display: 'flex', gap: '20px', alignItems: 'flex-start' };
const terminalCard: React.CSSProperties = { backgroundColor: '#1e293b', borderRadius: '16px', padding: '25px', border: '1px solid #334155' };
const terminalHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' };
const statusBadge: React.CSSProperties = { fontSize: '9px', padding: '3px 8px', color: '#4ade80', border: '1px solid #4ade80', borderRadius: '4px' };
const riscoBadge: React.CSSProperties = { fontSize: '9px', padding: '3px 8px', color: '#fbbf24', border: '1px solid #fbbf24', borderRadius: '4px' };
const roiBadge: React.CSSProperties = { backgroundColor: '#064e3b', color: '#4ade80', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold' };
const terminalTable: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px', color: '#cbd5e1', marginBottom: '25px' };
const footerMetrics: React.CSSProperties = { display: 'flex', gap: '40px', backgroundColor: '#0f172a', padding: '20px', borderRadius: '12px' };
const metricItem: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const metricLabel: React.CSSProperties = { fontSize: '10px', color: '#94a3b8' };
const sidebarStyle: React.CSSProperties = { backgroundColor: '#1e293b', borderRadius: '16px', width: '320px', border: '1px solid #334155', height: '82vh', display: 'flex', flexDirection: 'column' };
const sidebarHeader: React.CSSProperties = { padding: '18px', background: '#334155', fontSize: '11px', color: '#38bdf8', borderRadius: '16px 16px 0 0', fontWeight: 'bold' };
const estCard = (act: boolean): React.CSSProperties => ({ padding: '15px', borderBottom: '1px solid #334155', cursor: 'pointer', background: act ? '#2d3748' : 'transparent', borderLeft: act ? '5px solid #38bdf8' : '5px solid transparent' });
const chartContainer: React.CSSProperties = { backgroundColor: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155' };

export default App;