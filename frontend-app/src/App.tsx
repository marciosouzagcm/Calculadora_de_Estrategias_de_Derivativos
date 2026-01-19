import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StrategyMetrics } from './interfaces/Types'; 
import { PayoffChart } from './components/PayoffChart';
import { MarketDataService } from './services/MarketDataService';

const marketService = new MarketDataService();

/**
 * BOARDPRO V40.0 - Componente Principal
 * Foco em Clean Code, Tipagem Estrita e Experiência de Terminal Financeiro.
 */
const App = () => {
  // Estados de Configuração e Input
  const [ticker, setTicker] = useState('ABEV3');
  const [preco, setPreco] = useState('0.00');
  const [lote, setLote] = useState(1000);
  const [taxas, setTaxas] = useState(0); 
  const [riscoDesejado, setRiscoDesejado] = useState(500); 
  
  // Estados de Controle de Dados
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [estrategias, setEstrategias] = useState<StrategyMetrics[]>([]);
  const [selecionada, setSelecionada] = useState<StrategyMetrics | null>(null);
  
  // Referência para exportação de imagem (Gráfico)
  const chartRef = useRef<HTMLDivElement>(null);

  /**
   * Helper: Formata datas vindas do backend para o padrão brasileiro.
   */
  const formatarData = (dataStr: string | undefined) => 
    dataStr ? new Date(dataStr).toLocaleDateString('pt-BR') : 'N/A';

  /**
   * ENGINE: Busca cotação SPOT e processa os 13 modelos matemáticos no backend.
   */
  const buscarEstrategias = async () => {
    setLoading(true);
    try {
      // 1. Obtenção de Preço (MarketDataService trata falhas via Fallback interno)
      const marketData = await marketService.getAssetPrice(ticker.trim().toUpperCase());
      setPreco(marketData.price.toFixed(2));
      setLastUpdate(marketData.updatedAt.toLocaleTimeString());

      // 2. Orquestração de Ambiente (Local vs Produção)
      const baseUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://calculadora-de-estrategias-de-derivativos.onrender.com';

      // 3. Request para o Strategy Engine
      const resp = await fetch(
        `${baseUrl}/api/analise?ticker=${ticker.trim().toUpperCase()}&lote=${lote}&risco=${riscoDesejado}`
      );
      
      if (!resp.ok) throw new Error("Falha na comunicação com o Strategy Engine.");
      
      const result = await resp.json();

      if (result.status === "success") {
        setEstrategias(result.data);
        setSelecionada(result.data[0] || null);
      } else {
        alert("BoardPro Info: " + result.message);
      }
    } catch (err: any) {
      console.error("[SCANNER_FATAL_ERROR]:", err);
      alert("Erro Crítico: Verifique se o servidor backend está ativo.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * PDF GENERATOR: Compila dados da estratégia e captura o canvas do PayoffChart.
   */
  const gerarPDF = async () => {
    if (!selecionada) return;
    const doc = new jsPDF();
    
    // Header Estilizado no PDF
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("BOARDPRO ANALYTICS REPORT", 14, 25);
    
    autoTable(doc, {
      startY: 45,
      head: [['OPERAÇÃO', 'TIPO', 'SÍMBOLO', 'STRIKE', 'PRÊMIO', 'QUANTIDADE']],
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
      {/* HEADER: CONFIGURAÇÃO DE SCANNER */}
      <header style={headerStyle}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#fff' }}>
                TRADING BOARD <span style={{ color: '#38bdf8' }}>PRO</span>
                <small style={{marginLeft: '10px', fontSize: '10px', color: '#64748b'}}>V40.0</small>
            </h1>
            <div style={{display:'flex', gap: '12px', alignItems:'center'}}>
               {selecionada && <button onClick={gerarPDF} style={btnPDF}>GERAR RELATÓRIO PDF</button>}
               <span style={liveBadge}>LIVE MARKET: {lastUpdate || '--:--'}</span>
            </div>
        </div>
        
        <div style={headerInputs}>
          <div style={inputGroup}><label style={labelStyle}>ATIVO</label>
            <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} style={inputStyle} placeholder="EX: PETR4" />
          </div>
          <div style={inputGroup}><label style={labelStyle}>PREÇO SPOT</label>
            <input value={preco} disabled style={{...inputStyle, opacity: 0.5, cursor: 'not-allowed', color: '#4ade80'}} />
          </div>
          <div style={inputGroup}><label style={labelStyle}>LOTE PADRÃO</label>
            <input type="number" value={lote} onChange={e => setLote(Number(e.target.value))} style={inputStyle} />
          </div>
          <div style={inputGroup}><label style={labelStyle}>TAXAS ESTIMADAS</label>
            <input type="number" value={taxas} onChange={e => setTaxas(Number(e.target.value))} style={inputStyle} />
          </div>
          <div style={inputGroup}><label style={labelStyle}>CAPITAL EM RISCO (R$)</label>
            <input type="number" value={riscoDesejado} onChange={e => setRiscoDesejado(Number(e.target.value))} style={inputStyle} />
          </div>
          <button onClick={buscarEstrategias} style={btnEscanear} disabled={loading}>
            {loading ? 'PROCESSANDO MODELOS...' : 'EXECUTAR SCANNER'}
          </button>
        </div>
      </header>

      {/* DASHBOARD GRID */}
      {selecionada && (
        <main style={mainGrid}>
          {/* PAINEL TÉCNICO DA ESTRATÉGIA */}
          <section style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={terminalCard}>
              <div style={terminalHeader}>
                <div>
                  <h2 style={{ margin: 0, color: '#fff', fontSize: '24px' }}>{selecionada.name}</h2>
                  <div style={{display:'flex', gap: '8px', marginTop: '10px'}}>
                    <span style={statusBadge}>MODELO MATEMÁTICO: ATIVO</span>
                    <span style={riscoBadge}>VENCIMENTO: {formatarData(selecionada.pernas[0]?.derivative.vencimento)}</span>
                  </div>
                </div>
                <div style={roiBadge}>{selecionada.exibir_roi} <small style={{fontSize: '10px', display: 'block'}}>ESTIMATED ROI</small></div>
              </div>

              {/* TABELA DE MONTAGEM DA OPERAÇÃO */}
              <table style={terminalTable}>
                <thead>
                    <tr style={{textAlign: 'left', borderBottom: '2px solid #334155', color: '#94a3b8', fontSize: '11px'}}>
                      <th style={{paddingBottom: '12px'}}>LADO</th>
                      <th>TIPO</th>
                      <th>SÍMBOLO</th>
                      <th>STRIKE</th>
                      <th>PRÊMIO</th>
                      <th>QUANTIDADE</th>
                    </tr>
                </thead>
                <tbody>
                  {selecionada.pernas.map((p: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ 
                        color: p.direction === 'COMPRA' ? '#4ade80' : '#f87171', 
                        padding: '14px 0', 
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}>
                        {p.direction}
                      </td>
                      <td style={{color: p.derivative.tipo === 'CALL' ? '#38bdf8' : '#fbbf24', fontWeight: '600'}}>
                        {p.derivative.tipo}
                      </td>
                      <td style={{color: '#fff', fontWeight: 'bold'}}>{p.derivative.option_ticker}</td>
                      <td style={{color: '#cbd5e1'}}>R$ {p.derivative.strike?.toFixed(2)}</td>
                      <td style={{color: '#cbd5e1'}}>R$ {p.derivative.premio?.toFixed(2)}</td>
                      <td style={{color: '#fff'}}>{Math.abs(p.multiplier) * lote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={footerMetrics}>
                <div style={metricItem}>
                    <small style={metricLabel}>LUCRO MÁXIMO LÍQUIDO</small>
                    <span style={{color: '#4ade80', fontSize: '22px', fontWeight: '900'}}>{selecionada.exibir_lucro}</span>
                </div>
                <div style={metricItem}>
                    <small style={metricLabel}>RISCO MÁXIMO DA ESTRATÉGIA</small>
                    <span style={{color: '#f87171', fontSize: '22px', fontWeight: '900'}}>{selecionada.exibir_risco}</span>
                </div>
              </div>
            </div>

            {/* PAYOFF VISUALIZATION */}
            <div ref={chartRef} style={chartContainer}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                    <h3 style={{margin: 0, fontSize: '13px', color: '#94a3b8', borderLeft: '3px solid #38bdf8', paddingLeft: '10px'}}>ANÁLISE DE PAYOFF NO VENCIMENTO</h3>
                    <span style={{fontSize: '10px', color: '#475569'}}>SPOT ATUAL: R$ {preco}</span>
                </div>
                <PayoffChart strategy={selecionada} lote={lote} taxasIdaVolta={taxas} />
            </div>
          </section>

          {/* SIDEBAR: LISTAGEM DE MODELOS FILTRADOS */}
          <aside style={sidebarStyle}>
            <div style={sidebarHeader}>
                MODELOS ANALISADOS: 13 
                <span style={{float: 'right', color: '#94a3b8'}}>FILTRADOS: {estrategias.length}</span>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {estrategias.map((est, idx) => (
                <div key={idx} onClick={() => setSelecionada(est)} style={estCard(selecionada?.name === est.name)}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom: '6px'}}>
                    <span style={{fontWeight:'700', fontSize:'12px', color: selecionada?.name === est.name ? '#38bdf8' : '#f1f5f9'}}>{est.name}</span>
                    <b style={{color: '#4ade80', fontSize: '12px'}}>{est.exibir_roi}</b>
                  </div>
                  <div style={{fontSize: '10px', color: '#64748b'}}>
                    LUCRO: <span style={{color: '#94a3b8'}}>{est.exibir_lucro}</span> | RISCO: <span style={{color: '#94a3b8'}}>{est.exibir_risco}</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </main>
      )}
    </div>
  );
};

// --- DESIGN SYSTEM (CSS-IN-JS) ---
const containerStyle: React.CSSProperties = { padding: '20px', backgroundColor: '#020617', minHeight: '100vh', fontFamily: '"Inter", system-ui, sans-serif', color: '#f1f5f9' };
const headerStyle: React.CSSProperties = { backgroundColor: '#0f172a', padding: '24px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #1e293b', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' };
const headerInputs: React.CSSProperties = { display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' };
const inputGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '6px' };
const labelStyle: React.CSSProperties = { fontSize: '9px', color: '#64748b', fontWeight: '800', letterSpacing: '0.05em' };
const inputStyle: React.CSSProperties = { background: '#020617', border: '1px solid #334155', color: '#fff', padding: '10px 14px', borderRadius: '6px', width: '130px', fontSize: '13px', outline: 'none' };
const btnEscanear: React.CSSProperties = { background: '#38bdf8', color: '#020617', border: 'none', padding: '0 28px', borderRadius: '6px', fontWeight: '800', cursor: 'pointer', height: '40px', fontSize: '12px', transition: 'all 0.2s' };
const btnPDF: React.CSSProperties = { background: 'transparent', color: '#38bdf8', border: '1px solid #38bdf8', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: '700' };
const liveBadge: React.CSSProperties = { fontSize: '10px', color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)', padding: '5px 12px', borderRadius: '20px', border: '1px solid rgba(74, 222, 128, 0.2)', fontWeight: '700' };
const mainGrid: React.CSSProperties = { display: 'flex', gap: '24px', alignItems: 'flex-start' };
const terminalCard: React.CSSProperties = { backgroundColor: '#0f172a', borderRadius: '12px', padding: '28px', border: '1px solid #1e293b' };
const terminalHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' };
const statusBadge: React.CSSProperties = { fontSize: '9px', padding: '4px 10px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '4px', fontWeight: '700' };
const riscoBadge: React.CSSProperties = { fontSize: '9px', padding: '4px 10px', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '4px', fontWeight: '700' };
const roiBadge: React.CSSProperties = { backgroundColor: '#064e3b', color: '#4ade80', padding: '12px 20px', borderRadius: '8px', fontWeight: '900', textAlign: 'center', fontSize: '18px', border: '1px solid #059669' };
const terminalTable: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '30px' };
const footerMetrics: React.CSSProperties = { display: 'flex', gap: '60px', backgroundColor: '#020617', padding: '24px', borderRadius: '12px', border: '1px solid #1e293b' };
const metricItem: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px' };
const metricLabel: React.CSSProperties = { fontSize: '9px', color: '#64748b', fontWeight: '800' };
const sidebarStyle: React.CSSProperties = { backgroundColor: '#0f172a', borderRadius: '12px', width: '340px', border: '1px solid #1e293b', maxHeight: '85vh', display: 'flex', flexDirection: 'column' };
const sidebarHeader: React.CSSProperties = { padding: '20px', background: '#1e293b', fontSize: '10px', color: '#38bdf8', borderRadius: '12px 12px 0 0', fontWeight: '800' };
const estCard = (act: boolean): React.CSSProperties => ({ padding: '18px', borderBottom: '1px solid #1e293b', cursor: 'pointer', background: act ? '#1e293b' : 'transparent', borderLeft: act ? '4px solid #38bdf8' : '4px solid transparent', transition: 'all 0.2s' });
const chartContainer: React.CSSProperties = { backgroundColor: '#0f172a', padding: '28px', borderRadius: '12px', border: '1px solid #1e293b' };

export default App;