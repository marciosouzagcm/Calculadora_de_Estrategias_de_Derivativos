import React from 'react';
import { exportarPDF, formatCurrency, formatPercentage } from '../services/pdfService';
import { PayoffChart } from './PayoffChart';
import { FileDown, ShieldAlert, TrendingUp, Info } from 'lucide-react';

export const ReportTemplate = ({ est, metricas, ticker, spot, lote }: any) => {
  if (!est || !metricas) return null;

  // CÁLCULOS ESTRATÉGICOS (Baseados na Lâmina do Inter)
  const riscoTotal = metricas.riscoReal;
  const lucroTotal = metricas.totalLiquido;
  
  // % de Ganho sobre o capital que o investidor realmente "tirou do bolso" (Alocado)
  const ganhoSobreAlocado = (lucroTotal / riscoTotal) * 100;
  
  // % de quanto o risco representa sobre o valor total da posição (Valor de Face)
  const riscoSobreValorFace = (riscoTotal / (spot * lote)) * 100;

  // Identificação de Cenários (Lógica Inter)
  const isPutSpread = est.name.toLowerCase().includes('put') || est.name.toLowerCase().includes('baixa');

  return (
    <div className="bg-slate-100 p-8 mt-10 no-print border-t-2 border-slate-200">
      {/* Botão de Comando Superior */}
      <div className="max-w-[800px] mx-auto mb-6 flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <Info className="text-blue-600 h-5 w-5" />
          <span className="text-sm font-bold text-slate-700">Preview da Lâmina Institucional A4</span>
        </div>
        <button 
          onClick={() => exportarPDF(est.name)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded font-black text-xs flex items-center gap-2 transition-all"
        >
          <FileDown className="h-4 w-4" /> EXPORTAR PDF PROFISSIONAL
        </button>
      </div>

      {/* ÁREA DE CAPTURA (O QUE VAI PARA O PDF) */}
      <div 
        id="report-pdf-template" 
        className="max-w-[800px] mx-auto bg-white p-12 text-slate-900 shadow-2xl"
        style={{ 
          minHeight: '1120px', 
          width: '800px',
          backgroundColor: '#ffffff', // Força fundo branco na captura
          color: '#0f172a'
        }}
      >
        {/* Cabeçalho de Banco */}
        <div className="flex justify-between items-start border-b-4 border-blue-600 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-blue-700 font-black text-2xl tracking-tighter">
              <TrendingUp /> BOARDPRO <span className="text-slate-400 font-light">INTELLIGENCE</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mesa de Produtos Estruturados</p>
          </div>
          <div className="text-right">
            <h1 className="text-4xl font-black tracking-tighter text-slate-900">{ticker}</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase italic">Fixing: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {/* Descritivo da Estratégia */}
        <div className="mb-8">
          <h2 className="text-lg font-black text-slate-800 uppercase mb-2">{est.name}</h2>
          <p className="text-xs text-slate-600 leading-relaxed text-justify">
            Esta operação estruturada visa otimizar a relação risco-retorno do investidor, permitindo participar do movimento do ativo objeto 
            através do mercado de opções. O risco máximo é limitado ao desembolso inicial (prêmio pago + taxas), garantindo previsibilidade de perda.
          </p>
        </div>

        {/* PERFORMANCE ESPERADA (O CORAÇÃO DA LÂMINA INTER) */}
        <div className="grid grid-cols-2 gap-6 mb-10">
          {/* Cenário Contrário */}
          <div className="bg-slate-50 p-6 rounded-md border border-slate-200">
            <h3 className="text-[10px] font-black text-slate-400 uppercase mb-3">Se a ação {isPutSpread ? 'subir' : 'cair'}...</h3>
            <p className="text-xs font-bold text-slate-800 leading-tight">
              Resultados negativos limitados a <span className="text-red-600">-{riscoSobreValorFace.toFixed(2)}%</span> do valor de face da operação. 
              Corresponde a 100% do capital alocado na montagem.
            </p>
          </div>

          {/* Cenário Favorável */}
          <div className="bg-blue-50 p-6 rounded-md border border-blue-100">
            <h3 className="text-[10px] font-black text-blue-400 uppercase mb-3">Se a ação {isPutSpread ? 'cair' : 'subir'}...</h3>
            <p className="text-xs font-bold text-slate-800 leading-tight">
              Ganho máximo de <span className="text-blue-700">{formatPercentage(ganhoSobreAlocado)}</span> sobre o capital alocado.
              Ponto de equilíbrio (Breakeven) em <span className="text-blue-700">{formatCurrency(metricas.be)}</span>.
            </p>
          </div>
        </div>

        {/* Gráfico de Payoff - OTIMIZADO PARA PDF */}
        <div className="mb-10" style={{ pageBreakInside: 'avoid' }}>
          <div className="flex justify-between items-end mb-4">
             <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Cenários da Operação no Vencimento</h3>
             <span className="text-[9px] text-slate-400 font-bold italic text-right">Eixo X: Preço do Ativo | Eixo Y: Resultado Financeiro (R$)</span>
          </div>
          <div className="h-[300px] w-full border border-slate-100 rounded-lg p-4 bg-white">
            {/* Certifique-se que o PayoffChart detecte o fundo branco e ajuste as cores das fontes para preto */}
            <PayoffChart 
              strategy={est} 
              lote={lote} 
              taxasIdaVolta={metricas.taxas * 2}
              isLightMode={true} // Sugestão: adicione esta prop no seu PayoffChart para forçar cores claras
            />
          </div>
        </div>

        {/* Quadro Técnico */}
        <div className="grid grid-cols-3 gap-0 border border-slate-200 rounded-lg overflow-hidden mb-10">
          <div className="p-4 border-r border-slate-200 bg-slate-50">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Capital Alocado</p>
            <p className="text-sm font-black text-slate-800">{formatCurrency(metricas.riscoReal)}</p>
          </div>
          <div className="p-4 border-r border-slate-200 bg-slate-50">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Lucro Líquido Máx.</p>
            <p className="text-sm font-black text-blue-700">{formatCurrency(metricas.totalLiquido)}</p>
          </div>
          <div className="p-4 bg-slate-50">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Eficiência (R/R)</p>
            <p className="text-sm font-black text-slate-800">1 : {(lucroTotal/riscoTotal).toFixed(2)}</p>
          </div>
        </div>

        {/* Disclaimer Consolidado */}
        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="flex gap-4 mb-6">
            <ShieldAlert className="h-8 w-8 text-slate-400 shrink-0" />
            <p className="text-[8px] text-slate-500 text-justify leading-tight">
              <strong>DISCLAIMER:</strong> Este material foi preparado pela BoardPRO Intelligence e tem caráter meramente informativo. Não constitui recomendação de compra ou venda. 
              O investimento em opções é uma modalidade de risco variável onde a perda pode ser total. O encerramento antecipado pode gerar resultados substancialmente 
              diferentes dos projetados para o vencimento. As informações e estimativas foram obtidas de fontes consideradas confiáveis, mas não há garantia de precisão 
              ou integridade. O investidor deve verificar sua adequação ao perfil de risco (Suitability) antes de operar.
            </p>
          </div>
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Classificação: RESTRITA</span>
            <span>© 2026 BoardPRO | Versão Auditada 2026.1</span>
          </div>
        </div>
      </div>
    </div>
  );
};