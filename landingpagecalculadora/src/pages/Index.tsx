TypeScript
import React, { useMemo, useState } from 'react';
import { PayoffChart } from '../components/PayoffChart';
import { StrategyMetrics } from '../interfaces/Types';
import { MarketDataService } from '../services/MarketDataService';
import { exportarPDF } from '../services/pdfService';
import { ReportTemplate } from '../components/ReportTemplate';
import { 
  FileDown, 
  BookOpen, 
  ShieldCheck, 
  Zap
} from 'lucide-react';

const marketService = new MarketDataService();
const LOGO_SRC = "/saiba-mais/Logo.png";

const strategyCard = (active: boolean): React.CSSProperties => ({
  padding: '12px',
  borderBottom: '1px solid #1e293b',
  cursor: 'pointer',
  backgroundColor: active ? '#1e293b' : 'transparent',
  borderLeft: active ? '4px solid #0ea5e9' : '4px solid transparent',
  transition: 'all 0.2s ease-in-out',
  display: 'flex',
  flexDirection: 'column'
});

const Index: React.FC = () => {
  const [ticker, setTicker] = useState('BOVA11');
  const [precoSlot, setPrecoSlot] = useState(''); 
  const [lote, setLote] = useState(1000);
  const [riscoMaximoInput, setRiscoMaximoInput] = useState(0.70); 
  const [taxaPorPerna, setTaxaPorPerna] = useState(0.00); 
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [estrategias, setEstrategias] = useState<any[]>([]); 
  const [selecionada, setSelecionada] = useState<any | null>(null);

  const toNum = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    let s = String(val).trim();

    if (/[A-Z]{4}[A-Z]\d+/.test(s)) {
      const extraido = s.match(/\d+(\.\d+)?$/);
      if (extraido) s = extraido[0];
    }

    if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.');
    else if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s.replace(/[^\d.-]/g, ''));
    return isNaN(n) ? 0 : n;
  };

  const formatarData = (val: any) => {
    if (!val || val === '---') return '---';
    try {
      const dataStr = typeof val === 'string' ? val.split('T')[0] : val;
      const partes = dataStr.includes('-') ? dataStr.split('-') : dataStr.split('/');
      return partes.length === 3 ? `${partes[2].slice(-2)}/${partes[1]}/${partes[0].slice(-2)}` : val;
    } catch { return '---'; }
  };

  const getManualDescription = (name: string) => {
    const n = name.toUpperCase();
    if (n.includes('BULL CALL')) return "Trava de Alta com Call: Estratégia de débito para cenários de alta moderada.";
    if (n.includes('BULL PUT')) return "Trava de Alta com Put: Estratégia de crédito que visa a retenção do prêmio.";
    if (n.includes('BEAR CALL')) return "Trava de Baixa com Call: Operação de crédito que se beneficia da queda ou lateralização.";
    if (n.includes('BEAR PUT')) return "Trava de Baixa com Put: Compra de proteção financiada pela venda de strike inferior.";
    return "Análise técnica institucional baseada em Black-Scholes processada pelo motor BoardPRO.";
  };

  const handleExportPDF = async () => {
    if (!selecionada) {
      alert("Selecione uma estratégia para exportar o relatório.");
      return;
    }
    const sucesso = await exportarPDF(selecionada.name || 'Estrategia_BoardPro');
    if (!sucesso) alert("Erro ao gerar PDF. Verifique o console.");
  };

  const obterPernas = (est: any): any[] => {
    return est?.pernas || est?.opcoes || est?.legs || est?.components || [];
  };

  const calcularMetricasCompletas = (est: any) => {
    if (!est) return null;
    const pernas = obterPernas(est);
    const nPernas = pernas.length;
    const taxasMontagem = nPernas * taxaPorPerna;
    const taxasTotais = taxasMontagem * 2; 
    
    let fluxoCaixaUnit = 0;
    let strikes: number[] = [];
    let possuiVendaSeca = false;

    pernas.forEach((p: any) => {
      let prm = toNum(p.derivative?.premio || p.premio || p.preco_opcao || 0);
      const strike = toNum(p.strike || p.derivative?.strike || p.derivative?.symbol || p.symbol || p.option_ticker || p.strike_price);
      if (strike > 0) strikes.push(strike);
      const isCompra = ['COMPRA', 'BUY', 'C', 'LONG'].includes((p.direction || p.direcao || p.tipo_operacao || '').toUpperCase());
      fluxoCaixaUnit += isCompra ? -prm : prm;
      if (!isCompra) {
        const temProtecao = pernas.some((prot: any) => 
          ['COMPRA', 'BUY', 'C', 'LONG'].includes((prot.direction || prot.direcao || prot.tipo_operacao || '').toUpperCase()) && 
          (prot.derivative?.tipo || prot.tipo || prot.opcao_tipo) === (p.derivative?.tipo || p.tipo || p.opcao_tipo)
        );
        if (!temProtecao) possuiVendaSeca = true;
      }
    });

    const isCredito = fluxoCaixaUnit > 0;
    const premioAbsoluto = Math.abs(fluxoCaixaUnit);
    const taxasPorLoteUnit = taxasTotais / lote;
    const targetAjustado = isCredito ? (premioAbsoluto - taxasPorLoteUnit) : (premioAbsoluto + taxasPorLoteUnit);

    let riscoRealCalculado = 0;
    if (nPernas === 2 && strikes.length === 2 && !possuiVendaSeca) {
      const diffStrikes = Math.abs(strikes[0] - strikes[1]);
      riscoRealCalculado = diffStrikes === 0 ? premioAbsoluto * lote : (isCredito ? (diffStrikes - premioAbsoluto) * lote : premioAbsoluto * lote);
    } else {
      riscoRealCalculado = toNum(est.max_loss || est.risco_maximo || est.perda_maxima) || (riscoMaximoInput * lote);
    }

    const capitalEmRiscoTotal = Math.abs(riscoRealCalculado) + taxasMontagem;
    const lucroBrutoAPI = toNum(est.max_profit || est.lucro_maximo || est.ganho_maximo || (isCredito ? premioAbsoluto * lote : 0));
    const resultadoLiquidoReal = lucroBrutoAPI - taxasTotais;
    const roiCalculado = capitalEmRiscoTotal > 0 ? (resultadoLiquidoReal / capitalEmRiscoTotal) * 100 : 0;
    
    return { 
      totalLiquido: resultadoLiquidoReal, 
      riscoReal: capitalEmRiscoTotal, 
      roi: roiCalculado, 
      ur: capitalEmRiscoTotal / lote, 
      target: Math.max(0, targetAjustado), 
      taxas: taxasMontagem, 
      isCredito, 
      be: toNum(est.breakEvenPoints ? est.breakEvenPoints[0] : (est.be || est.breakeven))
    };
  };

  const selecionadaMetricas = useMemo(() => calcularMetricasCompletas(selecionada), [selecionada, taxaPorPerna, lote, riscoMaximoInput, precoSlot]);

  const buscarEstrategias = async () => {
    setLoading(true);
    try {
      let pRef = precoSlot;
      if (!pRef) {
        try {
          const marketData = await marketService.getAssetPrice(ticker.toUpperCase());
          pRef = marketData.price.toFixed(2);
        } catch {
          pRef = "10.00"; 
        }
        setPrecoSlot(pRef);
      }
      
      setLastUpdate(new Date().toLocaleTimeString());
      const limiteUR = toNum(riscoMaximoInput);

      const isLocalEnv = 
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' || 
        window.location.port === '8080' || 
        window.location.port === '5173';

      const baseUrl = isLocalEnv 
        ? 'http://localhost:10000' 
        : 'https://calculadora-de-estrategias-de-derivativos.onrender.com';

      const url = `${baseUrl}/api/analise?ticker=${ticker.toUpperCase()}&lote=${lote}&risco=${limiteUR * lote}&slot=${pRef}`;
      
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 55000); 

      const resp = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(id);

      if (!resp.ok) throw new Error(`Erro de comunicação com o servidor: ${resp.status}`);

      const result = await resp.json();
      
      if (result && Array.isArray(result)) {
        setEstrategias(result);
        setSelecionada(result.length > 0 ? result[0] : null);
      } else if (result && result.data && Array.isArray(result.data)) {
        setEstrategias(result.data);
        setSelecionada(result.data.length > 0 ? result.data[0] : null);
      } else if (result && result.status === "success" && result.data) {
        setEstrategias(result.data);
        setSelecionada(result.data.length > 0 ? result.data[0] : null);
      }

    } catch (err: any) { 
      console.error("ERRO NO COMPONENTE AO CARREGAR OPERAÇÕES:", err);
      alert("Erro ao renderizar os dados retornados pelo servidor.");
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div style={containerStyle}>
      {/* (O restante do seu JSX permanece inalterado) */}
      {/* ... */}
    </div>
  );
};

