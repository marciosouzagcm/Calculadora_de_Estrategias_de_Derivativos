import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Serviço de exportação de relatórios profissionais em PDF
 * Utiliza captura de alta definição (DPI 2.0) para garantir legibilidade de gráficos
 */
export const exportarPDF = async (nomeEstrategia: string) => {
  const input = document.getElementById('report-pdf-template');
  
  if (!input) {
    console.error("Erro: Template do relatório não encontrado no DOM.");
    return;
  }

  try {
    // 1. Configura o canvas para alta fidelidade
    const canvas = await html2canvas(input, {
      scale: 2, // Aumenta a resolução para impressão
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 850 // Fixa a largura para garantir consistência no layout A4
    });

    const imgData = canvas.toDataURL('image/png');
    
    // 2. Cria o documento PDF no formato A4
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // 3. Adiciona a imagem capturada ao PDF
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

    // 4. Salva o arquivo com timestamp para evitar substituições acidentais
    const dataHora = new Date().toISOString().slice(0, 10);
    const fileName = `Relatorio_${nomeEstrategia.replace(/\s+/g, '_')}_${dataHora}.pdf`;
    
    pdf.save(fileName);

    return true;
  } catch (err) {
    console.error("Falha ao gerar o PDF:", err);
    return false;
  }
};

/**
 * Helper para formatar valores monetários no padrão brasileiro dentro do relatório
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Helper para formatar percentuais (Gregas e ROI)
 */
export const formatPercentage = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};