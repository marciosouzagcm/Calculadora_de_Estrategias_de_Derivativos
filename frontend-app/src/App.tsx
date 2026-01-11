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

  // Funções de Auxílio Blindadas
  const formatarData = (dataStr: string | undefined) => dataStr ? new Date(dataStr).toLocaleDateString('pt-BR') : 'N/A';
  const normalizar = (v: any) => {
    const num = parseFloat(v);
    if (isNaN(num)) return 0;
    return num > 500 ? num / 100 : num;
  };
  const formatarMoeda = (valor: any) => {
    const num = Number(valor) || 0;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const calcularMetricas = (est: StrategyMetrics, loteAtual: number) => {
    if (!est.pernas || est.pernas.length === 0) return null;
    
    let unitarioMontagem = 0;
    let deltaPosicao = 0;
    let gammaPosicao = 0;
    const isRochedo = est.name.toLowerCase().includes('rochedo');

    est.pernas.forEach(p => {
      const premio = normalizar(p.derivative.premio);
      const strike = normalizar(p.derivative.strike);
      const spotAtual = parseFloat(preco);
      
      if (p.derivative.tipo === 'SUBJACENTE') {
        unitarioMontagem -= spotAtual; 
        deltaPosicao += 1; 
      } else {
        const sinal = p.direction === 'VENDA' ? 1 : -1;
        unitarioMontagem += sinal * (premio * p.multiplier);
        const g = calcGreeks(spotAtual, strike, 0.1, 0.35, 0.12, p.derivative.tipo);
        const multFinal = p.direction === 'COMPRA' ? p.multiplier : -p.multiplier;
        deltaPosicao += g.delta * multFinal;
        gammaPosicao += g.gamma * multFinal;
      }
    });

    const taxasTotais = est.pernas.length * (parseFloat(taxaInformada) || 0) * 2;
    const custoEfetivoEntrada = (unitarioMontagem * loteAtual) - (taxasTotais / 2);
    
    // Garantia de que lucroMaximo seja sempre um Number
    const lucroLiquidoFinal = Number(est.max_profit) || Math.abs(unitarioMontagem * loteAtual);

    return {
      isDebito: unitarioMontagem < 0,
      deltaPosicao,
      gammaPosicao,
      vencimento: formatarData(est.pernas.find(p => p.derivative.tipo !== 'SUBJACENTE')?.derivative.vencimento),
      premioUnitario: Math.abs(unitarioMontagem),
      dentroDoFiltro: isRochedo ? true : Math.abs(unitarioMontagem) <= parseFloat(filtroRisco),
      lucroMaximo: lucroLiquidoFinal,
      custoEfetivoEntrada,
      taxasTotais,
      instrucaoDesmonte: unitarioMontagem < 0 ? "VENDER" : "COMPRAR",
      valorSaidaZeroaZero: Math.abs(custoEfetivoEntrada - (taxasTotais / 2)) / loteAtual,
      roi: est.exibir_roi || ((lucroLiquidoFinal / Math.abs(custoEfetivoEntrada)) * 100).toFixed(1) + '%'
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
      .sort((a, b) => parseFloat(b.est.exibir_roi || b.m?.roi || '0') - parseFloat(a.est.exibir_roi || a.m?.roi || '0'));
  }, [estrategias, lote, filtroRisco, taxaInformada, preco]);

  const analise = useMemo(() => selecionada ? calcularMetricas(selecionada, lote) : null, [selecionada, lote, taxaInformada, preco]);

  const gerarPDF = async () => {
    if (!selecionada || !analise) return;
    const doc = new jsPDF();
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("TRADING BOARD PRO", 14, 20);
    doc.save(`Relatorio_${ticker}_${selecionada.name}.pdf`);
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
                    <span style={riscoBadge}>RISCO UNIT: {formatarMoeda(analise.premioUnitario)}</span>
                  </div>
                </div>
                <div style={typeBadge(analise.isDebito)}>{analise.roi} ROI</div>
              </div>
              
              <div style={{display: 'flex', gap: '15px', marginBottom: '15px'}}>
                <div style={greeksBox}><small>DELTA POSIÇÃO</small><strong>{Math.round(analise.deltaPosicao * lote)}</strong></div>
                <div style={greeksBox}><small>GAMMA POSIÇÃO</small><strong>{(analise.gammaPosicao * lote).toFixed(4)}</strong></div>
              </div>

              <div style={exitPanel}>
                <div style={exitLabel}>STOP BREAK-EVEN (SAÍDA LÍQUIDA NO 0-0 INCL. TAXAS)</div>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px'}}>
                  <span style={actionBadge}>{analise.instrucaoDesmonte}</span>
                  <span style={priceTarget}>R$ {formatarMoeda(analise.valorSaidaZeroaZero)}</span>
                </div>
              </div>

              <table style={terminalTable}>
                <thead><tr><th>LADO</th><th>TIPO</th><th>TICKER</th><th>VENC.</th><th>STRIKE</th><th>PREMIO</th><th>QTD</th></tr></thead>
                <tbody>
                  {selecionada?.pernas.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ color: p.direction === 'VENDA' ? '#f87171' : '#4ade80', padding: '10px 0' }}>[{p.direction[0]}]</td>
                      <td style={{color: '#38bdf8'}}>{p.derivative.tipo}</td>
                      <td style={{color: '#fff'}}>{p.derivative.option_ticker || ticker}</td>
                      <td>{formatarData(p.derivative.vencimento)}</td>
                      <td>{p.derivative.tipo === 'SUBJACENTE' ? '---' : formatarMoeda(normalizar(p.derivative.strike))}</td>
                      <td>{p.derivative.tipo === 'SUBJACENTE' ? formatarMoeda(preco) : formatarMoeda(normalizar(p.derivative.premio))}</td>
                      <td>{Math.abs(p.multiplier) * lote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={footerMetrics}>
                <div style={metricItem}><small style={metricLabel}>LUCRO LÍQUIDO</small><span style={{color: '#4ade80', fontSize: '18px', fontWeight: 'bold'}}>R$ {formatarMoeda(analise.lucroMaximo)}</span></div>
                <div style={metricItem}>
                    <small style={metricLabel}>{analise.isDebito ? 'DESEMBOLSO (INVESTIMENTO + TAXAS)' : 'EMBOLSO (CRÉDITO LÍQUIDO)'}</small>
                    <span style={{color: analise.isDebito ? '#f87171' : '#4ade80', fontSize: '18px', fontWeight: 'bold'}}>R$ {formatarMoeda(Math.abs(analise.custoEfetivoEntrada))}</span>
                </div>
                <div style={metricItem}><small style={metricLabel}>TOTAL TAXAS</small><span style={{color: '#94a3b8', fontSize: '18px', fontWeight: 'bold'}}>R$ {formatarMoeda(analise.taxasTotais)}</span></div>
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
                    <b style={{color: '#4ade80', fontSize:'12px'}}>{item.est.exibir_roi || item.m?.roi}</b>
                  </div>
                  <div style={{display:'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px'}}>
                    <div style={sidebarMiniMetric}><span style={miniLabel}>{item.m?.isDebito ? 'DESEMBOLSO' : 'EMBOLSO'}</span><span style={{color: item.m?.isDebito ? '#f87171' : '#4ade80', fontSize: '10px'}}>R$ {formatarMoeda(Math.abs(item.m?.custoEfetivoEntrada || 0))}</span></div>
                    <div style={sidebarMiniMetric}><span style={miniLabel}>LUCRO LÍQ.</span><span style={{color: '#4ade80', fontSize: '10px'}}>R$ {formatarMoeda(item.m?.lucroMaximo)}</span></div>
                    <div style={sidebarMiniMetric}><span style={{...miniLabel, color: '#fbbf24'}}>RISCO UNIT.</span><span style={{color: '#fbbf24', fontSize: '10px'}}>{formatarMoeda(item.m?.premioUnitario)}</span></div>
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

// Estilos
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