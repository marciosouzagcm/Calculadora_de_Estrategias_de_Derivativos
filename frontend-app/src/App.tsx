// src/App.tsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StrategyMetrics, OptionLeg } from './interfaces/Types'; 
import { PayoffChart } from './components/PayoffChart';
import { MarketDataService } from './services/MarketDataService';

const marketService = new MarketDataService();

// --- Lógica Matemática (Black-Scholes & Gregas) ---
const normDist = (x: number) => {
  const b1 = 0.31938153, b2 = -0.356563782, b3 = 1.781477937, b4 = -1.821255978, b5 = 1.330274429;
  const p = 0.2316419, c = 0.39894228;
  const a = Math.abs(x);
  const t = 1 / (1 + a * p);
  const b = c * Math.exp(-x * x / 2) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
  return x >= 0 ? 1 - b : b;
};

const calcGreeks = (s: number, k: number, t: number, v: number, r: number, type: string) => {
  if (t <= 0) t = 0.00001; 
  const d1 = (Math.log(s / k) + (r + (v * v) / 2) * t) / (v * Math.sqrt(t));
  const delta = type === 'CALL' ? normDist(d1) : normDist(d1) - 1;
  const gamma = Math.exp(-d1 * d1 / 2) / (s * v * Math.sqrt(2 * Math.PI * t));
  return { delta, gamma };
};

