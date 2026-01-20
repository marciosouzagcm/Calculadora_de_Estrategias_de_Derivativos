import React, { useRef, useState, useMemo } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StrategyMetrics } from './interfaces/Types'; 
import { PayoffChart } from './components/PayoffChart';
import { MarketDataService } from './services/MarketDataService';

const marketService = new MarketDataService();

const App = () => {
  const [ticker, setTicker] = useState('ABEV3');
  const [preco, setPreco] = useState('0.00');
  const [lote, setLote] = useState(1000);
  const [taxaInformada, setTaxaInformada] = useState('0.00'); 
  const [riscoDesejado, setRiscoDesejado] = useState(500); 
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [estrategias, setEstrategias] = useState<StrategyMetrics[]>([]);
  const [selecionada, setSelecionada] = useState<StrategyMetrics | null>(null);
  
  const chartRef = useRef<HTMLDivElement>(null);

  // --- NOVA FUNÇÃO DE MÉTRICAS AVANÇADAS ---
  const analiseAvancada = useMemo(() => {
    if (!selecionada) return null;

    const est = selecionada;
    const loteAtual = lote;
    const taxasFixas = parseFloat(taxaInformada) || 0;
    
    // 1. Cálculo de Custo e Direção (Débito/Crédito)
    let unitarioMontagem = 0;
    est.pernas.forEach(p => {
        const sinal = p.direction === 'VENDA' ? 1 : -1;
        unitarioMontagem += sinal * (p.derivative.premio || 0);
    });

    const taxasTotais = est.pernas.length * taxasFixas * 2; // Ida e Volta
    const isDebito = unitarioMontagem < 0;
    
    // Custo efetivo considera o que sai do bolso + taxas de entrada
    const custoEfetivoEntrada = (unitarioMontagem * loteAtual) - (taxasTotais / 2);
    
    // 2. Lucro Máximo e ROI
    // (Simplificado para o Front, o ideal é vir do backend, mas aqui garantimos o cálculo)
    const lucroMaximo = parseFloat(est.exibir_lucro.replace(/[^0-9.-]+/g,"")) || 0;
    const roiCalc = ((lucroMaximo / Math.abs(custoEfetivoEntrada)) * 100).toFixed(1) + '%';

    // 3. Ponto de Equilíbrio (Break-even Simples)
    const valorSaidaZeroaZero = Math.abs(custoEfetivoEntrada - (taxasTotais / 2)) / loteAtual;

    return {
      isDebito,
      custoEfetivoEntrada,
      taxasTotais,
      lucroMaximo,
      roi: roiCalc,
      instrucaoDesmonte: isDebito ? "VENDER" : "COMPRAR",
      valorSaidaZeroaZero
    };
  }, [selecionada, lote, taxaInformada]);

  const buscarEstrategias = async () => {
    setLoading(true);
    try {
      const marketData = await marketService.getAssetPrice(ticker.trim().toUpperCase());
      setPreco(marketData.price.toFixed(2));
      setLastUpdate(marketData.updatedAt.toLocaleTimeString());

      const baseUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://calculadora-de-estrategias-de-derivativos.onrender.com';

      const resp = await fetch(
        `${baseUrl}/api/analise?ticker=${ticker.trim().toUpperCase()}&lote=${lote}&risco=${riscoDesejado}`
      );
      
      const result = await resp.json();
      if (result.status === "success") {
        setEstrategias(result.data);
        setSelecionada(result.data[0] || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const gerarPDF = async () => {
    if (!selecionada || !analiseAvancada) return;
    const doc = new jsPDF();
    
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text(`BOARDPRO - ${selecionada.name}`, 14, 25);
    
    doc.setFontSize(10);
    doc.text(`ROI: ${analiseAvancada.roi} | BREAK-EVEN: R$ ${analiseAvancada.valorSaidaZeroaZero.toFixed(2)}`, 14, 35);

    autoTable(doc, {
      startY: 45,
      head: [['LADO', 'TIPO', 'TICKER', 'STRIKE', 'PRÊMIO', 'QTD']],
      body: selecionada.pernas.map((p: any) => [
        p.direction, p.derivative.tipo, p.derivative.option_ticker,
        `R$ ${p.derivative.strike?.toFixed(2)}`, `R$ ${p.derivative.premio?.toFixed(2)}`,
        Math.abs(p.multiplier) * lote
      ]),
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] }
    });

    if (chartRef.current) {
        const canvas = await html2canvas(chartRef.current);
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', 14, 130, 180, 90);
    }
    doc.save(`Analise_${ticker}_${selecionada.name}.pdf`);
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#fff' }}>
                TRADING BOARD <span style={{ color: '#38bdf8' }}>PRO</span>
            </h1>
            <div style={{display:'flex', gap: '12px', alignItems:'center'}}>
               {selecionada && <button onClick={gerarPDF} style={btnPDF}>GERAR RELATÓRIO PDF</button>}
               <span style={liveBadge}>LIVE MARKET: {lastUpdate || '--:--'}</span>
            </div>
        </div>
        
        <div style={headerInputs}>
          <div style={inputGroup}><label style={labelStyle}>ATIVO</label>
            <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} style={inputStyle} />
          </div>
          <div style={inputGroup}><label style={labelStyle}>TAXAS (POR PERNA)</label>
            <input type="number" value={taxaInformada} onChange={e => setTaxaInformada(e.target.value)} style={inputStyle} />
          </div>
          <button onClick={buscarEstrategias} style={btnEscanear} disabled={loading}>
            {loading ? 'CALCULANDO...' : 'EXECUTAR SCANNER'}
          </button>
        </div>
      </header>

      {selecionada && analiseAvancada && (
        <main style={mainGrid}>
          <section style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={terminalCard}>
              <div style={terminalHeader}>
                <div>
                  <h2 style={{ margin: 0, color: '#fff', fontSize: '24px' }}>{selecionada.name}</h2>
                  <div style={{display:'flex', gap: '8px', marginTop: '10px'}}>
                    <span style={statusBadge}>MODELO: ESTÁVEL</span>
                    <span style={riscoBadge}>BREAK-EVEN: R$ {analiseAvancada.valorSaidaZeroaZero.toFixed(2)}</span>
                  </div>
                </div>
                <div style={roiBadge}>{analiseAvancada.roi} <small style={{fontSize: '10px', display: 'block'}}>ROI ESTIMADO</small></div>
              </div>

              <table style={terminalTable}>
                 {/* ... (Manter o mapeamento das pernas igual ao seu código atual) ... */}
                 <tbody>
                  {selecionada.pernas.map((p: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ color: p.direction === 'COMPRA' ? '#4ade80' : '#f87171', padding: '14px 0'}}>{p.direction}</td>
                      <td>{p.derivative.tipo}</td>
                      <td style={{color: '#fff', fontWeight: 'bold'}}>{p.derivative.option_ticker}</td>
                      <td>R$ {p.derivative.strike?.toFixed(2)}</td>
                      <td>R$ {p.derivative.premio?.toFixed(2)}</td>
                      <td>{Math.abs(p.multiplier) * lote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={footerMetrics}>
                <div style={metricItem}>
                    <small style={metricLabel}>LUCRO LÍQUIDO ESTIMADO</small>
                    <span style={{color: '#4ade80', fontSize: '22px', fontWeight: '900'}}>R$ {analiseAvancada.lucroMaximo.toFixed(2)}</span>
                </div>
                <div style={metricItem}>
                    <small style={metricLabel}>{analiseAvancada.isDebito ? 'INVESTIMENTO + TAXAS' : 'CRÉDITO LÍQUIDO'}</small>
                    <span style={{color: analiseAvancada.isDebito ? '#f87171' : '#4ade80', fontSize: '22px', fontWeight: '900'}}>
                      R$ {Math.abs(analiseAvancada.custoEfetivoEntrada).toFixed(2)}
                    </span>
                </div>
                <div style={metricItem}>
                    <small style={metricLabel}>TAXAS TOTAIS</small>
                    <span style={{color: '#94a3b8', fontSize: '22px', fontWeight: '900'}}>R$ {analiseAvancada.taxasTotais.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div ref={chartRef} style={chartContainer}>
              <PayoffChart strategy={selecionada} lote={lote} taxasIdaVolta={analiseAvancada.taxasTotais} />
            </div>
          </section>

          <aside style={sidebarStyle}>
            <div style={sidebarHeader}>OPORTUNIDADES IDENTIFICADAS</div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {estrategias.map((est, idx) => (
                <div key={idx} onClick={() => setSelecionada(est)} style={estCard(selecionada?.name === est.name)}>
                  <div style={{display:'flex', justifyContent:'space-between'}}>
                    <span style={{fontWeight:'700'}}>{est.name}</span>
                    <b style={{color: '#4ade80'}}>{est.exibir_roi}</b>
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

// --- (Manter seus estilos CSS-IN-JS originais aqui) ---
const containerStyle: React.CSSProperties = { padding: '20px', backgroundColor: '#020617', minHeight: '100vh', fontFamily: '"Inter", sans-serif', color: '#f1f5f9' };
// ... (Adicione os demais estilos que você já possui)

export default App;