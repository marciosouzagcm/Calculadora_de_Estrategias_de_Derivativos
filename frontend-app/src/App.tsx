import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useMemo, useRef, useState } from 'react';
import { StrategyMetrics } from './interfaces/Types'; 
import { PayoffChart } from './components/PayoffChart';
import { MarketDataService } from './services/MarketDataService';

const marketService = new MarketDataService();

const normDist = (x: number) => {
  const b1 = 0.31938153, b2 = -0.356563782, b3 = 1.781477937, b4 = -1.821255978, b5 = 1.330274429;
  const p = 0.2316419, c = 0.39894228;
  const a = Math.abs(x);
  const t = 1 / (1 + a * p);
  const b = c * Math.exp(-x * x / 2) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
  return x >= 0 ? 1 - b : b;
};

const calcGreeks = (s: number, k: number, t: number, v: number, r: number, type: string) => {
  const d1 = (Math.log(s / k) + (r + (v * v) / 2) * t) / (v * Math.sqrt(t));
  const delta = type === 'CALL' ? normDist(d1) : normDist(d1) - 1;
  const gamma = Math.exp(-d1 * d1 / 2) / (s * v * Math.sqrt(2 * Math.PI * t));
  return { delta, gamma };
};

const App = () => {
  const [ticker, setTicker] = useState('PETR4');
  const [preco, setPreco] = useState('30.00');
  const [lote, setLote] = useState(1000);
  const [filtroRisco, setFiltroRisco] = useState<string>('0.80');
  const [taxaInformada, setTaxaInformada] = useState<string>('22.00');
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [estrategias, setEstrategias] = useState<StrategyMetrics[]>([]);
  const [selecionada, setSelecionada] = useState<StrategyMetrics | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const formatarData = (dataStr: string | undefined) => dataStr ? new Date(dataStr).toLocaleDateString('pt-BR') : 'N/A';
  const normalizar = (v: number) => (v > 50 ? v / 100 : v);

  const calcularMetricas = (est: StrategyMetrics, loteAtual: number) => {
    if (!est.pernas || est.pernas.length === 0) return null;
    let unitarioMontagem = 0;
    let deltaPosicao = 0;
    let gammaPosicao = 0;

    est.pernas.forEach(p => {
      const sinal = p.direction === 'VENDA' ? 1 : -1;
      const premio = normalizar(p.derivative.premio);
      unitarioMontagem += sinal * (premio * p.multiplier);

      const g = calcGreeks(parseFloat(preco), normalizar(p.derivative.strike), 0.1, 0.35, 0.12, p.derivative.tipo);
      const multFinal = p.direction === 'COMPRA' ? p.multiplier : -p.multiplier;
      deltaPosicao += g.delta * multFinal;
      gammaPosicao += g.gamma * multFinal;
    });

    const taxasTotais = est.pernas.length * (parseFloat(taxaInformada) || 0) * 2;
    const isDebito = unitarioMontagem < 0;
    const custoEfetivoEntrada = (unitarioMontagem * loteAtual) - (taxasTotais / 2);
    const strikes = est.pernas.map(p => normalizar(p.derivative.strike)).sort((a, b) => a - b);
    const diffStrikes = strikes[strikes.length - 1] - strikes[0];

    const lucroLiquidoFinal = isDebito 
        ? (diffStrikes * loteAtual) + custoEfetivoEntrada - (taxasTotais / 2)
        : custoEfetivoEntrada - (taxasTotais / 2);

    return {
      isDebito,
      deltaPosicao,
      gammaPosicao,
      vencimento: formatarData(est.pernas[0]?.derivative.vencimento),
      premioUnitario: Math.abs(unitarioMontagem),
      dentroDoFiltro: Math.abs(unitarioMontagem) <= parseFloat(filtroRisco),
      lucroMaximo: Math.abs(lucroLiquidoFinal),
      custoEfetivoEntrada,
      taxasTotais,
      instrucaoDesmonte: isDebito ? "VENDER" : "COMPRAR",
      valorSaidaZeroaZero: Math.abs(custoEfetivoEntrada - (taxasTotais / 2)) / loteAtual,
      roi: ((Math.abs(lucroLiquidoFinal) / Math.abs(custoEfetivoEntrada)) * 100).toFixed(1) + '%'
    };
  };

  const buscarEstrategias = async () => {
    setLoading(true);
    try {
      const data = await marketService.getAssetPrice(ticker.trim().toUpperCase());
      setPreco(data.price.toString());
      setLastUpdate(data.updatedAt.toLocaleTimeString());
      const resp = await fetch(`http://localhost:3001/api/analise?ticker=${ticker.trim().toUpperCase()}&preco=${data.price}&risco_max=${filtroRisco}`);
      const result = await resp.json();
      if (result.status === "success") {
        setEstrategias(result.data);
        const validas = result.data.filter((est: StrategyMetrics) => calcularMetricas(est, lote)?.dentroDoFiltro);
        setSelecionada(validas[0] || null);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const listaFiltrada = useMemo(() => {
    return estrategias
      .map(est => ({ est, m: calcularMetricas(est, lote) }))
      .filter(i => i.m?.dentroDoFiltro)
      .sort((a, b) => parseFloat(b.m?.roi || '0') - parseFloat(a.m?.roi || '0'));
  }, [estrategias, lote, filtroRisco, taxaInformada]);

  const analise = useMemo(() => selecionada ? calcularMetricas(selecionada, lote) : null, [selecionada, lote, taxaInformada]);

  const gerarPDF = async () => {
    if (!selecionada || !analise) return;
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    
    // 1. Cabeçalho
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("TRADING BOARD PRO", 14, 20);
    doc.setFontSize(14);
    doc.setTextColor(56, 189, 248);
    doc.text(selecionada.name.toUpperCase(), 14, 30);
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text(`Ativo: ${ticker} | Spot: R$ ${preco} | Lote: ${lote} | Data: ${new Date().toLocaleDateString()}`, 14, 36);

    // 2. Tabela de Posições
    autoTable(doc, {
      startY: 45,
      head: [['LADO', 'TIPO', 'TICKER', 'VENC.', 'STRIKE', 'PREMIO', 'QTD']],
      body: selecionada.pernas.map(p => [
        p.direction, p.derivative.tipo, p.derivative.option_ticker,
        formatarData(p.derivative.vencimento),
        `R$ ${normalizar(p.derivative.strike).toFixed(2)}`,
        `R$ ${normalizar(p.derivative.premio).toFixed(2)}`,
        Math.abs(p.multiplier) * lote
      ]),
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 8 }
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    // 3. Painel de Break-even
    doc.setFillColor(255, 251, 235);
    doc.rect(14, finalY + 5, 182, 15, 'F');
    doc.setFontSize(8);
    doc.setTextColor(180, 130, 0);
    doc.text("STOP BREAK-EVEN (SAÍDA NO ZERO A ZERO INCLUINDO TAXAS):", 18, finalY + 10);
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`${analise.instrucaoDesmonte} ESTRUTURA POR: R$ ${analise.valorSaidaZeroaZero.toFixed(2)}`, 18, finalY + 17);

    // 4. Métricas de Risco e Gregas
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text("ANÁLISE TÉCNICA E GREGAS:", 14, finalY + 30);
    doc.setFont("helvetica", "normal");
    doc.text(`DELTA DA POSIÇÃO: ${(analise.deltaPosicao * lote).toFixed(0)}`, 14, finalY + 36);
    doc.text(`GAMMA DA POSIÇÃO: ${(analise.gammaPosicao * lote).toFixed(2)}`, 14, finalY + 42);
    
    // INFO DE RISCO UNITÁRIO (O QUE FALTAVA)
    doc.setTextColor(180, 0, 0);
    doc.text(`RISCO UNITÁRIO (PRÊMIO): R$ ${analise.premioUnitario.toFixed(2)}`, 120, finalY + 36);
    doc.setTextColor(30, 41, 59);
    doc.text(`ROI ESTIMADO: ${analise.roi}`, 120, finalY + 42);

    // 5. Resultados Financeiros Consolidados
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 100, 0);
    doc.text(`LUCRO MÁXIMO LÍQUIDO: R$ ${analise.lucroMaximo.toFixed(2)}`, 14, finalY + 52);
    doc.setTextColor(180, 0, 0);
    doc.text(`PREJUÍZO MÁXIMO (DESEMBOLSO): R$ ${Math.abs(analise.custoEfetivoEntrada).toFixed(2)}`, 14, finalY + 59);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`(Incluso custo operacional de taxas: R$ ${analise.taxasTotais.toFixed(2)})`, 14, finalY + 65);

    // 6. Gráfico de Payoff e Legenda
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.text("PROJEÇÃO VISUAL DE PAYOFF (RESULTADO NO VENCIMENTO)", 14, finalY + 75);

    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current);
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', 14, finalY + 79, 150, 75);
      
      doc.setFillColor(248, 250, 252);
      doc.rect(165, finalY + 79, 31, 75, 'F');
      doc.setFontSize(7);
      doc.setTextColor(50, 50, 50);
      doc.text("CORES:", 167, finalY + 84);
      doc.text(doc.splitTextToSize("AMARELA: Ponto de Breakeven.", 27), 167, finalY + 89);
      doc.text(doc.splitTextToSize("VERDE: Zona de lucro potencial.", 27), 167, finalY + 102);
      doc.text(doc.splitTextToSize("VERMELHA: Zona de risco/prejuízo.", 27), 167, finalY + 115);
    }

    // 7. Disclaimer
    const descY = pageHeight - 35;
    doc.setFillColor(248, 250, 252);
    doc.rect(14, descY, 182, 25, 'F');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("AVISO LEGAL / DISCLAIMER:", 18, descY + 6);
    doc.setFont("helvetica", "normal");
    const disclaimer = "Este relatório é uma simulação baseada no modelo Black-Scholes e dados atuais de mercado. Operações com opções possuem risco elevado e podem levar à perda total do capital investido. Trading Board Pro não realiza recomendações de compra ou venda, sendo este documento apenas para fins informativos.";
    doc.text(doc.splitTextToSize(disclaimer, 175), 18, descY + 11);

    doc.save(`Relatorio_Full_${ticker}_${selecionada.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
            <h1 style={{ margin: 0, fontSize: '20px' }}>TRADING BOARD <span style={{ color: '#38bdf8' }}>PRO</span></h1>
            <div style={{display:'flex', gap: '15px', alignItems:'center'}}>
               {selecionada && <button onClick={gerarPDF} style={btnPDF}>EXPORTAR RELATÓRIO PDF</button>}
               <span style={{fontSize: '10px', color: '#4ade80'}}>LIVE SPOT: {lastUpdate}</span>
            </div>
        </div>
        <div style={headerInputs}>
          <div style={inputGroup}><label style={labelStyle}>ATIVO</label><input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} style={inputStyle} /></div>
          <div style={inputGroup}><label style={labelStyle}>SPOT</label><input value={preco} onChange={e => setPreco(e.target.value)} style={inputStyle} /></div>
          <div style={inputGroup}><label style={labelStyle}>LOTE</label><input type="number" value={lote} onChange={e => setLote(Number(e.target.value))} style={inputStyle} /></div>
          <div style={inputGroup}><label style={{...labelStyle, color: '#fbbf24'}}>RISCO MÁX</label><input value={filtroRisco} onChange={e => setFiltroRisco(e.target.value)} style={inputStyle} /></div>
          <div style={inputGroup}><label style={{...labelStyle, color: '#a78bfa'}}>TAXA/PERNA</label><input value={taxaInformada} onChange={e => setTaxaInformada(e.target.value)} style={inputStyle} /></div>
          <button onClick={buscarEstrategias} style={btnEscanear}>{loading ? '...' : 'EXECUTAR SCANNER'}</button>
        </div>
      </div>

      {analise && (
        <div style={mainGrid}>
          <div style={{ flex: '2' }}>
            <div style={terminalCard}>
              <div style={terminalHeader}>
                <div>
                  <h2 style={{ margin: 0 }}>{selecionada?.name}</h2>
                  <div style={{display:'flex', gap: '8px', marginTop: '5px'}}>
                    <span style={statusBadge}>● RISCO VALIDADO</span>
                    <span style={riscoBadge}>RISCO: {analise.premioUnitario.toFixed(2)}</span>
                  </div>
                </div>
                <div style={typeBadge(analise.isDebito)}>{analise.roi} ROI</div>
              </div>
              
              <div style={{display: 'flex', gap: '15px', marginBottom: '15px'}}>
                <div style={greeksBox}><small>DELTA POSIÇÃO</small><strong>{(analise.deltaPosicao * lote).toFixed(0)}</strong></div>
                <div style={greeksBox}><small>GAMMA POSIÇÃO</small><strong>{(analise.gammaPosicao * lote).toFixed(2)}</strong></div>
              </div>

              <div style={exitPanel}>
                <div style={exitLabel}>STOP BREAK-EVEN (SAÍDA LÍQUIDA NO 0-0 INCL. TAXAS)</div>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px'}}>
                  <span style={actionBadge}>{analise.instrucaoDesmonte}</span>
                  <span style={priceTarget}>R$ {analise.valorSaidaZeroaZero.toFixed(2)}</span>
                </div>
              </div>

              <table style={terminalTable}>
                <thead><tr><th>LADO</th><th>TIPO</th><th>TICKER</th><th>VENC.</th><th>STRIKE</th><th>PREMIO</th><th>QTD</th></tr></thead>
                <tbody>
                  {selecionada?.pernas.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ color: p.direction === 'COMPRA' ? '#4ade80' : '#f87171', padding: '10px 0' }}>[{p.direction[0]}]</td>
                      <td style={{color: '#38bdf8'}}>{p.derivative.tipo}</td>
                      <td style={{color: '#fff'}}>{p.derivative.option_ticker}</td>
                      <td>{formatarData(p.derivative.vencimento)}</td>
                      <td>{normalizar(p.derivative.strike).toFixed(2)}</td>
                      <td>{normalizar(p.derivative.premio).toFixed(2)}</td>
                      <td>{Math.abs(p.multiplier) * lote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={footerMetrics}>
                <div style={metricItem}><small style={metricLabel}>LUCRO LÍQUIDO</small><span style={{color: '#4ade80', fontSize: '18px', fontWeight: 'bold'}}>R$ {analise.lucroMaximo.toFixed(2)}</span></div>
                <div style={metricItem}>
                    <small style={metricLabel}>{analise.isDebito ? 'DESEMBOLSO (INVESTIMENTO + TAXAS)' : 'EMBOLSO (CRÉDITO LÍQUIDO)'}</small>
                    <span style={{color: analise.isDebito ? '#f87171' : '#4ade80', fontSize: '18px', fontWeight: 'bold'}}>R$ {Math.abs(analise.custoEfetivoEntrada).toFixed(2)}</span>
                </div>
                <div style={metricItem}><small style={metricLabel}>TOTAL TAXAS</small><span style={{color: '#94a3b8', fontSize: '18px', fontWeight: 'bold'}}>R$ {analise.taxasTotais.toFixed(2)}</span></div>
              </div>
            </div>
            <div ref={chartRef} style={chartContainer}>
              <PayoffChart strategy={selecionada!} lote={lote} taxasIdaVolta={analise.taxasTotais} />
            </div>
          </div>

          <div style={sidebarStyle}>
            <div style={sidebarHeader}>RESULTADOS DO SCANNER ({listaFiltrada.length})</div>
            <div style={{ overflowY: 'auto', maxHeight: '80vh' }}>
              {listaFiltrada.map((item, idx) => (
                <div key={idx} onClick={() => setSelecionada(item.est)} style={estCard(selecionada?.name === item.est.name)}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                    <span style={{fontWeight:'bold', fontSize:'11px', color: '#f1f5f9', maxWidth:'140px'}}>{item.est.name}</span>
                    <b style={{color: '#4ade80', fontSize:'12px'}}>{item.m?.roi}</b>
                  </div>
                  <div style={{display:'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px'}}>
                    <div style={sidebarMiniMetric}><span style={miniLabel}>{item.m?.isDebito ? 'DESEMBOLSO' : 'EMBOLSO'}</span><span style={{color: item.m?.isDebito ? '#f87171' : '#4ade80', fontSize: '10px'}}>R$ {Math.abs(item.m?.custoEfetivoEntrada || 0).toFixed(2)}</span></div>
                    <div style={sidebarMiniMetric}><span style={miniLabel}>LUCRO LÍQ.</span><span style={{color: '#4ade80', fontSize: '10px'}}>R$ {item.m?.lucroMaximo.toFixed(2)}</span></div>
                    <div style={sidebarMiniMetric}><span style={{...miniLabel, color: '#fbbf24'}}>RISCO UNIT.</span><span style={{color: '#fbbf24', fontSize: '10px'}}>{item.m?.premioUnitario.toFixed(2)}</span></div>
                    <div style={sidebarMiniMetric}><span style={miniLabel}>VENCIMENTO</span><span style={{color: '#38bdf8', fontSize: '10px'}}>{item.m?.vencimento}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const riscoBadge: React.CSSProperties = { fontSize: '9px', padding: '3px 7px', color: '#fbbf24', border: '1px solid #fbbf24', borderRadius: '4px', fontWeight: 'bold' };
const containerStyle: React.CSSProperties = { padding: '20px', backgroundColor: '#0f172a', minHeight: '100vh', fontFamily: 'monospace', color: '#e2e8f0' };
const headerStyle: React.CSSProperties = { backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '15px', border: '1px solid #334155' };
const headerInputs: React.CSSProperties = { display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' };
const inputGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const labelStyle: React.CSSProperties = { fontSize: '10px', color: '#94a3b8', marginBottom: '5px' };
const inputStyle: React.CSSProperties = { background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '6px', width: '100px' };
const btnEscanear: React.CSSProperties = { background: '#38bdf8', color: '#0f172a', border: 'none', padding: '0 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', height: '38px' };
const btnPDF: React.CSSProperties = { background: '#334155', color: '#38bdf8', border: '1px solid #38bdf8', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' };
const mainGrid: React.CSSProperties = { display: 'flex', gap: '20px' };
const terminalCard: React.CSSProperties = { backgroundColor: '#1e293b', borderRadius: '16px', padding: '20px', border: '1px solid #334155', marginBottom: '20px' };
const terminalHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' };
const statusBadge: React.CSSProperties = { fontSize: '9px', padding: '3px 7px', color: '#4ade80', border: '1px solid #4ade80', borderRadius: '4px' };
const typeBadge = (isDeb: boolean): React.CSSProperties => ({ backgroundColor: isDeb ? '#450a0a' : '#064e3b', color: isDeb ? '#f87171' : '#4ade80', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold' });
const greeksBox: React.CSSProperties = { background: '#0f172a', padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', minWidth: '120px' };
const exitPanel: React.CSSProperties = { backgroundColor: '#0f172a', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #fbbf24', marginBottom: '20px' };
const exitLabel: React.CSSProperties = { fontSize: '10px', color: '#fbbf24', fontWeight: 'bold' };
const actionBadge: React.CSSProperties = { fontSize: '16px', fontWeight: 'bold', color: '#fff' };
const priceTarget: React.CSSProperties = { fontSize: '22px', fontWeight: 'bold', color: '#4ade80' };
const terminalTable: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '20px' };
const footerMetrics: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', backgroundColor: '#0f172a', padding: '15px', borderRadius: '10px' };
const metricItem: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const metricLabel: React.CSSProperties = { fontSize: '9px', color: '#94a3b8' };
const sidebarStyle: React.CSSProperties = { backgroundColor: '#1e293b', borderRadius: '12px', flex: '0.8', border: '1px solid #334155', display: 'flex', flexDirection: 'column' };
const sidebarHeader: React.CSSProperties = { padding: '12px', background: '#334155', fontSize: '10px', fontWeight: 'bold', color: '#38bdf8', borderRadius: '12px 12px 0 0', borderBottom: '1px solid #475569' };
const estCard = (act: boolean): React.CSSProperties => ({ padding: '15px', borderBottom: '1px solid #334155', cursor: 'pointer', background: act ? '#2d3748' : 'transparent', borderLeft: act ? '4px solid #38bdf8' : '4px solid transparent' });
const sidebarMiniMetric: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '2px' };
const miniLabel: React.CSSProperties = { fontSize: '8px', color: '#64748b', fontWeight: 'bold' };
const chartContainer: React.CSSProperties = { backgroundColor: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid #334155' };

export default App;