const App = () => {
  // --- Estados ---
  const [ticker, setTicker] = useState('PETR4');
  const [preco, setPreco] = useState('30.00');
  const [lote, setLote] = useState(1000);
  const [filtroRisco, setFiltroRisco] = useState<string>('0.80');
  const [taxaInformada, setTaxaInformada] = useState<string>('0.50');
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [estrategias, setEstrategias] = useState<StrategyMetrics[]>([]);
  const [selecionada, setSelecionada] = useState<StrategyMetrics | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---
  const formatarData = (dataStr: string | undefined) => dataStr ? new Date(dataStr).toLocaleDateString('pt-BR') : 'N/A';
  
  const calcularMetricas = (est: StrategyMetrics, loteAtual: number) => {
    if (!est.pernas || est.pernas.length === 0) return null;
    
    let netCashFlow = 0; 
    let deltaPosicao = 0;
    let gammaPosicao = 0;
    const spot = parseFloat(preco);

    est.pernas.forEach(p => {
      const isVenda = p.direction === 'VENDA';
      const premio = p.derivative.premio || 0;
      const strike = p.derivative.strike || 0;
      
      // Fluxo Financeiro Unitário: Venda (+) | Compra (-)
      netCashFlow += isVenda ? premio : -premio;

      // Gregas Unitárias (Assumindo 21 dias úteis médios = 0.08 ano)
      const g = calcGreeks(spot, strike, 0.08, 0.35, 0.12, p.derivative.tipo);
      
      // Na Posição: Compra mantém sinal, Venda inverte sinal da grega
      const multPosicao = isVenda ? -1 : 1;
      deltaPosicao += g.delta * multPosicao;
      gammaPosicao += g.gamma * multPosicao;
    });

    const taxasTotais = est.pernas.length * (parseFloat(taxaInformada) || 0);
    const custoMontagemLote = netCashFlow * loteAtual;
    const custoEfetivoFinal = custoMontagemLote - taxasTotais;

    const lucroMaximo = est.max_profit === 'ILIMITADO' ? 999999 : (Number(est.max_profit) * loteAtual) - taxasTotais;
    const riscoMaximo = est.max_loss === 'ILIMITADO' ? 999999 : (Number(est.max_loss) * loteAtual) + taxasTotais;

    const roiCalculado = (lucroMaximo / Math.abs(riscoMaximo)) * 100;

    return {
      isDebito: netCashFlow < 0,
      deltaPosicao,
      gammaPosicao,
      vencimento: formatarData(est.pernas[0]?.derivative.vencimento),
      premioUnitario: Math.abs(netCashFlow),
      dentroDoFiltro: Math.abs(netCashFlow) <= parseFloat(filtroRisco),
      lucroMaximo,
      riscoMaximo,
      custoEfetivoEntrada: custoEfetivoFinal,
      taxasTotais,
      instrucaoDesmonte: netCashFlow < 0 ? "VENDER" : "COMPRAR",
      valorSaidaZeroaZero: Math.abs(custoEfetivoFinal / loteAtual),
      roi: (roiCalculado > 1000 ? '>1000' : roiCalculado.toFixed(1)) + '%'
    };
  };

  // --- Ações ---
  const buscarEstrategias = async () => {
    setLoading(true);
    try {
      // 1. Busca Preço Real-Time
      const data = await marketService.getAssetPrice(ticker.trim().toUpperCase());
      setPreco(data.price.toString());
      setLastUpdate(data.updatedAt.toLocaleTimeString());

      // 2. Busca Análise no Backend (Render/Localhost)
      const baseUrl = process.env.NODE_ENV === 'production' ? 'https://seu-backend.onrender.com' : 'http://localhost:3001';
      const resp = await fetch(`${baseUrl}/api/analise?ticker=${ticker.trim().toUpperCase()}&preco=${data.price}`);
      const result = await resp.json();

      if (result.status === "success") {
        setEstrategias(result.data);
        // Seleciona a primeira que passar no filtro de risco
        const validas = result.data.filter((est: StrategyMetrics) => {
            const m = calcularMetricas(est, lote);
            return m && m.dentroDoFiltro;
        });
        setSelecionada(validas[0] || result.data[0] || null);
      }
    } catch (err) {
      console.error("[Scanner Error]:", err);
    } finally {
      setLoading(false);
    }
  };

  const listaFiltrada = useMemo(() => {
    return estrategias
      .map(est => ({ est, m: calcularMetricas(est, lote) }))
      .filter(i => i.m?.dentroDoFiltro)
      .sort((a, b) => parseFloat(b.m?.roi || '0') - parseFloat(a.m?.roi || '0'));
  }, [estrategias, lote, filtroRisco, taxaInformada, preco]);

  const analise = useMemo(() => selecionada ? calcularMetricas(selecionada, lote) : null, [selecionada, lote, taxaInformada, preco]);

  const gerarPDF = async () => {
    if (!selecionada || !analise) return;
    const doc = new jsPDF();
    
    // Design do Relatório
    doc.setFillColor(15, 23, 42); // Navy Dark
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("BOARDPRO ANALYTICS", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(56, 189, 248);
    doc.text(`ESTRATÉGIA: ${selecionada.name.toUpperCase()}`, 14, 30);
    
    // Tabela de Pernas
    autoTable(doc, {
      startY: 45,
      head: [['OPERAÇÃO', 'TIPO', 'SÍMBOLO', 'STRIKE', 'PRÊMIO', 'QTD']],
      body: selecionada.pernas.map(p => [
        p.direction, p.derivative.tipo, p.derivative.option_ticker,
        `R$ ${p.derivative.strike?.toFixed(2)}`,
        `R$ ${p.derivative.premio?.toFixed(2)}`,
        Math.abs(p.multiplier) * lote
      ]),
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] }
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    // Métricas Financeiras
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("RESUMO FINANCEIRO LÍQUIDO", 14, finalY + 15);
    doc.setFontSize(10);
    doc.text(`Lucro Máximo: R$ ${analise.lucroMaximo.toFixed(2)}`, 14, finalY + 25);
    doc.text(`Risco Máximo: R$ ${analise.riscoMaximo.toFixed(2)}`, 14, finalY + 32);
    doc.text(`ROI Estimado: ${analise.roi}`, 14, finalY + 39);
    doc.text(`Ponto de Saída (0-0): R$ ${analise.valorSaidaZeroaZero.toFixed(2)}`, 14, finalY + 46);

    // Gráfico de Payoff
    if (chartRef.current) {
        const canvas = await html2canvas(chartRef.current);
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 14, finalY + 55, 180, 90);
    }

    doc.save(`BoardPro_${ticker}_${selecionada.name}.pdf`);
  };

  return (
    <div style={containerStyle}>
      {/* HEADER / CONTROL PANEL */}
      <div style={headerStyle}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
            <h1 style={{ margin: 0, fontSize: '22px', letterSpacing: '1px' }}>
                TRADING BOARD <span style={{ color: '#38bdf8' }}>PRO</span>
            </h1>
            <div style={{display:'flex', gap: '15px', alignItems:'center'}}>
               {selecionada && <button onClick={gerarPDF} style={btnPDF}>EXPORTAR PDF</button>}
               <span style={{fontSize: '11px', color: '#4ade80', background: '#064e3b', padding: '4px 8px', borderRadius: '4px'}}>
                 LIVE: {lastUpdate || '--:--'}
               </span>
            </div>
        </div>
        
        <div style={headerInputs}>
          <div style={inputGroup}><label style={labelStyle}>ATIVO</label><input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} style={inputStyle} /></div>
          <div style={inputGroup}><label style={labelStyle}>PREÇO SPOT</label><input value={preco} onChange={e => setPreco(e.target.value)} style={inputStyle} /></div>
          <div style={inputGroup}><label style={labelStyle}>LOTE PADRÃO</label><input type="number" value={lote} onChange={e => setLote(Number(e.target.value))} style={inputStyle} /></div>
          <div style={inputGroup}><label style={{...labelStyle, color: '#fbbf24'}}>LIMITE RISCO UNIT.</label><input value={filtroRisco} onChange={e => setFiltroRisco(e.target.value)} style={inputStyle} /></div>
          <div style={inputGroup}><label style={{...labelStyle, color: '#a78bfa'}}>TAXA B3/CORRET.</label><input value={taxaInformada} onChange={e => setTaxaInformada(e.target.value)} style={inputStyle} /></div>
          <button onClick={buscarEstrategias} style={btnEscanear} disabled={loading}>
            {loading ? 'PROCESSANDO...' : 'EXECUTAR SCANNER'}
          </button>
        </div>
      </div>

      {analise && (
        <div style={mainGrid}>
          {/* COLUNA ESQUERDA: DETALHES E GRÁFICO */}
          <div style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={terminalCard}>
              <div style={terminalHeader}>
                <div>
                  <h2 style={{ margin: 0, color: '#f8f9fa' }}>{selecionada?.name}</h2>
                  <div style={{display:'flex', gap: '8px', marginTop: '8px'}}>
                    <span style={statusBadge}>ESTRUTURA VALIDADA</span>
                    <span style={riscoBadge}>RISCO UNIT: {analise.premioUnitario.toFixed(2)}</span>
                  </div>
                </div>
                <div style={typeBadge(analise.isDebito)}>{analise.roi} ROI</div>
              </div>
              
              <div style={{display: 'flex', gap: '15px', marginBottom: '20px'}}>
                <div style={greeksBox}><small style={miniLabel}>DELTA DA POSIÇÃO</small><strong>{(analise.deltaPosicao * lote).toFixed(0)}</strong></div>
                <div style={greeksBox}><small style={miniLabel}>GAMMA DA POSIÇÃO</small><strong>{(analise.gammaPosicao * lote).toFixed(2)}</strong></div>
              </div>

              <div style={exitPanel}>
                <div style={exitLabel}>ALVO PARA DESMONTE (BREAK-EVEN LÍQUIDO)</div>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px'}}>
                  <span style={actionBadge}>{analise.instrucaoDesmonte}</span>
                  <span style={priceTarget}>R$ {analise.valorSaidaZeroaZero.toFixed(2)}</span>
                </div>
              </div>

              <table style={terminalTable}>
                <thead>
                    <tr><th>LADO</th><th>TIPO</th><th>TICKER</th><th>VENC.</th><th>STRIKE</th><th>PREMIO</th><th>QTD</th></tr>
                </thead>
                <tbody>
                  {selecionada?.pernas.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ color: p.direction === 'COMPRA' ? '#4ade80' : '#f87171', padding: '12px 0' }}>{p.direction}</td>
                      <td style={{color: '#38bdf8'}}>{p.derivative.tipo}</td>
                      <td style={{color: '#fff', fontWeight: 'bold'}}>{p.derivative.option_ticker}</td>
                      <td>{formatarData(p.derivative.vencimento)}</td>
                      <td>{p.derivative.strike?.toFixed(2)}</td>
                      <td>{p.derivative.premio?.toFixed(2)}</td>
                      <td>{Math.abs(p.multiplier) * lote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={footerMetrics}>
                <div style={metricItem}><small style={metricLabel}>LUCRO MÁX. LÍQUIDO</small><span style={{color: '#4ade80', fontSize: '20px', fontWeight: 'bold'}}>R$ {analise.lucroMaximo.toFixed(2)}</span></div>
                <div style={metricItem}>
                    <small style={metricLabel}>{analise.isDebito ? 'INVESTIMENTO TOTAL' : 'CRÉDITO NA MONTAGEM'}</small>
                    <span style={{color: analise.isDebito ? '#f87171' : '#4ade80', fontSize: '20px', fontWeight: 'bold'}}>R$ {Math.abs(analise.custoEfetivoEntrada).toFixed(2)}</span>
                </div>
                <div style={metricItem}><small style={metricLabel}>TAXAS ESTIMADAS</small><span style={{color: '#94a3b8', fontSize: '20px', fontWeight: 'bold'}}>R$ {analise.taxasTotais.toFixed(2)}</span></div>
              </div>
            </div>

            <div ref={chartRef} style={chartContainer}>
               <h3 style={{marginTop: 0, fontSize: '14px', color: '#94a3b8'}}>PROJEÇÃO DE PAYOFF NO VENCIMENTO</h3>
               <PayoffChart strategy={selecionada!} lote={lote} taxasIdaVolta={analise.taxasTotais} />
            </div>
          </div>

          {/* SIDEBAR: LISTA DE OPORTUNIDADES */}
          <div style={sidebarStyle}>
            <div style={sidebarHeader}>SCANNER: {listaFiltrada.length} OPORTUNIDADES</div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {listaFiltrada.map((item, idx) => (
                <div key={idx} onClick={() => setSelecionada(item.est)} style={estCard(selecionada?.name === item.est.name)}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom: '8px'}}>
                    <span style={{fontWeight:'bold', fontSize:'12px', color: '#f1f5f9'}}>{item.est.name}</span>
                    <b style={{color: '#4ade80'}}>{item.m?.roi}</b>
                  </div>
                  <div style={{display:'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                    <div style={sidebarMiniMetric}><span style={miniLabel}>RISCO</span><span style={{color: '#f87171'}}>R$ {Math.abs(item.m?.riscoMaximo || 0).toFixed(0)}</span></div>
                    <div style={sidebarMiniMetric}><span style={miniLabel}>LUCRO</span><span style={{color: '#4ade80'}}>R$ {item.m?.lucroMaximo.toFixed(0)}</span></div>
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

// --- Estilos em Objetos (CSS-in-JS) ---
const containerStyle: React.CSSProperties = { padding: '20px', backgroundColor: '#0f172a', minHeight: '100vh', fontFamily: 'Inter, monospace', color: '#e2e8f0' };
const headerStyle: React.CSSProperties = { backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' };
const headerInputs: React.CSSProperties = { display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' };
const inputGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '5px' };
const labelStyle: React.CSSProperties = { fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' };
const inputStyle: React.CSSProperties = { background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', width: '110px', fontSize: '13px' };
const btnEscanear: React.CSSProperties = { background: '#38bdf8', color: '#0f172a', border: 'none', padding: '0 25px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', height: '42px', transition: 'all 0.2s' };
const btnPDF: React.CSSProperties = { background: 'transparent', color: '#38bdf8', border: '1px solid #38bdf8', padding: '6px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' };
const mainGrid: React.CSSProperties = { display: 'flex', gap: '20px', alignItems: 'flex-start' };
const terminalCard: React.CSSProperties = { backgroundColor: '#1e293b', borderRadius: '16px', padding: '25px', border: '1px solid #334155' };
const terminalHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' };
const statusBadge: React.CSSProperties = { fontSize: '9px', padding: '3px 8px', color: '#4ade80', border: '1px solid #4ade80', borderRadius: '4px', fontWeight: 'bold' };
const riscoBadge: React.CSSProperties = { fontSize: '9px', padding: '3px 8px', color: '#fbbf24', border: '1px solid #fbbf24', borderRadius: '4px', fontWeight: 'bold' };
const typeBadge = (isDeb: boolean): React.CSSProperties => ({ backgroundColor: isDeb ? '#450a0a' : '#064e3b', color: isDeb ? '#f87171' : '#4ade80', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px' });
const greeksBox: React.CSSProperties = { background: '#0f172a', padding: '12px 16px', borderRadius: '10px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', minWidth: '140px' };
const exitPanel: React.CSSProperties = { backgroundColor: '#0f172a', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #fbbf24', marginBottom: '25px' };
const exitLabel: React.CSSProperties = { fontSize: '11px', color: '#fbbf24', fontWeight: 'bold', letterSpacing: '0.5px' };
const actionBadge: React.CSSProperties = { fontSize: '18px', fontWeight: 'bold', color: '#fff', background: '#334155', padding: '2px 10px', borderRadius: '4px' };
const priceTarget: React.CSSProperties = { fontSize: '28px', fontWeight: 'bold', color: '#4ade80' };
const terminalTable: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '25px', textAlign: 'left' };
const footerMetrics: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', backgroundColor: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #334155' };
const metricItem: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '5px' };
const metricLabel: React.CSSProperties = { fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' };
const sidebarStyle: React.CSSProperties = { backgroundColor: '#1e293b', borderRadius: '16px', width: '320px', border: '1px solid #334155', height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column', position: 'sticky', top: '20px' };
const sidebarHeader: React.CSSProperties = { padding: '15px', background: '#334155', fontSize: '11px', fontWeight: 'bold', color: '#38bdf8', borderRadius: '16px 16px 0 0' };
const estCard = (act: boolean): React.CSSProperties => ({ padding: '18px', borderBottom: '1px solid #334155', cursor: 'pointer', transition: 'all 0.2s', background: act ? '#2d3748' : 'transparent', borderLeft: act ? '4px solid #38bdf8' : '4px solid transparent' });
const sidebarMiniMetric: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '3px' };
const miniLabel: React.CSSProperties = { fontSize: '9px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' };
const chartContainer: React.CSSProperties = { backgroundColor: '#1e293b', padding: '25px', borderRadius: '16px', border: '1px solid #334155' };

export default App;