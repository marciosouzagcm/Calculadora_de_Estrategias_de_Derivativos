import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PayoffChart } from './PayoffChart';
import { FileDown, Eye, ShieldAlert, TrendingUp, Copyright } from 'lucide-react';

export const exportarPDF = async (nomeEstrategia: string) => {
  const input = document.getElementById('report-pdf-template');
  if (!input) return;

  const canvas = await html2canvas(input, { 
    scale: 2, 
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff'
  });
  
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(`Relatorio_${nomeEstrategia.replace(/\s+/g, '_')}.pdf`);
};

export const ReportTemplate = ({ est, ticker, spot, lote }: any) => {
  if (!est) return null;

  return (
    <div className="bg-slate-100 p-10 border-t border-slate-300 mt-12">
      {/* Barra de Controle Superior */}
      <div className="max-w-4xl mx-auto mb-8 flex items-center justify-between bg-white p-5 rounded-xl shadow-md border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="bg-amber-100 p-2 rounded-lg">
            <Eye className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Review do Relatório Gerencial</h3>
            <p className="text-xs text-slate-500 font-medium">Layout oficial para exportação em formato A4.</p>
          </div>
        </div>
        <button 
          onClick={() => exportarPDF(est.name)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          <FileDown className="h-4 w-4" />
          EXPORTAR PDF
        </button>
      </div>

      {/* ÁREA DO PDF (SIMULAÇÃO A4) */}
      <div 
        id="report-pdf-template" 
        className="max-w-[800px] mx-auto bg-white shadow-2xl p-16 text-slate-900 flex flex-col"
        style={{ minHeight: '1120px' }}
      >
        {/* Cabeçalho */}
        <div className="flex justify-between items-start border-b-4 border-slate-800 pb-10 mb-10">
          <div>
            <div className="flex items-center gap-2 text-blue-700 mb-3">
              <TrendingUp className="h-7 w-7" />
              <span className="font-black tracking-widest text-2xl">TRADING BOARD PRO</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase leading-none">Análise de<br/>Risco e Retorno</h1>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-xs font-bold uppercase mb-1">Ativo Analisado</p>
            <div className="text-5xl font-black text-slate-900 tracking-tighter">{ticker}</div>
            <p className="text-slate-500 font-mono text-xs mt-2 italic">{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="grid grid-cols-4 gap-6 mb-10">
          <div className="bg-slate-50 p-4 rounded-lg border-l-4 border-slate-400">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Estratégia</p>
            <p className="text-sm font-bold text-slate-800">{est.name}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border-l-4 border-blue-400">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Preço Base (Spot)</p>
            <p className="text-sm font-bold text-slate-800">R$ {spot}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border-l-4 border-green-500">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Lote Operacional</p>
            <p className="text-sm font-bold text-slate-800">{lote} unid.</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border-l-4 border-amber-500">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Natureza</p>
            <p className="text-sm font-bold text-slate-800">{est.net_premium >= 0 ? 'CRÉDITO' : 'DÉBITO'}</p>
          </div>
        </div>

        {/* Gráfico de Payoff */}
        <div className="mb-12">
          <h3 className="text-xs font-black mb-4 uppercase text-slate-800 tracking-widest flex items-center gap-2">
            <div className="h-1 w-6 bg-blue-600"></div> Curva de Payoff no Vencimento
          </h3>
          <div className="h-[320px] w-full p-4 border border-slate-100 rounded-xl bg-slate-50/30">
            <PayoffChart strategy={est} lote={lote} taxasIdaVolta={0} />
          </div>
        </div>

        {/* CAIXA DE AVISO LEGAL DESTAQUE */}
        <div className="mb-10 bg-amber-50 border border-amber-200 p-6 rounded-xl flex gap-4">
          <ShieldAlert className="h-10 w-10 text-amber-600 shrink-0" />
          <div>
            <h4 className="text-amber-800 font-black text-xs uppercase mb-1 tracking-tight">AVISO LEGAL IMPORTANTE</h4>
            <p className="text-[10px] text-amber-900 leading-relaxed font-medium">
              Este relatório é uma **SIMULAÇÃO MATEMÁTICA** baseada em dados históricos e atuais de mercado.
              O conteúdo aqui apresentado **NÃO** constitui recomendação de compra ou venda de ativos.
              Investimentos em opções envolvem **ALTO RISCO** de perda de capital.
              A rentabilidade passada não é garantia de rentabilidade futura.
              Verifique sempre com seu assessor financeiro antes de executar operações.
            </p>
          </div>
        </div>

        

        {/* Rodapé e Direitos */}
        <div className="mt-auto pt-8 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-8 mb-6 text-[9px] text-slate-400 leading-tight uppercase font-semibold">
            <p>
              RISCO DE OPÇÕES: As opções podem expirar sem valor, resultando na perda total do prêmio investido.
              Operações estruturadas requerem conhecimento avançado e gerenciamento de risco adequado.
            </p>
            <p className="text-right">
              Dados processados via Trading Board Pro Engine v4.1<br/>
              Simulação gerada para fins educacionais e de conferência técnica.
            </p>
          </div>
          <div className="flex justify-center items-center gap-1 text-[10px] text-slate-500 font-bold tracking-widest">
            <Copyright className="h-3 w-3" />
            <span>2026 TRADING BOARD PRO - TODOS OS DIREITOS RESERVADOS</span>
          </div>
        </div>
      </div>
    </div>
  );
};