const containerStyle: React.CSSProperties = { backgroundColor: '#020617', minHeight: '100vh', color: '#f1f5f9', padding: '15px', fontFamily: 'monospace' };
const headerStyle: React.CSSProperties = { backgroundColor: '#0f172a', padding: '12px 20px', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '15px' };
const logoStyle: React.CSSProperties = { margin: 0, fontSize: '16px', fontWeight: '900', letterSpacing: '-0.5px' };
const badgeContainer: React.CSSProperties = { display: 'flex', gap: '8px', flexWrap: 'wrap' };
const liveBadge: React.CSSProperties = { backgroundColor: '#1e3a8a', color: '#93c5fd', padding: '4px 12px', borderRadius: '4px', fontSize: '10px', fontWeight:'bold' };
const priceBadge: React.CSSProperties = { backgroundColor: '#1e293b', color: '#38bdf8', padding: '4px 12px', borderRadius: '4px', fontSize: '10px', border: '1px solid #334155' };
const controlGrid: React.CSSProperties = { display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' };
const inputGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px' };
const label: React.CSSProperties = { fontSize: '9px', color: '#64748b', fontWeight: '800' };
const input: React.CSSProperties = { backgroundColor: '#020617', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', width: '85px', fontSize: '12px' };
const btnScan: React.CSSProperties = { backgroundColor: '#0ea5e9', color: '#fff', border: 'none', padding: '0 15px', borderRadius: '4px', fontWeight: '900', cursor: 'pointer', fontSize: '11px', height: '35px', transition: 'all 0.2s' };
const mainLayout: React.CSSProperties = { display: 'flex', gap: '15px', height: 'calc(100vh - 185px)' };
const sidebar: React.CSSProperties = { width: '250px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', display:'flex', flexDirection:'column' };
const sidebarTitle: React.CSSProperties = { padding: '12px', fontSize: '10px', fontWeight: 'bold', color:'#64748b', borderBottom:'1px solid #1e293b' };
const listScroll: React.CSSProperties = { overflowY: 'auto', flex: 1 };
const workspace: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' };
const detailGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '15px', flex: 1 };
const panel: React.CSSProperties = { backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', display:'flex', flexDirection:'column' };
const panelHeader: React.CSSProperties = { backgroundColor: '#1e293b', padding: '10px', fontSize: '11px', fontWeight: 'bold', color:'#38bdf8' };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '11px' };
const th: React.CSSProperties = { textAlign: 'left', padding: '10px', color: '#475569', fontSize:'9px' };
const tr: React.CSSProperties = { borderBottom: '1px solid #1e293b' };
const statusFooter: React.CSSProperties = { padding:'12px 15px', backgroundColor:'#020617', borderTop:'1px solid #1e293b' };
const footerBlock: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const empty: React.CSSProperties = { flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#1e293b', fontWeight:'bold', fontSize:'14px', letterSpacing:'2px' };
const roiBadge: React.CSSProperties = { backgroundColor: '#0ea5e9', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight:'bold' };
const riscoUnitBadge: React.CSSProperties = { backgroundColor: '#fbbf24', color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '800' };

export default Index;