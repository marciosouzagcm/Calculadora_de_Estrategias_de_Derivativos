import React from 'react';
import { exportarPDF, formatCurrency, formatPercentage } from '../services/pdfService';
import { PayoffChart } from './PayoffChart';
import { ShieldAlert } from 'lucide-react';

// Aceita logoUrl como prop vinda do App.tsx
export const ReportTemplate = ({ est, metricas, ticker, spot, lote, logoUrl }: any) => {
  if (!est || !metricas) return null;

  const riscoTotal = metricas.riscoReal;
  const lucroTotal = metricas.totalLiquido;
  const ganhoSobreAlocado = (lucroTotal / riscoTotal) * 100;
  const riscoSobreValorFace = (riscoTotal / (spot * lote)) * 100;
  const isPutSpread = est.name.toLowerCase().includes('put') || est.name.toLowerCase().includes('baixa');

  return (
    <>
      {/* BOTÃO DE GATILHO OCULTO ACIONADO PELO APP.TSX */}
      <button 
        id="btn-export-pdf-real" 
        style={{ display: 'none' }} 
        onClick={() => exportarPDF(est.name)} 
      />

      {/* CONTAINER DE RENDERIZAÇÃO OFF-SCREEN */}
      <div style={{ position: 'absolute', left: '-9999px', top: '0', zIndex: -1 }}>
        <div 
          id="report-pdf-template" 
          className="bg-white p-12"
          style={{ 
            width: '800px', 
            minHeight: '1120px', 
            backgroundColor: '#ffffff',
            color: '#000000',
            fontFamily: 'Arial, sans-serif'
          }}
        >
          {/* CSS INTERNO PARA PDF */}
          <style>{`
            #report-pdf-template * {
              color: #000000 !important;
              border-color: #e2e8f0 !important;
            }
            #report-pdf-template .text-blue-700, 
            #report-pdf-template .text-blue-600 {
              color: #1d4ed8 !important;
            }
            #report-pdf-template .text-red-600 {
              color: #dc2626 !important;
            }
            #report-pdf-template .text-slate-400 {
              color: #64748b !important;
            }
            #report-pdf-template b, #report-pdf-template strong {
              font-weight: 800 !important;
            }
            .report-header-logo {
              height: 50px;
              width: auto;
              object-fit: contain;
            }
          `}</style>

          {/* Cabeçalho Institucional com Logo.png */}
          <div className="flex justify-between items-center border-b-4 border-blue-600 pb-6 mb-8" style={{ borderBottomColor: '#1d4ed8' }}>
            <div className="flex items-center gap-4">
              {/* Inserção da Logo aqui */}
              {logoUrl && <img src={logoUrl} alt="Logo" className="report-header-logo" />}
              <div>
                <div className="text-blue-700 font-black text-2xl tracking-tighter uppercase">
                  BOARDPRO <span className="text-slate-400 font-light">INTELLIGENCE</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mesa de Produtos Estruturados</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-4xl font-black tracking-tighter text-slate-900" style={{ color: '#000000' }}>{ticker}</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase italic">Fixing: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          {/* Descritivo Automático */}
          <div className="mb-8">
            <h2 className="text-lg font-black text-slate-800 uppercase mb-2">{est.name}</h2>
            <p className="text-xs text-slate-600 leading-relaxed text-justify" style={{ color: '#334155' }}>
              {est.officialDescription || `Esta operação estruturada visa otimizar a relação risco-retorno do investidor, permitindo participar do movimento do ativo objeto 
              através do mercado de opções. O risco máximo é limitado ao desembolso inicial (prêmio pago + taxas), garantindo previsibilidade de perda.`}
            </p>
          </div>

          {/* Cenários de Performance */}
          <div className="grid grid-cols-2 gap-6 mb-10">
            <div className="p-6 rounded-md border border-slate-200" style={{ backgroundColor: '#f8fafc' }}>
              <h3 className="text-[10px] font-black text-slate-400 uppercase mb-3">Se a ação {isPutSpread ? 'subir' : 'cair'}...</h3>
              <p className="text-xs font-bold text-slate-800 leading-tight">
                Resultados negativos limitados a <span className="text-red-600">-{riscoSobreValorFace.toFixed(2)}%</span> do valor de face da operação. 
                Corresponde a 100% do capital alocado na montagem.
              </p>
            </div>

            <div className="p-6 rounded-md border border-blue-100" style={{ backgroundColor: '#eff6ff' }}>
              <h3 className="text-[10px] font-black text-blue-400 uppercase mb-3">Se a ação {isPutSpread ? 'cair' : 'subir'}...</h3>
              <p className="text-xs font-bold text-slate-800 leading-tight">
                Ganho máximo de <span className="text-blue-700">{formatPercentage(ganhoSobreAlocado)}</span> sobre o capital alocado.
                Ponto de equilíbrio (Breakeven) em <span className="text-blue-700">{formatCurrency(metricas.be)}</span>.
              </p>
            </div>
          </div>

          {/* Gráfico de Payoff (Modo Claro para Impressão) */}
          <div className="mb-10">
            <h3 className="text-[10px] font-black text-slate-800 uppercase mb-4 tracking-widest">Cenários da Operação no Vencimento</h3>
            <div className="h-[300px] w-full border border-slate-100 rounded-lg p-4 bg-white">
              <PayoffChart 
                strategy={est} 
                lote={lote} 
                taxasIdaVolta={metricas.taxas * 2}
                isLightMode={true} 
              />
            </div>
          </div>

          {/* Quadro Técnico Consolidado */}
          <div className="grid grid-cols-3 gap-0 border border-slate-200 rounded-lg overflow-hidden mb-10">
            <div className="p-4 border-r border-slate-200 bg-slate-50 text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Capital Alocado</p>
              <p className="text-sm font-black text-slate-800">{formatCurrency(metricas.riscoReal)}</p>
            </div>
            <div className="p-4 border-r border-slate-200 bg-slate-50 text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Lucro Líquido Máx.</p>
              <p className="text-sm font-black text-blue-700">{formatCurrency(metricas.totalLiquido)}</p>
            </div>
            <div className="p-4 bg-slate-50 text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Eficiência (R/R)</p>
              <p className="text-sm font-black text-slate-800">1 : {(lucroTotal / riscoTotal).toFixed(2)}</p>
            </div>
          </div>

          {/* Rodapé e Disclaimer */}
          <div className="mt-auto pt-6 border-t border-slate-100">
            <div className="flex gap-4 mb-6">
              <ShieldAlert className="h-8 w-8 text-slate-400 shrink-0" />
              <p className="text-[8px] text-slate-500 text-justify leading-tight">
                <strong>DISCLAIMER:</strong> Este material foi preparado pela BoardPRO Intelligence e tem caráter meramente informativo. Não constitui recomendação de compra ou venda. 
                O investimento em opções é uma modalidade de risco variável onde a perda pode ser total. O encerramento antecipado pode gerar resultados substancialmente 
                diferentes dos projetados para o vencimento. O investidor deve verificar sua adequação ao perfil de risco (Suitability) antes de operar.
              </p>
            </div>
            <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Classificação: RESTRITA</span>
              <span>© 2026 BoardPRO | Versão Auditada 2026.1</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};