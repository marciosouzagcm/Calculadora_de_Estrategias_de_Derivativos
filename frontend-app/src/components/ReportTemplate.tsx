import React from 'react';
import { exportarPDF, formatCurrency } from '../services/pdfService';
import { PayoffChart } from './PayoffChart';
import { 
  ShieldAlert, BookOpen, Zap, Target, TrendingUp, Scale, Clock, ChevronRight 
} from 'lucide-react';

export const ReportTemplate = ({ est, metricas, ticker, spot, lote, logoUrl }: any) => {
  if (!est || !metricas || !ticker) return null;

  // Extração de dados baseada nos relatórios estruturados de 28/01/2026
  const riscoTotal = metricas.riscoReal || 0; // Ex: R$ 484,00 para BOVA11 [cite: 60]
  const lucroTotal = metricas.totalLiquido || 0; // Ex: R$ 4.485,50 para BOVA11 
  const roi = metricas.roi || 0; // Ex: 926.76% para BOVA11 [cite: 66]
  const be = metricas.be || 0; // Ex: R$ 17.56 para BOVA11 [cite: 63]

  return (
    <>
      <button id="btn-export-pdf-real" style={{ display: 'none' }} onClick={() => exportarPDF(est.name || 'Estrategia')} />

      <div style={{ position: 'fixed', left: '-10000px', top: 0 }}>
        <div id="report-pdf-template" style={{ width: '850px', backgroundColor: '#ffffff', color: '#000', padding: '0', margin: '0' }}>
          
          {/* PÁGINA 1: DASHBOARD TÉCNICO */}
          <div style={{ padding: '40px', minHeight: '1100px', display: 'flex', flexDirection: 'column' }}>
            
            {/* Cabeçalho com Logo e Ticker */}
            <div className="flex justify-between items-center border-b-4 border-slate-900 pb-6 mb-8">
              <div className="flex items-center gap-4">
                {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: '50px', objectFit: 'contain' }} />}
                <div>
                  <h1 className="text-2xl font-black text-slate-900 leading-none">BOARDPRO</h1>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Intelligence Structured Report</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-black text-slate-900">{ticker}</div>
                <div className="flex items-center justify-end gap-2 text-[10px] font-bold text-slate-400">
                  <Clock size={10} /> GERADO EM: 28/01/2026 [cite: 6, 21, 51]
                </div>
              </div>
            </div>

            {/* Tese da Estratégia */}
            <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 mb-6">
              <h3 className="flex items-center gap-2 text-blue-700 font-black text-xs uppercase mb-2">
                <BookOpen size={14} /> Tese: {est.name} [cite: 7, 22, 54]
              </h3>
              <p className="text-[11px] text-slate-700 leading-relaxed text-justify">
                {est.officialDescription || "Análise técnica institucional baseada em Black-Scholes processada pelo motor BoardPRO."} [cite: 8, 23, 55]
              </p>
            </div>

            {/* Painel de Métricas Financeiras */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="border-t-4 border-green-600 bg-white p-3 shadow-sm rounded-b">
                <span className="text-[9px] font-black text-slate-400 uppercase">Lucro Máximo Est.</span>
                <div className="text-lg font-black text-green-600">{formatCurrency(lucroTotal)} [cite: 26, 41, 57]</div>
              </div>
              <div className="border-t-4 border-red-600 bg-white p-3 shadow-sm rounded-b">
                <span className="text-[9px] font-black text-slate-400 uppercase">Risco (Perda Máx)</span>
                <div className="text-lg font-black text-red-600">{formatCurrency(riscoTotal)} [cite: 10, 27, 42, 60]</div>
              </div>
              <div className="border-t-4 border-blue-600 bg-white p-3 shadow-sm rounded-b">
                <span className="text-[9px] font-black text-slate-400 uppercase">Breakeven</span>
                <div className="text-lg font-black text-blue-600">R$ {be.toFixed(2)} [cite: 28, 43, 63]</div>
              </div>
              <div className="border-t-4 border-slate-900 bg-white p-3 shadow-sm rounded-b">
                <span className="text-[9px] font-black text-slate-400 uppercase">Eficiência (ROI)</span>
                <div className="text-lg font-black text-slate-900">{roi.toFixed(2)}% [cite: 12, 30, 45, 66]</div>
              </div>
            </div>

            {/* ÁREA DO GRÁFICO - Forçando renderização visual */}
            <div className="flex-1 flex flex-col mb-8">
              <h3 className="text-xs font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-600" /> Projeção de Payoff no Vencimento [cite: 13, 31, 68]
              </h3>
              <div className="flex-1 min-h-[400px] w-full bg-white border border-slate-100 rounded-xl p-4 shadow-inner relative" style={{ display: 'block' }}>
                {/* O gráfico agora tem um container com altura fixa para garantir captura no PDF */}
                <PayoffChart 
                  strategy={est} 
                  lote={lote} 
                  taxasIdaVolta={metricas.taxas * 2}
                  isLightMode={true} 
                  width={750}
                  height={350}
                />
              </div>
            </div>

            {/* Composição das Pernas */}
            <div className="mt-auto">
              <h3 className="text-xs font-black text-slate-800 uppercase mb-3 flex items-center gap-2">
                <Scale size={16} className="text-blue-600" /> Composição Detalhada [cite: 14, 69]
              </h3>
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase text-[9px]">
                    <th className="p-3 text-left">Série/Ativo</th>
                    <th className="p-3 text-left">Direção</th>
                    <th className="p-3 text-center">Strike</th>
                    <th className="p-3 text-right">Qtd (Lote)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {est.pernas?.map((p: any, i: number) => (
                    <tr key={i} className="bg-white">
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                        <ChevronRight size={10} className="text-blue-500" /> {p.option_ticker || p.symbol}
                      </td>
                      <td className={`p-3 font-black ${p.direction === 'COMPRA' ? 'text-green-600' : 'text-red-600'}`}>
                        {p.direction} [cite: 32, 47, 71, 72]
                      </td>
                      <td className="p-3 text-center font-mono">R$ {(p.strike || 0).toFixed(2)}</td>
                      <td className="p-3 text-right font-bold">{lote.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ pageBreakBefore: 'always' }} />

          {/* PÁGINA 2: COMPLIANCE */}
          <div style={{ padding: '60px', minHeight: '1100px', backgroundColor: '#fcfcfc' }}>
             <h2 className="text-xl font-black text-slate-900 border-b-2 border-red-600 pb-2 mb-8 uppercase flex items-center gap-2">
              <ShieldAlert className="text-red-600" /> Gerenciamento de Risco e Disclaimer
            </h2>
            <div className="space-y-4 text-[10px] text-slate-600 text-justify leading-tight">
              <p>[cite: 16] <strong>Aviso Legal:</strong> Este material é puramente informativo e produzido pela BoardPro.</p>
              <p>[cite: 16, 17] O investimento em opções envolve riscos elevados; a perda pode ser igual ao capital total investido. Verifique sempre seu perfil de investidor antes de operar.</p>
              <p>[cite: 24, 39] <strong>Metodologia:</strong> Os cálculos utilizam o modelo Black-Scholes para identificar distorções de volatilidade implícita.</p>
            </div>
            <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between items-center opacity-50">
               <span className="text-[9px] font-bold uppercase tracking-widest italic">BoardPro V2026.1 - Operacional</span>
               <span className="text-[9px] font-bold">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};