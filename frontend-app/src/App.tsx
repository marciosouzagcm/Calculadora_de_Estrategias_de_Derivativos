import { useMemo, useState, useRef } from 'react';
import { PayoffChart } from './components/PayoffChart';
import { StrategyMetrics } from './interfaces/Types';
import { MarketDataService } from './services/MarketDataService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

const marketService = new MarketDataService();

const App = () => {
  // --- ESTADOS DA APLICAÇÃO ---
  const [ticker, setTicker] = useState('BBAS3');
  const [preco, setPreco] = useState('21.00');
  const [lote, setLote] = useState(1000); 
  const [filtroRisco, setFiltroRisco] = useState<string>('0.30'); 
  const [taxaInformada, setTaxaInformada] = useState<string>('22.00'); // AJUSTE PONTUAL: Nova taxa
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [estrategias, setEstrategias] = useState<StrategyMetrics[]>([]);
  const [selecionada, setSelecionada] = useState<StrategyMetrics | null>(null);
  
  const chartRef = useRef<HTMLDivElement>(null);

  // --- FORMATADORES E NORMALIZAÇÃO ---
  const formatarData = (dataStr: string | undefined) => {
    if (!dataStr) return 'N/A';
    return new Date(dataStr).toLocaleDateString('pt-BR');
  };

  const normalizar = (v: number) => (v > 50 ? v / 100 : v);

  // --- LÓGICA DE CÁLCULO E SCANNER ---
  const buscarEstrategias = async () => {
    setLoading(true);
    try {
      const data = await marketService.getAssetPrice(ticker.trim().toUpperCase());
      const precoVivo = data.price.toString();
      setPreco(precoVivo);
      setLastUpdate(data.updatedAt.toLocaleTimeString());

      const url = `http://localhost:3001/api/analise?ticker=${ticker.trim().toUpperCase()}&preco=${precoVivo}&risco_max=${filtroRisco}&t=${Date.now()}`;
      const resp = await fetch(url);
      const result = await resp.json();
      
      if (result.status === "success") {
        setEstrategias(result.data);
        const validas = result.data.filter((est: StrategyMetrics) => {
            const m = calcularMetricas(est, lote);
            return m && m.dentroDoFiltro;
        });
        setSelecionada(validas[0] || null);
      }
    } catch (err) {
      console.error("Erro no Scanner:", err);
    } finally {
      setLoading(false);
    }
  };

  const calcularMetricas = (est: StrategyMetrics, loteAtual: number) => {
    if (!est.pernas || est.pernas.length === 0) return null;
    let unitarioMontagem = 0;

    est.pernas.forEach(p => {
        const pUnit = normalizar(p.derivative.premio);
        unitarioMontagem += (p.direction === 'VENDA' ? 1 : -1) * Math.abs(pUnit * p.multiplier);
    });

    const nPernas = est.pernas.length;
    const custoTaxasPorPerna = parseFloat(taxaInformada) || 0;
    const taxasTotais = nPernas * custoTaxasPorPerna * 2; // Ida + Volta

    const premioAbs = Math.abs(unitarioMontagem);
    const dentroDoFiltro = premioAbs <= parseFloat(filtroRisco);
    
    // Custo entrada = Premio total + taxas de ida
    const custoEntrada = (premioAbs * loteAtual) + (taxasTotais / 2);
    // Saída zero = (Custo entrada + taxas de volta) / lote
    const valorSaidaZero = (custoEntrada + (taxasTotais / 2)) / loteAtual;

    const strikes = est.pernas.map(p => normalizar(p.derivative.strike)).sort((a, b) => a - b);
    const lucroBrutoTotal = (strikes[strikes.length - 1] - strikes[0]) * loteAtual;
    const lucroLiquido = lucroBrutoTotal - custoEntrada - (taxasTotais / 2);

    return {
      isDebito: unitarioMontagem < 0,
      premioUnitario: premioAbs,
      dentroDoFiltro,
      lucroMaximo: lucroLiquido,
      custoEfetivoEntrada: custoEntrada,
      taxasTotais: taxasTotais,
      instrucaoDesmonte: unitarioMontagem < 0 ? "VENDER" : "COMPRAR (RECOMPRA)",
      valorSaidaZeroaZero: valorSaidaZero,
      roi: ((lucroLiquido / custoEntrada) * 100).toFixed(1) + '%'
    };
  };

  const listaFiltrada = useMemo(() => {
    return estrategias
      .map(est => ({ est, metricas: calcularMetricas(est, lote) }))
      .filter(item => item.metricas && item.metricas.dentroDoFiltro)
      .sort((a, b) => parseFloat(b.metricas?.roi || '0') - parseFloat(a.metricas?.roi || '0'));
  }, [estrategias, lote, preco, filtroRisco, taxaInformada]);

  const analise = useMemo(() => {
    if (!selecionada) return null;
    return calcularMetricas(selecionada, lote);
  }, [selecionada, lote, preco, taxaInformada]);

  // --- FUNÇÃO PDF PROFISSIONAL ---
  const exportarPDF = async () => {
    if (!selecionada || !analise) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    const dataVenc = formatarData(selecionada.pernas[0]?.derivative.vencimento);
    const dataGeracao = new Date().toLocaleString('pt-BR');

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text("TRADING BOARD PRO", 14, 18);
    doc.setFontSize(9);
    doc.text(`RELATÓRIO TÉCNICO | GERADO EM: ${dataGeracao}`, 14, 26);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`ATIVO: ${ticker} | SPOT: R$ ${preco} | VENCIMENTO: ${dataVenc}`, 14, 45);

    const tableData = selecionada.pernas.map(p => [
      `${p.direction} ${p.derivative.tipo}`, 
      p.derivative.option_ticker,
      formatarData(p.derivative.vencimento),
      normalizar(p.derivative.strike).toFixed(2),
      normalizar(p.derivative.premio).toFixed(2),
      Math.abs(p.multiplier) * lote
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['LADO / TIPO', 'TICKER', 'VENCIMENTO', 'STRIKE', 'PRÊMIO', 'QTD']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], halign: 'center' },
      styles: { halign: 'center', fontSize: 9 }
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    // Ajuste PDF: Mostrar taxas pagas
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Custos Operacionais Previstos (Taxa/Perna R$ ${taxaInformada}): R$ ${analise.taxasTotais.toFixed(2)}`, 14, finalY + 6);

    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(251, 191, 36);
    doc.roundedRect(14, finalY + 10, 180, 22, 2, 2, 'FD');
    doc.setTextColor(180, 83, 9);
    doc.text("ESTRATÉGIA DE PROTEÇÃO (STOP BREAK-EVEN LÍQUIDO)", 18, finalY + 16);
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text(`${analise.instrucaoDesmonte} a trava por R$ ${analise.valorSaidaZeroaZero.toFixed(2)}`, 18, finalY + 24);

    if (chartRef.current) {
        doc.setFontSize(10);
        doc.text("PAYOFF ESTIMADO NO VENCIMENTO:", 14, finalY + 40);
        const canvas = await html2canvas(chartRef.current, { backgroundColor: '#1e293b', scale: 2 });
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', 14, finalY + 45, 180, 70);
    }

    const resY = finalY + 125;
    doc.setDrawColor(200);
    doc.line(14, resY, 194, resY);
    doc.setFontSize(9);
    doc.text("ROI LÍQUIDO", 14, resY + 8);
    doc.text("LUCRO LÍQUIDO", 80, resY + 8);
    doc.text("INVESTIMENTO + TAXAS", 150, resY + 8);
    doc.setFontSize(12);
    doc.text(analise.roi, 14, resY + 16);
    doc.text(`R$ ${analise.lucroMaximo.toFixed(2)}`, 80, resY + 16);
    doc.text(`R$ ${analise.custoEfetivoEntrada.toFixed(2)}`, 150, resY + 16);

    doc.save(`Trade_Report_${ticker}.pdf`);
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h1 style={{ margin: 0, fontSize: '20px' }}>TRADING BOARD <span style={{ color: '#38bdf8' }}>PRO</span></h1>
            <span style={{fontSize: '10px', color: '#4ade80'}}>LIVE SPOT: {lastUpdate}</span>
        </div>
        <div style={headerInputs}>
          <div style={inputGroup}><label style={labelStyle}>ATIVO</label><input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} style={inputStyle} /></div>
          <div style={inputGroup}><label style={labelStyle}>SPOT</label><input value={preco} onChange={e => setPreco(e.target.value)} style={{...inputStyle, color: '#4ade80'}} /></div>
          <div style={inputGroup}><label style={labelStyle}>LOTE</label><input type="number" value={lote} onChange={e => setLote(Number(e.target.value))} style={inputStyle} /></div>
          <div style={inputGroup}><label style={{...labelStyle, color: '#fbbf24'}}>RISCO MÁX</label><input value={filtroRisco} onChange={e => setFiltroRisco(e.target.value)} style={{...inputStyle, borderColor: '#fbbf24'}} /></div>
          {/* AJUSTE PONTUAL: Novo Input de Taxa */}
          <div style={inputGroup}><label style={{...labelStyle, color: '#a78bfa'}}>TAXA/PERNA</label><input value={taxaInformada} onChange={e => setTaxaInformada(e.target.value)} style={{...inputStyle, borderColor: '#a78bfa'}} /></div>
          
          <button onClick={buscarEstrategias} style={btnEscanear}>{loading ? '...' : 'EXECUTAR SCANNER'}</button>
          {analise && <button onClick={exportarPDF} style={btnPDF}>GERAR PDF</button>}
        </div>
      </div>

      {analise ? (
        <div style={mainGrid}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: '2' }}>
            <div style={terminalCard}>
              <div style={terminalHeader}>
                <div>
                  <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <h2 style={{ margin: 0, color: '#fff' }}>{selecionada?.name}</h2>
                    {analise.dentroDoFiltro && <span style={statusBadge}>● RISCO VALIDADO</span>}
                  </div>
                  <div style={{color: '#94a3b8', fontSize: '11px', marginTop: '4px'}}>Vencimento: {formatarData(selecionada?.pernas[0]?.derivative.vencimento)}</div>
                </div>
                <div style={typeBadge(analise.isDebito)}>{analise.roi} ROI</div>
              </div>

              <div style={exitPanel}>
                <div style={exitLabel}>STOP BREAK-EVEN (SAÍDA LÍQUIDA NO 0-0 INCL. TAXAS)</div>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px'}}>
                  <span style={actionBadge}>{analise.instrucaoDesmonte}</span>
                  <span style={priceTarget}>R$ {analise.valorSaidaZeroaZero.toFixed(2)}</span>
                </div>
              </div>

              <table style={terminalTable}>
                <thead><tr><th>LADO</th><th>TICKER</th><th>VENC.</th><th>STRIKE</th><th>PREMIO</th><th>QTD</th></tr></thead>
                <tbody>
                  {selecionada?.pernas.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ color: p.direction === 'COMPRA' ? '#4ade80' : '#f87171', padding: '10px 0' }}>[{p.direction[0]}] {p.derivative.tipo}</td>
                      <td style={{color: '#fff'}}>{p.derivative.option_ticker}</td>
                      <td style={{fontSize: '11px'}}>{formatarData(p.derivative.vencimento)}</td>
                      <td>{normalizar(p.derivative.strike).toFixed(2)}</td>
                      <td>{normalizar(p.derivative.premio).toFixed(2)}</td>
                      <td>{Math.abs(p.multiplier) * lote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={footerMetrics}>
                <div style={metricItem}><small style={metricLabel}>LUCRO LÍQUIDO</small><span style={{color: '#4ade80', fontSize: '18px', fontWeight: 'bold'}}>R$ {analise.lucroMaximo.toFixed(2)}</span></div>
                <div style={metricItem}><small style={metricLabel}>INVESTIMENTO + TAXAS</small><span style={{color: '#f87171', fontSize: '18px', fontWeight: 'bold'}}>R$ {analise.custoEfetivoEntrada.toFixed(2)}</span></div>
                <div style={metricItem}><small style={metricLabel}>TOTAL TAXAS</small><span style={{color: '#94a3b8', fontSize: '18px', fontWeight: 'bold'}}>R$ {analise.taxasTotais.toFixed(2)}</span></div>
              </div>
            </div>

            <div ref={chartRef} style={chartContainer}>
              <PayoffChart strategy={selecionada!} lote={lote} taxasIdaVolta={analise.taxasTotais} />
            </div>
          </div>

          <div style={sidebarStyle}>
            <div style={sidebarHeader}>DENTRO DO RISCO ({listaFiltrada.length})</div>
            {listaFiltrada.map((item, idx) => (
              <div key={idx} onClick={() => setSelecionada(item.est)} style={estCard(selecionada?.name === item.est.name)}>
                <div style={{display:'flex', justifyContent:'space-between'}}><span>{item.est.name}</span><b style={{color: '#4ade80'}}>{item.metricas?.roi}</b></div>
                <div style={{fontSize: '10px', color: '#94a3b8', marginTop: '4px'}}>Risco: R$ {item.metricas?.premioUnitario.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      ) : <div style={{textAlign:'center', padding:'100px', color:'#64748b'}}>Execute o scanner para carregar as operações.</div>}
    </div>
  );
};

// --- ESTILOS CSS-IN-JS (Inalterados) ---
const containerStyle: React.CSSProperties = { padding: '20px', backgroundColor: '#0f172a', minHeight: '100vh', fontFamily: 'JetBrains Mono, monospace', color: '#e2e8f0' };
const headerStyle: React.CSSProperties = { backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '15px', border: '1px solid #334155' };
const headerInputs: React.CSSProperties = { display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end', marginTop: '10px' };
const inputGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const labelStyle: React.CSSProperties = { fontSize: '10px', color: '#94a3b8', marginBottom: '5px' };
const inputStyle: React.CSSProperties = { background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '6px', width: '100px' };
const btnEscanear: React.CSSProperties = { background: '#38bdf8', color: '#0f172a', border: 'none', padding: '0 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', height: '38px' };
const btnPDF: React.CSSProperties = { background: '#ec4899', color: '#fff', border: 'none', padding: '0 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', height: '38px' };
const mainGrid: React.CSSProperties = { display: 'flex', gap: '20px' };
const sidebarStyle: React.CSSProperties = { backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', flex: '0.8', minWidth: '250px' };
const sidebarHeader: React.CSSProperties = { padding: '12px', background: '#334155', fontSize: '10px', fontWeight: 'bold', borderRadius: '12px 12px 0 0' };
const estCard = (active: boolean): React.CSSProperties => ({ padding: '12px', borderBottom: '1px solid #334155', cursor: 'pointer', backgroundColor: active ? '#334155' : 'transparent' });
const terminalCard: React.CSSProperties = { backgroundColor: '#1e293b', borderRadius: '16px', padding: '20px', border: '1px solid #334155' };
const terminalHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' };
const statusBadge: React.CSSProperties = { fontSize: '9px', padding: '3px 7px', borderRadius: '4px', backgroundColor: '#064e3b', color: '#4ade80', border: '1px solid #4ade80' };
const typeBadge = (isDebito: boolean): React.CSSProperties => ({ backgroundColor: isDebito ? '#450a0a' : '#064e3b', color: isDebito ? '#f87171' : '#4ade80', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' });
const exitPanel: React.CSSProperties = { backgroundColor: '#0f172a', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #fbbf24', marginBottom: '20px' };
const exitLabel: React.CSSProperties = { fontSize: '9px', color: '#fbbf24', fontWeight: 'bold' };
const actionBadge: React.CSSProperties = { fontSize: '16px', fontWeight: 'bold', color: '#fff' };
const priceTarget: React.CSSProperties = { fontSize: '22px', fontWeight: 'bold', color: '#4ade80' };
const terminalTable: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '20px' };
const footerMetrics: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', backgroundColor: '#0f172a', padding: '15px', borderRadius: '10px' };
const metricItem: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const metricLabel: React.CSSProperties = { fontSize: '9px', color: '#94a3b8' };
const chartContainer: React.CSSProperties = { backgroundColor: '#1e293b', padding: '15px', borderRadius: '16px', border: '1px solid #334155' };

export default App;